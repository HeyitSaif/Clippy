import { globalShortcut } from "electron";
import log from "electron-log";
import { pasteSlotAccelerator } from "@shared/hotkey";
import type { AppSettings } from "@shared/types";

export interface HotkeyRegisterResult {
  ok: boolean;
  error?: string;
}

export class HotkeyService {
  private registeredAccelerators: string[] = [];
  private toggleOk = false;

  constructor(
    private getSettings: () => AppSettings,
    private onToggle: () => void,
    private onPasteSlot: (slot: number) => void,
  ) {}

  register(): HotkeyRegisterResult {
    // Always clear first — do not rely on an internal flag (out-of-sync = stuck shortcuts)
    this.unregister();
    const settings = this.getSettings();
    let toggleError: string | undefined;

    try {
      this.toggleOk = globalShortcut.register(settings.toggleShortcut, () =>
        this.onToggle(),
      );
      if (this.toggleOk) {
        this.registeredAccelerators.push(settings.toggleShortcut);
        log.info("Registered toggle shortcut", settings.toggleShortcut);
      } else {
        toggleError = `Could not register "${settings.toggleShortcut}" — it may be invalid or already in use.`;
        log.warn(toggleError);
      }
    } catch (err) {
      this.toggleOk = false;
      toggleError =
        err instanceof Error ? err.message : "Failed to register shortcut";
      log.error("Failed to register toggle shortcut", err);
    }

    // Global paste slots — separate toggle from panel Auto Paste
    if (settings.globalPasteSlots) {
      for (let i = 1; i <= 9; i++) {
        const accel = pasteSlotAccelerator(i, process.platform);
        try {
          const ok = globalShortcut.register(accel, () => this.onPasteSlot(i));
          const registered = globalShortcut.isRegistered(accel);
          if (ok && registered) {
            this.registeredAccelerators.push(accel);
            log.info(`Registered paste slot shortcut ${accel}`);
          } else {
            log.warn(
              `Paste slot shortcut unavailable ${accel} (ok=${ok}, isRegistered=${registered})`,
            );
          }
        } catch (err) {
          log.error(`Failed to register ${accel}`, err);
        }
      }
    } else {
      log.info("Global paste slots off — slot shortcuts not registered");
    }

    return { ok: this.toggleOk, error: toggleError };
  }

  unregister(): void {
    // Prefer precise unregister so we always free what we own, even if unregisterAll fails
    for (const accel of this.registeredAccelerators) {
      try {
        if (globalShortcut.isRegistered(accel)) {
          globalShortcut.unregister(accel);
        }
      } catch (err) {
        log.warn(`Failed to unregister ${accel}`, err);
      }
    }
    this.registeredAccelerators = [];

    try {
      globalShortcut.unregisterAll();
    } catch (err) {
      log.warn("globalShortcut.unregisterAll failed", err);
    }

    this.toggleOk = false;
  }
}
