import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { Markdown } from 'tiptap-markdown'
import { ToolbarButton } from './EditorChrome'

type MarkdownEditorProps = {
  initialContent: string
  onChange: (markdown: string) => void
}

function readMarkdown(editor: Editor): string {
  const storage = editor.storage as Editor['storage'] & {
    markdown: { getMarkdown: () => string }
  }
  return storage.markdown.getMarkdown()
}

export function MarkdownEditor({ initialContent, onChange }: MarkdownEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-teal underline' },
      }),
      Placeholder.configure({ placeholder: 'Write markdown…' }),
      Markdown.configure({
        html: false,
        breaks: true,
        transformPastedText: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose-brain min-h-[16rem] text-[15px] leading-relaxed text-ink/90 focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(readMarkdown(ed))
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = readMarkdown(editor)
    if (current !== initialContent) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  if (!editor) {
    return <p className="text-sm text-ink/50">Loading editor…</p>
  }

  return (
    <div className="rounded-2xl border border-line bg-paper shadow-[0_1px_0_rgba(21,32,51,0.03)]">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap gap-0.5 border-b border-line px-2 py-1.5"
      >
        <ToolbarButton
          label="B"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="I"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="H2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="H3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          label="•"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="1."
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="<>"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <ToolbarButton
          label="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const prev = editor.getAttributes('link').href as string | undefined
            const url = window.prompt('URL', prev ?? 'https://')
            if (url === null) return
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              return
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }}
        />
      </div>
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
