import { useI18n } from '@/i18n'

export function AppLoading() {
  const { t } = useI18n()

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <section className="neo-card w-full max-w-md p-6">
        <p className="text-xs font-black uppercase text-secondary">{t('loading.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-black">{t('loading.title')}</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          {t('loading.description')}
        </p>
        <div className="mt-6 h-4 overflow-hidden rounded-full border-2 border-border bg-muted">
          <div className="h-full w-1/2 animate-pulse bg-primary" />
        </div>
      </section>
    </main>
  )
}
