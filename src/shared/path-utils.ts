import path from 'node:path'

/**
 * True if `filePath` resolves strictly under `dir` (not the dir itself, not outside via ..).
 * Does not follow symlinks — pair with realpath for symlink escape checks.
 */
export function isUnderDir(filePath: string, dir: string): boolean {
  const resolvedFile = path.resolve(filePath)
  const resolvedDir = path.resolve(dir)
  const rel = path.relative(resolvedDir, resolvedFile)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}
