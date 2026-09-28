import { Code, Columns2, Eye } from 'lucide-react'
import { cn } from '../../lib/utils'

export type HtmlViewMode = 'preview' | 'source' | 'both'

const MODES: { id: HtmlViewMode; label: string; Icon: typeof Eye }[] = [
  { id: 'preview', label: 'Preview', Icon: Eye },
  { id: 'source', label: 'Source', Icon: Code },
  { id: 'both', label: 'Both', Icon: Columns2 },
]

type HtmlViewModeControlProps = {
  mode: HtmlViewMode
  onChange: (mode: HtmlViewMode) => void
}

export function HtmlViewModeControl({ mode, onChange }: HtmlViewModeControlProps) {
  return (
    <div
      role="tablist"
      aria-label="HTML view mode"
      className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-mist/40 p-1"
    >
      {MODES.map(({ id, label, Icon }) => {
        const selected = mode === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              selected
                ? 'bg-paper text-ink shadow-[0_1px_0_rgba(21,32,51,0.06)]'
                : 'text-ink/55 hover:bg-paper/70 hover:text-ink/80',
            )}
            onClick={() => onChange(id)}
          >
            <Icon size={16} aria-hidden="true" strokeWidth={1.75} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
