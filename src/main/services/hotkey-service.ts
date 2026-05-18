import { globalShortcut } from 'electron'
import log from 'electron-log'
import { pasteSlotAccelerator } from '@shared/hotkey'
import type { AppSettings } from '@shared/types'

export interface HotkeyRegisterResult {
  ok: boolean
  error?: string
}

export class HotkeyService {
  private registered = false
  private toggleOk = false

  constructor(
    private getSettings: () => AppSettings,
    private onToggle: () => void,
    private onPasteSlot: (slot: number) => void
  ) { }

  register(): HotkeyRegisterResult {
    this.unregister()
    const settings = this.getSettings()
    let toggleError: string | undefined

    try {
      this.toggleOk = globalShortcut.register(settings.toggleShortcut, () => this.onToggle())
      if (this.toggleOk) {
        log.info('Registered toggle shortcut', settings.toggleShortcut)
      } else {
        toggleError = `Could not register "${settings.toggleShortcut}" — it may be invalid or already in use.`
        log.warn(toggleError)
      }
    } catch (err) {
      toggleError = err instanceof Error ? err.message : 'Failed to register shortcut'
      log.error('Failed to register toggle shortcut', err)
    }

    for (let i = 1; i <= 9; i++) {
      const accel = pasteSlotAccelerator(i)
      try {
        const ok = globalShortcut.register(accel, () => this.onPasteSlot(i))
        const registered = globalShortcut.isRegistered(accel)
        if (ok && registered) {
          log.info(`Registered paste slot shortcut ${accel}`)
        } else {
          log.warn(`Paste slot shortcut unavailable ${accel} (ok=${ok}, isRegistered=${registered})`)
        }
      } catch (err) {
        log.error(`Failed to register ${accel}`, err)
      }
    }
    this.registered = true
    return { ok: this.toggleOk, error: toggleError }
  }

  unregister(): void {
    if (!this.registered) return
    globalShortcut.unregisterAll()
    this.registered = false
    this.toggleOk = false
  }
}
