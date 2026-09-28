import { createElement, useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import {
  existingApprover,
  KNOWLEDGE_STATUSES,
  knowledgeStatusBadgeClass,
  knowledgeStatusIcon,
  knowledgeStatusLabel,
  needsStatusConfirm,
  parseKnowledgeStatus,
  UnknownStatusIcon,
  type KnowledgeStatus,
} from '../../lib/knowledge-status'

const selectClass =
  'cursor-pointer rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-45'

type StatusControlProps = {
  currentStatus: unknown
  frontmatter?: Record<string, unknown>
  disabled?: boolean
  busy?: boolean
  error?: string | null
  successMessage?: string | null
  onRequestChange: (status: KnowledgeStatus, approvedBy?: string) => void
}

function StatusBadgeIcon({ status }: { status: KnowledgeStatus | null }) {
  return createElement(status ? knowledgeStatusIcon(status) : UnknownStatusIcon, {
    className: 'size-3.5 shrink-0',
    'aria-hidden': true,
  })
}

export function StatusControl({
  currentStatus,
  frontmatter,
  disabled,
  busy,
  error,
  successMessage,
  onRequestChange,
}: StatusControlProps) {
  const selectId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const parsed = parseKnowledgeStatus(currentStatus)
  const [pending, setPending] = useState<KnowledgeStatus | null>(null)
  const [approver, setApprover] = useState('')

  const selectValue = pending ?? parsed ?? ''

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (pending) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [pending])

  function handleSelectChange(next: string) {
    if (!next || next === parsed) return
    const status = parseKnowledgeStatus(next)
    if (!status) return

    if (needsStatusConfirm(status)) {
      setApprover(existingApprover(frontmatter))
      setPending(status)
      return
    }

    onRequestChange(status)
  }

  function handleConfirm() {
    if (!pending) return
    if (pending === 'approved' && !approver.trim()) return
    onRequestChange(pending, pending === 'approved' ? approver.trim() : undefined)
    setPending(null)
  }

  function handleCancelConfirm() {
    setPending(null)
  }

  const badgeLabel = parsed ? knowledgeStatusLabel(parsed) : String(currentStatus ?? 'No status')
  const badgeClass = parsed
    ? knowledgeStatusBadgeClass(parsed)
    : 'border-line bg-mist/50 text-ink/55'

  return (
    <div className="mb-5 rounded-2xl border border-line bg-paper px-4 py-3 shadow-[0_1px_0_rgba(21,32,51,0.03)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink/40">
            Knowledge status
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]',
                badgeClass,
              )}
            >
              <StatusBadgeIcon status={parsed} />
              {badgeLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={selectId} className="sr-only">
            Change knowledge status
          </label>
          <select
            id={selectId}
            className={selectClass}
            value={selectValue}
            disabled={disabled || busy}
            aria-busy={busy}
            onChange={(e) => handleSelectChange(e.target.value)}
          >
            {!parsed && !pending && <option value="">Select status…</option>}
            {KNOWLEDGE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {knowledgeStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {busy && (
        <p className="mt-2 text-sm text-ink/50" role="status">
          Updating status…
        </p>
      )}
      {successMessage && !busy && !error && (
        <p className="mt-2 text-sm text-track" role="status" aria-atomic="true">
          {successMessage}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-coral" role="alert">
          {error}
        </p>
      )}

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(100%,24rem)] rounded-2xl border border-line bg-paper p-0 text-ink shadow-lg backdrop:bg-ink/40"
        onClose={handleCancelConfirm}
        onCancel={(e) => {
          e.preventDefault()
          handleCancelConfirm()
        }}
      >
        {pending && (
          <form
            className="p-5"
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            <h2 className="font-display text-lg text-ink">
              {pending === 'approved' ? 'Confirm approval' : 'Mark as superseded?'}
            </h2>
            <p className="mt-2 text-sm text-ink/60">
              {pending === 'approved'
                ? 'Approved knowledge needs a named human approver for this scope.'
                : 'Superseded records stay for history but are no longer current.'}
            </p>

            {pending === 'approved' && (
              <div className="mt-4">
                <label htmlFor={`${selectId}-approver`} className="block text-sm font-medium text-ink">
                  Approved by
                </label>
                <input
                  id={`${selectId}-approver`}
                  type="text"
                  autoComplete="name"
                  required
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                  className="mt-1.5 w-full cursor-text rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  placeholder="Named person"
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-mist/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                onClick={handleCancelConfirm}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending === 'approved' && !approver.trim()}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-paper transition-colors duration-200 hover:bg-teal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:cursor-not-allowed disabled:opacity-45"
              >
                {pending === 'approved' ? 'Approve' : 'Supersede'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  )
}
