import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readBrainFile, updateBrainFileStatus } from '../server/brain'
import { LocalFsStore } from '../server/local-fs-store'
import { PathAccessError } from '../server/paths'

const FIXTURE = join(import.meta.dirname, 'fixtures/brain')

describe('updateBrainFileStatus', () => {
  let root: string
  let store: LocalFsStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'viewer-status-'))
    await cp(FIXTURE, root, { recursive: true })
    store = new LocalFsStore(root)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('changes status and preserves body and other frontmatter', async () => {
    const path = '03-BRAND/BRAND.md'
    const before = await readBrainFile(store, path)
    expect(before.frontmatter?.status).toBe('unverified')
    const body = before.content ?? ''

    const result = await updateBrainFileStatus(store, path, 'proposed')

    expect(result.frontmatter?.status).toBe('proposed')
    expect(result.content).toBe(body)
    expect(result.frontmatter?.edited_via).toBe('viewer')
    expect(result.frontmatter?.updated_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const raw = await readFile(join(root, path), 'utf8')
    expect(raw).toContain('status: proposed')
    expect(raw).toContain('# Brand')
  })

  it('on approved sets approved_by and approval_date', async () => {
    const path = '03-BRAND/BRAND.md'

    const result = await updateBrainFileStatus(store, path, 'approved', {
      approvedBy: 'Alice',
    })

    expect(result.frontmatter?.status).toBe('approved')
    expect(result.frontmatter?.approved_by).toBe('Alice')
    expect(result.frontmatter?.approval_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('allows approved when existing approved_by is set and no override given', async () => {
    const path = '01-COMPANY/COMPANY.md'
    // Seed approved_by on fixture copy
    await updateBrainFileStatus(store, path, 'proposed')
    const seeded = await updateBrainFileStatus(store, path, 'approved', {
      approvedBy: 'Alice',
    })
    expect(seeded.frontmatter?.approved_by).toBe('Alice')

    const result = await updateBrainFileStatus(store, path, 'confirmed')
    expect(result.frontmatter?.status).toBe('confirmed')
    expect(result.frontmatter?.approved_by).toBe('Alice')

    const again = await updateBrainFileStatus(store, path, 'approved')
    expect(again.frontmatter?.status).toBe('approved')
    expect(again.frontmatter?.approved_by).toBe('Alice')
  })

  it('rejects invalid status', async () => {
    await expect(
      updateBrainFileStatus(store, '03-BRAND/BRAND.md', 'not-a-status' as 'proposed'),
    ).rejects.toBeInstanceOf(PathAccessError)
  })

  it('rejects approve without approver when FM has none or unknown', async () => {
    await expect(
      updateBrainFileStatus(store, '03-BRAND/BRAND.md', 'approved'),
    ).rejects.toBeInstanceOf(PathAccessError)
  })

  it('rejects non-markdown and missing files', async () => {
    await writeFile(join(root, '01-COMPANY/notes.txt'), 'hello\n', 'utf8')

    await expect(
      updateBrainFileStatus(store, '01-COMPANY/notes.txt', 'proposed'),
    ).rejects.toBeInstanceOf(PathAccessError)

    await expect(
      updateBrainFileStatus(store, '01-COMPANY/missing.md', 'proposed'),
    ).rejects.toBeInstanceOf(PathAccessError)
  })
})
