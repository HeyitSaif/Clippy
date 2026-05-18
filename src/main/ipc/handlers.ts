import { ipcMain, BrowserWindow, app, dialog } from 'electron'
import fs from 'node:fs'
import { IPC, IPC_EVENTS } from '@shared/ipc-channels'
import type { ClipRepository, SettingsRepository } from '../db/database'
import type { ClipboardService } from '../services/clipboard-service'
import type { PasteService } from '../services/paste-service'
import type { AppSettings, ClipSearchQuery, ExportPayload, SettingsUpdateResult } from '@shared/types'

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

function broadcast(event: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(event, payload)
  }
}

export function registerIpcHandlers(deps: {
  clipRepo: ClipRepository
  settingsRepo: SettingsRepository
  clipboardService: ClipboardService
  pasteService: PasteService
  onSettingsUpdated: (settings: AppSettings) => { ok: boolean; error?: string }
}): void {
  const { clipRepo, settingsRepo, clipboardService, pasteService, onSettingsUpdated } = deps

  ipcMain.handle(IPC.CLIPS_LIST, (_e, limit?: number, offset?: number) => {
    return clipRepo.list(limit ?? 50, offset ?? 0)
  })

  ipcMain.handle(IPC.CLIPS_SEARCH, (_e, query: ClipSearchQuery) => {
    return clipRepo.search(query)
  })

  ipcMain.handle(IPC.CLIPS_GET, (_e, id: string) => {
    return clipRepo.getById(id)
  })

  ipcMain.handle(IPC.CLIPS_GET_IMAGE, (_e, id: string) => {
    const clip = clipRepo.getById(id)
    if (!clip?.imagePath) return null
    return clipRepo.readImageAsDataUrl(clip.imagePath)
  })

  ipcMain.handle(IPC.CLIPS_GET_THUMB, (_e, id: string) => {
    return clipRepo.getThumbDataUrl(id)
  })

  ipcMain.handle(IPC.CLIPS_GET_THUMBS, (_e, ids: string[]) => {
    return clipRepo.getThumbsBatch(ids)
  })

  ipcMain.handle(IPC.CLIPS_GET_LIST_ITEM, (_e, id: string) => {
    return clipRepo.getListItem(id)
  })

  ipcMain.handle(IPC.CLIPS_COPY, (_e, id: string) => {
    return clipboardService.writeClipToSystem(id)
  })

  ipcMain.handle(IPC.CLIPS_PASTE, async (_e, id: string) => {
    const current = settingsRepo.getAll()
    return pasteService.writeAndAutoPaste(
      () => clipboardService.writeClipToSystem(id),
      current.autoPaste
    )
  })

  ipcMain.handle(IPC.CLIPS_DELETE, (_e, id: string) => {
    clipRepo.delete(id)
    broadcast(IPC_EVENTS.CLIPS_UPDATED)
    return true
  })

  ipcMain.handle(IPC.CLIPS_TOGGLE_PIN, (_e, id: string) => {
    const result = clipRepo.togglePin(id)
    broadcast(IPC_EVENTS.CLIPS_UPDATED)
    return result
  })

  ipcMain.handle(IPC.CLIPS_TOGGLE_SNIPPET, (_e, id: string, name?: string) => {
    const result = clipRepo.toggleSnippet(id, name)
    broadcast(IPC_EVENTS.CLIPS_UPDATED)
    return result
  })

  ipcMain.handle(IPC.CLIPS_UPDATE_TAGS, (_e, id: string, tags: string[]) => {
    const result = clipRepo.updateTags(id, tags)
    broadcast(IPC_EVENTS.CLIPS_UPDATED)
    return result
  })

  ipcMain.handle(IPC.CLIPS_CLEAR, () => {
    const count = clipRepo.clearUnpinned()
    broadcast(IPC_EVENTS.CLIPS_UPDATED)
    return count
  })

  ipcMain.handle(IPC.CLIPS_EXPORT, async () => {
    const win = getMainWindow()
    const result = await dialog.showSaveDialog(win ?? (undefined as unknown as Electron.BrowserWindow), {
      title: 'Export Clippy History',
      defaultPath: `clippy-export-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    const payload: ExportPayload = {
      version: 2,
      exportedAt: Date.now(),
      clips: clipRepo.getAllRecords()
    }
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2))
    return result.filePath
  })

  ipcMain.handle(IPC.CLIPS_IMPORT, async () => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? (undefined as unknown as Electron.BrowserWindow), {
      title: 'Import Clippy History',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return 0
    const raw = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8')) as ExportPayload
    let imported = 0
    for (const clip of raw.clips ?? []) {
      if (clipRepo.getByHash(clip.hash)) continue
      clipRepo.insertClip({
        type: clip.type,
        hash: `${clip.hash}-import-${Date.now()}-${imported}`,
        preview: clip.preview,
        textContent: clip.textContent,
        htmlContent: clip.htmlContent,
        rtfContent: clip.rtfContent,
        imagePath: clip.imagePath,
        thumbPath: clip.thumbPath,
        filePath: clip.filePath,
        isPinned: clip.isPinned,
        isSnippet: clip.isSnippet,
        snippetName: clip.snippetName,
        tags: clip.tags
      })
      imported++
    }
    broadcast(IPC_EVENTS.CLIPS_UPDATED)
    return imported
  })

  ipcMain.handle(IPC.CLIPS_PASTE_SLOT, async (_e, slot: number) => {
    const clips = clipRepo.list(9, 0)
    const item = clips[slot - 1]
    if (!item) return false
    const current = settingsRepo.getAll()
    return pasteService.writeAndAutoPaste(
      () => clipboardService.writeClipToSystem(item.id),
      current.autoPaste
    )
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => settingsRepo.getAll())

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_e, partial: Partial<AppSettings>): SettingsUpdateResult => {
    const next = settingsRepo.update(partial)
    const hotkeyResult = onSettingsUpdated(next)
    broadcast(IPC_EVENTS.SETTINGS_CHANGED, next)
    return { settings: next, hotkeyError: hotkeyResult.error }
  })

  ipcMain.handle(IPC.WINDOW_HIDE, () => {
    getMainWindow()?.hide()
  })

  ipcMain.handle(IPC.WINDOW_SHOW, () => {
    getMainWindow()?.show()
  })

  ipcMain.handle(IPC.WINDOW_TOGGLE, () => {
    const win = getMainWindow()
    if (!win) return
    if (win.isVisible()) win.hide()
    else {
      win.show()
      win.focus()
      notifyWindowFocused()
    }
  })

  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion())
}

export function notifyWindowFocused(): void {
  broadcast(IPC_EVENTS.WINDOW_FOCUSED)
}

export function notifyClipAdded(clipId: string): void {
  const win = getMainWindow()
  win?.webContents.send(IPC_EVENTS.CLIP_ADDED, clipId)
  broadcast(IPC_EVENTS.CLIPS_UPDATED)
}
