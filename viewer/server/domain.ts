import {
  STARTER_ONLY,
  classifyDomain,
  extractBullet,
  fmString,
  isUnverified,
  loadTeam,
  readMarkdown,
  walkFiles,
  type DomainStatus,
  type OverviewGap,
} from './brain-records.js'
import type { BrainStore } from './store.js'

export type DomainArea = {
  id: string
  label: string
  path: string
  fileCount: number
  status: DomainStatus
  progress: number
}

export type DomainRecord = {
  name: string
  status: string
  path: string
  detail: string
}

export type DomainCanonical = {
  path: string
  status: string
  fields: Array<{ label: string; value: string }>
}

export type DomainDashboard = {
  prefix: string
  label: string
  summary: {
    status: DomainStatus
    fileCount: number
    progress: number
  }
  canonical?: DomainCanonical
  areas: DomainArea[]
  records: DomainRecord[]
  gaps: OverviewGap[]
}

export class DomainPrefixError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainPrefixError'
  }
}

type AreaDef = { id: string; label: string; path: string; kind: 'dir' | 'file' }
type RecordMode = 'products' | 'departments' | 'team' | 'children' | 'none'

type DomainConfig = {
  label: string
  canonicalPath?: string
  claimLabels?: string[]
  areas?: AreaDef[]
  recordMode: RecordMode
  autoAreas?: boolean
}

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  '02-DEPARTMENTS': {
    label: 'Departments',
    recordMode: 'departments',
    autoAreas: true,
  },
  '03-BRAND': {
    label: 'Brand',
    canonicalPath: '03-BRAND/BRAND.md',
    claimLabels: ['Core idea', 'Brand principles'],
    areas: [
      { id: 'positioning', label: 'Positioning', path: '03-BRAND/positioning.md', kind: 'file' },
      { id: 'voice', label: 'Voice', path: '03-BRAND/voice', kind: 'dir' },
      { id: 'visual', label: 'Visual', path: '03-BRAND/visual', kind: 'dir' },
      { id: 'guidelines', label: 'Guidelines', path: '03-BRAND/guidelines', kind: 'dir' },
    ],
    recordMode: 'none',
  },
  '04-PRODUCTS': {
    label: 'Products',
    recordMode: 'products',
    autoAreas: true,
  },
  '05-PROJECTS': {
    label: 'Projects',
    recordMode: 'children',
    autoAreas: true,
  },
  '01-COMPANY/team': {
    label: 'Team',
    recordMode: 'team',
    autoAreas: false,
  },
  '06-RESEARCH': {
    label: 'Research',
    recordMode: 'children',
    autoAreas: true,
  },
  '07-CONTENT': {
    label: 'Content',
    recordMode: 'children',
    autoAreas: true,
  },
  '08-REFERENCES': {
    label: 'References',
    recordMode: 'children',
    autoAreas: true,
  },
  '09-ASSETS': {
    label: 'Assets',
    areas: [
      { id: 'source', label: 'Source', path: '09-ASSETS/source', kind: 'dir' },
      { id: 'working', label: 'Working', path: '09-ASSETS/working', kind: 'dir' },
      { id: 'approved', label: 'Approved', path: '09-ASSETS/approved', kind: 'dir' },
    ],
    recordMode: 'none',
  },
  '10-OUTPUTS': {
    label: 'Outputs',
    recordMode: 'children',
    autoAreas: true,
  },
}

export function listDomainPrefixes(): string[] {
  return Object.keys(DOMAIN_CONFIGS)
}

function scoreFileContent(content: string, fmStatus: string): {
  status: DomainStatus
  progress: number
} {
  if (!content.trim()) return { status: 'empty', progress: 0 }
  const hasUnverified = /`\[?Not provided\]?`|\(unverified\)/i.test(content)
  const statusUnverified = /unverified|unknown/i.test(fmStatus)
  if (statusUnverified || hasUnverified) return { status: 'starter', progress: 0.35 }
  if (content.trim().length < 40) return { status: 'starter', progress: 0.2 }
  return { status: 'populated', progress: 0.85 }
}

function classifySmallDir(filePaths: string[]): {
  status: DomainStatus
  progress: number
  fileCount: number
} {
  const base = classifyDomain(filePaths)
  const substantive = filePaths.filter((p) => {
    const name = p.split('/').pop()?.toLowerCase() ?? ''
    return !STARTER_ONLY.has(name)
  })
  if (substantive.length >= 1 && substantive.length <= 2) {
    return {
      status: 'populated',
      progress: Math.min(1, 0.55 + substantive.length * 0.15),
      fileCount: base.fileCount,
    }
  }
  return base
}

