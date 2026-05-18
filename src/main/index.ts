import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import log from 'electron-log'
import { createDatabase, importLegacyV1 } from './db/database'
import { ClipboardService } from './services/clipboard-service'
import { PasteService } from './services/paste-service'
import { AccessibilityService } from './services/accessibility-service'
import { FocusService } from './services/focus-service'
import { HotkeyService } from './services/hotkey-service'
import { createMainWindow, TrayService } from './window/main-window'
import { registerIpcHandlers, notifyClipAdded, notifyWindowFocused, notifyAccessibilityRequired } from './ipc/handlers'
import type { AppSettings } from '@shared/types'

log.initialize()
log.info('Clippy v2 starting')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
const { clipRepo, settingsRepo } = createDatabase()
let settings: AppSettings = settingsRepo.getAll()

const clipboardService = new ClipboardService(clipRepo, () => settings)
const accessibilityService = new AccessibilityService()
const focusService = new FocusService()
const pasteService = new PasteService(
  () => mainWindow,
  accessibilityService,
  focusService,
  () => notifyAccessibilityRequired()
)

async function showClippyWindow(): Promise<void> {
  if (!mainWindow) return
  if (!mainWindow.isVisible()) {
    await focusService.captureFrontmostApp()
  }
  if (process.platform === 'darwin') app.show()
  mainWindow.show()
  mainWindow.focus()
  notifyWindowFocused()
}

function hideClippyWindow(): void {
  mainWindow?.hide()
  if (process.platform === 'darwin') app.hide()
}

const hotkeyService = new HotkeyService(
  () => settings,
  () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      hideClippyWindow()
    } else {
      void showClippyWindow()
    }
  },
  async (slot) => {
    if (!mainWindow?.isVisible()) {
      await focusService.captureFrontmostApp()
    }
    const clips = clipRepo.list(9, 0)
    const item = clips[slot - 1]
    if (!item) {
      log.warn(`Paste slot ${slot} empty — no clip at that position`)
      return
    }
    log.info(`Paste slot ${slot} triggered for clip ${item.id}`)
    const result = await pasteService.writeAndAutoPaste(
      () => clipboardService.writeClipToSystem(item.id),
      { autoPaste: true, hideAfterPaste: true }
    )
    if (!result.ok) {
      log.warn(`Paste slot ${slot} failed — reason=${result.reason}`)
    }
  }
)

let trayService!: TrayService

function applyLoginItem(s: AppSettings): void {
  app.setLoginItemSettings({
    openAtLogin: s.launchAtLogin,
    openAsHidden: true
  })
}

function onSettingsUpdated(next: AppSettings): { ok: boolean; error?: string } {
  settings = next
  applyLoginItem(next)
  const result = hotkeyService.register()
  trayService.rebuildMenu()
  return result
}

trayService = new TrayService(
  () => mainWindow,
  () => settings,
  (partial) => {
    const next = settingsRepo.update(partial)
    onSettingsUpdated(next)
  },
  () => {
    clipRepo.clearUnpinned()
    notifyClipAdded('')
  },
  () => app.quit(),
  () => showClippyWindow()
)

registerIpcHandlers({
  clipRepo,
  settingsRepo,
  clipboardService,
  pasteService,
  accessibilityService,
  onSettingsUpdated,
  showClippyWindow,
  hideClippyWindow
})

function createWindow(): void {
  mainWindow = createMainWindow()

  mainWindow.on('blur', () => {
    if (settings.hideOnBlur) {
      mainWindow?.hide()
      if (process.platform === 'darwin') {
        app.hide()
      }
    }
  })

  mainWindow.on('show', () => {
    if (process.platform === 'darwin') {
      app.show()
    }
    mainWindow?.focus()
    notifyWindowFocused()
  })

  mainWindow.webContents.once('dom-ready', () => {
    clipboardService.onClip((clipId) => notifyClipAdded(clipId))
    clipboardService.start()

    if (process.platform === 'darwin' && !accessibilityService.isGranted()) {
      setTimeout(() => {
        void accessibilityService.promptForAccess()
      }, 600)
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.clippy.app')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  importLegacyV1(clipRepo)
  settings = settingsRepo.getAll()
  applyLoginItem(settings)

  createWindow()
  trayService.create()
  hotkeyService.register()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else void showClippyWindow()
  })
})

app.on('second-instance', () => {
  void showClippyWindow()
})

app.on('will-quit', () => {
  hotkeyService.unregister()
  clipboardService.stop()
  trayService.destroy()
  clipRepo.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
