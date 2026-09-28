import matter from 'gray-matter'
import { CANONICAL_PREFIXES, PathAccessError, normalizeSafePath } from './paths.js'
import type { BrainStore } from './store.js'

export type TreeNode = {
  name: string
  path: string
  type: 'dir' | 'file'
  children?: TreeNode[]
}

export type FilePayload = {
  path: string
  kind: 'markdown' | 'text' | 'binary'
  content?: string
  frontmatter?: Record<string, unknown>
  size: number
}

type MutableDir = {
  name: string
  path: string
  type: 'dir'
  children: Map<string, MutableNode>
}

type MutableNode = MutableDir | { name: string; path: string; type: 'file' }

function isMutableDir(node: MutableNode): node is MutableDir {
  return node.type === 'dir'
}

/** Build nested TreeNode children from flat file paths under a canonical prefix. */
export function childrenFromFilePaths(prefix: string, files: string[]): TreeNode[] {
  const root: MutableDir = {
    name: prefix,
    path: prefix,
    type: 'dir',
    children: new Map(),
  }
  const prefixSlash = `${prefix}/`

  for (const filePath of files) {
    if (!filePath.startsWith(prefixSlash) && filePath !== prefix) continue
    const rel = filePath.startsWith(prefixSlash) ? filePath.slice(prefixSlash.length) : ''
    if (!rel) continue
    const parts = rel.split('/').filter(Boolean)
    if (parts.length === 0 || parts.length > 8) continue

    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      const isLast = i === parts.length - 1
      const childPath = current.path ? `${current.path}/${part}` : part

      if (isLast) {
        current.children.set(part, { name: part, path: childPath, type: 'file' })
        continue
      }

      const existing = current.children.get(part)
      if (existing && isMutableDir(existing)) {
        current = existing
        continue
      }
      const dir: MutableDir = {
        name: part,
        path: childPath,
        type: 'dir',
        children: new Map(),
      }
      current.children.set(part, dir)
      current = dir
    }
  }

  return finalizeDirChildren(root)
}

function finalizeDirChildren(dir: MutableDir): TreeNode[] {
  const nodes: TreeNode[] = []
  const names = [...dir.children.keys()].sort((a, b) => a.localeCompare(b))
  for (const name of names) {
    const child = dir.children.get(name)!
    if (!isMutableDir(child)) {
      nodes.push(child)
      continue
    }
    nodes.push({
      name: child.name,
      path: child.path,
      type: 'dir',
      children: finalizeDirChildren(child),
    })
  }
  return nodes
}

export async function listTree(store: BrainStore): Promise<TreeNode[]> {
  const results = await Promise.all(
    CANONICAL_PREFIXES.map(async (prefix) => {
      const files = await store.listFiles(prefix)
      if (files.length === 0) return null
      return {
        name: prefix,
        path: prefix,
        type: 'dir' as const,
        children: childrenFromFilePaths(prefix, files),
      }
    }),
  )
  return results.filter((node): node is TreeNode => node !== null)
}

export async function readBrainFile(store: BrainStore, relativePath: string): Promise<FilePayload> {
  const path = normalizeSafePath(relativePath)

  const lower = path.toLowerCase()
  const isMarkdown = lower.endsWith('.md') || lower.endsWith('.mdx')
  const isText =
    isMarkdown ||
    /\.(txt|json|ya?ml|csv|svg|html|css|js|ts|tsx|jsx)$/i.test(path)

  if (!isText) {
    const size = await store.getSize(path)
    if (size === null) {
      throw new PathAccessError(`Not a file: ${relativePath}`)
    }
    return { path, kind: 'binary', size }
  }

  const raw = await store.readText(path)
  if (raw === null) {
    throw new PathAccessError(`Not a file: ${relativePath}`)
  }

  const size = Buffer.byteLength(raw, 'utf8')

  if (isMarkdown) {
    const parsed = matter(raw)
    return {
      path,
      kind: 'markdown',
      content: parsed.content,
      frontmatter: parsed.data as Record<string, unknown>,
      size,
    }
  }

  return { path, kind: 'text', content: raw, size }
}

function classifyWritable(path: string): 'markdown' | 'text' {
  const lower = path.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) return 'markdown'
  if (/\.(txt|json|ya?ml|csv|svg|html|css|js|ts|tsx|jsx)$/i.test(path)) return 'text'
  throw new PathAccessError(`Cannot write binary or unsupported file: ${path}`)
}

export const KNOWLEDGE_STATUSES = [
  'proposed',
  'approved',
  'confirmed',
  'unverified',
  'conflicting',
  'superseded',
] as const

export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number]