async function buildArea(store: BrainStore, def: AreaDef): Promise<DomainArea> {
  if (def.kind === 'file') {
    const md = await readMarkdown(store, def.path)
    if (!md) {
      return { id: def.id, label: def.label, path: def.path, fileCount: 0, status: 'empty', progress: 0 }
    }
    const scored = scoreFileContent(md.content, fmString(md.data, 'status', ''))
    return {
      id: def.id,
      label: def.label,
      path: def.path,
      fileCount: 1,
      status: scored.status,
      progress: scored.progress,
    }
  }
  const files = await walkFiles(store, def.path)
  const { status, progress, fileCount } = classifySmallDir(files)
  return { id: def.id, label: def.label, path: def.path, fileCount, status, progress }
}

async function autoAreasFromChildren(store: BrainStore, prefix: string): Promise<DomainArea[]> {
  const entries = await store.listChildren(prefix)
  const areas: DomainArea[] = []
  for (const entry of entries) {
    const lower = entry.name.toLowerCase()
    if (STARTER_ONLY.has(lower) || lower === 'agents.md') continue
    if (entry.type === 'dir') {
      areas.push(await buildArea(store, { id: entry.name, label: humanize(entry.name), path: entry.path, kind: 'dir' }))
    } else if (entry.type === 'file' && entry.name.endsWith('.md')) {
      areas.push(await buildArea(store, { id: entry.name, label: humanize(entry.name), path: entry.path, kind: 'file' }))
    }
  }
  return areas
}

