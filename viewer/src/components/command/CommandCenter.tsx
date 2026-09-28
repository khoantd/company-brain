import type { BrainOverview, DomainStatus } from '../../api'
import { cn } from '../../lib/utils'

function statusLabel(status: DomainStatus): string {
  if (status === 'populated') return 'On track'
  if (status === 'starter') return 'Starter'
  return 'Empty'
}

function statusClass(status: DomainStatus): string {
  if (status === 'populated') return 'border-track/30 bg-track/10 text-track'
  if (status === 'starter') return 'border-ahead/30 bg-ahead/10 text-ahead'
  return 'border-coral/30 bg-coral/10 text-coral'
}

function barClass(status: DomainStatus): string {
  if (status === 'populated') return 'bg-track'
  if (status === 'starter') return 'bg-ahead'
  return 'bg-coral'
}

export function CommandCenter({
  overview,
  onOpenPath,
  onOpenDomain,
}: {
  overview: BrainOverview
  onOpenPath: (path: string) => void
  onOpenDomain: (prefix: string, label: string) => void
}) {
  const { company, domains, products, team, activity, gaps } = overview
  const scorecard = domains.filter((d) =>
    ['01-COMPANY', '03-BRAND', '04-PRODUCTS', '05-PROJECTS', '06-RESEARCH', '07-CONTENT'].includes(
      d.prefix,
    ),
  )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-7 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
            Management view · local brain
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight text-ink">Command center</h2>
          <p className="mt-1 text-sm text-ink/55">
            {company.operatingName}
            {company.businessModel ? ` · ${company.businessModel}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:bg-mist"
          onClick={() => onOpenPath(company.path)}
        >
          Open COMPANY.md
        </button>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_0_rgba(21,32,51,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
            Company identity
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: 'Operating name', v: company.operatingName || '—' },
              { k: 'Record status', v: company.status || '—' },
              { k: 'Website', v: company.website || '—' },
              { k: 'Business model', v: company.businessModel || '—' },
            ].map((row) => (
              <div key={row.k}>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-ink/40">{row.k}</dt>
                <dd className="mt-1 font-display text-lg leading-snug text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              Attention
            </p>
            <span className="text-[11px] tabular-nums text-ink/45">{gaps.length}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {gaps.length === 0 && (
              <li className="text-sm text-ink/50">No urgent gaps detected.</li>
            )}
            {gaps.slice(0, 5).map((gap) => (
              <li key={gap.label}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-mist/80"
                  onClick={() => gap.path && onOpenPath(gap.path)}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-1.5 shrink-0 rounded-full',
                      gap.severity === 'high' ? 'bg-coral' : 'bg-ahead',
                    )}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{gap.label}</span>
                    <span className="block text-xs text-ink/50">{gap.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              Brain scorecard
            </p>
            <p className="font-display text-xl text-ink">Six operating domains</p>
          </div>
          <p className="text-xs text-ink/45">Completeness of canonical records</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scorecard.map((domain) => (
            <button
              key={domain.prefix}
              type="button"
              className="cursor-pointer rounded-2xl border border-line bg-paper p-4 text-left transition-colors hover:bg-mist/60"
              onClick={() => onOpenDomain(domain.prefix, domain.label)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{domain.label}</p>
                  <p className="mt-0.5 text-sm text-ink/50">
                    {domain.fileCount} file{domain.fileCount === 1 ? '' : 's'}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    statusClass(domain.status),
                  )}
                >
                  {statusLabel(domain.status)}
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-mist">
                <div
                  className={cn('h-full rounded-full transition-[width] duration-300', barClass(domain.status))}
                  style={{ width: `${Math.round(domain.progress * 100)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-end justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
                Products
              </p>
              <p className="font-display text-lg text-ink">Named offerings</p>
            </div>
            <p className="text-xs text-ink/45">{products.length} products</p>
          </div>
          {products.length === 0 ? (
            <p className="px-1 text-sm text-ink/50">No product records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink/40">
                    <th className="px-2 py-2 font-medium">Initiative</th>
                    <th className="px-2 py-2 font-medium">Owner</th>
                    <th className="px-2 py-2 font-medium">Lifecycle</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const atRisk = /unknown/i.test(product.lifecycle)
                    return (
                      <tr key={product.path} className="border-b border-line/70 last:border-0">
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            className="cursor-pointer font-medium text-ink hover:underline"
                            onClick={() => onOpenPath(product.path)}
                          >
                            {product.name}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-ink/60">{product.owner}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-mist">
                              <div
                                className={cn('h-full rounded-full', atRisk ? 'bg-coral' : 'bg-track')}
                                style={{ width: atRisk ? '28%' : '72%' }}
                              />
                            </div>
                            <span className="text-xs text-ink/55">{product.lifecycle}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span
                            className={cn(
                              'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              atRisk
                                ? 'border-coral/30 bg-coral/10 text-coral'
                                : 'border-track/30 bg-track/10 text-track',
                            )}
                          >
                            {atRisk ? 'At risk' : product.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
            Brain pulse
          </p>
          <p className="font-display text-lg text-ink">Core signals</p>
          <ul className="mt-4 space-y-3">
            {[
              { label: 'Team profiles', value: String(team.length) },
              { label: 'Products named', value: String(products.length) },
              {
                label: 'Domains populated',
                value: String(domains.filter((d) => d.status === 'populated').length),
              },
              {
                label: 'Open gaps',
                value: String(gaps.length),
              },
            ].map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-2 last:border-0">
                <span className="text-sm text-ink/60">{row.label}</span>
                <span className="font-display text-xl tabular-nums text-ink">{row.value}</span>
              </li>
            ))}
          </ul>
          {activity.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">
                Recent activity
              </p>
              <ul className="space-y-2">
                {activity.slice(0, 3).map((item) => (
                  <li key={item.title}>
                    <button
                      type="button"
                      className="cursor-pointer text-left transition-colors hover:text-teal"
                      onClick={() => onOpenPath(item.sourcePath)}
                    >
                      <span className="block text-sm font-medium text-ink">{item.title}</span>
                      <span className="block text-xs text-ink/50 line-clamp-2">{item.summary}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
