import { useEffect, useState } from 'react'
import { Play, Save, Volume2 } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { generateAudio } from '@/services/api/generateAudio.api'
import type { TtsVoiceConfig } from '@/types/admin.types'

export default function AdminTtsPage() {
  const [configs, setConfigs] = useState<TtsVoiceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State cho việc chỉnh sửa
  const [editingLang, setEditingLang] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<TtsVoiceConfig>>({})

  // State cho tester
  const [testText, setTestText] = useState('Welcome to MemoryLang! Let\'s learn some vocabulary.')
  const [testLang, setTestLang] = useState('en-US')
  const [testVoice, setTestVoice] = useState('en-US-Wavenet-D')
  const [testLoading, setTestLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const data = await adminService.listTtsConfigs()
      setConfigs(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải cấu hình TTS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConfigs()
  }, [])

  // Mỗi khi ngôn ngữ test thay đổi, tự động điền giọng đọc mặc định
  useEffect(() => {
    const config = configs.find(c => c.language_code === testLang)
    if (config) {
      setTestVoice(config.voice_name)
    }
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
        ssml_gender: editForm.ssml_gender,
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
        // Phát audio
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

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">CẤU HÌNH TTS</h1>
        <p className="text-muted-foreground font-bold">Cấu hình giọng đọc Google Cloud Text-to-Speech cho từng ngôn ngữ.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
          {error}
        </div>
      )}

      {/* Config list & edit form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config Table */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="neo-card bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-border bg-muted">
                  <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30">Mã</th>
                  <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30">Giọng đọc</th>
                  <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30 text-center">Tốc độ / Độ cao</th>
                  <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30 text-center">Giới tính</th>
                  <th className="px-4 py-3 font-black text-foreground uppercase text-center">Sửa</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center font-bold text-muted-foreground">
                      Đang tải cấu hình giọng đọc...
                    </td>
                  </tr>
                ) : (
                  configs.map((config) => (
                    <tr
                      key={config.language_code}
                      className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 odd:bg-card even:bg-muted/10 transition-colors"
                    >
                      <td className="px-4 py-3 font-black uppercase border-r border-border/30">{config.language_code}</td>
                      <td className="px-4 py-3 font-bold border-r border-border/30 text-xs font-mono">{config.voice_name}</td>
                      <td className="px-4 py-3 font-bold text-center border-r border-border/30 text-xs">
                        {config.speaking_rate}x / {config.pitch}st
                      </td>
                      <td className="px-4 py-3 font-bold text-center border-r border-border/30">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          config.ssml_gender === 'FEMALE'
                            ? 'bg-pink-100 text-pink-800 border-pink-300'
                            : config.ssml_gender === 'MALE'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                          {config.ssml_gender}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleEditClick(config)}
                          className="neo-button min-h-0 px-2 py-1 rounded bg-[#fdc800] text-foreground text-xs font-black border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-[#e0b000] transition-all"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Edit Form / Test Voice */}
        <div className="flex flex-col gap-6">
          {/* Edit Form */}
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
                    <label className="text-xs font-black text-foreground">Độ cao (Pitch)</label>
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

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Giới tính (Gender)</label>
                  <select
                    value={editForm.ssml_gender || 'NEUTRAL'}
                    onChange={e => setEditForm(prev => ({ ...prev, ssml_gender: e.target.value as any }))}
                    className="px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-bold focus:outline-none focus:border-primary"
                  >
                    <option value="NEUTRAL">NEUTRAL</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="MALE">MALE</option>
                  </select>
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

          {/* Test Voice (TTS Preview) */}
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
                      {c.language_code} ({c.voice_name.split('-')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Giọng đọc (Google voice name)</label>
                <input
                  type="text"
                  value={testVoice}
                  onChange={e => setTestVoice(e.target.value)}
                  className="px-3 py-1.5 border-2 border-border rounded bg-card text-xs font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Văn bản phát thử (Text)</label>
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
                  <span className="text-[10px] font-black text-muted-foreground">AUDIO URL:</span>
                  <a
                    href={audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary underline truncate font-mono font-bold"
                  >
                    {audioUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
