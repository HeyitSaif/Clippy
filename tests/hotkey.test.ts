import { describe, expect, it } from 'vitest'
import {
  formatAcceleratorDisplay,
  isMacPlatform,
  keyEventToAccelerator,
  pasteSlotAccelerator,
  pasteSlotDisplay
} from '../src/shared/hotkey'

function keyEvent(
  partial: Partial<KeyboardEvent> & Pick<KeyboardEvent, 'key'>
): KeyboardEvent {
  return {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...partial
  } as KeyboardEvent
}

describe('pasteSlotAccelerator', () => {
  it('uses Command+Control on macOS', () => {
    expect(pasteSlotAccelerator(3, 'darwin')).toBe('Command+Control+3')
  })

  it('uses Control+Alt elsewhere', () => {
    expect(pasteSlotAccelerator(9, 'win32')).toBe('Control+Alt+9')
    expect(pasteSlotAccelerator(1, 'linux')).toBe('Control+Alt+1')
  })
})

describe('pasteSlotDisplay', () => {
  it('shows platform-specific labels', () => {
    expect(pasteSlotDisplay('darwin')).toBe('⌘⌃1-9')
    expect(pasteSlotDisplay('win32')).toBe('Ctrl+Alt+1-9')
  })
})

describe('isMacPlatform', () => {
  it('detects darwin only', () => {
    expect(isMacPlatform('darwin')).toBe(true)
    expect(isMacPlatform('win32')).toBe(false)
  })
})

describe('formatAcceleratorDisplay', () => {
  it('renders mac symbols', () => {
    expect(formatAcceleratorDisplay('Command+Shift+K', 'darwin')).toBe('⌘ ⇧ K')
  })

  it('normalizes Windows/Linux labels', () => {
    expect(formatAcceleratorDisplay('CommandOrControl+Alt+Space', 'win32')).toBe('Ctrl+Alt+Space')
  })
})

describe('keyEventToAccelerator', () => {
  it('returns null for modifier-only keys', () => {
    expect(keyEventToAccelerator(keyEvent({ key: 'Control', ctrlKey: true }))).toBeNull()
  })

  it('returns null when no modifiers are held', () => {
    expect(keyEventToAccelerator(keyEvent({ key: 'k' }))).toBeNull()
  })

  it('builds accelerators from keyboard events', () => {
    expect(
      keyEventToAccelerator(
        keyEvent({ key: 'k', metaKey: true, shiftKey: true })
      )
    ).toBe('Shift+Command+K')
  })

  it('maps arrow keys and space', () => {
    expect(keyEventToAccelerator(keyEvent({ key: 'ArrowUp', altKey: true }))).toBe('Alt+Up')
    expect(keyEventToAccelerator(keyEvent({ key: ' ', ctrlKey: true }))).toBe('Control+Space')
  })
})
