import { cn } from '../../lib/utils'

type TextEditorProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  /** Stretch textarea to fill a flex parent. */
  fill?: boolean
}

export function TextEditor({ value, onChange, className, fill = false }: TextEditorProps) {
  return (
    <label className={cn('block', fill && 'flex h-full min-h-0 flex-col', className)}>
      <span className="sr-only">File content</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={cn(
          'w-full resize-y rounded-2xl border border-line bg-mist/40 p-4 font-mono text-sm text-ink/85 transition-shadow duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal',
          fill ? 'min-h-0 flex-1 resize-none' : 'min-h-[16rem]',
        )}
      />
    </label>
  )
}
