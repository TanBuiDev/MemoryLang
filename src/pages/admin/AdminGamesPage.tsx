import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { Gamepad2, Crown, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AdminGamesPage() {
  const isSimulatedPro = useSubscriptionStore((s) => s.isSimulatedPro)
  const isPro = useSubscriptionStore((s) => s.isPro)
  const setSimulatedPro = useSubscriptionStore((s) => s.setSimulatedPro)

  const handleTogglePro = () => {
    if (isSimulatedPro === true) {
      setSimulatedPro(false)
    } else if (isSimulatedPro === false) {
      setSimulatedPro(null) // Trả về cấu hình gốc từ DB
    } else {
      setSimulatedPro(true) // Bật Pro
    }
  }

  const getSimStatusLabel = () => {
    if (isSimulatedPro === true) return '👑 Giả lập PRO (Bắt buộc)'
    if (isSimulatedPro === false) return '🚫 Giả lập FREE (Bắt buộc)'
    return '🔌 Sử dụng cấu hình cơ sở dữ liệu'
  }

  const getSimStatusColor = () => {
    if (isSimulatedPro === true) return 'bg-[#dcfce7] text-[#166534] border-[#166534]'
    if (isSimulatedPro === false) return 'bg-[#fee2e2] text-[#991b1b] border-[#991b1b]'
    return 'bg-muted text-foreground border-border'
  }

  const games = [
    {
      id: 'matching',
      name: 'Nối từ',
      status: 'Sẵn sàng',
      desc: 'Trò chơi ghép cặp Từ tiếng Anh và Nghĩa tiếng Việt. Hỗ trợ ôn tập từ sai.',
      proGatedOptions: 'Số lượng câu hỏi > 20, Chế độ trộn ngẫu nhiên hoàn toàn',
      isActive: true,
    },
    {
      id: 'speed',
      name: 'Tốc độ',
      status: 'Sắp ra mắt (MVP 3)',
      desc: 'Trò chơi phản xạ nhanh chọn đáp án đúng trong thời gian giới hạn.',
      proGatedOptions: 'Toàn bộ game (Chỉ dành cho gói Pro)',
      isActive: false,
    },
    {
      id: 'puzzle',
      name: 'Xếp hình từ vựng',
      status: 'Sắp ra mắt (MVP 3)',
      desc: 'Trò chơi sắp xếp chữ cái thành từ vựng hoàn chỉnh dựa vào gợi ý nghĩa.',
      proGatedOptions: 'Toàn bộ game (Chỉ dành cho gói Pro)',
      isActive: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="neo-card p-6 bg-[#432dd7] text-white border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#fdc800] rounded-full border-2 border-white flex items-center justify-center text-navy shrink-0">
            <Gamepad2 className="w-7 h-7 text-[#1c293c]" />
          </div>
          <div>
            <h1 className="text-2xl font-black">QUẢN LÝ TRÒ CHƠI</h1>
            <p className="text-xs font-bold text-[#e0e7ff] uppercase tracking-wide">
              Admin Game Control & Simulation Panel
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="neo-card p-6 bg-background border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c]">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Giả lập Gói Dịch vụ
            </h2>
            <p className="text-xs text-muted-foreground font-bold mb-4 leading-relaxed">
              Dùng để thử nghiệm các tính năng giới hạn (Pro Feature Gate) trên các màn hình trò chơi hoặc học tập mà không cần đổi trực tiếp trong DB.
            </p>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-black uppercase text-muted-foreground">Trạng thái hiện tại:</span>
                <div className={`mt-1 px-3 py-2 rounded-md border-2 font-black text-xs text-center transition-all ${getSimStatusColor()}`}>
                  {getSimStatusLabel()}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-black uppercase text-muted-foreground">Trạng thái thực tế:</span>
                <div className="mt-1 px-3 py-2 rounded-md border-2 border-border font-bold text-xs bg-muted text-muted-foreground">
                  {isPro ? '💎 PRO Active' : 'FREE Tier'}
                </div>
              </div>

              <button
                onClick={handleTogglePro}
                className="neo-button w-full bg-[#fdc800] hover:bg-[#e6b800] py-3 text-sm font-black text-navy flex items-center justify-center gap-2 transition-all mt-2 active:neo-button-active"
              >
                <Crown className="w-4 h-4" />
                Thay đổi trạng thái giả lập
              </button>
              
              <p className="text-[10px] text-center text-muted-foreground font-semibold mt-1">
                (Click liên tục để xoay vòng: Giả lập PRO ➔ Giả lập FREE ➔ Mặc định DB)
              </p>
            </div>
          </div>
        </div>

        {/* Games Status & Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="neo-card p-6 bg-background border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c]">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              Danh sách Trò chơi
            </h2>

            <div className="space-y-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="p-4 border-2 border-[#1c293c] rounded-md bg-muted/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base">{game.name}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-[#1c293c] ${
                          game.isActive
                            ? 'bg-[#dcfce7] text-[#166534]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                      {game.desc}
                    </p>
                    <p className="text-[10px] font-black text-rose-600">
                      🔒 Các tùy chọn Pro: {game.proGatedOptions}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {game.isActive ? (
                      <div className="flex items-center gap-1 text-[#22c55e] font-black text-xs">
                        <CheckCircle2 size={16} />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground font-bold text-xs">
                        <AlertCircle size={16} />
                        Inactive
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
