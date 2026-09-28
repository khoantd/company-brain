import { resolve, relative, sep } from 'node:path'

/** Canonical Company Brain folders (same set as mcp-server/manifest.py). */
export const CANONICAL_PREFIXES = [
  '01-COMPANY',
  '02-DEPARTMENTS',
  '03-BRAND',
  '04-PRODUCTS',
  '05-PROJECTS',
  '06-RESEARCH',
  '07-CONTENT',
  '08-REFERENCES',
  '09-ASSETS',
  '10-OUTPUTS',
] as const

export type CanonicalPrefix = (typeof CANONICAL_PREFIXES)[number]

export class PathAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PathAccessError'
  }
}

/** Normalize a relative brain path and reject escapes / non-canonical folders. */
export function normalizeSafePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('\0')) {
    throw new PathAccessError('Path is empty or invalid.')
  }
  const parts = normalized.split('/').filter(Boolean)
  if (parts.some((part) => part === '..')) {
    throw new PathAccessError(`Path '${relativePath}' escapes the brain root — rejected.`)
  }
  const top = parts[0]
  if (!top || !CANONICAL_PREFIXES.includes(top as CanonicalPrefix)) {
    throw new PathAccessError(
      `Path '${relativePath}' is not inside a canonical folder. Allowed: ${CANONICAL_PREFIXES.join(', ')}`,
    )
  }
  return parts.join('/')
}

/** Resolve a relative brain path against a local brain root (LocalFsStore / tests). */
export function resolveSafePath(brainRoot: string, relativePath: string): string {
  const normalized = normalizeSafePath(relativePath)
  const resolved = resolve(brainRoot, normalized)
  const rel = relative(brainRoot, resolved)
  if (rel.startsWith('..') || rel === '' || resolve(brainRoot, rel) !== resolved) {
    throw new PathAccessError(`Path '${relativePath}' escapes the brain root — rejected.`)
  }
  return resolved
}

export function toPosixRelative(brainRoot: string, absolutePath: string): string {
  return relative(brainRoot, absolutePath).split(sep).join('/')
}
