import { BrowserWindow, Tray, Menu } from "electron";
import path from "node:path";
import log from "electron-log";
import type { AppSettings } from "@shared/types";
import { getMainWindowOptions } from "../platform/window-options";
import { loadTrayIcon } from "./tray-icon";

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow(
    getMainWindowOptions(path.join(__dirname, "../preload/index.js")),
  );

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  win.once("ready-to-show", () => win.show());
  return win;
}

const TRAY_TOOLTIP = "Clippy — click to show, right-click for options";

export class TrayService {
  private tray: Tray | null = null;
  private menu: Menu | null = null;

  constructor(
    _getWindow: () => BrowserWindow | null,
    private getSettings: () => AppSettings,
    private onSettingsChange: (partial: Partial<AppSettings>) => void,
    private onClear: () => void,
    private onQuit: () => void,
    private showWindow: () => void | Promise<void>,
  ) {}

  create(): void {
    try {
      const icon = loadTrayIcon();
      this.tray = new Tray(icon);
      this.applyTooltip();
      this.rebuildMenu();

      // Do NOT use setContextMenu — on macOS that steals left-click for the menu.
      // Left click → show Clippy; right click → options.
      this.tray.on("click", () => {
        void this.showWindow();
      });
      this.tray.on("right-click", () => {
        if (!this.tray || !this.menu) return;
        this.tray.popUpContextMenu(this.menu);
      });

      log.info("Tray icon created");
    } catch (err) {
      log.error("Failed to create tray icon", err);
    }
  }

  private applyTooltip(): void {
    if (!this.tray) return;
    this.tray.setToolTip(TRAY_TOOLTIP);
  }

  rebuildMenu(): void {
    if (!this.tray) return;
    this.applyTooltip();
    const settings = this.getSettings();
    this.menu = Menu.buildFromTemplate([
      {
        label: "Clippy",
        enabled: false,
      },
      {
        label: "Show Clippy",
        click: () => {
          void this.showWindow();
        },
      },
      { type: "separator" },
      {
        label: "Auto Paste (panel)",
        type: "checkbox",
        checked: settings.autoPaste,
        click: (item) => this.onSettingsChange({ autoPaste: item.checked }),
      },
      {
        label: "Global Paste Slots",
        type: "checkbox",
        checked: settings.globalPasteSlots ?? true,
        click: (item) =>
          this.onSettingsChange({ globalPasteSlots: item.checked }),
      },
      {
        label: "Don't Hide on Blur",
        type: "checkbox",
        checked: !settings.hideOnBlur,
        click: (item) => this.onSettingsChange({ hideOnBlur: !item.checked }),
      },
      {
        label: "Launch at Login",
        type: "checkbox",
        checked: settings.launchAtLogin,
        click: (item) => this.onSettingsChange({ launchAtLogin: item.checked }),
      },
      { type: "separator" },
      { label: "Clear History", click: () => this.onClear() },
      { type: "separator" },
      { label: "Quit Clippy", click: () => this.onQuit() },
    ]);
    // Keep context menu unset so left-click stays a click event on all platforms
    this.tray.setContextMenu(null);
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
    this.menu = null;
  }
}
