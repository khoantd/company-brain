import { PanelLeft, PanelLeftClose } from 'lucide-react'
import {
  OPERATING_VIEWS,
  isKnowledgeGraphView,
  viewEquals,
  type AppView,
} from '../../lib/nav'
import { cn } from '../../lib/utils'

const toggleBtn =
  'inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-paper/80 transition-colors duration-200 hover:bg-sidebar-hover hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'

export function Sidebar({
  view,
  onNavigate,
  companyName,
  gapCount,
  collapsed = false,
  onToggleCollapse,
  user,
  onLogout,
}: {
  view: AppView
  onNavigate: (next: AppView) => void
  companyName: string
  gapCount: number
  collapsed?: boolean
  onToggleCollapse?: () => void
  user?: string
  onLogout?: () => void
}) {
  if (collapsed) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col items-center bg-sidebar py-3 text-paper">
        <button
          type="button"
          className={toggleBtn}
          aria-label="Expand operating views"
          aria-expanded={false}
          onClick={onToggleCollapse}
        >
          <PanelLeft size={18} aria-hidden="true" strokeWidth={1.75} />
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-sidebar text-paper">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-muted">
              Company Brain
            </p>
            <h1 className="mt-1 font-display text-xl leading-tight tracking-tight text-paper">
              {companyName || 'Royal Solution'}
            </h1>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              className={cn(toggleBtn, 'shrink-0')}
              aria-label="Collapse operating views"
              aria-expanded={true}
              onClick={onToggleCollapse}
            >
              <PanelLeftClose size={18} aria-hidden="true" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-auto px-3 py-4" aria-label="Operating views">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
          Operating views
        </p>
        <ul className="space-y-0.5">
          {OPERATING_VIEWS.map((item) => {
            const active =
              item.id === 'graph'
                ? isKnowledgeGraphView(view)
                : viewEquals(view, item.view)
            const showGap = item.id === 'command' && gapCount > 0
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200',
                    active
                      ? 'bg-paper/95 font-medium text-ink shadow-sm'
                      : 'text-paper/80 hover:bg-sidebar-hover hover:text-paper',
                  )}
                  onClick={() => onNavigate(item.view)}
                >
                  <span>{item.label}</span>
                  {showGap && (
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                        active ? 'bg-coral/15 text-coral' : 'bg-white/10 text-paper/80',
                      )}
                    >
                      {gapCount}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-sidebar-muted">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-track" aria-hidden />
          <span>Signed in · editable</span>
        </div>
        {user && <p className="mt-2 text-[11px] leading-relaxed truncate">{user}</p>}
        {onLogout && (
          <button
            type="button"
            className="mt-2 cursor-pointer text-[11px] text-teal hover:underline"
            onClick={onLogout}
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  )
}
