import { useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useState, type ReactNode } from 'react'
import { ApiError, api } from './api'
import { FileTree } from './components/FileTree'
import { productNeighborhoodExploreCypher } from './components/graph/product-cypher'
import { LoginView } from './components/LoginView'
import { Sidebar } from './components/shell/Sidebar'
import type { HtmlLayoutMode } from './lib/html-layout'
import type { AppView } from './lib/nav'
import { isKnowledgeGraphView } from './lib/nav'
import { cn } from './lib/utils'

const CommandCenter = lazy(() =>
  import('./components/command/CommandCenter').then((m) => ({ default: m.CommandCenter })),
)
const CompanyDashboard = lazy(() =>
  import('./components/company/CompanyDashboard').then((m) => ({ default: m.CompanyDashboard })),
)
const DomainDashboardView = lazy(() =>
  import('./components/domain/DomainDashboard').then((m) => ({ default: m.DomainDashboardView })),
)
const DocumentView = lazy(() =>
  import('./components/DocumentView').then((m) => ({ default: m.DocumentView })),
)
const KnowledgeGraphExploreView = lazy(() =>
  import('./components/graph/KnowledgeGraphView').then((m) => ({
    default: m.KnowledgeGraphExploreView,
  })),
)
const ProductGraphIndex = lazy(() =>
  import('./components/graph/ProductGraphIndex').then((m) => ({ default: m.ProductGraphIndex })),
)
const ProductGraphView = lazy(() =>
  import('./components/graph/ProductGraphView').then((m) => ({ default: m.ProductGraphView })),
)

function ViewFallback({ label = 'Loading…' }: { label?: string }) {
  return <p className="p-6 text-sm text-ink/50">{label}</p>
}

function Suspended({ children, label }: { children: ReactNode; label?: string }) {
  return <Suspense fallback={<ViewFallback label={label} />}>{children}</Suspense>
}

