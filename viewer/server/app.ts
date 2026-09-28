import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  createSessionToken,
  loadAuthConfigFromEnv,
  parseSessionCookie,
  passwordsMatch,
  verifySessionToken,
  type AuthConfig,
  type Session,
} from './auth.js'
import {
  listTree,
  readBrainFile,
  updateBrainFileStatus,
  uploadBrainFile,
  writeBrainFile,
} from './brain.js'
import { buildCompanyDashboard } from './company.js'
import { buildDomainDashboard, DomainPrefixError } from './domain.js'
import {
  createNeo4jGraphRunner,
  loadNeo4jConfigFromEnv,
  Neo4jGraphError,
  type GraphQueryRunner,
} from './neo4j.js'
import {
  createNeo4jProductsApi,
  type Neo4jProductsApi,
} from './neo4j-products.js'
import { buildOverview } from './overview.js'
import { PathAccessError } from './paths.js'
import { createTtlCache } from './response-cache.js'
import type { BrainStore } from './store.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export type CreateAppOptions = {
  store: BrainStore
  auth?: AuthConfig
  corsOrigins?: string[]
  serveStatic?: boolean
  secureCookies?: boolean
  storageLabel?: string
  neo4jGraphRunner?: GraphQueryRunner | null
  neo4jProducts?: Neo4jProductsApi | null
}

declare global {
  namespace Express {
    interface Request {
      session?: Session
    }
  }
}

