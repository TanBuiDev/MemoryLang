import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Lock,
  Trash2,
  Activity,
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
  Plus,
  Play,
  Layers,
  Tag,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  adminSecretsService,
  type KeyPoolItem,
  type AiModelConfigItem,
  type KeyUsageLogItem,
} from '@/services/supabase/adminSecrets.service'
import { testGeminiApiKeyAndModel } from '@/utils/geminiVisionParser'
import { ConfirmModal } from '@/components/ui/confirm-modal'

const PURPOSE_OPTIONS = [
  { value: 'all', label: 'Tất cả mục đích / dịch vụ' },
  { value: 'ai_vision', label: 'AI Vision Exam Parser (Bóc tách mọi dạng đề từ Ảnh)' },
  { value: 'ai_chat', label: 'AI Tutor Chatbot' },
  { value: 'tts', label: 'Google Cloud TTS (Phát âm)' },
  { value: 'translation', label: 'DeepL Translation (Dịch thuật)' },
  { value: 'payment', label: 'PayOS Payment (Thanh toán)' },
]

export default function AdminSecretsPage() {
  const [loading, setLoading] = useState(true)
  const [keyPools, setKeyPools] = useState<KeyPoolItem[]>([])
  const [aiModels, setAiModels] = useState<AiModelConfigItem[]>([])
  const [usageLogs, setUsageLogs] = useState<KeyUsageLogItem[]>([])
  const [selectedPurposeFilter, setSelectedPurposeFilter] = useState('all')

  // Add/Edit Key Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [formKeyName, setFormKeyName] = useState('')
  const [formPurposeTag, setFormPurposeTag] = useState('ai_vision')
  const [formSecretVal, setFormSecretVal] = useState('')
  const [formModelName, setFormModelName] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [modalErrorMsg, setModalErrorMsg] = useState<string | null>(null)

  // Add Model Catalog Modal state
  const [showAddModelModal, setShowAddModelModal] = useState(false)
  const [newModelNameInput, setNewModelNameInput] = useState('')
  const [newModelDescInput, setNewModelDescInput] = useState('')
  const [newModelIsDefault, setNewModelIsDefault] = useState(false)

  // Status & Testing states
  const [savingStatus, setSavingStatus] = useState(false)
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ ok: boolean; message: string } | null>(null)
  const [pendingDeleteKeyId, setPendingDeleteKeyId] = useState<string | null>(null)
  const [pendingDeleteModelId, setPendingDeleteModelId] = useState<string | null>(null)

  const handleTestIndividualKey = async (item: KeyPoolItem) => {
    setTestingKeyId(item.id)
    setFeedbackMsg(null)
    try {
      const keyData = await adminSecretsService.getKeyPoolSecretForTest(item.id)
      const testRes = await testGeminiApiKeyAndModel(keyData.encrypted_value, item.model_name)

      if (testRes.ok) {
        await adminSecretsService.toggleKeyPoolStatus(item.id, 'active')
        setFeedbackMsg({
          ok: true,
          message: `✓ Kiểm tra thành công! Key '${item.key_name}' (${item.model_name}) đang hoạt động tốt.`,
        })
      } else {
        await adminSecretsService.toggleKeyPoolStatus(item.id, 'disabled')
        setFeedbackMsg({
          ok: false,
          message: `✕ Key '${item.key_name}' kiểm tra thất bại: ${testRes.message}`,
        })
      }
      await loadData()
    } catch (err: any) {
      setFeedbackMsg({ ok: false, message: `Lỗi khi kiểm tra Key '${item.key_name}': ${err.message}` })
    } finally {
      setTestingKeyId(null)
    }
  }

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => {
        setFeedbackMsg(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [feedbackMsg])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pools, models, logs] = await Promise.all([
        adminSecretsService.getKeyPools(),
        adminSecretsService.getAiModels(),
        adminSecretsService.getKeyUsageLogs(50),
      ])

      setKeyPools(pools)
      setAiModels(models)
      setUsageLogs(logs)
    } catch (err: any) {
      console.error('Failed to load admin secrets vault:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleOpenAddModal = (item?: KeyPoolItem) => {
    setModalErrorMsg(null)
    if (item) {
      setEditingKeyId(item.id)
      setFormKeyName(item.key_name)
      setFormPurposeTag(item.purpose_tag)
      setFormSecretVal('') // Write-Only policy: never prefill secret string
      setFormModelName(item.model_name)
      setFormIsActive(item.status === 'active')
    } else {
      setEditingKeyId(null)
      setFormKeyName('')
      setFormPurposeTag('ai_vision')
      setFormSecretVal('')
      setFormModelName('')
      setFormIsActive(true)
    }
    setShowAddModal(true)
  }

  const handleSaveKeyPoolForm = async () => {
    setModalErrorMsg(null)
    const targetModel = formModelName.trim()

    if (!formKeyName.trim()) {
      setModalErrorMsg('Vui lòng nhập Tên Gợi Nhớ / Mục đích cho Key này.')
      return
    }

    if (!targetModel) {
      setModalErrorMsg('Vui lòng nhập tên Model AI cho Key này (VD: gemini-2.0-flash, gemini-1.5-pro...).')
      return
    }

    if (!editingKeyId && !formSecretVal.trim()) {
      setModalErrorMsg('Vui lòng dán API Key secret vào đây.')
      return
    }

    setSavingStatus(true)

    try {
      // If adding or providing new key string, test connection with Google first
      if (formSecretVal.trim() && (formPurposeTag === 'ai_vision' || formPurposeTag === 'ai_chat')) {
        const testRes = await testGeminiApiKeyAndModel(formSecretVal.trim(), targetModel)
        if (!testRes.ok) {
          setModalErrorMsg(testRes.message)
          setSavingStatus(false)
          return
        }
      }

      // Upsert model to verified catalog so it shows in catalog
      if (targetModel) {
        await adminSecretsService.saveVerifiedAiModel(targetModel, 'gemini')
      }

      await adminSecretsService.upsertKeyPoolItem({
        id: editingKeyId || undefined,
        key_name: formKeyName.trim(),
        purpose_tag: formPurposeTag,
        secret_val: formSecretVal.trim() || undefined,
        model_name: targetModel,
        is_active: formIsActive,
      })

      // Immediately purge cleartext secret from state memory
      setFormSecretVal('')
      setShowAddModal(false)
      setFeedbackMsg({
        ok: true,
        message: editingKeyId
          ? '✓ Cập nhật cấu hình Key thành công!'
          : '✓ Đã xác thực & Thêm API Key mới vào Vault thành công!',
      })

      await loadData()
    } catch (err: any) {
      setModalErrorMsg(`Lỗi khi lưu Key: ${err.message}`)
    } finally {
      setSavingStatus(false)
    }
  }

  const handleSaveNewModelCatalog = async () => {
    if (!newModelNameInput.trim()) {
      setModalErrorMsg('Vui lòng nhập Tên Model AI.')
      return
    }

    setSavingStatus(true)
    try {
      await adminSecretsService.saveVerifiedAiModel(
        newModelNameInput.trim(),
        'gemini',
        newModelDescInput.trim() || undefined,
        newModelIsDefault
      )
      setNewModelNameInput('')
      setNewModelDescInput('')
      setNewModelIsDefault(false)
      setShowAddModelModal(false)
      setFeedbackMsg({ ok: true, message: `✓ Đã thêm Model '${newModelNameInput.trim()}' vào Danh mục!` })
      await loadData()
    } catch (err: any) {
      setFeedbackMsg({ ok: false, message: `Lỗi khi lưu Model: ${err.message}` })
    } finally {
      setSavingStatus(false)
    }
  }

  const handleDeleteModel = async (id: string) => {
    try {
      await adminSecretsService.deleteAiModel(id)
      setPendingDeleteModelId(null)
      setFeedbackMsg({ ok: true, message: '✓ Đã xóa Model khỏi danh mục.' })
      await loadData()
    } catch (err: any) {
      setFeedbackMsg({ ok: false, message: `Lỗi khi xóa Model: ${err.message}` })
    }
  }

  const handleToggleStatus = async (item: KeyPoolItem) => {
    const newStatus = item.status === 'active' ? 'disabled' : 'active'
    try {
      await adminSecretsService.toggleKeyPoolStatus(item.id, newStatus)
      setFeedbackMsg({
        ok: true,
        message: `✓ Đã ${newStatus === 'active' ? 'bật' : 'tắt'} trạng thái cho Key '${item.key_name}'.`,
      })
      await loadData()
    } catch (err: any) {
      setFeedbackMsg({ ok: false, message: `Lỗi khi đổi trạng thái Key: ${err.message}` })
    }
  }

  const handleUpdateModel = async (id: string, modelName: string) => {
    try {
      await adminSecretsService.updateKeyPoolModel(id, modelName)
      if (modelName.trim()) {
        await adminSecretsService.saveVerifiedAiModel(modelName.trim(), 'gemini')
      }
      setFeedbackMsg({ ok: true, message: `✓ Đã chuyển Model sang '${modelName}'.` })
      await loadData()
    } catch (err: any) {
      setFeedbackMsg({ ok: false, message: `Lỗi khi đổi Model: ${err.message}` })
    }
  }

  const handleDeleteKey = async (id: string) => {
    try {
      await adminSecretsService.deleteKeyPoolItem(id)
      setPendingDeleteKeyId(null)
      setFeedbackMsg({ ok: true, message: '✓ Đã xóa Key khỏi Pool Vault!' })
      await loadData()
    } catch (err: any) {
      setFeedbackMsg({ ok: false, message: `Lỗi khi xóa Key: ${err.message}` })
    }
  }

  // Filter keys by purpose tag
  const filteredKeys = keyPools.filter((k) =>
    selectedPurposeFilter === 'all' ? true : k.purpose_tag === selectedPurposeFilter
  )

  // Calculate statistics
  const totalCalls = usageLogs.length
  const successCalls = usageLogs.filter((l) => l.status_code === 200).length
  const successRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 100
  const avgLatency =
    totalCalls > 0
      ? Math.round(usageLogs.reduce((acc, curr) => acc + curr.response_time_ms, 0) / totalCalls)
      : 0
  const activeKeysCount = keyPools.filter((k) => k.status === 'active').length

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b-3 border-slate-900">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
            Google AI Studio Style Key Vault & Failover Engine
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
            Quản lý Multi-Key Pool với cơ chế tự động chuyển đổi Key (Automatic Failover) khi bị lỗi hoặc chạm Rate Limit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => void loadData()}
            disabled={loading}
            className="text-xs font-black"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>

          <Button
            variant="primary"
            onClick={() => handleOpenAddModal()}
            className="text-xs font-black px-4"
          >
            <Plus size={16} /> Thêm API Key mới
          </Button>
        </div>
      </div>

      {/* Auto-Dismissing Toast Notification */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border-2 font-black text-xs flex items-center justify-between gap-2 shadow-[4px_4px_0px_0px_#000] animate-in fade-in slide-in-from-top-2 ${
            feedbackMsg.ok
              ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
              : 'bg-rose-100 border-rose-400 text-rose-950'
          }`}
        >
          <span className="flex items-center gap-2">
            {feedbackMsg.ok ? <CheckCircle2 size={16} className="text-emerald-700" /> : <AlertTriangle size={16} className="text-rose-700" />}
            {feedbackMsg.message}
          </span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-black opacity-70 hover:opacity-100 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Analytics Dashboard Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="neo-card p-4 bg-card border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 border-2 border-slate-900 rounded-lg text-emerald-800">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Tổng Key Sẵn sàng</div>
            <div className="text-base font-black text-slate-900">
              <span className="text-emerald-700">{activeKeysCount}</span> / {keyPools.length} Keys Active
            </div>
          </div>
        </div>

        <div className="neo-card p-4 bg-card border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 border-2 border-slate-900 rounded-lg text-blue-800">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Tổng lượt gọi API</div>
            <div className="text-base font-black text-slate-900">{totalCalls} lượt</div>
          </div>
        </div>

        <div className="neo-card p-4 bg-card border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 border-2 border-slate-900 rounded-lg text-indigo-800">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Tỷ lệ thành công</div>
            <div className="text-base font-black text-emerald-700">{successRate}%</div>
          </div>
        </div>

        <div className="neo-card p-4 bg-card border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 border-2 border-slate-900 rounded-lg text-amber-800">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Tốc độ trung bình</div>
            <div className="text-base font-black text-slate-900">{avgLatency} ms</div>
          </div>
        </div>
      </div>

      {/* Main Google AI Studio Style Key Manager Table */}
      <div className="neo-card p-5 sm:p-6 bg-card border-3 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary shrink-0" />
            <h2 className="font-black text-slate-900 text-base sm:text-lg">
              Danh sách API Keys Vault Manager ({filteredKeys.length} Keys)
            </h2>
          </div>

          {/* Filter Dropdown */}
          <div className="w-full sm:w-64">
            <Select
              value={selectedPurposeFilter}
              onChange={(val) => setSelectedPurposeFilter(val)}
              options={PURPOSE_OPTIONS}
            />
          </div>
        </div>

        {filteredKeys.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-500 bg-muted/20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center gap-2">
            <AlertTriangle size={24} className="text-amber-500" />
            <span>Chưa có Key nào trong danh mục lọc này. Bấm "Thêm API Key mới" để cấu hình.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-muted/40 text-slate-700">
                  <th className="p-3 font-black">Tên Key / Mục đích</th>
                  <th className="p-3 font-black">Key Preview</th>
                  <th className="p-3 font-black">Chức năng</th>
                  <th className="p-3 font-black">Model AI</th>
                  <th className="p-3 font-black">Trạng thái (Status)</th>
                  <th className="p-3 font-black">Lượt gọi / Lỗi</th>
                  <th className="p-3 font-black">Lần dùng gần nhất</th>
                  <th className="p-3 font-black text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b-2 border-slate-900">
                {filteredKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-muted/20">
                    {/* Name */}
                    <td className="p-3 font-black text-slate-900">
                      {k.key_name}
                    </td>

                    {/* Masked Preview */}
                    <td className="p-3 font-mono font-bold text-slate-700">
                      <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                        {k.masked_preview}
                      </span>
                    </td>

                    {/* Purpose Badge */}
                    <td className="p-3">
                      <span className="text-[11px] font-black px-2 py-0.5 rounded border bg-blue-50 border-blue-300 text-blue-900 inline-flex items-center gap-1">
                        <Tag size={10} />
                        {k.purpose_tag === 'ai_vision'
                          ? 'AI Vision Exam'
                          : k.purpose_tag === 'ai_chat'
                          ? 'AI Tutor Chat'
                          : k.purpose_tag === 'tts'
                          ? 'Google TTS'
                          : k.purpose_tag === 'translation'
                          ? 'DeepL Translate'
                          : k.purpose_tag}
                      </span>
                    </td>

                    {/* Model Name Input/Dropdown */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={k.model_name}
                        onChange={(e) => void handleUpdateModel(k.id, e.target.value)}
                        placeholder="VD: gemini-2.0-flash"
                        className="px-2 py-1 border border-slate-900 rounded bg-background text-[11px] font-mono font-bold focus:outline-none focus:border-primary w-36"
                      />
                    </td>

                    {/* Status Badge */}
                    <td className="p-3">
                      {k.status === 'active' ? (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                          <CheckCircle2 size={12} className="text-emerald-600" /> Active
                        </span>
                      ) : k.status === 'rate_limited' ? (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                          <AlertTriangle size={12} className="text-amber-600" /> Rate Limited
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                          <AlertCircle size={12} className="text-rose-600" /> Disabled
                        </span>
                      )}
                    </td>

                    {/* Calls / Errors */}
                    <td className="p-3 font-mono text-[11px]">
                      <span className="text-slate-900">{k.total_calls}</span>
                      {k.error_count > 0 && <span className="text-rose-600 font-black ml-1">({k.error_count} lỗi)</span>}
                    </td>

                    {/* Last Used */}
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString('vi-VN') : 'Chưa sử dụng'}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={testingKeyId === k.id}
                          onClick={() => void handleTestIndividualKey(k)}
                          title="Kiểm tra kết nối Key này với Google API"
                          className="px-2 py-1 text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 rounded text-[11px] font-black flex items-center gap-1 transition"
                        >
                          {testingKeyId === k.id ? (
                            <Loader2 size={12} className="animate-spin text-blue-600" />
                          ) : (
                            <Play size={12} className="text-blue-600 fill-blue-600" />
                          )}
                          Test
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(k)}
                          title={k.status === 'active' ? 'Tắt Key' : 'Bật Key'}
                          className="p-1 text-slate-700 hover:text-primary transition"
                        >
                          {k.status === 'active' ? <ToggleRight size={20} className="text-emerald-600" /> : <ToggleLeft size={20} className="text-slate-400" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(k)}
                          title="Sửa Key"
                          className="p-1 text-slate-700 hover:text-primary transition font-black text-[11px] underline"
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          onClick={() => setPendingDeleteKeyId(k.id)}
                          title="Xóa Key khỏi Pool"
                          className="p-1 text-rose-600 hover:text-rose-800 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Managed AI Models Database Catalog */}
      <div className="neo-card p-5 bg-card border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Danh mục AI Models đã xác minh trong Database ({aiModels.length} models)
          </h3>

          <Button
            variant="secondary"
            onClick={() => {
              setNewModelNameInput('')
              setNewModelDescInput('')
              setNewModelIsDefault(false)
              setShowAddModelModal(true)
            }}
            className="text-xs font-black px-3 py-1"
          >
            <Plus size={14} /> Thêm Model AI mới
          </Button>
        </div>

        {aiModels.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-slate-500 bg-muted/20 rounded-xl border border-dashed border-slate-300">
            Chưa có Model AI nào trong danh mục. Hãy bấm "+ Thêm Model AI mới" hoặc thêm Key ở trên để tự động bổ sung Model vào danh mục.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-muted/40 text-slate-700">
                  <th className="p-3 font-black">Tên Model</th>
                  <th className="p-3 font-black">Provider</th>
                  <th className="p-3 font-black">Mô tả</th>
                  <th className="p-3 font-black">Trạng thái</th>
                  <th className="p-3 font-black">Lần xác minh gần nhất</th>
                  <th className="p-3 font-black text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b-2 border-slate-900">
                {aiModels.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20">
                    <td className="p-3 font-mono font-black text-slate-900 flex items-center gap-2">
                      {m.model_name}
                      {m.is_default && (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="p-3 uppercase text-slate-600 font-mono text-[11px]">{m.provider}</td>
                    <td className="p-3 text-slate-600">{m.description || '—'}</td>
                    <td className="p-3">
                      {m.is_active ? (
                        <span className="text-emerald-700 font-black">✓ Active</span>
                      ) : (
                        <span className="text-slate-400 font-bold">Inactive</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {m.last_verified_at ? new Date(m.last_verified_at).toLocaleString('vi-VN') : 'Chưa có'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPendingDeleteModelId(m.id)}
                        className="p-1 text-rose-600 hover:text-rose-800 transition"
                        title="Xóa Model khỏi danh mục"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real-time Usage & Security Audit Logs */}
      <div className="neo-card p-5 bg-card border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col gap-4">
        <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          Nhật ký Giám sát Lưu lượng Gọi API & Automatic Failover Logs ({usageLogs.length} logs)
        </h3>

        {usageLogs.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-slate-500 bg-muted/20 rounded-xl border border-dashed border-slate-300">
            Chưa có nhật ký lượt gọi API nào được ghi nhận. Các lượt gọi AI Vision từ Edge Function sẽ xuất hiện ở đây.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-muted/40 text-slate-700">
                  <th className="p-2.5 font-black">Thời gian</th>
                  <th className="p-2.5 font-black">Dịch vụ</th>
                  <th className="p-2.5 font-black">Tên Key</th>
                  <th className="p-2.5 font-black">Model</th>
                  <th className="p-2.5 font-black">HTTP Status</th>
                  <th className="p-2.5 font-black">Độ trễ (Latency)</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b-2 border-slate-900">
                {usageLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20">
                    <td className="p-2.5 font-mono text-[11px] text-slate-600">
                      {new Date(log.created_at).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="p-2.5 font-mono text-slate-900">{log.service_name}</td>
                    <td className="p-2.5 font-mono text-slate-600">{log.key_name}</td>
                    <td className="p-2.5 font-mono text-slate-600">{log.model_used || '—'}</td>
                    <td className="p-2.5">
                      {log.status_code === 200 ? (
                        <span className="text-emerald-700 font-black">200 OK</span>
                      ) : (
                        <span className="text-rose-700 font-black">{log.status_code} Failover</span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-slate-700">{log.response_time_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-card p-6 bg-card border-3 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl w-full max-w-lg flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                {editingKeyId ? 'Sửa Cấu Hình Key' : 'Thêm API Key mới vào Vault'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-900 font-black text-sm"
              >
                ✕
              </button>
            </div>

            {modalErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-100 border-2 border-rose-400 text-rose-950 text-xs font-black flex items-center gap-2 animate-in fade-in">
                <AlertCircle size={16} className="text-rose-700 shrink-0" />
                <span>{modalErrorMsg}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-black text-slate-900">Tên Gợi Nhớ / Mục đích *</label>
                <input
                  type="text"
                  value={formKeyName}
                  onChange={(e) => setFormKeyName(e.target.value)}
                  placeholder="VD: Key Gemini Dự Phòng 1, Key AI Tutor Chat..."
                  className="w-full mt-1 px-3 py-2 border-2 border-slate-900 rounded-xl bg-background text-xs font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-900">Chức năng Gắn kèm *</label>
                <div className="mt-1">
                  <Select
                    value={formPurposeTag}
                    onChange={(val) => setFormPurposeTag(val)}
                    options={PURPOSE_OPTIONS.filter((p) => p.value !== 'all')}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-900">
                  {editingKeyId ? 'API Key Secret (Bỏ trống nếu giữ nguyên key cũ)' : 'API Key Secret (Write-Only) *'}
                </label>
                <input
                  type="password"
                  value={formSecretVal}
                  autoComplete="new-password"
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  onChange={(e) => setFormSecretVal(e.target.value)}
                  placeholder={editingKeyId ? '•••••••••••••••• (Giữ nguyên)' : 'Dán API key của bạn vào đây'}
                  className="w-full mt-1 px-3 py-2 border-2 border-slate-900 rounded-xl bg-background text-xs font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-900">Model AI Gắn liền với Key này *</label>
                <input
                  type="text"
                  value={formModelName}
                  onChange={(e) => setFormModelName(e.target.value)}
                  placeholder="VD: gemini-2.0-flash, gemini-1.5-pro, gemini-2.5-flash..."
                  className="w-full mt-1 px-3 py-2 border-2 border-slate-900 rounded-xl bg-background text-xs font-mono font-bold focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                  Nhập tên Model AI từ Google AI Studio (VD: gemini-2.0-flash, gemini-1.5-pro). Model này sẽ tự động lưu vào Catalog.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-slate-900"
                />
                Kích hoạt Key này trong Pool (Active)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t-2 border-slate-200">
              <Button variant="ghost" onClick={() => setShowAddModal(false)} className="text-xs font-black">
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={savingStatus}
                onClick={handleSaveKeyPoolForm}
                className="text-xs font-black px-5 min-w-[140px]"
              >
                {savingStatus ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" /> Đang kiểm tra...
                  </span>
                ) : (
                  'Lưu vào Vault'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Model Catalog Modal */}
      {showAddModelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-card p-6 bg-card border-3 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl w-full max-w-md flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Thêm Model AI mới vào Danh mục Catalog
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModelModal(false)}
                className="text-slate-500 hover:text-slate-900 font-black text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-black text-slate-900">Tên Model AI *</label>
                <input
                  type="text"
                  value={newModelNameInput}
                  onChange={(e) => setNewModelNameInput(e.target.value)}
                  placeholder="VD: gemini-2.0-flash, gemini-1.5-pro..."
                  className="w-full mt-1 px-3 py-2 border-2 border-slate-900 rounded-xl bg-background text-xs font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-900">Mô tả Model</label>
                <input
                  type="text"
                  value={newModelDescInput}
                  onChange={(e) => setNewModelDescInput(e.target.value)}
                  placeholder="Mô tả ngắn gọn về model..."
                  className="w-full mt-1 px-3 py-2 border-2 border-slate-900 rounded-xl bg-background text-xs font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newModelIsDefault}
                  onChange={(e) => setNewModelIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-slate-900"
                />
                Đặt làm Model mặc định (Default)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t-2 border-slate-200">
              <Button variant="ghost" onClick={() => setShowAddModelModal(false)} className="text-xs font-black">
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={savingStatus}
                onClick={handleSaveNewModelCatalog}
                className="text-xs font-black px-4"
              >
                {savingStatus ? 'Đang lưu...' : 'Lưu vào Danh mục'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Key Confirmation Modal */}
      <ConfirmModal
        open={!!pendingDeleteKeyId}
        onConfirm={() => {
          if (pendingDeleteKeyId) void handleDeleteKey(pendingDeleteKeyId)
        }}
        onCancel={() => setPendingDeleteKeyId(null)}
        title="Xóa Key khỏi Pool Vault?"
        description="Hành động này sẽ xóa hoàn toàn API Key khỏi Pool. Nếu còn các Key khác trong Pool, hệ thống sẽ tự động chuyển đổi."
      />

      {/* Delete Model Confirmation Modal */}
      <ConfirmModal
        open={!!pendingDeleteModelId}
        onConfirm={() => {
          if (pendingDeleteModelId) void handleDeleteModel(pendingDeleteModelId)
        }}
        onCancel={() => setPendingDeleteModelId(null)}
        title="Xóa Model khỏi Catalog?"
        description="Hành động này sẽ xóa Model AI khỏi danh mục catalog trong Database."
      />
    </div>
  )
}
