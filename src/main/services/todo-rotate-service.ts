import log from 'electron-log'
import type { SettingsRepository } from '../db/database'
import type { TodoRepository } from '../db/todos'

const INTERVAL_MS = 60_000

/**
 * Periodically (and on window focus) runs Daily/Weekly list rotation when
 * `todoRotateEnabled` is set. Rotation boundary is driven by `todoRotateHour`.
 */
export class TodoRotateService {
  private timer: NodeJS.Timeout | null = null
  private running = false

  constructor(
    private readonly todoRepo: TodoRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly onRotated: () => void
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.check()
    this.timer = setInterval(() => this.check(), INTERVAL_MS)
    // Unref so the timer alone does not keep the process alive on quit races
    this.timer.unref?.()
    log.info('TodoRotateService started')
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.running = false
  }

  /** Call on window focus (in addition to the 60s interval). */
  onWindowFocus(): void {
    this.check()
  }

  check(): void {
    try {
      const settings = this.settingsRepo.getAll()
      if (!settings.todoRotateEnabled) return

      const result = this.todoRepo.runMidnightRotate(Date.now(), settings.todoRotateHour)
      if (result.daily || result.weekly) {
        log.info(
          `Todo rotate ran daily=${result.daily} weekly=${result.weekly} hour=${settings.todoRotateHour}`
        )
        this.onRotated()
      }
    } catch (err) {
      log.error('TodoRotateService check failed', err)
    }
  }
}
