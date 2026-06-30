import { useEffect, useRef, useState } from 'react'
import { FileText, X, Bold, Underline, List, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { notesService, type QuickNote } from '@/services/supabase/notes.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { cn } from '@/utils/cn'
import { supabase } from '@/services/supabase/client'

interface QuickNotesDrawerProps {
  isOpen: boolean
  onClose: () => void
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

// Get Vietnamese Date Label
function getLocalDateLabel(dateString: string): string {
  const noteDate = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  
  if (noteDate.toDateString() === today.toDateString()) {
    return 'Hôm nay'
  } else if (noteDate.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua'
  } else {
    return noteDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
}

// Group notes by date label
function groupNotesByDate(notesList: QuickNote[]): Record<string, QuickNote[]> {
  const groups: Record<string, QuickNote[]> = {}
  notesList.forEach((note) => {
    const label = getLocalDateLabel(note.updated_at)
    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(note)
  })
  return groups
}

export function QuickNotesDrawer({ isOpen, onClose }: QuickNotesDrawerProps) {
  const user = useAuthStore((s) => s.user)
  const userId = user?.id || 'demo-user'

  const [notes, setNotes] = useState<QuickNote[]>([])
  const [content, setContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  
  // Custom delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Collapsible date groups
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})

  // Admin limits
  const [maxCount, setMaxCount] = useState(50)
  const [maxLength, setMaxLength] = useState(1000)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load notes and limits when open
  useEffect(() => {
    if (isOpen) {
      void fetchNotes()
      void fetchLimits()
    }
  }, [isOpen, userId])

  const fetchNotes = async () => {
    const list = await notesService.getNotes(userId)
    setNotes(list)
  }

  const fetchLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['quick_notes_max_count', 'quick_notes_max_length'])
      
      if (!error && data) {
        data.forEach((s) => {
          if (s.key === 'quick_notes_max_count') {
            setMaxCount(Number(s.value) || 50)
          } else if (s.key === 'quick_notes_max_length') {
            setMaxLength(Number(s.value) || 1000)
          }
        })
      }
    } catch (e) {
      console.warn('Failed to load settings limits:', e)
    }
  }

  // Initialize expanded dates state (first group is open, others closed by default)
  useEffect(() => {
    if (notes.length > 0) {
      const grouped = groupNotesByDate(notes)
      const dateLabels = Object.keys(grouped)
      if (dateLabels.length > 0) {
        setExpandedDates((prev) => {
          const next = { ...prev }
          dateLabels.forEach((label, idx) => {
            if (next[label] === undefined) {
              next[label] = idx === 0 // Only expand the newest date group
            }
          })
          return next
        })
      }
    }
  }, [notes])

  // Handle Save
  const handleSave = async (activeContent: string): Promise<boolean> => {
    const trimmed = activeContent.trim()
    if (!trimmed) return false

    // Check character length
    if (trimmed.length > maxLength) {
      alert(`Ghi chú không được vượt quá ${maxLength} ký tự!`)
      return false
    }

    // Check count limit for new notes
    if (!editingNoteId && notes.length >= maxCount) {
      alert(`Bạn đã đạt giới hạn tối đa ${maxCount} ghi chú. Vui lòng xóa bớt ghi chú cũ để thêm mới!`)
      return false
    }

    setSaveStatus('saving')
    setIsSaving(true)

    try {
      const savedNote = await notesService.saveNote({
        id: editingNoteId || undefined,
        userId,
        content: trimmed,
        tags: []
      })

      setNotes((prev) => {
        const index = prev.findIndex((n) => n.id === savedNote.id)
        if (index > -1) {
          const updated = [...prev]
          updated[index] = savedNote
          return updated
        }
        return [savedNote, ...prev]
      })

      // Reset editor
      setContent('')
      setEditingNoteId(null)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
      return true
    } catch (e) {
      console.error('Error saving note:', e)
      setSaveStatus('idle')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Save & Close
  const handleClose = async () => {
    if (content.trim()) {
      const trimmed = content.trim()
      // Save silently if valid
      if (trimmed.length <= maxLength && (editingNoteId || notes.length < maxCount)) {
        await handleSave(trimmed)
      }
    }
    onClose()
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
      newText = text.substring(0, start) + '\n- ' + text.substring(end)
      cursorOffset = start + 3
    } else {
      const selection = text.substring(start, end)
      newText = text.substring(0, start) + syntax + selection + syntax + text.substring(end)
      cursorOffset = end + syntax.length
    }

    setContent(newText)
    textarea.focus()
    setTimeout(() => {
      textarea.setSelectionRange(cursorOffset, cursorOffset)
    }, 0)
  }

  const handleEditClick = (note: QuickNote) => {
    setEditingNoteId(note.id)
    setContent(note.content)
    textareaRef.current?.focus()
  }

  const handleDeleteClickState = (id: string) => {
    setConfirmDeleteId(id)
  }

  const confirmDelete = async (id: string) => {
    await notesService.deleteNote(id, userId)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setConfirmDeleteId(null)
    if (editingNoteId === id) {
      setEditingNoteId(null)
      setContent('')
    }
  }

  const handleNewNoteClick = () => {
    setEditingNoteId(null)
    setContent('')
    textareaRef.current?.focus()
  }

  const toggleGroup = (label: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [label]: !prev[label]
    }))
  }

  if (!isOpen) return null

  const groupedNotes = groupNotesByDate(notes)

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        onClick={() => { void handleClose() }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
      />

      {/* Notepad Dialog Modal */}
      <div className={cn(
        "relative bg-background border-[3px] border-border flex flex-col w-full max-w-lg rounded-xl shadow-[4px_4px_0px_#1c293c] z-10 max-h-[85vh] overflow-hidden transition-all transform scale-100 duration-200 animate-in zoom-in-95"
      )}>
        {/* Header */}
        <div className="bg-primary p-4 border-b-[3px] border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1c293c]">
            <FileText className="w-5 h-5" />
            <span className="font-black text-base">Sổ Tay Ghi Chú Nhanh</span>
          </div>
          <button 
            type="button"
            onClick={() => { void handleClose() }}
            className="p-1 border-2 border-border rounded bg-white text-foreground hover:bg-muted active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
          {/* Note Editor */}
          <div className="neo-card bg-white p-4 space-y-3 relative border-2 border-border shadow-[2px_2px_0px_#1c293c]">
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

              {/* Save Status (saving/saved) */}
              <div className="text-[10px] font-bold ml-2">
                {saveStatus === 'saving' && (
                  <span className="text-secondary">Đang lưu...</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-600">✓ Đã lưu</span>
                )}
              </div>

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

            {/* Textarea with embedded character limit */}
            <div className="relative w-full">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập ghi chú ý tưởng, từ mới bắt gặp... (Hỗ trợ Markdown cơ bản)"
                rows={4}
                maxLength={maxLength}
                className="w-full text-sm font-semibold p-3 pb-7 border-2 border-border rounded bg-amber-50/10 focus:bg-white focus:outline-none transition-all placeholder:text-muted-foreground/60 resize-none"
              />
              <div className="absolute bottom-2.5 right-3 text-[9px] font-mono font-black text-muted-foreground/80 pointer-events-none select-none">
                {content.length}/{maxLength}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={() => void handleSave(content)}
              disabled={!content.trim() || isSaving}
              className="w-full neo-button py-2 bg-primary text-foreground text-xs font-black hover:bg-[#ffe05c] active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {editingNoteId ? 'Lưu cập nhật' : 'Lưu ghi chú'}
            </button>
          </div>

          {/* Grouped Notes List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b-2 border-border pb-1">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                Ghi Chú Đã Lưu ({notes.length}/{maxCount})
              </h3>
            </div>
            
            {notes.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground font-medium border-2 border-dashed border-border rounded bg-white">
                Chưa có ghi chú nào. Hãy tạo ghi chú đầu tiên của bạn!
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedNotes).map(([dateLabel, notesGroup]) => {
                  const isExpanded = !!expandedDates[dateLabel]
                  return (
                    <div key={dateLabel} className="space-y-1.5">
                      {/* Date Group Header */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(dateLabel)}
                        className="w-full flex items-center justify-between px-2 py-1 bg-muted hover:bg-muted/80 border-2 border-border rounded text-xs font-black text-foreground transition-all"
                      >
                        <span>📅 {dateLabel} ({notesGroup.length})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* Date Group Notes Container */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 gap-3 pl-1 pt-2.5 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          {notesGroup.map((note) => (
                            <div 
                              key={note.id} 
                              onClick={() => handleEditClick(note)}
                              className={cn(
                                "relative bg-white p-3 pr-8 rounded-lg border-2 border-border shadow-[2px_2px_0px_#1c293c] cursor-pointer hover:bg-muted/30 transition-all select-none",
                                editingNoteId === note.id && "border-secondary bg-indigo-50/10 shadow-[3px_3px_0px_var(--secondary)]"
                              )}
                              title="Bấm vào để chỉnh sửa"
                            >
                              {/* Content */}
                              <div 
                                className="text-xs font-medium text-foreground break-words leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: parseMarkdown(note.content) }}
                              />

                              {/* Rounded X button to Delete (on the border) */}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClickState(note.id)
                                }}
                                title="Xóa ghi chú"
                                className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full border-2 border-border bg-danger text-white flex items-center justify-center hover:bg-red-600 transition-all active:scale-95 shadow-[1px_1px_0px_#1c293c] z-30"
                              >
                                <X className="w-2.5 h-2.5 stroke-[4px]" />
                              </button>

                              {/* Custom Inline Confirmation Overlay */}
                              {confirmDeleteId === note.id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()} // Prevent editing on overlay click
                                  className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-between px-3 py-2 z-20 border-2 border-dashed border-danger animate-in fade-in duration-150"
                                >
                                  <span className="text-[11px] font-black text-danger">Xóa ghi chú này?</span>
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => void confirmDelete(note.id)}
                                      className="px-2 py-0.5 bg-danger text-white text-[9px] font-black border border-border shadow-[1px_1px_0_#1c293c] rounded active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none hover:bg-red-600"
                                    >
                                      Xóa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2 py-0.5 bg-muted text-foreground text-[9px] font-black border border-border shadow-[1px_1px_0_#1c293c] rounded active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none hover:bg-white"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
