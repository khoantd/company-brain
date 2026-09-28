import { join } from 'node:path'
import neo4j from 'neo4j-driver'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../server/app'
import { LocalFsStore } from '../server/local-fs-store'
import {
  assertReadOnlyCypher,
  collectGraphFromRecords,
  loadNeo4jConfigFromEnv,
  Neo4jGraphError,
} from '../server/neo4j'
import { assertProductSlug, mapProductListRecords } from '../server/neo4j-products'

const FIXTURE = join(import.meta.dirname, 'fixtures/brain')
const AUTH = {
  user: 'operator',
  password: 'test-password',
  sessionSecret: 'test-session-secret-at-least-32-chars!!',
}

describe('neo4j helpers', () => {
  it('returns null when credentials are incomplete', () => {
    expect(loadNeo4jConfigFromEnv({ NEO4J_URI: 'neo4j+s://x' })).toBeNull()
  })

  it('loads config from NEO4J_DBMS alias', () => {
    expect(
      loadNeo4jConfigFromEnv({
        NEO4J_DBMS: 'neo4j+s://example.databases.neo4j.io',
        NEO4J_USERNAME: 'neo4j',
        NEO4J_PASSWORD: 'secret',
        NEO4J_DATABASE: 'neo4j',
      }),
    ).toEqual({
      uri: 'neo4j+s://example.databases.neo4j.io',
      username: 'neo4j',
      password: 'secret',
      database: 'neo4j',
    })
  })

  it('rejects write Cypher', () => {
    expect(() => assertReadOnlyCypher('CREATE (n:X) RETURN n')).toThrow(Neo4jGraphError)
    expect(() => assertReadOnlyCypher('MATCH (n) SET n.x = 1 RETURN n')).toThrow(
      /read-only/i,
    )
  })

  it('allows read Cypher', () => {
    expect(() =>
      assertReadOnlyCypher('MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 10'),
    ).not.toThrow()
  })

  it('collects nodes and relationships from records', () => {
    const a = new neo4j.types.Node(
      neo4j.int(1),
      ['Company'],
      { name: 'Royal Solution', id: 'co-1' },
      'n1',
    )
    const b = new neo4j.types.Node(
      neo4j.int(2),
      ['Product'],
      { name: 'Viewer', id: 'p-1' },
      'n2',
    )
    const r = new neo4j.types.Relationship(
      neo4j.int(10),
      neo4j.int(1),
      neo4j.int(2),
      'HAS_PRODUCT',
      {},
      'r10',
      'n1',
      'n2',
    )

    const record = {
      keys: ['n', 'r', 'm'],
      get(key: string) {
        if (key === 'n') return a
        if (key === 'r') return r
        if (key === 'm') return b
        return null
      },
    }

    const graph = collectGraphFromRecords([record])
    expect(graph.nodes).toHaveLength(2)
    expect(graph.links).toEqual([
      expect.objectContaining({
        id: 'r10',
        source: 'n1',
        target: 'n2',
        type: 'HAS_PRODUCT',
      }),
    ])
    expect(graph.nodes.find((n) => n.id === 'n1')?.label).toBe('Royal Solution')
  })
})

describe('neo4j product helpers', () => {
  it('accepts kebab-case slugs', () => {
    expect(assertProductSlug('neo4j-browser')).toBe('neo4j-browser')
    expect(assertProductSlug(' crm ')).toBe('crm')
  })

  it('rejects invalid slugs', () => {
    expect(() => assertProductSlug('../etc')).toThrow(/Invalid product slug/)
    expect(() => assertProductSlug('CRM')).toThrow(/Invalid product slug/)
    expect(() => assertProductSlug('a_b')).toThrow(/Invalid product slug/)
  })

  it('maps product list records', () => {
    const records = [
      {
        get(key: string) {
          const row: Record<string, unknown> = {
            id: 'prod-crm',
            name: 'CRM',
            slug: 'crm',
            featureCount: neo4j.int(2),
            integrationCount: 1,
          }
          return row[key]
        },
      },
      {
        get(key: string) {
          const row: Record<string, unknown> = {
            id: null,
            name: null,
            slug: 'orphan',
            featureCount: 0,
            integrationCount: 0,
          }
          return row[key]
        },
      },
      {
        get() {
          return null
        },
      },
    ]

    expect(mapProductListRecords(records)).toEqual([
      {
        id: 'prod-crm',
        name: 'CRM',
        slug: 'crm',
        featureCount: 2,
        integrationCount: 1,
      },
      {
        id: 'prod-orphan',
        name: 'orphan',
        slug: 'orphan',
        featureCount: 0,
        integrationCount: 0,
      },
    ])
  })
})

