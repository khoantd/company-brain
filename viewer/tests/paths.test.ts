import { describe, expect, it } from 'vitest'
import { PathAccessError, resolveSafePath } from '../server/paths'

const root = '/tmp/company-brain-fixture'

describe('resolveSafePath', () => {
  it('allows canonical relative paths', () => {
    expect(resolveSafePath(root, '01-COMPANY/COMPANY.md')).toBe(
      `${root}/01-COMPANY/COMPANY.md`,
    )
  })

  it('rejects path traversal', () => {
    expect(() => resolveSafePath(root, '../etc/passwd')).toThrow(PathAccessError)
    expect(() => resolveSafePath(root, '01-COMPANY/../../etc/passwd')).toThrow(PathAccessError)
  })

  it('rejects non-canonical folders', () => {
    expect(() => resolveSafePath(root, '11-SYSTEM/OPERATING-SYSTEM.md')).toThrow(PathAccessError)
    expect(() => resolveSafePath(root, '.cursor/rules/security.mdc')).toThrow(PathAccessError)
  })

  it('rejects absolute-style and empty paths', () => {
    expect(() => resolveSafePath(root, '')).toThrow(PathAccessError)
  })
})
