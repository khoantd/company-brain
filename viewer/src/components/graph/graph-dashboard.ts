import type { Neo4jProductSummary } from '../../api'

export type GraphProductStatus = 'populated' | 'starter' | 'empty'

export type GraphDashboardGap = {
  slug: string
  label: string
  detail: string
  severity: 'high' | 'medium'
}

export type GraphDashboardStats = {
  productCount: number
  featureTotal: number
  integrationTotal: number
  coveredCount: number
  coverage: number
  gaps: GraphDashboardGap[]
}

export function productNeighborhoodStatus(
  product: Pick<Neo4jProductSummary, 'featureCount' | 'integrationCount'>,
): GraphProductStatus {
  const hasFeatures = product.featureCount > 0
  const hasIntegrations = product.integrationCount > 0
  if (hasFeatures && hasIntegrations) return 'populated'
  if (hasFeatures || hasIntegrations) return 'starter'
  return 'empty'
}

export function isNeighborhoodCovered(
  product: Pick<Neo4jProductSummary, 'featureCount' | 'integrationCount'>,
): boolean {
  return product.featureCount > 0 || product.integrationCount > 0
}

export function buildGraphDashboardStats(
  products: Neo4jProductSummary[],
): GraphDashboardStats {
  let featureTotal = 0
  let integrationTotal = 0
  let coveredCount = 0
  const gaps: GraphDashboardGap[] = []

  for (const product of products) {
    featureTotal += product.featureCount
    integrationTotal += product.integrationCount
    if (isNeighborhoodCovered(product)) {
      coveredCount += 1
    }

    const status = productNeighborhoodStatus(product)
    if (status === 'empty') {
      gaps.push({
        slug: product.slug,
        label: product.name,
        detail: 'No features or integrations linked yet',
        severity: 'high',
      })
    } else if (status === 'starter') {
      const missing =
        product.featureCount === 0 ? 'features' : 'integrations'
      gaps.push({
        slug: product.slug,
        label: product.name,
        detail: `Missing ${missing}`,
        severity: 'medium',
      })
    }
  }

  const productCount = products.length
  const coverage = productCount === 0 ? 0 : coveredCount / productCount

  return {
    productCount,
    featureTotal,
    integrationTotal,
    coveredCount,
    coverage,
    gaps,
  }
}

export function graphStatusLabel(status: GraphProductStatus): string {
  if (status === 'populated') return 'On track'
  if (status === 'starter') return 'Starter'
  return 'Empty'
}

export function graphStatusClass(status: GraphProductStatus): string {
  if (status === 'populated') return 'border-track/30 bg-track/10 text-track'
  if (status === 'starter') return 'border-ahead/30 bg-ahead/10 text-ahead'
  return 'border-coral/30 bg-coral/10 text-coral'
}

export function graphBarClass(status: GraphProductStatus): string {
  if (status === 'populated') return 'bg-track'
  if (status === 'starter') return 'bg-ahead'
  return 'bg-coral'
}

export function coverageStatus(coverage: number): GraphProductStatus {
  if (coverage >= 0.7) return 'populated'
  if (coverage >= 0.4) return 'starter'
  return 'empty'
}