export default function App() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<AppView>({ kind: 'command' })
  const [selectedPath, setSelectedPath] = useState<string>()
  const [mobilePane, setMobilePane] = useState<'nav' | 'main'>('main')
  const [docDirty, setDocDirty] = useState(false)
  const [htmlLayout, setHtmlLayout] = useState<HtmlLayoutMode>('normal')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const authQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: api.me,
    retry: false,
  })
  const authenticated = Boolean(authQuery.data?.user)

  const overviewQuery = useQuery({
    queryKey: ['overview'],
    queryFn: api.overview,
    enabled: authenticated,
  })
  const companyQuery = useQuery({
    queryKey: ['company'],
    queryFn: api.company,
    enabled: authenticated && view.kind === 'company',
  })
  const domainQuery = useQuery({
    queryKey: ['domain', view.kind === 'dashboard' ? view.prefix : ''],
    queryFn: () => api.domain(view.kind === 'dashboard' ? view.prefix : ''),
    enabled: authenticated && view.kind === 'dashboard',
  })

  const confirmLeaveDoc = useCallback(() => {
    if (!docDirty) return true
    return window.confirm('Discard unsaved changes?')
  }, [docDirty])

  const handleHtmlLayoutChange = useCallback((layout: HtmlLayoutMode) => {
    setHtmlLayout(layout)
    setSidebarCollapsed(layout === 'expanded')
  }, [])

  function navigate(next: AppView) {
    if (!confirmLeaveDoc()) return
    setView(next)
    setSelectedPath(undefined)
    setDocDirty(false)
    setMobilePane('main')
  }

  function selectPath(path: string | undefined) {
    if (path === selectedPath) return
    if (!confirmLeaveDoc()) return
    setSelectedPath(path)
    setDocDirty(false)
  }

  function openPath(path: string) {
    const leaf = path.split('/').pop() ?? ''
    const looksLikeFile = /\.[a-z0-9]+$/i.test(leaf)

    const domainHit = overviewQuery.data?.domains.find((d) => d.prefix === path)
    if (domainHit) {
      openDomain(domainHit.prefix, domainHit.label)
      return
    }

    // Directory paths → domain browse, no document
    if (!looksLikeFile) {
      if (!confirmLeaveDoc()) return
      const label =
        path === '01-COMPANY/team'
          ? 'Team'
          : path.startsWith('01-COMPANY/')
            ? path.split('/').pop()?.replace(/^\w/, (c) => c.toUpperCase()) ?? 'Company'
            : overviewQuery.data?.domains.find((d) => d.prefix === path.split('/')[0])?.label ??
              path.replace(/^\d+-/, '')
      setView({ kind: 'domain', prefix: path, label })
      setSelectedPath(undefined)
      setDocDirty(false)
      setMobilePane('main')
      return
    }

    if (!confirmLeaveDoc()) return

    if (path.startsWith('01-COMPANY/team')) {
      setView({ kind: 'domain', prefix: '01-COMPANY/team', label: 'Team' })
    } else if (path.startsWith('01-COMPANY')) {
      setView({ kind: 'domain', prefix: '01-COMPANY', label: 'Company' })
    } else {
      const top = path.split('/')[0]
      if (top) {
        const label =
          overviewQuery.data?.domains.find((d) => d.prefix === top)?.label ??
          top.replace(/^\d+-/, '')
        setView({ kind: 'domain', prefix: top, label })
      } else {
        setView({ kind: 'browse' })
      }
    }
    setSelectedPath(path)
    setDocDirty(false)
    setMobilePane('main')
  }

  function openDomain(prefix: string, label: string) {
    if (!confirmLeaveDoc()) return
    setView({ kind: 'domain', prefix, label })
    setSelectedPath(undefined)
    setDocDirty(false)
    setMobilePane('main')
  }

  /** Command-center scorecards open dashboards (Company stays specialized). */
  function openDomainDashboard(prefix: string, label: string) {
    if (!confirmLeaveDoc()) return
    if (prefix === '01-COMPANY') {
      setView({ kind: 'company' })
    } else {
      setView({ kind: 'dashboard', prefix, label })
    }
    setSelectedPath(undefined)
    setDocDirty(false)
    setMobilePane('main')
  }

  const showSplit = view.kind === 'domain' || view.kind === 'browse'
  const companyName = overviewQuery.data?.company.operatingName ?? 'Royal Solution'
  const gapCount = overviewQuery.data?.gaps.length ?? 0
  const hideFileTree = htmlLayout === 'expanded'
  const htmlExpanded = htmlLayout === 'expanded'

  const mobileTitle =
    view.kind === 'command'
      ? 'Command center'
      : view.kind === 'company'
        ? 'Company'
        : isKnowledgeGraphView(view)
          ? view.kind === 'neo4j-product'
            ? view.slug
            : view.kind === 'neo4j-explore'
              ? 'Custom Cypher'
              : 'Knowledge graph'
          : view.kind === 'browse'
            ? 'Browse all'
            : view.kind === 'dashboard' || view.kind === 'domain'
              ? view.label
              : 'Viewer'

  if (authQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas text-sm text-ink/50">
        Checking session…
      </div>
    )
  }

  if (!authenticated) {
    const authError =
      authQuery.error instanceof ApiError && authQuery.error.status !== 401
        ? authQuery.error.message
        : undefined
    return (
      <>
        {authError && (
          <p className="bg-coral/10 px-4 py-2 text-center text-sm text-coral">{authError}</p>
        )}
        <LoginView
          onSuccess={(user) => {
            queryClient.setQueryData(['auth', 'me'], { user })
          }}
        />
      </>
    )
  }

  async function handleLogout() {
    try {
      await api.logout()
    } finally {
      queryClient.clear()
    }
  }

  return (
    <div className="flex h-dvh bg-canvas text-ink">
      <div
        className={cn(
          'shrink-0',
          sidebarCollapsed
            ? 'hidden w-11 lg:block'
            : cn('w-[min(100%,280px)]', mobilePane === 'nav' ? 'block' : 'hidden lg:block'),
        )}
      >
        <Sidebar
          view={view}
          onNavigate={navigate}
          companyName={companyName}
          gapCount={gapCount}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          user={authQuery.data?.user}
          onLogout={() => void handleLogout()}
        />
      </div>

      <div className={`min-w-0 flex-1 flex-col ${mobilePane === 'main' ? 'flex' : 'hidden lg:flex'}`}>
        <header className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-2.5 lg:hidden">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-sm"
            onClick={() => setMobilePane('nav')}
          >
            Views
          </button>
          <p className="font-display text-base text-ink">{mobileTitle}</p>
          <span className="w-14" />
        </header>

        {view.kind === 'command' && (
          <main className="min-h-0 flex-1 overflow-auto">
            {overviewQuery.isLoading && <p className="p-6 text-sm text-ink/50">Loading overview…</p>}
            {overviewQuery.error && (
              <p className="p-6 text-sm text-coral">{(overviewQuery.error as Error).message}</p>
            )}
            {overviewQuery.data && (
              <Suspended label="Loading command center…">
                <CommandCenter
                  overview={overviewQuery.data}
                  onOpenPath={openPath}
                  onOpenDomain={openDomainDashboard}
                />
              </Suspended>
            )}
          </main>
        )}

        {view.kind === 'company' && (
          <main className="min-h-0 flex-1 overflow-auto">
            {companyQuery.isLoading && <p className="p-6 text-sm text-ink/50">Loading company…</p>}
            {companyQuery.error && (
              <p className="p-6 text-sm text-coral">{(companyQuery.error as Error).message}</p>
            )}
            {companyQuery.data && (
              <Suspended label="Loading company…">
                <CompanyDashboard
                  dashboard={companyQuery.data}
                  onOpenPath={openPath}
                  onBrowseFiles={() => openDomain('01-COMPANY', 'Company')}
                />
              </Suspended>
            )}
          </main>
        )}

        {view.kind === 'neo4j' && (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Suspended label="Loading knowledge graph…">
              <ProductGraphIndex
                onOpenProduct={(slug) => navigate({ kind: 'neo4j-product', slug })}
                onExplore={() => navigate({ kind: 'neo4j-explore' })}
              />
            </Suspended>
          </main>
        )}

        {view.kind === 'neo4j-product' && (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Suspended label="Loading product graph…">
              <ProductGraphView
                slug={view.slug}
                onBack={() => navigate({ kind: 'neo4j' })}
                onExplore={() =>
                  navigate({ kind: 'neo4j-explore', productSlug: view.slug })
                }
              />
            </Suspended>
          </main>
        )}

        {view.kind === 'neo4j-explore' && (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Suspended label="Loading Cypher explorer…">
              <KnowledgeGraphExploreView
                key={view.productSlug ?? 'default'}
                initialCypher={
                  view.productSlug
                    ? productNeighborhoodExploreCypher(view.productSlug)
                    : undefined
                }
                onBack={() => navigate({ kind: 'neo4j' })}
              />
            </Suspended>
          </main>
        )}

        {view.kind === 'dashboard' && (
          <main className="min-h-0 flex-1 overflow-auto">
            {domainQuery.isLoading && <p className="p-6 text-sm text-ink/50">Loading {view.label}…</p>}
            {domainQuery.error && (
              <p className="p-6 text-sm text-coral">{(domainQuery.error as Error).message}</p>
            )}
            {domainQuery.data && (
              <Suspended label={`Loading ${view.label}…`}>
                <DomainDashboardView
                  dashboard={domainQuery.data}
                  onOpenPath={openPath}
                  onBrowseFiles={() => openDomain(view.prefix, view.label)}
                />
              </Suspended>
            )}
          </main>
        )}

        {showSplit && (
          <div
            className={cn(
              'grid min-h-0 flex-1',
              hideFileTree ? 'grid-cols-1' : 'lg:grid-cols-[minmax(220px,280px)_1fr]',
            )}
          >
            <div
              className={cn(
                'min-h-0',
                hideFileTree
                  ? 'hidden'
                  : selectedPath
                    ? 'hidden lg:block'
                    : 'block',
              )}
            >
              <FileTree
                selectedPath={selectedPath}
                onSelect={(path) => selectPath(path)}
                rootPrefix={view.kind === 'domain' ? view.prefix : undefined}
                title={view.kind === 'domain' ? view.label : 'All folders'}
                subtitle={view.kind === 'domain' ? 'Domain' : 'Browse'}
              />
            </div>
            <main
              className={cn(
                'min-h-0',
                selectedPath ? 'flex flex-col' : 'hidden lg:flex lg:flex-col',
                htmlExpanded ? 'overflow-hidden' : 'overflow-auto',
              )}
            >
              {selectedPath && (
                <div className="shrink-0 border-b border-line bg-paper px-4 py-2 lg:hidden">
                  <button
                    type="button"
                    className="cursor-pointer text-sm text-teal"
                    onClick={() => selectPath(undefined)}
                  >
                    ← Files
                  </button>
                </div>
              )}
              <div className={cn('min-h-0', htmlExpanded ? 'flex flex-1 flex-col' : undefined)}>
                <Suspended label="Loading document…">
                  <DocumentView
                    key={selectedPath ?? 'none'}
                    path={selectedPath}
                    onDirtyChange={setDocDirty}
                    onHtmlLayoutChange={handleHtmlLayoutChange}
                  />
                </Suspended>
              </div>
            </main>
          </div>
        )}

        <footer className="shrink-0 border-t border-line bg-sidebar px-4 py-2 text-xs text-paper/70">
          Company Brain viewer · authenticated · edit saves to MinIO
        </footer>
      </div>
    </div>
  )
}
