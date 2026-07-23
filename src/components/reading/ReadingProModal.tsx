import { Link } from 'react-router-dom'
import { Crown, Lock, CheckCircle2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReadingProModalProps {
  open: boolean
  onClose: () => void
  reason?: string
}

export function ReadingProModal({ open, onClose, reason }: ReadingProModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#000] rounded-2xl w-full max-w-md relative space-y-5 text-slate-900">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 neo-button p-1.5 rounded-xl border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Crown Header Icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#fdc800] border-3 border-slate-900 rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000] shrink-0">
            <Crown className="w-7 h-7 text-slate-900" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">NÂNG CẤP PRO MEMORYLANG</h3>
            <p className="text-xs font-bold text-slate-500">Mở khóa toàn bộ bài đọc & tính năng cao cấp</p>
          </div>
        </div>

        {/* Reason notice */}
        {reason && (
          <div className="p-3 bg-amber-100 border-2 border-slate-900 rounded-xl text-xs font-black text-amber-950 flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]">
            <Lock size={16} className="shrink-0 text-amber-700" />
            <span>{reason}</span>
          </div>
        )}

        {/* Pro Benefits List */}
        <div className="space-y-2.5 bg-slate-50 p-4 border-2 border-slate-900 rounded-xl">
          <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Đặc quyền tài khoản Pro:</p>
          {[
            'Đọc không giới hạn toàn bộ kho bài đọc (A1 -> C2)',
            'Phát âm thanh Audio TTS chuẩn đa tốc độ (0.5x - 2.0x)',
            'Tra nghĩa từ vựng & highlight ghi chú không giới hạn',
            'Làm bài tập đọc hiểu quiz không giới hạn số lần',
          ].map((benefit) => (
            <div key={benefit} className="flex items-start gap-2 text-xs font-bold text-slate-800">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        {/* Upgrade Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          <Button
            asChild
            className="neo-button w-full py-3 h-11 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Link to="/app/upgrade">
              <Sparkles size={18} />
              <span>Nâng Cấp Gói Pro Ngay - Chỉ từ 49k/tháng</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="neo-button w-full py-2 h-9 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl cursor-pointer"
          >
            Để sau
          </Button>
        </div>
      </div>
    </div>
  )
}
