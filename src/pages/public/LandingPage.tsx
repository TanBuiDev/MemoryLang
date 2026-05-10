import { ArrowRight, Brain, ClipboardCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/i18n'

export function LandingPage() {
  const { t } = useI18n()
  const features = [
    { icon: Brain, title: t('landing.featureFlashcardsTitle'), text: t('landing.featureFlashcardsText') },
    { icon: Sparkles, title: t('landing.featureHelperTitle'), text: t('landing.featureHelperText') },
    { icon: ClipboardCheck, title: t('landing.featureChecksTitle'), text: t('landing.featureChecksText') },
  ]

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="text-2xl font-black">MemoryLang</Link>
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/login">{t('landing.login')}</Link></Button>
          <Button asChild><Link to="/register">{t('landing.getStarted')}</Link></Button>
        </div>
      </nav>
      <section className="mx-auto grid max-w-7xl items-center gap-8 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Badge>{t('landing.badge')}</Badge>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none md:text-7xl">
            {t('landing.title')}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold text-muted-foreground">
            {t('landing.description')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild><Link to="/register">{t('landing.startLearning')} <ArrowRight size={18} /></Link></Button>
            <Button asChild variant="secondary"><Link to="/app/dashboard">{t('landing.openDemo')}</Link></Button>
          </div>
        </div>
        <Card className="rotate-1 p-6">
          <p className="text-sm font-black uppercase text-muted-foreground">{t('landing.todayCard')}</p>
          <div className="mt-6 rounded-md border-2 border-border bg-primary p-6">
            <p className="text-5xl font-black">break the ice</p>
            <p className="mt-3 font-mono text-xl">/breɪk ði aɪs/</p>
          </div>
          <div className="mt-4 rounded-md border-2 border-border bg-card p-4">
            <p className="font-black">phá vỡ sự ngại ngùng</p>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">He told a joke to break the ice.</p>
          </div>
        </Card>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <feature.icon />
            <CardTitle className="mt-3">{feature.title}</CardTitle>
            <CardDescription className="mt-2">{feature.text}</CardDescription>
          </Card>
        ))}
      </section>
    </main>
  )
}
