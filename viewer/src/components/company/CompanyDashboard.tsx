import type { CompanyDashboard, DomainStatus } from '../../api'
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

export function CompanyDashboard({
  dashboard,
  onOpenPath,
  onBrowseFiles,
}: {
  dashboard: CompanyDashboard
  onOpenPath: (path: string) => void
  onBrowseFiles: () => void
}) {
  const { identity, completeness, areas, audience, strategy, team, activity, gaps } = dashboard
  const verifiedPct = Math.round(completeness.progress * 100)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-7 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
            Operating view · 01-COMPANY
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight text-ink">Company</h2>
          <p className="mt-1 text-sm text-ink/55">
            {identity.operatingName}
            {identity.businessModel ? ` · ${identity.businessModel}` : ''}
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
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors duration-200 hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            onClick={() => onOpenPath(identity.path)}
          >
            Open COMPANY.md
          </button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_0_rgba(21,32,51,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Identity</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { k: 'Operating name', v: identity.operatingName || '—' },
              { k: 'Record status', v: identity.status || '—' },
              { k: 'Website', v: identity.website || '—' },
              { k: 'Business model', v: identity.businessModel || '—' },
              { k: 'What it does', v: identity.whatItDoes || '—' },
              { k: 'Governance', v: identity.governance || '—' },
            ].map((row) => (
              <div key={row.k}>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-ink/40">{row.k}</dt>
                <dd className="mt-1 font-display text-lg leading-snug text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
            Record completeness
          </p>
          <p className="mt-3 font-display text-3xl tabular-nums text-ink">{verifiedPct}%</p>
          <p className="mt-1 text-xs text-ink/50">
            {completeness.verified} verified · {completeness.unverified} open of {completeness.claimed}{' '}
            claims
          </p>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-mist"
            role="progressbar"
            aria-valuenow={verifiedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Verified company claims"
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-300',
                verifiedPct >= 70 ? 'bg-track' : verifiedPct >= 40 ? 'bg-ahead' : 'bg-coral',
              )}
              style={{ width: `${verifiedPct}%` }}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              Company areas
            </p>
            <h3 className="font-display text-xl text-ink">Tree coverage</h3>
          </div>
          <p className="text-xs text-ink/45">From files under 01-COMPANY</p>
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

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-end justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Audience</p>
              <h3 className="font-display text-lg text-ink">Primary who</h3>
            </div>
            <span
              className={cn(
                'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                /approved/i.test(audience.status)
                  ? 'border-track/30 bg-track/10 text-track'
                  : 'border-ahead/30 bg-ahead/10 text-ahead',
              )}
            >
              {audience.status || 'unknown'}
            </span>
          </div>
          <p className="px-1 text-sm text-ink/80">{audience.primary || '—'}</p>
          <button
            type="button"
            className="mt-3 cursor-pointer px-1 text-xs font-medium text-teal transition-colors duration-200 hover:underline"
            onClick={() => onOpenPath(audience.path)}
          >
            Open audience.md
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-end justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Strategy</p>
              <h3 className="font-display text-lg text-ink">Direction</h3>
            </div>
            <span
              className={cn(
                'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                /approved/i.test(strategy.status)
                  ? 'border-track/30 bg-track/10 text-track'
                  : 'border-coral/30 bg-coral/10 text-coral',
              )}
            >
              {strategy.status || 'unknown'}
            </span>
          </div>
          <p className="px-1 text-sm text-ink/80">{strategy.direction || 'Not yet established'}</p>
          <button
            type="button"
            className="mt-3 cursor-pointer px-1 text-xs font-medium text-teal transition-colors duration-200 hover:underline"
            onClick={() => onOpenPath(strategy.path)}
          >
            Open strategy.md
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr_280px]">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-end justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Team</p>
              <h3 className="font-display text-lg text-ink">Profiles</h3>
            </div>
            <p className="text-xs text-ink/45">{team.length}</p>
          </div>
          {team.length === 0 ? (
            <p className="px-1 text-sm text-ink/50">No team profiles yet.</p>
          ) : (
            <ul className="space-y-1">
              {team.map((member) => (
                <li key={member.path}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-baseline justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 hover:bg-mist/80"
                    onClick={() => onOpenPath(member.path)}
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink">{member.name}</span>
                      <span className="block text-xs text-ink/50">{member.role}</span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                      {member.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Activity</p>
          <h3 className="font-display text-lg text-ink">Recent pulse</h3>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">No activity entries yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activity.slice(0, 5).map((item) => (
                <li key={`${item.sourcePath}-${item.title}`}>
                  <button
                    type="button"
                    className="cursor-pointer text-left transition-colors duration-200 hover:text-teal"
                    onClick={() => onOpenPath(item.sourcePath)}
                  >
                    <span className="block text-sm font-medium text-ink">{item.title}</span>
                    <span className="block text-xs text-ink/50 line-clamp-2">{item.summary}</span>
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
            {gaps.length === 0 && <li className="text-sm text-ink/50">No company gaps detected.</li>}
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
