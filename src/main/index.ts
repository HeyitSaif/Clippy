import { app, BrowserWindow } from "electron";
import log from "electron-log";
import { createDatabase, importLegacyV1 } from "./db/database";
import { ClipboardService } from "./services/clipboard-service";
import { PasteService } from "./services/paste-service";
import { AccessibilityService } from "./services/accessibility-service";
import { FocusService } from "./services/focus-service";
import { HotkeyService } from "./services/hotkey-service";
import { TodoRotateService } from "./services/todo-rotate-service";
import { TodoReminderService } from "./services/todo-reminder-service";
import { createMainWindow, TrayService } from "./window/main-window";
import {
  registerIpcHandlers,
  notifyClipAdded,
  notifyClipsUpdated,
  notifyTodosUpdated,
  notifyTodoReminder,
  notifyWindowFocused,
  notifyAccessibilityRequired,
  notifySettingsChanged,
} from "./ipc/handlers";
import {
  registerMediaSchemesAsPrivileged,
  registerMediaProtocols,
} from "./protocol/media-protocol";
import type { AppSettings } from "@shared/types";

// Must run before app.whenReady() — both schemes in one call
registerMediaSchemesAsPrivileged();

log.initialize();
log.info("Clippy v2 starting");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Second instance must not open the DB or register hotkeys/tray
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
const { clipRepo, settingsRepo, todoRepo } = createDatabase();
let settings: AppSettings = settingsRepo.getAll();

const clipboardService = new ClipboardService(clipRepo, () => settings);
const accessibilityService = new AccessibilityService();
const focusService = new FocusService();
const pasteService = new PasteService(
  () => mainWindow,
  accessibilityService,
  focusService,
  () => notifyAccessibilityRequired(),
);

const todoRotateService = new TodoRotateService(todoRepo, settingsRepo, () =>
  notifyTodosUpdated(),
);
const todoReminderService = new TodoReminderService(
  todoRepo,
  settingsRepo,
  () => notifyTodosUpdated(),
  (target) => {
    void showClippyWindow().then(() => notifyTodoReminder(target));
  },
);

async function showClippyWindow(): Promise<void> {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) {
    await focusService.captureFrontmostApp();
  }
  if (process.platform === "darwin") app.show();
  mainWindow.show();
  mainWindow.focus();
  notifyWindowFocused();
  todoRotateService.onWindowFocus();
  todoReminderService.checkNow();
}

function hideClippyWindow(): void {
  mainWindow?.hide();
  if (process.platform === "darwin") app.hide();
}

const hotkeyService = new HotkeyService(
  () => settings,
  () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      hideClippyWindow();
    } else {
      void showClippyWindow();
    }
  },
  async (slot) => {
    if (!mainWindow?.isVisible()) {
      await focusService.captureFrontmostApp();
    }
    const clips = clipRepo.list(9, 0);
    const item = clips[slot - 1];
    if (!item) {
      log.warn(`Paste slot ${slot} empty — no clip at that position`);
      return;
    }
    log.info(`Paste slot ${slot} triggered for clip ${item.id}`);
    // Global paste slots always paste; Auto Paste setting only affects panel Enter/click
    const result = await pasteService.writeAndAutoPaste(
      () => clipboardService.writeClipToSystem(item.id),
      { autoPaste: true, hideAfterPaste: true },
    );
    if (!result.ok) {
      log.warn(`Paste slot ${slot} failed — reason=${result.reason}`);
    }
  },
);

let trayService!: TrayService;

function applyLoginItem(s: AppSettings): void {
  app.setLoginItemSettings({
    openAtLogin: s.launchAtLogin,
    openAsHidden: true,
  });
}

function onSettingsUpdated(next: AppSettings): { ok: boolean; error?: string } {
  settings = next;
  applyLoginItem(next);
  const result = hotkeyService.register();
  trayService.rebuildMenu();
  notifySettingsChanged(next);
  if (next.todoRemindersEnabled) {
    todoReminderService.checkNow();
  }
  return result;
}

trayService = new TrayService(
  () => mainWindow,
  () => settings,
  (partial) => {
    const next = settingsRepo.update(partial);
    onSettingsUpdated(next);
  },
  () => {
    clipRepo.clearUnpinned();
    notifyClipsUpdated();
  },
  () => app.quit(),
  () => showClippyWindow(),
);

registerIpcHandlers({
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
});

function hardenWebContents(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    const allowed =
      url.startsWith("file://") ||
      (process.env.ELECTRON_RENDERER_URL != null &&
        url.startsWith(process.env.ELECTRON_RENDERER_URL));
    if (!allowed) event.preventDefault();
  });
}

function createWindow(): void {
  mainWindow = createMainWindow();
  hardenWebContents(mainWindow);

  mainWindow.on("blur", () => {
    if (settings.hideOnBlur) {
      mainWindow?.hide();
      if (process.platform === "darwin") {
        app.hide();
      }
    }
  });

  mainWindow.on("show", () => {
    if (process.platform === "darwin") {
      app.show();
    }
    mainWindow?.focus();
    notifyWindowFocused();
    todoRotateService.onWindowFocus();
  });

  mainWindow.webContents.once("dom-ready", () => {
    clipboardService.onClip((clipId) => notifyClipAdded(clipId));
    clipboardService.start();

    void accessibilityService.refresh().then((status) => {
      if (status.supported && !status.granted) {
        setTimeout(() => {
          void accessibilityService.promptForAccess();
        }, 600);
      }
    });
  });
}

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.clippy.app");
  }

  importLegacyV1(clipRepo);
  settings = settingsRepo.getAll();
  applyLoginItem(settings);

  // Register custom protocol handlers after ready, before createWindow
  registerMediaProtocols(clipRepo);

  createWindow();
  trayService.create();
  hotkeyService.register();
  todoRotateService.start();
  todoReminderService.start();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else void showClippyWindow();
  });
});

app.on("second-instance", () => {
  void showClippyWindow();
});

app.on("will-quit", () => {
  hotkeyService.unregister();
  clipboardService.stop();
  todoRotateService.stop();
  todoReminderService.stop();
  trayService.destroy();
  clipRepo.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
