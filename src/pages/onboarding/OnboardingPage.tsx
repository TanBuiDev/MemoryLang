import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo, BrandMark } from '@/components/common/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label, Select } from '@/components/ui/input'
import { createTranslator, getDefaultUiLanguage } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import type { LanguageCode } from '@/types/language.types'
import { goals, languageOptions, levels } from '@/utils/languageCodes'

export function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const setProfile = useAuthStore((state) => state.setProfile)
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode>('vi')
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en')
  const [level, setLevel] = useState(levels[0])
  const [goal, setGoal] = useState(goals[0])
  const [dailyGoal, setDailyGoal] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const t = createTranslator(getDefaultUiLanguage(nativeLanguage))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      if (isSupabaseConfigured) {
        if (!user) {
          navigate('/login')
          return
        }

        const profile = await authService.completeOnboarding({
          userId: user.id,
          nativeLanguage,
          targetLanguage,
          level,
          goal,
          dailyGoal,
        })
        setProfile(profile)
      }

      navigate('/app/dashboard')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not finish onboarding.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="brand-grid-bg grid min-h-screen place-items-center bg-background px-4 py-8">
      <Card className="relative w-full max-w-2xl overflow-hidden p-6">
        <div className="absolute -right-12 -top-12 opacity-10">
          <BrandMark size="xl" label="" className="h-44 w-44" />
        </div>
        <BrandLogo variant="compact" size="lg" className="relative mb-6 h-12" />
        <CardTitle>{t('onboarding.title')}</CardTitle>
        <CardDescription className="mt-2">{t('onboarding.description')}</CardDescription>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <div><Label>{t('onboarding.nativeLanguage')}</Label><Select value={nativeLanguage} onChange={(event) => setNativeLanguage(event.target.value as LanguageCode)}>{languageOptions.map((item) => <option key={item.code} value={item.code}>{t(`language.${item.code}`)}</option>)}</Select></div>
          <div><Label>{t('onboarding.targetLanguage')}</Label><Select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value as LanguageCode)}>{languageOptions.filter((item) => item.code !== 'vi').map((item) => <option key={item.code} value={item.code}>{t(`language.${item.code}`)}</option>)}</Select></div>
          <div><Label>{t('onboarding.level')}</Label><Select value={level} onChange={(event) => setLevel(event.target.value)}>{levels.map((item) => <option key={item}>{t(`level.${item}`)}</option>)}</Select></div>
          <div><Label>{t('onboarding.goal')}</Label><Select value={goal} onChange={(event) => setGoal(event.target.value)}>{goals.map((item) => <option key={item}>{t(`goal.${item}`)}</option>)}</Select></div>
          <div><Label>{t('onboarding.dailyGoal')}</Label><Select value={dailyGoal} onChange={(event) => setDailyGoal(Number(event.target.value))}><option value={5}>{t('settings.wordsPerDay', { count: 5 })}</option><option value={10}>{t('settings.wordsPerDay', { count: 10 })}</option><option value={20}>{t('settings.wordsPerDay', { count: 20 })}</option></Select></div>
          <div className="flex items-end"><Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? t('actions.finishing') : t('actions.finishOnboarding')}</Button></div>
          {errorMessage ? <p className="md:col-span-2 rounded-md border-2 border-danger bg-red-50 p-3 text-sm font-black text-danger">{errorMessage}</p> : null}
        </form>
      </Card>
    </main>
  )
}
