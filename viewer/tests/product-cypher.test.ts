import { describe, expect, it } from 'vitest'
import { productNeighborhoodExploreCypher } from '../src/components/graph/product-cypher'

describe('productNeighborhoodExploreCypher', () => {
  it('inlines a valid slug into the product neighborhood query', () => {
    const cypher = productNeighborhoodExploreCypher('company-brain')
    expect(cypher).toContain("MATCH (p:Product {slug: 'company-brain'})")
    expect(cypher).toContain('HAS_FEATURE|INCLUDES')
    expect(cypher).toContain('REPRESENTS')
    expect(cypher).toContain('SENDS_TO')
    expect(cypher).toContain(
      'RETURN p, s, a, sf, i, s2, cf, s3, r1, r2, r3, r4, r5, r6, r7',
    )
    expect(cypher).not.toContain('$slug')
  })

  it('trims whitespace before validating', () => {
    const cypher = productNeighborhoodExploreCypher('  crm  ')
    expect(cypher).toContain("MATCH (p:Product {slug: 'crm'})")
  })

  it('rejects invalid slugs', () => {
    expect(() => productNeighborhoodExploreCypher('../etc')).toThrow(/Invalid product slug/)
    expect(() => productNeighborhoodExploreCypher('CRM')).toThrow(/Invalid product slug/)
    expect(() => productNeighborhoodExploreCypher('a_b')).toThrow(/Invalid product slug/)
    expect(() => productNeighborhoodExploreCypher('')).toThrow(/Invalid product slug/)
  })
})
