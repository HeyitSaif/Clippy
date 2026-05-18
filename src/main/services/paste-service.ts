import { app, BrowserWindow } from 'electron'
import log from 'electron-log'
import { runAppleScript } from 'run-applescript'
import type { AccessibilityService } from './accessibility-service'

const FOCUS_DELAY_MS = 130
const CLIPBOARD_DELAY_MS = 40

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type PasteFailureReason = 'accessibility' | 'paste'

export type PasteResult = { ok: true } | { ok: false; reason: PasteFailureReason }

export class PasteService {
  constructor(
    private getWindow: () => BrowserWindow | null,
    private accessibility: AccessibilityService,
    private onAccessibilityRequired?: () => void
  ) { }

  private async releaseFocus(): Promise<void> {
    const win = this.getWindow()
    if (win?.isVisible()) win.hide()
    if (process.platform === 'darwin') app.hide()
    await sleep(FOCUS_DELAY_MS)
  }

  private notifyAccessibilityRequired(): void {
    this.onAccessibilityRequired?.()
  }

  async paste(): Promise<PasteResult> {
    if (process.platform !== 'darwin') {
      log.warn('Auto-paste is macOS-only in v2')
      return { ok: false, reason: 'paste' }
    }

    if (!this.accessibility.isGranted()) {
      log.error('Auto-paste blocked — enable Clippy in System Settings → Privacy → Accessibility')
      this.notifyAccessibilityRequired()
      return { ok: false, reason: 'accessibility' }
    }

    try {
      await runAppleScript(
        'tell application "System Events" to key code 9 using command down'
      )
      return { ok: true }
    } catch (err) {
      log.error('Auto-paste failed — grant Accessibility permission in System Settings', err)
      return { ok: false, reason: 'paste' }
    }
  }

  async writeAndAutoPaste(writeToClipboard: () => boolean, autoPaste: boolean): Promise<PasteResult> {
    const written = writeToClipboard()
    if (!written) return { ok: false, reason: 'paste' }
    if (!autoPaste) return { ok: true }

    if (process.platform === 'darwin' && !this.accessibility.isGranted()) {
      log.error('Auto-paste requires Accessibility permission for Clippy')
      this.accessibility.requestAccess()
      this.notifyAccessibilityRequired()
      return { ok: false, reason: 'accessibility' }
    }

    await sleep(CLIPBOARD_DELAY_MS)
    await this.releaseFocus()
    return this.paste()
  }
}
