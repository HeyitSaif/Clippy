import { contextBridge, ipcRenderer } from 'electron'
import { IPC, IPC_EVENTS } from '@shared/ipc-channels'
import type { AppSettings, ClipListItem, ClipRecord, ClipSearchQuery, SettingsUpdateResult, AccessibilityStatus } from '@shared/types'

const api = {
  listClips: (limit?: number, offset?: number): Promise<ClipListItem[]> =>
    ipcRenderer.invoke(IPC.CLIPS_LIST, limit, offset),
  searchClips: (query: ClipSearchQuery): Promise<ClipListItem[]> =>
    ipcRenderer.invoke(IPC.CLIPS_SEARCH, query),
  getClip: (id: string): Promise<ClipRecord | null> => ipcRenderer.invoke(IPC.CLIPS_GET, id),
  getClipImage: (id: string): Promise<string | null> => ipcRenderer.invoke(IPC.CLIPS_GET_IMAGE, id),
  getClipThumb: (id: string): Promise<string | null> => ipcRenderer.invoke(IPC.CLIPS_GET_THUMB, id),
  getClipThumbs: (ids: string[]): Promise<Record<string, string>> =>
    ipcRenderer.invoke(IPC.CLIPS_GET_THUMBS, ids),
  getListItem: (id: string): Promise<ClipListItem | null> =>
    ipcRenderer.invoke(IPC.CLIPS_GET_LIST_ITEM, id),
  copyClip: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.CLIPS_COPY, id),
  pasteClip: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.CLIPS_PASTE, id),
  deleteClip: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.CLIPS_DELETE, id),
  togglePin: (id: string): Promise<ClipRecord | null> => ipcRenderer.invoke(IPC.CLIPS_TOGGLE_PIN, id),
  toggleSnippet: (id: string, name?: string): Promise<ClipRecord | null> =>
    ipcRenderer.invoke(IPC.CLIPS_TOGGLE_SNIPPET, id, name),
  updateTags: (id: string, tags: string[]): Promise<ClipRecord | null> =>
    ipcRenderer.invoke(IPC.CLIPS_UPDATE_TAGS, id, tags),
  clearHistory: (): Promise<number> => ipcRenderer.invoke(IPC.CLIPS_CLEAR),
  exportHistory: (): Promise<string | null> => ipcRenderer.invoke(IPC.CLIPS_EXPORT),
  importHistory: (): Promise<number> => ipcRenderer.invoke(IPC.CLIPS_IMPORT),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
  updateSettings: (partial: Partial<AppSettings>): Promise<SettingsUpdateResult> =>
    ipcRenderer.invoke(IPC.SETTINGS_UPDATE, partial),
  hideWindow: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_HIDE),
  showWindow: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_SHOW),
  toggleWindow: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_TOGGLE),
  getVersion: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke(IPC.APP_GET_PLATFORM),
  getAccessibilityStatus: (): Promise<AccessibilityStatus> =>
    ipcRenderer.invoke(IPC.ACCESSIBILITY_GET_STATUS),
  requestAccessibility: (): Promise<AccessibilityStatus> =>
    ipcRenderer.invoke(IPC.ACCESSIBILITY_REQUEST),
  onAccessibilityRequired: (cb: () => void): (() => void) => {
    const handler = (): void => cb()
    ipcRenderer.on(IPC_EVENTS.ACCESSIBILITY_REQUIRED, handler)
    return () => ipcRenderer.removeListener(IPC_EVENTS.ACCESSIBILITY_REQUIRED, handler)
  },
  onClipsUpdated: (cb: () => void): (() => void) => {
    const handler = (): void => cb()
    ipcRenderer.on(IPC_EVENTS.CLIPS_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_EVENTS.CLIPS_UPDATED, handler)
  },
  onClipAdded: (cb: (id: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, id: string): void => cb(id)
    ipcRenderer.on(IPC_EVENTS.CLIP_ADDED, handler)
    return () => ipcRenderer.removeListener(IPC_EVENTS.CLIP_ADDED, handler)
  },
  onSettingsChanged: (cb: (settings: AppSettings) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, s: AppSettings): void => cb(s)
    ipcRenderer.on(IPC_EVENTS.SETTINGS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_EVENTS.SETTINGS_CHANGED, handler)
  },
  onWindowFocused: (cb: () => void): (() => void) => {
    const handler = (): void => cb()
    ipcRenderer.on(IPC_EVENTS.WINDOW_FOCUSED, handler)
    return () => ipcRenderer.removeListener(IPC_EVENTS.WINDOW_FOCUSED, handler)
  }
}

contextBridge.exposeInMainWorld('clippy', api)

export type ClippyAPI = typeof api
