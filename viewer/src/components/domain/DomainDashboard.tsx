import type { DomainDashboard, DomainStatus } from '../../api'
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

export function DomainDashboardView({
  dashboard,
  onOpenPath,
  onBrowseFiles,
}: {
  dashboard: DomainDashboard
  onOpenPath: (path: string) => void
  onBrowseFiles: () => void
}) {
  const { prefix, label, summary, canonical, areas, records, gaps } = dashboard
  const progressPct = Math.round(summary.progress * 100)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-7 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
            Operating view · {prefix}
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight text-ink">{label}</h2>
          <p className="mt-1 text-sm text-ink/55">
            {summary.fileCount} file{summary.fileCount === 1 ? '' : 's'} · {statusLabel(summary.status)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors duration-200 hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            onClick={onBrowseFiles}
          >
            Browse files
          </button>
          {canonical && (
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors duration-200 hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              onClick={() => onOpenPath(canonical.path)}
            >
              Open {canonical.path.split('/').pop()}
            </button>
          )}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_0_rgba(21,32,51,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
            {canonical ? 'Canonical record' : 'Domain summary'}
          </p>
          {canonical && canonical.fields.length > 0 ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {canonical.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-ink/40">{field.label}</dt>
                  <dd className="mt-1 font-display text-lg leading-snug text-ink">{field.value || '—'}</dd>
                </div>
              ))}
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-ink/40">Status</dt>
                <dd className="mt-1 font-display text-lg leading-snug text-ink">{canonical.status}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ink/60">
              {records.length > 0
                ? `${records.length} named record${records.length === 1 ? '' : 's'} under this folder.`
                : 'Coverage is derived from files in this folder. Open Browse files to inspect records.'}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Coverage</p>
          <p className="mt-3 font-display text-3xl tabular-nums text-ink">{progressPct}%</p>
          <p className="mt-1 text-xs text-ink/50">{statusLabel(summary.status)}</p>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-mist"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} coverage`}
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-300',
                barClass(summary.status),
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </section>

      {areas.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Areas</p>
              <h3 className="font-display text-xl text-ink">Tree coverage</h3>
            </div>
            <p className="text-xs text-ink/45">From files under {prefix}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                className="cursor-pointer rounded-2xl border border-line bg-paper p-4 text-left transition-colors duration-200 hover:bg-mist/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                onClick={() => onOpenPath(area.path)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{area.label}</p>
                    <p className="mt-0.5 text-sm text-ink/50">
                      {area.fileCount} file{area.fileCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      statusClass(area.status),
                    )}
                  >
                    {statusLabel(area.status)}
                  </span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-mist">
                  <div
                    className={cn('h-full rounded-full transition-[width] duration-300', barClass(area.status))}
                    style={{ width: `${Math.round(area.progress * 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_280px]">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-end justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Records</p>
              <h3 className="font-display text-lg text-ink">Named entries</h3>
            </div>
            <p className="text-xs text-ink/45">{records.length}</p>
          </div>
          {records.length === 0 ? (
            <p className="px-1 text-sm text-ink/50">No named records yet — folder may still be a starter.</p>
          ) : (
            <ul className="space-y-1">
              {records.map((record) => (
                <li key={record.path}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-200 hover:bg-mist/80"
                    onClick={() => onOpenPath(record.path)}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{record.name}</span>
                      <span className="block text-xs text-ink/50 line-clamp-2">{record.detail}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        /unknown|unverified|starter|empty/i.test(record.status)
                          ? 'border-ahead/30 bg-ahead/10 text-ahead'
                          : 'border-track/30 bg-track/10 text-track',
                      )}
                    >
                      {record.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Attention</p>
            <span className="text-[11px] tabular-nums text-ink/45">{gaps.length}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {gaps.length === 0 && <li className="text-sm text-ink/50">No gaps detected.</li>}
            {gaps.map((gap) => (
              <li key={gap.label}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-left transition-colors duration-200 hover:bg-mist/80"
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
    </div>
  )
}
