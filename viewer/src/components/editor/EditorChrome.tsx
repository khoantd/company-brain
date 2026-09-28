import { cn } from '../../lib/utils'

const btnBase =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-45'

type EditorChromeProps = {
  editing: boolean
  dirty: boolean
  saving: boolean
  canEdit: boolean
  error?: string | null
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
}

export function EditorChrome({
  editing,
  dirty,
  saving,
  canEdit,
  error,
  onEdit,
  onCancel,
  onSave,
}: EditorChromeProps) {
  if (!canEdit && !editing) return null

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-line pb-4">
      {!editing ? (
        <button
          type="button"
          className={cn(btnBase, 'bg-ink text-paper hover:bg-ink/90')}
          onClick={onEdit}
        >
          Edit
        </button>
      ) : (
        <>
          <button
            type="button"
            className={cn(btnBase, 'bg-teal text-paper hover:bg-teal/90')}
            disabled={!dirty || saving}
            onClick={onSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className={cn(btnBase, 'border border-line bg-paper text-ink hover:bg-mist/60')}
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          {dirty && (
            <span
              role="status"
              className="rounded-md border border-line bg-mist/50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink/55"
            >
              Unsaved
            </span>
          )}
          <span className="ml-auto hidden text-[11px] text-ink/40 sm:inline">
            ⌘/Ctrl+S to save
          </span>
        </>
      )}
      {error && <p className="w-full text-sm text-coral">{error}</p>}
    </div>
  )
}

export function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      title={label}
      className={cn(
        'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'bg-teal/15 text-teal' : 'text-ink/70 hover:bg-mist/70',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
