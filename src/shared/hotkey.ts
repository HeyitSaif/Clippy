const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta'])

const KEY_ALIASES: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Esc',
  Delete: 'Delete',
  Backspace: 'Backspace',
  Enter: 'Enter',
  Tab: 'Tab',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Backslash: '\\',
  Comma: ',',
  Period: '.',
  Slash: '/'
}

export type ClippyPlatform = NodeJS.Platform

export function pasteSlotAccelerator(slot: number, platform?: ClippyPlatform): string {
  const p = platform ?? (typeof process !== 'undefined' ? process.platform : 'darwin')
  if (p === 'darwin') return `Command+Control+${slot}`
  return `Control+Alt+${slot}`
}

export function pasteSlotDisplay(platform?: ClippyPlatform): string {
  const p = platform ?? (typeof process !== 'undefined' ? process.platform : 'darwin')
  if (p === 'darwin') return '⌘⌃1-9'
  return 'Ctrl+Alt+1-9'
}

export function isMacPlatform(platform?: ClippyPlatform): boolean {
  const p = platform ?? (typeof process !== 'undefined' ? process.platform : 'darwin')
  return p === 'darwin'
}

export function keyEventToAccelerator(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null

  const parts: string[] = []
  if (event.ctrlKey) parts.push('Control')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Command')

  if (parts.length === 0) return null

  let key = KEY_ALIASES[event.key] ?? event.key
  if (key.length === 1) key = key.toUpperCase()
  const isFunctionKey = /^F\d{1,2}$/.test(key)
  if (
    !isFunctionKey &&
    !/^[A-Z0-9]$/.test(key) &&
    !KEY_ALIASES[event.key] &&
    key.length > 1 &&
    !key.startsWith('F')
  ) {
    return null
  }

  parts.push(key)
  return parts.join('+')
}

export function formatAcceleratorDisplay(accel: string, platform?: ClippyPlatform): string {
  const p = platform ?? (typeof process !== 'undefined' ? process.platform : 'darwin')
  if (p !== 'darwin') {
    return accel
      .split('+')
      .map((part) =>
        part
          .replace(/CommandOrControl/g, 'Ctrl')
          .replace(/Command/g, 'Ctrl')
          .replace(/Control/g, 'Ctrl')
          .replace(/Alt/g, 'Alt')
          .replace(/Shift/g, 'Shift')
      )
      .join('+')
  }

  return accel
    .split('+')
    .map((part) =>
      part
        .replace(/CommandOrControl/g, '⌘')
        .replace(/Command/g, '⌘')
        .replace(/Control/g, '⌃')
        .replace(/Alt/g, '⌥')
        .replace(/Shift/g, '⇧')
    )
    .join(' ')
}
