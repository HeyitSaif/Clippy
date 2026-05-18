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
  if (/^F\d{1,2}$/.test(key)) {
    /* keep */
  } else if (!/^[A-Z0-9]$/.test(key) && !KEY_ALIASES[event.key] && key.length > 1 && !key.startsWith('F')) {
    return null
  }

  parts.push(key)
  return parts.join('+')
}

export function formatAcceleratorDisplay(accel: string): string {
  return accel
    .split('+')
    .map((part) =>
      part
        .replace(/CommandOrControl/g, '⌘')
        .replace(/Command/g, '⌘')
        .replace(/Control/g, '⌃')
        .replace(/Alt/g, '⌥')
        .replace(/Shift/g, '⇧'),
    )
    .join(' ')
}
