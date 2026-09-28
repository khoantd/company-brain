import neo4j, {
  type Driver,
  type Integer,
  isInt,
  isNode,
  isPath,
  isRelationship,
  type Node,
  type Path,
  type Relationship,
} from 'neo4j-driver'

const MAX_NODES = 500
const MAX_LINKS = 1000

const WRITE_PATTERN =
  /\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|LOAD\s+CSV|CALL\s*\{)\b/i

export type Neo4jConfig = {
  uri: string
  username: string
  password: string
  database?: string
}

export type GraphNode = {
  id: string
  label: string
  labels: string[]
  properties: Record<string, unknown>
}

export type GraphLink = {
  id: string
  source: string
  target: string
  type: string
  properties: Record<string, unknown>
}

export type GraphPayload = {
  nodes: GraphNode[]
  links: GraphLink[]
}

export type GraphQueryRunner = (
  cypher: string,
  params?: Record<string, unknown>,
) => Promise<GraphPayload>

export class Neo4jGraphError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code = 'NEO4J_ERROR') {
    super(message)
    this.name = 'Neo4jGraphError'
    this.status = status
    this.code = code
  }
}

let sharedDriver: Driver | null = null
let sharedConfigKey: string | null = null

export function loadNeo4jConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Neo4jConfig | null {
  const uri = (env.NEO4J_URI?.trim() || env.NEO4J_DBMS?.trim() || '').replace(/\/$/, '')
  const username = env.NEO4J_USERNAME?.trim() || env.NEO4J_USER?.trim() || ''
  const password = env.NEO4J_PASSWORD?.trim() || ''
  if (!uri || !username || !password) return null

  const database = env.NEO4J_DATABASE?.trim() || undefined
  return { uri, username, password, database }
}

export function assertReadOnlyCypher(cypher: string): void {
  const trimmed = cypher.trim()
  if (!trimmed) {
    throw new Neo4jGraphError('Cypher query is required', 400, 'EMPTY_CYPHER')
  }
  if (WRITE_PATTERN.test(trimmed)) {
    throw new Neo4jGraphError(
      'Only read-only Cypher is allowed (MATCH / RETURN / WITH / …)',
      400,
      'WRITE_NOT_ALLOWED',
    )
  }
}

export function toPlainValue(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (isInt(value)) return (value as Integer).toNumber()
  if (Array.isArray(value)) return value.map(toPlainValue)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toPlainValue(v)
    }
    return out
  }
  return value
}

function nodeElementId(node: Node): string {
  return node.elementId || String(node.identity)
}

function relElementId(rel: Relationship): string {
  return rel.elementId || String(rel.identity)
}

function displayLabel(labels: string[], properties: Record<string, unknown>): string {
  const name = properties.name
  if (typeof name === 'string' && name.trim()) return name
  const id = properties.id
  if (typeof id === 'string' && id.trim()) return id
  const slug = properties.slug
  if (typeof slug === 'string' && slug.trim()) return slug
  return labels[0] ?? 'Node'
}

export function collectGraphFromRecords(
  records: Array<{ keys: string[]; get: (key: string) => unknown }>,
): GraphPayload {
  const nodes = new Map<string, GraphNode>()
  const links = new Map<string, GraphLink>()

  const addNode = (node: Node) => {
    if (nodes.size >= MAX_NODES && !nodes.has(nodeElementId(node))) return
    const id = nodeElementId(node)
    if (nodes.has(id)) return
    const properties = toPlainValue(node.properties) as Record<string, unknown>
    nodes.set(id, {
      id,
      labels: [...node.labels],
      label: displayLabel(node.labels, properties),
      properties,
    })
  }

  const addRel = (rel: Relationship) => {
    if (links.size >= MAX_LINKS && !links.has(relElementId(rel))) return
    const id = relElementId(rel)
    if (links.has(id)) return
    const source = rel.startNodeElementId || String(rel.start)
    const target = rel.endNodeElementId || String(rel.end)
    links.set(id, {
      id,
      source,
      target,
      type: rel.type,
      properties: toPlainValue(rel.properties) as Record<string, unknown>,
    })
  }

  const walk = (value: unknown) => {
    if (value === null || value === undefined) return
    if (isNode(value)) {
      addNode(value)
      return
    }
    if (isRelationship(value)) {
      addRel(value)
      return
    }
    if (isPath(value)) {
      const path = value as Path
      for (const seg of path.segments) {
        addNode(seg.start)
        addNode(seg.end)
        addRel(seg.relationship)
      }
      if (path.segments.length === 0 && path.start) addNode(path.start)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
  }

  for (const record of records) {
    for (const key of record.keys) {
      walk(record.get(key))
    }
  }

  // Drop dangling links whose endpoints were truncated
  const nodeIds = new Set(nodes.keys())
  const prunedLinks = [...links.values()].filter(
    (l) => nodeIds.has(l.source) && nodeIds.has(l.target),
  )

  return { nodes: [...nodes.values()], links: prunedLinks }
}

export function getNeo4jDriver(config: Neo4jConfig): Driver {
  const key = `${config.uri}|${config.username}|${config.database ?? ''}`
  if (sharedDriver && sharedConfigKey === key) return sharedDriver
  if (sharedDriver) {
    void sharedDriver.close().catch(() => undefined)
  }
  sharedDriver = neo4j.driver(config.uri, neo4j.auth.basic(config.username, config.password))
  sharedConfigKey = key
  return sharedDriver
}

/** Close the shared Bolt driver so the process can exit (tsx watch / SIGTERM). */
export async function closeNeo4jDriver(): Promise<void> {
  if (!sharedDriver) return
  const driver = sharedDriver
  sharedDriver = null
  sharedConfigKey = null
  await driver.close()
}

export function createNeo4jGraphRunner(config: Neo4jConfig): GraphQueryRunner {
  const driver = getNeo4jDriver(config)
  return async (cypher: string, params: Record<string, unknown> = {}) => {
    assertReadOnlyCypher(cypher)
    const session = driver.session(
      config.database ? { database: config.database } : undefined,
    )
    try {
      const result = await session.executeRead((tx) => tx.run(cypher, params))
      return collectGraphFromRecords(result.records)
    } catch (error) {
      if (error instanceof Neo4jGraphError) throw error
      const message = error instanceof Error ? error.message : 'Neo4j query failed'
      throw new Neo4jGraphError(message, 502, 'QUERY_FAILED')
    } finally {
      await session.close()
    }
  }
}
