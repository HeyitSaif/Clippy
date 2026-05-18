import { app, BrowserWindow, systemPreferences } from 'electron'
import log from 'electron-log'
import { runAppleScript } from 'run-applescript'

const FOCUS_DELAY_MS = 130
const CLIPBOARD_DELAY_MS = 40

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type PasteFailureReason = 'accessibility' | 'paste'

export class PasteService {
  constructor(private getWindow: () => BrowserWindow | null) { }

  hasAccessibilityAccess(prompt = false): boolean {
    if (process.platform !== 'darwin') return true
    return systemPreferences.isTrustedAccessibilityClient(prompt)
  }

  private async releaseFocus(): Promise<void> {
    const win = this.getWindow()
    if (win?.isVisible()) win.hide()
    if (process.platform === 'darwin') app.hide()
    await sleep(FOCUS_DELAY_MS)
  }

  async paste(): Promise<boolean> {
    if (process.platform !== 'darwin') {
      log.warn('Auto-paste is macOS-only in v2')
      return false
    }

    if (!this.hasAccessibilityAccess(false)) {
      log.error('Auto-paste blocked — enable Clippy in System Settings → Privacy → Accessibility')
      return false
    }

    try {
      // key code 9 = physical V key — works across keyboard layouts
      await runAppleScript(
        'tell application "System Events" to key code 9 using command down'
      )
      return true
    } catch (err) {
      log.error('Auto-paste failed — grant Accessibility permission in System Settings', err)
      return false
    }
  }

  async writeAndAutoPaste(writeToClipboard: () => boolean, autoPaste: boolean): Promise<boolean> {
    const written = writeToClipboard()
    if (!written) return false
    if (!autoPaste) return true

    if (process.platform === 'darwin' && !this.hasAccessibilityAccess(false)) {
      log.error('Auto-paste requires Accessibility permission for Clippy')
      this.hasAccessibilityAccess(true)
      return false
    }

    await sleep(CLIPBOARD_DELAY_MS)
    await this.releaseFocus()
    return this.paste()
  }
}