function isKnowledgeStatus(value: string): value is KnowledgeStatus {
  return (KNOWLEDGE_STATUSES as readonly string[]).includes(value)
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmString(data: Record<string, unknown>, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Overwrite an existing text/markdown file.
 * Markdown saves merge prior frontmatter and stamp `updated_on` + `edited_via: viewer`.
 */
export async function writeBrainFile(
  store: BrainStore,
  relativePath: string,
  content: string,
): Promise<FilePayload> {
  const path = normalizeSafePath(relativePath)
  const kind = classifyWritable(path)

  const existingSize = await store.getSize(path)
  if (existingSize === null) {
    throw new PathAccessError(`Not a file: ${relativePath}`)
  }

  if (kind === 'markdown') {
    const existing = await store.readText(path)
    const prior = existing ? (matter(existing).data as Record<string, unknown>) : {}
    const data: Record<string, unknown> = {
      ...prior,
      updated_on: todayIsoDate(),
      edited_via: 'viewer',
    }
    const body = content.replace(/^\uFEFF/, '')
    await store.writeText(path, matter.stringify(body, data))
  } else {
    await store.writeText(path, content)
  }

  return readBrainFile(store, path)
}

function classifyUploadable(path: string): 'markdown' | 'html' {
  const lower = path.toLowerCase()
  if (lower.endsWith('.md')) return 'markdown'
  if (lower.endsWith('.html')) return 'html'
  throw new PathAccessError(`Upload allows only .md or .html files: ${path}`)
}

/**
 * Create or overwrite a `.md` / `.html` file (viewer upload).
 * Markdown merges uploaded + prior frontmatter and stamps provenance;
 * new markdown without status defaults to `proposed`.
 */
export async function uploadBrainFile(
  store: BrainStore,
  relativePath: string,
  content: string,
): Promise<FilePayload> {
  const path = normalizeSafePath(relativePath)
  const kind = classifyUploadable(path)
  const body = content.replace(/^\uFEFF/, '')

  if (kind === 'html') {
    await store.writeText(path, body)
    return readBrainFile(store, path)
  }

  const existing = await store.readText(path)
  const prior = existing ? (matter(existing).data as Record<string, unknown>) : {}
  const uploaded = matter(body)
  const uploadedData = uploaded.data as Record<string, unknown>
  const data: Record<string, unknown> = {
    ...prior,
    ...uploadedData,
    updated_on: todayIsoDate(),
    edited_via: 'viewer',
  }
  if (!fmString(data, 'status')) {
    data.status = 'proposed'
  }
  await store.writeText(path, matter.stringify(uploaded.content, data))
  return readBrainFile(store, path)
}

/**
 * Update knowledge `status` frontmatter on an existing markdown file.
 * Approving requires `approvedBy` (or an existing non-unknown `approved_by`).
 */
export async function updateBrainFileStatus(
  store: BrainStore,
  relativePath: string,
  status: string,
  options?: { approvedBy?: string },
): Promise<FilePayload> {
  const path = normalizeSafePath(relativePath)

  if (!isKnowledgeStatus(status)) {
    throw new PathAccessError(
      `Invalid status: ${status}. Expected one of: ${KNOWLEDGE_STATUSES.join(', ')}`,
    )
  }

  const existingSize = await store.getSize(path)
  if (existingSize === null) {
    throw new PathAccessError(`Not a file: ${relativePath}`)
  }

  let kind: 'markdown' | 'text'
  try {
    kind = classifyWritable(path)
  } catch {
    throw new PathAccessError(`Cannot update status on binary or unsupported file: ${path}`)
  }
  if (kind !== 'markdown') {
    throw new PathAccessError(`Status updates require a markdown file: ${path}`)
  }

  const existing = await store.readText(path)
  if (existing === null) {
    throw new PathAccessError(`Not a file: ${relativePath}`)
  }

  const parsed = matter(existing)
  const prior = parsed.data as Record<string, unknown>
  const existingApprover = fmString(prior, 'approved_by')
  const providedApprover = options?.approvedBy?.trim() ?? ''
  const resolvedApprover =
    providedApprover ||
    (existingApprover && existingApprover.toLowerCase() !== 'unknown' ? existingApprover : '')

  if (status === 'approved' && !resolvedApprover) {
    throw new PathAccessError(
      'Approving requires approved_by (provide a named approver; do not invent one)',
    )
  }

  const data: Record<string, unknown> = {
    ...prior,
    status,
    updated_on: todayIsoDate(),
    edited_via: 'viewer',
  }

  if (status === 'approved') {
    data.approved_by = resolvedApprover
    data.approval_date = todayIsoDate()
  } else if (providedApprover) {
    data.approved_by = providedApprover
  }

  await store.writeText(path, matter.stringify(parsed.content, data))
  return readBrainFile(store, path)
}
