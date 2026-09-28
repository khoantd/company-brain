import {
  classifyDomain,
  extractBullet,
  fmString,
  isUnverified,
  loadActivity,
  loadTeam,
  readMarkdown,
  walkFiles,
  type DomainStatus,
  type OverviewActivity,
  type OverviewGap,
  type OverviewTeamMember,
} from './brain-records.js'
import type { BrainStore } from './store.js'

export type CompanyArea = {
  id: string
  label: string
  path: string
  fileCount: number
  status: DomainStatus
  progress: number
}

export type CompanyDashboard = {
  identity: {
    operatingName: string
    legalName: string
    website: string
    businessModel: string
    whatItDoes: string
    governance: string
    stage: string
    status: string
    path: string
  }
  completeness: {
    claimed: number
    verified: number
    unverified: number
    progress: number
  }
  areas: CompanyArea[]
  audience: {
    primary: string
    status: string
    path: string
  }
  strategy: {
    direction: string
    status: string
    path: string
  }
  team: OverviewTeamMember[]
  activity: OverviewActivity[]
  gaps: OverviewGap[]
}

const COMPANY_CLAIM_LABELS: Array<{ labels: string[]; path: string }> = [
  { labels: ['Operating name'], path: '01-COMPANY/COMPANY.md' },
  { labels: ['Legal name'], path: '01-COMPANY/COMPANY.md' },
  { labels: ['Website'], path: '01-COMPANY/COMPANY.md' },
  { labels: ['Business model'], path: '01-COMPANY/COMPANY.md' },
  { labels: ['What the company does'], path: '01-COMPANY/COMPANY.md' },
  { labels: ['Why it exists'], path: '01-COMPANY/COMPANY.md' },
  { labels: ['Current stage'], path: '01-COMPANY/COMPANY.md' },
  { labels: ['Who may approve company-level decisions'], path: '01-COMPANY/COMPANY.md' },
  { labels: ['Who'], path: '01-COMPANY/audience.md' },
  { labels: ['Needs or jobs'], path: '01-COMPANY/audience.md' },
]

const AREA_DEFS: Array<{ id: string; label: string; path: string; kind: 'dir' | 'file' }> = [
  { id: 'audience', label: 'Audience', path: '01-COMPANY/audience.md', kind: 'file' },
  { id: 'strategy', label: 'Strategy', path: '01-COMPANY/strategy.md', kind: 'file' },
  { id: 'team', label: 'Team', path: '01-COMPANY/team', kind: 'dir' },
  { id: 'activity', label: 'Activity', path: '01-COMPANY/activity', kind: 'dir' },
  { id: 'decisions', label: 'Decisions', path: '01-COMPANY/decisions', kind: 'dir' },
  { id: 'goals', label: 'Goals', path: '01-COMPANY/goals', kind: 'dir' },
  { id: 'history', label: 'History', path: '01-COMPANY/history', kind: 'dir' },
]

function scoreFileContent(content: string, fmStatus: string): {
  status: DomainStatus
  progress: number
  fileCount: number
} {
  if (!content.trim()) return { status: 'empty', progress: 0, fileCount: 0 }
  const hasUnverified = /`\[?Not provided\]?`|\(unverified\)/i.test(content)
  const statusUnverified = /unverified|unknown/i.test(fmStatus)
  if (statusUnverified || hasUnverified) {
    return { status: 'starter', progress: 0.35, fileCount: 1 }
  }
  if (content.trim().length < 40) {
    return { status: 'starter', progress: 0.2, fileCount: 1 }
  }
  return { status: 'populated', progress: 0.85, fileCount: 1 }
}

function classifyCompanyDir(id: string, filePaths: string[]) {
  const base = classifyDomain(filePaths)
  const substantive = filePaths.filter((p) => {
    const name = p.split('/').pop()?.toLowerCase() ?? ''
    return !['readme.md', 'agents.md', 'index.md'].includes(name)
  })
  if ((id === 'team' || id === 'activity') && substantive.length >= 1) {
    return {
      status: 'populated' as const,
      progress: Math.min(1, 0.6 + substantive.length * 0.12),
      fileCount: base.fileCount,
    }
  }
  return base
}

function firstNonEmptyLine(section: string): string {
  return (
    section
      .split('\n')
      .map((l) => l.replace(/^[-*]\s*/, '').trim())
      .find((l) => l && !l.startsWith('#') && !/^`?\[?Not provided\]?`?/i.test(l)) ?? ''
  )
}

