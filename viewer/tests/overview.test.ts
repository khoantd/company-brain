import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalFsStore } from '../server/local-fs-store'
import { buildOverview } from '../server/overview'

const FIXTURE = join(import.meta.dirname, 'fixtures/brain')

describe('buildOverview', () => {
  it('summarizes company, products, team, domains, and gaps from a brain root', async () => {
    const overview = await buildOverview(new LocalFsStore(FIXTURE))

    expect(overview.company.operatingName).toBe('Fixture Co')
    expect(overview.company.website).toContain('example.com')
    expect(overview.company.status).toBe('approved')

    expect(overview.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'CRM', lifecycle: 'unknown', path: '04-PRODUCTS/crm/PRODUCT.md' }),
      ]),
    )

    expect(overview.team).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Alice', path: '01-COMPANY/team/alice.md' })]),
    )

    expect(overview.activity.length).toBeGreaterThan(0)
    expect(overview.activity[0]?.summary).toMatch(/fixture/i)

    const brand = overview.domains.find((d) => d.prefix === '03-BRAND')
    expect(brand?.status).toBe('starter')

    const company = overview.domains.find((d) => d.prefix === '01-COMPANY')
    expect(company?.status).toBe('populated')
    expect(company?.fileCount).toBeGreaterThan(1)

    expect(overview.gaps.some((g) => /lifecycle/i.test(g.label) || /CRM/i.test(g.label))).toBe(true)
    expect(overview.gaps.some((g) => /Not provided|unverified|empty|starter/i.test(g.label))).toBe(true)
  })

  it('treats a domain with only README as starter or empty', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brain-overview-'))
    try {
      for (const prefix of [
        '01-COMPANY',
        '02-DEPARTMENTS',
        '03-BRAND',
        '04-PRODUCTS',
        '05-PROJECTS',
        '06-RESEARCH',
        '07-CONTENT',
        '08-REFERENCES',
        '09-ASSETS',
        '10-OUTPUTS',
      ]) {
        await mkdir(join(dir, prefix), { recursive: true })
        await writeFile(join(dir, prefix, 'README.md'), `# ${prefix}\n`)
      }
      const overview = await buildOverview(new LocalFsStore(dir))
      expect(overview.domains.every((d) => d.status === 'starter' || d.status === 'empty')).toBe(true)
      expect(overview.products).toEqual([])
      expect(overview.team).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
