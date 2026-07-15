import { useEffect, useState } from 'react'
import { BarChart3, GitCompare, List, Play, Save, Volume2 } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { generateAudio } from '@/services/api/generateAudio.api'
import { supabase } from '@/services/supabase/client'
import { useTtsBatchStore } from '@/stores/useTtsBatchStore'
import type { TtsVoiceConfig } from '@/types/admin.types'

type TabKey = 'list' | 'stats' | 'compare'

const VOICE_POPULAR: Record<string, string[]> = {
  'en-US': ['en-US-Neural2-D', 'en-US-Neural2-J', 'en-US-Wavenet-D', 'en-US-Wavenet-B', 'en-US-Standard-D'],
  'en-GB': ['en-GB-Neural2-A', 'en-GB-Neural2-D', 'en-GB-Wavenet-B', 'en-GB-Wavenet-A'],
  'vi-VN': ['vi-VN-Wavenet-A', 'vi-VN-Wavenet-D', 'vi-VN-Standard-C', 'vi-VN-Standard-A'],
  'ja-JP': ['ja-JP-Neural2-B', 'ja-JP-Neural2-D', 'ja-JP-Wavenet-B', 'ja-JP-Wavenet-D'],
  'ko-KR': ['ko-KR-Neural2-A', 'ko-KR-Neural2-C', 'ko-KR-Wavenet-B', 'ko-KR-Wavenet-A'],
  'zh-CN': ['cmn-CN-Wavenet-B', 'cmn-CN-Wavenet-A', 'cmn-CN-Wavenet-D'],
  'fr-FR': ['fr-FR-Neural2-A', 'fr-FR-Neural2-D', 'fr-FR-Wavenet-B', 'fr-FR-Wavenet-D'],
  'de-DE': ['de-DE-Neural2-B', 'de-DE-Neural2-F', 'de-DE-Wavenet-B', 'de-DE-Wavenet-D'],
}

function getVoiceGender(voiceName: string): string {
  const suffix = voiceName.split('-').pop() ?? ''
  if (['A', 'C', 'E', 'F'].includes(suffix)) return 'Nữ'
  if (['B', 'D'].includes(suffix)) return 'Nam'
  return '—'
}

function getVoiceGenderStyle(gender: string): string {
  if (gender === 'Nữ') return 'bg-pink-100 text-pink-800 border-pink-300'
  if (gender === 'Nam') return 'bg-blue-100 text-blue-800 border-blue-300'
  return 'bg-slate-100 text-slate-800 border-slate-300'
}

function getVoiceTypeInfo(voiceName: string): { type: string; price: string; color: string } {
  if (voiceName.includes('Neural2')) return { type: 'Neural2', price: '$16/1M', color: 'bg-violet-100 text-violet-800 border-violet-300' }
  if (voiceName.includes('Wavenet')) return { type: 'WaveNet', price: '$16/1M', color: 'bg-blue-100 text-blue-800 border-blue-300' }
  if (voiceName.includes('Standard')) return { type: 'Standard', price: '$4/1M', color: 'bg-slate-100 text-slate-800 border-slate-300' }
  if (voiceName.includes('Studio')) return { type: 'Studio', price: '$16/1M', color: 'bg-amber-100 text-amber-800 border-amber-300' }
  return { type: '—', price: '—', color: 'bg-slate-100 text-slate-800 border-slate-300' }
}

interface CompareSlot {
  lang: string
  voice: string
  audioUrl: string | null
  loading: boolean
  played: boolean
}

