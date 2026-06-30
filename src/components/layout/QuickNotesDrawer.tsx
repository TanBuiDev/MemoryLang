import { useEffect, useRef, useState } from 'react'
import { FileText, X, Bold, Underline, List, Trash2, Edit, Save, Loader2 } from 'lucide-react'
import { notesService, type QuickNote } from '@/services/supabase/notes.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { cn } from '@/utils/cn'
import { supabase } from '@/services/supabase/client'

interface QuickNotesDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentVocabId?: string
}

// Basic markdown parser
function parseMarkdown(text: string): string {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Underline: __text__ or _text_
  html = html.replace(/__(.*?)__/g, '<u>$1</u>')
  html = html.replace(/_(.*?)_/g, '<u>$1</u>')

  // List: - item or * item
  const lines = html.split('\n')
  const formattedLines = lines.map((line) => {
    if (line.trim().startsWith('- ')) {
      return `<li class="ml-4 list-disc font-medium">${line.trim().substring(2)}</li>`
    }
    if (line.trim().startsWith('* ')) {
      return `<li class="ml-4 list-disc font-medium">${line.trim().substring(2)}</li>`
    }
    return line
  })

  return formattedLines.join('<br />')
}

export function QuickNotesDrawer({ isOpen, onClose, currentVocabId }: QuickNotesDrawerProps) {
  const user = useAuthStore((s) => s.user)
  const userId = user?.id || 'demo-user'

  const [notes, setNotes] = useState<QuickNote[]>([])
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [vocabWord, setVocabWord] = useState<string | null>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [linkVocab, setLinkVocab] = useState(true)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load notes and vocab word
  useEffect(() => {
    if (isOpen) {
      void fetchNotes()
      // If we have current vocab, auto-enable linkVocab and load its word text
      if (currentVocabId) {
        setLinkVocab(true)
        void fetchVocabWord(currentVocabId)
      } else {
        setVocabWord(null)
      }
    }
  }, [isOpen, userId, currentVocabId])

  const fetchNotes = async () => {
    const list = await notesService.getNotes(userId)
    setNotes(list)
  }

  const fetchVocabWord = async (vocabId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_terms')
        .select('word')
        .eq('id', vocabId)
        .maybeSingle()

      if (!error && data?.word) {
        setVocabWord(data.word)
      } else {
        // Fallback: check global_terms if user_term is not found
        const { data: globalData } = await supabase
          .from('global_terms')
          .select('word')
          .eq('id', vocabId)
          .maybeSingle()
        if (globalData?.word) {
          setVocabWord(globalData.word)
        }
      }
    } catch (e) {
      console.warn('Failed to load vocab word for linking:', e)
    }
  }

  // Handle manual/auto save
  const handleSave = async (forceContent?: string, forceTags?: string) => {
    const activeContent = forceContent !== undefined ? forceContent : content
    const activeTagsInput = forceTags !== undefined ? forceTags : tagsInput

    if (!activeContent.trim()) return

    setSaveStatus('saving')
    setIsSaving(true)

    const tagList = activeTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    try {
      const savedNote = await notesService.saveNote({
        id: editingNoteId || undefined,
        userId,
        content: activeContent,
        tags: tagList,
        linkedVocabId: (linkVocab && currentVocabId) ? currentVocabId : undefined
      })

      // Update state list
      setNotes((prev) => {
        const index = prev.findIndex((n) => n.id === savedNote.id)
        if (index > -1) {
          const updated = [...prev]
          updated[index] = savedNote
          return updated
        }
        return [savedNote, ...prev]
      })

      // If manual save, clear editor unless editing
      if (forceContent === undefined) {
        setContent('')
        setTagsInput('')
        setEditingNoteId(null)
      } else {
        // Update editing ID if it was a new note that got created
        if (!editingNoteId) {
          setEditingNoteId(savedNote.id)
        }
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      console.error('Error saving note:', e)
      setSaveStatus('idle')
    } finally {
      setIsSaving(false)
    }
  }

  // Debounced auto-save
  const triggerAutoSave = (newContent: string, newTags: string) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    if (!newContent.trim()) return

    setSaveStatus('saving')
    autoSaveTimeoutRef.current = setTimeout(() => {
      void handleSave(newContent, newTags)
    }, 1200) // Auto-save 1.2s after user stops typing
  }

  // Handle text change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    triggerAutoSave(val, tagsInput)
  }

  // Handle tags change
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTagsInput(val)
    triggerAutoSave(content, val)
  }

  // Inserting markdown helper
  const insertMarkdown = (syntax: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    let newText = ''
    let cursorOffset = 0

    if (syntax === '- ') {
      // List item
      newText = text.substring(0, start) + '\n- ' + text.substring(end)
      cursorOffset = start + 3
    } else {
      // Bold or Underline wrapping selection
      const selection = text.substring(start, end)
      newText = text.substring(0, start) + syntax + selection + syntax + text.substring(end)
      cursorOffset = end + syntax.length
    }

    setContent(newText)
    textarea.focus()
    // Restore selection
    setTimeout(() => {
      textarea.setSelectionRange(cursorOffset, cursorOffset)
    }, 0)

    triggerAutoSave(newText, tagsInput)
  }

  const handleEditClick = (note: QuickNote) => {
    setEditingNoteId(note.id)
    setContent(note.content)
    setTagsInput(note.tags.join(', '))
    if (note.linked_vocab_id) {
      setLinkVocab(true)
    }
    textareaRef.current?.focus()
  }

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) {
      await notesService.deleteNote(id, userId)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (editingNoteId === id) {
        setEditingNoteId(null)
        setContent('')
        setTagsInput('')
      }
    }
  }

  const handleNewNoteClick = () => {
    setEditingNoteId(null)
    setContent('')
    setTagsInput('')
    textareaRef.current?.focus()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[99999] flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
      />

      {/* Notepad Container */}
      <div className={cn(
        "relative bg-background border-l-2 md:border-l-[3px] border-border flex flex-col h-full z-10 transition-transform duration-300 ease-out",
        "w-full md:w-100", // Fullscreen on mobile, 400px (w-100) on desktop
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="bg-primary p-4 border-b-2 border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1c293c]">
            <FileText className="w-5 h-5" />
            <span className="font-black text-base">Sổ Tay Ghi Chú Nhanh</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 border-2 border-border rounded bg-white text-foreground hover:bg-muted active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notepad Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
          {/* Note Editor */}
          <div className="neo-card bg-white p-4 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                {editingNoteId ? '✍ Đang Chỉnh Sửa Ghi Chú' : '✏️ Tạo Ghi Chú Mới'}
              </span>
              
              {/* Save Status Indicator */}
              <div className="text-[10px] font-bold">
                {saveStatus === 'saving' && (
                  <span className="text-secondary flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-600 flex items-center gap-0.5 animate-pulse">
                    ✓ Đã lưu & đồng bộ
                  </span>
                )}
              </div>
            </div>

            {/* Markdown Toolbar */}
            <div className="flex items-center gap-1 pb-1 border-b border-dashed border-border">
              <button 
                type="button"
                onClick={() => insertMarkdown('**')}
                title="In đậm (**)"
                className="p-1.5 hover:bg-muted rounded border border-transparent hover:border-border text-xs flex items-center gap-0.5 font-bold"
              >
                <Bold className="w-3.5 h-3.5" /> Bold
              </button>
              <button 
                type="button"
                onClick={() => insertMarkdown('__')}
                title="Gạch chân (__)"
                className="p-1.5 hover:bg-muted rounded border border-transparent hover:border-border text-xs flex items-center gap-0.5 underline font-medium"
              >
                <Underline className="w-3.5 h-3.5" /> Underline
              </button>
              <button 
                type="button"
                onClick={() => insertMarkdown('- ')}
                title="Danh sách (-)"
                className="p-1.5 hover:bg-muted rounded border border-transparent hover:border-border text-xs flex items-center gap-0.5 font-medium"
              >
                <List className="w-3.5 h-3.5" /> List
              </button>

              {editingNoteId && (
                <button
                  type="button"
                  onClick={handleNewNoteClick}
                  className="ml-auto px-2 py-0.5 text-[10px] font-black border border-border rounded bg-muted hover:bg-white"
                >
                  Viết mới
                </button>
              )}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="Nhập ghi chú ý tưởng, từ mới bắt gặp... (Hỗ trợ Markdown cơ bản)"
              rows={4}
              className="w-full text-sm font-semibold p-3 border-2 border-border rounded bg-amber-50/20 focus:bg-white focus:outline-none transition-all placeholder:text-muted-foreground/60 resize-none"
            />

            {/* Tags Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase">Thẻ gắn kèm (Phân cách bằng dấu phẩy)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={handleTagsChange}
                placeholder="e.g. từ mới, toeic, giao tiếp"
                className="w-full text-xs font-bold px-2 py-1.5 border-2 border-border rounded focus:outline-none focus:bg-white"
              />
            </div>

            {/* Vocab Auto-Link Checkbox */}
            {currentVocabId && vocabWord && (
              <label className="flex items-center gap-2 cursor-pointer p-1.5 bg-yellow-50 border border-yellow-200 rounded text-[11px] font-bold text-yellow-800">
                <input
                  type="checkbox"
                  checked={linkVocab}
                  onChange={(e) => {
                    setLinkVocab(e.target.checked)
                    triggerAutoSave(content, tagsInput)
                  }}
                  className="rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="flex items-center gap-1 truncate">
                  🔗 Gắn kết từ vựng hiện tại: <strong className="underline text-foreground truncate">{vocabWord}</strong>
                </span>
              </label>
            )}

            {/* Explicit Save button */}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!content.trim() || isSaving}
              className="w-full neo-button py-2 bg-primary text-foreground text-xs font-black hover:bg-[#ffe05c] active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {editingNoteId ? 'Lưu cập nhật' : 'Lưu ghi chú'}
            </button>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider border-b-2 border-border pb-1">
              Ghi Chú Đã Lưu ({notes.length})
            </h3>
            
            {notes.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground font-medium border-2 border-dashed border-border rounded bg-white">
                Chưa có ghi chú nào. Hãy tạo ghi chú đầu tiên của bạn!
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div 
                    key={note.id} 
                    className={cn(
                      "neo-card bg-white p-3.5 space-y-2 hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_#1c293c] border-2 border-border",
                      editingNoteId === note.id && "border-secondary bg-indigo-50/10 shadow-[3px_3px_0px_var(--secondary)]"
                    )}
                  >
                    {/* Note Content (Rendered Markdown) */}
                    <div 
                      className="text-xs font-medium text-foreground break-words leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(note.content) }}
                    />

                    {/* Linked vocab badge */}
                    {note.linked_vocab_id && (
                      <div className="inline-flex items-center gap-1 text-[9px] font-bold text-yellow-800 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded">
                        <span>🔗 Đã liên kết từ vựng</span>
                      </div>
                    )}

                    {/* Tags List */}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag) => (
                          <span 
                            key={tag} 
                            className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border text-[9px] font-black"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-muted/50 text-[10px] text-muted-foreground font-semibold">
                      <span>
                        {new Date(note.updated_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditClick(note)}
                          className="text-secondary hover:underline flex items-center gap-0.5"
                        >
                          <Edit className="w-3 h-3" /> Sửa
                        </button>
                        <button 
                          onClick={() => void handleDeleteClick(note.id)}
                          className="text-danger hover:underline flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
