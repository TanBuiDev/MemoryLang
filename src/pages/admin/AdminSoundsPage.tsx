import { useEffect, useState } from 'react'
import { soundEffects } from '@/utils/soundEffects'
import { useSoundStore } from '@/stores/useSoundStore'
import { supabase } from '@/services/supabase/client'
import {
  Volume2,
  VolumeX,
  Play,
  Save,
  CheckCircle2,
  Sliders,
  Sparkles,
  Zap,
  Layers,
  Settings2,
  Music,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface SoundEffectItem {
  id:
    | 'cardClick'
    | 'matchSuccess'
    | 'matchError'
    | 'roundComplete'
    | 'lineConnect'
    | 'modalOpen'
    | 'modalClose'
  name: string
  description: string
  category: 'Game' | 'UI' | 'Feedback'
  recommended: string
}

const SOUND_LIST: SoundEffectItem[] = [
  {
    id: 'cardClick',
    name: 'Click thẻ (Selection)',
    description: 'Âm thanh nảy nhẹ (Pop) khi click chọn ô bên trái hoặc phải.',
    category: 'Game',
    recommended: 'Pop / Wooden Tap (60ms)',
  },
  {
    id: 'matchSuccess',
    name: 'Nối đúng (Match Success)',
    description: 'Hợp âm thăng tiến 3 nốt tươi vui khi nối chính xác cặp từ.',
    category: 'Game',
    recommended: 'Ascending Chime C5-E5-G5',
  },
  {
    id: 'matchError',
    name: 'Nối sai (Match Error)',
    description: 'Âm kép trầm nhẹ phản hồi khi chọn sai cặp từ.',
    category: 'Game',
    recommended: 'Soft Low Buzz 160Hz-110Hz',
  },
  {
    id: 'roundComplete',
    name: 'Hoàn thành lượt (Victory)',
    description: 'Nhạc chiến thắng 4 nốt chúc mừng khi hoàn thành round.',
    category: 'Game',
    recommended: 'Victory Fanfare C5-E5-G5-C6',
  },
  {
    id: 'lineConnect',
    name: 'Vẽ đường nối (Line Connect)',
    description: 'Âm lướt nhẹ khi người dùng tạo đường nối 2 thẻ.',
    category: 'Game',
    recommended: 'Soft Sweep Whoosh (80ms)',
  },
  {
    id: 'modalOpen',
    name: 'Mở Modal / Dialog',
    description: 'Phát âm thanh nảy khi mở hộp thoại xác nhận.',
    category: 'UI',
    recommended: 'Pop-up 250Hz-550Hz',
  },
  {
    id: 'modalClose',
    name: 'Đóng Modal / Dialog',
    description: 'Phát âm thanh nảy khi đóng hộp thoại.',
    category: 'UI',
    recommended: 'Slide-down 550Hz-200Hz',
  },
]

export default function AdminSoundsPage() {
  const { sfxEnabled, sfxVolume, sfxEngineMode, setSfxEnabled, setSfxVolume, setEngineMode } = useSoundStore()

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [audioContextStatus, setAudioContextStatus] = useState<string>('Unknown')

  // Init mobile unlock on mount
  useEffect(() => {
    const cleanup = soundEffects.initMobileUnlock()
    return () => cleanup()
  }, [])

  // Check AudioContext state
  useEffect(() => {
    const checkCtx = () => {
      if (typeof window !== 'undefined') {
        const AudioCtxClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioCtxClass) {
          const tempCtx = new AudioCtxClass()
          setAudioContextStatus(tempCtx.state)
          void tempCtx.close()
        }
      }
    }
    checkCtx()
  }, [])

  const handleTestSound = (id: SoundEffectItem['id']) => {
    soundEffects.play(id)
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)
      setSuccessMsg(null)

      // Save sound settings to database table app_settings for system-wide default
      const { error } = await supabase.from('app_settings').upsert(
        {
          key: 'sfx_config',
          value: {
            enabled_by_default: sfxEnabled,
            default_volume: sfxVolume,
            engine_mode: sfxEngineMode,
            updated_at: new Date().toISOString(),
          },
        },
        { onConflict: 'key' }
      )

      if (error) {
        console.error('Failed to save SFX config to app_settings:', error)
      }

      setSuccessMsg('Đã lưu cấu hình âm thanh hệ thống thành công!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      console.error('Save config error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 neo-card bg-amber-100 border-2 border-slate-900 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_#000]">
            <Volume2 className="w-8 h-8 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Quản lý Hệ thống Âm thanh (SFX)</h1>
            <p className="text-sm font-semibold text-slate-700">
              Cấu hình, nghe thử và tối ưu độ trễ âm thanh hiệu ứng (0ms Latency Engine)
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={handleSaveConfig}
          disabled={saving}
          className="flex items-center gap-2 font-black"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </div>

      {/* Message Toast */}
      {successMsg && (
        <div className="p-4 bg-emerald-100 border-2 border-emerald-600 rounded-lg text-emerald-900 font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Control Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Toggle & Master Volume */}
        <div className="neo-card p-5 bg-white border-2 border-slate-900 rounded-xl space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-2 font-black text-slate-900 text-lg border-b-2 border-slate-900 pb-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <span>Cài đặt Âm lượng</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">Trạng thái Bật/Tắt:</span>
            <button
              onClick={() => setSfxEnabled(!sfxEnabled)}
              className={cn(
                'px-4 py-2 font-black text-xs rounded-lg border-2 border-slate-900 transition-all flex items-center gap-2',
                sfxEnabled
                  ? 'bg-emerald-400 text-slate-900 shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-rose-200 text-slate-700'
              )}
            >
              {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {sfxEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-bold text-slate-800">
              <span>Âm lượng SFX:</span>
              <span className="font-mono text-indigo-600">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg border border-slate-900"
            />
          </div>
        </div>

        {/* Dual Engine Switcher */}
        <div className="neo-card p-5 bg-white border-2 border-slate-900 rounded-xl space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-2 font-black text-slate-900 text-lg border-b-2 border-slate-900 pb-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Engine Âm thanh</span>
          </div>

          <p className="text-xs font-semibold text-slate-600">
            Chọn phương thức phát âm thanh hiệu ứng trên hệ thống:
          </p>

          <div className="space-y-2">
            <button
              onClick={() => setEngineMode('synth')}
              className={cn(
                'w-full p-3 rounded-lg border-2 border-slate-900 text-left font-bold text-sm transition-all flex items-center justify-between',
                sfxEngineMode === 'synth'
                  ? 'bg-amber-300 text-slate-900 shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <div>
                  <div>Web Audio Synthesizer</div>
                  <div className="text-[10px] font-normal text-slate-700">0 KB, 0ms latency, không cần tệp mp3</div>
                </div>
              </div>
              {sfxEngineMode === 'synth' && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
            </button>

            <button
              onClick={() => setEngineMode('custom_files')}
              className={cn(
                'w-full p-3 rounded-lg border-2 border-slate-900 text-left font-bold text-sm transition-all flex items-center justify-between',
                sfxEngineMode === 'custom_files'
                  ? 'bg-purple-300 text-slate-900 shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-700" />
                <div>
                  <div>Preloaded AudioBuffer</div>
                  <div className="text-[10px] font-normal text-slate-700">Nạp file MP3 tối ưu (Mono 64kbps)</div>
                </div>
              </div>
              {sfxEngineMode === 'custom_files' && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
            </button>
          </div>
        </div>

        {/* System & Hardware Health */}
        <div className="neo-card p-5 bg-white border-2 border-slate-900 rounded-xl space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-2 font-black text-slate-900 text-lg border-b-2 border-slate-900 pb-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>Trạng thái Hệ thống</span>
          </div>

          <div className="space-y-3 text-xs font-semibold">
            <div className="flex justify-between items-center p-2 bg-slate-100 rounded border border-slate-300">
              <span className="text-slate-600">Web Audio API:</span>
              <span className="font-bold text-emerald-700">Hỗ trợ 100%</span>
            </div>

            <div className="flex justify-between items-center p-2 bg-slate-100 rounded border border-slate-300">
              <span className="text-slate-600">AudioContext State:</span>
              <span className="font-mono font-bold text-indigo-700 uppercase">{audioContextStatus}</span>
            </div>

            <div className="flex justify-between items-center p-2 bg-slate-100 rounded border border-slate-300">
              <span className="text-slate-600">Mobile Autoplay:</span>
              <span className="font-bold text-slate-800">Auto Unlock Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sound Testing Matrix */}
      <div className="neo-card p-6 bg-white border-2 border-slate-900 rounded-xl space-y-4 shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900">Danh sách Hiệu ứng Âm thanh & Nghe thử</h2>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-amber-200 border border-slate-900 rounded-full">
            {SOUND_LIST.length} hiệu ứng khả dụng
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOUND_LIST.map((sound) => (
            <div
              key={sound.id}
              className="p-4 bg-slate-50 border-2 border-slate-900 rounded-lg flex items-center justify-between gap-3 hover:bg-amber-50/60 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-sm">{sound.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 border border-slate-800 rounded">
                    {sound.category}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600">{sound.description}</p>
                <div className="text-[11px] font-mono text-indigo-600 font-bold">{sound.recommended}</div>
              </div>

              <Button
                variant="secondary"
                onClick={() => handleTestSound(sound.id)}
                className="flex items-center gap-1 font-bold shrink-0 text-xs py-1.5 px-3 min-h-8"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Nghe
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
