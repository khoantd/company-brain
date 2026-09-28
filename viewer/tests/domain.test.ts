import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { buildDomainDashboard, DomainPrefixError } from '../server/domain'
import { LocalFsStore } from '../server/local-fs-store'

const FIXTURE = join(import.meta.dirname, 'fixtures/brain')
const store = () => new LocalFsStore(FIXTURE)

describe('buildDomainDashboard', () => {
  it('summarizes brand canonical fields, areas, and unverified gaps', async () => {
    const dash = await buildDomainDashboard(store(), '03-BRAND')

    expect(dash.prefix).toBe('03-BRAND')
    expect(dash.label).toBe('Brand')
    expect(dash.canonical?.path).toBe('03-BRAND/BRAND.md')
    expect(dash.canonical?.status).toBe('unverified')
    expect(dash.areas.some((a) => a.id === 'voice')).toBe(true)
    expect(dash.gaps.some((g) => /unverified|starter|Core idea/i.test(g.label))).toBe(true)
  })

  it('lists product records from PRODUCT.md files', async () => {
    const dash = await buildDomainDashboard(store(), '04-PRODUCTS')

    expect(dash.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'CRM', path: '04-PRODUCTS/crm/PRODUCT.md' }),
      ]),
    )
    expect(dash.gaps.some((g) => /CRM|lifecycle|Complete/i.test(g.label))).toBe(true)
  })

  it('lists team profiles for 01-COMPANY/team', async () => {
    const dash = await buildDomainDashboard(store(), '01-COMPANY/team')

    expect(dash.label).toBe('Team')
    expect(dash.records).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Alice', path: '01-COMPANY/team/alice.md' })]),
    )
  })

  it('treats projects with only README as starter/empty with gaps', async () => {
    const dash = await buildDomainDashboard(store(), '05-PROJECTS')

    expect(['starter', 'empty']).toContain(dash.summary.status)
    expect(dash.gaps.length).toBeGreaterThan(0)
  })

  it('lists department records', async () => {
    const dash = await buildDomainDashboard(store(), '02-DEPARTMENTS')

    expect(dash.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Business', path: '02-DEPARTMENTS/Business/DEPARTMENT.md' }),
      ]),
    )
  })

  it('rejects unknown prefixes', async () => {
    await expect(buildDomainDashboard(store(), '99-NOPE')).rejects.toBeInstanceOf(DomainPrefixError)
  })
})
