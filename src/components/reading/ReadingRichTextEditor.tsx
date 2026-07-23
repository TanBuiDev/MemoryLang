import { useEffect, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit } from '@tiptap/extension-table'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Unlink,
  Rows3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { cn } from '@/utils/cn'

interface ReadingRichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

interface ToolbarButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

const blockOptions = [
  { value: 'paragraph', label: 'Đoạn văn' },
  { value: 'heading-2', label: 'Tiêu đề lớn' },
  { value: 'heading-3', label: 'Tiêu đề nhỏ' },
]

const pasteOptions = [
  { value: 'formatted', label: 'Giữ định dạng' },
  { value: 'plain', label: 'Chỉ giữ văn bản' },
]

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-8 w-8 min-h-0 shrink-0 p-0',
        active && 'bg-amber-200'
      )}
    >
      {children}
    </Button>
  )
}

function normalizeLinkUrl(value: string): string {
  const url = value.trim()
  if (!url || /^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url
  return `https://${url}`
}

export function ReadingRichTextEditor({
  value,
  onChange,
}: ReadingRichTextEditorProps) {
  const [showLinkEditor, setShowLinkEditor] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [pasteMode, setPasteMode] = useState('formatted')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TableKit.configure({
        table: {
          resizable: true,
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'tiptap min-h-72 px-4 py-4 font-serif text-base leading-relaxed text-slate-900 focus:outline-none',
        'aria-label': 'Nội dung bài đọc',
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return
    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: activeEditor }) => ({
      block: activeEditor?.isActive('heading', { level: 2 })
        ? 'heading-2'
        : activeEditor?.isActive('heading', { level: 3 })
          ? 'heading-3'
          : 'paragraph',
      bold: activeEditor?.isActive('bold') ?? false,
      italic: activeEditor?.isActive('italic') ?? false,
      underline: activeEditor?.isActive('underline') ?? false,
      strike: activeEditor?.isActive('strike') ?? false,
      code: activeEditor?.isActive('code') ?? false,
      bulletList: activeEditor?.isActive('bulletList') ?? false,
      orderedList: activeEditor?.isActive('orderedList') ?? false,
      blockquote: activeEditor?.isActive('blockquote') ?? false,
      link: activeEditor?.isActive('link') ?? false,
      alignLeft: activeEditor?.isActive({ textAlign: 'left' }) ?? false,
      alignCenter: activeEditor?.isActive({ textAlign: 'center' }) ?? false,
      alignRight: activeEditor?.isActive({ textAlign: 'right' }) ?? false,
      alignJustify: activeEditor?.isActive({ textAlign: 'justify' }) ?? false,
      canUndo: activeEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: activeEditor?.can().chain().focus().redo().run() ?? false,
      inTable: activeEditor?.isActive('table') ?? false,
    }),
  })

  const handleBlockChange = (block: string) => {
    if (!editor) return
    if (block === 'heading-2') {
      editor.chain().focus().setHeading({ level: 2 }).run()
    } else if (block === 'heading-3') {
      editor.chain().focus().setHeading({ level: 3 }).run()
    } else {
      editor.chain().focus().setParagraph().run()
    }
  }

  const handleOpenLinkEditor = () => {
    if (!editor) return
    setLinkUrl(editor.getAttributes('link').href || '')
    setShowLinkEditor(true)
  }

  const handleApplyLink = () => {
    if (!editor) return
    const href = normalizeLinkUrl(linkUrl)
    if (href) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setShowLinkEditor(false)
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-[3px_3px_0px_0px_#000]">
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-slate-900 bg-slate-100 p-2">
        <div className="w-36">
          <Select
            value={toolbarState?.block || 'paragraph'}
            onChange={handleBlockChange}
            options={blockOptions}
            disabled={!editor}
          />
        </div>

        <span className="mx-1 h-7 w-px bg-slate-300" aria-hidden="true" />

        <ToolbarButton
          label="In đậm"
          active={toolbarState?.bold}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="In nghiêng"
          active={toolbarState?.italic}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Gạch chân"
          active={toolbarState?.underline}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <Underline size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Gạch ngang"
          active={toolbarState?.strike}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={15} />
        </ToolbarButton>

        <span className="mx-1 h-7 w-px bg-slate-300" aria-hidden="true" />

        <ToolbarButton
          label="Danh sách dấu chấm"
          active={toolbarState?.bulletList}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Danh sách đánh số"
          active={toolbarState?.orderedList}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Trích dẫn"
          active={toolbarState?.blockquote}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Đường phân cách"
          disabled={!editor}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={15} />
        </ToolbarButton>

        <span className="mx-1 h-7 w-px bg-slate-300" aria-hidden="true" />

        <ToolbarButton
          label="Căn trái"
          active={toolbarState?.alignLeft}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Căn giữa"
          active={toolbarState?.alignCenter}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Căn phải"
          active={toolbarState?.alignRight}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Căn đều"
          active={toolbarState?.alignJustify}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify size={15} />
        </ToolbarButton>

        <span className="mx-1 h-7 w-px bg-slate-300" aria-hidden="true" />

        <ToolbarButton
          label="Thêm hoặc sửa liên kết"
          active={toolbarState?.link}
          disabled={!editor}
          onClick={handleOpenLinkEditor}
        >
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Xóa liên kết"
          disabled={!editor || !toolbarState?.link}
          onClick={() => editor?.chain().focus().unsetLink().run()}
        >
          <Unlink size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Xóa định dạng"
          disabled={!editor}
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting size={15} />
        </ToolbarButton>

        <span className="mx-1 h-7 w-px bg-slate-300" aria-hidden="true" />

        <ToolbarButton
          label="Hoàn tác"
          disabled={!editor || !toolbarState?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Làm lại"
          disabled={!editor || !toolbarState?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={15} />
        </ToolbarButton>

        <ToolbarButton
          label="Chèn bảng"
          disabled={!editor}
          onClick={() =>
            editor?.chain().focus().insertTable({
              rows: 3,
              cols: 3,
              withHeaderRow: true,
            }).run()
          }
        >
          <Table2 size={15} />
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="reading-paste-mode" className="text-xs font-black">
            Khi dán
          </label>
          <div className="w-40">
            <Select
              id="reading-paste-mode"
              value={pasteMode}
              onChange={setPasteMode}
              options={pasteOptions}
            />
          </div>
        </div>
      </div>

      {toolbarState?.inTable && (
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-slate-900 bg-violet-50 p-2">
          <span className="mr-1 text-xs font-black">Chỉnh sửa bảng:</span>
          <Button
            type="button"
            variant="ghost"
            aria-label="Thêm hàng bên dưới"
            onClick={() => editor?.chain().focus().addRowAfter().run()}
            className="h-8 min-h-0 px-2 text-xs"
          >
            <Rows3 size={15} />
            Thêm hàng
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="Thêm cột bên phải"
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
            className="h-8 min-h-0 px-2 text-xs"
          >
            <Columns3 size={15} />
            Thêm cột
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="Xóa hàng"
            onClick={() => editor?.chain().focus().deleteRow().run()}
            className="h-8 min-h-0 px-2 text-xs"
          >
            Xóa hàng
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="Xóa cột"
            onClick={() => editor?.chain().focus().deleteColumn().run()}
            className="h-8 min-h-0 px-2 text-xs"
          >
            Xóa cột
          </Button>
          <Button
            type="button"
            variant="danger"
            aria-label="Xóa bảng"
            onClick={() => editor?.chain().focus().deleteTable().run()}
            className="h-8 min-h-0 px-2 text-xs"
          >
            <Trash2 size={15} />
            Xóa bảng
          </Button>
        </div>
      )}

      {showLinkEditor && (
        <div className="flex flex-col gap-2 border-b-2 border-slate-900 bg-amber-50 p-3 sm:flex-row">
          <input
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleApplyLink()
              }
            }}
            aria-label="Địa chỉ liên kết"
            placeholder="https://example.com"
            className="min-h-9 flex-1 rounded-lg border-2 border-slate-900 bg-white px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={handleApplyLink} className="h-9">
              Áp dụng
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowLinkEditor(false)}
              className="h-9"
            >
              Hủy
            </Button>
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        onPaste={(event) => {
          if (pasteMode !== 'plain' || !editor) return
          const text = event.clipboardData.getData('text/plain')
          if (!text) return
          event.preventDefault()
          const lines = text.split(/\r?\n/)
          if (lines.length === 1) {
            editor.chain().focus().insertContent({
              type: 'text',
              text,
            }).run()
            return
          }
          editor.chain().focus().insertContent(
            lines.map((line) => ({
              type: 'paragraph',
              content: line ? [{ type: 'text', text: line }] : [],
            }))
          ).run()
        }}
        className="max-h-[36rem] min-h-72 overflow-auto [&_.tiptap_a]:font-bold [&_.tiptap_a]:text-blue-700 [&_.tiptap_a]:underline [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-amber-400 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_h2]:mb-3 [&_.tiptap_h2]:mt-5 [&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-black [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:mt-4 [&_.tiptap_h3]:text-xl [&_.tiptap_h3]:font-black [&_.tiptap_hr]:my-5 [&_.tiptap_hr]:border-slate-300 [&_.tiptap_li]:my-1 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_p]:my-2 [&_.tiptap_table]:my-4 [&_.tiptap_table]:w-full [&_.tiptap_table]:border-collapse [&_.tiptap_td]:min-w-24 [&_.tiptap_td]:border-2 [&_.tiptap_td]:border-slate-900 [&_.tiptap_td]:p-2 [&_.tiptap_th]:border-2 [&_.tiptap_th]:border-slate-900 [&_.tiptap_th]:bg-amber-100 [&_.tiptap_th]:p-2 [&_.tiptap_th]:text-left [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6"
      />
    </div>
  )
}
