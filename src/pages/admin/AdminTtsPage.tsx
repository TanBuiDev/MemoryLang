import { useEffect, useState } from 'react'
import { BarChart3, GitCompare, List, Play, Save, Volume2, Sparkles, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
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

  // Default Global Speech Rate & Pitch settings
  const [speechRate, setSpeechRate] = useState<number>(1.0)
  const [speechPitch, setSpeechPitch] = useState<number>(0)
  const [savingGlobalSettings, setSavingGlobalSettings] = useState(false)
  const [testGlobalAudioLoading, setTestGlobalAudioLoading] = useState(false)

  // Edit form for individual languages
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

  const loadData = async () => {
    try {
      setLoading(true)
      const [configsData, settingsData] = await Promise.all([
        adminService.listTtsConfigs(),
        adminService.listSettings(),
      ])

      setConfigs(configsData)
      if (configsData.length > 0 && !configsData.find(c => c.language_code === testLang)) {
        setTestLang(configsData[0].language_code)
      }

      // Load global rate & pitch
      const rateSetting = settingsData.find(s => s.key === 'default_speech_rate')
      if (rateSetting?.value) setSpeechRate(Number(rateSetting.value))

      const pitchSetting = settingsData.find(s => s.key === 'default_speech_pitch')
      if (pitchSetting?.value) setSpeechPitch(Number(pitchSetting.value))
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

      const { count: total, error: totalErr } = await supabase
        .from('global_terms')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
      if (totalErr) throw totalErr

      const { count: cached, error: cachedErr } = await supabase
        .from('global_terms')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('audio_url', 'is', null)
        .neq('audio_url', '')
      if (cachedErr) throw cachedErr

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
    void loadData()
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

  // Save global rate & pitch settings
  const handleSaveGlobalTtsSettings = async () => {
    try {
      setSavingGlobalSettings(true)
      setError(null)
      await Promise.all([
        adminService.updateSetting('default_speech_rate', speechRate),
        adminService.updateSetting('default_speech_pitch', speechPitch),
      ])
      showToast({
        type: 'success',
        title: 'Đã lưu cấu hình TTS mặc định',
        message: `Đã cập nhật Tốc độ (${speechRate}x) và Pitch (${speechPitch}).`,
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi lưu cấu hình TTS mặc định')
    } finally {
      setSavingGlobalSettings(false)
    }
  }

  // Play audio test with active rate & pitch
  const handleTestGlobalAudio = async () => {
    try {
      setTestGlobalAudioLoading(true)
      setError(null)
      const sampleText = 'Welcome to MemoryLang. This is a voice speed and pitch audio test.'
      const res = await generateAudio(sampleText, 'en-US', 'en-US-Wavenet-D')
      if (res.audioUrl) {
        const audio = new Audio(res.audioUrl)
        audio.playbackRate = speechRate
        await audio.play()
      } else {
        throw new Error('Không thể sinh file âm thanh nghe thử')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Nghe thử âm thanh thất bại')
    } finally {
      setTestGlobalAudioLoading(false)
    }
  }

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
      showToast({
        type: 'success',
        title: 'Đã cập nhật giọng đọc',
        message: 'Cấu hình giọng đọc đã được lưu thành công.',
      })
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
        audio.playbackRate = speechRate
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

    if (slot.audioUrl) {
      const audio = new Audio(slot.audioUrl)
      audio.playbackRate = speechRate
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
        audio.playbackRate = speechRate
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
    { key: 'list', icon: <List size={16} />, label: 'Danh sách Cấu hình' },
    { key: 'stats', icon: <BarChart3 size={16} />, label: 'Thống kê & Sinh Hàng loạt' },
    { key: 'compare', icon: <GitCompare size={16} />, label: 'So sánh Giọng đọc' },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="neo-card p-6 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl border-3 border-border bg-secondary text-secondary-foreground flex items-center justify-center shadow-[2px_2px_0_var(--border)]">
            <Volume2 size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              QUẢN LÝ GIỌNG ĐỌC GOOGLE CLOUD TTS
            </h1>
            <p className="text-sm font-bold text-muted-foreground mt-0.5">
              Cấu hình giọng đọc mặc định, điều chỉnh tốc độ, cao độ âm thanh và phát audio hàng loạt.
            </p>
          </div>
        </div>

        {/* Status badges summary */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-1.5 rounded-lg border-2 border-border bg-violet-50 text-violet-950 font-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0_var(--border)]">
            <Sparkles size={14} className="text-violet-600" />
            <span>{configs.length} Ngôn ngữ TTS</span>
          </div>
        </div>
      </div>

      {/* Global Speech Rate & Pitch Controls Section */}
      <div className="neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b-2 border-border pb-3">
          <div className="flex items-center gap-2">
            <Volume2 size={20} className="text-primary" />
            <div>
              <h2 className="text-base font-black text-foreground">CẤU HÌNH TỐC ĐỘ & CAO ĐỘ TTS MẶC ĐỊNH HỆ THỐNG</h2>
              <p className="text-xs font-bold text-muted-foreground">Tốc độ và cao độ âm thanh áp dụng khi người học nhấn nút đọc từ vựng.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleTestGlobalAudio}
              disabled={testGlobalAudioLoading}
              className="min-h-9 px-3 text-xs"
            >
              {testGlobalAudioLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Play size={14} className="text-primary" />
                  Nghe thử âm thanh
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={handleSaveGlobalTtsSettings}
              disabled={savingGlobalSettings}
              className="min-h-9 px-4 text-xs"
            >
              {savingGlobalSettings ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={14} />
                  Lưu cấu hình mặc định
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rate slider */}
          <div className="flex flex-col gap-2 p-3 border-2 border-border rounded-xl bg-muted/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-foreground">Tốc độ đọc giọng TTS (Rate):</label>
              <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded border-2 border-border bg-primary text-primary-foreground shadow-[1px_1px_0_var(--border)]">
                {speechRate.toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="flex-1 accent-primary cursor-pointer h-2"
              />
            </div>
          </div>

          {/* Pitch slider */}
          <div className="flex flex-col gap-2 p-3 border-2 border-border rounded-xl bg-muted/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-foreground">Cao độ giọng đọc (Pitch):</label>
              <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded border-2 border-border bg-secondary text-secondary-foreground shadow-[1px_1px_0_var(--border)]">
                {speechPitch} st
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="-20"
                max="20"
                step="1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(Number(e.target.value))}
                className="flex-1 accent-secondary cursor-pointer h-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tab buttons */}
      <div className="flex flex-wrap gap-2 pt-1 border-b-3 border-border pb-3">
        {tabButtons.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setError(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border-2 border-border transition-all shadow-[2px_2px_0_var(--border)] active:translate-y-[1px] active:shadow-none ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-3 border-rose-400 text-rose-950 rounded-xl font-bold text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: Danh sách cấu hình */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Config Table (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="neo-card bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] overflow-x-auto rounded-xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/60">
                    <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30">Mã ng ngữ</th>
                    <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30">Tên giọng đọc (Voice Name)</th>
                    <th className="px-3 py-3 font-black text-foreground uppercase border-r border-border/30 text-center">Engine / Giá</th>
                    <th className="px-3 py-3 font-black text-foreground uppercase border-r border-border/30 text-center">Giới tính</th>
                    <th className="px-3 py-3 font-black text-foreground uppercase text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center font-bold text-muted-foreground">
                        Đang tải danh sách giọng đọc...
                      </td>
                    </tr>
                  ) : (
                    configs.map((config) => {
                      const typeInfo = getVoiceTypeInfo(config.voice_name)
                      const gender = getVoiceGender(config.voice_name)
                      return (
                        <tr
                          key={config.language_code}
                          className="border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3.5 font-black uppercase border-r border-border/30">{config.language_code}</td>
                          <td className="px-4 py-3.5 font-bold border-r border-border/30 font-mono text-xs">{config.voice_name}</td>
                          <td className="px-3 py-3.5 font-bold text-center border-r border-border/30">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border-2 border-border shadow-[1px_1px_0_var(--border)] ${typeInfo.color}`}>
                              {typeInfo.type} · {typeInfo.price}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 font-bold text-center border-r border-border/30">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border-2 border-border shadow-[1px_1px_0_var(--border)] ${getVoiceGenderStyle(gender)}`}>
                              {gender}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <Button
                              variant="ghost"
                              onClick={() => handleEditClick(config)}
                              className="min-h-8 px-3 py-1 text-xs"
                            >
                              Sửa
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Edit Form & Test Player (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {editingLang && (
              <div className="neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4 rounded-xl">
                <div className="flex justify-between items-center border-b-2 border-border pb-2">
                  <h3 className="text-sm font-black uppercase text-foreground">SỬA GIỌNG ĐỌC: {editingLang}</h3>
                  <button onClick={handleCancelEdit} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                    Hủy
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-black text-foreground">Tên giọng đọc (Voice Name)</label>
                    <input
                      type="text"
                      value={editForm.voice_name || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, voice_name: e.target.value }))}
                      className="px-3 py-2 border-2 border-border rounded-lg bg-card text-xs font-mono font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleSaveEdit}
                    className="w-full mt-1 min-h-9 text-xs"
                  >
                    <Save size={14} />
                    Lưu giọng đọc
                  </Button>
                </div>
              </div>
            )}

            {/* Test Voice Component */}
            <div className="neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4 rounded-xl">
              <h3 className="text-sm font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-2">
                <Volume2 size={18} className="text-primary" />
                THỬ GIỌNG ĐỌC TTS TẠI CHỖ
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Ngôn ngữ</label>
                  <Select
                    value={testLang}
                    onChange={setTestLang}
                    options={configs.map(c => ({ value: c.language_code, label: c.language_code }))}
                    placeholder="Chọn ngôn ngữ"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Giọng đọc phổ biến</label>
                  <Select
                    value={testVoice}
                    onChange={setTestVoice}
                    options={(VOICE_POPULAR[testLang] ?? []).map(v => ({ value: v, label: v }))}
                    placeholder="Chọn giọng đọc"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Văn bản mẫu phát thử</label>
                  <input
                    type="text"
                    value={testText}
                    onChange={e => setTestText(e.target.value)}
                    className="px-3 py-2 border-2 border-border rounded-lg bg-card text-xs font-bold focus:outline-none focus:border-primary"
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={handleTestTts}
                  disabled={testLoading || !testText.trim()}
                  className="w-full min-h-10 text-xs mt-1"
                >
                  {testLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play size={16} />
                      Nghe thử giọng đọc
                    </>
                  )}
                </Button>

                {audioUrl && (
                  <div className="mt-2 p-2.5 bg-muted border-2 border-border rounded-lg flex flex-col gap-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">Audio Cache URL:</span>
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

      {/* TAB 2: Thống kê & Batch Audio */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Cache Hit Rate */}
            <div className="neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2 rounded-xl">
              <span className="text-xs font-black text-muted-foreground uppercase">Tỉ lệ cache âm thanh</span>
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
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1 border border-border">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${stats.total > 0 ? (stats.cached / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Card 2: Voice Distribution */}
            <div className="neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2 rounded-xl">
              <span className="text-xs font-black text-muted-foreground uppercase">Phân bố công nghệ Voice</span>
              <div className="flex flex-col gap-1.5 mt-1">
                {(() => {
                  const dist: Record<string, number> = {}
                  configs.forEach(c => {
                    const t = getVoiceTypeInfo(c.voice_name).type
                    dist[t] = (dist[t] ?? 0) + 1
                  })
                  return Object.entries(dist).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${type === 'Neural2' ? 'bg-violet-100 text-violet-800 border-violet-300' : type === 'WaveNet' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                        {type}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">{count} ngôn ngữ</span>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Card 3: Estimated Cost */}
            <div className="neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2 rounded-xl">
              <span className="text-xs font-black text-muted-foreground uppercase">Chi phí ước tính Google</span>
              {statsLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (() => {
                const totalChars = stats.total * stats.avgChars
                const costWaveNet = ((totalChars / 1_000_000) * 16).toFixed(2)
                return (
                  <>
                    <span className="text-3xl font-black text-foreground">~${costWaveNet}</span>
                    <div className="text-xs font-bold text-muted-foreground space-y-0.5">
                      <div className="flex justify-between">
                        <span>Tổng ký tự:</span>
                        <span>{(totalChars / 1000).toFixed(1)}K ký tự</span>
                      </div>
                    </div>
                    <div className="mt-1 p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <span>Free tier: 100K chars/tháng</span>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Card 4: Generation Status */}
            <div className="neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2 rounded-xl">
              <span className="text-xs font-black text-muted-foreground uppercase">Trạng thái phát audio</span>
              {statsLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <div className="flex gap-3 mt-1">
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-black text-emerald-600">{stats.cached}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Đã cache</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-black text-amber-600">{stats.uncached}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Còn thiếu</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-black text-foreground">{stats.total}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Tổng số từ</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Batch Generator Card */}
          <div className="neo-card p-6 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4 rounded-xl">
            <h3 className="text-base font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              SINH AUDIO HÀNG LOẠT (BATCH GENERATOR)
            </h3>
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
              Tính năng này quét toàn bộ cơ sở dữ liệu từ vựng toàn cục (`global_terms`), tìm các từ chưa có file âm thanh (`audio_url` là null) và tự động gọi Google Cloud TTS để tạo giọng đọc WaveNet/Neural2 chuẩn rồi tải lên Cloudflare R2 cache.
            </p>

            {batchError && (
              <div className="p-3 bg-rose-100 border-2 border-rose-400 text-rose-950 rounded-lg font-bold text-xs">
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
                  <Button
                    variant="danger"
                    onClick={stopBatchGenerate}
                    className="min-h-8 px-3 text-xs"
                  >
                    Dừng lại (Stop)
                  </Button>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden border-2 border-border">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs font-bold text-muted-foreground justify-center">
                  <span className="text-emerald-600 font-black">Thành công: {batchProgress.successes}</span>
                  <span className="text-rose-600 font-black">Thất bại: {batchProgress.failures}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => startBatchGenerate(configs)}
                  disabled={statsLoading || stats.uncached === 0}
                  className="px-6 py-3 text-xs min-h-11"
                >
                  <Play size={16} />
                  Bắt đầu sinh {stats.uncached} audio còn thiếu
                </Button>
                {stats.uncached === 0 && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={16} />
                    Tất cả từ vựng đều đã có file âm thanh!
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: So sánh giọng đọc */}
      {activeTab === 'compare' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Compare slots (7 Cols) */}
          <div className="lg:col-span-7 neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4 rounded-xl">
            <h3 className="text-base font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-2">
              <GitCompare size={20} className="text-secondary" />
              SO SÁNH GIỌNG ĐỌC CÁC LOẠI ENGINE
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-foreground">Văn bản phát thử so sánh</label>
              <input
                type="text"
                value={compareText}
                onChange={e => setCompareText(e.target.value)}
                className="px-3 py-2 border-2 border-border rounded-lg bg-card text-xs font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-3">
              {compareSlots.map((slot, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-muted/20 border-2 border-border rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-muted-foreground w-16">Giọng {i + 1}</span>
                    <Select
                      value={slot.lang}
                      onChange={(newLang) => {
                        setCompareSlots(prev => prev.map((s, idx) => idx === i ? {
                          ...s,
                          lang: newLang,
                          voice: VOICE_POPULAR[newLang]?.[0] ?? s.voice,
                          audioUrl: null,
                          played: false,
                        } : s))
                      }}
                      options={configs.map(c => ({ value: c.language_code, label: c.language_code }))}
                      placeholder="Ngôn ngữ"
                    />
                    <Select
                      value={slot.voice}
                      onChange={(voice) => setCompareSlots(prev => prev.map((s, idx) => idx === i ? { ...s, voice, audioUrl: null, played: false } : s))}
                      options={(VOICE_POPULAR[slot.lang] ?? [slot.voice]).map(v => ({ value: v, label: v }))}
                      placeholder="Giọng đọc"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleCompareSlot(i)}
                    disabled={slot.loading || !compareText.trim()}
                    className="w-full min-h-8 text-xs"
                  >
                    {slot.loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Play size={14} />
                        {slot.played ? 'Phát lại audio' : 'Nghe thử giọng này'}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={handleCompareStopAll}
                className="w-full min-h-9 text-xs"
              >
                <RefreshCw size={14} />
                Đặt lại tất cả audio so sánh
              </Button>
            </div>
          </div>

          {/* Right: Info (5 Cols) */}
          <div className="lg:col-span-5 neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4 rounded-xl">
            <h3 className="text-base font-black border-b-2 border-border pb-2 text-foreground">THÔNG TIN ENGINE GIỌNG ĐỌC</h3>
            <div className="flex flex-col gap-2.5">
              {compareSlots.map((slot, i) => {
                const typeInfo = getVoiceTypeInfo(slot.voice)
                const gender = getVoiceGender(slot.voice)
                return (
                  <div key={i} className="p-3 bg-muted/20 border-2 border-border rounded-xl flex flex-col gap-1.5">
                    <span className="text-xs font-black text-foreground font-mono">{slot.voice}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border-2 border-border ${typeInfo.color}`}>
                        {typeInfo.type} · {typeInfo.price}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border-2 border-border ${getVoiceGenderStyle(gender)}`}>
                        {gender}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs font-bold text-amber-950">
              💡 <strong>Mẹo chọn voice:</strong> Neural2 mang lại chất lượng ngữ điệu tự nhiên nhất. WaveNet phù hợp với đa số ngôn ngữ học tập.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
