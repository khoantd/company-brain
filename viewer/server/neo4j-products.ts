import type { Record as Neo4jRecord } from 'neo4j-driver'
import {
  getNeo4jDriver,
  Neo4jGraphError,
  collectGraphFromRecords,
  type GraphPayload,
  type Neo4jConfig,
  toPlainValue,
} from './neo4j.js'

export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type ProductSummary = {
  id: string
  name: string
  slug: string
  featureCount: number
  integrationCount: number
}

export type ProductGraphResult = {
  product: ProductSummary
  graph: GraphPayload
}

export type Neo4jProductsApi = {
  list: () => Promise<ProductSummary[]>
  graph: (slug: string) => Promise<ProductGraphResult>
}

/** List Product nodes with feature/integration neighborhood counts. */
export const PRODUCT_LIST_CYPHER = `
MATCH (p:Product)
OPTIONAL MATCH (p)-[:HAS_FEATURE]->(f:Feature)
OPTIONAL MATCH (s:System)-[:REPRESENTS]->(p)
OPTIONAL MATCH (s)-[:HAS_FEATURE]->(sf:Feature)
OPTIONAL MATCH (s)-[:SENDS_TO|RECEIVED_BY]-(i:Integration)
WITH p,
     count(DISTINCT f) + count(DISTINCT sf) AS featureCount,
     count(DISTINCT i) AS integrationCount
RETURN p.id AS id,
       p.name AS name,
       p.slug AS slug,
       featureCount,
       integrationCount
ORDER BY toLower(coalesce(p.name, p.slug, ''))
`.trim()

/**
 * Product neighborhood: direct features/includes, plus System bridge
 * for integrations and system-owned features.
 */
export const PRODUCT_NEIGHBORHOOD_CYPHER = `
MATCH (p:Product {slug: $slug})
OPTIONAL MATCH (p)-[r1:HAS_FEATURE|INCLUDES]->(a)
OPTIONAL MATCH (s:System)-[r2:REPRESENTS]->(p)
OPTIONAL MATCH (s)-[r3:HAS_FEATURE]->(sf)
OPTIONAL MATCH (s)-[r4:SENDS_TO]->(i:Integration)
OPTIONAL MATCH (i)-[r5:RECEIVED_BY]->(s2)
OPTIONAL MATCH (i)-[r6:CARRIES_DATA_FOR]->(cf)
OPTIONAL MATCH (s)-[r7:INTEGRATES_WITH]->(s3)
RETURN p, s, a, sf, i, s2, cf, s3, r1, r2, r3, r4, r5, r6, r7
`.trim()

export function assertProductSlug(slug: string): string {
  const trimmed = slug.trim()
  if (!PRODUCT_SLUG_PATTERN.test(trimmed)) {
    throw new Neo4jGraphError(
      'Invalid product slug (expected lowercase kebab-case)',
      400,
      'INVALID_SLUG',
    )
  }
  return trimmed
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'toNumber' in value) {
    try {
      return (value as { toNumber: () => number }).toNumber()
    } catch {
      return 0
    }
  }
  return 0
}

export function mapProductListRecords(
  records: Array<{ get: (key: string) => unknown }>,
): ProductSummary[] {
  const products: ProductSummary[] = []
  for (const record of records) {
    const slug = record.get('slug')
    const name = record.get('name')
    const id = record.get('id')
    if (typeof slug !== 'string' || !slug.trim()) continue
    products.push({
      id: typeof id === 'string' && id.trim() ? id : `prod-${slug}`,
      name: typeof name === 'string' && name.trim() ? name : slug,
      slug,
      featureCount: asNumber(toPlainValue(record.get('featureCount'))),
      integrationCount: asNumber(toPlainValue(record.get('integrationCount'))),
    })
  }
  return products
}

function summaryFromGraph(slug: string, graph: GraphPayload): ProductSummary | null {
  const productNode = graph.nodes.find(
    (n) =>
      n.labels.includes('Product') &&
      (n.properties.slug === slug || n.properties.id === `prod-${slug}`),
  )
  if (!productNode) return null

  const featureCount = graph.nodes.filter((n) => n.labels.includes('Feature')).length
  const integrationCount = graph.nodes.filter((n) => n.labels.includes('Integration')).length
  const id =
    typeof productNode.properties.id === 'string' ? productNode.properties.id : `prod-${slug}`
  const name =
    typeof productNode.properties.name === 'string' ? productNode.properties.name : productNode.label

  return {
    id,
    name,
    slug:
      typeof productNode.properties.slug === 'string' ? productNode.properties.slug : slug,
    featureCount,
    integrationCount,
  }
}

export function createNeo4jProductsApi(config: Neo4jConfig): Neo4jProductsApi {
  const driver = getNeo4jDriver(config)

  async function runRead(cypher: string, params: Record<string, unknown> = {}) {
    const session = driver.session(
      config.database ? { database: config.database } : undefined,
    )
    try {
      const result = await session.executeRead((tx) => tx.run(cypher, params))
      return result.records as Neo4jRecord[]
    } catch (error) {
      if (error instanceof Neo4jGraphError) throw error
      const message = error instanceof Error ? error.message : 'Neo4j query failed'
      throw new Neo4jGraphError(message, 502, 'QUERY_FAILED')
    } finally {
      await session.close()
    }
  }

  return {
    async list() {
      const records = await runRead(PRODUCT_LIST_CYPHER)
      return mapProductListRecords(records)
    },

    async graph(rawSlug: string) {
      const slug = assertProductSlug(rawSlug)
      const records = await runRead(PRODUCT_NEIGHBORHOOD_CYPHER, { slug })
      const graph = collectGraphFromRecords(records)
      const product = summaryFromGraph(slug, graph)
      if (!product) {
        throw new Neo4jGraphError(`Product not found: ${slug}`, 404, 'PRODUCT_NOT_FOUND')
      }
      return { product, graph }
    },
  }
}
