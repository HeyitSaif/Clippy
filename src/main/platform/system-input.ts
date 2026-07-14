import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import log from 'electron-log'

const execFileAsync = promisify(execFile)

async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 8000 })
  return stdout
}

export type ClippyPlatform = NodeJS.Platform

export function currentPlatform(): ClippyPlatform {
  return process.platform
}

export async function isLinuxPasteAvailable(): Promise<boolean> {
  if (process.platform !== 'linux') return true
  try {
    await execFileAsync('which', ['xdotool'])
    return true
  } catch {
    return false
  }
}

export async function simulatePasteShortcut(): Promise<void> {
  if (process.platform === 'darwin') {
    await runAppleScript(
      'tell application "System Events" to key code 9 using command down'
    )
    return
  }

  if (process.platform === 'win32') {
    await execFileAsync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
      ],
      { timeout: 8000, windowsHide: true }
    )
    return
  }

  if (process.platform === 'linux') {
    await execFileAsync('xdotool', ['key', '--clearmodifiers', 'ctrl+v'], { timeout: 8000 })
    return
  }

  throw new Error(`Auto-paste is not supported on ${process.platform}`)
}

export async function captureForegroundTarget(): Promise<string | null> {
  if (process.platform === 'darwin') {
    try {
      const name = (
        await runAppleScript(`
        tell application "System Events"
          return name of first application process whose frontmost is true
        end tell
      `)
      ).trim()
      if (name && !/clippy|electron/i.test(name)) return name
    } catch (err) {
      log.warn('Failed to capture macOS frontmost app', err)
    }
    return null
  }

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ClippyFocus {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@
[ClippyFocus]::GetForegroundWindow().ToInt64()`
        ],
        { timeout: 8000, windowsHide: true }
      )
      const handle = stdout.trim()
      return handle && handle !== '0' ? `hwnd:${handle}` : null
    } catch (err) {
      log.warn('Failed to capture Windows foreground window', err)
    }
    return null
  }

  if (process.platform === 'linux') {
    try {
      const { stdout } = await execFileAsync('xdotool', ['getactivewindow'], { timeout: 5000 })
      const wid = stdout.trim()
      return wid && wid !== '0' ? `wid:${wid}` : null
    } catch (err) {
      log.warn('Failed to capture Linux active window', err)
    }
    return null
  }

  return null
}

export async function activateForegroundTarget(target: string | null): Promise<boolean> {
  if (!target) return false

  if (process.platform === 'darwin' && !target.startsWith('hwnd:') && !target.startsWith('wid:')) {
    const escaped = target.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    try {
      await runAppleScript(`tell application "${escaped}" to activate`)
      return true
    } catch (err) {
      log.warn(`Failed to activate ${target}`, err)
      return false
    }
  }

  if (process.platform === 'win32' && target.startsWith('hwnd:')) {
    const handle = target.slice(5)
    try {
      await execFileAsync(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ClippyFocus {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
[ClippyFocus]::SetForegroundWindow([IntPtr]::new(${handle})) | Out-Null`
        ],
        { timeout: 8000, windowsHide: true }
      )
      return true
    } catch (err) {
      log.warn(`Failed to activate hwnd ${handle}`, err)
      return false
    }
  }

  if (process.platform === 'linux' && target.startsWith('wid:')) {
    const wid = target.slice(4)
    try {
      await execFileAsync('xdotool', ['windowactivate', '--sync', wid], { timeout: 5000 })
      return true
    } catch (err) {
      log.warn(`Failed to activate window ${wid}`, err)
      return false
    }
  }

  return false
}
