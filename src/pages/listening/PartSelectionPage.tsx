import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/i18n'
import { demoParts } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContentLockState } from '@/components/subscription/ContentLockState'
import { cn } from '@/utils/cn'
import type { ListeningMode } from '@/types/listening.types'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { listeningService } from '@/services/supabase/listening.service'
import { canAccessContent } from '@/utils/contentAccess'

const partLabels: Record<number, string> = {
  1: 'listening.part1',
  2: 'listening.part2',
  3: 'listening.part3',
  4: 'listening.part4',
}

export function PartSelectionPage() {
  const { testId } = useParams<{ testId: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { mode, setPart, setMode } = useListeningStore()
  const user = useAuthStore((s) => s.user)
  const isPro = useSubscriptionStore((s) => s.isPro)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const isDemoTest = testId === 'ets2026-test1'

  const { data: topicAccess, isLoading: isTopicLoading } = useQuery({
    queryKey: ['listening-test-topic-access', testId, user?.id],
    queryFn: () => listeningService.getTopicByTestId(testId!),
    enabled: shouldUseRemoteData && Boolean(testId) && !isDemoTest,
  })

  const hasAccess = !shouldUseRemoteData || isDemoTest || canAccessContent(topicAccess?.access_tier, isPro)

  const { data: parts = [], isLoading: isPartsLoading } = useQuery({
    queryKey: ['listening-parts', testId, user?.id],
    queryFn: async () => {
      if (!shouldUseRemoteData || !testId) return demoParts
      if (isDemoTest) return demoParts

      try {
        const list = await listeningService.listParts(testId)
        return list.length > 0 ? list : demoParts
      } catch (err) {
        console.error('Error fetching listening parts from DB:', err)
        return demoParts
      }
    },
    enabled: Boolean(testId) && (!shouldUseRemoteData || isDemoTest || Boolean(topicAccess && hasAccess))
  })

  const handleStart = (partId: string) => {
    setPart(partId)
    navigate(`/app/listening/session/${partId}/${mode}`)
  }

  if (isTopicLoading || isPartsLoading) {
    return (
      <div>
        <h1 className="text-2xl font-black mb-4">{t('listening.selectPart')}</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-muted rounded-lg" />
          <div className="h-24 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (shouldUseRemoteData && !isDemoTest && !topicAccess) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-black">Không tìm thấy nội dung</p>
        <Button onClick={() => navigate('/app/listening')} className="mt-4">{t('listening.backToList')}</Button>
      </div>
    )
  }

  if (!hasAccess && topicAccess) {
    return (
      <ContentLockState
        title={topicAccess.title}
        contentType="listening"
        teaserConfig={topicAccess.teaser_config}
        backTo="/app/listening"
      />
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectPart')}</h1>

      <div className="grid gap-3 mb-6">
        <p className="text-xs font-black uppercase text-muted-foreground">{t('listening.mode')}</p>
        <div className="flex gap-2">
          {(['test', 'dictation'] as ListeningMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'neo-button min-h-0 px-4 py-2 rounded-md border-2 text-sm font-bold transition',
                mode === m
                  ? 'border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)]'
                  : 'border-border bg-card hover:bg-muted shadow-[2px_2px_0_var(--border)]',
              )}
            >
              {m === 'test' ? t('listening.testMode') : t('listening.dictationMode')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {parts.map((part) => (
          <Card key={part.id} className="grid gap-2">
            <CardTitle>{t(partLabels[part.partNumber] || 'listening.part' + part.partNumber)}</CardTitle>
            <p className="text-xs text-muted-foreground">{part.directions}</p>
            <Button onClick={() => handleStart(part.id)}>{t('listening.startSession')}</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
