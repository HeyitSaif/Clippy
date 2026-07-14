import { net, protocol } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { IMAGE_SCHEME, THUMB_SCHEME, isClipId } from '@shared/thumb-protocol'
import { isUnderDir } from '@shared/path-utils'
import type { ClipRepository } from '../db/database'

const SCHEME_PRIVILEGES = {
  standard: true,
  secure: true,
  supportFetchAPI: true,
  stream: true,
  corsEnabled: true
} as const

/**
 * Must run before app.whenReady().
 * Electron only allows a single registerSchemesAsPrivileged call — register both
 * media schemes together.
 */
export function registerMediaSchemesAsPrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: THUMB_SCHEME, privileges: { ...SCHEME_PRIVILEGES } },
    { scheme: IMAGE_SCHEME, privileges: { ...SCHEME_PRIVILEGES } }
  ])
}

/**
 * Resolve path and ensure it (and its realpath if resolvable) stays under `dir`.
 * Rejects symlink escapes outside the allowed directory.
 */
function resolveSafeMediaPath(filePath: string, dir: string): string | null {
  if (!isUnderDir(filePath, dir)) return null

  let realPath: string
  try {
    realPath = fs.realpathSync(filePath)
  } catch {
    return null
  }

  let realDir: string
  try {
    realDir = fs.realpathSync(dir)
  } catch {
    realDir = path.resolve(dir)
  }

  if (!isUnderDir(realPath, realDir)) return null
  return realPath
}

/**
 * Register clippy-thumb:// and clippy-image:// protocol handlers.
 * Call after app is ready, before createWindow.
 */
export function registerMediaProtocols(clipRepo: ClipRepository): void {
  protocol.handle(THUMB_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      // clippy-thumb://<uuid> → id is hostname
      const id = url.hostname

      if (!id || !isClipId(id)) {
        return new Response('Bad Request', { status: 400, statusText: 'Bad Request' })
      }

      const thumbPath = clipRepo.resolveThumbPath(id)
      if (!thumbPath) {
        return new Response('Not Found', { status: 404, statusText: 'Not Found' })
      }

      const safePath = resolveSafeMediaPath(thumbPath, clipRepo.thumbsDir)
      if (!safePath) {
        return new Response('Bad Request', { status: 400, statusText: 'Bad Request' })
      }

      return net.fetch(pathToFileURL(safePath).href)
    } catch {
      return new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
  })

  protocol.handle(IMAGE_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      // clippy-image://<uuid> → id is hostname
      const id = url.hostname

      if (!id || !isClipId(id)) {
        return new Response('Bad Request', { status: 400, statusText: 'Bad Request' })
      }

      const imagePath = clipRepo.resolveImagePath(id)
      if (!imagePath) {
        return new Response('Not Found', { status: 404, statusText: 'Not Found' })
      }

      const safePath = resolveSafeMediaPath(imagePath, clipRepo.imagesDir)
      if (!safePath) {
        return new Response('Bad Request', { status: 400, statusText: 'Bad Request' })
      }

      return net.fetch(pathToFileURL(safePath).href)
    } catch {
      return new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
  })
}
