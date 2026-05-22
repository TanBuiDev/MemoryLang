import {
  ArrowRight,
  BarChart3,
  BookMarked,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  LibraryBig,
  Repeat2,
  Search,
  Sparkles,
  Target,
  Volume2,
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

export function LandingPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = Boolean(user)
  const features = [
    { icon: Brain, title: t('landing.featureFlashcardsTitle'), text: t('landing.featureFlashcardsText') },
    { icon: Sparkles, title: t('landing.featureHelperTitle'), text: t('landing.featureHelperText') },
    { icon: ClipboardCheck, title: t('landing.featureChecksTitle'), text: t('landing.featureChecksText') },
  ]
  const proofPoints = [
    { value: 'SRS', label: t('landing.statReview'), text: t('landing.statReviewText') },
    { value: '4+', label: t('landing.statModes'), text: t('landing.statModesText') },
    { value: '100%', label: t('landing.statControl'), text: t('landing.statControlText') },
  ]
  const workflow = [
    { icon: Search, title: t('landing.workflowCaptureTitle'), text: t('landing.workflowCaptureText') },
    { icon: LibraryBig, title: t('landing.workflowOrganizeTitle'), text: t('landing.workflowOrganizeText') },
    { icon: Volume2, title: t('landing.workflowPracticeTitle'), text: t('landing.workflowPracticeText') },
    { icon: Repeat2, title: t('landing.workflowImproveTitle'), text: t('landing.workflowImproveText') },
  ]
  const previews = [
    { icon: Target, title: t('landing.previewDashboardTitle'), text: t('landing.previewDashboardText'), href: '/app/dashboard' },
    { icon: BookMarked, title: t('landing.previewCardsTitle'), text: t('landing.previewCardsText'), href: '/app/study' },
    { icon: CheckCircle2, title: t('landing.previewQuizTitle'), text: t('landing.previewQuizText'), href: '/app/quiz' },
  ]
  const modes = [
    t('landing.modeLibrary'),
    t('landing.modeDecks'),
    t('landing.modeReview'),
    t('landing.modeStats'),
  ]

  return (
    <main className="brand-grid-bg min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link to="/" className="rounded-md border-2 border-transparent p-1 transition hover:border-border hover:bg-card">
          <BrandLogo variant="compact" size="lg" className="h-12" />
        </Link>
        <div className="hidden items-center gap-2 rounded-md border-2 border-border bg-card px-2 py-1 shadow-[3px_3px_0_var(--border)] md:flex">
          <a className="rounded px-3 py-2 text-sm font-black hover:bg-muted" href="#features">{t('landing.navFeatures')}</a>
          <a className="rounded px-3 py-2 text-sm font-black hover:bg-muted" href="#workflow">{t('landing.navWorkflow')}</a>
          <a className="rounded px-3 py-2 text-sm font-black hover:bg-muted" href="#preview">{t('landing.navPreview')}</a>
        </div>
        <div className="flex shrink-0 gap-2">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost"><Link to="/app/dashboard">{t('landing.goDashboard')}</Link></Button>
              <Button onClick={() => void authService.signOut()}>{t('actions.logout')}</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/login">{t('landing.login')}</Link></Button>
              <Button asChild><Link to="/login">{t('landing.getStarted')}</Link></Button>
            </>
          )}
        </div>
      </nav>
      <section className="relative mx-auto grid max-w-7xl items-center gap-8 py-12 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <img
          src={mascotArt}
          alt=""
          aria-hidden="true"
          data-testid="homepage-mascot-art"
          className="pointer-events-none absolute -left-28 top-16 z-0 hidden w-[32rem] max-w-none rotate-[-4deg] opacity-95 drop-shadow-[10px_12px_0_rgba(28,41,60,0.18)] lg:block xl:-left-36 xl:top-12 xl:w-[38rem]"
        />
        <div className="relative z-10 lg:pt-[30rem] xl:pt-[34rem]">
          <Badge>{t('landing.badge')}</Badge>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none md:text-7xl">
            {t('landing.title')}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold text-muted-foreground">
            {t('landing.description')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <>
                <Button asChild><Link to="/app/dashboard">{t('landing.goDashboard')} <ArrowRight size={18} /></Link></Button>
                <Button asChild variant="secondary"><Link to="/app/study">{t('landing.continueStudy')}</Link></Button>
              </>
            ) : (
              <>
                <Button asChild><Link to="/login">{t('landing.startLearning')} <ArrowRight size={18} /></Link></Button>
                <Button asChild variant="secondary"><Link to="/app/dashboard">{t('landing.openDemo')}</Link></Button>
              </>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -right-10 -top-10 hidden h-36 w-36 rounded-full border-2 border-border bg-primary shadow-[6px_6px_0_var(--border)] md:block" />
          <Card className="relative z-10 rotate-1 overflow-hidden p-6">
            <div className="absolute -right-8 -top-8 opacity-10">
              <BrandMark size="xl" label="" className="h-40 w-40" />
            </div>
            <div className="relative flex items-center justify-between gap-4">
              <p className="text-sm font-black uppercase text-muted-foreground">{t('landing.todayCard')}</p>
              <BrandMark size="sm" />
            </div>
            <div className="relative mt-6 rounded-md border-2 border-border bg-primary p-6 shadow-[4px_4px_0_var(--border)]">
              <p className="text-5xl font-black">break the ice</p>
              <p className="mt-3 font-mono text-xl">/breɪk ði aɪs/</p>
            </div>
            <div className="relative mt-4 rounded-md border-2 border-border bg-card p-4">
              <p className="font-black">phá vỡ sự ngại ngùng</p>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">He told a joke to break the ice.</p>
            </div>
          </Card>
          <div className="relative -mt-4 ml-auto mr-4 max-w-sm rotate-[-2deg] rounded-md border-2 border-border bg-secondary p-4 text-secondary-foreground shadow-[5px_5px_0_var(--border)]">
            <p className="font-black">{t('landing.featureChecksTitle')}</p>
            <p className="mt-1 text-sm font-semibold opacity-90">{t('landing.featureChecksText')}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 pb-14 md:grid-cols-3">
        {proofPoints.map((item) => (
          <Card key={item.label} className="bg-card/95">
            <p className="text-4xl font-black text-secondary">{item.value}</p>
            <p className="mt-2 text-sm font-black uppercase">{item.label}</p>
            <CardDescription className="mt-2">{item.text}</CardDescription>
          </Card>
        ))}
      </section>

      <section id="features" className="mx-auto grid max-w-7xl gap-4 scroll-mt-24 py-14 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-md border-2 border-border bg-primary shadow-[3px_3px_0_var(--border)]">
              <feature.icon size={24} />
            </div>
            <CardTitle className="mt-3">{feature.title}</CardTitle>
            <CardDescription className="mt-2">{feature.text}</CardDescription>
          </Card>
        ))}
      </section>

      <section id="workflow" className="mx-auto max-w-7xl scroll-mt-24 py-14">
        <div className="max-w-3xl">
          <Badge>{t('landing.workflowEyebrow')}</Badge>
          <h2 className="mt-5 text-4xl font-black leading-tight md:text-6xl">{t('landing.workflowTitle')}</h2>
          <p className="mt-4 text-lg font-semibold text-muted-foreground">{t('landing.workflowDescription')}</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {workflow.map((step, index) => (
            <Card key={step.title} className={index % 2 ? 'lg:mt-10' : ''}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-3xl font-black text-secondary">0{index + 1}</span>
                <step.icon size={28} />
              </div>
              <CardTitle className="mt-5">{step.title}</CardTitle>
              <CardDescription className="mt-2">{step.text}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <section id="preview" className="mx-auto grid max-w-7xl scroll-mt-24 gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Badge>{t('landing.previewEyebrow')}</Badge>
          <h2 className="mt-5 text-4xl font-black leading-tight md:text-6xl">{t('landing.previewTitle')}</h2>
          <p className="mt-4 text-lg font-semibold text-muted-foreground">{t('landing.previewDescription')}</p>
          <div className="mt-6 grid gap-3">
            {previews.map((item) => (
              <Link key={item.title} to={item.href} className="brand-surface block p-4 transition hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <item.icon className="mt-1 shrink-0 text-secondary" size={22} />
                  <div>
                    <p className="font-black">{item.title}</p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <Card className="relative overflow-hidden p-0">
          <div className="border-b-2 border-border bg-primary px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black">{t('dashboard.dailyGoal')}</p>
              <BarChart3 size={24} />
            </div>
          </div>
          <div className="grid gap-4 p-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ['453', t('dashboard.totalVocabulary')],
                ['18', t('dashboard.reviewDue')],
                ['87%', t('statistics.accuracy')],
                ['12', t('statistics.days')],
              ].map(([value, label]) => (
                <div key={label} className="rounded-md border-2 border-border bg-muted p-3">
                  <p className="text-2xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-black uppercase text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border-2 border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between font-black">
                <span>Business phrases</span>
                <span className="text-secondary">64%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full border-2 border-border bg-card">
                <div className="h-full w-2/3 border-r-2 border-border bg-success" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border-2 border-border bg-primary p-4 shadow-[3px_3px_0_var(--border)]">
                <p className="text-2xl font-black">weather condition</p>
                <p className="mt-2 font-mono font-black">/ˈweðər kənˈdɪʃən/</p>
              </div>
              <div className="rounded-md border-2 border-border bg-secondary p-4 text-secondary-foreground shadow-[3px_3px_0_var(--border)]">
                <p className="text-sm font-black uppercase opacity-80">{t('quiz.trueFalse')}</p>
                <p className="mt-2 text-2xl font-black">Correct?</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl py-14">
        <div className="grid gap-6 rounded-md border-2 border-border bg-card p-6 shadow-[6px_6px_0_var(--border)] lg:grid-cols-[0.8fr_1.2fr] lg:p-8">
          <div>
            <Badge>{t('landing.modesEyebrow')}</Badge>
            <h2 className="mt-5 text-4xl font-black leading-tight md:text-5xl">{t('landing.modesTitle')}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modes.map((mode) => (
              <div key={mode} className="flex items-center gap-3 rounded-md border-2 border-border bg-background p-4 font-black">
                <CheckCircle2 className="shrink-0 text-secondary" />
                {mode}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl py-14">
        <div className="relative overflow-hidden rounded-md border-2 border-border bg-secondary p-8 text-secondary-foreground shadow-[6px_6px_0_var(--border)]">
          <img
            src={mascotArt}
            alt=""
            aria-hidden="true"
            data-testid="homepage-mascot-art"
            className="pointer-events-none absolute -bottom-32 right-8 z-0 hidden w-[28rem] max-w-none opacity-[0.32] drop-shadow-[8px_10px_0_rgba(28,41,60,0.18)] lg:block"
          />
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-4xl font-black leading-tight md:text-6xl">{t('landing.finalTitle')}</h2>
            <p className="mt-4 text-lg font-semibold opacity-90">{t('landing.finalDescription')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <>
                  <Button asChild><Link to="/app/dashboard">{t('landing.goDashboard')}</Link></Button>
                  <Button asChild variant="ghost"><Link to="/app/study">{t('landing.continueStudy')}</Link></Button>
                </>
              ) : (
                <>
                  <Button asChild><Link to="/login">{t('landing.getStarted')}</Link></Button>
                  <Button asChild variant="ghost"><Link to="/app/dashboard">{t('landing.openDemo')}</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t-2 border-border py-8 md:flex-row md:items-center md:justify-between">
        <BrandLogo variant="compact" size="md" className="h-10" />
        <p className="max-w-xl text-sm font-semibold text-muted-foreground">{t('landing.footerTagline')}</p>
      </footer>
    </main>
  )
}
