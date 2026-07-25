import { useEffect, useState } from 'react'
import {
  ClipboardPaste,
  WandSparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Camera,
  FileText,
  Upload,
  Loader2,
  ImageIcon,
  Sparkles,
  KeyRound,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  parseExamQuestionsText,
  type ParsedExamQuestion,
} from '@/utils/examQuestionImport'
import {
  parseQuestionsFromImage,
  type OcrProgressInfo,
} from '@/utils/imageOcrQuestionParser'
import {
  parseQuestionsWithGeminiVision,
  testGeminiApiKeyAndModel,
  fileToBase64,
} from '@/utils/geminiVisionParser'
import { adminSecretsService, type AiModelConfigItem } from '@/services/supabase/adminSecrets.service'
import type { ExamQuestion } from '@/types/exam.types'

interface BulkExamQuestionImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (parsedQuestions: Partial<ExamQuestion>[]) => void
}

type ImportMode = 'text' | 'ocr' | 'ai_vision'

export function BulkExamQuestionImportModal({
  open,
  onClose,
  onImport,
}: BulkExamQuestionImportModalProps) {
  const [mode, setMode] = useState<ImportMode>('text')
  const [rawInput, setRawInput] = useState('')
  const [parsedList, setParsedList] = useState<ParsedExamQuestion[] | null>(null)

  // OCR Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OcrProgressInfo | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)

  // AI Vision state
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiModelInput, setApiModelInput] = useState('gemini-2.0-flash')
  const [customModelText, setCustomModelText] = useState('')
  const [dbAiModels, setDbAiModels] = useState<AiModelConfigItem[]>([])
  const [isVaultConfigured, setIsVaultConfigured] = useState(false)
  const [showKeyEdit, setShowKeyEdit] = useState(false)
  const [aiVisionLoading, setAiVisionLoading] = useState(false)
  const [aiVisionError, setAiVisionError] = useState<string | null>(null)
  const [keySavedBadge, setKeySavedBadge] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [keyErrorMsg, setKeyErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setRawInput('')
      setParsedList(null)
      setImagePreview(null)
      setOcrLoading(false)
      setOcrProgress(null)
      setOcrError(null)
      setAiVisionLoading(false)
      setAiVisionError(null)
      setTestingKey(false)
      setKeyErrorMsg(null)
      setApiKeyInput('')
    } else {
      void (async () => {
        try {
          const [secrets, models] = await Promise.all([
            adminSecretsService.getSecretsOverview(),
            adminSecretsService.getAiModels(),
          ])
          setDbAiModels(models)
          const geminiSecret = secrets.find((s) => s.key_name === 'GEMINI_API_KEY')
          setIsVaultConfigured(Boolean(geminiSecret?.is_configured))

          const defModel = models.find((m) => m.is_default) || models[0]
          if (defModel) setApiModelInput(defModel.model_name)
        } catch {
          // ignore
        }
      })()
    }
  }, [open])

  // Listen to Global Paste Event inside modal for pasting screenshots (Ctrl + V)
  useEffect(() => {
    if (!open || (mode !== 'ocr' && mode !== 'ai_vision')) return

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) {
            if (mode === 'ocr') {
              void processOcrImageFile(file)
            } else if (mode === 'ai_vision') {
              void processAiVisionImageFile(file)
            }
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [open, mode, apiKeyInput, apiModelInput, customModelText])

  if (!open) return null

  const handleAnalyzeText = () => {
    if (!rawInput.trim()) return
    const results = parseExamQuestionsText(rawInput)
    setParsedList(results)
  }

  const processOcrImageFile = async (file: File) => {
    try {
      setOcrLoading(true)
      setOcrError(null)
      setOcrProgress({ status: 'Starting OCR engine', progress: 5 })

      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)

      const result = await parseQuestionsFromImage(file, (progress) => {
        setOcrProgress(progress)
      })

      setRawInput(result.extractedText)
      setParsedList(result.questions)
    } catch (err: any) {
      console.error(err)
      setOcrError('Không thể nhận diện chữ từ tệp ảnh này. Vui lòng thử lại với ảnh rõ nét hơn.')
    } finally {
      setOcrLoading(false)
      setOcrProgress(null)
    }
  }

  const processAiVisionImageFile = async (file: File) => {
    try {
      setAiVisionLoading(true)
      setAiVisionError(null)

      const base64 = await fileToBase64(file)
      setImagePreview(base64)

      const targetModel =
        apiModelInput === 'custom'
          ? customModelText.trim()
          : apiModelInput.trim()

      const questions = await parseQuestionsWithGeminiVision(
        base64,
        apiKeyInput.trim() || undefined,
        targetModel || undefined
      )
      setParsedList(questions)
    } catch (err: any) {
      console.error(err)
      setAiVisionError(err.message || 'Không thể bóc tách ảnh bằng AI Vision. Vui lòng kiểm tra lại API Key và Model.')
    } finally {
      setAiVisionLoading(false)
    }
  }

  const handleOcrFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void processOcrImageFile(file)
    }
  }

  const handleAiVisionFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void processAiVisionImageFile(file)
    }
  }

  const handleSaveApiKey = async () => {
    const targetModel =
      apiModelInput === 'custom'
        ? customModelText.trim()
        : apiModelInput.trim()

    if (!apiKeyInput.trim() && !isVaultConfigured) {
      setKeyErrorMsg('Vui lòng dán Gemini API Key mới vào đây.')
      return
    }

    setTestingKey(true)
    setKeyErrorMsg(null)

    try {
      if (apiKeyInput.trim()) {
        const testRes = await testGeminiApiKeyAndModel(apiKeyInput.trim(), targetModel)
        if (!testRes.ok) {
          setKeyErrorMsg(testRes.message)
          setTestingKey(false)
          return
        }

        // Save secret securely to Postgres DB Vault
        await adminSecretsService.saveSecret(
          'GEMINI_API_KEY',
          apiKeyInput.trim(),
          'Google Gemini API Key'
        )
      }

      if (targetModel) {
        await adminSecretsService.saveVerifiedAiModel(targetModel, 'gemini')
      }

      setIsVaultConfigured(true)
      setKeySavedBadge(true)
      setApiKeyInput('') // Immediately purge cleartext string from memory
      setTimeout(() => setKeySavedBadge(false), 2500)
      setShowKeyEdit(false)
    } catch (err: any) {
      setKeyErrorMsg(err.message || 'Lỗi khi lưu cấu hình vào Database Vault')
    } finally {
      setTestingKey(false)
    }
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
      explanation_html: item.explanationHtml || '',
    }))

    onImport(formatted)
    onClose()
    setRawInput('')
    setParsedList(null)
  }

  const activeKey = Boolean(apiKeyInput.trim() || isVaultConfigured)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="neo-card p-6 bg-card border-3 border-border shadow-[6px_6px_0_var(--border)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col gap-4 animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-border pb-3 shrink-0">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <ClipboardPaste size={22} className="text-primary" />
              NHẬP CÂU HỎI & ĐÁP ÁN THÔNG MINH
            </h2>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              Dán văn bản, Quét OCR địa phương hoặc Dùng AI Vision bóc tách mọi dạng ảnh đề thi.
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

        {/* Mode Switcher Tabs */}
        {parsedList === null && (
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border shrink-0">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
                mode === 'text'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText size={14} />
              1. Dán Văn bản (Text Copy)
            </button>
            <button
              type="button"
              onClick={() => setMode('ocr')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
                mode === 'ocr'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera size={14} />
              2. Quét OCR 1 cột (Local Free)
            </button>
            <button
              type="button"
              onClick={() => setMode('ai_vision')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
                mode === 'ai_vision'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles size={14} className="text-amber-700" />
              3. AI Vision (Quét mọi dạng Đề từ Ảnh)
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
          {parsedList === null ? (
            mode === 'text' ? (
              /* Text Import Mode */
              <div className="flex flex-col gap-4">
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
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-foreground">Dán nội dung câu hỏi tại đây *</label>
                  <textarea
                    rows={8}
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Dán nội dung từ PDF hoặc tài liệu Word của bạn vào đây..."
                    className="w-full p-3 border-2 border-border rounded-xl bg-background text-xs font-mono font-bold focus:outline-none focus:border-primary leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="primary"
                    onClick={handleAnalyzeText}
                    disabled={!rawInput.trim()}
                    className="px-5 text-xs font-black"
                  >
                    <WandSparkles size={16} />
                    Phân tích & Tách dữ liệu
                  </Button>
                </div>
              </div>
            ) : mode === 'ocr' ? (
              /* OCR Image Mode */
              <div className="flex flex-col gap-4">
                <div className="p-3.5 bg-blue-50 border-2 border-blue-300 rounded-xl flex flex-col gap-1 text-xs font-bold text-blue-950">
                  <span className="font-black text-blue-900 flex items-center gap-1">
                    <Camera size={14} /> Quét chữ tự động từ Ảnh 1 Cột (Local Web Worker OCR):
                  </span>
                  <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                    Phù hợp cho ảnh chụp 1 cột câu hỏi. Chụp ảnh màn hình (<strong>Win + Shift + S</strong>) rồi bấm <strong>Ctrl + V</strong> dán vào đây!
                  </p>
                </div>

                {/* Dropzone Box */}
                <div className="relative border-3 border-dashed border-border rounded-2xl p-8 bg-muted/20 hover:bg-muted/40 transition flex flex-col items-center justify-center gap-3 text-center cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleOcrFileInputChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={24} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-foreground block">
                      Bấm để chọn tệp ảnh hoặc Kéo & Thả tệp ảnh vào đây
                    </span>
                    <span className="text-[11px] font-bold text-primary mt-1 block">
                      Hoặc bấm Ctrl + V để Dán trực tiếp ảnh từ Clipboard!
                    </span>
                  </div>
                </div>

                {/* Progress / Loading indicator */}
                {ocrLoading && (
                  <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-black text-primary">
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Đang quét chữ từ ảnh chụp bằng AI Web Worker...
                      </span>
                      <span>{ocrProgress?.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${ocrProgress?.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {ocrError && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {ocrError}
                  </div>
                )}
              </div>
            ) : (
              /* AI Vision Gemini Mode */
              <div className="flex flex-col gap-4">
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col gap-2 text-xs font-bold text-amber-950">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-900 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-amber-600" />
                      AI Vision Google Gemini (Bóc tách mọi Bố cục Đề từ Ảnh + Tự giải Lời giải)
                    </span>

                    {activeKey ? (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <Check size={12} /> Đã có Gemini API Key
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertCircle size={12} /> Chưa cài API Key
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Xử lý hoàn hảo <strong>mọi bố cục đề thi</strong> (ảnh 1 cột, ảnh 2 cột song song 101-104 & 105-108, bảng biểu...), tự chọn luôn đáp án đúng và viết Lời giải chi tiết bằng Tiếng Việt!
                  </p>
                </div>

                {/* API Key Config Banner */}
                {(!isVaultConfigured || showKeyEdit) ? (
                  <div className="p-3.5 bg-card border-2 border-border rounded-xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <KeyRound size={14} className="text-primary" />
                        Cấu hình Google Gemini API Key & Model AI (Vault Bảo mật):
                      </label>
                      {keySavedBadge && (
                        <span className="text-[11px] font-black text-emerald-600">✓ Đã xác thực & Lưu Vault!</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-muted-foreground">API Key (Write-Only) *</span>
                        <input
                          type="password"
                          value={apiKeyInput}
                          autoComplete="new-password"
                          onCopy={(e) => e.preventDefault()}
                          onCut={(e) => e.preventDefault()}
                          onContextMenu={(e) => e.preventDefault()}
                          onChange={(e) => {
                            setApiKeyInput(e.target.value)
                            setKeyErrorMsg(null)
                          }}
                          placeholder={isVaultConfigured ? '•••••••••••••••• (Đã có Key)' : 'Dán AIzaSy... API Key vào đây'}
                          className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-mono font-bold bg-background focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-muted-foreground">Model AI Vision</span>
                        <Select
                          value={apiModelInput}
                          onChange={(val) => {
                            setApiModelInput(val)
                            setKeyErrorMsg(null)
                          }}
                          options={[
                            ...dbAiModels.map((m) => ({
                              value: m.model_name,
                              label: `${m.model_name} ${m.is_default ? '(Default)' : ''}`,
                            })),
                            { value: 'custom', label: '+ Thêm Model AI khác...' },
                          ]}
                        />
                        {apiModelInput === 'custom' && (
                          <input
                            type="text"
                            value={customModelText}
                            onChange={(e) => {
                              setCustomModelText(e.target.value)
                              setKeyErrorMsg(null)
                            }}
                            placeholder="Tên Model (VD: gemini-2.5-flash)"
                            className="mt-1 px-2.5 py-1 border border-border rounded text-xs font-mono font-bold bg-background focus:outline-none focus:border-primary"
                          />
                        )}
                      </div>
                    </div>

                    {keyErrorMsg && (
                      <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-[11px] font-black text-rose-700 flex items-center gap-1.5">
                        <AlertCircle size={14} className="shrink-0" />
                        {keyErrorMsg}
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <Button
                        variant="primary"
                        type="button"
                        disabled={testingKey}
                        onClick={handleSaveApiKey}
                        className="text-xs font-black px-4 min-w-[150px]"
                      >
                        {testingKey ? (
                          <span className="flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" /> Đang kiểm tra...
                          </span>
                        ) : (
                          'Xác thực & Lưu Cấu Hình'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-emerald-700 font-black flex items-center gap-1">
                        <Check size={12} /> Key Vault: Active
                      </span>
                      <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        Model: {apiModelInput}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKeyEdit(true)}
                      className="text-primary font-black hover:underline"
                    >
                      Đổi Key / Model khác
                    </button>
                  </div>
                )}

                {/* Dropzone Box for AI Vision */}
                <div className="relative border-3 border-dashed border-amber-300 rounded-2xl p-8 bg-amber-50/20 hover:bg-amber-50/40 transition flex flex-col items-center justify-center gap-3 text-center cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAiVisionFileInputChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={!activeKey || aiVisionLoading}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-foreground block">
                      {activeKey ? 'Bấm để chọn tệp ảnh Đề thi hoặc Kéo & Thả ảnh vào đây' : 'Hãy nhập API Key ở trên trước khi chọn ảnh'}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 mt-1 block">
                      Hoặc bấm Ctrl + V để Dán trực tiếp ảnh chụp từ Clipboard!
                    </span>
                  </div>
                </div>

                {/* AI Vision Loading Status */}
                {aiVisionLoading && (
                  <div className="p-4 bg-amber-100/60 border-2 border-amber-400 rounded-xl flex items-center gap-3 text-amber-950 text-xs font-black">
                    <Loader2 size={20} className="animate-spin text-amber-600 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span>AI Vision đang phân tích hình ảnh đề thi...</span>
                      <span className="text-[11px] font-bold text-amber-800">
                        Đang bóc tách từng câu hỏi, lập mảng lựa chọn A/B/C/D và tự giải lời giải chi tiết.
                      </span>
                    </div>
                  </div>
                )}

                {aiVisionError && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {aiVisionError}
                  </div>
                )}
              </div>
            )
          ) : (
            /* Parsed Preview List */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-300 p-3 rounded-xl">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Đã bóc tách thành công {parsedList.length} câu hỏi. Kiểm tra & bấm Nhập vào cụm bài!
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setParsedList(null)
                    setImagePreview(null)
                  }}
                  className="text-xs font-bold text-slate-700 hover:underline"
                >
                  ← Thử quét lại ảnh/văn bản khác
                </button>
              </div>

              {/* Show image preview thumbnail if image was used */}
              {imagePreview && (
                <div className="flex items-center gap-3 p-3 bg-card border-2 border-border rounded-xl">
                  <img
                    src={imagePreview}
                    alt="Ảnh đề thi gốc"
                    className="w-32 h-20 object-contain rounded border border-border bg-muted/30"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-foreground flex items-center gap-1">
                      <ImageIcon size={14} className="text-primary" /> Ảnh đề thi gốc đã quét
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Dữ liệu chữ đã được AI trích xuất và tự động điền vào bên dưới.
                    </span>
                  </div>
                </div>
              )}

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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

                    {item.explanationHtml && (
                      <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
                        <label className="text-[11px] font-black text-muted-foreground">Lời giải AI:</label>
                        <p className="text-xs font-bold text-foreground bg-muted/30 p-2 rounded border border-border">
                          {item.explanationHtml}
                        </p>
                      </div>
                    )}
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
