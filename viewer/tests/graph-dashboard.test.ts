import { describe, expect, it } from 'vitest'
import type { Neo4jProductSummary } from '../src/api'
import {
  buildGraphDashboardStats,
  coverageStatus,
  isNeighborhoodCovered,
  productNeighborhoodStatus,
} from '../src/components/graph/graph-dashboard'

function product(
  partial: Partial<Neo4jProductSummary> & Pick<Neo4jProductSummary, 'slug'>,
): Neo4jProductSummary {
  return {
    id: partial.id ?? `prod-${partial.slug}`,
    name: partial.name ?? partial.slug,
    slug: partial.slug,
    featureCount: partial.featureCount ?? 0,
    integrationCount: partial.integrationCount ?? 0,
  }
}

describe('graph-dashboard helpers', () => {
  it('classifies neighborhood status from feature and integration counts', () => {
    expect(productNeighborhoodStatus({ featureCount: 2, integrationCount: 1 })).toBe(
      'populated',
    )
    expect(productNeighborhoodStatus({ featureCount: 1, integrationCount: 0 })).toBe(
      'starter',
    )
    expect(productNeighborhoodStatus({ featureCount: 0, integrationCount: 3 })).toBe(
      'starter',
    )
    expect(productNeighborhoodStatus({ featureCount: 0, integrationCount: 0 })).toBe(
      'empty',
    )
  })

  it('treats either features or integrations as covered', () => {
    expect(isNeighborhoodCovered({ featureCount: 1, integrationCount: 0 })).toBe(true)
    expect(isNeighborhoodCovered({ featureCount: 0, integrationCount: 1 })).toBe(true)
    expect(isNeighborhoodCovered({ featureCount: 0, integrationCount: 0 })).toBe(false)
  })

  it('aggregates totals, coverage, and attention gaps', () => {
    const stats = buildGraphDashboardStats([
      product({ slug: 'a', name: 'Alpha', featureCount: 2, integrationCount: 1 }),
      product({ slug: 'b', name: 'Beta', featureCount: 1, integrationCount: 0 }),
      product({ slug: 'c', name: 'Gamma', featureCount: 0, integrationCount: 0 }),
    ])

    expect(stats.productCount).toBe(3)
    expect(stats.featureTotal).toBe(3)
    expect(stats.integrationTotal).toBe(1)
    expect(stats.coveredCount).toBe(2)
    expect(stats.coverage).toBeCloseTo(2 / 3)
    expect(stats.gaps).toEqual([
      {
        slug: 'b',
        label: 'Beta',
        detail: 'Missing integrations',
        severity: 'medium',
      },
      {
        slug: 'c',
        label: 'Gamma',
        detail: 'No features or integrations linked yet',
        severity: 'high',
      },
    ])
  })

  it('returns zero coverage for an empty product list', () => {
    expect(buildGraphDashboardStats([])).toEqual({
      productCount: 0,
      featureTotal: 0,
      integrationTotal: 0,
      coveredCount: 0,
      coverage: 0,
      gaps: [],
    })
  })

  it('maps coverage ratio to status bands', () => {
    expect(coverageStatus(0.7)).toBe('populated')
    expect(coverageStatus(0.4)).toBe('starter')
    expect(coverageStatus(0.39)).toBe('empty')
  })
})