describe('POST /api/neo4j/graph', () => {
  const store = new LocalFsStore(FIXTURE)

  it('rejects unauthenticated requests', async () => {
    const app = createApp({
      store,
      auth: AUTH,
      secureCookies: false,
      neo4jGraphRunner: vi.fn(),
      neo4jProducts: null,
    })
    const res = await request(app)
      .post('/api/neo4j/graph')
      .send({ cypher: 'MATCH (n) RETURN n LIMIT 1' })
    expect(res.status).toBe(401)
  })

  it('returns 503 when Neo4j is not configured', async () => {
    const app = createApp({
      store,
      auth: AUTH,
      secureCookies: false,
      neo4jGraphRunner: null,
      neo4jProducts: null,
    })
    const agent = request.agent(app)
    await agent.post('/api/session/login').send({
      user: AUTH.user,
      password: AUTH.password,
    })
    const res = await agent
      .post('/api/neo4j/graph')
      .send({ cypher: 'MATCH (n) RETURN n LIMIT 1' })
    expect(res.status).toBe(503)
    expect(res.body.error).toMatch(/NEO4J_/)
  })

  it('rejects write Cypher via injected runner guards', async () => {
    const { assertReadOnlyCypher: guard } = await import('../server/neo4j')
    const runner = vi.fn(async (cypher: string) => {
      guard(cypher)
      return { nodes: [], links: [] }
    })
    const app = createApp({
      store,
      auth: AUTH,
      secureCookies: false,
      neo4jGraphRunner: runner,
      neo4jProducts: null,
    })
    const agent = request.agent(app)
    await agent.post('/api/session/login').send({
      user: AUTH.user,
      password: AUTH.password,
    })
    const res = await agent
      .post('/api/neo4j/graph')
      .send({ cypher: 'MATCH (n) DELETE n' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/read-only/i)
  })

  it('returns graph payload from runner', async () => {
    const runner = vi.fn().mockResolvedValue({
      nodes: [{ id: 'n1', label: 'A', labels: ['Company'], properties: {} }],
      links: [],
    })
    const app = createApp({
      store,
      auth: AUTH,
      secureCookies: false,
      neo4jGraphRunner: runner,
      neo4jProducts: null,
    })
    const agent = request.agent(app)
    await agent.post('/api/session/login').send({
      user: AUTH.user,
      password: AUTH.password,
    })
    const res = await agent
      .post('/api/neo4j/graph')
      .send({ cypher: 'MATCH (n) RETURN n LIMIT 5' })
    expect(res.status).toBe(200)
    expect(res.body.nodes).toHaveLength(1)
    expect(runner).toHaveBeenCalledWith('MATCH (n) RETURN n LIMIT 5')
  })
})

describe('GET /api/neo4j/products', () => {
  const store = new LocalFsStore(FIXTURE)

  it('returns product summaries from injected API', async () => {
    const neo4jProducts = {
      list: vi.fn().mockResolvedValue([
        {
          id: 'prod-crm',
          name: 'CRM',
          slug: 'crm',
          featureCount: 0,
          integrationCount: 0,
        },
      ]),
      graph: vi.fn(),
    }
    const app = createApp({
      store,
      auth: AUTH,
      secureCookies: false,
      neo4jGraphRunner: null,
      neo4jProducts,
    })
    const agent = request.agent(app)
    await agent.post('/api/session/login').send({
      user: AUTH.user,
      password: AUTH.password,
    })
    const res = await agent.get('/api/neo4j/products')
    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(1)
    expect(res.body.products[0].slug).toBe('crm')
  })

  it('returns 400 for invalid slug on product graph', async () => {
    const neo4jProducts = {
      list: vi.fn(),
      graph: vi.fn(async (slug: string) => {
        const { assertProductSlug: guard } = await import('../server/neo4j-products')
        guard(slug)
        return {
          product: {
            id: 'x',
            name: 'x',
            slug,
            featureCount: 0,
            integrationCount: 0,
          },
          graph: { nodes: [], links: [] },
        }
      }),
    }
    const app = createApp({
      store,
      auth: AUTH,
      secureCookies: false,
      neo4jGraphRunner: null,
      neo4jProducts,
    })
    const agent = request.agent(app)
    await agent.post('/api/session/login').send({
      user: AUTH.user,
      password: AUTH.password,
    })
    const res = await agent.get('/api/neo4j/products/Bad_Slug/graph')
    expect(res.status).toBe(400)
  })

  it('returns product neighborhood graph', async () => {
    const neo4jProducts = {
      list: vi.fn(),
      graph: vi.fn().mockResolvedValue({
        product: {
          id: 'prod-neo4j-browser',
          name: 'Neo4j Browser',
          slug: 'neo4j-browser',
          featureCount: 2,
          integrationCount: 1,
        },
        graph: {
          nodes: [
            {
              id: 'n1',
              label: 'Neo4j Browser',
              labels: ['Product'],
              properties: { slug: 'neo4j-browser' },
            },
          ],
          links: [],
        },
      }),
    }
    const app = createApp({
      store,
      auth: AUTH,
      secureCookies: false,
      neo4jGraphRunner: null,
      neo4jProducts,
    })
    const agent = request.agent(app)
    await agent.post('/api/session/login').send({
      user: AUTH.user,
      password: AUTH.password,
    })
    const res = await agent.get('/api/neo4j/products/neo4j-browser/graph')
    expect(res.status).toBe(200)
    expect(res.body.product.slug).toBe('neo4j-browser')
    expect(res.body.graph.nodes).toHaveLength(1)
    expect(neo4jProducts.graph).toHaveBeenCalledWith('neo4j-browser')
  })
})
