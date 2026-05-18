import { shell, systemPreferences } from 'electron'
import log from 'electron-log'
import type { AccessibilityStatus } from '@shared/types'

const ACCESSIBILITY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Accessibility'
const ACCESSIBILITY_SETTINGS_URL_LEGACY =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'

export class AccessibilityService {
  isSupported(): boolean {
    return process.platform === 'darwin'
  }

  getStatus(): AccessibilityStatus {
    if (!this.isSupported()) {
      return { supported: false, granted: true }
    }
    return {
      supported: true,
      granted: systemPreferences.isTrustedAccessibilityClient(false)
    }
  }

  isGranted(): boolean {
    return this.getStatus().granted
  }

  /** Registers the app and shows the macOS accessibility consent dialog. */
  requestAccess(): boolean {
    if (!this.isSupported()) return true
    const granted = systemPreferences.isTrustedAccessibilityClient(true)
    log.info(`Accessibility request — granted=${granted}`)
    return granted
  }

  async openSettings(): Promise<void> {
    if (!this.isSupported()) return
    try {
      await shell.openExternal(ACCESSIBILITY_SETTINGS_URL)
    } catch (err) {
      log.warn('Failed to open Accessibility settings (primary URL)', err)
      await shell.openExternal(ACCESSIBILITY_SETTINGS_URL_LEGACY)
    }
  }

  async promptForAccess(): Promise<AccessibilityStatus> {
    if (!this.isSupported()) return this.getStatus()
    if (!this.isGranted()) {
      this.requestAccess()
      await this.openSettings()
    }
    return this.getStatus()
  }
}
