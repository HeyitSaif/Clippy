import { shell, systemPreferences } from 'electron'
import log from 'electron-log'
import type { AccessibilityStatus } from '@shared/types'
import { isLinuxPasteAvailable } from '../platform/system-input'

const ACCESSIBILITY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Accessibility'
const ACCESSIBILITY_SETTINGS_URL_LEGACY =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'

export class AccessibilityService {
  private linuxPasteReady: boolean | null = null

  isSupported(): boolean {
    return process.platform === 'darwin' || process.platform === 'linux'
  }

  async getStatus(): Promise<AccessibilityStatus> {
    if (process.platform === 'darwin') {
      return {
        supported: true,
        granted: systemPreferences.isTrustedAccessibilityClient(false),
        message: 'Enable Clippy in System Settings → Privacy & Security → Accessibility.'
      }
    }

    if (process.platform === 'linux') {
      if (this.linuxPasteReady === null) {
        this.linuxPasteReady = await isLinuxPasteAvailable()
      }
      return {
        supported: true,
        granted: this.linuxPasteReady,
        message: 'Install xdotool for auto-paste on Linux (e.g. sudo apt install xdotool).'
      }
    }

    return {
      supported: false,
      granted: true,
      message: 'Auto-paste uses standard shortcuts on Windows.'
    }
  }

  isGranted(): boolean {
    if (process.platform === 'darwin') {
      return systemPreferences.isTrustedAccessibilityClient(false)
    }
    if (process.platform === 'linux') {
      return this.linuxPasteReady ?? false
    }
    return true
  }

  async refresh(): Promise<AccessibilityStatus> {
    if (process.platform === 'linux') {
      this.linuxPasteReady = await isLinuxPasteAvailable()
    }
    return this.getStatus()
  }

  requestAccess(): boolean {
    if (process.platform !== 'darwin') return this.isGranted()
    const granted = systemPreferences.isTrustedAccessibilityClient(true)
    log.info(`Accessibility request — granted=${granted}`)
    return granted
  }

  async openSettings(): Promise<void> {
    if (process.platform === 'darwin') {
      try {
        await shell.openExternal(ACCESSIBILITY_SETTINGS_URL)
      } catch (err) {
        log.warn('Failed to open Accessibility settings (primary URL)', err)
        await shell.openExternal(ACCESSIBILITY_SETTINGS_URL_LEGACY)
      }
      return
    }

    if (process.platform === 'linux') {
      await shell.openExternal('https://wiki.archlinux.org/title/Xdotool')
    }
  }

  async promptForAccess(): Promise<AccessibilityStatus> {
    const status = await this.getStatus()
    if (process.platform === 'darwin' && !status.granted) {
      this.requestAccess()
      await this.openSettings()
    }
    if (process.platform === 'linux' && !status.granted) {
      await this.openSettings()
    }
    return this.refresh()
  }
}
