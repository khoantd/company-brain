export type TreeNode = {
  name: string
  path: string
  type: 'dir' | 'file'
  children?: TreeNode[]
}

export type BrainFile = {
  path: string
  kind: 'markdown' | 'text' | 'binary'
  content?: string
  frontmatter?: Record<string, unknown>
  size: number
}

export type DomainStatus = 'populated' | 'starter' | 'empty'

export type BrainOverview = {
  company: {
    operatingName: string
    website: string
    businessModel: string
    status: string
    path: string
  }
  domains: Array<{
    prefix: string
    label: string
    fileCount: number
    status: DomainStatus
    progress: number
  }>
  products: Array<{
    name: string
    status: string
    lifecycle: string
    owner: string
    path: string
  }>
  team: Array<{
    name: string
    role: string
    status: string
    path: string
  }>
  activity: Array<{
    title: string
    summary: string
    sourcePath: string
  }>
  gaps: Array<{
    label: string
    detail: string
    path?: string
    severity: 'high' | 'medium'
  }>
}

export type CompanyDashboard = {
  identity: {
    operatingName: string
    legalName: string
    website: string
    businessModel: string
    whatItDoes: string
    governance: string
    stage: string
    status: string
    path: string
  }
  completeness: {
    claimed: number
    verified: number
    unverified: number
    progress: number
  }
  areas: Array<{
    id: string
    label: string
    path: string
    fileCount: number
    status: DomainStatus
    progress: number
  }>
  audience: {
    primary: string
    status: string
    path: string
  }
  strategy: {
    direction: string
    status: string
    path: string
  }
  team: Array<{
    name: string
    role: string
    status: string
    path: string
  }>
  activity: Array<{
    title: string
    summary: string
    sourcePath: string
  }>
  gaps: Array<{
    label: string
    detail: string
    path?: string
    severity: 'high' | 'medium'
  }>
}

export type DomainDashboard = {
  prefix: string
  label: string
  summary: {
    status: DomainStatus
    fileCount: number
    progress: number
  }
  canonical?: {
    path: string
    status: string
    fields: Array<{ label: string; value: string }>
  }
  areas: Array<{
    id: string
    label: string
    path: string
    fileCount: number
    status: DomainStatus
    progress: number
  }>
  records: Array<{
    name: string
    status: string
    path: string
    detail: string
  }>
  gaps: Array<{
    label: string
    detail: string
    path?: string
    severity: 'high' | 'medium'
  }>
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status)
  }
  return data
}

export const api = {
  me: () => request<{ user: string }>('/api/session/me'),
  login: (user: string, password: string) =>
    request<{ user: string }>('/api/session/login', {
      method: 'POST',
      body: JSON.stringify({ user, password }),
    }),
  logout: () =>
    request<{ ok: boolean }>('/api/session/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  tree: () => request<{ tree: TreeNode[] }>('/api/tree'),
  file: (path: string) => request<BrainFile>(`/api/file?path=${encodeURIComponent(path)}`),
  saveFile: (path: string, content: string) =>
    request<BrainFile>('/api/file', {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    }),
  uploadFile: (path: string, content: string) =>
    request<BrainFile>('/api/file/upload', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    }),
  updateFileStatus: (path: string, status: string, approvedBy?: string) =>
    request<BrainFile>('/api/file/status', {
      method: 'PATCH',
      body: JSON.stringify({
        path,
        status,
        ...(approvedBy !== undefined ? { approved_by: approvedBy } : {}),
      }),
    }),
  overview: () => request<BrainOverview>('/api/overview'),
  company: () => request<CompanyDashboard>('/api/company'),
  domain: (prefix: string) =>
    request<DomainDashboard>(`/api/domain?prefix=${encodeURIComponent(prefix)}`),
  neo4jGraph: (cypher: string) =>
    request<GraphPayload>('/api/neo4j/graph', {
      method: 'POST',
      body: JSON.stringify({ cypher }),
    }),
  neo4jProducts: () => request<{ products: Neo4jProductSummary[] }>('/api/neo4j/products'),
  neo4jProductGraph: (slug: string) =>
    request<Neo4jProductGraphResult>(`/api/neo4j/products/${encodeURIComponent(slug)}/graph`),
}

export type Neo4jProductSummary = {
  id: string
  name: string
  slug: string
  featureCount: number
  integrationCount: number
}

export type Neo4jProductGraphResult = {
  product: Neo4jProductSummary
  graph: GraphPayload
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
