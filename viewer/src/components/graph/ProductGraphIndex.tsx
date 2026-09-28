import { useQuery } from '@tanstack/react-query'
import { api, type Neo4jProductSummary } from '../../api'
import { cn } from '../../lib/utils'
import {
  buildGraphDashboardStats,
  coverageStatus,
  graphBarClass,
  graphStatusClass,
  graphStatusLabel,
  productNeighborhoodStatus,
  type GraphProductStatus,
} from './graph-dashboard'

export function ProductGraphIndex({
  onOpenProduct,
  onExplore,
}: {
  onOpenProduct: (slug: string) => void
  onExplore: () => void
}) {
  const productsQuery = useQuery({
    queryKey: ['neo4j', 'products'],
    queryFn: api.neo4jProducts,
    retry: 1,
  })

  const products = productsQuery.data?.products ?? []
  const stats = buildGraphDashboardStats(products)
  const progressPct = Math.round(stats.coverage * 100)
  const coverStatus = coverageStatus(stats.coverage)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-7 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
              Operating view · Neo4j
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-tight text-ink">
              Knowledge graph
            </h2>
            <p className="mt-1 text-sm text-ink/55">
              {productsQuery.isLoading
                ? 'Loading products…'
                : productsQuery.error
                  ? 'Could not load products'
                  : `${stats.productCount} product${stats.productCount === 1 ? '' : 's'} · ${graphStatusLabel(coverStatus)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors duration-200 hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              onClick={onExplore}
            >
              Custom Cypher
            </button>
          </div>
        </header>

        {productsQuery.error && (
          <p className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
            {(productsQuery.error as Error).message}
          </p>
        )}

        {!productsQuery.error && (
          <>
            <section className="grid gap-4 lg:grid-cols-[1fr_240px]">
              <div className="rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_0_rgba(21,32,51,0.04)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                  Graph summary
                </p>
                {productsQuery.isLoading ? (
                  <p className="mt-3 text-sm text-ink/50">Loading neighborhood totals…</p>
                ) : (
                  <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.08em] text-ink/40">
                        Products
                      </dt>
                      <dd className="mt-1 font-display text-lg leading-snug text-ink tabular-nums">
                        {stats.productCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.08em] text-ink/40">
                        Features
                      </dt>
                      <dd className="mt-1 font-display text-lg leading-snug text-ink tabular-nums">
                        {stats.featureTotal}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.08em] text-ink/40">
                        Integrations
                      </dt>
                      <dd className="mt-1 font-display text-lg leading-snug text-ink tabular-nums">
                        {stats.integrationTotal}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>

              <div className="rounded-2xl border border-line bg-paper p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                  Neighborhood coverage
                </p>
                <p className="mt-3 font-display text-3xl tabular-nums text-ink">
                  {productsQuery.isLoading ? '—' : `${progressPct}%`}
                </p>
                <p className="mt-1 text-xs text-ink/50">
                  {productsQuery.isLoading
                    ? 'Calculating…'
                    : `${stats.coveredCount} of ${stats.productCount} with features or integrations`}
                </p>
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-mist"
                  role="progressbar"
                  aria-valuenow={productsQuery.isLoading ? 0 : progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Neighborhood coverage"
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-300',
                      graphBarClass(coverStatus),
                    )}
                    style={{ width: productsQuery.isLoading ? '0%' : `${progressPct}%` }}
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                    Products
                  </p>
                  <h3 className="font-display text-xl text-ink">Graph neighborhoods</h3>
                </div>
                <p className="text-xs text-ink/45">From Neo4j Product nodes</p>
              </div>

              {productsQuery.isLoading && (
                <p className="text-sm text-ink/50">Loading products…</p>
              )}
              {!productsQuery.isLoading && products.length === 0 && (
                <p className="rounded-2xl border border-line bg-paper px-4 py-6 text-sm text-ink/50">
                  No Product nodes found in Neo4j.
                </p>
              )}
              {products.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpen={onOpenProduct}
                    />
                  ))}
                </div>
              )}
            </section>

            {!productsQuery.isLoading && products.length > 0 && (
              <section className="grid gap-4 lg:grid-cols-[1.4fr_280px]">
                <div className="rounded-2xl border border-line bg-paper p-4">
                  <div className="mb-3 flex items-end justify-between gap-2 px-1">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                        Records
                      </p>
                      <h3 className="font-display text-lg text-ink">Named products</h3>
                    </div>
                    <p className="text-xs text-ink/45">{products.length}</p>
                  </div>
                  <ul className="space-y-1">
                    {products.map((product) => {
                      const status = productNeighborhoodStatus(product)
                      return (
                        <li key={product.id}>
                          <button
                            type="button"
                            className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-200 hover:bg-mist/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                            onClick={() => onOpenProduct(product.slug)}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-ink">
                                {product.name}
                              </span>
                              <span className="block font-mono text-xs text-ink/50">
                                {product.slug}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                graphStatusClass(status),
                              )}
                            >
                              {graphStatusLabel(status)}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="rounded-2xl border border-line bg-paper p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                      Attention
                    </p>
                    <span className="text-[11px] tabular-nums text-ink/45">
                      {stats.gaps.length}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {stats.gaps.length === 0 && (
                      <li className="text-sm text-ink/50">No neighborhood gaps detected.</li>
                    )}
                    {stats.gaps.map((gap) => (
                      <li key={gap.slug}>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-left transition-colors duration-200 hover:bg-mist/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                          onClick={() => onOpenProduct(gap.slug)}
                        >
                          <span
                            className={cn(
                              'mt-1.5 size-1.5 shrink-0 rounded-full',
                              gap.severity === 'high' ? 'bg-coral' : 'bg-ahead',
                            )}
                            aria-hidden
                          />
                          <span>
                            <span className="block text-sm font-medium text-ink">
                              {gap.label}
                            </span>
                            <span className="block text-xs text-ink/50">{gap.detail}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ProductCard({
  product,
  onOpen,
}: {
  product: Neo4jProductSummary
  onOpen: (slug: string) => void
}) {
  const status: GraphProductStatus = productNeighborhoodStatus(product)
  const progress =
    status === 'populated' ? 1 : status === 'starter' ? 0.5 : 0

  return (
    <button
      type="button"
      className="cursor-pointer rounded-2xl border border-line bg-paper p-4 text-left transition-colors duration-200 hover:bg-mist/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      onClick={() => onOpen(product.slug)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{product.name}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-ink/45">{product.slug}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            graphStatusClass(status),
          )}
        >
          {graphStatusLabel(status)}
        </span>
      </div>
      <p className="mt-3 text-sm text-ink/55">
        {product.featureCount} feature{product.featureCount === 1 ? '' : 's'}
        <span className="mx-1.5 text-ink/25" aria-hidden>
          ·
        </span>
        {product.integrationCount} integration
        {product.integrationCount === 1 ? '' : 's'}
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-mist">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', graphBarClass(status))}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </button>
  )
}
