import { useEffect, useRef, useState } from 'react'
import { Plus, X, Loader2, Save, Crown, Lock } from 'lucide-react'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useLanguageStore } from '@/stores/useLanguageStore'
import { cn } from '@/utils/cn'
import { supabase } from '@/services/supabase/client'
import { Select } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

interface AddVocabularyModalProps {
  isOpen: boolean
  onClose: () => void
  initialWord?: string
  onSuccess?: () => void
}

export function AddVocabularyModal({ isOpen, onClose, initialWord, onSuccess }: AddVocabularyModalProps) {
  const navigate = useNavigate()
  const canAddTerm = useSubscriptionStore((s) => s.canAddTerm)
  const termCount = useSubscriptionStore((s) => s.termCount)
  const user = useAuthStore((s) => s.user)
  const userId = user?.id || 'demo-user'

  const nativeLanguage = useLanguageStore((s) => s.nativeLanguage)
  const targetLanguage = useLanguageStore((s) => s.targetLanguage)

  const [word, setWord] = useState('')
  const [pos, setPos] = useState('noun')
  const [translation, setTranslation] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const formRef = useRef<HTMLFormElement>(null)
  const wordInputRef = useRef<HTMLInputElement>(null)

  const [posOptions, setPosOptions] = useState<{ value: string; label: string }[]>([
    { value: 'noun', label: 'Danh từ (Noun)' },
    { value: 'verb', label: 'Động từ (Verb)' },
    { value: 'adjective', label: 'Tính từ (Adjective)' },
    { value: 'adverb', label: 'Trạng từ (Adverb)' },
    { value: 'phrase', label: 'Cụm từ (Phrase)' },
    { value: 'idiom', label: 'Thành ngữ (Idiom)' },
    { value: 'sentence', label: 'Câu (Sentence)' }
  ])

  useEffect(() => {
    if (isOpen) {
      setWord(initialWord ?? '')
      setTranslation('')
      setPos('noun')
      setSaveStatus('idle')
      setErrorMessage('')
      void fetchPosOptions()
      setTimeout(() => wordInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const fetchPosOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'vocabulary_pos_options')
        .maybeSingle()
      if (!error && data?.value) {
        let parsed = data.value
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed)
        }
        if (Array.isArray(parsed)) {
          setPosOptions(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to load POS options:', e)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!word.trim()) return

    setIsSaving(true)
    setSaveStatus('saving')
    setErrorMessage('')

    const trimmedWord = word.trim()
    const trimmedTranslation = translation.trim()

    // Determine item type
    let itemType: 'word' | 'phrase' | 'idiom' | 'sentence' = 'word'
    if (trimmedWord.split(/\s+/).length > 4) {
      itemType = 'sentence'
    } else if (trimmedWord.split(/\s+/).length > 1) {
      itemType = 'phrase'
    }

    try {
      await vocabularyService.create(userId, {
        source_text: trimmedWord,
        source_language: targetLanguage,
        native_language: nativeLanguage,
        item_type: itemType,
        part_of_speech: pos || null,
        ipa: null,
        audio_url: '',
        image_url: '',
        note: '',
        translation: trimmedTranslation || null,
        meanings: trimmedTranslation ? [{ text: trimmedTranslation, language: nativeLanguage }] : [],
        examples: [],
        tags: [],
        deck_ids: []
      })

      setSaveStatus('saved')
      onSuccess?.()
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      console.error('Error creating vocabulary item:', err)
      setSaveStatus('error')
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi thêm từ vựng.')
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  if (!canAddTerm) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        />
        <div
          className="relative w-full max-w-md bg-white border-[3px] border-[#1c293c] shadow-[8px_8px_0_#1c293c] rounded-lg p-6 flex flex-col gap-4 animate-in zoom-in duration-200 z-10 text-left"
        >
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FFF9E5] border-2 border-[#1c293c] mb-3 shadow-[2px_2px_0_#1c293c]">
              <Lock className="w-6 h-6 text-[#1c293c]" />
            </div>
            <h3 className="text-lg font-black text-[#1c293c]">Giới hạn từ vựng đã đạt</h3>
            <p className="text-xs text-[#64748b] mt-1">
              Bạn đã dùng hết {termCount}/100 từ vựng miễn phí. Nâng cấp Pro để thêm không giới hạn!
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => {
                onClose()
                navigate('/app/upgrade')
              }}
              className="neo-button neo-button-active justify-center font-bold bg-[#fdc800] hover:bg-[#e6b800] text-[#1c293c] py-2 border-2 border-[#1c293c] flex items-center gap-1.5"
            >
              <span>Nâng cấp Pro — 49k/tháng</span>
              <Crown className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="neo-button justify-center py-2 border-2 border-[#1c293c]"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
      />

      {/* Dialog Modal Container */}
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isSaving && saveStatus !== 'saved') {
            const target = e.target as HTMLElement
            if (target.closest('[role="listbox"]') || target.closest('[role="option"]')) return
            e.preventDefault()
            formRef.current?.requestSubmit()
          }
        }}
        className={cn(
        "relative bg-background border-[3px] border-border flex flex-col w-full max-w-md rounded-xl shadow-[4px_4px_0px_#1c293c] z-10 transition-all transform scale-100 duration-200 animate-in zoom-in-95"
      )}>
        {/* Header */}
        <div className="bg-primary p-4 border-b-[3px] border-border flex items-center justify-between rounded-t-[9px]">
          <div className="flex items-center gap-2 text-[#1c293c]">
            <Plus className="w-5 h-5" />
            <span className="font-black text-base">Thêm Từ Vựng Mới</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 border-2 border-border rounded bg-white text-foreground hover:bg-muted active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form ref={formRef} onSubmit={handleSave} className="p-4 space-y-4">
          {saveStatus === 'saved' ? (
            <div className="text-center py-8 space-y-2 animate-in zoom-in duration-200">
              <div className="w-12 h-12 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-600 text-2xl font-black shadow-[2px_2px_0_#1c293c]">
                ✓
              </div>
              <p className="text-sm font-black text-emerald-600">Đã thêm từ vựng thành công!</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3 border-2 border-danger bg-red-50 text-danger text-xs font-bold rounded-lg leading-relaxed">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Text Gốc */}
              <div className="space-y-1">
                <label className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                  Từ / Cụm từ gốc ({targetLanguage.toUpperCase()})
                </label>
                <input
                  ref={wordInputRef}
                  type="text"
                  required
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="e.g. delicious, check in..."
                  className="w-full text-sm font-bold px-3 py-2 border-2 border-border rounded bg-card focus:outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              {/* Loại từ */}
              <div className="space-y-1">
                <label className="text-xs font-black text-foreground uppercase tracking-wider">
                  Loại từ
                </label>
                <Select
                  value={pos}
                  onChange={(val) => setPos(val)}
                  options={posOptions}
                />
              </div>

              {/* Bản dịch */}
              <div className="space-y-1">
                <label className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                  Bản dịch tiếng Việt
                </label>
                <input
                  type="text"
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  placeholder="e.g. thơm ngon, làm thủ tục vào..."
                  className="w-full text-sm font-bold px-3 py-2 border-2 border-border rounded bg-card focus:outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving || !word.trim()}
                  className="w-full neo-button py-2 bg-secondary text-secondary-foreground hover:bg-[#321fb0] flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Thêm từ
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
