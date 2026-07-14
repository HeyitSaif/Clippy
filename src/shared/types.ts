export type ClipType = "text" | "image" | "file";

export interface ClipRecord {
  id: string;
  type: ClipType;
  hash: string;
  preview: string;
  textContent: string | null;
  htmlContent: string | null;
  rtfContent: string | null;
  imagePath: string | null;
  thumbPath: string | null;
  filePath: string | null;
  isPinned: boolean;
  isSnippet: boolean;
  snippetName: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ClipListItem {
  id: string;
  type: ClipType;
  hash: string;
  preview: string;
  hasThumb: boolean;
  isPinned: boolean;
  isSnippet: boolean;
  snippetName: string | null;
  tags: string[];
  createdAt: number;
}

export interface SettingsUpdateResult {
  settings: AppSettings;
  hotkeyError?: string;
}

export interface AccessibilityStatus {
  supported: boolean;
  granted: boolean;
  message?: string;
}

export type SearchSortMode = "hybrid" | "relevance" | "recency";

/** System and user list kinds. */
export type TodoListKind = "inbox" | "daily" | "weekly" | "custom";

/** 0 = none, 1 = low, 2 = medium, 3 = high. */
export type TodoPriority = 0 | 1 | 2 | 3;

export interface TodoList {
  id: string;
  name: string;
  kind: TodoListKind;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface TodoItem {
  id: string;
  listId: string;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  priority: TodoPriority;
  dueAt: number | null;
  remindAt: number | null;
  sortOrder: number;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface TodoFilterQuery {
  listId?: string;
  /** When set, filter by completion state; omit for all. */
  completed?: boolean;
  /** Case-insensitive substring match on title/notes. */
  q?: string;
}

/** Stable ids for seeded system lists. */
export const TODO_SYSTEM_LIST_IDS = {
  inbox: "todo-list-inbox",
  daily: "todo-list-daily",
  weekly: "todo-list-weekly",
} as const;

export interface AppSettings {
  autoPaste: boolean;
  /** Register global paste slot shortcuts (⌘⌃1–9 / Ctrl+Alt+1–9). Independent of autoPaste. */
  globalPasteSlots: boolean;
  hideOnBlur: boolean;
  launchAtLogin: boolean;
  maxHistory: number;
  toggleShortcut: string;
  pollIntervalMs: number;
  theme: "system" | "light" | "dark";
  ignorePatterns: string[];
  searchSortMode: SearchSortMode;
  /** Show completed todos in lists (default true). */
  todoShowCompleted: boolean;
  /** Fire system notifications for todo reminders (default true). */
  todoRemindersEnabled: boolean;
  /** Auto-rotate Daily/Weekly lists at the configured hour (default true). */
  todoRotateEnabled: boolean;
  /** Local hour 0–23 when daily/weekly rotation runs (default 0 = midnight). */
  todoRotateHour: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoPaste: false,
  globalPasteSlots: true,
  hideOnBlur: true,
  launchAtLogin: false,
  maxHistory: 1000,
  toggleShortcut: "Alt+Space",
  pollIntervalMs: 500,
  theme: "system",
  ignorePatterns: [],
  searchSortMode: "hybrid",
  todoShowCompleted: true,
  todoRemindersEnabled: true,
  todoRotateEnabled: true,
  todoRotateHour: 0,
};

export interface ClipSearchQuery {
  text?: string;
  type?: ClipType | "all";
  pinned?: boolean;
  snippet?: boolean;
  tag?: string;
  regex?: boolean;
  sortMode?: SearchSortMode;
  limit?: number;
  offset?: number;
}

export interface ExportPayload {
  version: 2;
  exportedAt: number;
  clips: ClipRecord[];
}
