import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  KeyRound,
  X,
  FileImage,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  parseQuestionsWithGeminiVision,
} from '@/utils/geminiVisionParser'
import { adminSecretsService } from '@/services/supabase/adminSecrets.service'
import type { ParsedExamQuestion } from '@/utils/examQuestionImport'

interface BulkReadingImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (passageHtml: string, questions: ParsedExamQuestion[]) => void
}

export const BulkReadingImportModal: React.FC<BulkReadingImportModalProps> = ({
  open,
  onClose,
  onImport,
}) => {
  const [parsedPassageHtml, setParsedPassageHtml] = useState<string | null>(null)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedExamQuestion[]>([])
  
  // AI Vision state
  const [aiVisionLoading, setAiVisionLoading] = useState(false)
  const [aiVisionError, setAiVisionError] = useState<string | null>(null)

  // Options state
  const [needAnswers, setNeedAnswers] = useState(true)
  const [needExplanations, setNeedExplanations] = useState(true)
  const [isFillInTheBlank, setIsFillInTheBlank] = useState(false)

  // Vault state
  const [isVaultConfigured, setIsVaultConfigured] = useState(false)
  const [activeModelName, setActiveModelName] = useState('gemini-2.0-flash')
  const [showKeyEdit, setShowKeyEdit] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiModelInput, setApiModelInput] = useState('')
  const [testingKey, setTestingKey] = useState(false)
  const [keyErrorMsg, setKeyErrorMsg] = useState<string | null>(null)
  const [keySavedBadge, setKeySavedBadge] = useState(false)

  const checkVaultStatus = async () => {
    try {
      const res = await adminSecretsService.checkActiveVisionKeyConfigured()
      setIsVaultConfigured(Boolean(res.configured))
      if (res.model_name) {
        setActiveModelName(res.model_name)
        setApiModelInput(res.model_name)
      }
    } catch {
      setIsVaultConfigured(false)
    }
  }

  // Load Vault Key Pools overview when modal opens
  useEffect(() => {
    if (!open) {
      setParsedPassageHtml(null)
      setParsedQuestions([])
      setAiVisionLoading(false)
      setAiVisionError(null)
      setTestingKey(false)
      setKeyErrorMsg(null)
      setApiKeyInput('')
      setApiModelInput('')
      setShowKeyEdit(false)
      setNeedAnswers(true)
      setNeedExplanations(true)
      setIsFillInTheBlank(false)
    } else {
      void checkVaultStatus()
    }
  }, [open])

  // Listen to Global Paste Event inside modal for pasting screenshots (Ctrl + V)
  useEffect(() => {
    if (!open || parsedPassageHtml) return

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }

      if (imageFiles.length > 0) {
        void processAiVisionImageFiles(imageFiles)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [open, isVaultConfigured, parsedPassageHtml, needAnswers, needExplanations, isFillInTheBlank])

  const handleAiVisionFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      void processAiVisionImageFiles(files)
    }
  }

  const compressImage = (file: File, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(e.target?.result as string)
          
          let width = img.width
          let height = img.height
          
          // Max width 1500px to save payload size
          const MAX_WIDTH = 1500
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          }
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.onerror = () => resolve(e.target?.result as string)
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const processAiVisionImageFiles = async (files: File[]) => {
    setAiVisionLoading(true)
    setAiVisionError(null)
    try {
      if (files.length > 5) throw new Error('Vui lòng chọn tối đa 5 ảnh cùng lúc.')
      
      const base64Images = await Promise.all(
        files.map(f => compressImage(f, 0.7))
      )
      
      const result = await parseQuestionsWithGeminiVision(base64Images, {
        needAnswers,
        needExplanations,
        isFillInTheBlank,
      })

      if (!result.passageHtml && (!result.questions || result.questions.length === 0)) {
        setAiVisionError('Không tìm thấy nội dung đoạn văn hoặc câu hỏi trong bức ảnh này.')
        return
      }

      let finalPassageHtml = result.passageHtml || ''
      if (finalPassageHtml) {
        // Normalize any hyphens or dots to underscores for uniformity (ignores HTML tags like <b> or <span> between them)
        finalPassageHtml = finalPassageHtml.replace(/([-_.—–]{2,})(?:\s|&nbsp;|<[^>]+>)*(?:\[|\()?(\d+)(?:<[^>]+>)?(?:\.|\]|\))?(?:<[^>]+>)?/g, '_______ $2.')
      }

      setParsedPassageHtml(finalPassageHtml)
      setParsedQuestions(result.questions || [])
    } catch (err: any) {
      setAiVisionError(err.message || 'Lỗi khi bóc tách với AI Vision.')
    } finally {
      setAiVisionLoading(false)
    }
  }

  const handleSaveApiKey = async () => {
    const modelToTest = apiModelInput.trim() || activeModelName || 'gemini-2.0-flash'

    if (!apiKeyInput.trim() && !isVaultConfigured) {
      setKeyErrorMsg('Vui lòng dán Gemini API Key.')
      return
    }

    setTestingKey(true)
    setKeyErrorMsg(null)

    try {
      if (apiKeyInput.trim()) {
        const savedKey = await adminSecretsService.upsertKeyPoolItem({
          key_name: 'Google Gemini API Key',
          purpose_tag: 'ai_vision',
          secret_val: apiKeyInput.trim(),
          model_name: modelToTest,
        })
        const testRes = await adminSecretsService.testKeyPoolItem(savedKey.id)
        if (!testRes.ok) {
          setKeyErrorMsg(testRes.message)
          return
        }
      }

      setIsVaultConfigured(true)
      setActiveModelName(modelToTest)
      setKeySavedBadge(true)
      setShowKeyEdit(false)
      setApiKeyInput('')

      await checkVaultStatus()
      setTimeout(() => setKeySavedBadge(false), 3000)
    } catch (err: any) {
      setKeyErrorMsg(`Lỗi khi lưu: ${err.message}`)
    } finally {
      setTestingKey(false)
    }
  }

  const handleConfirmImport = () => {
    if (parsedPassageHtml !== null) {
      onImport(parsedPassageHtml, parsedQuestions)
      handleReset()
    }
  }

  const handleReset = () => {
    onClose()
    setParsedPassageHtml(null)
    setParsedQuestions([])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="neo-card p-6 bg-card border-3 border-border shadow-[6px_6px_0_var(--border)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col gap-4 animate-in fade-in zoom-in-95 overflow-hidden relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0 relative z-20">
          <div>
            <h2 className="font-black text-lg text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              NHẬP THÔNG MINH TOÀN BÀI (AI VISION)
            </h2>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              Hỗ trợ kéo thả nhiều ảnh cùng lúc. AI sẽ tự động tách đoạn văn và danh sách câu hỏi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-muted/50 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-5 custom-scrollbar min-h-[300px]">
          {parsedPassageHtml === null ? (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col gap-2 text-xs font-bold text-amber-950">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-900 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-600" />
                    AI Vision (Trích xuất siêu chuẩn từ hình ảnh)
                  </span>

                  {isVaultConfigured ? (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <Check size={12} /> Đã cấu hình
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle size={12} /> Chưa cài API Key
                    </span>
                  )}
                </div>
                
                {/* Options Configuration */}
                <div className="flex flex-col gap-2 mt-2 bg-white/60 p-3 rounded-lg border border-amber-200">
                  <h4 className="font-black text-amber-900">Tuỳ chọn xử lý AI:</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={needAnswers} onChange={e => setNeedAnswers(e.target.checked)} className="accent-amber-600" />
                    <span>Yêu cầu AI suy luận và chọn đáp án đúng</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={needExplanations} onChange={e => setNeedExplanations(e.target.checked)} className="accent-amber-600" />
                    <span>Yêu cầu AI viết lời giải thích chi tiết (Tốn nhiều thời gian hơn)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isFillInTheBlank} onChange={e => setIsFillInTheBlank(e.target.checked)} className="accent-amber-600" />
                    <span className="font-black">Đây là bài điền từ (Part 6): Không bịa câu hỏi, chuẩn hoá vị trí đục lỗ.</span>
                  </label>
                </div>
              </div>

              {(!isVaultConfigured || showKeyEdit) && (
                <div className="flex flex-col gap-3 p-4 bg-muted/20 border-2 border-border rounded-xl">
                  {/* Vault Config UI - same as others */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <KeyRound size={14} className="text-primary" />
                      Cấu hình Gemini API Key & Model:
                    </label>
                    {keySavedBadge && (
                      <span className="text-[11px] font-black text-emerald-600">✓ Đã đồng bộ Server Vault!</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={isVaultConfigured ? '•••••••••••• (Đã có Key)' : 'Dán API Key vào đây'}
                      className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-mono font-bold"
                    />
                    <input
                      type="text"
                      value={apiModelInput}
                      onChange={(e) => setApiModelInput(e.target.value)}
                      placeholder="VD: gemini-2.0-flash..."
                      className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  {keyErrorMsg && <div className="text-xs font-black text-rose-600">{keyErrorMsg}</div>}
                  <Button variant="primary" disabled={testingKey} onClick={handleSaveApiKey} className="text-xs">
                    {testingKey ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </Button>
                </div>
              )}

              {/* Dropzone Box for AI Vision */}
              <label
                htmlFor="ai-vision-file-input"
                className="border-3 border-dashed border-amber-300 rounded-2xl p-8 bg-amber-50/20 hover:bg-amber-50/40 transition flex flex-col items-center justify-center gap-3 text-center cursor-pointer group"
              >
                <input
                  id="ai-vision-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAiVisionFileInputChange}
                  className="hidden"
                  disabled={!isVaultConfigured || aiVisionLoading}
                />
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileImage size={24} className="text-amber-600" />
                </div>
                <div>
                  <span className="text-xs font-black text-foreground block">
                    {isVaultConfigured ? 'Bấm để chọn nhiều tệp ảnh đề thi' : 'Hãy cấu hình API Key trước'}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 mt-1 block">
                    Hoặc bấm Ctrl + V để Dán nhiều ảnh chụp từ Clipboard!
                  </span>
                </div>
              </label>

              {aiVisionLoading && (
                <div className="p-4 bg-amber-100/60 border-2 border-amber-400 rounded-xl flex items-center gap-3 text-amber-950 text-xs font-black">
                  <Loader2 size={20} className="animate-spin text-amber-600 shrink-0" />
                  <span>Đang xử lý phân tích hình ảnh... Vui lòng đợi trong giây lát.</span>
                </div>
              )}

              {aiVisionError && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-xl text-xs font-black flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{aiVisionError}</span>
                </div>
              )}
            </div>
          ) : (
            /* Preview List */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-300 p-3 rounded-xl">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <Check size={16} className="text-emerald-700" />
                  Đã bóc tách {parsedPassageHtml ? 'Nội dung bài đọc' : ''} {parsedQuestions.length > 0 && `với ${parsedQuestions.length} câu hỏi!`}
                </span>
                <Button variant="ghost" onClick={() => { setParsedPassageHtml(null); setParsedQuestions([]) }} className="text-xs font-bold">
                  Thử lại
                </Button>
              </div>

              {parsedPassageHtml && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-black text-primary">Nội dung bài đọc:</h3>
                  <div className="p-3 bg-muted/20 border-2 border-border rounded-xl text-xs prose max-w-none" dangerouslySetInnerHTML={{ __html: parsedPassageHtml }} />
                </div>
              )}

              {parsedQuestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-black text-primary">Danh sách câu hỏi:</h3>
                  <div className="flex flex-col gap-3">
                    {parsedQuestions.map((q, idx) => (
                      <div key={idx} className="p-3.5 bg-card border-2 border-border rounded-xl flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-black text-xs text-foreground">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-mono">
                            Câu {q.questionNumber || idx + 1}
                          </span>
                          <span>{q.questionText}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs font-bold pl-2">
                          {q.options.map((opt) => (
                            <div key={opt.key} className={`p-1.5 rounded-lg border ${opt.is_correct ? 'bg-emerald-100 border-emerald-400 text-emerald-950' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                              ({opt.key}) {opt.text} {opt.is_correct && '✓'}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border pt-3 shrink-0 relative z-20">
          <Button variant="ghost" onClick={handleReset} className="text-xs font-black">Hủy bỏ</Button>
          {parsedPassageHtml !== null && (
            <Button variant="primary" onClick={handleConfirmImport} className="text-xs font-black px-6">
              Xác nhận nhập
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
