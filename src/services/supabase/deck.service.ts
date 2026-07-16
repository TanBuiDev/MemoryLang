import { supabase } from '@/services/supabase/client'
import type { LessonDraft } from '@/features/decks/bulkLessons'
import type { Deck, DeckVisibility } from '@/types/deck.types'
import type { LanguageCode } from '@/types/language.types'
import { FREE_LIMITS } from '@/types/subscription.types'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { SubscriptionLimitError } from '@/services/supabase/subscription.errors'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { flattenVocabularyItem } from './vocabulary.service'

export interface DeckInput {
  user_id: string
  name: string
  description?: string
  source_language: LanguageCode
  native_language: LanguageCode
  color?: string
  icon?: string
  visibility?: DeckVisibility
  parent_id?: string | null
}

export interface CreateLessonBatchInput {
  base: Omit<DeckInput, 'name'>
  lessons: LessonDraft[]
}

export interface CreateLessonBatchResult {
  createdDecks: Deck[]
  error: unknown | null
}

async function resolveGlobalTermId(termId: string): Promise<string> {
  // Check if it's already a user_terms id
  const { data: ut } = await supabase
    .from('user_terms')
    .select('global_term_id')
    .eq('id', termId)
    .maybeSingle()

  if (ut) return ut.global_term_id

  // Check if it's a global_terms id
  const { data: gt } = await supabase
    .from('global_terms')
    .select('id')
    .eq('id', termId)
    .maybeSingle()

  if (gt) return gt.id

  throw new Error(`Cannot resolve term ID: ${termId}`)
}

function collectDescendantIds(parentId: string, allDecks: Pick<Deck, 'id' | 'parent_id'>[]): string[] {
  const children = allDecks.filter((d) => d.parent_id === parentId)
  return children.flatMap((child) => [child.id, ...collectDescendantIds(child.id, allDecks)])
}

function getDeckPath(deckId: string, allDecks: Pick<Deck, 'id' | 'name' | 'parent_id'>[]): string {
  const deck = allDecks.find((d) => d.id === deckId)
  if (!deck) return ''
  const path = [deck.name]
  let current = deck
  while (current.parent_id) {
    const parent = allDecks.find((d) => d.id === current.parent_id)
    if (!parent) break
    path.unshift(parent.name)
    current = parent
  }
  return path.join(' › ')
}

async function assertCanAddDeck(userId: string) {
  const canAdd = await subscriptionService.canAddDeck(userId)
  if (!canAdd) {
    throw new SubscriptionLimitError('decks', FREE_LIMITS.maxDecks)
  }
}

async function assertCanCreateDecks(userId: string, deckCount: number) {
  const canCreate = await subscriptionService.canCreateDecks(userId, deckCount)
  if (!canCreate) {
    throw new SubscriptionLimitError('decks', FREE_LIMITS.maxDecks)
  }
}

export const deckService = {
  collectDescendantIds,
  getDeckPath,
  async list(userId: string): Promise<Deck[]> {
    const { data, error } = await supabase
      .from('decks')
      .select('*, deck_terms(count)')
      .or(`user_id.eq.${userId},visibility.eq.public`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((deck) => ({ ...deck, term_count: deck.deck_terms?.[0]?.count ?? 0 })) as Deck[]
  },
  async get(id: string): Promise<Deck | null> {
    const { data, error } = await supabase.from('decks').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as Deck | null
  },
  async listTerms(deckId: string): Promise<VocabularyItem[]> {
    // 1. Get all decks to collect child IDs
    const { data: allDecks, error: decksError } = await supabase
      .from('decks')
      .select('id, parent_id')
    if (decksError) throw decksError

    const deckIds = [deckId, ...collectDescendantIds(deckId, allDecks || [])]

    // 2. Fetch all terms for these deck IDs
    const { data, error } = await supabase
      .from('deck_terms')
      .select(`
        global_terms!fk_deck_terms_global_term (
          id,
          source_text,
          normalized_text,
          source_language,
          native_language,
          item_type,
          part_of_speech,
          ipa,
          audio_url,
          image_url,
          meanings,
          examples,
          translation,
          note,
          tags
        )
      `)
      .in('deck_id', deckIds)
      .order('created_at', { ascending: true })

    if (error) throw error

    // 3. Flatten and deduplicate terms
    const termsMap = new Map<string, VocabularyItem>()

    for (const entry of (data ?? [])) {
      const gt = entry.global_terms as any
      if (!gt || (Array.isArray(gt) && gt.length === 0)) continue
      const term = Array.isArray(gt) ? gt[0] : gt
      const vocabularyItem = flattenVocabularyItem({ global_terms: term, id: term.id, global_term_id: term.id, status: 'new' })
      if (vocabularyItem) {
        termsMap.set(vocabularyItem.id, vocabularyItem)
      }
    }

    return Array.from(termsMap.values())
  },
  async create(input: DeckInput): Promise<Deck> {
    await assertCanAddDeck(input.user_id)

    const { data, error } = await supabase.from('decks').insert(input).select('*').single()
    if (error) throw error
    return data as Deck
  },
  async createLessonBatch({ base, lessons }: CreateLessonBatchInput): Promise<CreateLessonBatchResult> {
    const createdDecks: Deck[] = []

    try {
      await assertCanCreateDecks(base.user_id, lessons.length)
    } catch (error) {
      return { createdDecks, error }
    }

    const uniqueTermIds = Array.from(new Set(lessons.flatMap((lesson) => lesson.termIds)))
    const globalTermIdByTermId = new Map<string, string>()
    try {
      for (const termId of uniqueTermIds) {
        globalTermIdByTermId.set(termId, await resolveGlobalTermId(termId))
      }
    } catch (error) {
      return { createdDecks, error }
    }

    try {
      for (const lesson of lessons) {
        const deck = await deckService.create({ ...base, name: lesson.name })

        const { error } = await supabase.from('deck_terms').insert(
          lesson.termIds.map((id) => ({ deck_id: deck.id, global_term_id: globalTermIdByTermId.get(id) })),
        )
        if (error) {
          try {
            await deckService.remove(deck.id)
          } catch (cleanupError) {
            return {
              createdDecks,
              error: new AggregateError([error, cleanupError], 'Failed to link lesson terms and clean up deck'),
            }
          }

          return { createdDecks, error }
        }

        createdDecks.push(deck)
      }

      return { createdDecks, error: null }
    } catch (error) {
      return { createdDecks, error }
    }
  },
  async update(id: string, input: Partial<DeckInput>): Promise<Deck> {
    const { data, error } = await supabase.from('decks').update(input).eq('id', id).select('*').single()
    if (error) throw error
    return data as Deck
  },
  async remove(id: string) {
    const { error } = await supabase.from('decks').delete().eq('id', id)
    if (error) throw error
  },
  async addTerm(deckId: string, termId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User session is required to add term to deck')

    const globalTermId = await resolveGlobalTermId(termId)

    const { error } = await supabase
      .from('deck_terms')
      .insert({ deck_id: deckId, global_term_id: globalTermId })
    if (error) throw error
  },
  async removeTerm(deckId: string, termId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User session is required to remove term from deck')

    // Resolve to global_term_id
    const globalTermId = await resolveGlobalTermId(termId)

    const { error } = await supabase
      .from('deck_terms')
      .delete()
      .eq('deck_id', deckId)
      .eq('global_term_id', globalTermId)
    if (error) throw error
  },
  async getDeckedTermIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('deck_terms')
      .select('global_term_id, deck:decks!inner(user_id)')
      .eq('deck.user_id', userId)
    if (error) throw error
    return new Set((data ?? []).map((row) => row.global_term_id))
  },
}
