import { app, nativeImage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import log from 'electron-log'

const TRAY_ICON_NAME = 'trayTemplate.png'

function candidatePaths(): string[] {
  const roots = [
    process.cwd(),
    app.getAppPath(),
    path.join(__dirname, '../../..'),
    path.join(__dirname, '../..')
  ]
  const unique = [...new Set(roots)]
  const paths: string[] = []

  for (const root of unique) {
    paths.push(path.join(root, 'resources', TRAY_ICON_NAME))
  }

  if (app.isPackaged) {
    paths.unshift(path.join(process.resourcesPath, 'resources', TRAY_ICON_NAME))
  }

  return paths
}

function buildFallbackIcon(): Electron.NativeImage {
  const size = 22
  const canvas = Buffer.alloc(size * size * 4, 0)
  const set = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    canvas[i] = 0
    canvas[i + 1] = 0
    canvas[i + 2] = 0
    canvas[i + 3] = 255
  }

  for (let y = 7; y <= 19; y++) {
    for (let x = 5; x <= 16; x++) set(x, y)
  }
  for (let y = 4; y <= 7; y++) {
    for (let x = 8; x <= 13; x++) set(x, y)
  }
  for (let y = 3; y <= 5; y++) {
    for (let x = 9; x <= 12; x++) set(x, y)
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

export function loadTrayIcon(): Electron.NativeImage {
  for (const iconPath of candidatePaths()) {
    if (!fs.existsSync(iconPath)) continue
    const image = nativeImage.createFromPath(iconPath)
    if (image.isEmpty()) continue

    const size = image.getSize()
    if (size.width < 8 || size.height < 8) continue

    log.info('Loaded tray icon from', iconPath, size)
    return finalizeTrayIcon(image)
  }

  log.warn('Tray icon file not found, using built-in fallback')
  return finalizeTrayIcon(buildFallbackIcon())
}

function finalizeTrayIcon(image: Electron.NativeImage): Electron.NativeImage {
  const target = 18
  const sized =
    image.getSize().width === target
      ? image
      : image.resize({ width: target, height: target, quality: 'best' })

  if (process.platform === 'darwin') {
    sized.setTemplateImage(true)
  }

  return sized
}