function humanize(name: string): string {
  return name
    .replace(/\.md$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function loadProductRecords(store: BrainStore): Promise<DomainRecord[]> {
  const children = await store.listChildren('04-PRODUCTS')
  const records: DomainRecord[] = []
  for (const entry of children) {
    if (entry.type !== 'dir' || entry.name.startsWith('.')) continue
    const path = `04-PRODUCTS/${entry.name}/PRODUCT.md`
    const md = await readMarkdown(store, path)
    if (!md) continue
    const lifecycle = fmString(md.data, 'lifecycle', 'unknown')
    const owner = fmString(md.data, 'owner', 'unknown')
    records.push({
      name: fmString(md.data, 'name', entry.name),
      status: fmString(md.data, 'status', 'unknown'),
      path,
      detail: `Lifecycle: ${lifecycle} · Owner: ${owner}`,
    })
  }
  return records.sort((a, b) => a.name.localeCompare(b.name))
}

async function loadDepartmentRecords(store: BrainStore): Promise<DomainRecord[]> {
  const children = await store.listChildren('02-DEPARTMENTS')
  const records: DomainRecord[] = []
  for (const entry of children) {
    if (entry.type !== 'dir' || entry.name.startsWith('.')) continue
    const path = `02-DEPARTMENTS/${entry.name}/DEPARTMENT.md`
    const md = await readMarkdown(store, path)
    if (!md) continue
    const purpose = extractBullet(md.content, ['Purpose'])
    const lead = extractBullet(md.content, ['Department lead'])
    records.push({
      name: humanize(entry.name),
      status: fmString(md.data, 'status', 'unknown'),
      path,
      detail: [purpose && `Purpose: ${purpose}`, lead && `Lead: ${lead}`].filter(Boolean).join(' · ') || 'No purpose recorded',
    })
  }
  return records.sort((a, b) => a.name.localeCompare(b.name))
}

async function loadChildRecords(store: BrainStore, prefix: string): Promise<DomainRecord[]> {
  const entries = await store.listChildren(prefix)
  const records: DomainRecord[] = []
  for (const entry of entries) {
    const lower = entry.name.toLowerCase()
    if (STARTER_ONLY.has(lower) || lower === 'agents.md') continue
    if (entry.type === 'dir') {
      const files = await walkFiles(store, entry.path)
      const { status, fileCount } = classifySmallDir(files)
      records.push({
        name: humanize(entry.name),
        status,
        path: entry.path,
        detail: `${fileCount} file${fileCount === 1 ? '' : 's'}`,
      })
    } else if (entry.type === 'file' && entry.name.endsWith('.md')) {
      const md = await readMarkdown(store, entry.path)
      records.push({
        name: humanize(entry.name),
        status: fmString(md?.data ?? {}, 'status', 'present'),
        path: entry.path,
        detail: 'Markdown record',
      })
    }
  }
  return records.sort((a, b) => a.name.localeCompare(b.name))
}

async function buildCanonical(
  store: BrainStore,
  config: DomainConfig,
): Promise<DomainCanonical | undefined> {
  if (!config.canonicalPath) return undefined
  const md = await readMarkdown(store, config.canonicalPath)
  if (!md) {
    return { path: config.canonicalPath, status: 'missing', fields: [] }
  }
  const fields: Array<{ label: string; value: string }> = []
  for (const label of config.claimLabels ?? []) {
    const bullet = extractBullet(md.content, [label])
    if (bullet) {
      fields.push({ label, value: bullet })
      continue
    }
    const section = md.content.split(new RegExp(`##\\s*${label}`, 'i'))[1]?.split(/^##\s+/m)[0] ?? ''
    const line =
      section
        .split('\n')
        .map((l) => l.replace(/^[-*>]\s*/, '').trim())
        .find((l) => l && !l.startsWith('#')) ?? ''
    fields.push({ label, value: line || '—' })
  }
  return {
    path: config.canonicalPath,
    status: fmString(md.data, 'status', 'unknown'),
    fields,
  }
}

export async function buildDomainDashboard(store: BrainStore, prefix: string): Promise<DomainDashboard> {
  const normalized = prefix.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const config = DOMAIN_CONFIGS[normalized]
  if (!config) {
    throw new DomainPrefixError(`Unknown domain prefix: ${prefix}`)
  }

  const allFiles = await walkFiles(store, normalized)
  const summary =
    normalized === '01-COMPANY/team'
      ? (() => {
          const scored = classifySmallDir(allFiles)
          return { status: scored.status, fileCount: scored.fileCount, progress: scored.progress }
        })()
      : (() => {
          const scored = classifyDomain(allFiles)
          return { status: scored.status, fileCount: scored.fileCount, progress: scored.progress }
        })()

  const canonical = await buildCanonical(store, config)

  let areas: DomainArea[] = []
  if (config.areas?.length) {
    for (const def of config.areas) {
      areas.push(await buildArea(store, def))
    }
  } else if (config.autoAreas) {
    areas = await autoAreasFromChildren(store, normalized)
  }

  let records: DomainRecord[] = []
  switch (config.recordMode) {
    case 'products':
      records = await loadProductRecords(store)
      break
    case 'departments':
      records = await loadDepartmentRecords(store)
      break
    case 'team': {
      const team = await loadTeam(store)
      records = team.map((m) => ({
        name: m.name,
        status: m.status,
        path: m.path,
        detail: m.role,
      }))
      break
    }
    case 'children':
      records = await loadChildRecords(store, normalized)
      break
    default:
      records = []
  }

  const gaps: OverviewGap[] = []

  if (summary.status === 'empty') {
    gaps.push({
      label: `${config.label} is empty`,
      detail: `No files under ${normalized}`,
      path: normalized,
      severity: 'high',
    })
  } else if (summary.status === 'starter') {
    gaps.push({
      label: `${config.label} is still a starter`,
      detail: 'Mostly README/placeholder records',
      path: normalized,
      severity: 'medium',
    })
  }

  if (canonical) {
    if (canonical.status === 'missing') {
      gaps.push({
        label: `Missing ${canonical.path.split('/').pop()}`,
        detail: 'Canonical record not found',
        path: canonical.path,
        severity: 'high',
      })
    } else if (/unverified|unknown/i.test(canonical.status)) {
      gaps.push({
        label: `${config.label} canonical record is unverified`,
        detail: `Status on ${canonical.path}`,
        path: canonical.path,
        severity: 'high',
      })
    }
    for (const field of canonical.fields) {
      if (isUnverified(field.value) || field.value === '—') {
        gaps.push({
          label: `${field.label} is unverified`,
          detail: `Fill in ${canonical.path}`,
          path: canonical.path,
          severity: 'medium',
        })
      }
    }
  }

  for (const area of areas) {
    if (area.status === 'empty') {
      gaps.push({
        label: `${area.label} is empty`,
        detail: `No files under ${area.path}`,
        path: area.path,
        severity: 'medium',
      })
    } else if (area.status === 'starter') {
      gaps.push({
        label: `${area.label} is still a starter`,
        detail: 'Mostly README/placeholder records',
        path: area.path,
        severity: 'medium',
      })
    }
  }

  for (const record of records) {
    if (/unknown/i.test(record.status) || /Lifecycle: unknown/i.test(record.detail)) {
      gaps.push({
        label: `Complete record for ${record.name}`,
        detail: record.detail,
        path: record.path,
        severity: /lifecycle/i.test(record.detail) ? 'high' : 'medium',
      })
    }
  }

  if (config.recordMode === 'team' && records.length === 0) {
    gaps.push({
      label: 'No team profiles yet',
      detail: 'Add profiles under 01-COMPANY/team',
      path: '01-COMPANY/team',
      severity: 'medium',
    })
  }

  return {
    prefix: normalized,
    label: config.label,
    summary,
    canonical,
    areas,
    records,
    gaps: gaps.slice(0, 12),
  }
}
