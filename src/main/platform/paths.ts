import { app } from 'electron'
import path from 'node:path'

/** v1 electron-store config location (product name was `electron-clippy`). */
export function getLegacyV1ConfigPath(): string {
  const home = app.getPath('home')

  if (process.platform === 'darwin') {
    return path.join(home, 'Library/Application Support/electron-clippy/config.json')
  }

  if (process.platform === 'win32') {
    return path.join(app.getPath('appData'), 'electron-clippy', 'config.json')
  }

  return path.join(home, '.config', 'electron-clippy', 'config.json')
}
