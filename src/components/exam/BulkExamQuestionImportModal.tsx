import { useState } from 'react'
import {
  ClipboardPaste,
  WandSparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  parseExamQuestionsText,
  type ParsedExamQuestion,
} from '@/utils/examQuestionImport'
import type { ExamQuestion } from '@/types/exam.types'

interface BulkExamQuestionImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (parsedQuestions: Partial<ExamQuestion>[]) => void
}

export function BulkExamQuestionImportModal({
  open,
  onClose,
  onImport,
}: BulkExamQuestionImportModalProps) {
  const [rawInput, setRawInput] = useState('')
  const [parsedList, setParsedList] = useState<ParsedExamQuestion[] | null>(null)

  if (!open) return null

  const handleAnalyze = () => {
    if (!rawInput.trim()) return
    const results = parseExamQuestionsText(rawInput)
    setParsedList(results)
  }

  const handleSelectCorrectOption = (qIdx: number, optKey: string) => {
    if (!parsedList) return
    setParsedList((prev) =>
      (prev || []).map((q, idx) => {
        if (idx !== qIdx) return q
        const updatedOpts = q.options.map((opt) => ({
          ...opt,
          is_correct: opt.key === optKey,
        }))
        return { ...q, options: updatedOpts }
      })
    )
  }

  const handleConfirmImport = () => {
    if (!parsedList || parsedList.length === 0) return

    const formatted: Partial<ExamQuestion>[] = parsedList.map((item, idx) => ({
      question_number: item.questionNumber || idx + 101,
      question_text: item.questionText,
      question_type: 'multiple_choice',
      options: item.options,
      points: 1,
      explanation_html: '',
    }))

    onImport(formatted)
    onClose()
    setRawInput('')
    setParsedList(null)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="neo-card p-6 bg-card border-3 border-border shadow-[6px_6px_0_var(--border)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col gap-4 animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-border pb-3 shrink-0">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <ClipboardPaste size={22} className="text-primary" />
              NHẬP NHANH CÂU HỎI & ĐÁP ÁN (COPY / PASTE)
            </h2>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              Dán văn bản đề thi từ PDF, Word hoặc sách ETS. Hệ thống sẽ tự động tách số câu, nội dung và 4 đáp án A, B, C, D.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
          {parsedList === null ? (
            <div className="flex flex-col gap-4">
              {/* Sample Format Alert */}
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col gap-1 text-xs font-bold text-amber-950">
                <span className="font-black text-amber-900 flex items-center gap-1">
                  <WandSparkles size={14} /> Định dạng mẫu được hỗ trợ (Từ PDF / ETS / Word):
                </span>
                <pre className="font-mono text-[11px] bg-amber-100/70 p-2 rounded border border-amber-200 mt-1 whitespace-pre-wrap leading-relaxed">
{`101. The lecture will take place at 6:00 P.M., ------- which attendees may ask questions.
(A) across
(B) after
(C) inside
(D) among`}
                </pre>
                <span className="text-[11px] text-amber-800 italic mt-1">
                  * Hỗ trợ cả định dạng 1 dòng `101. Question text... (A) optA (B) optB (C) optC (D) optD` hoặc nhiều dòng rời rạc.
                </span>
              </div>

              {/* Textarea Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-foreground">Dán nội dung câu hỏi tại đây *</label>
                <textarea
                  rows={10}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="Dán nội dung từ PDF hoặc tài liệu Word của bạn vào đây..."
                  className="w-full p-3 border-2 border-border rounded-xl bg-background text-xs font-mono font-bold focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="primary"
                  onClick={handleAnalyze}
                  disabled={!rawInput.trim()}
                  className="px-5 text-xs font-black"
                >
                  <WandSparkles size={16} />
                  Phân tích & Tách dữ liệu
                </Button>
              </div>
            </div>
          ) : (
            /* Parsed Preview List */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-300 p-3 rounded-xl">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Đã phân tích được {parsedList.length} câu hỏi. Hãy chọn Đáp án đúng (A/B/C/D) cho mỗi câu!
                </span>
                <button
                  type="button"
                  onClick={() => setParsedList(null)}
                  className="text-xs font-bold text-slate-700 hover:underline"
                >
                  ← Dán lại văn bản khác
                </button>
              </div>

              <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
                {parsedList.map((item, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-4 border-2 border-border rounded-xl bg-card shadow-[2px_2px_0_var(--border)] flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-primary">Câu {qIdx + 1}</span>
                        <span className="text-xs font-bold text-muted-foreground">(Số thứ tự:</span>
                        <input
                          type="number"
                          value={item.questionNumber || qIdx + 101}
                          onChange={(e) => {
                            const updated = [...parsedList]
                            updated[qIdx].questionNumber = Number(e.target.value)
                            setParsedList(updated)
                          }}
                          className="w-16 px-1.5 py-0.5 border border-border rounded text-xs font-black text-center"
                        />
                        <span className="text-xs font-bold text-muted-foreground">)</span>
                      </div>

                      {item.error && (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                          <AlertCircle size={12} /> {item.error}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-black text-foreground">Nội dung câu hỏi</label>
                      <input
                        type="text"
                        value={item.questionText}
                        onChange={(e) => {
                          const updated = [...parsedList]
                          updated[qIdx].questionText = e.target.value
                          setParsedList(updated)
                        }}
                        className="px-2.5 py-1.5 border border-border rounded-lg text-xs font-bold bg-background focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Choices A, B, C, D selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {item.options.map((opt) => (
                        <div
                          key={opt.key}
                          onClick={() => handleSelectCorrectOption(qIdx, opt.key)}
                          className={`flex items-center gap-2 p-2 border-2 rounded-lg cursor-pointer transition ${
                            opt.is_correct
                              ? 'border-emerald-500 bg-emerald-50/70 font-black'
                              : 'border-border bg-background hover:bg-muted/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_opt_modal_${qIdx}`}
                            checked={opt.is_correct}
                            onChange={() => handleSelectCorrectOption(qIdx, opt.key)}
                            className="accent-emerald-600 cursor-pointer"
                          />
                          <span className="text-xs font-black">{opt.key}.</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...parsedList]
                              updated[qIdx].options = updated[qIdx].options.map((o) =>
                                o.key === opt.key ? { ...o, text: e.target.value } : o
                              )
                              setParsedList(updated)
                            }}
                            className="flex-1 px-1.5 py-0.5 text-xs font-bold bg-transparent border-b border-border/40 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t-2 border-border">
                <Button variant="ghost" onClick={() => setParsedList(null)}>
                  Quay lại
                </Button>
                <Button variant="primary" onClick={handleConfirmImport} className="px-6 text-xs font-black">
                  <Plus size={16} />
                  Nhập {parsedList.length} câu hỏi vào Cụm bài
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
