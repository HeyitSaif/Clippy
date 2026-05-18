export type ClipType = 'text' | 'image' | 'file'

export interface ClipRecord {
  id: string
  type: ClipType
  hash: string
  preview: string
  textContent: string | null
  htmlContent: string | null
  rtfContent: string | null
  imagePath: string | null
  thumbPath: string | null
  filePath: string | null
  isPinned: boolean
  isSnippet: boolean
  snippetName: string | null
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface ClipListItem {
  id: string
  type: ClipType
  hash: string
  preview: string
  hasThumb: boolean
  isPinned: boolean
  isSnippet: boolean
  snippetName: string | null
  tags: string[]
  createdAt: number
}

export interface SettingsUpdateResult {
  settings: AppSettings
  hotkeyError?: string
}

export interface AccessibilityStatus {
  supported: boolean
  granted: boolean
}

export interface AppSettings {
  autoPaste: boolean
  hideOnBlur: boolean
  launchAtLogin: boolean
  maxHistory: number
  toggleShortcut: string
  pollIntervalMs: number
  theme: 'system' | 'light' | 'dark'
  ignorePatterns: string[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoPaste: false,
  hideOnBlur: true,
  launchAtLogin: false,
  maxHistory: 1000,
  toggleShortcut: 'Alt+Space',
  pollIntervalMs: 500,
  theme: 'system',
  ignorePatterns: []
}

export interface ClipSearchQuery {
  text?: string
  type?: ClipType | 'all'
  pinned?: boolean
  snippet?: boolean
  tag?: string
  regex?: boolean
  limit?: number
  offset?: number
}

export interface ExportPayload {
  version: 2
  exportedAt: number
  clips: ClipRecord[]
}
