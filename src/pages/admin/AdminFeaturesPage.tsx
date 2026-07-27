import { useEffect, useState } from 'react'
import {
  PlugZap,
  Wrench,
  Plus,
  Trash2,
  Save,
  Construction,
  AlertTriangle,
  Search,
  CheckCircle2,
  Globe,
  SlidersHorizontal,
  Bot,
  Sparkles,
  Layers,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import { adminService } from '@/services/supabase/admin.service'
import type { FeatureFlag } from '@/types/admin.types'

function SmoothToggle({ on, size = 44 }: { on: boolean; size?: number }) {
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

// 22 Navigation Flags + System Flags với Tên hiển thị và Mô tả thân thiện
const KNOWN_FEATURE_FLAGS: Array<FeatureFlag & { category: 'main_nav' | 'more_nav' | 'header_actions' | 'features' | 'system'; label: string }> = [
  // 1. Thanh điều hướng chính (Main Nav Items)
  { flag: 'grammar_module', label: 'Ngữ pháp', category: 'main_nav', enabled: true, description: 'Bật/tắt nút điều hướng Ngữ pháp trên thanh Menu' },
  { flag: 'vocabulary_module', label: 'Từ vựng', category: 'main_nav', enabled: true, description: 'Bật/tắt nút điều hướng Từ vựng trên thanh Menu' },
  { flag: 'listening_module', label: 'Luyện nghe', category: 'main_nav', enabled: true, description: 'Bật/tắt nút điều hướng Luyện nghe trên thanh Menu' },
  { flag: 'speaking_module', label: 'Luyện nói', category: 'main_nav', enabled: true, description: 'Bật/tắt nút điều hướng Luyện nói trên thanh Menu' },
  { flag: 'reading_module', label: 'Đọc hiểu', category: 'main_nav', enabled: true, description: 'Bật/tắt nút điều hướng Đọc hiểu trên thanh Menu' },
  { flag: 'writing_module', label: 'Luyện viết', category: 'main_nav', enabled: true, description: 'Bật/tắt nút điều hướng Luyện viết trên thanh Menu' },
  { flag: 'exams_module', label: 'Đề thi thử', category: 'main_nav', enabled: true, description: 'Bật/tắt nút điều hướng Đề thi trên thanh Menu' },
  { flag: 'games_module', label: 'Trò chơi', category: 'main_nav', enabled: true, description: 'Bật/tắt nút điều hướng Trò chơi trên thanh Menu' },

  // 2. Menu Mở rộng (More Dropdown Items)
  { flag: 'dashboard_nav', label: 'Bảng điều khiển', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Bảng điều khiển trong menu Xem thêm' },
  { flag: 'decks_nav', label: 'Bộ thẻ từ vựng', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Bộ thẻ trong menu Xem thêm' },
  { flag: 'study_nav', label: 'Học tập thẻ ghi nhớ', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Học tập trong menu Xem thêm' },
  { flag: 'quiz_nav', label: 'Kiểm tra dịch thuật', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Kiểm tra trong menu Xem thêm' },
  { flag: 'review_nav', label: 'Ôn tập thẻ cần học', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Ôn tập trong menu Xem thêm' },
  { flag: 'roadmap_module', label: 'Lộ trình học tập', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Lộ trình học trong menu Xem thêm' },
  { flag: 'videos_module', label: 'Bài học Video', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Video trong menu Xem thêm' },
  { flag: 'blog_module', label: 'Blog / Bài viết', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Blog / Bài viết trong menu Xem thêm' },
  { flag: 'community_module', label: 'Cộng đồng người học', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Cộng đồng trong menu Xem thêm' },
  { flag: 'contact_module', label: 'Liên hệ & Trợ giúp', category: 'more_nav', enabled: true, description: 'Bật/tắt mục Liên hệ trong menu Xem thêm' },

  // 3. Nút thao tác trên Header (Header Action Controls)
  { flag: 'ai_tutor_button', label: 'Nút Gia sư AI', category: 'header_actions', enabled: true, description: 'Bật/tắt nút bật nhanh Gia sư AI trên thanh Header' },
  { flag: 'pro_upgrade_button', label: 'Nút Nâng cấp Pro', category: 'header_actions', enabled: true, description: 'Bật/tắt nút Nâng cấp Pro trên thanh Header' },
  { flag: 'notifications_button', label: 'Nút Quả chuông Thông báo', category: 'header_actions', enabled: true, description: 'Bật/tắt nút Quả chuông thông báo trên thanh Header' },
  { flag: 'profile_menu_button', label: 'Menu Hồ sơ cá nhân (Avatar)', category: 'header_actions', enabled: true, description: 'Bật/tắt menu góc đại diện Avatar trên thanh Header' },

  // 4. Feature Extensions
  { flag: 'template_builder', label: 'Tạo mẫu thẻ học tùy chỉnh', category: 'features', enabled: false, description: 'Cho phép người dùng thiết kế mẫu thẻ ghi nhớ tùy chỉnh (MVP 2)' },
  { flag: 'matching_quiz', label: 'Bài trắc nghiệm Nối từ', category: 'features', enabled: false, description: 'Cho phép học tập qua trò chơi nối từ vựng (MVP 3)' },
  { flag: 'fill_blank_quiz', label: 'Bài trắc nghiệm Điền từ', category: 'features', enabled: false, description: 'Cho phép làm bài điền từ vào khoảng trống (MVP 3)' },
  { flag: 'learning_analytics_dashboard', label: 'Phân tích học tập nâng cao', category: 'features', enabled: true, description: 'Hiển thị biểu đồ phân tích tần suất học tập Java API' },

  // 5. System Integrations
  { flag: 'google_oauth', label: 'Đăng nhập Google OAuth', category: 'system', enabled: true, description: 'Cho phép người dùng đăng nhập tài khoản bằng Google' },
  { flag: 'image_search', label: 'Tìm kiếm ảnh từ vựng', category: 'system', enabled: true, description: 'Tích hợp tra cứu ảnh minh họa từ Unsplash/Pexels' },
  { flag: 'tts_auto_generate', label: 'Tự động tạo giọng đọc TTS', category: 'system', enabled: true, description: 'Tự động phát giọng đọc Google Cloud TTS khi thêm từ vựng' },
  { flag: 'mascot_radial_fab', label: 'Linh vật trợ lý Mascot FAB', category: 'system', enabled: true, description: 'Bật/tắt nút linh vật trợ lý góc màn hình' },
]

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<Array<FeatureFlag & { category?: string; label?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter Category Tab state
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'main_nav' | 'more_nav' | 'header_actions' | 'features' | 'system'>('all')

  // Form editing values per setting key
  const [settingsForm, setSettingsForm] = useState<Record<string, any>>({})
  const [savingSetting, setSavingSetting] = useState<string | null>(null)

  // Form inputs for adding a new POS option
  const [newPosLabel, setNewPosLabel] = useState('')
  const [newPosValue, setNewPosValue] = useState('')
  const [posFormError, setPosFormError] = useState<string | null>(null)

  // Form input for adding a new CORS domain
  const [newCorsDomain, setNewCorsDomain] = useState('')
  const [corsFormError, setCorsFormError] = useState<string | null>(null)

  // Mascot FAB device config
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

      // Hợp nhất dữ liệu từ DB với KNOWN_FEATURE_FLAGS để luôn đầy đủ 22 nút nav + system flags
      const mergedFlags = KNOWN_FEATURE_FLAGS.map((kf) => {
        const dbRow = flagsData.find((f) => f.flag === kf.flag)
        return dbRow ? { ...kf, enabled: dbRow.enabled, description: dbRow.description || kf.description } : kf
      })

      // Giữ lại các flag lạ có sẵn trong DB nếu có
      flagsData.forEach((f) => {
        if (!mergedFlags.some((m) => m.flag === f.flag)) {
          mergedFlags.push({
            ...f,
            label: f.flag.replace(/_/g, ' ').toUpperCase(),
            category: 'features',
          })
        }
      })

      setFlags(mergedFlags)

      const fabSetting = settingsData.find((s) => s.key === 'mascot_radial_fab_device')
      if (fabSetting?.value) {
        const v = fabSetting.value as { desktop?: boolean; mobile?: boolean }
        setFabDevice({ desktop: v.desktop ?? true, mobile: v.mobile ?? true })
      }

      // Load maintenance mode state
      const maintenanceSetting = settingsData.find((s) => s.key === 'maintenance_mode')
      if (maintenanceSetting?.value) {
        const m = maintenanceSetting.value as { enabled?: boolean; message?: string; estimated_end?: string | null }
        setMaintenanceEnabled(Boolean(m.enabled))
        setMaintenanceMessage(m.message || '')
        setMaintenanceEstimatedEnd(m.estimated_end || '')
      }

      // Khởi tạo form values
      const initialForm: Record<string, any> = {}
      settingsData.forEach((s) => {
        initialForm[s.key] = s.value
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
      await adminService.updateSetting(
        'maintenance_mode',
        value,
        'Chế độ bảo trì hệ thống',
      )
      setMaintenanceEnabled(enabled)
      showToast({
        type: 'success',
        title: 'Cập nhật Chế độ Bảo trì',
        message: enabled ? 'Đã bật chế độ bảo trì hệ thống.' : 'Đã tắt chế độ bảo trì.',
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi cập nhật chế độ bảo trì')
      if (newEnabled !== undefined) setMaintenanceEnabled(!newEnabled)
    } finally {
      setSavingMaintenance(false)
    }
  }

  const handleToggleFlag = async (flagName: string, currentStatus: boolean) => {
    try {
      setError(null)
      const updated = await adminService.updateFeatureFlag(flagName, !currentStatus)
      setFlags((prev) => prev.map((f) => (f.flag === flagName ? { ...f, enabled: updated.enabled } : f)))
      showToast({
        type: 'success',
        title: 'Đã cập nhật tính năng',
        message: `Đã ${!currentStatus ? 'bật' : 'tắt'} tính năng "${flagName}".`,
      })
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
      await adminService.updateSetting('mascot_radial_fab_device', updated)
      showToast({
        type: 'success',
        title: 'Đã cập nhật thiết bị',
        message: `Linh vật trợ lý đã ${updated[device] ? 'bật' : 'ẩn'} trên ${device}.`,
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi cập nhật cấu hình thiết bị mascot')
      setFabDevice(fabDevice)
    }
  }

  const handleSaveSetting = async (key: string, valueToSave?: any) => {
    const value = valueToSave !== undefined ? valueToSave : settingsForm[key]
    try {
      setSavingSetting(key)
      setError(null)
      await adminService.updateSetting(key, value)
      showToast({
        type: 'success',
        title: 'Đã lưu cài đặt',
        message: `Cài đặt "${key}" đã được lưu thành công.`,
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi lưu cấu hình cài đặt')
    } finally {
      setSavingSetting(null)
    }
  }

  // Visual Builder: Xóa từ loại
  const handleRemovePos = async (valueToRemove: string) => {
    const currentList: Array<{ value: string; label: string }> = Array.isArray(settingsForm['vocabulary_pos_options'])
      ? settingsForm['vocabulary_pos_options']
      : typeof settingsForm['vocabulary_pos_options'] === 'string'
      ? JSON.parse(settingsForm['vocabulary_pos_options'] || '[]')
      : []

    const updated = currentList.filter((item) => item.value !== valueToRemove)
    setSettingsForm((prev) => ({ ...prev, vocabulary_pos_options: updated }))
    await handleSaveSetting('vocabulary_pos_options', updated)
  }

function slugifyPosLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'pos_item'
}

  // Visual Builder: Thêm từ loại mới
  const handleAddPos = async () => {
    const label = newPosLabel.trim()
    if (!label) {
      setPosFormError('Vui lòng nhập Tên loại từ vựng (VD: Thán từ).')
      return
    }
    const currentList: Array<{ value: string; label: string }> = Array.isArray(settingsForm['vocabulary_pos_options'])
      ? settingsForm['vocabulary_pos_options']
      : typeof settingsForm['vocabulary_pos_options'] === 'string'
      ? JSON.parse(settingsForm['vocabulary_pos_options'] || '[]')
      : []

    // Tự sinh mã slug từ label hoặc mã nhập tay, kiểm tra chống trùng lặp tự động bằng suffix _1, _2...
    const baseValue = newPosValue.trim() ? slugifyPosLabel(newPosValue) : slugifyPosLabel(label)
    let finalValue = baseValue
    let counter = 1
    while (currentList.some((item) => item.value === finalValue)) {
      finalValue = `${baseValue}_${counter}`
      counter++
    }

    setPosFormError(null)
    const updated = [...currentList, { value: finalValue, label }]
    setSettingsForm((prev) => ({ ...prev, vocabulary_pos_options: updated }))
    setNewPosLabel('')
    setNewPosValue('')
    await handleSaveSetting('vocabulary_pos_options', updated)
  }

  // Visual Builder: Xóa CORS Domain
  const handleRemoveCorsDomain = async (domainToRemove: string) => {
    const currentList: string[] = Array.isArray(settingsForm['cors_origins'])
      ? settingsForm['cors_origins']
      : typeof settingsForm['cors_origins'] === 'string'
      ? JSON.parse(settingsForm['cors_origins'] || '[]')
      : []

    const updated = currentList.filter((domain) => domain !== domainToRemove)
    setSettingsForm((prev) => ({ ...prev, cors_origins: updated }))
    await handleSaveSetting('cors_origins', updated)
  }

  // Visual Builder: Thêm CORS Domain mới
  const handleAddCorsDomain = async () => {
    const domain = newCorsDomain.trim()
    if (!domain) {
      setCorsFormError('Vui lòng nhập tên miền CORS (VD: https://my-app.com).')
      return
    }
    if (!domain.startsWith('http://') && !domain.startsWith('https://') && domain !== '*') {
      setCorsFormError('Tên miền phải bắt đầu bằng http:// hoặc https://')
      return
    }
    const currentList: string[] = Array.isArray(settingsForm['cors_origins'])
      ? settingsForm['cors_origins']
      : typeof settingsForm['cors_origins'] === 'string'
      ? JSON.parse(settingsForm['cors_origins'] || '[]')
      : []

    if (currentList.includes(domain)) {
      setCorsFormError('Tên miền này đã có trong danh sách.')
      return
    }

    setCorsFormError(null)
    const updated = [...currentList, domain]
    setSettingsForm((prev) => ({ ...prev, cors_origins: updated }))
    setNewCorsDomain('')
    await handleSaveSetting('cors_origins', updated)
  }

  // Lọc Feature Flags theo từ khóa tìm kiếm & danh mục Tab
  const filteredFlags = flags.filter((flag) => {
    const labelMatch = (flag.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    const descMatch = (flag.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    const flagKeyMatch = flag.flag.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSearch = labelMatch || descMatch || flagKeyMatch

    if (!matchesSearch) return false
    if (activeCategory === 'all') return true
    return flag.category === activeCategory
  })

  const activeFlagsCount = flags.filter((f) => f.enabled).length

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="neo-card p-6 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl border-3 border-border bg-primary flex items-center justify-center shadow-[2px_2px_0_var(--border)]">
            <SlidersHorizontal size={26} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              QUẢN LÝ TÍNH NĂNG & CÀI ĐẶT
            </h1>
            <p className="text-sm font-bold text-muted-foreground mt-0.5">
              Bật/Tắt tính năng hệ thống thời gian thực và quản lý cài đặt mặc định ứng dụng.
            </p>
          </div>
        </div>

        {/* Status badges summary */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-1.5 rounded-lg border-2 border-border bg-emerald-50 text-emerald-950 font-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0_var(--border)]">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>{activeFlagsCount} / {flags.length} tính năng hoạt động</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-3 border-rose-400 text-rose-950 rounded-xl font-bold text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Maintenance Mode Control Section */}
      {!loading && (
        <div
          className={`neo-card p-5 border-3 ${
            maintenanceEnabled ? 'border-rose-500 bg-rose-50/90' : 'border-border bg-card'
          } shadow-[4px_4px_0_var(--border)] flex flex-col gap-4 transition-colors`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-xl border-3 ${
                  maintenanceEnabled ? 'border-rose-500 bg-rose-200' : 'border-border bg-amber-100'
                } flex items-center justify-center shadow-[2px_2px_0_var(--border)]`}
              >
                <Construction size={22} className={maintenanceEnabled ? 'text-rose-700' : 'text-amber-800'} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  CHẾ ĐỘ BẢO TRÌ HỆ THỐNG
                  {maintenanceEnabled && (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-100 border-2 border-rose-400 px-2.5 py-0.5 rounded-full animate-pulse">
                      <AlertTriangle size={12} />
                      ĐANG BẬT
                    </span>
                  )}
                </h2>
                <p className="text-xs font-bold text-muted-foreground">
                  Chủ động tạm ngưng ứng dụng để nâng cấp. Khi bật, toàn bộ học viên sẽ nhìn thấy trang bảo trì.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleSaveMaintenance(!maintenanceEnabled)}
              disabled={savingMaintenance}
              className="transition-transform active:scale-95 disabled:opacity-50"
              title={maintenanceEnabled ? 'Tắt chế độ bảo trì' : 'Bật chế độ bảo trì'}
            >
              <SmoothToggle on={maintenanceEnabled} size={54} />
            </button>
          </div>

          <div className="flex flex-col gap-3 pt-3 border-t-2 border-dashed border-border">
            <div>
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5">
                Thông báo hiển thị cho người học:
              </label>

              {/* Preset Quick Messages */}
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  'Chúng tôi đang bảo trì hệ thống định kỳ. Vui lòng quay lại sau.',
                  'Hệ thống đang được nâng cấp tính năng mới. Rất tiếc vì sự gián đoạn này.',
                  'MemoryLang đang cập nhật dữ liệu bài học. Vui lòng thử lại sau ít phút.',
                ].map((presetMsg) => (
                  <button
                    key={presetMsg}
                    type="button"
                    onClick={() => setMaintenanceMessage(presetMsg)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded border-2 border-border bg-background hover:bg-muted text-foreground transition-all"
                  >
                    + {presetMsg.slice(0, 35)}...
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="VD: Chúng tôi đang bảo trì hệ thống định kỳ. Vui lòng quay lại sau ít phút."
                className="w-full p-2.5 text-sm font-semibold border-2 border-border rounded-lg bg-background focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Thời gian kết thúc dự kiến:
                </label>
                <input
                  type="datetime-local"
                  value={maintenanceEstimatedEnd}
                  onChange={(e) => setMaintenanceEstimatedEnd(e.target.value)}
                  className="p-2 text-xs font-bold border-2 border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                />
              </div>

              <Button
                variant="secondary"
                onClick={() => handleSaveMaintenance()}
                disabled={savingMaintenance}
                className="min-h-9 px-4 text-xs"
              >
                <Save size={14} />
                Lưu cấu hình bảo trì
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center font-black text-muted-foreground py-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Đang tải cấu hình tính năng hệ thống...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column 1: Feature Flags & Nav Items Management (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="flex flex-col gap-3 pb-2 border-b-3 border-border">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <PlugZap className="text-primary" size={22} />
                  QUẢN LÝ BẬT/TẮT TÍNH NĂNG
                </h2>
                <span className="text-xs font-bold text-muted-foreground">
                  Hiển thị: {filteredFlags.length} mục
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tính năng, nút điều hướng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm font-bold border-2 border-border rounded-xl bg-card focus:outline-none focus:border-primary"
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'main_nav', label: 'Menu chính' },
                  { id: 'more_nav', label: 'Menu mở rộng' },
                  { id: 'header_actions', label: 'Thao tác Header' },
                  { id: 'features', label: 'Tính năng nâng cao' },
                  { id: 'system', label: 'Tích hợp hệ thống' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 border-border transition-all shadow-[2px_2px_0_var(--border)] active:translate-y-[1px] active:shadow-none ${
                      activeCategory === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Feature Flags */}
            <div className="flex flex-col gap-3">
              {filteredFlags.length === 0 ? (
                <div className="p-8 text-center neo-card bg-card border-2 border-border font-bold text-sm text-muted-foreground">
                  Không tìm thấy tính năng nào phù hợp với từ khóa "{searchTerm}".
                </div>
              ) : (
                filteredFlags.map((flag) => (
                  <div
                    key={flag.flag}
                    className={`neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex items-center justify-between gap-4 transition-all ${
                      !flag.enabled ? 'bg-muted/30 opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`h-10 w-10 shrink-0 rounded-lg border-2 border-border flex items-center justify-center shadow-[2px_2px_0_var(--border)] ${
                          flag.enabled ? 'bg-primary/20 text-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {flag.category === 'main_nav' && <BookOpen size={18} />}
                        {flag.category === 'more_nav' && <Layers size={18} />}
                        {flag.category === 'header_actions' && <Bot size={18} />}
                        {flag.category === 'features' && <Sparkles size={18} />}
                        {flag.category === 'system' && <Globe size={18} />}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm text-foreground tracking-wide truncate">
                            {flag.label || flag.description || flag.flag}
                          </h3>
                          {flag.enabled ? (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                              HOẠT ĐỘNG
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded">
                              ĐÃ ẨN
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-bold mt-0.5 line-clamp-1">
                          {flag.description || 'Không có mô tả.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleToggleFlag(flag.flag, flag.enabled)}
                        className="transition-transform active:scale-95"
                        title={flag.enabled ? 'Tắt tính năng này' : 'Bật tính năng này'}
                      >
                        <SmoothToggle on={flag.enabled} size={46} />
                      </button>
                    </div>

                    {flag.flag === 'mascot_radial_fab' && (
                      <div className={`w-full flex items-center gap-4 pt-2.5 mt-2 border-t-2 border-dashed border-border ${!flag.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span className="text-xs font-black text-muted-foreground uppercase">Hiển thị trên thiết bị:</span>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            disabled={!flag.enabled}
                            onClick={() => handleToggleFabDevice('desktop')}
                            className="flex items-center gap-2 text-xs font-bold hover:text-primary transition"
                          >
                            <SmoothToggle on={flag.enabled && fabDevice.desktop} size={28} />
                            <span>Máy tính (Desktop)</span>
                          </button>
                          <button
                            type="button"
                            disabled={!flag.enabled}
                            onClick={() => handleToggleFabDevice('mobile')}
                            className="flex items-center gap-2 text-xs font-bold hover:text-primary transition"
                          >
                            <SmoothToggle on={flag.enabled && fabDevice.mobile} size={28} />
                            <span>Điện thoại (Mobile)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Column 2: Visual App Settings Builders (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-2 border-b-3 border-border">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <Wrench className="text-secondary" size={22} />
                CÀI ĐẶT HỆ THỐNG MẶC ĐỊNH
              </h2>
            </div>

            <div className="flex flex-col gap-5">
              {/* 1. Visual Builder: CORS Allowed Origins */}
              <div className="neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-secondary" />
                  <h3 className="font-black text-sm text-foreground">Tên miền CORS được phép (CORS Origins)</h3>
                </div>
                <p className="text-xs text-muted-foreground font-bold leading-normal">
                  Danh sách domain được phép gọi API kết nối ứng dụng (VD: https://memorylang.app).
                </p>

                {/* Visual List of Domains */}
                {(() => {
                  const corsList: string[] = Array.isArray(settingsForm['cors_origins'])
                    ? settingsForm['cors_origins']
                    : typeof settingsForm['cors_origins'] === 'string'
                    ? JSON.parse(settingsForm['cors_origins'] || '[]')
                    : []

                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2 p-2.5 border-2 border-dashed border-border rounded-xl bg-muted/20">
                        {corsList.map((domain) => (
                          <div
                            key={domain}
                            className="flex items-center gap-2 px-3 py-1.5 border-2 border-border bg-card shadow-[2px_2px_0_var(--border)] rounded-lg font-bold text-xs text-foreground"
                          >
                            <span>{domain}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCorsDomain(domain)}
                              className="text-danger hover:text-rose-700 font-black p-0.5 rounded transition"
                              title="Xóa tên miền này"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {corsList.length === 0 && (
                          <span className="text-xs text-muted-foreground italic py-1">Chưa có tên miền nào.</span>
                        )}
                      </div>

                      {/* Add new domain form */}
                      {corsFormError && (
                        <div className="text-xs font-bold text-rose-600 bg-rose-50 p-2 border border-rose-300 rounded-md">
                          {corsFormError}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="VD: https://subdomain.memorylang.app"
                          value={newCorsDomain}
                          onChange={(e) => setNewCorsDomain(e.target.value)}
                          className="flex-1 px-3 py-1.5 border-2 border-border rounded-lg text-xs font-bold bg-background focus:outline-none focus:border-primary"
                        />
                        <Button
                          variant="secondary"
                          onClick={handleAddCorsDomain}
                          className="min-h-8 px-3 py-1 text-xs shrink-0"
                        >
                          <Plus size={14} />
                          Thêm Domain
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* 2. Visual Builder: Vocabulary POS Options */}
              <div className="neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-primary" />
                  <h3 className="font-black text-sm text-foreground">Danh mục Từ loại (POS Options)</h3>
                </div>
                <p className="text-xs text-muted-foreground font-bold leading-normal">
                  Cấu hình từ loại lựa chọn khi thêm từ vựng mới (Danh từ, Động từ, Tính từ, v.v.).
                </p>

                {(() => {
                  const posList: Array<{ value: string; label: string }> = Array.isArray(settingsForm['vocabulary_pos_options'])
                    ? settingsForm['vocabulary_pos_options']
                    : typeof settingsForm['vocabulary_pos_options'] === 'string'
                    ? JSON.parse(settingsForm['vocabulary_pos_options'] || '[]')
                    : []

                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2 p-2.5 border-2 border-dashed border-border rounded-xl bg-muted/20">
                        {posList.map((pos) => (
                          <div
                            key={pos.value}
                            className="flex items-center gap-2 px-3 py-1.5 border-2 border-border bg-card shadow-[2px_2px_0_var(--border)] rounded-lg font-bold text-xs text-foreground"
                          >
                            <span>
                              {pos.label} <span className="text-[10px] text-muted-foreground">({pos.value})</span>
                            </span>
                            {pos.value !== '__other__' && (
                              <button
                                type="button"
                                onClick={() => handleRemovePos(pos.value)}
                                className="text-danger hover:text-rose-700 font-black p-0.5 rounded transition"
                                title="Xóa từ loại này"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {posFormError && (
                        <div className="text-xs font-bold text-rose-600 bg-rose-50 p-2 border border-rose-300 rounded-md">
                          {posFormError}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Tên loại từ vựng mới (VD: Thán từ, Cụm từ...)"
                            value={newPosLabel}
                            onChange={(e) => setNewPosLabel(e.target.value)}
                            className="flex-1 min-w-[200px] px-3 py-1.5 border-2 border-border rounded-lg text-xs font-bold bg-background focus:outline-none focus:border-primary"
                          />
                          <Button
                            variant="secondary"
                            onClick={handleAddPos}
                            className="min-h-8 px-4 py-1 text-xs shrink-0"
                          >
                            <Plus size={14} />
                            Thêm từ loại
                          </Button>
                        </div>

                        {newPosLabel.trim() && (
                          <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 pl-1">
                            <span>Mã hệ thống tự sinh:</span>
                            <span className="font-mono font-black text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                              {slugifyPosLabel(newPosLabel)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* 3. Visual Builder: Numeric System Limits */}
              <div className="neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col gap-4">
                <h3 className="font-black text-sm text-foreground pb-1 border-b-2 border-border">
                  Giới hạn & Mục tiêu mặc định
                </h3>

                {/* Daily Goal */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-black text-foreground block">Mục tiêu học hàng ngày</label>
                    <span className="text-[11px] font-bold text-muted-foreground">Số từ vựng mục tiêu mặc định cho tài khoản mới</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={Number(settingsForm['default_daily_goal']) || 10}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setSettingsForm((prev) => ({ ...prev, default_daily_goal: val }))
                      }}
                      className="w-20 px-3 py-1.5 border-2 border-border rounded-lg bg-background font-black text-xs text-center focus:outline-none focus:border-primary"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => handleSaveSetting('default_daily_goal')}
                      disabled={savingSetting === 'default_daily_goal'}
                      className="min-h-8 px-2.5 py-1 text-xs"
                    >
                      <Save size={12} />
                    </Button>
                  </div>
                </div>

                {/* Max Examples Count */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/60">
                  <div>
                    <label className="text-xs font-black text-foreground block">Ví dụ tối đa mỗi từ vựng</label>
                    <span className="text-[11px] font-bold text-muted-foreground">Giới hạn số câu ví dụ hiển thị khi tra cứu từ</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={Number(settingsForm['vocabulary_max_examples_count']) || 10}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setSettingsForm((prev) => ({ ...prev, vocabulary_max_examples_count: val }))
                      }}
                      className="w-20 px-3 py-1.5 border-2 border-border rounded-lg bg-background font-black text-xs text-center focus:outline-none focus:border-primary"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => handleSaveSetting('vocabulary_max_examples_count')}
                      disabled={savingSetting === 'vocabulary_max_examples_count'}
                      className="min-h-8 px-2.5 py-1 text-xs"
                    >
                      <Save size={12} />
                    </Button>
                  </div>
                </div>

                {/* Quick Notes Limits */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/60">
                  <div>
                    <label className="text-xs font-black text-foreground block">Số ghi chú nhanh tối đa</label>
                    <span className="text-[11px] font-bold text-muted-foreground">Giới hạn số lượng ghi chú tối đa mỗi học viên</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      value={Number(settingsForm['quick_notes_max_count']) || 20}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setSettingsForm((prev) => ({ ...prev, quick_notes_max_count: val }))
                      }}
                      className="w-20 px-3 py-1.5 border-2 border-border rounded-lg bg-background font-black text-xs text-center focus:outline-none focus:border-primary"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => handleSaveSetting('quick_notes_max_count')}
                      disabled={savingSetting === 'quick_notes_max_count'}
                      className="min-h-8 px-2.5 py-1 text-xs"
                    >
                      <Save size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
