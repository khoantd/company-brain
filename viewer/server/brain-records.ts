import matter from 'gray-matter'
import type { BrainStore } from './store.js'

export type DomainStatus = 'populated' | 'starter' | 'empty'

export type OverviewTeamMember = {
  name: string
  role: string
  status: string
  path: string
}

export type OverviewActivity = {
  title: string
  summary: string
  sourcePath: string
}

export type OverviewGap = {
  label: string
  detail: string
  path?: string
  severity: 'high' | 'medium'
}

export const STARTER_ONLY = new Set(['readme.md', 'agents.md', 'index.md'])

export async function walkFiles(store: BrainStore, prefix: string, depth = 0): Promise<string[]> {
  return store.listFiles(prefix, 8 - depth)
}

export function classifyDomain(filePaths: string[]): {
  status: DomainStatus
  progress: number
  fileCount: number
} {
  const substantive = filePaths.filter((p) => {
    const base = p.split('/').pop()?.toLowerCase() ?? ''
    return !STARTER_ONLY.has(base)
  })
  const fileCount = filePaths.length
  if (fileCount === 0) return { status: 'empty', progress: 0, fileCount }
  if (substantive.length === 0) return { status: 'starter', progress: 0.15, fileCount }
  if (substantive.length <= 2) return { status: 'starter', progress: 0.4, fileCount }
  return { status: 'populated', progress: Math.min(1, 0.55 + substantive.length * 0.08), fileCount }
}

export function extractBullet(content: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`^-\\s*${label}:\\s*(.+)$`, 'im')
    const match = content.match(re)
    if (match?.[1]) {
      return match[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
    }
  }
  return ''
}

export function isUnverified(value: string): boolean {
  return /`\[?Not provided\]?`|\(unverified\)|unknown/i.test(value) || value.trim() === ''
}

export async function readMarkdown(store: BrainStore, relativePath: string) {
  const raw = await store.readText(relativePath)
  if (raw === null) return null
  const parsed = matter(raw)
  return { content: parsed.content, data: parsed.data as Record<string, unknown> }
}

export function fmString(data: Record<string, unknown>, key: string, fallback = ''): string {
  const v = data[key]
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  return fallback
}

export async function loadTeam(store: BrainStore): Promise<OverviewTeamMember[]> {
  const children = await store.listChildren('01-COMPANY/team')
  const team: OverviewTeamMember[] = []
  for (const entry of children) {
    if (entry.type !== 'file' || !entry.name.endsWith('.md') || entry.name.toLowerCase() === 'readme.md') {
      continue
    }
    const md = await readMarkdown(store, entry.path)
    if (!md) continue
    team.push({
      name: fmString(md.data, 'name', entry.name.replace(/\.md$/i, '')),
      role: fmString(md.data, 'role', 'unknown'),
      status: fmString(md.data, 'status', 'unknown'),
      path: entry.path,
    })
  }
  return team.sort((a, b) => a.name.localeCompare(b.name))
}

export async function loadActivity(store: BrainStore): Promise<OverviewActivity[]> {
  const children = await store.listChildren('01-COMPANY/activity')
  const files = children
    .filter((e) => e.type === 'file' && /^\d{4}-\d{2}\.md$/i.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse()
  if (files.length === 0) return []

  const sourcePath = `01-COMPANY/activity/${files[0]}`
  const md = await readMarkdown(store, sourcePath)
  if (!md) return []

  const items: OverviewActivity[] = []
  const sections = md.content.split(/^##\s+/m).slice(1)
  for (const section of sections.slice(0, 8)) {
    const lines = section.trim().split('\n')
    const title = lines[0]?.trim() ?? 'Activity'
    const summaryLine = lines.find((l) => /^-?\s*Summary:/i.test(l))
    const summary = summaryLine
      ? summaryLine.replace(/^-?\s*Summary:\s*/i, '').trim()
      : lines.slice(1).find((l) => l.trim().startsWith('-'))?.replace(/^-\s*/, '').trim() || title
    items.push({ title, summary, sourcePath })
  }
  return items
}