export async function buildCompanyDashboard(store: BrainStore): Promise<CompanyDashboard> {
  const companyMd = await readMarkdown(store, '01-COMPANY/COMPANY.md')
  const companyContent = companyMd?.content ?? ''

  const identity = {
    operatingName:
      extractBullet(companyContent, ['Operating name']) ||
      fmString(companyMd?.data ?? {}, 'operating_name', 'Company Brain'),
    legalName: extractBullet(companyContent, ['Legal name']),
    website: extractBullet(companyContent, ['Website']),
    businessModel: extractBullet(companyContent, ['Business model']),
    whatItDoes: extractBullet(companyContent, ['What the company does']),
    governance: extractBullet(companyContent, ['Who may approve company-level decisions']),
    stage: extractBullet(companyContent, ['Current stage']),
    status: fmString(companyMd?.data ?? {}, 'status', 'unknown'),
    path: '01-COMPANY/COMPANY.md',
  }

  const audienceMd = await readMarkdown(store, '01-COMPANY/audience.md')
  const audienceContent = audienceMd?.content ?? ''
  const audience = {
    primary: extractBullet(audienceContent, ['Who']) || firstNonEmptyLine(audienceContent),
    status: fmString(audienceMd?.data ?? {}, 'status', 'unknown'),
    path: '01-COMPANY/audience.md',
  }

  const strategyMd = await readMarkdown(store, '01-COMPANY/strategy.md')
  const strategyContent = strategyMd?.content ?? ''
  const directionSection = strategyContent.split(/##\s*Strategic direction/i)[1]?.split(/^##\s+/m)[0] ?? ''
  const strategy = {
    direction: firstNonEmptyLine(directionSection) || extractBullet(strategyContent, ['What the company will prioritize']),
    status: fmString(strategyMd?.data ?? {}, 'status', 'unknown'),
    path: '01-COMPANY/strategy.md',
  }

  const contentByPath = new Map<string, string>([
    ['01-COMPANY/COMPANY.md', companyContent],
    ['01-COMPANY/audience.md', audienceContent],
    ['01-COMPANY/strategy.md', strategyContent],
  ])

  let claimed = 0
  let verified = 0
  let unverified = 0
  for (const claim of COMPANY_CLAIM_LABELS) {
    const content = contentByPath.get(claim.path) ?? ''
    const value = extractBullet(content, claim.labels)
    if (!value && !content) continue
    claimed += 1
    if (isUnverified(value)) unverified += 1
    else verified += 1
  }
  const completeness = {
    claimed,
    verified,
    unverified,
    progress: claimed === 0 ? 0 : verified / claimed,
  }

  const areas: CompanyArea[] = []
  for (const def of AREA_DEFS) {
    if (def.kind === 'file') {
      const md =
        def.id === 'audience'
          ? audienceMd
          : def.id === 'strategy'
            ? strategyMd
            : await readMarkdown(store, def.path)
      const fmStatus = fmString(md?.data ?? {}, 'status', '')
      const scored = scoreFileContent(md?.content ?? '', fmStatus)
      areas.push({
        id: def.id,
        label: def.label,
        path: def.path,
        fileCount: md ? 1 : 0,
        status: md ? scored.status : 'empty',
        progress: md ? scored.progress : 0,
      })
    } else {
      const files = await walkFiles(store, def.path)
      const { status, progress, fileCount } = classifyCompanyDir(def.id, files)
      areas.push({
        id: def.id,
        label: def.label,
        path: def.path,
        fileCount,
        status,
        progress,
      })
    }
  }

  const team = await loadTeam(store)
  const activity = await loadActivity(store)

  const gaps: OverviewGap[] = []

  if (completeness.unverified > 0) {
    gaps.push({
      label: 'Company claims still unverified',
      detail: `${completeness.unverified} of ${completeness.claimed} tracked fields need values`,
      path: '01-COMPANY/COMPANY.md',
      severity: completeness.unverified >= 3 ? 'high' : 'medium',
    })
  }

  if (/unverified|unknown/i.test(strategy.status) || isUnverified(strategy.direction)) {
    gaps.push({
      label: 'Strategy is still unverified',
      detail: 'Approve strategic direction in strategy.md',
      path: '01-COMPANY/strategy.md',
      severity: 'high',
    })
  }

  const audienceNeeds = extractBullet(audienceContent, ['Needs or jobs'])
  if (isUnverified(audienceNeeds)) {
    gaps.push({
      label: 'Audience needs are unverified',
      detail: 'Primary audience who is set; needs remain open',
      path: '01-COMPANY/audience.md',
      severity: 'medium',
    })
  }

  for (const area of areas) {
    if (area.id === 'audience' || area.id === 'strategy') continue
    if (area.status === 'empty') {
      gaps.push({
        label: `${area.label} is empty`,
        detail: `No files under ${area.path}`,
        path: area.path,
        severity: 'high',
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

  if (team.length === 0) {
    gaps.push({
      label: 'No team profiles yet',
      detail: 'Add profiles under 01-COMPANY/team',
      path: '01-COMPANY/team',
      severity: 'medium',
    })
  }

  return {
    identity,
    completeness,
    areas,
    audience,
    strategy,
    team,
    activity,
    gaps: gaps.slice(0, 12),
  }
}
