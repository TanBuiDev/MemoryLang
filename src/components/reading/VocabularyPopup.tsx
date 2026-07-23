import { useState, useEffect } from 'react'
import { Volume2, Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { showToast } from '@/components/ui/toast'
import { generateAudio } from '@/services/api/generateAudio.api'

interface VocabularyPopupProps {
  word: string
  contextSentence?: string
  articleId?: string
  onClose: () => void
  onWordAdded?: (word: string) => void
}

interface TermDetail {
  word: string
  ipa?: string
  partOfSpeech?: string
  viMeaning?: string
  enDefinition?: string
}

export function VocabularyPopup({
  word,
  contextSentence,
  onClose,
  onWordAdded,
}: VocabularyPopupProps) {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState<TermDetail | null>(null)
  const [added, setAdded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [playingAudio, setPlayingAudio] = useState(false)

  const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase().trim()

  useEffect(() => {
    async function fetchWordDefinition() {
      try {
        setLoading(true)
        setTerm({
          word: cleanWord,
          ipa: `/${cleanWord}/`,
          partOfSpeech: 'word',
          viMeaning: `Nghĩa của từ "${cleanWord}" trong ngữ cảnh bài đọc.`,
          enDefinition: 'Word definition extracted from reading context.',
        })
      } catch (err) {
        console.error('Error in VocabularyPopup fetch:', err)
      } finally {
        setLoading(false)
      }
    }

    if (cleanWord) {
      void fetchWordDefinition()
    }
  }, [cleanWord])

  const handlePlayAudio = async () => {
    if (!term?.word) return
    try {
      setPlayingAudio(true)
      const res = await generateAudio(term.word, 'en-US')
      if (res.audioUrl) {
        const audio = new Audio(res.audioUrl)
        await audio.play()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPlayingAudio(false)
    }
  }

  const handleAddToStudy = async () => {
    if (!term || added || !user?.id) return
    try {
      setAdding(true)
      await vocabularyService.create(user.id, {
        source_text: term.word,
        source_language: 'en',
        native_language: 'vi',
        item_type: 'word',
        part_of_speech: term.partOfSpeech || 'noun',
        ipa: term.ipa,
        meanings: [{ language: 'vi', translation: term.viMeaning || 'Nghĩa từ bài đọc', text: term.word }],
        examples: contextSentence ? [{ sentence: contextSentence, translation: '' }] : [],
        tags: ['reading'],
        deck_ids: [],
      })
      setAdded(true)
      showToast({ type: 'success', title: 'Đã thêm từ vựng', message: `Đã thêm "${term.word}" vào sổ từ vựng cá nhân.` })
      if (onWordAdded) onWordAdded(term.word)
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Không thể thêm từ', message: err.message || 'Lỗi khi thêm vào bộ từ' })
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl w-full max-w-sm relative space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 neo-button p-1 rounded-lg border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
        >
          <X size={16} />
        </button>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-3 border-slate-900 border-t-[#fdc800] rounded-full animate-spin" />
            <span className="text-xs font-black text-slate-700">Đang tra từ điển...</span>
          </div>
        ) : term ? (
          <>
            {/* Header & Pronunciation */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 pr-6">
                <h3 className="text-xl font-black text-slate-900">{term.word}</h3>
                {term.partOfSpeech && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-slate-900 shadow-[1px_1px_0px_0px_#000]">
                    {term.partOfSpeech}
                  </span>
                )}
              </div>
              {term.ipa && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">{term.ipa}</span>
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    disabled={playingAudio}
                    className="p-1 rounded-md border border-slate-900 bg-amber-200 hover:bg-amber-300 text-slate-900 cursor-pointer shadow-[1px_1px_0px_0px_#000]"
                    title="Phát âm"
                  >
                    <Volume2 size={14} className={playingAudio ? 'animate-pulse' : ''} />
                  </button>
                </div>
              )}
            </div>

            {/* Vietnamese Meaning */}
            <div className="p-3 bg-amber-50 border-2 border-slate-900 rounded-xl space-y-1 shadow-[2px_2px_0px_0px_#000]">
              <span className="text-[10px] font-black uppercase text-amber-900">Nghĩa tiếng Việt</span>
              <p className="text-sm font-black text-slate-900">🇻🇳 {term.viMeaning}</p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleAddToStudy}
                disabled={added || adding}
                className={`neo-button w-full py-2.5 h-10 text-xs font-black border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer ${
                  added ? 'bg-emerald-300 text-emerald-950' : 'bg-[#fdc800] hover:bg-amber-300 text-slate-900'
                }`}
              >
                {adding ? (
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : added ? (
                  <>
                    <Check size={16} />
                    <span>Đã thêm vào danh sách học</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Thêm vào danh sách học</span>
                  </>
                )}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
