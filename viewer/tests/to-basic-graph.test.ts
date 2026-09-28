import { describe, expect, it } from 'vitest'
import { toBasicGraph } from '../src/components/graph/to-basic-graph'

describe('toBasicGraph', () => {
  it('maps GraphPayload to BasicNode / BasicRelationship', () => {
    const result = toBasicGraph({
      nodes: [
        {
          id: 'n1',
          label: 'Royal Solution',
          labels: ['Company'],
          properties: { name: 'Royal Solution', id: 'co-1', active: true },
        },
      ],
      links: [
        {
          id: 'r1',
          source: 'n1',
          target: 'n2',
          type: 'HAS_PRODUCT',
          properties: { since: 2024 },
        },
      ],
    })

    expect(result.nodes).toEqual([
      {
        id: 'n1',
        elementId: 'n1',
        labels: ['Company'],
        properties: { name: 'Royal Solution', id: 'co-1', active: 'true' },
        propertyTypes: { name: 'string', id: 'string', active: 'boolean' },
      },
    ])
    expect(result.relationships).toEqual([
      {
        id: 'r1',
        elementId: 'r1',
        startNodeId: 'n1',
        endNodeId: 'n2',
        type: 'HAS_PRODUCT',
        properties: { since: '2024' },
        propertyTypes: { since: 'number' },
      },
    ])
  })
})
