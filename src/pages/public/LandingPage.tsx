import {
  ArrowRight,
  BarChart3,
  Brain,
  Sparkles,
  Bot,
  Headphones,
  ScrollText,
  Gamepad2,
  Crown,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import mascotArt from '@/assets/brand/memorylang-mascot.svg'
import { BrandLogo, BrandMark } from '@/components/common/BrandLogo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChatStore } from '@/stores/useChatStore'
import { soundEffects } from '@/utils/soundEffects'

export function LandingPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = Boolean(user)
  const openAiModal = useChatStore((state) => state.openAiModal)

  const handleButtonClick = () => {
    soundEffects.play('cardClick')
  }

  const pillars = [
    {
      icon: Brain,
      title: 'Flashcards & Thuật toán SRS',
      text: 'Ghi nhớ từ vựng lâu dài với thuật toán lặp lại ngắt quãng khoa học, tự động tính toán thời điểm ôn tập tối ưu.',
      color: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      icon: Bot,
      title: 'Trợ lý Gia sư AI 24/7',
      text: 'Giải đáp ngữ pháp, tra cứu từ vựng và chữa bài ngay lập tức với phím tắt thần tốc Ctrl+K toàn hệ thống.',
      color: 'bg-purple-100 text-purple-900 border-purple-300',
    },
    {
      icon: Headphones,
      title: 'Luyện nghe Listening & TOEIC',
      text: 'Thực hành bài nghe giao tiếp chuẩn giọng bản ngữ kèm phát âm mẫu và kiểm tra phản xạ nghe.',
      color: 'bg-blue-100 text-blue-900 border-blue-300',
    },
    {
      icon: ScrollText,
      title: 'Bài học Ngữ pháp Hệ thống',
      text: 'Hệ thống bài giảng ngữ pháp từ cơ bản đến nâng cao được thiết kế trực quan, dễ hiểu kèm bài tập.',
      color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
    {
      icon: Gamepad2,
      title: 'Game Nối từ (Matching Game)',
      text: 'Trò chơi ghép cặp từ vựng rèn luyện phản xạ nhanh với hiệu ứng âm thanh sống động và bảng xếp hạng.',
      color: 'bg-rose-100 text-rose-900 border-rose-300',
    },
    {
      icon: BarChart3,
      title: 'Thống kê Tiến độ & Streak',
      text: 'Theo dõi chỉ số chính xác, chuỗi ngày học liên tục (Streak) và mục tiêu từ vựng hàng ngày trực quan.',
      color: 'bg-sky-100 text-sky-900 border-sky-300',
    },
  ]

  const proofPoints = [
    { value: 'SRS 2.0', label: 'Thuật toán ghi nhớ', text: 'Tối ưu hoá khả năng nhớ từ lên đến 95%' },
    { value: '24/7', label: 'Hỗ trợ AI Tutor', text: 'Hỏi đáp & tra cứu nhanh với phím tắt Ctrl+K' },
    { value: '100%', label: 'Chủ động học tập', text: 'Tự do tạo bộ thẻ, theo dõi tiến độ theo nhu cầu' },
  ]

  return (
    <main className="brand-grid-bg min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground">
      {/* Top Header Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link to="/" className="rounded-md border-2 border-transparent p-1 transition hover:border-border hover:bg-card">
          <BrandLogo variant="compact" size="lg" className="h-12" />
        </Link>

        <div className="hidden items-center gap-2 rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 shadow-[3px_3px_0px_0px_#000] md:flex font-black text-xs">
          <a onClick={handleButtonClick} className="rounded px-3 py-1.5 hover:bg-amber-100 transition-colors" href="#features">Tính năng</a>
          <a onClick={handleButtonClick} className="rounded px-3 py-1.5 hover:bg-amber-100 transition-colors" href="#ai-tutor">Gia sư AI</a>
          <a onClick={handleButtonClick} className="rounded px-3 py-1.5 hover:bg-amber-100 transition-colors" href="#pillars">Hệ sinh thái</a>
          <Link onClick={handleButtonClick} className="rounded px-3 py-1.5 hover:bg-purple-100 text-purple-700 transition-colors" to="/app/upgrade">Gói Pro 👑</Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost" onClick={handleButtonClick}>
                <Link to="/app/dashboard">{t('landing.goDashboard')}</Link>
              </Button>
              <Button onClick={() => { handleButtonClick(); void authService.signOut() }}>
                {t('actions.logout')}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" onClick={handleButtonClick}>
                <Link to="/login">{t('landing.login')}</Link>
              </Button>
              <Button asChild onClick={handleButtonClick} className="font-black shadow-[2px_2px_0px_0px_#000]">
                <Link to="/login">Đăng ký Miễn phí ✨</Link>
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-8 py-10 lg:min-h-[calc(100vh-6rem)] lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
        <img
          src={mascotArt}
          alt="MemoryLang Mascot"
          aria-hidden="true"
          data-testid="homepage-mascot-art"
          className="pointer-events-none absolute -left-28 top-16 z-0 hidden w-[32rem] max-w-none rotate-[-4deg] opacity-95 drop-shadow-[10px_12px_0_rgba(28,41,60,0.18)] lg:block xl:-left-36 xl:top-12 xl:w-[38rem]"
        />

        <div className="relative z-10 lg:pt-[26rem] xl:pt-[30rem]">
          <Badge className="bg-purple-100 text-purple-900 border-2 border-slate-900 font-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
            ✨ Phiên bản mới: Gia sư AI 24/7 & Luyện Nghe TOEIC
          </Badge>

          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-none tracking-tight sm:text-6xl md:text-7xl text-slate-900">
            Luyện Tiếng Anh Thông Minh Cùng Gia Sư AI
          </h1>

          <p className="mt-5 max-w-2xl text-base sm:text-lg font-semibold text-slate-600">
            Hệ thống ghi nhớ từ vựng khoa học theo chu kỳ SRS, tích hợp bài luyện nghe Listening, bài giảng Ngữ pháp và Trợ lý AI giải đáp tức thì.
          </p>

          {/* Dynamic Hero CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button asChild onClick={handleButtonClick} className="h-12 px-6 font-black text-base shadow-[4px_4px_0px_0px_#000]">
                  <Link to="/app/dashboard">
                    Vào Bảng Điều Khiển <ArrowRight size={18} className="ml-1" />
                  </Link>
                </Button>
                <Button
                  onClick={() => { handleButtonClick(); openAiModal() }}
                  className="h-12 px-5 font-black text-base bg-[#432dd7] text-white hover:bg-purple-800 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#000]"
                >
                  <Bot size={18} />
                  <span>Hỏi Gia sư AI (Ctrl+K)</span>
                </Button>
                <Button asChild variant="secondary" onClick={handleButtonClick} className="h-12 px-5 font-black text-base border-2 border-slate-900 shadow-[4px_4px_0px_0px_#000]">
                  <Link to="/app/games/matching">🎮 Game Nối từ</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild onClick={handleButtonClick} className="h-12 px-6 font-black text-base shadow-[4px_4px_0px_0px_#000]">
                  <Link to="/login">
                    Đăng ký Học Miễn Phí <Sparkles size={18} className="ml-1" />
                  </Link>
                </Button>
                <Button
                  onClick={() => { handleButtonClick(); openAiModal() }}
                  className="h-12 px-5 font-black text-base bg-[#432dd7] text-white hover:bg-purple-800 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#000]"
                >
                  <Bot size={18} />
                  <span>Dùng thử Gia sư AI (Ctrl+K)</span>
                </Button>
                <Button asChild variant="secondary" onClick={handleButtonClick} className="h-12 px-5 font-black text-base border-2 border-slate-900 shadow-[4px_4px_0px_0px_#000]">
                  <Link to="/app/dashboard">Trải nghiệm Demo 🚀</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Interactive Feature Card Preview */}
        <div className="relative">
          <div className="absolute -right-6 -top-6 hidden h-32 w-32 rounded-full border-3 border-slate-900 bg-[#fdc800] shadow-[6px_6px_0px_0px_#000] md:block" />
          <Card className="relative z-10 rotate-1 overflow-hidden p-6 border-3 border-slate-900 shadow-[8px_8px_0px_0px_#000] bg-white">
            <div className="absolute -right-8 -top-8 opacity-10">
              <BrandMark size="xl" label="" className="h-40 w-40" />
            </div>
            <div className="relative flex items-center justify-between gap-4 border-b-2 border-slate-900 pb-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Từ Vựng Mẫu Hôm Nay</p>
              <BrandMark size="sm" />
            </div>
            <div className="relative mt-4 rounded-xl border-3 border-slate-900 bg-[#432dd7] p-5 text-white shadow-[4px_4px_0px_0px_#000]">
              <p className="text-3xl font-black">break the ice</p>
              <p className="mt-1.5 font-mono text-base text-amber-300">/breɪk ði aɪs/</p>
            </div>
            <div className="relative mt-3 rounded-xl border-2 border-slate-900 bg-[#fbfbf9] p-3.5 shadow-[2px_2px_0px_0px_#000]">
              <p className="font-black text-slate-900 text-sm">phá vỡ sự ngại ngùng, làm quen</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">He told a joke to break the ice.</p>
            </div>
          </Card>
          <div className="relative -mt-4 ml-auto mr-4 max-w-sm rotate-[-2deg] rounded-xl border-3 border-slate-900 bg-[#fdc800] p-4 text-slate-900 shadow-[6px_6px_0px_0px_#000]">
            <p className="font-black text-sm flex items-center gap-1.5">
              <Zap size={16} /> Kiểm tra SRS định kỳ
            </p>
            <p className="mt-1 text-xs font-semibold">Tự động gợi ý từ vựng sắp quên giúp tiết kiệm 70% thời gian ôn tập.</p>
          </div>
        </div>
      </section>

      {/* Proof Points */}
      <section className="mx-auto grid max-w-7xl gap-4 pb-14 md:grid-cols-3">
        {proofPoints.map((item) => (
          <Card key={item.label} className="bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] p-5">
            <p className="text-3xl font-black text-purple-700">{item.value}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-800">{item.label}</p>
            <CardDescription className="mt-1 text-xs font-semibold text-slate-600">{item.text}</CardDescription>
          </Card>
        ))}
      </section>

      {/* AI Tutor Feature Showcase Section */}
      <section id="ai-tutor" className="mx-auto max-w-7xl scroll-mt-24 py-12">
        <div className="neo-card p-6 sm:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#000] bg-white rounded-2xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] items-center">
            <div className="space-y-4">
              <Badge className="bg-purple-100 text-purple-900 border-2 border-slate-900 font-black px-3 py-1">
                🤖 Trợ lý AI Thông Minh
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                Hỏi đáp & Tra cứu tức thì với Gia sư AI 24/7
              </h2>
              <p className="text-slate-600 text-sm sm:text-base font-semibold leading-relaxed">
                Nhấn phím tắt <kbd className="px-2 py-1 bg-slate-900 text-white rounded font-mono text-xs font-bold shadow-[2px_2px_0px_0px_#000]">Ctrl + K</kbd> ở bất kỳ đâu trên ứng dụng để tra từ, giải thích cấu trúc câu hoặc yêu cầu tạo bài tập thực hành ngay lập tức.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Button
                  onClick={() => { handleButtonClick(); openAiModal() }}
                  className="h-11 px-5 font-black bg-[#432dd7] text-white hover:bg-purple-800 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000]"
                >
                  <Bot size={18} />
                  <span>Trải nghiệm Gia sư AI ngay</span>
                </Button>
              </div>
            </div>

            {/* Simulated AI Chat Box Preview */}
            <div className="border-3 border-slate-900 rounded-xl bg-[#fbfbf9] p-4 shadow-[5px_5px_0px_0px_#000] space-y-3">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#432dd7] border-2 border-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                    <Bot size={14} />
                  </div>
                  <span className="font-black text-xs text-slate-900">AI Tutor Preview</span>
                </div>
                <span className="text-[10px] font-black uppercase bg-amber-200 border border-slate-900 px-2 py-0.5 rounded">Ctrl + K</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-end">
                  <div className="bg-[#fdc800] text-slate-900 border-2 border-slate-900 px-3 py-2 rounded-lg font-bold max-w-[85%] shadow-[2px_2px_0px_0px_#000]">
                    Phân biệt sự khác nhau giữa Affect và Effect?
                  </div>
                </div>

                <div className="flex justify-start items-start gap-2">
                  <div className="w-6 h-6 bg-[#432dd7] text-white border border-slate-900 rounded flex items-center justify-center shrink-0">
                    <Bot size={12} />
                  </div>
                  <div className="bg-white text-slate-900 border-2 border-slate-900 p-3 rounded-lg font-semibold max-w-[85%] shadow-[2px_2px_0px_0px_#000] space-y-1">
                    <p className="font-bold text-purple-700">• Affect (Động từ): Tác động/ảnh hưởng đến ai/cái gì.</p>
                    <p className="text-slate-600">VD: Cold weather affects my health.</p>
                    <p className="font-bold text-purple-700 mt-1">• Effect (Danh từ): Kết quả/sự ảnh hưởng.</p>
                    <p className="text-slate-600">VD: The law has a positive effect.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Learning Pillars Section */}
      <section id="pillars" className="mx-auto max-w-7xl scroll-mt-24 py-12 space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge className="bg-amber-100 text-amber-900 border-2 border-slate-900 font-black px-3 py-1">
            ✨ Hệ Sinh Thái Học Tập Toàn Diện
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900">
            Tất cả công cụ bạn cần để làm chủ Tiếng Anh
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 pt-4">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="p-5 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] bg-white hover:translate-x-0.5 hover:translate-y-0.5 transition-transform">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-900 ${pillar.color} shadow-[2px_2px_0px_0px_#000] mb-3`}>
                <pillar.icon size={22} />
              </div>
              <CardTitle className="text-base font-black text-slate-900">{pillar.title}</CardTitle>
              <CardDescription className="mt-2 text-xs font-semibold text-slate-600 leading-relaxed">
                {pillar.text}
              </CardDescription>
            </Card>
          ))}
        </div>
      </section>

      {/* MemoryLang Pro Membership Banner */}
      <section className="mx-auto max-w-7xl py-12">
        <div className="neo-card p-6 sm:p-10 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#000] bg-[#fdc800] rounded-2xl relative overflow-hidden">
          <div className="max-w-2xl space-y-4 relative z-10">
            <Badge className="bg-slate-900 text-white font-black px-3 py-1 border-0">
              👑 Nâng cấp Gói Pro
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
              Học không giới hạn cùng MemoryLang Pro
            </h2>
            <p className="text-slate-900 text-sm sm:text-base font-bold">
              Mở khóa toàn bộ từ vựng, bộ thẻ ghi nhớ, toàn bộ bài học Listening, Grammar và lượt hỏi đáp Gia sư AI không giới hạn. Thanh toán VietQR xác nhận tự động trong 5 giây!
            </p>
            <div className="pt-2">
              <Button asChild onClick={handleButtonClick} className="h-12 px-6 font-black text-base bg-slate-900 text-white hover:bg-slate-800 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#000]">
                <Link to="/app/upgrade">
                  Khám phá Bảng Giá Pro <Crown size={18} className="ml-1 text-amber-400 fill-amber-400" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t-3 border-slate-900 py-8 md:flex-row md:items-center md:justify-between">
        <BrandLogo variant="compact" size="md" className="h-10" />
        <p className="max-w-xl text-xs font-bold text-slate-600">
          MemoryLang — Nền tảng học từ vựng và luyện tiếng Anh thông minh với thuật toán SRS & Gia sư AI 24/7.
        </p>
      </footer>
    </main>
  )
}
