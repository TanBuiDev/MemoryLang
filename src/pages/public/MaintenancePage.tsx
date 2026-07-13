import { Construction, RefreshCw } from 'lucide-react'
import { BrandMark } from '@/components/common/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/i18n'

interface MaintenancePageProps {
  message?: string
  estimatedEnd?: string | null
}

export function MaintenancePage({ message, estimatedEnd }: MaintenancePageProps) {
  const { t } = useI18n()

  const formattedEnd = estimatedEnd
    ? new Date(estimatedEnd).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background grid line pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Floating decorative shapes */}
      <div className="absolute top-[10%] left-[8%] h-16 w-16 rounded-md border-4 border-border bg-primary/30 rotate-12 shadow-[4px_4px_0px_#000] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] h-12 w-12 rounded-full border-4 border-border bg-secondary/20 shadow-[3px_3px_0px_#000] animate-pulse pointer-events-none" />
      <div className="absolute top-[60%] left-[5%] h-10 w-10 rounded-full border-3 border-border bg-[#ffe05c]/40 shadow-[2px_2px_0px_#000] animate-bounce pointer-events-none" />

      <Card className="w-full max-w-lg border-4 border-border bg-card p-8 shadow-[8px_8px_0px_#000] relative z-10 flex flex-col items-center text-center">
        {/* Construction icon */}
        <div className="h-20 w-20 rounded-full border-4 border-border bg-[#ffe05c] flex items-center justify-center shadow-[4px_4px_0px_#000] mb-6 animate-bounce">
          <Construction size={40} className="text-foreground stroke-[2.5]" />
        </div>

        {/* Brand mark */}
        <BrandMark size="md" className="mb-4 opacity-60" />

        {/* Title */}
        <CardTitle className="text-2xl font-black mb-3 text-foreground tracking-tight">
          {t('maintenance.title')}
        </CardTitle>

        {/* Custom message or default */}
        <p className="text-sm font-semibold text-muted-foreground mb-4 max-w-sm leading-relaxed">
          {message || t('maintenance.defaultMessage')}
        </p>

        {/* Estimated end time */}
        {formattedEnd && (
          <div className="mb-4 p-3 rounded-md border-2 border-border bg-primary/10 text-sm font-bold text-foreground">
            <span className="text-muted-foreground">{t('maintenance.estimatedEnd')}</span>{' '}
            <span className="font-black">{formattedEnd}</span>
          </div>
        )}

        {/* Apology */}
        <p className="text-xs font-semibold text-muted-foreground mb-6">
          {t('maintenance.apology')}
        </p>

        {/* Progress bar animation */}
        <div className="w-full max-w-xs h-2 rounded-full border-2 border-border bg-muted overflow-hidden mb-6">
          <div className="h-full bg-primary rounded-full animate-[maintenance-progress_2s_ease-in-out_infinite]" />
        </div>

        {/* Refresh button */}
        <Button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 min-h-11 font-black shadow-[3px_3px_0px_#000] bg-primary hover:bg-[#ffe05c] mb-4"
        >
          <RefreshCw size={16} className="stroke-[2.5]" />
          <span>{t('maintenance.refresh')}</span>
        </Button>

        {/* Subtle admin login link */}
        <a
          href="/login"
          className="text-xs font-bold text-muted-foreground/30 hover:text-foreground transition hover:underline"
        >
          {t('maintenance.adminLogin')}
        </a>
      </Card>
    </div>
  )
}
