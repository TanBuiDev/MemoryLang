import React, { useState, useEffect } from 'react'
import {
  FileText,
  Camera,
  Sparkles,
  Upload,
  X,
  Check,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { processImageToText } from '@/utils/imageOcrQuestionParser'
import {
  fileToBase64,
  parseQuestionsWithGeminiVision,
  parseQuestionsWithGeminiText,
} from '@/utils/geminiVisionParser'
import { adminSecretsService } from '@/services/supabase/adminSecrets.service'

interface BulkPassageImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (passageHtml: string) => void
}

type ImportMode = 'text' | 'ocr' | 'ai_vision'

export const BulkPassageImportModal: React.FC<BulkPassageImportModalProps> = ({
  open,
  onClose,
  onImport,
}) => {
  const [mode, setMode] = useState<ImportMode>('text')
  const [rawInput, setRawInput] = useState('')
  const [parsedPassageHtml, setParsedPassageHtml] = useState<string | null>(null)
  
  // AI Text state
  const [aiTextLoading, setAiTextLoading] = useState(false)
  const [aiTextError, setAiTextError] = useState<string | null>(null)

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  // AI Vision state
  const [aiVisionLoading, setAiVisionLoading] = useState(false)
  const [aiVisionError, setAiVisionError] = useState<string | null>(null)

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
      setMode('text')
      setRawInput('')
      setParsedPassageHtml(null)
      setOcrLoading(false)
      setOcrError(null)
      setAiTextLoading(false)
      setAiTextError(null)
      setAiVisionLoading(false)
      setAiVisionError(null)
      setTestingKey(false)
      setKeyErrorMsg(null)
      setApiKeyInput('')
      setApiModelInput('')
      setShowKeyEdit(false)
    } else {
      void checkVaultStatus()
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
              void processOcrFile(file)
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
  }, [open, mode, isVaultConfigured])

  const handleParseTextAI = async () => {
    if (!rawInput.trim()) return
    setAiTextLoading(true)
    setAiTextError(null)
    try {
      const result = await parseQuestionsWithGeminiText(rawInput)
      if (!result.passageHtml) {
        setAiTextError('Không tìm thấy nội dung đoạn văn hợp lệ trong văn bản này.')
        return
      }
      setParsedPassageHtml(result.passageHtml)
    } catch (err: any) {
      setAiTextError(err.message || 'Lỗi khi trích xuất đoạn văn bằng AI Text.')
    } finally {
      setAiTextLoading(false)
    }
  }

  const handleOcrFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      void processOcrFile(files[0])
    }
  }

  const processOcrFile = async (file: File) => {
    setOcrLoading(true)
    setOcrError(null)
    try {
      const text = await processImageToText(file)
      if (!text.trim()) {
        setOcrError('Không thể nhận diện văn bản từ hình ảnh này. Hãy thử ảnh rõ hơn.')
        return
      }
      setRawInput(text)
      setMode('text')
    } catch (err: any) {
      setOcrError(err.message || 'Lỗi khi quét OCR ảnh.')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleAiVisionFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      void processAiVisionImageFile(files[0])
    }
  }

  const processAiVisionImageFile = async (file: File) => {
    setAiVisionLoading(true)
    setAiVisionError(null)
    try {
      const base64 = await fileToBase64(file)
      const result = await parseQuestionsWithGeminiVision(base64)

      if (!result.passageHtml) {
        setAiVisionError('Không tìm thấy nội dung đoạn văn hợp lệ trong bức ảnh này.')
        return
      }

      setParsedPassageHtml(result.passageHtml)
    } catch (err: any) {
      setAiVisionError(err.message || 'Lỗi khi bóc tách đoạn văn với AI Vision.')
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
    if (parsedPassageHtml) {
      onImport(parsedPassageHtml)
      handleReset()
    }
  }

  const handleReset = () => {
    onClose()
    setRawInput('')
    setParsedPassageHtml(null)
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
              NHẬP NỘI DUNG ĐOẠN VĂN THÔNG MINH
            </h2>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              Dán văn bản, Quét OCR địa phương hoặc Dùng AI Vision bóc tách nội dung đoạn văn đọc hiểu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer relative z-30"
            title="Đóng Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        {parsedPassageHtml === null && (
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border shrink-0 relative z-20">
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
              2. Quét OCR lấy chữ thô (Nhanh)
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
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 relative z-20">
          {parsedPassageHtml === null ? (
            mode === 'text' ? (
              /* Text Import Mode */
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 justify-between">
                  <label className="text-xs font-bold text-muted-foreground">
                    Dán nội dung bài thi vào ô bên dưới:
                  </label>
                  {isVaultConfigured ? (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <Check size={12} /> Sẵn sàng dùng AI
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle size={12} /> Chưa cấu hình AI Key
                    </span>
                  )}
                </div>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder={`VD:\nSubject: Welcome to our service\nDear Customer, ...`}
                  className="w-full h-64 p-3 font-mono text-xs border-2 border-border rounded-xl bg-background focus:outline-none focus:border-primary resize-none"
                />
                
                {aiTextLoading && (
                  <div className="p-4 bg-primary/10 rounded-xl flex items-center justify-center gap-2 text-primary text-xs font-black border border-primary/20">
                    <Loader2 size={16} className="animate-spin" /> Đang dùng AI phân tích đoạn văn...
                  </div>
                )}
                {aiTextError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} /> {aiTextError}
                  </div>
                )}
                
                {(!isVaultConfigured || showKeyEdit) && (
                  <div className="p-3.5 bg-card border-2 border-border rounded-xl flex flex-col gap-3 relative z-30 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <KeyRound size={14} className="text-primary" />
                        Cấu hình Gemini API Key & Model (Cập nhật trực tiếp Server Vault):
                      </label>
                      {keySavedBadge && (
                        <span className="text-[11px] font-black text-emerald-600">✓ Đã đồng bộ Server Vault!</span>
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
                          placeholder={isVaultConfigured ? '•••••••••••••••• (Đã có Key)' : 'Dán API Key vào đây'}
                          className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-mono font-bold bg-background focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-muted-foreground">Model AI</span>
                        <input
                          type="text"
                          value={apiModelInput}
                          onChange={(e) => {
                            setApiModelInput(e.target.value)
                            setKeyErrorMsg(null)
                          }}
                          placeholder="VD: gemini-2.0-flash, gemini-1.5-pro..."
                          className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-mono font-bold bg-background focus:outline-none focus:border-primary"
                        />
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
                            <Loader2 size={12} className="animate-spin" /> Đang lưu...
                          </span>
                        ) : (
                          'Đồng bộ vào Vault'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {isVaultConfigured && !showKeyEdit && (
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mt-1">
                    <span>Đang sử dụng Model: {activeModelName}</span>
                    <button
                      type="button"
                      onClick={() => setShowKeyEdit(true)}
                      className="text-primary hover:underline"
                    >
                      Đổi Key / Model
                    </button>
                  </div>
                )}
              </div>
            ) : mode === 'ocr' ? (
              /* OCR Import Mode */
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-muted/30 border border-border rounded-xl text-xs font-bold text-muted-foreground">
                  💡 Hệ thống OCR sẽ lấy chữ thô trên ảnh. Kết quả sẽ tự động đẩy sang tab "Dán Văn bản" để bạn dùng AI cấu trúc hóa HTML hoặc tự sửa thủ công.
                </div>

                <label
                  htmlFor="ocr-file-input"
                  className="border-2 border-dashed border-border rounded-xl p-8 hover:bg-muted/20 transition flex flex-col items-center justify-center gap-2 text-center cursor-pointer"
                >
                  <input
                    id="ocr-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleOcrFileInputChange}
                    className="hidden"
                  />
                  <Camera size={32} className="text-primary" />
                  <span className="text-xs font-black text-foreground">
                    Bấm để chọn tệp ảnh hoặc Kéo & Thả ảnh vào đây
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Hoặc bấm Ctrl + V để Dán ảnh từ Clipboard
                  </span>
                </label>

                {ocrLoading && (
                  <div className="p-4 bg-primary/10 rounded-xl flex items-center justify-center gap-2 text-primary text-xs font-black">
                    <Loader2 size={16} className="animate-spin" /> Đang quét OCR bài thi...
                  </div>
                )}

                {ocrError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} /> {ocrError}
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

                    {isVaultConfigured ? (
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
                    Tự động nhận diện cấu trúc đoạn văn, bài đọc và chuyển đổi thành định dạng HTML siêu chuẩn.
                  </p>
                </div>

                {/* Vault Sync Status Banner */}
                {(!isVaultConfigured || showKeyEdit) ? (
                  <div className="p-3.5 bg-card border-2 border-border rounded-xl flex flex-col gap-3 relative z-30">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <KeyRound size={14} className="text-primary" />
                        Cấu hình Gemini API Key & Model (Cập nhật trực tiếp Server Vault):
                      </label>
                      {keySavedBadge && (
                        <span className="text-[11px] font-black text-emerald-600">✓ Đã đồng bộ Server Vault!</span>
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
                          placeholder={isVaultConfigured ? '•••••••••••••••• (Đã có Key)' : 'Dán API Key vào đây'}
                          className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-mono font-bold bg-background focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-muted-foreground">Model AI Vision</span>
                        <input
                          type="text"
                          value={apiModelInput}
                          onChange={(e) => {
                            setApiModelInput(e.target.value)
                            setKeyErrorMsg(null)
                          }}
                          placeholder="VD: gemini-2.0-flash, gemini-1.5-pro..."
                          className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-mono font-bold bg-background focus:outline-none focus:border-primary"
                        />
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
                            <Loader2 size={12} className="animate-spin" /> Đang lưu...
                          </span>
                        ) : (
                          'Đồng bộ vào Vault'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-emerald-700 font-black flex items-center gap-1">
                        <ShieldCheck size={14} /> Key Vault: Active
                      </span>
                      <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        Model: {activeModelName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKeyEdit(true)}
                      className="text-primary font-black hover:underline text-[11px] cursor-pointer"
                    >
                      Đổi Key / Model khác
                    </button>
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
                    onChange={handleAiVisionFileInputChange}
                    className="hidden"
                    disabled={!isVaultConfigured || aiVisionLoading}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-foreground block">
                      {isVaultConfigured ? 'Bấm để chọn tệp ảnh Đề thi hoặc Kéo & Thả ảnh vào đây' : 'Hãy cấu hình API Key ở trên trước khi chọn ảnh'}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 mt-1 block">
                      Hoặc bấm Ctrl + V để Dán trực tiếp ảnh chụp từ Clipboard!
                    </span>
                  </div>
                </label>

                {/* AI Vision Loading Status */}
                {aiVisionLoading && (
                  <div className="p-4 bg-amber-100/60 border-2 border-amber-400 rounded-xl flex items-center gap-3 text-amber-950 text-xs font-black">
                    <Loader2 size={20} className="animate-spin text-amber-600 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span>AI Vision đang phân tích hình ảnh...</span>
                      <span className="text-[11px] font-bold text-amber-800">
                        Đang cấu trúc đoạn văn thành định dạng HTML.
                      </span>
                    </div>
                  </div>
                )}

                {aiVisionError && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-xl text-xs font-black flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
      setAiVisionError(err.message || 'Lỗi khi bóc tách đoạn văn với AI Vision.')
                  </div>
                )}
              </div>
            )
          ) : (
            /* Parsed Passage Preview */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-300 p-3 rounded-xl">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <Check size={16} className="text-emerald-700" />
                  Đã tách thành công Nội dung Đoạn văn!
                </span>
                <Button variant="ghost" onClick={() => setParsedPassageHtml(null)} className="text-xs font-bold">
                  Thử lại ảnh khác
                </Button>
              </div>

              <div className="p-4 bg-card border-2 border-border rounded-xl flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                <div className="text-xs font-black text-foreground border-b-2 border-border pb-2 mb-2">
                  Preview Nội dung (HTML)
                </div>
                <div 
                  className="prose prose-sm prose-p:my-1 prose-headings:my-2 text-sm text-foreground"
                  dangerouslySetInnerHTML={{ __html: parsedPassageHtml }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border pt-3 shrink-0 relative z-20">
          <Button variant="ghost" onClick={handleReset} className="text-xs font-black cursor-pointer">
            Hủy bỏ
          </Button>

          {parsedPassageHtml !== null ? (
            <Button
              variant="primary"
              onClick={handleConfirmImport}
              className="text-xs font-black px-6 cursor-pointer"
            >
              Nhập vào Đoạn Văn
            </Button>
          ) : mode === 'text' ? (
            <Button
              variant="primary"
              disabled={!rawInput.trim() || aiTextLoading}
              onClick={handleParseTextAI}
              className="text-xs font-black px-6 cursor-pointer"
            >
              Phân tích thành HTML bằng AI
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
