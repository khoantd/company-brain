import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, FileText, Folder, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { api, type TreeNode } from '../api'
import { cn } from '../lib/utils'

function findSubtree(nodes: TreeNode[], prefix: string): TreeNode[] {
  if (!prefix) return nodes
  let current = nodes
  let node: TreeNode | undefined
  let acc = ''
  for (const part of prefix.split('/')) {
    acc = acc ? `${acc}/${part}` : part
    node = current.find((n) => n.path === acc)
    if (!node) return []
    current = node.children ?? []
  }
  if (!node) return []
  if (node.type === 'dir') return node.children ?? []
  return [node]
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? ''
  return base.replace(/^\.+/, '').trim()
}

function isUploadableName(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.html')
}

function TreeItem({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: TreeNode
  depth: number
  selected?: string
  onSelect: (path: string) => void
}) {
  const [open, setOpen] = useState(depth < 1)
  const isDir = node.type === 'dir'

  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-colors duration-200',
          selected === node.path ? 'bg-ink text-paper' : 'text-ink/80 hover:bg-mist',
        )}
        style={{ paddingLeft: `${0.5 + depth * 0.65}rem` }}
        onClick={() => {
          if (isDir) setOpen((v) => !v)
          else onSelect(node.path)
        }}
      >
        {isDir ? (
          <ChevronRight className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')} />
        ) : (
          <FileText className="size-3.5 shrink-0 opacity-60" />
        )}
        {isDir && <Folder className="size-3.5 shrink-0 opacity-50" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir &&
        open &&
        node.children?.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
    </div>
  )
}

type PendingUpload = {
  fileName: string
  content: string
}

export function FileTree({
  selectedPath,
  onSelect,
  rootPrefix,
  title = 'Company Brain',
  subtitle = 'Browse',
}: {
  selectedPath?: string
  onSelect: (path: string) => void
  rootPrefix?: string
  title?: string
  subtitle?: string
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingUpload | null>(null)
  const [rename, setRename] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const treeQuery = useQuery({ queryKey: ['tree'], queryFn: api.tree })
  const nodes = useMemo(() => {
    const tree = treeQuery.data?.tree ?? []
    if (!rootPrefix) return tree
    return findSubtree(tree, rootPrefix)
  }, [treeQuery.data?.tree, rootPrefix])

  const canUpload = Boolean(rootPrefix)

  const uploadMutation = useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      api.uploadFile(path, content),
    onSuccess: async (file) => {
      setPending(null)
      setRename('')
      setLocalError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tree'] }),
        queryClient.invalidateQueries({ queryKey: ['file', file.path] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
        queryClient.invalidateQueries({ queryKey: ['company'] }),
        queryClient.invalidateQueries({ queryKey: ['domain'] }),
      ])
      onSelect(file.path)
    },
    onError: (error) => {
      setLocalError(error instanceof Error ? error.message : 'Upload failed')
    },
  })

  function openPicker() {
    setLocalError(null)
    fileInputRef.current?.click()
  }

  async function onFilePicked(fileList: FileList | null) {
    const file = fileList?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    const fileName = sanitizeFileName(file.name)
    if (!isUploadableName(fileName)) {
      setLocalError('Only .md and .html files can be uploaded.')
      return
    }

    try {
      const content = await file.text()
      setPending({ fileName, content })
      setRename(fileName)
      setLocalError(null)
    } catch {
      setLocalError('Could not read the selected file.')
    }
  }

  function confirmUpload() {
    if (!rootPrefix || !pending) return
    const name = sanitizeFileName(rename)
    if (!isUploadableName(name)) {
      setLocalError('Filename must end with .md or .html.')
      return
    }
    const path = `${rootPrefix.replace(/\/$/, '')}/${name}`
    uploadMutation.mutate({ path, content: pending.content })
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-line bg-paper">
      <div className="border-b border-line px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink/45">{subtitle}</p>
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {rootPrefix && <p className="mt-1 font-mono text-[10px] text-ink/40">{rootPrefix}</p>}
        <div className="mt-3">
          {canUpload ? (
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-mist/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              onClick={openPicker}
              disabled={uploadMutation.isPending}
            >
              <Upload className="size-3.5 opacity-70" />
              Upload
            </button>
          ) : (
            <p className="text-xs text-ink/45">Open a domain folder to upload .md or .html.</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.html,text/markdown,text/html"
            className="hidden"
            onChange={(e) => void onFilePicked(e.target.files)}
          />
        </div>
        {pending && (
          <div className="mt-3 space-y-2 rounded-lg border border-line bg-mist/40 p-3">
            <label className="block text-xs font-medium text-ink/60" htmlFor="upload-rename">
              Save as in {rootPrefix}
            </label>
            <input
              id="upload-rename"
              value={rename}
              onChange={(e) => setRename(e.target.value)}
              className="w-full rounded-md border border-line bg-paper px-2 py-1.5 font-mono text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              disabled={uploadMutation.isPending}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-paper hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={uploadMutation.isPending}
                onClick={confirmUpload}
              >
                {uploadMutation.isPending ? 'Uploading…' : 'Confirm upload'}
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink hover:bg-mist/60 disabled:opacity-45"
                disabled={uploadMutation.isPending}
                onClick={() => {
                  setPending(null)
                  setRename('')
                  setLocalError(null)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {(localError || uploadMutation.error) && (
          <p className="mt-2 text-sm text-coral">
            {localError ?? (uploadMutation.error as Error).message}
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {treeQuery.isLoading && <p className="px-2 text-sm text-ink/50">Loading…</p>}
        {treeQuery.error && (
          <p className="px-2 text-sm text-coral">{(treeQuery.error as Error).message}</p>
        )}
        {!treeQuery.isLoading && nodes.length === 0 && (
          <p className="px-2 text-sm text-ink/50">No files in this domain yet.</p>
        )}
        {nodes.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            selected={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  )
}
