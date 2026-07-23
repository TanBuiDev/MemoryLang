import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  WandSparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  parseBulkReadingQuestions,
  type ParsedReadingQuestion,
} from '@/utils/readingQuestionImport'
import type { ReadingQuestionOption } from '@/types/reading.types'

export interface ImportedReadingQuestion {
  questionText: string
  options: ReadingQuestionOption[]
}

interface BulkQuestionImportModalProps {
  open: boolean
  onCancel: () => void
  onImport: (questions: ImportedReadingQuestion[]) => void
}

interface ImportDraft extends ParsedReadingQuestion {
  correctIndex: number | null
}

const choiceLabels = ['A', 'B', 'C', 'D']

export function BulkQuestionImportModal({
  open,
  onCancel,
  onImport,
}: BulkQuestionImportModalProps) {
  const [source, setSource] = useState('')
  const [drafts, setDrafts] = useState<ImportDraft[] | null>(null)

  useEffect(() => {
    if (!open) {
      setSource('')
      setDrafts(null)
    }
  }, [open])

  const validDrafts = useMemo(
    () => drafts?.filter((draft) => !draft.error) || [],
    [drafts]
  )
  const canImport = Boolean(
    drafts?.length &&
    drafts.every((draft) => !draft.error && draft.correctIndex !== null)
  )

  if (!open) return null

  const handleAnalyze = () => {
    setDrafts(
      parseBulkReadingQuestions(source).map((question) => ({
        ...question,
        correctIndex: null,
      }))
    )
  }

  const updateDraft = (
    index: number,
    updater: (draft: ImportDraft) => ImportDraft
  ) => {
    setDrafts((current) =>
      current?.map((draft, draftIndex) =>
        draftIndex === index ? updater(draft) : draft
      ) || null
    )
  }

  const handleImport = () => {
    if (!drafts || !canImport) return
    onImport(
      drafts.map((draft) => ({
        questionText: draft.questionText,
        options: draft.options.map((text, index) => ({
          text,
          is_correct: index === draft.correctIndex,
        })),
      }))
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/65"
        onClick={onCancel}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-question-title"
        className="neo-card relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden border-3 border-slate-900 bg-white shadow-[8px_8px_0px_0px_#000]"
      >
        <header className="flex items-start justify-between gap-4 border-b-3 border-slate-900 bg-amber-200 p-5">
          <div>
            <h2
              id="bulk-question-title"
              className="flex items-center gap-2 text-xl font-black text-slate-950"
            >
              <ClipboardPaste size={22} />
              Nhập câu hỏi hàng loạt
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-700">
              Dán mỗi câu trên một dòng. Hệ thống sẽ tách số câu và bốn lựa chọn A–D.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Đóng nhập câu hỏi hàng loạt"
            onClick={onCancel}
            className="h-9 w-9 min-h-0 shrink-0 p-0"
          >
            <X size={18} />
          </Button>
        </header>

        <div className="overflow-y-auto p-5">
          {drafts === null ? (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-slate-900 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase text-blue-900">
                  Định dạng mẫu
                </p>
                <p className="mt-2 font-mono text-sm font-bold text-slate-800">
                  1. A. to B. off C. for D. with
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Hỗ trợ cả A., A), (A) và đáp án gồm nhiều từ.
                </p>
              </div>

              <div>
                <label
                  htmlFor="bulk-question-source"
                  className="mb-2 block text-xs font-black uppercase text-slate-700"
                >
                  Danh sách câu hỏi và lựa chọn
                </label>
                <textarea
                  id="bulk-question-source"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  rows={10}
                  placeholder={'1. A. to B. off C. for D. with\n2. A. called B. helped C. waited D. answered'}
                  className="w-full resize-y rounded-xl border-2 border-slate-900 bg-white p-4 font-serif text-sm font-semibold leading-7 shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!source.trim()}
                >
                  <WandSparkles size={16} />
                  Phân tích danh sách
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black text-slate-950">
                    Đã nhận diện {validDrafts.length} câu hỏi
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    Kiểm tra nội dung và chọn một đáp án đúng cho từng câu.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDrafts(null)}
                >
                  <ArrowLeft size={15} />
                  Sửa nội dung đã dán
                </Button>
              </div>

              {drafts.length === 0 && (
                <div className="rounded-xl border-2 border-rose-700 bg-rose-50 p-4 font-bold text-rose-800">
                  Chưa tìm thấy dòng dữ liệu nào để phân tích.
                </div>
              )}

              {drafts.map((draft, draftIndex) => (
                <article
                  key={`${draft.sourceLine}-${draftIndex}`}
                  className={`rounded-xl border-2 border-slate-900 p-4 shadow-[3px_3px_0px_0px_#000] ${
                    draft.error ? 'bg-rose-50' : 'bg-slate-50'
                  }`}
                >
                  {draft.error ? (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={20} />
                      <div>
                        <p className="font-black text-rose-800">{draft.error}</p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                          {draft.sourceLine}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span className="text-xs font-black uppercase text-slate-700">
                          Câu {draft.number}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={draft.questionText}
                        aria-label={`Nội dung câu ${draft.number}`}
                        onChange={(event) =>
                          updateDraft(draftIndex, (current) => ({
                            ...current,
                            questionText: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border-2 border-slate-900 bg-white p-2 text-sm font-bold"
                      />
                      <div className="grid gap-2 md:grid-cols-2">
                        {draft.options.map((option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-slate-900 bg-white p-2 has-[:checked]:bg-amber-100"
                          >
                            <input
                              type="radio"
                              name={`correct-answer-${draftIndex}`}
                              checked={draft.correctIndex === optionIndex}
                              onChange={() =>
                                updateDraft(draftIndex, (current) => ({
                                  ...current,
                                  correctIndex: optionIndex,
                                }))
                              }
                              aria-label={`Câu ${draft.number}, chọn đáp án ${choiceLabels[optionIndex]}`}
                              className="h-4 w-4 accent-amber-500"
                            />
                            <span className="w-5 text-xs font-black">
                              {choiceLabels[optionIndex]}.
                            </span>
                            <input
                              type="text"
                              value={option}
                              aria-label={`Câu ${draft.number}, nội dung đáp án ${choiceLabels[optionIndex]}`}
                              onChange={(event) =>
                                updateDraft(draftIndex, (current) => ({
                                  ...current,
                                  options: current.options.map((value, index) =>
                                    index === optionIndex ? event.target.value : value
                                  ),
                                }))
                              }
                              className="min-w-0 flex-1 border-0 bg-transparent text-sm font-bold outline-none"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}

              <div className="sticky bottom-0 flex justify-end gap-2 border-t-2 border-slate-900 bg-white pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={!canImport}
                >
                  Thêm {validDrafts.length} câu hỏi
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
