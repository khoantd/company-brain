export type AppView =
  | { kind: 'command' }
  | { kind: 'company' }
  | { kind: 'neo4j' }
  | { kind: 'neo4j-product'; slug: string }
  | { kind: 'neo4j-explore'; productSlug?: string }
  | { kind: 'dashboard'; prefix: string; label: string }
  | { kind: 'domain'; prefix: string; label: string }
  | { kind: 'browse' }

export const OPERATING_VIEWS: Array<{
  id: string
  label: string
  view: AppView
}> = [
  { id: 'command', label: 'Command center', view: { kind: 'command' } },
  { id: 'company', label: 'Company', view: { kind: 'company' } },
  { id: 'graph', label: 'Knowledge graph', view: { kind: 'neo4j' } },
  { id: 'brand', label: 'Brand', view: { kind: 'dashboard', prefix: '03-BRAND', label: 'Brand' } },
  {
    id: 'products',
    label: 'Products',
    view: { kind: 'dashboard', prefix: '04-PRODUCTS', label: 'Products' },
  },
  {
    id: 'projects',
    label: 'Projects',
    view: { kind: 'dashboard', prefix: '05-PROJECTS', label: 'Projects' },
  },
  {
    id: 'team',
    label: 'Team',
    view: { kind: 'dashboard', prefix: '01-COMPANY/team', label: 'Team' },
  },
  {
    id: 'departments',
    label: 'Departments',
    view: { kind: 'dashboard', prefix: '02-DEPARTMENTS', label: 'Departments' },
  },
  {
    id: 'research',
    label: 'Research',
    view: { kind: 'dashboard', prefix: '06-RESEARCH', label: 'Research' },
  },
  {
    id: 'content',
    label: 'Content',
    view: { kind: 'dashboard', prefix: '07-CONTENT', label: 'Content' },
  },
  {
    id: 'references',
    label: 'References',
    view: { kind: 'dashboard', prefix: '08-REFERENCES', label: 'References' },
  },
  {
    id: 'assets',
    label: 'Assets',
    view: { kind: 'dashboard', prefix: '09-ASSETS', label: 'Assets' },
  },
  {
    id: 'outputs',
    label: 'Outputs',
    view: { kind: 'dashboard', prefix: '10-OUTPUTS', label: 'Outputs' },
  },
  { id: 'browse', label: 'Browse all', view: { kind: 'browse' } },
]

export function viewEquals(a: AppView, b: AppView): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'domain' && b.kind === 'domain') return a.prefix === b.prefix
  if (a.kind === 'dashboard' && b.kind === 'dashboard') return a.prefix === b.prefix
  if (a.kind === 'neo4j-product' && b.kind === 'neo4j-product') return a.slug === b.slug
  if (a.kind === 'neo4j-explore' && b.kind === 'neo4j-explore') {
    return (a.productSlug ?? undefined) === (b.productSlug ?? undefined)
  }
  return true
}

/** Sidebar treats all knowledge-graph subviews as the Knowledge graph item. */
export function isKnowledgeGraphView(view: AppView): boolean {
  return view.kind === 'neo4j' || view.kind === 'neo4j-product' || view.kind === 'neo4j-explore'
}