export function createApp(options: CreateAppOptions): Express {
  const auth = options.auth ?? loadAuthConfigFromEnv()
  const secureCookies =
    options.secureCookies ??
    (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production')
  const corsOrigins =
    options.corsOrigins ??
    parseCorsOrigins(process.env.VIEWER_CORS_ORIGIN) ?? [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
    ]
  const storageLabel =
    options.storageLabel ??
    (process.env.MINIO_BUCKET && process.env.MINIO_ENDPOINT
      ? `minio://${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}`
      : `local:${process.env.BRAIN_ROOT ?? '(default)'}`)
  const neo4jConfig =
    options.neo4jGraphRunner !== undefined || options.neo4jProducts !== undefined
      ? null
      : loadNeo4jConfigFromEnv()
  const neo4jGraphRunner =
    options.neo4jGraphRunner !== undefined
      ? options.neo4jGraphRunner
      : neo4jConfig
        ? createNeo4jGraphRunner(neo4jConfig)
        : null
  const neo4jProducts =
    options.neo4jProducts !== undefined
      ? options.neo4jProducts
      : neo4jConfig
        ? createNeo4jProductsApi(neo4jConfig)
        : null

  const app = express()
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, storage: storageLabel })
  })

  app.post('/api/session/login', (req, res) => {
    const user = typeof req.body?.user === 'string' ? req.body.user : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!user || !password) {
      res.status(400).json({ error: 'Body must include string user and password' })
      return
    }
    if (user !== auth.user || !passwordsMatch(password, auth.password)) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    const token = createSessionToken(user, auth.sessionSecret)
    res.setHeader('Set-Cookie', buildSessionCookie(token, { secure: secureCookies }))
    res.json({ user })
  })

  app.post('/api/session/logout', (_req, res) => {
    res.setHeader('Set-Cookie', buildClearedSessionCookie(secureCookies))
    res.json({ ok: true })
  })

  app.get('/api/session/me', (req, res) => {
    const session = readSession(req, auth)
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    res.json({ user: session.user })
  })

  app.use('/api', (req, res, next) => {
    if (isPublicApiPath(req.path)) {
      next()
      return
    }
    requireSession(req, res, next, auth)
  })

  const { store } = options
  const responseCache = createTtlCache(45_000)

  function invalidateListingCache() {
    responseCache.invalidate('tree', 'overview')
  }

  app.get('/api/tree', async (_req, res) => {
    try {
      const cached = responseCache.get<{ tree: Awaited<ReturnType<typeof listTree>> }>('tree')
      if (cached) {
        res.json(cached)
        return
      }
      const tree = await listTree(store)
      const payload = { tree }
      responseCache.set('tree', payload)
      res.json(payload)
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list tree' })
    }
  })

  app.get('/api/overview', async (_req, res) => {
    try {
      const cached = responseCache.get<Awaited<ReturnType<typeof buildOverview>>>('overview')
      if (cached) {
        res.json(cached)
        return
      }
      const overview = await buildOverview(store)
      responseCache.set('overview', overview)
      res.json(overview)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to build overview',
      })
    }
  })

  app.get('/api/company', async (_req, res) => {
    try {
      const dashboard = await buildCompanyDashboard(store)
      res.json(dashboard)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to build company dashboard',
      })
    }
  })

  app.get('/api/domain', async (req, res) => {
    try {
      const prefix = String(req.query.prefix ?? '')
      const dashboard = await buildDomainDashboard(store, prefix)
      res.json(dashboard)
    } catch (error) {
      if (error instanceof DomainPrefixError) {
        res.status(400).json({ error: error.message })
        return
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to build domain dashboard',
      })
    }
  })

  app.post('/api/neo4j/graph', async (req, res) => {
    if (!neo4jGraphRunner) {
      res.status(503).json({
        error:
          'Neo4j is not configured (set NEO4J_URI or NEO4J_DBMS, NEO4J_USERNAME, NEO4J_PASSWORD)',
      })
      return
    }
    const cypher = typeof req.body?.cypher === 'string' ? req.body.cypher : ''
    try {
      const graph = await neo4jGraphRunner(cypher)
      res.json(graph)
    } catch (error) {
      if (error instanceof Neo4jGraphError) {
        res.status(error.status).json({ error: error.message })
        return
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to run Neo4j query',
      })
    }
  })

  app.get('/api/neo4j/products', async (_req, res) => {
    if (!neo4jProducts) {
      res.status(503).json({
        error:
          'Neo4j is not configured (set NEO4J_URI or NEO4J_DBMS, NEO4J_USERNAME, NEO4J_PASSWORD)',
      })
      return
    }
    try {
      const products = await neo4jProducts.list()
      res.json({ products })
    } catch (error) {
      if (error instanceof Neo4jGraphError) {
        res.status(error.status).json({ error: error.message })
        return
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list Neo4j products',
      })
    }
  })

  app.get('/api/neo4j/products/:slug/graph', async (req, res) => {
    if (!neo4jProducts) {
      res.status(503).json({
        error:
          'Neo4j is not configured (set NEO4J_URI or NEO4J_DBMS, NEO4J_USERNAME, NEO4J_PASSWORD)',
      })
      return
    }
    try {
      const result = await neo4jProducts.graph(String(req.params.slug ?? ''))
      res.json(result)
    } catch (error) {
      if (error instanceof Neo4jGraphError) {
        res.status(error.status).json({ error: error.message })
        return
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load product graph',
      })
    }
  })

  app.get('/api/file', async (req, res) => {
    try {
      const path = String(req.query.path ?? '')
      const file = await readBrainFile(store, path)
      res.json(file)
    } catch (error) {
      const status = error instanceof PathAccessError ? 400 : 500
      res.status(status).json({ error: error instanceof Error ? error.message : 'Failed to read file' })
    }
  })

  app.put('/api/file', async (req, res) => {
    try {
      const path = typeof req.body?.path === 'string' ? req.body.path : ''
      const content = typeof req.body?.content === 'string' ? req.body.content : null
      if (!path || content === null) {
        res.status(400).json({ error: 'Body must include string path and content' })
        return
      }
      const file = await writeBrainFile(store, path, content)
      invalidateListingCache()
      res.json(file)
    } catch (error) {
      const status = error instanceof PathAccessError ? 400 : 500
      res.status(status).json({
        error: error instanceof Error ? error.message : 'Failed to write file',
      })
    }
  })

  app.post('/api/file/upload', async (req, res) => {
    try {
      const path = typeof req.body?.path === 'string' ? req.body.path : ''
      const content = typeof req.body?.content === 'string' ? req.body.content : null
      if (!path || content === null) {
        res.status(400).json({ error: 'Body must include string path and content' })
        return
      }
      const file = await uploadBrainFile(store, path, content)
      invalidateListingCache()
      res.json(file)
    } catch (error) {
      const status = error instanceof PathAccessError ? 400 : 500
      res.status(status).json({
        error: error instanceof Error ? error.message : 'Failed to upload file',
      })
    }
  })

  app.patch('/api/file/status', async (req, res) => {
    try {
      const path = typeof req.body?.path === 'string' ? req.body.path : ''
      const status = typeof req.body?.status === 'string' ? req.body.status : ''
      const approvedBy =
        typeof req.body?.approved_by === 'string' ? req.body.approved_by : undefined
      if (!path || !status) {
        res.status(400).json({ error: 'Body must include string path and status' })
        return
      }
      const file = await updateBrainFileStatus(store, path, status, { approvedBy })
      invalidateListingCache()
      res.json(file)
    } catch (error) {
      const code = error instanceof PathAccessError ? 400 : 500
      res.status(code).json({
        error: error instanceof Error ? error.message : 'Failed to update status',
      })
    }
  })

  if (options.serveStatic) {
    const distDir = resolve(__dirname, '../dist')
    app.use(express.static(distDir))
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(resolve(distDir, 'index.html'))
    })
  }

  return app
}

function isPublicApiPath(path: string): boolean {
  return (
    path === '/health' ||
    path === '/session/login' ||
    path === '/session/logout' ||
    path === '/session/me'
  )
}

function readSession(req: Request, auth: AuthConfig): Session | null {
  const token = parseSessionCookie(req.headers.cookie)
  if (!token) return null
  return verifySessionToken(token, auth.sessionSecret)
}

function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
  auth: AuthConfig,
): void {
  const session = readSession(req, auth)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  req.session = session
  next()
}

function parseCorsOrigins(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
