import type { BrowserWindowConstructorOptions } from 'electron'

export function getMainWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  const shared: BrowserWindowConstructorOptions = {
    width: 360,
    height: 520,
    minWidth: 320,
    minHeight: 380,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: 'Clippy',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  }

  if (process.platform === 'darwin') {
    return {
      ...shared,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#00000000'
    }
  }

  if (process.platform === 'win32') {
    return {
      ...shared,
      backgroundColor: '#eef2f8F5'
    }
  }

  return {
    ...shared,
    backgroundColor: '#eef2f8F5'
  }
}

export function hideAppOnWindowClose(): boolean {
  return process.platform === 'darwin'
}
