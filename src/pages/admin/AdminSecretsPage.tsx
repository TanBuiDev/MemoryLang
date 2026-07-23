import { useState } from 'react'
import { CheckCircle2, AlertTriangle, HelpCircle, Play, KeyRound } from 'lucide-react'
import { generateAudio } from '@/services/api/generateAudio.api'
import { imageSearchService } from '@/services/api/imageSearch.api'
import { Button } from '@/components/ui/button'

interface SecretStatus {
  name: string
  envKey: string
  description: string
  service: string
  tested: 'idle' | 'testing' | 'success' | 'failed'
  errorMessage?: string
}

export default function AdminSecretsPage() {
  const [secrets, setSecrets] = useState<SecretStatus[]>([
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
      if (serviceName === 'Google TTS' || serviceName === 'Cloudflare R2') {
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
    </div>
  )
}