export default function AdminTtsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('list')
  const [configs, setConfigs] = useState<TtsVoiceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit form
  const [editingLang, setEditingLang] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<TtsVoiceConfig>>({})

  // TTS Preview
  const [testText, setTestText] = useState('Welcome to MemoryLang! Let\'s learn some vocabulary.')
  const [testLang, setTestLang] = useState('en-US')
  const [testVoice, setTestVoice] = useState('en-US-Neural2-D')
  const [testLoading, setTestLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState<{ cached: number; uncached: number; total: number; avgChars: number }>({ cached: 0, uncached: 0, total: 0, avgChars: 0 })
  const [statsLoading, setStatsLoading] = useState(false)

  // Batch audio generation state from store
  const {
    batchRunning,
    batchProgress,
    batchError,
    startBatchGenerate,
    stopBatchGenerate
  } = useTtsBatchStore()

  // Voice comparison
  const [compareText, setCompareText] = useState('Welcome to MemoryLang! Let\'s learn some vocabulary.')
  const [compareSlots, setCompareSlots] = useState<CompareSlot[]>([
    { lang: 'en-US', voice: 'en-US-Neural2-D', audioUrl: null, loading: false, played: false },
    { lang: 'en-US', voice: 'en-US-Wavenet-D', audioUrl: null, loading: false, played: false },
    { lang: 'en-US', voice: 'en-US-Standard-D', audioUrl: null, loading: false, played: false },
  ])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const data = await adminService.listTtsConfigs()
      setConfigs(data)
      if (data.length > 0 && !data.find(c => c.language_code === testLang)) {
        setTestLang(data[0].language_code)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải cấu hình TTS')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)

      // 1. Get total count
      const { count: total, error: totalErr } = await supabase
        .from('global_terms')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
      if (totalErr) throw totalErr

      // 2. Get cached count (non-null and non-empty)
      const { count: cached, error: cachedErr } = await supabase
        .from('global_terms')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('audio_url', 'is', null)
        .neq('audio_url', '')
      if (cachedErr) throw cachedErr

      // 3. Get representative sample for average word length
      const { data: sampleData } = await supabase
        .from('global_terms')
        .select('normalized_text')
        .is('deleted_at', null)
        .limit(100)

      const totalCount = total ?? 0
      const cachedCount = cached ?? 0

      const sample = sampleData ?? []
      const totalSampleChars = sample.reduce((sum, t) => sum + (t.normalized_text?.length ?? 0), 0)
      const avgChars = sample.length > 0 ? Math.round(totalSampleChars / sample.length) : 11

      setStats({
        cached: cachedCount,
        uncached: totalCount - cachedCount,
        total: totalCount,
        avgChars,
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    void loadConfigs()
  }, [])

  useEffect(() => {
    if (activeTab === 'stats') void loadStats()
  }, [activeTab])

  useEffect(() => {
    if (!batchRunning && activeTab === 'stats') {
      void loadStats()
    }
  }, [batchRunning, activeTab])

  useEffect(() => {
    const config = configs.find(c => c.language_code === testLang)
    if (config) setTestVoice(config.voice_name)
  }, [testLang, configs])

  const handleEditClick = (config: TtsVoiceConfig) => {
    setEditingLang(config.language_code)
    setEditForm({ ...config })
  }

  const handleCancelEdit = () => {
    setEditingLang(null)
    setEditForm({})
  }

  const handleSaveEdit = async () => {
    if (!editingLang || !editForm.voice_name) return
    try {
      setError(null)
      const updated = await adminService.updateTtsConfig(editingLang, {
        voice_name: editForm.voice_name,
        speaking_rate: Number(editForm.speaking_rate || 1.0),
        pitch: Number(editForm.pitch || 0),
        enabled: editForm.enabled,
      })
      setConfigs(prev => prev.map(c => c.language_code === editingLang ? updated : c))
      setEditingLang(null)
      setEditForm({})
      alert('Đã cập nhật cấu hình giọng đọc thành công!')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi cập nhật cấu hình giọng đọc')
    }
  }

  const handleTestTts = async () => {
    if (!testText.trim()) return
    try {
      setTestLoading(true)
      setError(null)
      setAudioUrl(null)
      const res = await generateAudio(testText, testLang, testVoice)
      if (res.audioUrl) {
        setAudioUrl(res.audioUrl)
        const audio = new Audio(res.audioUrl)
        await audio.play()
      } else {
        throw new Error('Không tạo được file âm thanh')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Kiểm tra TTS thất bại. Vui lòng kiểm tra lại API credentials.')
    } finally {
      setTestLoading(false)
    }
  }

  const handleCompareSlot = async (index: number) => {
    const slot = compareSlots[index]
    if (!slot || !compareText.trim()) return

    // Use cached result if already played
    if (slot.audioUrl) {
      const audio = new Audio(slot.audioUrl)
      await audio.play()
      return
    }

    try {
      setError(null)
      setCompareSlots(prev => prev.map((s, i) => i === index ? { ...s, loading: true } : s))
      const res = await generateAudio(compareText, slot.lang, slot.voice)
      if (res.audioUrl) {
        setCompareSlots(prev => prev.map((s, i) =>
          i === index ? { ...s, audioUrl: res.audioUrl, loading: false, played: true } : s
        ))
        const audio = new Audio(res.audioUrl)
        await audio.play()
      } else {
        throw new Error('Không tạo được file âm thanh')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'So sánh giọng thất bại')
      setCompareSlots(prev => prev.map((s, i) => i === index ? { ...s, loading: false } : s))
    }
  }

  const handleCompareStopAll = () => {
    setCompareSlots(prev => prev.map(s => ({ ...s, audioUrl: null, played: false })))
  }

  const tabButtons: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: 'list', icon: <List size={14} />, label: 'Danh sách' },
    { key: 'stats', icon: <BarChart3 size={14} />, label: 'Thống kê' },
    { key: 'compare', icon: <GitCompare size={14} />, label: 'So sánh giọng' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Title + Tab nav */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">CẤU HÌNH TTS</h1>
        <p className="text-muted-foreground font-bold">Cấu hình giọng đọc Google Cloud Text-to-Speech cho từng ngôn ngữ.</p>
        <div className="flex gap-1 mt-3">
          {tabButtons.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setError(null) }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-black border-2 transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground border-primary shadow-[2px_2px_0_var(--border)]'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
          {error}
        </div>
      )}

      {/* TAB: Danh sách cấu hình */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Config Table */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="neo-card bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted">
                    <th className="px-3 py-3 font-black text-foreground uppercase border-r border-border/30">Mã</th>
                    <th className="px-3 py-3 font-black text-foreground uppercase border-r border-border/30">Giọng đọc</th>
                    <th className="px-3 py-3 font-black text-foreground uppercase border-r border-border/30 text-center">Loại</th>
                    <th className="px-3 py-3 font-black text-foreground uppercase border-r border-border/30 text-center">Tốc độ / Cao độ</th>
                    <th className="px-3 py-3 font-black text-foreground uppercase border-r border-border/30 text-center">Giới tính</th>
                    <th className="px-3 py-3 font-black text-foreground uppercase text-center">Sửa</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center font-bold text-muted-foreground">
                        Đang tải cấu hình giọng đọc...
                      </td>
                    </tr>
                  ) : (
                    configs.map((config) => {
                      const typeInfo = getVoiceTypeInfo(config.voice_name)
                      return (
                        <tr
                          key={config.language_code}
                          className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 odd:bg-card even:bg-muted/10 transition-colors"
                        >
                          <td className="px-3 py-3 font-black uppercase border-r border-border/30">{config.language_code}</td>
                          <td className="px-3 py-3 font-bold border-r border-border/30 font-mono">{config.voice_name}</td>
                          <td className="px-3 py-3 font-bold text-center border-r border-border/30">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${typeInfo.color}`}>
                              {typeInfo.type} · {typeInfo.price}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-bold text-center border-r border-border/30">
                            {config.speaking_rate}x / {config.pitch}st
                          </td>
                          <td className="px-3 py-3 font-bold text-center border-r border-border/30">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getVoiceGenderStyle(getVoiceGender(config.voice_name))}`}>
                              {getVoiceGender(config.voice_name)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleEditClick(config)}
                              className="neo-button min-h-0 px-2 py-1 rounded bg-[#fdc800] text-foreground text-xs font-black border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-[#e0b000] transition-all"
                            >
                              Sửa
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Edit Form / Preview */}
          <div className="flex flex-col gap-6">
            {editingLang && (
              <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
                <div className="flex justify-between items-center border-b-2 border-border pb-2">
                  <h3 className="text-md font-black uppercase text-foreground">Sửa: {editingLang}</h3>
                  <button onClick={handleCancelEdit} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                    Hủy
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-black text-foreground">Voice Name</label>
                    <input
                      type="text"
                      value={editForm.voice_name || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, voice_name: e.target.value }))}
                      className="px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-mono font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black text-foreground">Tốc độ (Rate)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.25"
                        max="4.0"
                        value={editForm.speaking_rate || 1.0}
                        onChange={e => setEditForm(prev => ({ ...prev, speaking_rate: Number(e.target.value) }))}
                        className="px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-bold focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black text-foreground">Cao độ (Pitch)</label>
                      <input
                        type="number"
                        step="1"
                        min="-20"
                        max="20"
                        value={editForm.pitch || 0}
                        onChange={e => setEditForm(prev => ({ ...prev, pitch: Number(e.target.value) }))}
                        className="px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-bold focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 neo-button min-h-0 py-2 rounded-md border-2 border-border text-xs font-black bg-secondary text-secondary-foreground hover:bg-[#321fb0] active:neo-button-active transition"
                  >
                    <Save size={14} />
                    Lưu cấu hình
                  </button>
                </div>
              </div>
            )}

            {/* Test Voice */}
            <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
              <h3 className="text-md font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-1.5">
                <Volume2 size={18} />
                THỬ GIỌNG ĐỌC TTS
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Chọn ngôn ngữ</label>
                  <select
                    value={testLang}
                    onChange={e => setTestLang(e.target.value)}
                    className="px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-bold focus:outline-none focus:border-primary"
                  >
                    {configs.map(c => (
                      <option key={c.language_code} value={c.language_code}>
                        {c.language_code}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Giọng đọc</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testVoice}
                      onChange={e => setTestVoice(e.target.value)}
                      className="flex-1 px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-mono font-bold focus:outline-none focus:border-primary"
                    />
                    <select
                      value={testVoice}
                      onChange={e => setTestVoice(e.target.value)}
                      className="px-2 py-1.5 border-2 border-border rounded bg-card text-xs font-mono font-bold focus:outline-none focus:border-primary"
                    >
                      {(VOICE_POPULAR[testLang] ?? []).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Văn bản phát thử</label>
                  <textarea
                    rows={3}
                    value={testText}
                    onChange={e => setTestText(e.target.value)}
                    className="px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-bold focus:outline-none focus:border-primary resize-none"
                  />
                </div>
                <button
                  onClick={handleTestTts}
                  disabled={testLoading || !testText.trim()}
                  className="w-full flex items-center justify-center gap-1.5 neo-button min-h-0 py-2 rounded-md border-2 border-border text-xs font-black bg-primary text-primary-foreground hover:bg-[#e0b000] active:neo-button-active transition disabled:opacity-50"
                >
                  {testLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play size={14} />
                      Nghe thử TTS
                    </>
                  )}
                </button>
                {audioUrl && (
                  <div className="mt-2 p-2 bg-muted border border-border rounded flex flex-col gap-1">
                    <span className="text-xs font-black text-muted-foreground">AUDIO URL:</span>
                    <a href={audioUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate font-mono font-bold">
                      {audioUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Thống kê */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card: Cache Hit Rate */}
            <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2">
              <span className="text-xs font-black text-muted-foreground uppercase">Tỉ lệ cache</span>
              {statsLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-3xl font-black text-foreground">
                    {stats.total > 0 ? Math.round((stats.cached / stats.total) * 100) : 0}%
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {stats.cached}/{stats.total} từ đã có audio
                  </span>
                </>
              )}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${stats.total > 0 ? (stats.cached / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Card: Voice Distribution */}
            <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2">
              <span className="text-xs font-black text-muted-foreground uppercase">Phân bố giọng</span>
              <div className="flex flex-col gap-1 mt-1">
                {(() => {
                  const dist: Record<string, number> = {}
                  configs.forEach(c => {
                    const t = getVoiceTypeInfo(c.voice_name).type
                    dist[t] = (dist[t] ?? 0) + 1
                  })
                  return Object.entries(dist).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${type === 'Neural2' ? 'bg-violet-100 text-violet-800 border-violet-300' : type === 'WaveNet' ? 'bg-blue-100 text-blue-800 border-blue-300' : type === 'Standard' ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                        {type}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">{count} ngôn ngữ</span>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Card: Estimated Cost */}
            <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2">
              <span className="text-xs font-black text-muted-foreground uppercase">Chi phí ước tính</span>
              {statsLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (() => {
                const totalChars = stats.total * stats.avgChars
                const costStandard = ((totalChars / 1_000_000) * 4).toFixed(2)
                const costWaveNet = ((totalChars / 1_000_000) * 16).toFixed(2)
                return (
                  <>
                    <span className="text-3xl font-black text-foreground">~${costWaveNet}</span>
                    <div className="text-xs font-bold text-muted-foreground space-y-0.5">
                      <div className="flex justify-between">
                        <span>Standard:</span>
                        <span>${costStandard}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WaveNet / Neural2:</span>
                        <span>${costWaveNet}</span>
                      </div>
                      <div className="flex justify-between mt-1 pt-1 border-t border-border/30">
                        <span>Tổng ký tự:</span>
                        <span>{(totalChars / 1000).toFixed(1)}K</span>
                      </div>
                    </div>
                    <div className="mt-1 p-1.5 bg-emerald-50 border border-emerald-200 rounded text-xs font-bold text-emerald-800">
                      ✅ Free tier: 100K chars/tháng (WaveNet)
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Card: Generation Status */}
            <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2">
              <span className="text-xs font-black text-muted-foreground uppercase">Trạng thái sinh audio</span>
              {statsLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <div className="flex gap-3 mt-1">
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-black text-emerald-600">{stats.cached}</div>
                      <div className="text-xs font-bold text-muted-foreground">Đã cache</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-black text-amber-600">{stats.uncached}</div>
                      <div className="text-xs font-bold text-muted-foreground">Chưa cache</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-black text-foreground">{stats.total}</div>
                      <div className="text-xs font-bold text-muted-foreground">Tổng</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground mt-1">
                    TB {stats.avgChars} ký tự/từ
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Batch Generator Card */}
          <div className="neo-card p-6 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
            <h3 className="text-md font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              SINH AUDIO HÀNG LOẠT (BATCH GENERATOR)
            </h3>
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
              Tính năng này quét toàn bộ cơ sở dữ liệu từ vựng toàn cục (`global_terms`), tìm các từ chưa có file âm thanh (`audio_url` là null) và tự động gọi Google Cloud TTS để tạo giọng đọc WaveNet/Neural2 chuẩn rồi tải lên Cloudflare R2 cache.
            </p>

            {batchError && (
              <div className="p-3 bg-rose-100 border border-rose-400 text-rose-900 rounded font-bold text-xs">
                {batchError}
              </div>
            )}

            {batchRunning ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-black">
                  <span>
                    Đang sinh audio: {batchProgress.current} / {batchProgress.total} từ (
                    {Math.round((batchProgress.current / batchProgress.total) * 100)}%)
                  </span>
                  <button
                    onClick={stopBatchGenerate}
                    className="px-3 py-1 bg-rose-600 text-white rounded text-[10px] font-black hover:bg-rose-700 transition"
                  >
                    Dừng lại (Stop)
                  </button>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden border">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs font-bold text-muted-foreground justify-center">
                  <span className="text-emerald-600">Thành công: {batchProgress.successes}</span>
                  <span className="text-rose-600">Thất bại: {batchProgress.failures}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => startBatchGenerate(configs)}
                  disabled={statsLoading || stats.uncached === 0}
                  className="neo-button bg-[#fdc800] hover:bg-[#e0b000] text-foreground font-black text-xs px-6 py-3 border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition disabled:opacity-50"
                >
                  ▶ Bắt đầu sinh {stats.uncached} audio còn thiếu
                </button>
                {stats.uncached === 0 && (
                  <span className="text-xs font-bold text-emerald-600">
                    🎉 Tất cả từ vựng đều đã có file âm thanh!
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: So sánh giọng */}
      {activeTab === 'compare' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Common text + add/remove slots */}
          <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
            <h3 className="text-md font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-1.5">
              <GitCompare size={18} />
              SO SÁNH GIỌNG ĐỌC
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-foreground">Văn bản so sánh</label>
              <textarea
                rows={3}
                value={compareText}
                onChange={e => setCompareText(e.target.value)}
                className="px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-bold focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex flex-col gap-3">
              {compareSlots.map((slot, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-muted/30 border border-border rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-muted-foreground w-16">Giọng {i + 1}</span>
                    <select
                      value={slot.lang}
                      onChange={e => {
                        const newLang = e.target.value
                        setCompareSlots(prev => prev.map((s, idx) => idx === i ? {
                          ...s,
                          lang: newLang,
                          voice: VOICE_POPULAR[newLang]?.[0] ?? s.voice,
                          audioUrl: null,
                          played: false,
                        } : s))
                      }}
                      className="px-2 py-1 border-2 border-border rounded bg-card text-xs font-bold focus:outline-none focus:border-primary w-20"
                    >
                      {configs.map(c => (
                        <option key={c.language_code} value={c.language_code}>{c.language_code}</option>
                      ))}
                    </select>
                    <select
                      value={slot.voice}
                      onChange={e => setCompareSlots(prev => prev.map((s, idx) => idx === i ? { ...s, voice: e.target.value, audioUrl: null, played: false } : s))}
                      className="flex-1 px-2 py-1 border-2 border-border rounded bg-card text-xs font-mono font-bold focus:outline-none focus:border-primary"
                    >
                      {(VOICE_POPULAR[slot.lang] ?? [slot.voice]).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${getVoiceTypeInfo(slot.voice).color}`}>
                      {getVoiceTypeInfo(slot.voice).type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCompareSlot(i)}
                    disabled={slot.loading || !compareText.trim()}
                    className="w-full flex items-center justify-center gap-1 neo-button min-h-0 py-1.5 rounded border-2 border-border text-xs font-black bg-secondary text-secondary-foreground hover:bg-[#321fb0] active:neo-button-active transition disabled:opacity-50"
                  >
                    {slot.loading ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Play size={12} />
                        {slot.played ? 'Phát lại' : 'Nghe thử'}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCompareStopAll}
                className="flex-1 neo-button min-h-0 py-1.5 rounded border-2 border-border text-xs font-black bg-muted text-foreground hover:bg-muted/80 active:neo-button-active transition"
              >
                Reset tất cả
              </button>
            </div>
          </div>

          {/* Right: Quick info */}
          <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
            <h3 className="text-md font-black border-b-2 border-border pb-2 text-foreground">THÔNG TIN GIỌNG</h3>
            <div className="flex flex-col gap-2">
              {compareSlots.map((slot, i) => {
                const typeInfo = getVoiceTypeInfo(slot.voice)
                const gender = getVoiceGender(slot.voice)
                return (
                  <div key={i} className="p-3 bg-muted/30 border border-border rounded flex flex-col gap-1">
                    <span className="text-xs font-black text-foreground font-mono">{slot.voice}</span>
                    <div className="flex gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${typeInfo.color}`}>
                        {typeInfo.type} · {typeInfo.price}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${getVoiceGenderStyle(gender)}`}>
                        {gender}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black border bg-slate-100 text-slate-800 border-slate-300">
                        {slot.lang}
                      </span>
                    </div>
                    {slot.played && (
                      <span className="text-xs font-bold text-emerald-600">✅ Đã tạo audio</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs font-bold text-amber-800">
              💡 Mẹo: Neural2 cho chất lượng tốt nhất, WaveNet cho ngôn ngữ chưa có Neural2. Cùng mức giá $16/1M ký tự.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
