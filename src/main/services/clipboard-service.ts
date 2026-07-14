import { clipboard, nativeImage } from 'electron'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import log from 'electron-log'
import type { ClipRepository } from '../db/database'
import type { AppSettings } from '@shared/types'
import {
  compileIgnorePatterns,
  looksLikeNetworkPath,
  matchesIgnorePatterns
} from '@shared/search'
import {
  formatsIncludeImage,
  formatsIncludeText,
  formatsKey
} from '@shared/clipboard-watch'
import { buildSystemClipboardPayload, defaultSnippetName } from '@shared/clipboard-write'

export interface RawClipItem {
  type: 'text' | 'image' | 'file'
  hash: string
  text?: string
  html?: string
  rtf?: string
  preview: string
  imageBuffer?: Buffer
  thumbBuffer?: Buffer
  filePath?: string
}

type ContentKind = 'text' | 'image'

function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function generateThumb(image: Electron.NativeImage): { buffer: Buffer; width: number; height: number } {
  const size = image.getSize()
  const aspectRatio = size.width / size.height || 1
  const resizeOptions: Electron.Size = { width: 70, height: 70 }
  if (aspectRatio > 1) resizeOptions.width = Math.round(70 / aspectRatio)
  else resizeOptions.height = Math.round(70 / aspectRatio)
  const thumb = image.resize(resizeOptions)
  return { buffer: thumb.toPNG(), width: resizeOptions.width, height: resizeOptions.height }
}

function detectFilePath(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed.startsWith('file://')) {
    try {
      return decodeURIComponent(trimmed.replace('file://', ''))
    } catch {
      return trimmed
    }
  }
  if (/^(\/Users\/|\/home\/|\/tmp\/|[A-Za-z]:\\).+/.test(trimmed) && !trimmed.includes('\n')) {
    return trimmed
  }
  return null
}

function imagePollFingerprint(image: Electron.NativeImage): string {
  const size = image.getSize()
  const bitmap = Buffer.from(image.toBitmap())
  return sha256(
    Buffer.concat([Buffer.from(`${size.width}x${size.height}:${bitmap.byteLength}:`), bitmap])
  )
}

export class ClipboardService {
  private listening = false
  private recentHash: string | null = null
  private recentImageFingerprint: string | null = null
  /** Tier-1: last seen availableFormats() fingerprint. */
  private lastFormatsKey: string | null = null
  /** Last successfully observed content kind (text/file vs image). */
  private lastContentKind: ContentKind | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private idleStreak = 0
  private skipNext = false
  private onClipCallback: ((clipId: string) => void) | null = null
  private compiledIgnore: Array<RegExp | string> = []
  private ignorePatternsKey = ''

  constructor(
    private clipRepo: ClipRepository,
    private getSettings: () => AppSettings
  ) {}

  onClip(callback: (clipId: string) => void): void {
    this.onClipCallback = callback
  }

  start(): void {
    if (this.listening) return
    this.listening = true
    this.schedulePoll()
  }

  stop(): void {
    this.listening = false
    if (this.pollTimer) clearTimeout(this.pollTimer)
  }

  skipNextCapture(): void {
    this.skipNext = true
  }

  private refreshIgnoreCache(patterns: string[]): void {
    const key = patterns.join('\n')
    if (key === this.ignorePatternsKey) return
    this.ignorePatternsKey = key
    this.compiledIgnore = compileIgnorePatterns(patterns)
  }

  private markFormatsIdle(key: string, kind: ContentKind): void {
    this.lastFormatsKey = key
    this.lastContentKind = kind
    this.idleStreak++
  }

  private schedulePoll(): void {
    if (!this.listening) return
    const settings = this.getSettings()
    const base = settings.pollIntervalMs
    const interval = this.idleStreak > 5 ? Math.min(base * 4, 2000) : this.idleStreak > 2 ? base * 2 : base
    this.pollTimer = setTimeout(() => {
      this.scrape()
      this.schedulePoll()
    }, interval)
  }

