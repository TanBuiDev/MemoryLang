import { useEffect, useMemo, useState } from 'react'
import { Crown, History, RefreshCw, Search, Settings, UserCog } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import type {
  AdminSubscriptionAdjustmentInput,
  AdminSubscriptionPlanUpdateInput,
  AdminSubscriptionUser,
  BillingCycle,
  PaymentLog,
  PlanType,
  SubscriptionPlanPrice,
} from '@/types/subscription.types'

type PendingConfirm =
  | { type: 'price'; input: AdminSubscriptionPlanUpdateInput }
  | { type: 'subscription'; input: AdminSubscriptionAdjustmentInput }
  | null

type SubscriptionDraft = AdminSubscriptionAdjustmentInput & {
  userLabel: string
}

type PricingDraft = {
  plan: SubscriptionPlanPrice
  amount: string
  reason: string
}

const planOptions = [
  { value: 'all', label: 'Tất cả gói' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
]

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function formatMoney(amount: number) {
  return currencyFormatter.format(amount)
}

function formatDate(value: string | null) {
  if (!value) return 'Chưa có'
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function addMonths(base: Date, months: number) {
  const next = new Date(base)
  next.setMonth(next.getMonth() + months)
  return next
}

function getUserLabel(user: AdminSubscriptionUser) {
  return user.display_name || user.email || user.id
}

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlanPrice[]>([])
  const [users, setUsers] = useState<AdminSubscriptionUser[]>([])
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([])
  const [historyUser, setHistoryUser] = useState<AdminSubscriptionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<'all' | PlanType>('all')
  const [pricingDraft, setPricingDraft] = useState<PricingDraft | null>(null)
  const [subscriptionDraft, setSubscriptionDraft] = useState<SubscriptionDraft | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [nextPlans, nextUsers] = await Promise.all([
        adminService.listSubscriptionPlans(),
        adminService.listSubscriptionUsers(),
      ])
      setPlans(nextPlans)
      setUsers(nextUsers)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return users
      .filter((item) => (planFilter === 'all' ? true : item.subscription?.plan_type === planFilter))
      .filter((item) => {
        if (!keyword) return true
        return `${item.email ?? ''} ${item.display_name ?? ''}`.toLowerCase().includes(keyword)
      })
  }, [users, query, planFilter])

  const proPlans = plans.filter((plan) => plan.plan_type === 'pro')

  function openPricingDraft(plan: SubscriptionPlanPrice) {
    setFormError(null)
    setPricingDraft({ plan, amount: String(plan.amount), reason: '' })
  }

  function submitPricingDraft() {
    if (!pricingDraft) return
    const amount = Number(pricingDraft.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Giá gói phải lớn hơn 0.')
      return
    }
    if (!pricingDraft.reason.trim()) {
      setFormError('Vui lòng nhập lý do đổi giá.')
      return
    }

    setPendingConfirm({
      type: 'price',
      input: {
        planType: pricingDraft.plan.plan_type,
        billingCycle: pricingDraft.plan.billing_cycle,
        amount,
        currency: pricingDraft.plan.currency,
        isActive: pricingDraft.plan.is_active,
        reason: pricingDraft.reason.trim(),
      },
    })
  }

  function openSubscriptionDraft(user: AdminSubscriptionUser, action: 'grant' | 'renew' | 'cancel-period' | 'downgrade') {
    setFormError(null)
    const now = new Date()
    const currentEnd = user.subscription?.current_period_end ? new Date(user.subscription.current_period_end) : now
    const renewBase = currentEnd > now ? currentEnd : now
    const userLabel = getUserLabel(user)

    if (action === 'downgrade') {
      setSubscriptionDraft({
        userLabel,
        userId: user.id,
        planType: 'free',
        status: 'cancelled',
        billingCycle: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        reason: '',
      })
      return
    }

    if (action === 'cancel-period') {
      setSubscriptionDraft({
        userLabel,
        userId: user.id,
        planType: 'pro',
        status: 'active',
        billingCycle: user.subscription?.billing_cycle ?? 'monthly',
        currentPeriodEnd: user.subscription?.current_period_end ?? addMonths(now, 1).toISOString(),
        cancelAtPeriodEnd: true,
        reason: '',
      })
      return
    }

    const billingCycle: BillingCycle = action === 'renew'
      ? user.subscription?.billing_cycle ?? 'monthly'
      : 'monthly'
    const periodEnd = addMonths(action === 'renew' ? renewBase : now, billingCycle === 'yearly' ? 12 : 1)

    setSubscriptionDraft({
      userLabel,
      userId: user.id,
      planType: 'pro',
      status: 'active',
      billingCycle,
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      reason: '',
    })
  }

  function submitSubscriptionDraft() {
    if (!subscriptionDraft) return
    if (!subscriptionDraft.reason.trim()) {
      setFormError('Vui lòng nhập lý do thao tác để ghi audit log.')
      return
    }

    const { userLabel: _userLabel, ...input } = subscriptionDraft
    setPendingConfirm({
      type: 'subscription',
      input: {
        ...input,
        reason: subscriptionDraft.reason.trim(),
      },
    })
  }

  async function confirmPendingAction() {
    if (!pendingConfirm) return

    try {
      if (pendingConfirm.type === 'price') {
        await adminService.updateSubscriptionPlanPrice(pendingConfirm.input)
        showToast({ type: 'success', title: 'Đã cập nhật giá gói' })
        setPricingDraft(null)
      } else {
        await adminService.setUserSubscription(pendingConfirm.input)
        showToast({ type: 'success', title: 'Đã cập nhật gói đăng ký' })
        setSubscriptionDraft(null)
      }

      setPendingConfirm(null)
      await loadData()
    } catch (err) {
      showToast({ type: 'error', title: 'Không thể cập nhật', message: (err as Error).message })
    }
  }

  async function openPaymentHistory(user: AdminSubscriptionUser) {
    setHistoryUser(user)
    setHistoryLoading(true)
    try {
      setPaymentLogs(await adminService.getUserPaymentLogs(user.id))
    } catch (err) {
      showToast({ type: 'error', title: 'Không thể tải lịch sử thanh toán', message: (err as Error).message })
      setPaymentLogs([])
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-200 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <Crown className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Gói đăng ký</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-bold">
              Quản lý giá gói, quyền Pro, chu kỳ và lịch sử thanh toán của người dùng.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => void loadData()}
          disabled={loading}
          className="neo-button px-3 py-1.5 h-9 border-2 border-slate-900 bg-white hover:bg-slate-100 text-xs font-black shadow-[2px_2px_0px_0px_#000] rounded-xl self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </Button>
      </header>

      {error ? (
        <Card className="border-3 border-rose-600 bg-rose-50 p-4 shadow-[4px_4px_0px_0px_#000] rounded-2xl">
          <CardTitle className="text-rose-900 text-base">Không thể tải dữ liệu gói đăng ký</CardTitle>
          <CardDescription className="mt-2 text-xs font-bold text-rose-700">{error}</CardDescription>
        </Card>
      ) : null}

      {/* Pricing Management Card */}
      <Card className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-2">
          <Settings size={20} className="text-purple-700" />
          <CardTitle className="text-lg font-black text-slate-900">Quản lý giá gói</CardTitle>
        </div>
        <CardDescription className="text-xs font-bold text-slate-600">
          Thay đổi giá chỉ áp dụng cho lượt thanh toán mới. Các giao dịch đang chờ vẫn xác thực theo số tiền đã tạo ban đầu.
        </CardDescription>

        <div className="grid gap-4 md:grid-cols-2">
          {proPlans.map((plan) => (
            <div key={plan.id} className="rounded-xl border-2 border-slate-900 bg-amber-50 p-4 shadow-[3px_3px_0px_0px_#000] flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-amber-900">{plan.display_name} {plan.billing_cycle === 'monthly' ? 'tháng' : 'năm'}</p>
                <p className="mt-1 font-mono text-2xl font-black text-slate-900">{formatMoney(plan.amount)}</p>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5">{plan.currency} · {plan.is_active ? 'Đang bật' : 'Đang tắt'}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => openPricingDraft(plan)}
                className="neo-button px-3 py-1 h-8 text-xs font-black border-2 border-slate-900 bg-white hover:bg-slate-100 shadow-[1.5px_1.5px_0px_0px_#000] rounded-lg cursor-pointer"
              >
                Sửa giá
              </Button>
            </div>
          ))}
        </div>

        {pricingDraft ? (
          <div className="rounded-xl border-3 border-slate-900 bg-slate-50 p-4 shadow-[4px_4px_0px_0px_#000] space-y-3">
            <p className="font-black text-sm text-slate-900">Sửa giá {pricingDraft.plan.billing_cycle === 'monthly' ? 'tháng' : 'năm'}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="pricing-amount" className="text-xs font-black uppercase text-slate-700">Giá mới</Label>
                <Input
                  id="pricing-amount"
                  inputMode="numeric"
                  value={pricingDraft.amount}
                  onChange={(event) => setPricingDraft((prev) => prev ? { ...prev, amount: event.target.value } : prev)}
                  className="neo-input mt-1 border-2 border-slate-900 rounded-xl font-bold bg-white"
                />
              </div>
              <div>
                <Label htmlFor="pricing-reason" className="text-xs font-black uppercase text-slate-700">Lý do đổi giá</Label>
                <Textarea
                  id="pricing-reason"
                  className="mt-1 min-h-10 border-2 border-slate-900 rounded-xl font-bold bg-white"
                  value={pricingDraft.reason}
                  onChange={(event) => setPricingDraft((prev) => prev ? { ...prev, reason: event.target.value } : prev)}
                />
              </div>
            </div>
            {formError ? <p className="text-xs font-black text-rose-600">{formError}</p> : null}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={submitPricingDraft}
                className="neo-button px-4 py-1.5 h-9 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl cursor-pointer"
              >
                Lưu giá
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPricingDraft(null)}
                className="neo-button px-4 py-1.5 h-9 bg-white hover:bg-slate-100 text-slate-700 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl cursor-pointer"
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* User Subscription Management Card */}
      <Card className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b-2 border-slate-900 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <UserCog size={20} className="text-amber-600" />
              <CardTitle className="text-lg font-black text-slate-900">Quản lý người dùng</CardTitle>
            </div>
            <CardDescription className="text-xs font-bold text-slate-600 mt-0.5">
              Cấp, gia hạn, hủy cuối kỳ hoặc hạ gói theo từng tài khoản.
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 border-2 border-slate-900 rounded-xl font-bold bg-white text-xs"
                placeholder="Tìm email hoặc tên..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Select value={planFilter} onChange={(value) => setPlanFilter(value as 'all' | PlanType)} options={planOptions} />
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {loading ? <p className="text-xs font-bold text-slate-500">Đang tải dữ liệu...</p> : null}
          {!loading && filteredUsers.length === 0 ? (
            <p className="text-xs font-bold text-slate-500 py-2">Không có người dùng phù hợp.</p>
          ) : null}
          {filteredUsers.map((item) => (
            <div
              key={item.id}
              data-testid={`subscription-user-${item.id}`}
              className="rounded-xl border-2 border-slate-900 bg-slate-50 p-4 shadow-[3px_3px_0px_0px_#000]"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(110px,0.7fr))_auto] lg:items-center">
                <div>
                  <p className="font-black text-slate-900 text-sm">{getUserLabel(item)}</p>
                  <p className="text-xs font-bold text-slate-500">{item.email ?? 'Chưa có email'}</p>
                </div>
                <InfoBlock label="Gói" value={item.subscription?.plan_type === 'pro' ? 'Pro' : 'Free'} accent={item.subscription?.plan_type === 'pro'} />
                <InfoBlock label="Trạng thái" value={item.subscription?.status ?? 'free'} />
                <InfoBlock label="Hết hạn" value={formatDate(item.subscription?.current_period_end ?? null)} />
                <InfoBlock label="Thanh toán" value={`${item.payment_count} thanh toán`} />
                <div className="flex flex-wrap gap-2 pt-2 lg:pt-0">
                  <Button
                    variant="ghost"
                    onClick={() => openSubscriptionDraft(item, 'grant')}
                    className="neo-button px-2.5 py-1 h-8 text-xs font-black border-2 border-slate-900 bg-[#fdc800] hover:bg-amber-300 text-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] rounded-lg cursor-pointer"
                  >
                    <Crown size={13} />
                    <span>Cấp Pro</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => openSubscriptionDraft(item, 'renew')}
                    className="neo-button px-2.5 py-1 h-8 text-xs font-black border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] rounded-lg cursor-pointer"
                  >
                    Gia hạn
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => openSubscriptionDraft(item, 'cancel-period')}
                    className="neo-button px-2.5 py-1 h-8 text-xs font-black border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] rounded-lg cursor-pointer"
                  >
                    Hủy cuối kỳ
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => openSubscriptionDraft(item, 'downgrade')}
                    className="neo-button px-2.5 py-1 h-8 text-xs font-black border-2 border-slate-900 bg-rose-500 hover:bg-rose-600 text-white shadow-[1.5px_1.5px_0px_0px_#000] rounded-lg cursor-pointer"
                  >
                    Hạ Free
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void openPaymentHistory(item)}
                    className="neo-button px-2.5 py-1 h-8 text-xs font-black border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] rounded-lg cursor-pointer"
                  >
                    <History size={13} />
                    <span>Lịch sử</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {subscriptionDraft ? (
        <Card className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
          <CardTitle className="text-base font-black text-slate-900">Cập nhật gói cho {subscriptionDraft.userLabel}</CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoBlock label="Gói mới" value={subscriptionDraft.planType === 'pro' ? 'Pro' : 'Free'} />
            <InfoBlock label="Trạng thái" value={subscriptionDraft.status} />
            <InfoBlock label="Hết hạn" value={formatDate(subscriptionDraft.currentPeriodEnd)} />
          </div>
          <div>
            <Label htmlFor="subscription-reason" className="text-xs font-black uppercase text-slate-700">Lý do thao tác</Label>
            <Textarea
              id="subscription-reason"
              className="mt-1 border-2 border-slate-900 rounded-xl font-bold bg-white text-xs"
              value={subscriptionDraft.reason}
              onChange={(event) => setSubscriptionDraft((prev) => prev ? { ...prev, reason: event.target.value } : prev)}
            />
          </div>
          {formError ? <p className="text-xs font-black text-rose-600">{formError}</p> : null}
          <div className="flex gap-2">
            <Button
              onClick={submitSubscriptionDraft}
              className="neo-button px-4 py-1.5 h-9 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl cursor-pointer"
            >
              Lưu thay đổi
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSubscriptionDraft(null)}
              className="neo-button px-4 py-1.5 h-9 bg-white hover:bg-slate-100 text-slate-700 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl cursor-pointer"
            >
              Hủy
            </Button>
          </div>
        </Card>
      ) : null}

      {historyUser ? (
        <Card data-testid="payment-history-panel" className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-3">
          <CardTitle className="text-base font-black text-slate-900">Lịch sử thanh toán</CardTitle>
          <CardDescription className="text-xs font-bold text-slate-600">{getUserLabel(historyUser)}</CardDescription>
          <div className="space-y-2 pt-1">
            {historyLoading ? <p className="text-xs font-bold text-slate-500">Đang tải lịch sử...</p> : null}
            {!historyLoading && paymentLogs.length === 0 ? (
              <p className="text-xs font-bold text-slate-500 py-2">Chưa có giao dịch nào.</p>
            ) : null}
            {paymentLogs.map((payment) => (
              <div key={payment.id} className="grid gap-2 rounded-xl border-2 border-slate-900 bg-slate-50 p-3 sm:grid-cols-4 shadow-[2px_2px_0px_0px_#000]">
                <span className="font-mono text-xs font-black text-slate-900">{payment.payos_order_code ?? payment.id}</span>
                <span className="text-xs font-bold text-slate-900">{formatMoney(payment.amount)}</span>
                <span className="text-xs font-bold text-emerald-700 uppercase">{payment.status}</span>
                <span className="text-xs font-bold text-slate-600">{formatDate(payment.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <ConfirmModal
        open={pendingConfirm?.type === 'price'}
        title="Xác nhận đổi giá gói"
        description="Giá mới sẽ áp dụng cho các lượt thanh toán tạo sau thời điểm lưu."
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
        variant="primary"
        onConfirm={() => void confirmPendingAction()}
        onCancel={() => setPendingConfirm(null)}
      />

      <ConfirmModal
        open={pendingConfirm?.type === 'subscription'}
        title="Xác nhận cập nhật gói"
        description="Thao tác này thay đổi quyền truy cập của người dùng và sẽ được ghi audit log."
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
        variant="primary"
        onConfirm={() => void confirmPendingAction()}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  )
}

function InfoBlock({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className={accent ? 'font-black text-purple-700 text-xs sm:text-sm' : 'font-bold text-slate-900 text-xs sm:text-sm'}>{value}</p>
    </div>
  )
}
