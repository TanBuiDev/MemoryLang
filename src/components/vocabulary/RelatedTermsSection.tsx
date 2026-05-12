import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { hasRelatedTerms, relationshipDisplayOrder, relationshipLabelKeys } from '@/components/vocabulary/relationshipDisplay'
import { useI18n } from '@/i18n'
import type { RelationType, VocabularyItem } from '@/types/vocabulary.types'

interface RelatedTermsSectionProps {
  relationships: Record<RelationType, VocabularyItem[]>
  onRemove?: (targetId: string, relationType: RelationType) => void
  removingKey?: string | null
  showEmpty?: boolean
}

export function RelatedTermsSection({ relationships, onRemove, removingKey, showEmpty = true }: RelatedTermsSectionProps) {
  const { t } = useI18n()
  const hasTerms = hasRelatedTerms(relationships)

  if (!hasTerms && !showEmpty) return null

  return (
    <Card>
      <CardTitle>{t('vocabulary.relatedTerms')}</CardTitle>
      {!hasTerms ? (
        <CardDescription className="mt-2">{t('vocabulary.noRelatedTerms')}</CardDescription>
      ) : (
        <div className="mt-4 grid gap-3">
          {relationshipDisplayOrder.map((relationType) => {
            const terms = relationships[relationType]
            if (terms.length === 0) return null

            return (
              <div key={relationType} className="rounded-[var(--radius)] border-2 border-border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-black">{t(relationshipLabelKeys[relationType])}</p>
                  <Badge>{terms.length}</Badge>
                </div>
                <div className="grid gap-2">
                  {terms.map((term) => {
                    const removeKey = `${relationType}:${term.id}`
                    return (
                      <div key={removeKey} className="flex items-center justify-between gap-3 border-t-2 border-border pt-2 first:border-t-0 first:pt-0">
                        <Link to={`/app/vocabulary/${term.id}`} className="min-w-0 flex-1">
                          <p className="truncate font-black text-foreground">{term.source_text}</p>
                          <p className="truncate text-sm font-semibold text-muted-foreground">
                            {[term.part_of_speech, term.translation].filter(Boolean).join(' · ') || t('vocabulary.detailFallback')}
                          </p>
                        </Link>
                        {onRemove ? (
                          <Button
                            type="button"
                            variant="danger"
                            className="min-h-8 px-3 py-1 text-xs"
                            disabled={removingKey === removeKey}
                            onClick={() => onRemove(term.id, relationType)}
                          >
                            {t('vocabulary.delete')}
                          </Button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
