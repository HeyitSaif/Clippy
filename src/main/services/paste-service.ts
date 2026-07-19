import { app, BrowserWindow } from "electron";
import log from "electron-log";
import { createSerialQueue } from "@shared/serial-queue";
import type { AccessibilityService } from "./accessibility-service";
import type { FocusService } from "./focus-service";
import {
  isLinuxPasteAvailable,
  simulatePasteShortcut,
} from "../platform/system-input";

const FOCUS_DELAY_MS = 150;
const CLIPBOARD_DELAY_MS = 40;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type PasteFailureReason = "accessibility" | "paste";

export type PasteResult =
  | { ok: true }
  | { ok: false; reason: PasteFailureReason };

export interface PasteOptions {
  autoPaste: boolean;
  hideAfterPaste?: boolean;
}

export class PasteService {
  /** Serialize hide→restore→paste so concurrent panel/slot/hotkey pastes cannot interleave. */
  private readonly enqueuePaste = createSerialQueue();

  constructor(
    private getWindow: () => BrowserWindow | null,
    private accessibility: AccessibilityService,
    private focus: FocusService,
    private onAccessibilityRequired?: () => void,
  ) {}

  private notifyAccessibilityRequired(): void {
    this.onAccessibilityRequired?.();
  }

  private async canAutoPaste(): Promise<boolean> {
    if (process.platform === "darwin") {
      return this.accessibility.isGranted();
    }
    if (process.platform === "linux") {
      return isLinuxPasteAvailable();
    }
    return true;
  }

  private async prepareExternalPaste(hideWindow: boolean): Promise<void> {
    if (hideWindow) {
      const win = this.getWindow();
      if (win?.isVisible()) win.hide();
      if (process.platform === "darwin") app.hide();
    }
    await this.focus.activatePreviousApp();
    await sleep(FOCUS_DELAY_MS);
  }

  async paste(): Promise<PasteResult> {
    if (!(await this.canAutoPaste())) {
      log.error("Auto-paste blocked — missing platform permissions or tools");
      this.notifyAccessibilityRequired();
      return { ok: false, reason: "accessibility" };
    }

    try {
      await simulatePasteShortcut();
      return { ok: true };
    } catch (err) {
      log.error("Auto-paste failed", err);
      return { ok: false, reason: "paste" };
    }
  }

  async writeAndAutoPaste(
    writeToClipboard: () => boolean,
    options: PasteOptions,
  ): Promise<PasteResult> {
    return this.enqueuePaste(() =>
      this.writeAndAutoPasteUnlocked(writeToClipboard, options),
    );
  }

  private async writeAndAutoPasteUnlocked(
    writeToClipboard: () => boolean,
    options: PasteOptions,
  ): Promise<PasteResult> {
    const written = writeToClipboard();
    if (!written) return { ok: false, reason: "paste" };
    if (!options.autoPaste) return { ok: true };

    if (!(await this.canAutoPaste())) {
      if (process.platform === "darwin") {
        this.accessibility.requestAccess();
      }
      this.notifyAccessibilityRequired();
      return { ok: false, reason: "accessibility" };
    }

    await sleep(CLIPBOARD_DELAY_MS);
    await this.prepareExternalPaste(options.hideAfterPaste ?? true);
    return this.paste();
  }
}
