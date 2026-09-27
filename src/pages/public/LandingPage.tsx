import { useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Brain,
  Sparkles,
  Bot,
  Headphones,
  ScrollText,
  Crown,
  Zap,
  Swords,
  ShieldAlert,
  Heart,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import mascotArt from '@/assets/brand/memorylang-mascot.svg'
import { BrandLogo, BrandMark } from '@/components/common/BrandLogo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import {
  BOSS_BATTLE_THEMES,
  FALLBACK_BOSS,
  FALLBACK_BOSS_BACKGROUND,
} from '@/features/games/mission/bossBattleThemes'
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
  const [previewThemeIndex, setPreviewThemeIndex] = useState(0)

  const currentTheme =
    BOSS_BATTLE_THEMES[previewThemeIndex] ?? BOSS_BATTLE_THEMES[0]

  const handleButtonClick = () => {
    soundEffects.play('cardClick')
  }

  const scrollToSection = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault()
    soundEffects.play('cardClick')
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
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
      icon: Swords,
      title: 'Chiến Dịch & Đấu Boss RPG',
      text: 'Chinh phục 7 chặng thử thách từ vựng toàn diện, nạp đầy thanh nộ và đối đầu Boss Guardian với kỹ năng kết liễu hoành tráng.',
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
          <button onClick={(e) => scrollToSection('features', e)} className="rounded px-3 py-1.5 hover:bg-amber-100 transition-colors text-slate-900 font-black cursor-pointer">Tính năng</button>
          <button onClick={(e) => scrollToSection('mission-game', e)} className="rounded px-3 py-1.5 hover:bg-rose-100 transition-colors text-slate-900 font-black cursor-pointer">Đấu Boss RPG</button>
          <button onClick={(e) => scrollToSection('ai-tutor', e)} className="rounded px-3 py-1.5 hover:bg-amber-100 transition-colors text-slate-900 font-black cursor-pointer">Gia sư AI</button>
          <button onClick={(e) => scrollToSection('pillars', e)} className="rounded px-3 py-1.5 hover:bg-amber-100 transition-colors text-slate-900 font-black cursor-pointer">Hệ sinh thái</button>
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
                  <Link to="/app/games">
                    <Swords size={18} className="mr-1.5" />
                    <span>Chiến Dịch Đấu Boss</span>
                  </Link>
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
                <Button
                  onClick={(e) => scrollToSection('mission-game', e)}
                  className="h-12 px-5 font-black text-base bg-[#fdc800] text-slate-900 hover:bg-amber-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#000]"
                >
                  <Swords size={18} className="mr-1.5" />
                  <span>Khám Phá Đấu Boss</span>
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
      <section id="features" className="mx-auto grid max-w-7xl gap-4 pb-14 md:grid-cols-3 scroll-mt-24">
        {proofPoints.map((item) => (
          <Card key={item.label} className="bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] p-5">
            <p className="text-3xl font-black text-purple-700">{item.value}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-800">{item.label}</p>
            <CardDescription className="mt-1 text-xs font-semibold text-slate-600">{item.text}</CardDescription>
          </Card>
        ))}
      </section>

      {/* Mission Game & Boss Battle Showcase Section */}
      <section id="mission-game" className="mx-auto max-w-7xl scroll-mt-24 py-12">
        <div className="neo-card p-6 sm:p-10 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#000] bg-white rounded-2xl space-y-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge className="bg-rose-100 text-rose-900 border-2 border-slate-900 font-black px-3.5 py-1 text-xs shadow-[2px_2px_0px_#000]">
              Chế Độ Chơi Độc Quyền — Gamified Learning
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
              Học Từ Vựng Qua Chiến Dịch & Đấu Boss RPG
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-semibold leading-relaxed">
              Mỗi bộ từ vựng là một hành trình phiêu lưu. Tích lũy năng lượng qua các chặng câu hỏi để tung đòn kết liễu hoành tráng, giải phóng 4 vùng đất khỏi các linh thú Boss Guardian.
            </p>
          </div>

          {/* 4 Lands Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {BOSS_BATTLE_THEMES.map((theme, index) => (
              <button
                key={theme.id}
                onClick={() => {
                  soundEffects.play('cardClick')
                  setPreviewThemeIndex(index)
                }}
                className={
                  'inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 px-4 py-2 font-black text-xs transition-all cursor-pointer ' +
                  (previewThemeIndex === index
                    ? 'bg-[#432dd7] text-white shadow-[3px_3px_0px_#000] -translate-y-0.5'
                    : 'bg-slate-100 text-slate-800 hover:bg-amber-100 shadow-[2px_2px_0px_#000]')
                }
              >
                <span>{theme.name}</span>
                <span className="rounded bg-slate-900/15 px-1.5 py-0.5 text-[10px] uppercase">
                  {theme.boss.name}
                </span>
              </button>
            ))}
          </div>

          {/* Showcase Content: Grid 2 Columns */}
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] items-center pt-2">
            {/* Left: Key Gameplay Highlights */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3.5 rounded-xl border-2 border-slate-900 bg-amber-50 p-3.5 shadow-[3px_3px_0px_#000]">
                  <div className="rounded-lg border-2 border-slate-900 bg-amber-300 p-2 text-slate-900 font-black shrink-0">
                    <Swords size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Chinh phục 7 chặng thử thách toàn diện</h3>
                    <p className="text-slate-600 text-xs font-semibold mt-0.5">
                      Làm quen, Nối từ, Nghe chọn, Nghe viết, Điền ngữ cảnh, Nhớ từ và màn Đấu Boss cuối chặng.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-xl border-2 border-slate-900 bg-purple-50 p-3.5 shadow-[3px_3px_0px_#000]">
                  <div className="rounded-lg border-2 border-slate-900 bg-purple-300 p-2 text-purple-950 font-black shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Kỹ năng kết liễu (Finisher Skill)</h3>
                    <p className="text-slate-600 text-xs font-semibold mt-0.5">
                      Trả lời chính xác liên tục để nạp đầy thanh nộ và tung chiêu dứt điểm Boss trong một đòn ngoạn mục.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-xl border-2 border-slate-900 bg-emerald-50 p-3.5 shadow-[3px_3px_0px_#000]">
                  <div className="rounded-lg border-2 border-slate-900 bg-emerald-300 p-2 text-emerald-950 font-black shrink-0">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Thuật toán ghi nhớ ngắt quãng SRS 2.0</h3>
                    <p className="text-slate-600 text-xs font-semibold mt-0.5">
                      Các từ vựng làm sai trong trận đấu Boss sẽ được tự động xếp vào hàng đợi ôn tập thông minh.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button asChild onClick={handleButtonClick} className="h-12 px-6 font-black text-base shadow-[4px_4px_0px_#000] bg-[#432dd7] text-white hover:bg-purple-800">
                  <Link to={isAuthenticated ? '/app/games' : '/login'}>
                    <Swords size={18} className="mr-1.5" />
                    <span>{isAuthenticated ? 'Vào Chiến Dịch Ngay' : 'Đăng Ký Tham Gia Chiến Dịch'}</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right: Simulated Boss Battle Console Mockup */}
            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border-4 border-slate-900 shadow-[8px_8px_0px_#000] bg-slate-950 flex flex-col min-h-[460px]">
              {/* Background picture */}
              <picture className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
                <source media="(max-width: 767px)" srcSet={currentTheme.background.mobile} />
                <img
                  key={`bg-${currentTheme.id}`}
                  src={currentTheme.background.desktop}
                  alt={currentTheme.name}
                  draggable={false}
                  className="h-full w-full object-cover object-center"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_BOSS_BACKGROUND
                  }}
                />
              </picture>

              {/* Top HUD */}
              <div className="relative z-20 grid grid-cols-2 bg-slate-950/85 text-white backdrop-blur-sm border-b-2 border-slate-900/40 p-2.5 gap-2.5">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black mb-1">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Heart className="h-3.5 w-3.5 fill-current" /> Bạn
                    </span>
                    <span>5/5 HP</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full border-2 border-white/90 bg-slate-900 overflow-hidden">
                    <div className="h-full bg-emerald-400 w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-black mb-1">
                    <span className="flex items-center gap-1 text-rose-400 truncate">
                      <ShieldAlert className="h-3.5 w-3.5" /> {currentTheme.boss.name}
                    </span>
                    <span>3/5 HP</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full border-2 border-white/90 bg-slate-900 overflow-hidden">
                    <div className="h-full bg-rose-500 w-[60%]" />
                  </div>
                </div>
              </div>

              {/* Center Boss Stage */}
              <div className="relative z-10 flex-1 flex items-center justify-center py-4 overflow-hidden min-h-[170px]">
                <img
                  key={`boss-${currentTheme.id}`}
                  src={currentTheme.boss.image}
                  alt={currentTheme.boss.name}
                  draggable={false}
                  className="h-[185px] w-[185px] sm:h-[220px] sm:w-[220px] object-contain drop-shadow-2xl animate-bounce select-none"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_BOSS.states.idle
                  }}
                />
                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-[#fdc800] px-2.5 py-1 font-black text-slate-900 shadow-[3px_3px_0px_#000] text-[10px] uppercase">
                  <Sparkles size={13} /> Finisher Ready
                </div>
              </div>

              {/* Bottom Console Deck */}
              <div className="relative z-20 shrink-0 p-3 space-y-2">
                {/* Finisher Bar */}
                <div className="rounded-xl border-2 border-slate-900 bg-white/40 backdrop-blur-md shadow-[2px_2px_0px_#000] p-1.5">
                  <div className="flex items-center justify-between font-black uppercase text-slate-900 text-[10px] mb-0.5">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-indigo-700 fill-indigo-500" />
                      <span>Kỹ năng kết liễu</span>
                    </span>
                    <span>Sẵn sàng! (100%)</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full border-2 border-slate-900 bg-slate-900/15 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 w-full" />
                  </div>
                </div>

                {/* Simulated Question Card */}
                <div className="rounded-xl border-3 border-slate-900 bg-white p-3 shadow-[4px_4px_0px_#000] space-y-2">
                  <div className="text-center">
                    <p className="font-black text-slate-900 text-sm">thung lũng / đồng cỏ xanh</p>
                    <p className="text-[11px] font-mono text-slate-500">Gõ từ tiếng Anh tương ứng</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border-2 border-slate-900 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800">
                      meadow
                    </div>
                    <div className="rounded-lg border-2 border-slate-900 bg-[#fdc800] px-3 py-1.5 font-black text-xs text-slate-900 shadow-[2px_2px_0px_#000]">
                      Tấn công
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
