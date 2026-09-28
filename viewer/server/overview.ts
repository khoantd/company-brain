import { CANONICAL_PREFIXES } from './paths.js'
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

export type { DomainStatus, OverviewActivity, OverviewGap, OverviewTeamMember }

export type OverviewDomain = {
  prefix: string
  label: string
  fileCount: number
  status: DomainStatus
  progress: number
}

export type OverviewProduct = {
  name: string
  status: string
  lifecycle: string
  owner: string
  path: string
}

export type BrainOverview = {
  company: {
    operatingName: string
    website: string
    businessModel: string
    status: string
    path: string
  }
  domains: OverviewDomain[]
  products: OverviewProduct[]
  team: OverviewTeamMember[]
  activity: OverviewActivity[]
  gaps: OverviewGap[]
}

const DOMAIN_LABELS: Record<string, string> = {
  '01-COMPANY': 'Company',
  '02-DEPARTMENTS': 'Departments',
  '03-BRAND': 'Brand',
  '04-PRODUCTS': 'Products',
  '05-PROJECTS': 'Projects',
  '06-RESEARCH': 'Research',
  '07-CONTENT': 'Content',
  '08-REFERENCES': 'References',
  '09-ASSETS': 'Assets',
  '10-OUTPUTS': 'Outputs',
}

async function loadProducts(store: BrainStore): Promise<OverviewProduct[]> {
  const children = await store.listChildren('04-PRODUCTS')
  const products: OverviewProduct[] = []
  for (const entry of children) {
    if (entry.type !== 'dir' || entry.name.startsWith('.')) continue
    const path = `04-PRODUCTS/${entry.name}/PRODUCT.md`
    const md = await readMarkdown(store, path)
    if (!md) continue
    products.push({
      name: fmString(md.data, 'name', entry.name),
      status: fmString(md.data, 'status', 'unknown'),
      lifecycle: fmString(md.data, 'lifecycle', 'unknown'),
      owner: fmString(md.data, 'owner', 'unknown'),
      path,
    })
  }
  return products.sort((a, b) => a.name.localeCompare(b.name))
}

export async function buildOverview(store: BrainStore): Promise<BrainOverview> {
  const [domains, companyMd, products, team, activity] = await Promise.all([
    Promise.all(
      CANONICAL_PREFIXES.map(async (prefix) => {
        const files = await walkFiles(store, prefix)
        const { status, progress, fileCount } = classifyDomain(files)
        return {
          prefix,
          label: DOMAIN_LABELS[prefix] ?? prefix,
          fileCount,
          status,
          progress,
        } satisfies OverviewDomain
      }),
    ),
    readMarkdown(store, '01-COMPANY/COMPANY.md'),
    loadProducts(store),
    loadTeam(store),
    loadActivity(store),
  ])

  const companyContent = companyMd?.content ?? ''
  const company = {
    operatingName:
      extractBullet(companyContent, ['Operating name']) ||
      fmString(companyMd?.data ?? {}, 'operating_name', 'Company Brain'),
    website: extractBullet(companyContent, ['Website']),
    businessModel: extractBullet(companyContent, ['Business model']),
    status: fmString(companyMd?.data ?? {}, 'status', 'unknown'),
    path: '01-COMPANY/COMPANY.md',
  }

  const gaps: OverviewGap[] = []

  for (const domain of domains) {
    if (domain.status === 'empty') {
      gaps.push({
        label: `${domain.label} is empty`,
        detail: `No files under ${domain.prefix}`,
        path: domain.prefix,
        severity: 'high',
      })
    } else if (domain.status === 'starter') {
      gaps.push({
        label: `${domain.label} is still a starter`,
        detail: 'Mostly README/placeholder records',
        path: domain.prefix,
        severity: 'medium',
      })
    }
  }

  if (isUnverified(extractBullet(companyContent, ['Why it exists', 'Legal name', 'Current stage']))) {
    gaps.push({
      label: 'Company record has unverified fields',
      detail: 'Fill remaining [Not provided] claims in COMPANY.md',
      path: '01-COMPANY/COMPANY.md',
      severity: 'medium',
    })
  }

  for (const product of products) {
    if (/unknown/i.test(product.lifecycle)) {
      gaps.push({
        label: `Set lifecycle for ${product.name}`,
        detail: 'Product lifecycle is still unknown',
        path: product.path,
        severity: 'high',
      })
    }
    if (/unknown/i.test(product.owner)) {
      gaps.push({
        label: `Assign owner for ${product.name}`,
        detail: 'No product owner recorded',
        path: product.path,
        severity: 'medium',
      })
    }
  }

  return { company, domains, products, team, activity, gaps: gaps.slice(0, 12) }
}
