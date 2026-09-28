import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { api } from '../api'
import { isHtmlPath } from '../lib/file-kind'
import type { HtmlLayoutMode } from '../lib/html-layout'
import {
  isKnowledgeStatus,
  knowledgeStatusLabel,
  type KnowledgeStatus,
} from '../lib/knowledge-status'
import { cn } from '../lib/utils'
import { EditorChrome } from './editor/EditorChrome'
import { HtmlPreviewPane } from './editor/HtmlPreviewPane'
import { HtmlViewModeControl, type HtmlViewMode } from './editor/HtmlViewModeControl'
import { StatusControl } from './editor/StatusControl'
import { TextEditor } from './editor/TextEditor'

export type { HtmlLayoutMode }

const MarkdownEditor = lazy(() =>
  import('./editor/MarkdownEditor').then((m) => ({ default: m.MarkdownEditor })),
)

export function DocumentView({
  path,
  onDirtyChange,
  onHtmlLayoutChange,
}: {
  path?: string
  onDirtyChange?: (dirty: boolean) => void
  onHtmlLayoutChange?: (layout: HtmlLayoutMode) => void
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [baseline, setBaseline] = useState('')
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)
  const [htmlMode, setHtmlMode] = useState<HtmlViewMode>('both')
  const [htmlModePath, setHtmlModePath] = useState(path)

  if (path !== htmlModePath) {
    setHtmlModePath(path)
    setHtmlMode('both')
  }

  const fileQuery = useQuery({
    queryKey: ['file', path],
    queryFn: () => api.file(path!),
    enabled: Boolean(path),
  })

  const dirty = editing && draft !== baseline

  const htmlDoc =
    Boolean(path) &&
    fileQuery.data?.kind === 'text' &&
    isHtmlPath(fileQuery.data.path)
  const htmlExpanded = htmlDoc && (htmlMode === 'preview' || htmlMode === 'both')

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  useEffect(() => {
    onHtmlLayoutChange?.(htmlExpanded ? 'expanded' : 'normal')
    return () => onHtmlLayoutChange?.('normal')
  }, [htmlExpanded, onHtmlLayoutChange])

  async function invalidateDashboards() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['overview'] }),
      queryClient.invalidateQueries({ queryKey: ['company'] }),
      queryClient.invalidateQueries({ queryKey: ['domain'] }),
      queryClient.invalidateQueries({ queryKey: ['tree'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: () => api.saveFile(path!, draft),
    onSuccess: async (file) => {
      queryClient.setQueryData(['file', path], file)
      await invalidateDashboards()
      const next = file.content ?? draft
      setBaseline(next)
      setDraft(next)
      setEditing(false)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, approvedBy }: { status: KnowledgeStatus; approvedBy?: string }) =>
      api.updateFileStatus(path!, status, approvedBy),
    onSuccess: async (file) => {
      queryClient.setQueryData(['file', path], file)
      await invalidateDashboards()
      const label = statusSuccessLabel(file.frontmatter?.status)
      setStatusSuccess(label ? `Status updated to ${label}.` : 'Status updated.')
    },
  })

  const handleCancel = useCallback(() => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    setEditing(false)
    setDraft(baseline)
    saveMutation.reset()
  }, [baseline, dirty, saveMutation])

  useEffect(() => {
    if (!editing) return
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (dirty && !saveMutation.isPending) saveMutation.mutate()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, editing, handleCancel, saveMutation])

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function startEdit() {
    const content = fileQuery.data?.content ?? ''
    setBaseline(content)
    setDraft(content)
    setEditing(true)
    saveMutation.reset()
    setStatusSuccess(null)
  }

  function handleStatusChange(status: KnowledgeStatus, approvedBy?: string) {
    if (dirty) {
      window.alert('Save or discard body edits before changing status.')
      return
    }
    setStatusSuccess(null)
    statusMutation.mutate({ status, approvedBy })
  }

  if (!path) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-display text-2xl text-ink">Select a file</p>
        <p className="mt-2 max-w-md text-sm text-ink/55">
          Open a record from this domain — or return to Command center for the brain overview.
        </p>
      </div>
    )
  }

  if (fileQuery.isLoading) {
    return <p className="p-6 text-sm text-ink/50">Loading…</p>
  }

  if (fileQuery.error) {
    return <p className="p-6 text-sm text-coral">{(fileQuery.error as Error).message}</p>
  }

  const file = fileQuery.data
  if (!file) return null

  const crumbs = file.path.split('/')
  const canEdit = file.kind === 'markdown' || file.kind === 'text'
  const showStatus = file.kind === 'markdown'
  const isHtml = file.kind === 'text' && isHtmlPath(file.path)
  const showSourcePane =
    !isHtml || htmlMode === 'source' || htmlMode === 'both' || (editing && htmlMode === 'preview')
  const htmlContent = editing ? draft : (file.content ?? '')
  const expanded = isHtml && (htmlMode === 'preview' || htmlMode === 'both')
  const bothMode = isHtml && htmlMode === 'both'
  const previewOnly = isHtml && htmlMode === 'preview'

  const chrome = (
    <>
      <nav
        aria-label="Path"
        className={cn(
          'flex flex-wrap items-center gap-1 font-mono text-[11px] text-ink/45',
          expanded ? 'mb-3 shrink-0' : 'mb-5',
        )}
      >
        {crumbs.map((part, i) => (
          <span key={`${part}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span className="text-ink/25">/</span>}
            <span className={i === crumbs.length - 1 ? 'text-ink/70' : undefined}>{part}</span>
          </span>
        ))}
      </nav>

      <div className={cn(expanded && 'shrink-0')}>
        <EditorChrome
          editing={editing}
          dirty={dirty}
          saving={saveMutation.isPending}
          canEdit={canEdit}
          error={saveMutation.error ? (saveMutation.error as Error).message : null}
          onEdit={startEdit}
          onCancel={handleCancel}
          onSave={() => saveMutation.mutate()}
        />
      </div>

      {showStatus && (
        <StatusControl
          key={path}
          currentStatus={file.frontmatter?.status}
          frontmatter={file.frontmatter}
          disabled={dirty}
          busy={statusMutation.isPending}
          error={statusMutation.error ? (statusMutation.error as Error).message : null}
          successMessage={statusSuccess}
          onRequestChange={handleStatusChange}
        />
      )}

      {file.frontmatter && Object.keys(file.frontmatter).length > 0 && (
        <dl
          className={cn(
            'grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border border-line bg-paper px-4 py-3 text-sm shadow-[0_1px_0_rgba(21,32,51,0.03)]',
            expanded ? 'mb-3 shrink-0' : 'mb-6',
          )}
        >
          {Object.entries(file.frontmatter).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink/40">{k}</dt>
              <dd className="min-w-0 break-words text-ink/85">
                {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
                  ? String(v)
                  : JSON.stringify(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {isHtml && (
        <div className={cn(expanded ? 'mb-3 shrink-0' : 'mb-4')}>
          <HtmlViewModeControl mode={htmlMode} onChange={setHtmlMode} />
        </div>
      )}
    </>
  )

  const sourceBody = editing ? (
    <TextEditor value={draft} onChange={setDraft} fill={expanded} />
  ) : (
    <pre
      className={cn(
        'overflow-auto whitespace-pre-wrap rounded-2xl border border-line bg-mist/40 p-4 font-mono text-sm text-ink/85',
        expanded && 'h-full min-h-0',
      )}
    >
      {file.content}
    </pre>
  )

  return (
    <article
      className={cn(
        'w-full',
        expanded
          ? 'flex h-full min-h-0 max-w-none flex-col px-4 py-4'
          : cn('mx-auto px-6 py-8', isHtml ? 'max-w-5xl' : 'max-w-3xl'),
      )}
    >
      {chrome}

      {editing && file.kind === 'markdown' && (
        <Suspense fallback={<p className="text-sm text-ink/50">Loading editor…</p>}>
          <MarkdownEditor key={`${path}-md`} initialContent={baseline} onChange={setDraft} />
        </Suspense>
      )}

      {bothMode && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="flex min-h-0 flex-col overflow-hidden" aria-label="Preview">
            <h2 className="mb-2 shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-ink/40">
              Preview
            </h2>
            <div className="min-h-0 flex-1">
              <HtmlPreviewPane html={htmlContent} fill />
            </div>
          </section>
          <section className="flex min-h-0 flex-col overflow-hidden" aria-label="Source">
            <h2 className="mb-2 shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-ink/40">
              Source
            </h2>
            <div className="min-h-0 flex-1">{sourceBody}</div>
          </section>
        </div>
      )}

      {previewOnly && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {editing && (
            <section
              className="flex max-h-[30%] min-h-[10rem] shrink-0 flex-col overflow-hidden"
              aria-label="Source"
            >
              <h2 className="mb-2 shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-ink/40">
                Source
              </h2>
              <div className="min-h-0 flex-1">
                <TextEditor value={draft} onChange={setDraft} fill />
              </div>
            </section>
          )}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="Preview">
            <h2 className="mb-2 shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-ink/40">
              Preview
            </h2>
            <div className="min-h-0 flex-1">
              <HtmlPreviewPane html={htmlContent} fill />
            </div>
          </section>
        </div>
      )}

      {!expanded && editing && file.kind === 'text' && showSourcePane && (
        <section aria-label="Source">
          {isHtml && (
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink/40">
              Source
            </h2>
          )}
          <TextEditor value={draft} onChange={setDraft} />
        </section>
      )}

      {!editing && file.kind === 'markdown' && file.content && (
        <div className="prose-brain text-[15px] leading-relaxed text-ink/90">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {file.content}
          </ReactMarkdown>
        </div>
      )}

      {!expanded && !editing && file.kind === 'text' && showSourcePane && file.content && (
        <section aria-label="Source">
          {isHtml && (
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink/40">
              Source
            </h2>
          )}
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-line bg-mist/40 p-4 font-mono text-sm text-ink/85">
            {file.content}
          </pre>
        </section>
      )}

      {file.kind === 'binary' && (
        <p className="text-sm text-ink/55">
          Binary file ({file.size} bytes). Open it from the repository filesystem to view.
        </p>
      )}
    </article>
  )
}

function statusSuccessLabel(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const normalized = value.trim().toLowerCase()
  if (isKnowledgeStatus(normalized)) return knowledgeStatusLabel(normalized)
  return value
}
