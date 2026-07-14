import { ipcMain, BrowserWindow, app, dialog } from "electron";
import fs from "node:fs";
import { IPC, IPC_EVENTS } from "@shared/ipc-channels";
import type { ClipRepository, SettingsRepository } from "../db/database";
import type {
  CreateTodoInput,
  TodoRepository,
  UpdateTodoPartial,
} from "../db/todos";
import type { ClipboardService } from "../services/clipboard-service";
import type { PasteService } from "../services/paste-service";
import type { AccessibilityService } from "../services/accessibility-service";
import type { TodoRotateService } from "../services/todo-rotate-service";
import type {
  AppSettings,
  ClipSearchQuery,
  ExportPayload,
  SettingsUpdateResult,
  TodoFilterQuery,
} from "@shared/types";

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

function broadcast(event: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(event, payload);
  }
}

export function registerIpcHandlers(deps: {
  clipRepo: ClipRepository;
  settingsRepo: SettingsRepository;
  todoRepo: TodoRepository;
  clipboardService: ClipboardService;
  pasteService: PasteService;
  accessibilityService: AccessibilityService;
  todoRotateService: TodoRotateService;
  onSettingsUpdated: (settings: AppSettings) => { ok: boolean; error?: string };
  showClippyWindow: () => Promise<void>;
  hideClippyWindow: () => void;
}): void {
  const {
    clipRepo,
    settingsRepo,
    todoRepo,
    clipboardService,
    pasteService,
    accessibilityService,
    todoRotateService,
    onSettingsUpdated,
    showClippyWindow,
    hideClippyWindow,
  } = deps;

  ipcMain.handle(IPC.CLIPS_LIST, (_e, limit?: number, offset?: number) => {
    return clipRepo.list(limit ?? 50, offset ?? 0);
  });

  ipcMain.handle(IPC.CLIPS_SEARCH, (_e, query: ClipSearchQuery) => {
    const settings = settingsRepo.getAll();
    return clipRepo.search({
      ...query,
      sortMode: query.sortMode ?? settings.searchSortMode,
    });
  });

  ipcMain.handle(IPC.CLIPS_GET, (_e, id: string) => {
    return clipRepo.getById(id);
  });

  ipcMain.handle(IPC.CLIPS_GET_LIST_ITEM, (_e, id: string) => {
    return clipRepo.getListItem(id);
  });

  ipcMain.handle(IPC.CLIPS_COPY, (_e, id: string) => {
    return clipboardService.writeClipToSystem(id);
  });

  ipcMain.handle(IPC.CLIPS_PASTE, async (_e, id: string) => {
    const current = settingsRepo.getAll();
    const result = await pasteService.writeAndAutoPaste(
      () => clipboardService.writeClipToSystem(id),
      { autoPaste: current.autoPaste, hideAfterPaste: current.hideOnBlur },
    );
    return result.ok;
  });

  ipcMain.handle(IPC.CLIPS_DELETE, (_e, id: string) => {
    clipRepo.delete(id);
    broadcast(IPC_EVENTS.CLIPS_UPDATED);
    return true;
  });

  ipcMain.handle(IPC.CLIPS_TOGGLE_PIN, (_e, id: string) => {
    const result = clipRepo.togglePin(id);
    broadcast(IPC_EVENTS.CLIPS_UPDATED);
    return result;
  });

  ipcMain.handle(IPC.CLIPS_TOGGLE_SNIPPET, (_e, id: string, name?: string) => {
    const result = clipRepo.toggleSnippet(id, name);
    broadcast(IPC_EVENTS.CLIPS_UPDATED);
    return result;
  });

  ipcMain.handle(IPC.CLIPS_UPDATE_TAGS, (_e, id: string, tags: string[]) => {
    const result = clipRepo.updateTags(id, tags);
    broadcast(IPC_EVENTS.CLIPS_UPDATED);
    return result;
  });

  ipcMain.handle(IPC.CLIPS_CLEAR, () => {
    const count = clipRepo.clearUnpinned();
    broadcast(IPC_EVENTS.CLIPS_UPDATED);
    return count;
  });

  ipcMain.handle(IPC.CLIPS_EXPORT, async () => {
    const win = getMainWindow();
    const result = await dialog.showSaveDialog(
      win ?? (undefined as unknown as Electron.BrowserWindow),
      {
        title: "Export Clippy History",
        defaultPath: `clippy-export-${Date.now()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      },
    );
    if (result.canceled || !result.filePath) return null;
    const payload: ExportPayload = {
      version: 2,
      exportedAt: Date.now(),
      clips: clipRepo.getAllRecords(),
    };
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2));
    return result.filePath;
  });

  ipcMain.handle(IPC.CLIPS_IMPORT, async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(
      win ?? (undefined as unknown as Electron.BrowserWindow),
      {
        title: "Import Clippy History",
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"],
      },
    );
    if (result.canceled || !result.filePaths[0]) return 0;
    const raw = JSON.parse(
      fs.readFileSync(result.filePaths[0], "utf8"),
    ) as ExportPayload;
    const imported = clipRepo.runInTransaction(() => {
      let count = 0;
      for (const clip of raw.clips ?? []) {
        if (clipRepo.getByHash(clip.hash)) continue;
        clipRepo.insertClip({
          type: clip.type,
          hash: `${clip.hash}-import-${Date.now()}-${count}`,
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
          tags: clip.tags,
        });
        count++;
      }
      return count;
    });
    broadcast(IPC_EVENTS.CLIPS_UPDATED);
    return imported;
  });

  ipcMain.handle(IPC.CLIPS_PASTE_SLOT, async (_e, slot: number) => {
    const clips = clipRepo.list(9, 0);
    const item = clips[slot - 1];
    if (!item) return false;
    // Paste slots always paste — independent of settings.autoPaste (panel-only)
    const result = await pasteService.writeAndAutoPaste(
      () => clipboardService.writeClipToSystem(item.id),
      { autoPaste: true, hideAfterPaste: true },
    );
    return result.ok;
  });

  ipcMain.handle(IPC.ACCESSIBILITY_GET_STATUS, () =>
    accessibilityService.getStatus(),
  );

  ipcMain.handle(IPC.ACCESSIBILITY_REQUEST, async () => {
    const status = await accessibilityService.promptForAccess();
    if (!status.granted) notifyAccessibilityRequired();
    return status;
  });

  ipcMain.handle(IPC.APP_GET_PLATFORM, () => process.platform);

  ipcMain.handle(IPC.SETTINGS_GET, () => settingsRepo.getAll());

  ipcMain.handle(
    IPC.SETTINGS_UPDATE,
    (_e, partial: Partial<AppSettings>): SettingsUpdateResult => {
      const prev = settingsRepo.getAll();
      const next = settingsRepo.update(partial);
      const hotkeyResult = onSettingsUpdated(next);
      // onSettingsUpdated broadcasts SETTINGS_CHANGED (covers tray + IPC paths)
      if (
        partial.searchSortMode &&
        partial.searchSortMode !== prev.searchSortMode
      ) {
        broadcast(IPC_EVENTS.CLIPS_UPDATED);
      }
      return { settings: next, hotkeyError: hotkeyResult.error };
    },
  );

  ipcMain.handle(IPC.WINDOW_HIDE, () => {
    hideClippyWindow();
  });

  ipcMain.handle(IPC.WINDOW_SHOW, async () => {
    await showClippyWindow();
  });

  ipcMain.handle(IPC.WINDOW_TOGGLE, async () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isVisible()) hideClippyWindow();
    else await showClippyWindow();
  });

  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion());

  // ── Todos ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.TODOS_LIST_LISTS, () => {
    todoRotateService.check();
    return todoRepo.listLists();
  });

  ipcMain.handle(IPC.TODOS_CREATE_LIST, (_e, name: string) => {
    const list = todoRepo.createList(name);
    broadcast(IPC_EVENTS.TODOS_UPDATED);
    return list;
  });

  ipcMain.handle(IPC.TODOS_RENAME_LIST, (_e, id: string, name: string) => {
    const list = todoRepo.renameList(id, name);
    if (list) broadcast(IPC_EVENTS.TODOS_UPDATED);
    return list;
  });

  ipcMain.handle(IPC.TODOS_DELETE_LIST, (_e, id: string) => {
    const ok = todoRepo.deleteList(id);
    if (ok) broadcast(IPC_EVENTS.TODOS_UPDATED);
    return ok;
  });

  ipcMain.handle(IPC.TODOS_LIST, (_e, query?: TodoFilterQuery) => {
    todoRotateService.check();
    return todoRepo.listTodos(query ?? {});
  });

  ipcMain.handle(IPC.TODOS_GET, (_e, id: string) => {
    return todoRepo.getTodoById(id);
  });

  ipcMain.handle(IPC.TODOS_CREATE, (_e, input: CreateTodoInput) => {
    const todo = todoRepo.createTodo(input);
    broadcast(IPC_EVENTS.TODOS_UPDATED);
    return todo;
  });

  ipcMain.handle(
    IPC.TODOS_UPDATE,
    (_e, id: string, partial: UpdateTodoPartial) => {
      const todo = todoRepo.updateTodo(id, partial);
      if (todo) broadcast(IPC_EVENTS.TODOS_UPDATED);
      return todo;
    },
  );

  ipcMain.handle(IPC.TODOS_TOGGLE_COMPLETE, (_e, id: string) => {
    const todo = todoRepo.toggleComplete(id);
    if (todo) broadcast(IPC_EVENTS.TODOS_UPDATED);
    return todo;
  });

  ipcMain.handle(IPC.TODOS_DELETE, (_e, id: string) => {
    const ok = todoRepo.deleteTodo(id);
    if (ok) broadcast(IPC_EVENTS.TODOS_UPDATED);
    return ok;
  });

  ipcMain.handle(
    IPC.TODOS_REORDER,
    (_e, listId: string, orderedIds: string[]) => {
      todoRepo.reorderTodos(listId, orderedIds);
      broadcast(IPC_EVENTS.TODOS_UPDATED);
      return true;
    },
  );
}

export function notifyAccessibilityRequired(): void {
  broadcast(IPC_EVENTS.ACCESSIBILITY_REQUIRED);
}

export function notifyWindowFocused(): void {
  broadcast(IPC_EVENTS.WINDOW_FOCUSED);
}

export function notifyTodosUpdated(): void {
  broadcast(IPC_EVENTS.TODOS_UPDATED);
}

/** Single-clip insert: renderer handles incremental list update. Do not also send CLIPS_UPDATED. */
export function notifyClipAdded(clipId: string): void {
  broadcast(IPC_EVENTS.CLIP_ADDED, clipId);
}

/** Full list refresh (clear, delete, pin, import, etc.). */
export function notifyClipsUpdated(): void {
  broadcast(IPC_EVENTS.CLIPS_UPDATED);
}

export function notifySettingsChanged(settings: AppSettings): void {
  broadcast(IPC_EVENTS.SETTINGS_CHANGED, settings);
}
