import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Trash2,
  Activity,
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  adminSecretsService,
  type SecretOverviewItem,
  type AiModelConfigItem,
  type KeyUsageLogItem,
} from '@/services/supabase/adminSecrets.service'
import { testGeminiApiKeyAndModel } from '@/utils/geminiVisionParser'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export default function AdminSecretsPage() {
  const [loading, setLoading] = useState(true)
  const [secretsOverview, setSecretsOverview] = useState<SecretOverviewItem[]>([])
  const [aiModels, setAiModels] = useState<AiModelConfigItem[]>([])
  const [usageLogs, setUsageLogs] = useState<KeyUsageLogItem[]>([])

  // Form states (Write-Only, Non-readable)
  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [customModelText, setCustomModelText] = useState('')
  const [modelDescription, setModelDescription] = useState('')
  const [isDefaultModel, setIsDefaultModel] = useState(false)

  // Status & Testing states
  const [testingStatus, setTestingStatus] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ ok: boolean; message: string } | null>(null)
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [secrets, models, logs] = await Promise.all([
        adminSecretsService.getSecretsOverview(),
        adminSecretsService.getAiModels(),
        adminSecretsService.getKeyUsageLogs(50),
      ])

      setSecretsOverview(secrets)
      setAiModels(models)
      setUsageLogs(logs)

      // Set default selected model if available
      const defaultMod = models.find((m) => m.is_default) || models[0]
      if (defaultMod) {
        setSelectedModel(defaultMod.model_name)
      }
    } catch (err: any) {
      console.error('Failed to load admin secrets data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const geminiSecretConfig = secretsOverview.find((s) => s.key_name === 'GEMINI_API_KEY')

  const handleSaveGeminiConfig = async () => {
    const targetModel =
      selectedModel === 'custom'
        ? customModelText.trim()
        : selectedModel.trim()

    if (!geminiKeyInput.trim() && !targetModel) {
      setFeedbackMsg({ ok: false, message: 'Vui lòng nhập Gemini API Key hoặc chọn Model AI.' })
      return
    }

    setTestingStatus(true)
    setFeedbackMsg(null)

    try {
      // 1. Test Key & Model directly with Google API if key is supplied
      if (geminiKeyInput.trim()) {
        const testRes = await testGeminiApiKeyAndModel(geminiKeyInput.trim(), targetModel)
        if (!testRes.ok) {
          setFeedbackMsg(testRes)
          setTestingStatus(false)
          return
        }

        // Save Key securely to Database Vault via RPC
        await adminSecretsService.saveSecret(
          'GEMINI_API_KEY',
          geminiKeyInput.trim(),
          'Google Gemini API Key dùng cho AI Vision bóc tách đề thi & AI Tutor Chat'
        )
      }

      // 2. Save verified AI Model to Database (Preventing duplicates)
      if (targetModel) {
        await adminSecretsService.saveVerifiedAiModel(
          targetModel,
          'gemini',
          modelDescription.trim() || undefined,
          isDefaultModel
        )
      }

      // 3. Clear sensitive input string from memory immediately
      setGeminiKeyInput('')
      setCustomModelText('')
      setModelDescription('')
      setFeedbackMsg({
        ok: true,
        message: '✓ Đã xác thực thành công và lưu Cấu hình vào Database Vault an toàn!',
      })

      // Reload fresh status from server
      await loadData()
    } catch (err: any) {
      setFeedbackMsg({ ok: false, message: `Lỗi khi lưu cấu hình: ${err.message}` })
    } finally {
      setTestingStatus(false)
    }
  }

  const handleDeleteSecret = async (keyName: string) => {
    try {
      await adminSecretsService.deleteSecret(keyName)
      setPendingDeleteKey(null)
      setFeedbackMsg({ ok: true, message: `✓ Đã xóa hoàn toàn Key '${keyName}' khỏi Database Vault!` })
      await loadData()
    } catch (err: any) {
      setFeedbackMsg({ ok: false, message: `Lỗi khi xóa Key: ${err.message}` })
    }
  }

  // Calculate statistics
  const totalCalls = usageLogs.length
  const successCalls = usageLogs.filter((l) => l.status_code === 200).length
  const successRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 100
  const avgLatency =
    totalCalls > 0
      ? Math.round(usageLogs.reduce((acc, curr) => acc + curr.response_time_ms, 0) / totalCalls)
      : 0

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-3 border-slate-900">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
            Quản lý Secret Vault & AI Models Bảo mật 100%
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
            Lưu trữ mã hóa trên Supabase Database Vault. Trình duyệt không bao giờ chứa hay để lộ API Key.
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={() => void loadData()}
          disabled={loading}
          className="text-xs font-black self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </Button>
      </div>

      {/* Analytics Dashboard Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="neo-card p-4 bg-card border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 border-2 border-slate-900 rounded-lg text-emerald-800">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Trạng thái Vault</div>
            <div className="text-sm font-black text-slate-900 flex items-center gap-1">
              {geminiSecretConfig?.is_configured ? (
                <span className="text-emerald-700 font-black">✓ Online & Safe</span>
              ) : (
                <span className="text-amber-700 font-black">⚠ Chưa cài Key</span>
              )}
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

      {/* Main Secret Management Box */}
      <div className="neo-card p-5 sm:p-6 bg-card border-3 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Cấu hình Google Gemini API Key & AI Model (Write-Only Vault)
          </h2>

          {geminiSecretConfig?.is_configured && (
            <span className="text-xs font-black text-emerald-800 bg-emerald-100 border-2 border-emerald-400 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Đã bảo mật trong DB Vault ({geminiSecretConfig.masked_preview})
            </span>
          )}
        </div>

        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border-2 font-black text-xs flex items-center justify-between gap-2 ${
              feedbackMsg.ok
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <span className="flex items-center gap-2">
              {feedbackMsg.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {feedbackMsg.message}
            </span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-xs font-black opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Key Input (Write-Only & Non-Copyable) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              Google Gemini API Key (Miễn phí từ Google AI Studio):
            </label>
            <div className="relative">
              <input
                type="password"
                value={geminiKeyInput}
                autoComplete="new-password"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onChange={(e) => {
                  setGeminiKeyInput(e.target.value)
                  setFeedbackMsg(null)
                }}
                placeholder={
                  geminiSecretConfig?.is_configured
                    ? `•••••••••••••••• (Key hiện tại: ${geminiSecretConfig.masked_preview})`
                    : 'Dán AIzaSy... API key mới của bạn vào đây'
                }
                className="w-full px-3.5 py-2.5 border-2 border-slate-900 rounded-xl bg-background text-xs font-mono font-bold focus:outline-none focus:border-primary pr-20"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider bg-muted px-2 py-0.5 rounded">
                Write-Only
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-500">
              * Ô nhập ngăn chặn Sao chép (Copy). Sau khi lưu, chuỗi raw key sẽ được mã hóa vào Database và tự động xóa khỏi bộ nhớ RAM của trang web.
            </p>
          </div>

          {/* Model Selector & Management */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              Chọn hoặc Nhập AI Vision Model:
            </label>
            <Select
              value={selectedModel}
              onChange={(val) => {
                setSelectedModel(val)
                setFeedbackMsg(null)
              }}
              options={[
                ...aiModels.map((m) => ({
                  value: m.model_name,
                  label: `${m.model_name} ${m.is_default ? '(Default)' : ''} — ${m.description || ''}`,
                })),
                { value: 'custom', label: '+ Thêm Model AI tùy chỉnh mới...' },
              ]}
            />

            {selectedModel === 'custom' && (
              <div className="flex flex-col gap-2 pt-1">
                <input
                  type="text"
                  value={customModelText}
                  onChange={(e) => setCustomModelText(e.target.value)}
                  placeholder="Nhập tên Model AI (VD: gemini-2.5-flash)"
                  className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl text-xs font-mono font-bold bg-background focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={modelDescription}
                  onChange={(e) => setModelDescription(e.target.value)}
                  placeholder="Mô tả ngắn gọn về model này..."
                  className="w-full px-3 py-1.5 border border-slate-400 rounded-lg text-xs font-bold bg-background"
                />
                <label className="flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={isDefaultModel}
                    onChange={(e) => setIsDefaultModel(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-slate-900"
                  />
                  Đặt làm Model mặc định cho toàn hệ thống
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-slate-200">
          {geminiSecretConfig?.is_configured ? (
            <Button
              variant="danger"
              type="button"
              onClick={() => setPendingDeleteKey('GEMINI_API_KEY')}
              className="text-xs font-black px-4"
            >
              <Trash2 size={14} /> Xóa Key khỏi Database Vault
            </Button>
          ) : (
            <span className="text-xs font-bold text-slate-500">Trạng thái: Chưa có Key nào trong DB Vault</span>
          )}

          <Button
            variant="primary"
            type="button"
            disabled={testingStatus}
            onClick={handleSaveGeminiConfig}
            className="px-6 text-xs font-black min-w-[190px]"
          >
            {testingStatus ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" />
                Đang xác thực & Lưu...
              </span>
            ) : (
              'Xác thực & Lưu vào Vault'
            )}
          </Button>
        </div>
      </div>

      {/* Managed AI Models Database Catalog */}
      <div className="neo-card p-5 bg-card border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col gap-4">
        <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Danh mục AI Models đã xác minh trong Database ({aiModels.length} models)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-muted/40 text-slate-700">
                <th className="p-3 font-black">Tên Model</th>
                <th className="p-3 font-black">Provider</th>
                <th className="p-3 font-black">Mô tả</th>
                <th className="p-3 font-black">Trạng thái</th>
                <th className="p-3 font-black">Lần xác minh gần nhất</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Usage & Security Audit Logs */}
      <div className="neo-card p-5 bg-card border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Nhật ký Giám sát Lưu lượng Gọi API & Kiểm toán Security ({usageLogs.length} logs gần nhất)
          </h3>
        </div>

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
                  <th className="p-2.5 font-black">Key</th>
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
                        <span className="text-rose-700 font-black">{log.status_code} Error</span>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!pendingDeleteKey}
        onConfirm={() => {
          if (pendingDeleteKey) void handleDeleteSecret(pendingDeleteKey)
        }}
        onCancel={() => setPendingDeleteKey(null)}
        title="Xóa Key khỏi Database Vault?"
        description="Hành động này sẽ xóa hoàn toàn API Key khỏi Database Vault. Các dịch vụ AI Vision sẽ ngừng hoạt động cho đến khi có Key mới."
      />
    </div>
  )
}
