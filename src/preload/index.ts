import { contextBridge, ipcRenderer } from 'electron'
import { IPC, IPC_EVENTS } from '@shared/ipc-channels'
import type {
  AccessibilityStatus,
  AppSettings,
  ClipListItem,
  ClipRecord,
  ClipSearchQuery,
  SettingsUpdateResult,
  TodoFilterQuery,
  TodoItem,
  TodoList
} from '@shared/types'

/** Create payload for todos:create (mirrors main CreateTodoInput). */
export interface PreloadCreateTodoInput {
  title: string
  listId: string
  priority?: 0 | 1 | 2 | 3
  dueAt?: number | null
  notes?: string | null
  remindAt?: number | null
}

/** Partial update for todos:update (mirrors main UpdateTodoPartial). */
export type PreloadUpdateTodoPartial = Partial<{
  title: string
  notes: string | null
  listId: string
  priority: 0 | 1 | 2 | 3
  dueAt: number | null
  remindAt: number | null
  sortOrder: number
  isCompleted: boolean
}>

const api = {
  listClips: (limit?: number, offset?: number): Promise<ClipListItem[]> =>
    ipcRenderer.invoke(IPC.CLIPS_LIST, limit, offset),
  searchClips: (query: ClipSearchQuery): Promise<ClipListItem[]> =>
    ipcRenderer.invoke(IPC.CLIPS_SEARCH, query),
  getClip: (id: string): Promise<ClipRecord | null> => ipcRenderer.invoke(IPC.CLIPS_GET, id),
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

  // Todos
  listTodoLists: (): Promise<TodoList[]> => ipcRenderer.invoke(IPC.TODOS_LIST_LISTS),
  createTodoList: (name: string): Promise<TodoList> =>
    ipcRenderer.invoke(IPC.TODOS_CREATE_LIST, name),
  renameTodoList: (id: string, name: string): Promise<TodoList | null> =>
    ipcRenderer.invoke(IPC.TODOS_RENAME_LIST, id, name),
  deleteTodoList: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.TODOS_DELETE_LIST, id),
  listTodos: (query?: TodoFilterQuery): Promise<TodoItem[]> =>
    ipcRenderer.invoke(IPC.TODOS_LIST, query),
  getTodo: (id: string): Promise<TodoItem | null> => ipcRenderer.invoke(IPC.TODOS_GET, id),
  createTodo: (input: PreloadCreateTodoInput): Promise<TodoItem> =>
    ipcRenderer.invoke(IPC.TODOS_CREATE, input),
  updateTodo: (id: string, partial: PreloadUpdateTodoPartial): Promise<TodoItem | null> =>
    ipcRenderer.invoke(IPC.TODOS_UPDATE, id, partial),
  toggleTodoComplete: (id: string): Promise<TodoItem | null> =>
    ipcRenderer.invoke(IPC.TODOS_TOGGLE_COMPLETE, id),
  deleteTodo: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.TODOS_DELETE, id),
  reorderTodos: (listId: string, orderedIds: string[]): Promise<boolean> =>
    ipcRenderer.invoke(IPC.TODOS_REORDER, listId, orderedIds),
  onTodosUpdated: (cb: () => void): (() => void) => {
    const handler = (): void => cb()
    ipcRenderer.on(IPC_EVENTS.TODOS_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_EVENTS.TODOS_UPDATED, handler)
  },

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
