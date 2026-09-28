import { cn } from '../../lib/utils'

type HtmlPreviewPaneProps = {
  html: string
  className?: string
  /** Stretch iframe to fill a flex parent (expanded layouts). */
  fill?: boolean
}

export function HtmlPreviewPane({ html, className, fill = false }: HtmlPreviewPaneProps) {
  const trimmed = html.trim()

  if (!trimmed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-line bg-paper px-4 text-sm text-ink/45',
          fill ? 'h-full min-h-[12rem]' : 'min-h-[12rem]',
          className,
        )}
      >
        No HTML to preview.
      </div>
    )
  }

  return (
    <iframe
      title="HTML preview"
      aria-label="Rendered HTML preview"
      sandbox="allow-scripts allow-forms"
      srcDoc={html}
      className={cn(
        'w-full rounded-2xl border border-line bg-paper shadow-[0_1px_0_rgba(21,32,51,0.03)]',
        fill ? 'h-full min-h-0' : 'min-h-[20rem]',
        className,
      )}
    />
  )
}
