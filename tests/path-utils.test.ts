import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isUnderDir } from '../src/shared/path-utils'

const base = path.resolve('/tmp/clippy-media')

describe('isUnderDir', () => {
  it('accepts files strictly under the directory', () => {
    expect(isUnderDir(path.join(base, 'a.png'), base)).toBe(true)
    expect(isUnderDir(path.join(base, 'nested', 'b.png'), base)).toBe(true)
  })

  it('rejects the directory itself', () => {
    expect(isUnderDir(base, base)).toBe(false)
  })

  it('rejects paths outside via ..', () => {
    expect(isUnderDir(path.join(base, '..', 'escape.png'), base)).toBe(false)
    expect(isUnderDir(path.resolve(base, '..', 'other', 'x.png'), base)).toBe(false)
  })

  it('rejects absolute paths outside the dir', () => {
    expect(isUnderDir('/etc/passwd', base)).toBe(false)
    expect(isUnderDir(path.resolve('/tmp/other-app/file.png'), base)).toBe(false)
  })
})
