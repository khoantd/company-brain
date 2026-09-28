/** Lowercase kebab-case product slug (aligned with server PRODUCT_SLUG_PATTERN). */
const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Product neighborhood Cypher for the Custom Cypher editor.
 * Same shape as server PRODUCT_NEIGHBORHOOD_CYPHER, with slug inlined
 * (free Cypher API has no query params).
 */
export function productNeighborhoodExploreCypher(slug: string): string {
  const trimmed = slug.trim()
  if (!PRODUCT_SLUG_PATTERN.test(trimmed)) {
    throw new Error('Invalid product slug (expected lowercase kebab-case)')
  }

  return `
MATCH (p:Product {slug: '${trimmed}'})
OPTIONAL MATCH (p)-[r1:HAS_FEATURE|INCLUDES]->(a)
OPTIONAL MATCH (s:System)-[r2:REPRESENTS]->(p)
OPTIONAL MATCH (s)-[r3:HAS_FEATURE]->(sf)
OPTIONAL MATCH (s)-[r4:SENDS_TO]->(i:Integration)
OPTIONAL MATCH (i)-[r5:RECEIVED_BY]->(s2)
OPTIONAL MATCH (i)-[r6:CARRIES_DATA_FOR]->(cf)
OPTIONAL MATCH (s)-[r7:INTEGRATES_WITH]->(s3)
RETURN p, s, a, sf, i, s2, cf, s3, r1, r2, r3, r4, r5, r6, r7
`.trim()
}
