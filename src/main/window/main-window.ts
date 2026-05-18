import { BrowserWindow, Tray, Menu, app } from 'electron'
import path from 'node:path'
import log from 'electron-log'
import type { AppSettings } from '@shared/types'
import { loadTrayIcon } from './tray-icon'

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 360,
    height: 520,
    minWidth: 320,
    minHeight: 380,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    title: 'Clippy',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => win.show())
  return win
}

const TRAY_TOOLTIP = 'Clippy — click to toggle'

export class TrayService {
  private tray: Tray | null = null

  constructor(
    private getWindow: () => BrowserWindow | null,
    private getSettings: () => AppSettings,
    private onSettingsChange: (partial: Partial<AppSettings>) => void,
    private onClear: () => void,
    private onQuit: () => void
  ) { }

  create(): void {
    try {
      const icon = loadTrayIcon()
      this.tray = new Tray(icon)
      this.applyTooltip()
      this.rebuildMenu()

      this.tray.on('click', () => {
        const win = this.getWindow()
        if (!win) return
        if (win.isVisible()) {
          win.hide()
          if (process.platform === 'darwin') app.hide()
        } else {
          if (process.platform === 'darwin') app.show()
          win.show()
          win.focus()
        }
      })

      log.info('Tray icon created')
    } catch (err) {
      log.error('Failed to create tray icon', err)
    }
  }

  private applyTooltip(): void {
    if (!this.tray) return
    this.tray.setToolTip(TRAY_TOOLTIP)
  }

  rebuildMenu(): void {
    if (!this.tray) return
    this.applyTooltip()
    const settings = this.getSettings()
    const menu = Menu.buildFromTemplate([
      {
        label: 'Clippy',
        enabled: false
      },
      {
        label: 'Show Clippy',
        click: () => {
          const win = this.getWindow()
          win?.show()
          win?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Enable Auto Paste',
        type: 'checkbox',
        checked: settings.autoPaste,
        click: (item) => this.onSettingsChange({ autoPaste: item.checked })
      },
      {
        label: "Don't Hide on Blur",
        type: 'checkbox',
        checked: !settings.hideOnBlur,
        click: (item) => this.onSettingsChange({ hideOnBlur: !item.checked })
      },
      {
        label: 'Launch at Login',
        type: 'checkbox',
        checked: settings.launchAtLogin,
        click: (item) => this.onSettingsChange({ launchAtLogin: item.checked })
      },
      { type: 'separator' },
      { label: 'Clear History', click: () => this.onClear() },
      { type: 'separator' },
      { label: 'Quit Clippy', click: () => this.onQuit() }
    ])
    this.tray.setContextMenu(menu)
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
