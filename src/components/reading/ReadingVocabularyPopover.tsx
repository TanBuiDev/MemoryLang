import { Volume2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReadingArticleTerm } from '@/types/reading.types'
import { derivePartOfSpeech, deriveTranslation, type Meaning } from '@/types/vocabulary.types'

interface ReadingVocabularyPopoverProps {
  term: ReadingArticleTerm
  position: { x: number; y: number }
  onClose: () => void
}

interface MeaningGroup {
  partOfSpeech: string
  translations: string[]
}

function groupMeaningsByPartOfSpeech(meanings: Meaning[]): MeaningGroup[] {
  const groups = new Map<string, string[]>()

  meanings.forEach((meaning) => {
    const translation = meaning.translation?.trim() || meaning.text.trim()
    if (!translation) return

    const partOfSpeech = meaning.part_of_speech?.trim() || 'Khác'
    const translations = groups.get(partOfSpeech) || []
    if (!translations.includes(translation)) translations.push(translation)
    groups.set(partOfSpeech, translations)
  })

  return Array.from(groups, ([partOfSpeech, translations]) => ({
    partOfSpeech,
    translations,
  }))
}

export function ReadingVocabularyPopover({
  term,
  position,
  onClose,
}: ReadingVocabularyPopoverProps) {
  const legacyMeaning = term.meanings
    .map((meaning) => meaning.translation?.trim() || meaning.text.trim())
    .filter(Boolean)
    .join('; ')
  const translation = term.translation || deriveTranslation(term.meanings) || legacyMeaning || 'Chưa có nghĩa'
  const partOfSpeech = term.part_of_speech || derivePartOfSpeech(term.meanings)
  const meaningGroups = groupMeaningsByPartOfSpeech(term.meanings)
  const hasGroupedMeanings = meaningGroups.length > 0
  const left = Math.max(12, Math.min(position.x, window.innerWidth - 352))
  const top = Math.max(12, Math.min(position.y + 12, window.innerHeight - 420))

  const handlePlayAudio = () => {
    if (!term.audio_url) return
    void new Audio(term.audio_url).play()
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-label="Đóng thông tin từ"
        className="fixed inset-0 z-40 h-auto w-auto cursor-default rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-label={`Thông tin từ ${term.source_text}`}
        className="fixed z-50 max-h-[calc(100vh-24px)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[5px_5px_0px_0px_#1c293c]"
        style={{ left, top }}
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-slate-200 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-900">{term.source_text}</h3>
              {partOfSpeech && !hasGroupedMeanings && (
                <span className="rounded-md border border-slate-900 bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-900">
                  {partOfSpeech}
                </span>
              )}
            </div>
            {term.ipa && (
              <p className="mt-1 font-mono text-xs font-bold text-slate-600">{term.ipa}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Đóng"
            onClick={onClose}
            className="h-8 w-8 min-h-0 shrink-0 p-0"
          >
            <X size={15} />
          </Button>
        </div>

        <div className="pt-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Nghĩa tiếng Việt
          </p>
          {hasGroupedMeanings ? (
            <div className="mt-2 space-y-2">
              {meaningGroups.map((group) => (
                <div
                  key={group.partOfSpeech}
                  className="grid grid-cols-[auto_1fr] items-start gap-2 rounded-lg border border-slate-900 bg-slate-50 p-2.5"
                >
                  <span className="rounded-md border border-slate-900 bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-900">
                    {group.partOfSpeech}
                  </span>
                  <p className="text-sm font-bold leading-relaxed text-slate-900">
                    {group.translations.join('; ')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm font-bold leading-relaxed text-slate-900">
              {translation}
            </p>
          )}
        </div>

        {term.audio_url && (
          <Button
            type="button"
            variant="secondary"
            aria-label={`Phát âm ${term.source_text}`}
            onClick={handlePlayAudio}
            className="mt-4 w-full"
          >
            <Volume2 size={16} />
            Nghe phát âm
          </Button>
        )}
      </section>
    </>
  )
}