  private scrape(): void {
    try {
      const formats = clipboard.availableFormats()
      if (formats.length === 0) return

      const key = formatsKey(formats)
      const hasImage = formatsIncludeImage(formats)

      // Tier 1: formats unchanged + last content was text → skip readText/readHTML/readRTF.
      // Images cannot use this short-circuit: content often changes while formats stay the same.
      if (
        key === this.lastFormatsKey &&
        this.lastContentKind === 'text' &&
        this.recentHash != null &&
        !hasImage
      ) {
        this.idleStreak++
        return
      }

      let raw: RawClipItem | null = null

      if (hasImage) {
        const image = clipboard.readImage()
        if (image.isEmpty()) return

        const fingerprint = imagePollFingerprint(image)
        if (this.skipNext) {
          this.skipNext = false
          this.recentImageFingerprint = fingerprint
          this.recentHash = fingerprint
          this.lastFormatsKey = key
          this.lastContentKind = 'image'
          return
        }
        if (fingerprint === this.recentImageFingerprint) {
          this.markFormatsIdle(key, 'image')
          return
        }

        const png = image.toPNG()
        const thumb = generateThumb(image)
        raw = {
          type: 'image',
          hash: sha256(png),
          preview: 'Image',
          imageBuffer: png,
          thumbBuffer: thumb.buffer
        }
        this.recentImageFingerprint = fingerprint
      } else if (formatsIncludeText(formats)) {
        this.recentImageFingerprint = null
        const text = clipboard.readText()
        if (!text.trim()) return
        const settings = this.getSettings()
        this.refreshIgnoreCache(settings.ignorePatterns)
        if (matchesIgnorePatterns(text, this.compiledIgnore)) return

        const contentHash = sha256(text)
        if (this.skipNext) {
          this.skipNext = false
          this.recentHash = contentHash
          this.lastFormatsKey = key
          this.lastContentKind = 'text'
          return
        }
        if (contentHash === this.recentHash) {
          this.markFormatsIdle(key, 'text')
          return
        }

        const filePath = detectFilePath(text)
        if (filePath && !looksLikeNetworkPath(filePath)) {
          let exists = false
          try {
            exists = fs.existsSync(filePath)
          } catch {
            exists = false
          }
          if (exists) {
            raw = {
              type: 'file',
              hash: contentHash,
              text,
              preview: path.basename(filePath),
              filePath
            }
          }
        }

        if (!raw) {
          raw = {
            type: 'text',
            hash: contentHash,
            text,
            html: clipboard.readHTML(),
            rtf: clipboard.readRTF(),
            preview: text.length > 255 ? `${text.slice(0, 255)}…` : text
          }
        }
      }

      if (!raw) return

      if (raw.hash === this.recentHash) {
        this.markFormatsIdle(key, raw.type === 'image' ? 'image' : 'text')
        return
      }

      this.idleStreak = 0
      this.recentHash = raw.hash
      this.lastFormatsKey = key
      this.lastContentKind = raw.type === 'image' ? 'image' : 'text'

      const existing = this.clipRepo.getByHash(raw.hash)
      if (existing) {
        this.clipRepo.touchByHash(raw.hash)
        this.onClipCallback?.(existing.id)
        return
      }

      let imagePath: string | null = null
      let thumbPath: string | null = null
      if (raw.type === 'image' && raw.imageBuffer && raw.thumbBuffer) {
        const paths = this.clipRepo.saveImageFiles(raw.hash, raw.imageBuffer, raw.thumbBuffer)
        imagePath = paths.imagePath
        thumbPath = paths.thumbPath
      }

      const clip = this.clipRepo.insertClip({
        type: raw.type,
        hash: raw.hash,
        preview: raw.preview,
        textContent: raw.text ?? null,
        htmlContent: raw.html ?? null,
        rtfContent: raw.rtf ?? null,
        imagePath,
        thumbPath,
        filePath: raw.filePath ?? null,
        isPinned: false,
        isSnippet: false,
        snippetName: null,
        tags: []
      })

      const settings = this.getSettings()
      this.clipRepo.trimHistory(settings.maxHistory)
      this.onClipCallback?.(clip.id)
    } catch (err) {
      log.error('Clipboard scrape failed', err)
    }
  }

  writeClipToSystem(clipId: string): boolean {
    const clip = this.clipRepo.getById(clipId)
    if (!clip) return false
    this.skipNextCapture()

    if (clip.type === 'text' || clip.type === 'file') {
      const payload = buildSystemClipboardPayload(clip)
      if (!payload) return false
      if (payload.html || payload.rtf) {
        clipboard.write(payload)
      } else {
        clipboard.writeText(payload.text)
      }
      return true
    }
    if (clip.type === 'image' && clip.imagePath) {
      try {
        clipboard.writeImage(nativeImage.createFromPath(clip.imagePath))
        return true
      } catch (err) {
        log.warn('createFromPath failed, falling back to data URL', err)
        const dataUrl = this.clipRepo.readImageAsDataUrl(clip.imagePath)
        if (!dataUrl) return false
        clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
        return true
      }
    }
    return false
  }
}
