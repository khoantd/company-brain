import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readBrainFile, uploadBrainFile } from '../server/brain'
import { LocalFsStore } from '../server/local-fs-store'
import { PathAccessError } from '../server/paths'

const FIXTURE = join(import.meta.dirname, 'fixtures/brain')

describe('uploadBrainFile', () => {
  let root: string
  let store: LocalFsStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'viewer-upload-'))
    await cp(FIXTURE, root, { recursive: true })
    store = new LocalFsStore(root)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('creates a new markdown file with provenance stamps', async () => {
    const path = '01-COMPANY/upload-new.md'
    const result = await uploadBrainFile(store, path, '# Hello\n\nBody.\n')

    expect(result.kind).toBe('markdown')
    expect(result.content).toContain('# Hello')
    expect(result.frontmatter?.edited_via).toBe('viewer')
    expect(result.frontmatter?.updated_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.frontmatter?.status).toBe('proposed')

    const raw = await readFile(join(root, path), 'utf8')
    expect(raw).toMatch(/^---\n/)
    expect(raw).toContain('status: proposed')
  })

  it('creates a new html file as plain text', async () => {
    const path = '01-COMPANY/page.html'
    const html = '<!DOCTYPE html><html><body><h1>Hi</h1></body></html>\n'

    const result = await uploadBrainFile(store, path, html)

    expect(result.kind).toBe('text')
    expect(result.content).toBe(html)
    expect(result.frontmatter).toBeUndefined()

    const raw = await readFile(join(root, path), 'utf8')
    expect(raw).toBe(html)
  })

  it('overwrites an existing markdown file and preserves prior frontmatter keys', async () => {
    const path = '01-COMPANY/COMPANY.md'
    const before = await readBrainFile(store, path)

    const result = await uploadBrainFile(store, path, '# Replaced\n')

    expect(result.content).toContain('# Replaced')
    expect(result.frontmatter?.status).toBe(before.frontmatter?.status)
    expect(result.frontmatter?.edited_via).toBe('viewer')
  })

  it('rejects paths outside canonical prefixes', async () => {
    await expect(
      uploadBrainFile(store, '11-SYSTEM/note.md', '# x\n'),
    ).rejects.toBeInstanceOf(PathAccessError)
  })

  it('rejects unsupported extensions', async () => {
    await expect(
      uploadBrainFile(store, '01-COMPANY/notes.txt', 'x\n'),
    ).rejects.toBeInstanceOf(PathAccessError)
    await expect(
      uploadBrainFile(store, '01-COMPANY/doc.mdx', '# x\n'),
    ).rejects.toBeInstanceOf(PathAccessError)
  })

  it('merges existing frontmatter in uploaded markdown content', async () => {
    const path = '01-COMPANY/with-fm.md'
    await writeFile(
      join(root, path),
      '---\ntitle: Prior\nstatus: approved\n---\nOld\n',
      'utf8',
    )

    const result = await uploadBrainFile(
      store,
      path,
      '---\ntitle: Uploaded\nowner: team\n---\nNew body\n',
    )

    expect(result.content).toContain('New body')
    expect(result.frontmatter?.title).toBe('Uploaded')
    expect(result.frontmatter?.owner).toBe('team')
    expect(result.frontmatter?.edited_via).toBe('viewer')
  })
})
