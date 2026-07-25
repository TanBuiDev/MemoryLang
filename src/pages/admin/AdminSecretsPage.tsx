import { useState } from 'react'
import { CheckCircle2, AlertTriangle, HelpCircle, Play, KeyRound, Loader2 } from 'lucide-react'
import { generateAudio } from '@/services/api/generateAudio.api'
import { imageSearchService } from '@/services/api/imageSearch.api'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  testGeminiApiKeyAndModel,
  setGeminiApiKey,
  getGeminiModel,
  setGeminiModel,
  GEMINI_MODEL_OPTIONS,
} from '@/utils/geminiVisionParser'

interface SecretStatus {
  name: string
  envKey: string
  description: string
  service: string
  tested: 'idle' | 'testing' | 'success' | 'failed'
  errorMessage?: string
}

export default function AdminSecretsPage() {
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => {
    return localStorage.getItem('memorylang_gemini_api_key') || ''
  })
  const [geminiModelInput, setGeminiModelInput] = useState(() => getGeminiModel())
  const [customModelText, setCustomModelText] = useState('')
  const [geminiTesting, setGeminiTesting] = useState(false)
  const [geminiStatus, setGeminiStatus] = useState<{ ok: boolean; message: string } | null>(null)

  const [secrets, setSecrets] = useState<SecretStatus[]>([
    {
      name: 'Google Gemini Vision AI Key',
      envKey: 'VITE_GEMINI_API_KEY (hoặc lưu qua Admin UI bên dưới)',
      description: 'Khóa Google AI Studio API dùng để quét câu hỏi từ ảnh 2 cột và tự động chọn đáp án đúng.',
      service: 'Gemini AI Vision',
      tested: 'idle',
    },
    {
      name: 'Google Cloud TTS Credentials',
      envKey: 'GOOGLE_TTS_CREDENTIALS_B64',
      description: 'Chứa khóa tài khoản dịch vụ Google Cloud định dạng Base64 dùng để phát âm thanh WaveNet.',
      service: 'Google TTS',
      tested: 'idle',
    },
    {
      name: 'Cloudflare R2 Access Keys',
      envKey: 'R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY',
      description: 'Khóa truy cập Cloudflare R2 dùng để upload và cache các file âm thanh TTS.',
      service: 'Cloudflare R2',
      tested: 'idle',
    },
    {
      name: 'Unsplash Access Key',
      envKey: 'UNSPLASH_ACCESS_KEY',
      description: 'Khóa API Unsplash để tìm kiếm hình ảnh minh họa cho từ vựng.',
      service: 'Unsplash Images',
      tested: 'idle',
    },
    {
      name: 'Pexels API Key',
      envKey: 'PEXELS_API_KEY',
      description: 'Khóa API Pexels dự phòng để tìm kiếm hình ảnh minh họa cho từ vựng.',
      service: 'Pexels Images',
      tested: 'idle',
    },
    {
      name: 'Pixabay API Key',
      envKey: 'PIXABAY_API_KEY',
      description: 'Khóa API Pixabay dự phòng để tìm kiếm hình ảnh minh họa cho từ vựng.',
      service: 'Pixabay Images',
      tested: 'idle',
    },
  ])

  const [testResultMsg, setTestResultMsg] = useState<string | null>(null)

  const handleTestService = async (serviceName: string) => {
    setSecrets((prev) =>
      prev.map((s) => (s.service === serviceName ? { ...s, tested: 'testing' } : s))
    )
    setTestResultMsg(null)

    try {
      if (serviceName === 'Gemini AI Vision') {
        const apiKey = geminiKeyInput.trim() || import.meta.env.VITE_GEMINI_API_KEY
        if (!apiKey) {
          throw new Error('Chưa nhập Gemini API Key. Hãy dán Key bên dưới và bấm Lưu.')
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hello, respond with OK' }] }],
            }),
          }
        )

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          throw new Error(errJson?.error?.message || `Lỗi Gemini API (${res.status})`)
        }

        setSecrets((prev) =>
          prev.map((s) => (s.service === serviceName ? { ...s, tested: 'success' } : s))
        )
        setTestResultMsg('Kết nối tới Google Gemini Vision API THÀNH CÔNG! Sẵn sàng quét đề thi.')
      } else if (serviceName === 'Google TTS' || serviceName === 'Cloudflare R2') {
        const res = await generateAudio('test connection', 'en-US')
        if (res.audioUrl) {
          setSecrets((prev) =>
            prev.map((s) =>
              s.service === 'Google TTS' || s.service === 'Cloudflare R2'
                ? { ...s, tested: 'success' }
                : s
            )
          )
          setTestResultMsg('Google Cloud TTS và Cloudflare R2 kết nối THÀNH CÔNG! Đã tạo và cache file audio.')
        } else {
          throw new Error('TTS invoke không trả về URL âm thanh')
        }
      } else if (serviceName.includes('Images')) {
        let source: 'unsplash' | 'pexels' | 'pixabay' = 'unsplash'
        if (serviceName.includes('Pexels')) source = 'pexels'
        if (serviceName.includes('Pixabay')) source = 'pixabay'

        const res = await imageSearchService.search('apple', { perPage: 1, source })
        if (res && Array.isArray(res.results)) {
          setSecrets((prev) =>
            prev.map((s) => (s.service === serviceName ? { ...s, tested: 'success' } : s))
          )
          setTestResultMsg(`Kết nối tới ${serviceName} THÀNH CÔNG! Tìm thấy ${res.total || res.results.length} hình ảnh.`)
        } else {
          throw new Error('Không nhận được kết quả tìm kiếm ảnh hợp lệ')
        }
      }
    } catch (err: any) {
      console.error(err)
      const errorMsg = err.message || 'Kết nối thất bại. Lỗi không xác định.'
      setSecrets((prev) =>
        prev.map((s) => (s.service === serviceName ? { ...s, tested: 'failed', errorMessage: errorMsg } : s))
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-200 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#000]">
          <KeyRound className="w-5 h-5 text-emerald-800" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">API KEYS & SECRETS HỆ THỐNG</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-bold">
            Kiểm tra trạng thái cấu hình và thử nghiệm kết nối dịch vụ bên thứ 3.
          </p>
        </div>
      </div>

      {testResultMsg && (
        <div className="p-4 bg-emerald-100 border-2 border-slate-900 text-emerald-900 rounded-xl font-black text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000]">
          {testResultMsg}
        </div>
      )}

      {/* Secrets Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {secrets.map((item) => (
          <div
            key={item.name}
            className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-900 text-sm sm:text-base">{item.name}</h3>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 border border-slate-900 text-slate-800">
                  {item.envKey}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600">{item.description}</p>
              {item.errorMessage && (
                <p className="text-xs font-black text-rose-600 mt-1">{item.errorMessage}</p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {item.tested === 'success' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-slate-900 text-xs font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                  <CheckCircle2 size={14} className="text-emerald-700" />
                  KẾT NỐI OK
                </span>
              )}
              {item.tested === 'failed' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-slate-900 text-xs font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                  <AlertTriangle size={14} className="text-rose-700" />
                  THẤT BẠI
                </span>
              )}
              {item.tested === 'idle' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-900 text-xs font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                  <HelpCircle size={14} />
                  CHƯA TEST
                </span>
              )}

              <Button
                type="button"
                variant="secondary"
                disabled={item.tested === 'testing'}
                onClick={() => handleTestService(item.service)}
                className="neo-button px-3.5 py-1.5 h-9 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {item.tested === 'testing' ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                <span>Test API</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Direct Gemini API Key & Model Management Box */}
      <div className="neo-card p-5 bg-card border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            Cấu hình Google Gemini API Key & AI Model (Tự động kiểm tra trước khi lưu)
          </h3>
          {geminiStatus && (
            <span
              className={`text-xs font-black px-2.5 py-1 rounded border flex items-center gap-1 max-w-md ${
                geminiStatus.ok
                  ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                  : 'text-rose-800 bg-rose-100 border-rose-300'
              }`}
            >
              {geminiStatus.ok ? '✓ ' : '✕ '} {geminiStatus.message}
            </span>
          )}
        </div>
        <p className="text-xs font-bold text-slate-600">
          Nhập Google AI Studio Key miễn phí từ{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            Google AI Studio
          </a>{' '}
          và chọn/nhập tên Model AI. Hệ thống sẽ tự động gửi request test thử nghiệm tới Google để xác thực Key & Model trước khi lưu.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* API Key Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black text-foreground">Google Gemini API Key *</label>
            <input
              type="password"
              value={geminiKeyInput}
              onChange={(e) => {
                setGeminiKeyInput(e.target.value)
                setGeminiStatus(null)
              }}
              placeholder="Dán AIzaSy... API key của bạn vào đây"
              className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl bg-background text-xs font-mono font-bold focus:outline-none focus:border-primary"
            />
          </div>

          {/* Model Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black text-foreground">Model AI Vision (Được hỗ trợ)</label>
            <Select
              value={
                GEMINI_MODEL_OPTIONS.some((m) => m.value === geminiModelInput)
                  ? geminiModelInput
                  : 'custom'
              }
              onChange={(val) => {
                if (val !== 'custom') {
                  setGeminiModelInput(val)
                  setCustomModelText('')
                } else {
                  setGeminiModelInput('custom')
                }
                setGeminiStatus(null)
              }}
              options={GEMINI_MODEL_OPTIONS}
            />

            {(geminiModelInput === 'custom' ||
              !GEMINI_MODEL_OPTIONS.some((m) => m.value === geminiModelInput)) && (
              <input
                type="text"
                value={customModelText || geminiModelInput}
                onChange={(e) => {
                  setCustomModelText(e.target.value)
                  setGeminiStatus(null)
                }}
                placeholder="Nhập tên Model tùy chỉnh (VD: gemini-2.5-flash)"
                className="mt-1 px-3 py-1.5 border-2 border-slate-900 rounded-lg text-xs font-mono font-bold bg-background focus:outline-none focus:border-primary"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button
            variant="primary"
            type="button"
            disabled={geminiTesting}
            onClick={async () => {
              const activeModel =
                geminiModelInput === 'custom'
                  ? customModelText.trim()
                  : geminiModelInput.trim()

              if (!geminiKeyInput.trim()) {
                setGeminiApiKey('')
                if (activeModel) setGeminiModel(activeModel)
                setGeminiStatus({ ok: true, message: 'Đã xóa Key khỏi bộ nhớ' })
                return
              }

              setGeminiTesting(true)
              setGeminiStatus(null)

              const res = await testGeminiApiKeyAndModel(geminiKeyInput.trim(), activeModel)
              setGeminiTesting(false)
              setGeminiStatus(res)

              if (res.ok) {
                setGeminiApiKey(geminiKeyInput.trim())
                if (activeModel) setGeminiModel(activeModel)
              }
            }}
            className="px-6 text-xs font-black min-w-[170px]"
          >
            {geminiTesting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" />
                Đang kiểm tra...
              </span>
            ) : (
              'Kiểm tra & Lưu Cấu Hình'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
