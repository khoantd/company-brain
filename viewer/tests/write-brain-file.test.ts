import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readBrainFile, writeBrainFile } from '../server/brain'
import { LocalFsStore } from '../server/local-fs-store'
import { PathAccessError } from '../server/paths'

const FIXTURE = join(import.meta.dirname, 'fixtures/brain')

describe('writeBrainFile', () => {
  let root: string
  let store: LocalFsStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'viewer-write-'))
    await cp(FIXTURE, root, { recursive: true })
    store = new LocalFsStore(root)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('overwrites markdown body and stamps provenance while preserving other frontmatter', async () => {
    const path = '01-COMPANY/COMPANY.md'
    const before = await readBrainFile(store, path)
    expect(before.frontmatter?.status).toBeTruthy()

    const result = await writeBrainFile(store, path, '# Updated\n\nNew body.\n')

    expect(result.kind).toBe('markdown')
    expect(result.content).toContain('# Updated')
    expect(result.content).toContain('New body.')
    expect(result.frontmatter?.status).toBe(before.frontmatter?.status)
    expect(result.frontmatter?.edited_via).toBe('viewer')
    expect(result.frontmatter?.updated_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const raw = await readFile(join(root, path), 'utf8')
    expect(raw).toMatch(/^---\n/)
    expect(raw).toContain('edited_via: viewer')
    expect(raw).toContain('# Updated')
  })

  it('rejects paths outside canonical prefixes', async () => {
    await expect(writeBrainFile(store, '11-SYSTEM/OPERATING-SYSTEM.md', 'x')).rejects.toBeInstanceOf(
      PathAccessError,
    )
  })

  it('rejects missing files (no create)', async () => {
    await expect(
      writeBrainFile(store, '01-COMPANY/does-not-exist.md', '# New\n'),
    ).rejects.toBeInstanceOf(PathAccessError)
  })

  it('round-trips plain text without frontmatter stamp', async () => {
    const path = '01-COMPANY/notes.txt'
    await writeFile(join(root, path), 'hello\n', 'utf8')

    const result = await writeBrainFile(store, path, 'goodbye\n')

    expect(result.kind).toBe('text')
    expect(result.content).toBe('goodbye\n')
    expect(result.frontmatter).toBeUndefined()

    const raw = await readFile(join(root, path), 'utf8')
    expect(raw).toBe('goodbye\n')
    expect(raw).not.toContain('edited_via')
  })
})
