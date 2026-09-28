import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { buildCompanyDashboard } from '../server/company'
import { LocalFsStore } from '../server/local-fs-store'

const FIXTURE = join(import.meta.dirname, 'fixtures/brain')

describe('buildCompanyDashboard', () => {
  it('summarizes identity, areas, audience, strategy, team, and gaps from 01-COMPANY', async () => {
    const dash = await buildCompanyDashboard(new LocalFsStore(FIXTURE))

    expect(dash.identity.operatingName).toBe('Fixture Co')
    expect(dash.identity.website).toContain('example.com')
    expect(dash.identity.businessModel).toBe('SaaS')
    expect(dash.identity.whatItDoes).toMatch(/fixtures/i)
    expect(dash.identity.governance).toMatch(/Alice/i)
    expect(dash.identity.status).toBe('approved')
    expect(dash.identity.path).toBe('01-COMPANY/COMPANY.md')

    expect(dash.completeness.claimed).toBeGreaterThan(0)
    expect(dash.completeness.unverified).toBeGreaterThan(0)
    expect(dash.completeness.verified).toBeGreaterThan(0)
    expect(dash.completeness.progress).toBeGreaterThan(0)
    expect(dash.completeness.progress).toBeLessThan(1)

    const team = dash.areas.find((a) => a.id === 'team')
    expect(team?.status).toBe('populated')
    expect(team?.fileCount).toBeGreaterThan(0)

    const decisions = dash.areas.find((a) => a.id === 'decisions')
    expect(decisions?.status).toBe('starter')

    expect(dash.audience.primary).toMatch(/SME/i)
    expect(dash.audience.status).toBe('approved')
    expect(dash.audience.path).toBe('01-COMPANY/audience.md')

    expect(dash.strategy.status).toMatch(/unverified/i)
    expect(dash.strategy.path).toBe('01-COMPANY/strategy.md')

    expect(dash.team).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Alice', path: '01-COMPANY/team/alice.md' })]),
    )
    expect(dash.activity.length).toBeGreaterThan(0)

    expect(dash.gaps.some((g) => /unverified|Not provided|starter|strategy/i.test(g.label))).toBe(true)
  })
})
