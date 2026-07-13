import { useEffect, useState } from 'react'
import { Eye, Code, PlugZap, Wrench, Plus, Save, Construction, AlertTriangle } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import type { AppSetting, FeatureFlag } from '@/types/admin.types'

function SmoothToggle({ on, size = 48 }: { on: boolean; size?: number }) {
  const h = Math.round(size * 0.56)
  const w = size
  return (
    <div className="relative shrink-0" style={{ width: w, height: h }}>
      <svg
        className={`absolute inset-0 transition-all duration-300 ease-out ${on ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        viewBox="0 0 32 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="1" width="28" height="16" rx="8" fill="#22c55e" />
        <circle cx="21" cy="9" r="6" fill="white" />
      </svg>
      <svg
        className={`absolute inset-0 transition-all duration-300 ease-out ${!on ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        viewBox="0 0 32 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="1" width="28" height="16" rx="8" fill="#d1d5db" />
        <circle cx="11" cy="9" r="6" fill="white" />
      </svg>
    </div>
  )
}

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form editing settings
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({})
  const [savingSetting, setSavingSetting] = useState<string | null>(null)

  // Track expert (raw JSON/text) vs visual mode per setting key (default false = visual)
  const [expertModes, setExpertModes] = useState<Record<string, boolean>>({})
  
  // Form inputs for adding a new POS option
  const [newPosLabel, setNewPosLabel] = useState('')
  const [newPosValue, setNewPosValue] = useState('')

  // Mascot FAB device config (loaded from app_settings, persisted immediately on toggle)
  const [fabDevice, setFabDevice] = useState({ desktop: true, mobile: true })

  // Maintenance mode state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [maintenanceEstimatedEnd, setMaintenanceEstimatedEnd] = useState('')
  const [savingMaintenance, setSavingMaintenance] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [flagsData, settingsData] = await Promise.all([
        adminService.listFeatureFlags(),
        adminService.listSettings(),
      ])
      setFlags(flagsData)
      setSettings(settingsData)
      
      const fabSetting = settingsData.find(s => s.key === 'mascot_radial_fab_device')
      if (fabSetting?.value) {
        const v = fabSetting.value as { desktop?: boolean; mobile?: boolean }
        setFabDevice({ desktop: v.desktop ?? true, mobile: v.mobile ?? true })
      }

      // Load maintenance mode state
      const maintenanceSetting = settingsData.find(s => s.key === 'maintenance_mode')
      if (maintenanceSetting?.value) {
        const m = maintenanceSetting.value as { enabled?: boolean; message?: string; estimated_end?: string | null }
        setMaintenanceEnabled(Boolean(m.enabled))
        setMaintenanceMessage(m.message || '')
        setMaintenanceEstimatedEnd(m.estimated_end || '')
      }

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

  const handleSaveMaintenance = async (newEnabled?: boolean) => {
    const enabled = newEnabled ?? maintenanceEnabled
    try {
      setSavingMaintenance(true)
      setError(null)
      const value = {
        enabled,
        message: maintenanceMessage,
        estimated_end: maintenanceEstimatedEnd || null,
      }
      const updated = await adminService.updateSetting(
        'maintenance_mode',
        value,
        'Chế độ bảo trì: enabled (bật/tắt), message (thông báo cho người dùng), estimated_end (thời gian kết thúc dự kiến ISO 8601)',
      )
      setSettings((prev) => prev.map((s) => (s.key === 'maintenance_mode' ? updated : s)))
      setMaintenanceEnabled(enabled)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi cập nhật chế độ bảo trì')
      // Rollback toggle if it was a toggle action
      if (newEnabled !== undefined) setMaintenanceEnabled(!newEnabled)
    } finally {
      setSavingMaintenance(false)
    }
  }

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

  const handleToggleFabDevice = async (device: 'desktop' | 'mobile') => {
    const updated = { ...fabDevice, [device]: !fabDevice[device] }
    setFabDevice(updated)
    try {
      setError(null)
      const updatedSetting = await adminService.updateSetting('mascot_radial_fab_device', updated)
      setSettings((prev) => prev.map((s) => (s.key === 'mascot_radial_fab_device' ? updatedSetting : s)))
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi cập nhật cấu hình thiết bị mascot')
      setFabDevice(fabDevice) // rollback
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

  const handleRemovePos = (valueToRemove: string) => {
    let currentList: Array<{ value: string; label: string }> = []
    try {
      currentList = JSON.parse(settingsForm['vocabulary_pos_options'] || '[]')
    } catch {
      return
    }
    const updated = currentList.filter(item => item.value !== valueToRemove)
    setSettingsForm(prev => ({ ...prev, vocabulary_pos_options: JSON.stringify(updated) }))
  }

  const handleAddPos = () => {
    const label = newPosLabel.trim()
    const val = newPosValue.trim().toLowerCase().replace(/\s+/g, '_')
    if (!label || !val) {
      alert('Vui lòng điền đầy đủ Tên hiển thị và Mã từ loại.')
      return
    }
    let currentList: Array<{ value: string; label: string }> = []
    try {
      currentList = JSON.parse(settingsForm['vocabulary_pos_options'] || '[]')
    } catch {
      alert('Dữ liệu JSON từ loại bị lỗi. Vui lòng chuyển sang Chế độ chuyên gia để sửa.')
      return
    }
    if (currentList.some(item => item.value === val)) {
      alert('Mã từ loại này đã tồn tại.')
      return
    }
    const updated = [...currentList, { value: val, label }]
    setSettingsForm(prev => ({ ...prev, vocabulary_pos_options: JSON.stringify(updated) }))
    setNewPosLabel('')
    setNewPosValue('')
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

      {/* Maintenance Mode Section — luôn hiển thị ở đầu trang */}
      {!loading && (
        <div className={`neo-card p-5 border-3 ${maintenanceEnabled ? 'border-rose-500 bg-rose-50' : 'border-border bg-card'} shadow-[4px_4px_0_var(--border)] flex flex-col gap-4 transition-colors`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full border-3 ${maintenanceEnabled ? 'border-rose-500 bg-rose-100' : 'border-border bg-primary/20'} flex items-center justify-center shadow-[2px_2px_0_var(--border)]`}>
                <Construction size={20} className={maintenanceEnabled ? 'text-rose-600' : 'text-foreground'} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  CHẾ ĐỘ BẢO TRÌ
                  {maintenanceEnabled && (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-rose-600 bg-rose-100 border-2 border-rose-400 px-2 py-0.5 rounded-full animate-pulse">
                      <AlertTriangle size={12} />
                      ĐANG BẬT
                    </span>
                  )}
                </h2>
                <p className="text-xs font-bold text-muted-foreground">
                  Chủ động đóng web để bảo trì. Khi bật, người dùng sẽ thấy trang thông báo bảo trì.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleSaveMaintenance(!maintenanceEnabled)}
              disabled={savingMaintenance}
              className="transition-transform active:scale-95 disabled:opacity-50"
              title={maintenanceEnabled ? 'Tắt chế độ bảo trì' : 'Bật chế độ bảo trì'}
            >
              <SmoothToggle on={maintenanceEnabled} size={56} />
            </button>
          </div>

          {/* Expanded config when maintenance is ON or user wants to configure */}
          <div className="flex flex-col gap-3 pt-3 border-t-2 border-dashed border-border">
            <div>
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">
                Thông báo cho người dùng
              </label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="VD: Chúng tôi đang nâng cấp hệ thống. Vui lòng quay lại sau 30 phút."
                rows={2}
                className="w-full p-2.5 text-sm font-semibold border-2 border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">
                Thời gian hoàn thành dự kiến
              </label>
              <input
                type="datetime-local"
                value={maintenanceEstimatedEnd}
                onChange={(e) => setMaintenanceEstimatedEnd(e.target.value)}
                className="w-full max-w-xs p-2.5 text-sm font-semibold border-2 border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={() => handleSaveMaintenance()}
              disabled={savingMaintenance}
              className="neo-button self-start min-h-0 px-4 py-2 rounded bg-secondary text-secondary-foreground text-xs font-black border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-[#321fb0] transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {savingMaintenance ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={12} />
              )}
              Lưu cấu hình bảo trì
            </button>
          </div>
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
              <PlugZap className="text-primary" size={20} />
              FEATURE FLAGS (BẬT/TẮT TÍNH NĂNG)
            </h2>
            
            <div className="flex flex-col gap-3">
              {flags.map((flag) => (
                <div
                  key={flag.flag}
                  className="neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="font-black text-sm text-foreground uppercase tracking-wider">{flag.flag.replace('_', ' ')}</h3>
                      <p className="text-xs text-muted-foreground font-bold">{flag.description || 'Không có mô tả.'}</p>
                      <span className="text-[9px] font-black text-muted-foreground mt-1 font-mono">
                        KEY: {flag.flag}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleFlag(flag.flag, flag.enabled)}
                      className="transition-transform active:scale-95"
                      title={flag.enabled ? 'Tắt tính năng' : 'Bật tính năng'}
                    >
                      <SmoothToggle on={flag.enabled} size={48} />
                    </button>
                  </div>

                  {flag.flag === 'mascot_radial_fab' && (
                    <div className={`flex items-center gap-4 pt-2 border-t-2 border-dashed border-border ${!flag.enabled ? 'opacity-50' : ''}`}>
                      <span className="text-[11px] font-black text-muted-foreground uppercase">Thiết bị:</span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          disabled={!flag.enabled}
                          onClick={() => handleToggleFabDevice('desktop')}
                          className="flex items-center gap-1.5 transition-transform active:scale-95 disabled:pointer-events-none"
                          title={fabDevice.desktop ? 'Đang hiển thị trên desktop' : 'Đang ẩn trên desktop'}
                        >
                          <SmoothToggle on={flag.enabled && fabDevice.desktop} size={28} />
                          <span className="text-xs font-bold">Desktop</span>
                        </button>
                        <button
                          type="button"
                          disabled={!flag.enabled}
                          onClick={() => handleToggleFabDevice('mobile')}
                          className="flex items-center gap-1.5 transition-transform active:scale-95 disabled:pointer-events-none"
                          title={fabDevice.mobile ? 'Đang hiển thị trên mobile' : 'Đang ẩn trên mobile'}
                        >
                          <SmoothToggle on={flag.enabled && fabDevice.mobile} size={28} />
                          <span className="text-xs font-bold">Mobile</span>
                        </button>
                      </div>
                    </div>
                  )}
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
              {settings.filter(s => s.key !== 'mascot_radial_fab_device' && s.key !== 'maintenance_mode').map((setting) => (
                <div
                  key={setting.key}
                  className="neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center gap-2">
                    <h3 className="font-black text-sm text-foreground">{setting.key}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpertModes(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                        className="neo-button min-h-0 px-2 py-1 rounded bg-card text-foreground text-xs font-black border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-muted transition-all flex items-center gap-1"
                        title={expertModes[setting.key] ? "Chuyển sang Chỉnh sửa trực quan" : "Chuyển sang Chế độ chuyên gia (JSON/Raw)"}
                      >
                        {expertModes[setting.key] ? <Eye size={10} /> : <Code size={10} />}
                        {expertModes[setting.key] ? "Giao diện" : "Mã"}
                      </button>
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
                  </div>
                  <p className="text-xs text-muted-foreground font-bold leading-normal">{setting.description}</p>
                  
                  <div className="mt-1 flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase">
                      {expertModes[setting.key] ? "Giá trị cấu hình (JSON/Text):" : "Giá trị cấu hình:"}
                    </label>

                    {expertModes[setting.key] ? (
                      /* Expert Mode - Raw Text / Textarea */
                      (setting.key === 'vocabulary_pos_options' || 
                       (settingsForm[setting.key] && 
                        (settingsForm[setting.key].trim().startsWith('[') || settingsForm[setting.key].trim().startsWith('{'))) ? (
                        <textarea
                          value={settingsForm[setting.key] ?? ''}
                          onChange={(e) =>
                            setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                          }
                          rows={4}
                          className="w-full px-3 py-1.5 border-2 border-border rounded bg-muted font-mono font-bold text-xs focus:outline-none focus:bg-card focus:border-primary transition-all resize-y"
                        />
                      ) : (
                        <input
                          type="text"
                          value={settingsForm[setting.key] ?? ''}
                          onChange={(e) =>
                            setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                          }
                          className="w-full px-3 py-1.5 border-2 border-border rounded bg-muted font-mono font-bold text-xs focus:outline-none focus:bg-card focus:border-primary transition-all"
                        />
                      ))
                    ) : (
                      /* Visual Mode - Custom UI controls */
                      <>
                        {setting.key === 'vocabulary_pos_options' && (() => {
                          let posList: Array<{ value: string; label: string }> = []
                          let hasError = false
                          try {
                            posList = JSON.parse(settingsForm['vocabulary_pos_options'] || '[]')
                          } catch {
                            hasError = true
                          }

                          if (hasError) {
                            return (
                              <div className="p-3 border-2 border-amber-300 bg-amber-50 text-amber-950 text-xs font-bold rounded">
                                Lỗi định dạng JSON từ loại. Vui lòng chuyển sang Chế độ mã (nút "Mã" phía trên) để kiểm tra và sửa đổi.
                              </div>
                            )
                          }

                          return (
                            <div className="flex flex-col gap-3">
                              {/* Tag list */}
                              <div className="flex flex-wrap gap-2 p-2 border-2 border-dashed border-border rounded-md bg-muted/20">
                                {posList.map((pos) => (
                                  <div
                                    key={pos.value}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-border bg-card shadow-[2px_2px_0_var(--border)] rounded font-bold text-xs text-foreground"
                                  >
                                    <span>{pos.label} <span className="text-[10px] text-muted-foreground">({pos.value})</span></span>
                                    {pos.value !== '__other__' && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePos(pos.value)}
                                        className="text-danger hover:text-red-700 font-black ml-1 text-sm leading-none"
                                        title="Xóa từ loại này"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {posList.length === 0 && (
                                  <span className="text-xs text-muted-foreground italic py-1 px-2">Chưa có cấu hình từ loại nào.</span>
                                )}
                              </div>

                              {/* Form to add a new POS */}
                              <div className="flex flex-wrap gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Tên hiển thị (ví dụ: Danh từ)"
                                  value={newPosLabel}
                                  onChange={(e) => setNewPosLabel(e.target.value)}
                                  className="px-3 py-1.5 border-2 border-border rounded text-xs font-bold bg-card focus:outline-none focus:border-primary flex-1 min-w-[150px]"
                                />
                                <input
                                  type="text"
                                  placeholder="Mã (ví dụ: noun)"
                                  value={newPosValue}
                                  onChange={(e) => setNewPosValue(e.target.value)}
                                  className="px-3 py-1.5 border-2 border-border rounded text-xs font-bold bg-card focus:outline-none focus:border-primary w-32"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddPos}
                                  className="neo-button min-h-0 px-3 py-1.5 rounded bg-secondary text-secondary-foreground text-xs font-black border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-[#321fb0] transition-all flex items-center gap-1"
                                >
                                  <Plus size={12} />
                                  Thêm
                                </button>
                              </div>
                            </div>
                          )
                        })()}

                        {setting.key === 'vocabulary_max_examples_count' && (
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={Number(settingsForm[setting.key]) || 10}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                              }
                              className="w-32 px-3 py-1.5 border-2 border-border rounded bg-card font-bold text-xs focus:outline-none focus:border-primary transition-all"
                            />
                            <span className="text-xs text-muted-foreground font-bold">câu ví dụ tối đa</span>
                          </div>
                        )}

                        {setting.key === 'default_daily_goal' && (
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={Number(settingsForm[setting.key]) || 10}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                              }
                              className="w-32 px-3 py-1.5 border-2 border-border rounded bg-card font-bold text-xs focus:outline-none focus:border-primary transition-all"
                            />
                            <span className="text-xs text-muted-foreground font-bold">từ/ngày</span>
                          </div>
                        )}

                        {(setting.key === 'quick_notes_max_count' || setting.key === 'quick_notes_max_length') && (
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={1}
                              value={Number(settingsForm[setting.key]) || 0}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                              }
                              className="w-32 px-3 py-1.5 border-2 border-border rounded bg-card font-bold text-xs focus:outline-none focus:border-primary transition-all"
                            />
                            <span className="text-xs text-muted-foreground font-bold">
                              {setting.key === 'quick_notes_max_count' ? 'ghi chú tối đa' : 'ký tự tối đa'}
                            </span>
                          </div>
                        )}

                        {setting.key === 'default_speech_rate' && (
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0.5"
                              max="2.0"
                              step="0.1"
                              value={Number(settingsForm[setting.key]) || 1.0}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                              }
                              className="w-44 accent-primary"
                            />
                            <span className="font-bold text-xs font-mono">{settingsForm[setting.key] || '1.0'}x (Tốc độ đọc)</span>
                          </div>
                        )}

                        {setting.key === 'default_speech_pitch' && (
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              step="1"
                              value={Number(settingsForm[setting.key]) || 0}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                              }
                              className="w-44 accent-primary"
                            />
                            <span className="font-bold text-xs font-mono">{settingsForm[setting.key] || '0'} (Độ cao giọng)</span>
                          </div>
                        )}

                        {/* Fallback visual view if it's none of the recognized keys */}
                        {!['vocabulary_pos_options', 'vocabulary_max_examples_count', 'default_daily_goal', 'default_speech_rate', 'default_speech_pitch'].includes(setting.key) && (
                          (settingsForm[setting.key] && 
                           (settingsForm[setting.key].trim().startsWith('[') || settingsForm[setting.key].trim().startsWith('{'))) ? (
                            <textarea
                              value={settingsForm[setting.key] ?? ''}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                              }
                              rows={4}
                              className="w-full px-3 py-1.5 border-2 border-border rounded bg-muted font-mono font-bold text-xs focus:outline-none focus:bg-card focus:border-primary transition-all resize-y"
                            />
                          ) : (
                            <input
                              type="text"
                              value={settingsForm[setting.key] ?? ''}
                              onChange={(e) =>
                                setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))
                              }
                              className="w-full px-3 py-1.5 border-2 border-border rounded bg-muted font-mono font-bold text-xs focus:outline-none focus:bg-card focus:border-primary transition-all"
                            />
                          )
                        )}
                      </>
                    )}

                    {/* Helper text display (underneath both modes) */}
                    {setting.key === 'vocabulary_pos_options' && (
                      <span className="text-[10px] text-blue-600 font-bold mt-0.5">
                        {"* Định dạng: Danh sách đối tượng dạng JSON gồm \"value\" và \"label\". Nên giữ lại {\"value\": \"__other__\", \"label\": \"Khác...\"}."}
                      </span>
                    )}
                    {setting.key === 'vocabulary_max_examples_count' && (
                      <span className="text-[10px] text-blue-600 font-bold mt-0.5">
                        * Định dạng: Nhập một số nguyên dương đại diện cho giới hạn số lượng ví dụ tối đa của mỗi từ vựng.
                      </span>
                    )}
                    {setting.key === 'quick_notes_max_count' && (
                      <span className="text-[10px] text-blue-600 font-bold mt-0.5">
                        * Định dạng: Nhập một số nguyên dương đại diện cho số lượng ghi chú tối đa mỗi người dùng được phép lưu.
                      </span>
                    )}
                    {setting.key === 'quick_notes_max_length' && (
                      <span className="text-[10px] text-blue-600 font-bold mt-0.5">
                        * Định dạng: Nhập một số nguyên dương đại diện cho số lượng ký tự tối đa được viết trong mỗi ghi chú.
                      </span>
                    )}
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
