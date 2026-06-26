import { useEffect, useState } from 'react'
import { Save, ToggleLeft, ToggleRight, Wrench } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import type { AppSetting, FeatureFlag } from '@/types/admin.types'

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form editing settings
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({})
  const [savingSetting, setSavingSetting] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [flagsData, settingsData] = await Promise.all([
        adminService.listFeatureFlags(),
        adminService.listSettings(),
      ])
      setFlags(flagsData)
      setSettings(settingsData)
      
      // Khởi tạo form values
      const initialForm: Record<string, string> = {}
      settingsData.forEach((s) => {
        // Đối với json value, hiển thị dạng chuỗi dễ chỉnh sửa
        initialForm[s.key] = typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)
      })
      setSettingsForm(initialForm)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải cấu hình tính năng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleToggleFlag = async (flagName: string, currentStatus: boolean) => {
    try {
      setError(null)
      const updated = await adminService.updateFeatureFlag(flagName, !currentStatus)
      setFlags((prev) => prev.map((f) => (f.flag === flagName ? updated : f)))
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi cập nhật Feature Flag')
    }
  }

  const handleSaveSetting = async (key: string) => {
    const rawVal = settingsForm[key]
    let parsedVal: any = rawVal

    // Cố gắng parse JSON nếu nó trông giống object/array hoặc boolean hoặc number
    try {
      if (
        (rawVal.startsWith('{') && rawVal.endsWith('}')) ||
        (rawVal.startsWith('[') && rawVal.endsWith(']'))
      ) {
        parsedVal = JSON.parse(rawVal)
      } else if (rawVal === 'true') {
        parsedVal = true
      } else if (rawVal === 'false') {
        parsedVal = false
      } else if (!isNaN(Number(rawVal)) && rawVal.trim() !== '') {
        parsedVal = Number(rawVal)
      }
    } catch {
      // Giữ nguyên là chuỗi nếu parse lỗi
    }

    try {
      setSavingSetting(key)
      setError(null)
      const updated = await adminService.updateSetting(key, parsedVal)
      setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)))
      alert(`Đã lưu cấu hình "${key}" thành công!`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi lưu cấu hình cài đặt')
    } finally {
      setSavingSetting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">FEATURE FLAGS & SETTINGS</h1>
        <p className="text-muted-foreground font-bold">
          Quản lý bật/tắt tính năng động (Feature Flags) và cài đặt mặc định của hệ thống.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center font-bold text-muted-foreground py-10">
          Đang tải cấu hình tính năng...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Feature Flags */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-1.5">
              <ToggleRight className="text-primary" size={20} />
              FEATURE FLAGS (BẬT/TẮT TÍNH NĂNG)
            </h2>
            
            <div className="flex flex-col gap-3">
              {flags.map((flag) => (
                <div
                  key={flag.flag}
                  className="neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-black text-sm text-foreground uppercase tracking-wider">{flag.flag.replace('_', ' ')}</h3>
                    <p className="text-xs text-muted-foreground font-bold">{flag.description || 'Không có mô tả.'}</p>
                    <span className="text-[9px] font-black text-muted-foreground mt-1 font-mono">
                      KEY: {flag.flag}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleFlag(flag.flag, flag.enabled)}
                    className="shrink-0 transition-transform active:scale-95"
                    title={flag.enabled ? 'Tắt tính năng' : 'Bật tính năng'}
                  >
                    {flag.enabled ? (
                      <ToggleRight className="text-green-500 hover:text-green-600 cursor-pointer" size={48} />
                    ) : (
                      <ToggleLeft className="text-muted-foreground hover:text-foreground cursor-pointer" size={48} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: App Settings */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-1.5">
              <Wrench className="text-secondary" size={20} />
              CÀI ĐẶT MẶC ĐỊNH (APP SETTINGS)
            </h2>

            <div className="flex flex-col gap-4">
              {settings.map((setting) => (
                <div
                  key={setting.key}
                  className="neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-sm text-foreground">{setting.key}</h3>
                    <button
                      onClick={() => handleSaveSetting(setting.key)}
                      disabled={savingSetting === setting.key}
                      className="neo-button min-h-0 px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-black border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-[#321fb0] transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      {savingSetting === setting.key ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save size={10} />
                          Lưu
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground font-bold leading-normal">{setting.description}</p>
                  
                  <div className="mt-1 flex flex-col gap-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase">Giá trị cấu hình (JSON/Text):</label>
                    <input
                      type="text"
                      value={settingsForm[setting.key] ?? ''}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 border-2 border-border rounded bg-muted font-mono font-bold text-xs focus:outline-none focus:bg-card focus:border-primary transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
