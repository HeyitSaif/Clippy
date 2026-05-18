import { activateForegroundTarget, captureForegroundTarget } from '../platform/system-input'

export class FocusService {
  private previousTarget: string | null = null

  async captureFrontmostApp(): Promise<void> {
    const target = await captureForegroundTarget()
    if (target) this.previousTarget = target
  }

  async activatePreviousApp(): Promise<boolean> {
    if (!this.previousTarget) return false
    return activateForegroundTarget(this.previousTarget)
  }
}
