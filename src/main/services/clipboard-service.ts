import { clipboard, nativeImage } from 'electron'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import log from 'electron-log'
import type { ClipRepository } from '../db/database'
import type { AppSettings } from '@shared/types'

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

function shouldIgnore(text: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    try {
      if (new RegExp(pattern, 'i').test(text)) return true
    } catch {
      if (text.toLowerCase().includes(pattern.toLowerCase())) return true
    }
  }
  return false
}

export class ClipboardService {
  private listening = false
  private recentHash: string | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private idleStreak = 0
  private skipNext = false
  private onClipCallback: ((clipId: string) => void) | null = null

  constructor(
    private clipRepo: ClipRepository,
    private getSettings: () => AppSettings
  ) { }

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

      let raw: RawClipItem | null = null

      if (formats.some((f) => f.startsWith('image/'))) {
        const image = clipboard.readImage()
        if (image.isEmpty()) return
        const png = image.toPNG()
        const thumb = generateThumb(image)
        raw = {
          type: 'image',
          hash: sha256(png),
          preview: 'Image',
          imageBuffer: png,
          thumbBuffer: thumb.buffer
        }
      } else if (formats.some((f) => f.startsWith('text/'))) {
        const text = clipboard.readText()
        if (!text.trim()) return
        const settings = this.getSettings()
        if (shouldIgnore(text, settings.ignorePatterns)) return

        const filePath = detectFilePath(text)
        if (filePath && fs.existsSync(filePath)) {
          raw = {
            type: 'file',
            hash: sha256(text),
            text,
            preview: path.basename(filePath),
            filePath
          }
        } else {
          raw = {
            type: 'text',
            hash: sha256(text),
            text,
            html: clipboard.readHTML(),
            rtf: clipboard.readRTF(),
            preview: text.length > 255 ? `${text.slice(0, 255)}…` : text
          }
        }
      }

      if (!raw) return

      if (this.skipNext) {
        this.skipNext = false
        this.recentHash = raw.hash
        return
      }

      if (raw.hash === this.recentHash) {
        this.idleStreak++
        return
      }

      this.idleStreak = 0
      this.recentHash = raw.hash

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
      clipboard.writeText(clip.textContent ?? clip.preview)
      return true
    }
    if (clip.type === 'image' && clip.imagePath) {
      const dataUrl = this.clipRepo.readImageAsDataUrl(clip.imagePath)
      clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
      return true
    }
    return false
  }
}
