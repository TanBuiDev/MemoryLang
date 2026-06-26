import { useState } from 'react'
import { CheckCircle2, AlertTriangle, HelpCircle, Play, ShieldAlert, KeyRound } from 'lucide-react'
import { generateAudio } from '@/services/api/generateAudio.api'
import { imageSearchService } from '@/services/api/imageSearch.api'

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
    // Cập nhật trạng thái testing
    setSecrets((prev) =>
      prev.map((s) => (s.service === serviceName ? { ...s, tested: 'testing' } : s))
    )
    setTestResultMsg(null)

    try {
      if (serviceName === 'Google TTS' || serviceName === 'Cloudflare R2') {
        // Test Google TTS + R2 bằng cách tạo một từ ngắn 'test'
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
        // Test các dịch vụ ảnh bằng cách gọi search-images Edge Function
        // Unsplash là dịch vụ chính, Pexels/Pixabay dự phòng. 
        // Edge Function search-images sẽ tự kiểm tra key phía server.
        let source: 'unsplash' | 'pexels' | 'pixabay' = 'unsplash'
        if (serviceName.includes('Pexels')) source = 'pexels'
        if (serviceName.includes('Pixabay')) source = 'pixabay'

        const res = await imageSearchService.search('apple', { perPage: 1, source })
        if (res && Array.isArray(res.results)) {
          setSecrets((prev) =>
            prev.map((s) => (s.service === serviceName ? { ...s, tested: 'success' } : s))
          )
          setTestResultMsg(`Kết nối tới ${serviceName} THÀNH CÔNG! Tìm thấy ${res.total || res.results.length} hình ảnh.`);
        } else {
          throw new Error('Không nhận được kết quả tìm kiếm ảnh hợp lệ')
        }
      }
    } catch (err: any) {
      console.error(err)
      const errorMsg = err.message || 'Kết nối thất bại. Lỗi không xác định.'
      setSecrets((prev) =>
        prev.map((s) =>
          s.service === serviceName || (serviceName === 'Google TTS' && s.service === 'Cloudflare R2')
            ? { ...s, tested: 'failed', errorMessage: errorMsg }
            : s
        )
      )
      setTestResultMsg(`Kết nối tới ${serviceName} THẤT BẠI: ${errorMsg}`);
    }
  }

  const getStatusIcon = (status: SecretStatus['tested']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="text-green-600" size={20} />
      case 'failed':
        return <AlertTriangle className="text-rose-600" size={20} />
      case 'testing':
        return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      default:
        return <HelpCircle className="text-muted-foreground" size={20} />
    }
  }

  const getStatusBadge = (status: SecretStatus['tested']) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300 text-xs font-black">
            KẾT NỐI TỐT
          </span>
        )
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black">
            LỖI KẾT NỐI
          </span>
        )
      case 'testing':
        return (
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 text-xs font-black">
            ĐANG THỬ...
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 text-xs font-black">
            CHƯA KIỂM TRA
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">API KEYS & SECRETS</h1>
        <p className="text-muted-foreground font-bold">
          Kiểm tra trạng thái kết nối của các API Key và Service Secrets lưu tại Server.
        </p>
      </div>

      {/* Security Banner */}
      <div className="neo-card p-4 bg-amber-50 border-2 border-amber-400 text-amber-900 rounded-md flex gap-3 shadow-[4px_4px_0_var(--border)]">
        <ShieldAlert className="shrink-0 text-amber-600 mt-0.5" size={20} />
        <div>
          <h4 className="font-black text-sm uppercase">Cảnh báo bảo mật</h4>
          <p className="text-xs font-bold mt-1 leading-relaxed">
            Các API Keys và Secrets được lưu trữ bảo mật trên môi trường chạy Edge Functions của Supabase. 
            Để chỉnh sửa giá trị của các biến này, vui lòng thay đổi file <code className="bg-amber-100 px-1 py-0.5 border border-amber-300 rounded font-mono text-[11px]">.env</code> ở local và chạy lệnh 
            <code className="bg-amber-100 px-1 py-0.5 border border-amber-300 rounded font-mono text-[11px] ml-1">pnpm sync:secrets</code>. Giao diện quản trị chỉ hỗ trợ Test Connection gián tiếp để đảm bảo an toàn tối đa.
          </p>
        </div>
      </div>

      {testResultMsg && (
        <div className={`p-4 border-2 rounded-md font-bold text-sm ${
          testResultMsg.includes('THÀNH CÔNG') 
            ? 'bg-green-50 border-green-400 text-green-900' 
            : 'bg-rose-50 border-rose-400 text-rose-900'
        }`}>
          {testResultMsg}
        </div>
      )}

      {/* Secrets List */}
      <div className="flex flex-col gap-4">
        {secrets.map((secret, idx) => (
          <div
            key={idx}
            className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 bg-muted border-2 border-border text-foreground rounded shadow-[2px_2px_0_var(--border)] mt-0.5">
                <KeyRound size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-foreground">{secret.name}</h3>
                  {getStatusBadge(secret.tested)}
                </div>
                <p className="text-xs text-muted-foreground font-bold mt-1">{secret.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-muted-foreground uppercase">Server Key:</span>
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-foreground">
                    {secret.envKey}
                  </code>
                </div>
                {secret.errorMessage && (
                  <div className="mt-2 text-xs font-bold text-rose-700 bg-rose-50 p-2 border border-rose-200 rounded">
                    Lỗi: {secret.errorMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              <div className="shrink-0">{getStatusIcon(secret.tested)}</div>
              <button
                onClick={() => handleTestService(secret.service)}
                disabled={secret.tested === 'testing'}
                className="neo-button min-h-0 px-3 py-2 rounded-md border-2 border-border bg-[#fdc800] text-foreground text-xs font-black flex items-center gap-1 hover:bg-[#e0b000] active:neo-button-active transition-all disabled:opacity-50"
              >
                <Play size={12} />
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
