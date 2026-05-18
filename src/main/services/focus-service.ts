import log from 'electron-log'
import { runAppleScript } from 'run-applescript'

function isClippyProcess(name: string): boolean {
  const lower = name.toLowerCase()
  return lower === 'clippy' || lower === 'electron' || lower.includes('clippy')
}

export class FocusService {
  private previousAppName: string | null = null

  getPreviousAppName(): string | null {
    return this.previousAppName
  }

  async captureFrontmostApp(): Promise<void> {
    if (process.platform !== 'darwin') return
    try {
      const name = (
        await runAppleScript(`
        tell application "System Events"
          return name of first application process whose frontmost is true
        end tell
      `)
      ).trim()
      if (name && !isClippyProcess(name)) {
        this.previousAppName = name
        log.info(`Captured paste target app: ${name}`)
      }
    } catch (err) {
      log.warn('Failed to capture frontmost app', err)
    }
  }

  async activatePreviousApp(): Promise<boolean> {
    if (process.platform !== 'darwin' || !this.previousAppName) return false
    const escaped = this.previousAppName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    try {
      await runAppleScript(`tell application "${escaped}" to activate`)
      return true
    } catch (err) {
      log.warn(`Failed to activate ${this.previousAppName}`, err)
      return false
    }
  }
}
