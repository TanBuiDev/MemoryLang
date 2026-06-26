import { supabase } from '@/services/supabase/client'
import type { LessonDraft } from '@/features/decks/bulkLessons'
import type { Deck } from '@/types/deck.types'
import type { LanguageCode } from '@/types/language.types'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { flattenVocabularyItem } from './vocabulary.service'

export interface DeckInput {
  user_id: string
  name: string
  description?: string
  source_language: LanguageCode
  native_language: LanguageCode
  color?: string
  icon?: string
}

export interface CreateLessonBatchInput {
  base: Omit<DeckInput, 'name'>
  lessons: LessonDraft[]
}

export interface CreateLessonBatchResult {
  createdDecks: Deck[]
  error: unknown | null
}

export const deckService = {
  async list(userId: string): Promise<Deck[]> {
    const { data, error } = await supabase
      .from('decks')
      .select('*, deck_terms(count)')
      .eq('user_id', userId)
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
    const { data, error } = await supabase
      .from('deck_terms')
      .select(`
        user_terms (
          *,
          global_terms!fk_user_terms_global_term (
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
        )
      `)
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).flatMap((entry) => {
      const term = entry.user_terms
      if (!term) return []
      return Array.isArray(term)
        ? term.map((t) => flattenVocabularyItem(t))
        : [flattenVocabularyItem(term)]
    })
  },
  async create(input: DeckInput): Promise<Deck> {
    const { data, error } = await supabase.from('decks').insert(input).select('*').single()
    if (error) throw error
    return data as Deck
  },
  async createLessonBatch({ base, lessons }: CreateLessonBatchInput): Promise<CreateLessonBatchResult> {
    const createdDecks: Deck[] = []

    try {
      for (const lesson of lessons) {
        const deck = await deckService.create({ ...base, name: lesson.name })

        const { error } = await supabase.from('deck_terms').insert(
          lesson.termIds.map((user_term_id) => ({ deck_id: deck.id, user_term_id })),
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
  async addTerm(deckId: string, userTermId: string) {
    const { error } = await supabase
      .from('deck_terms')
      .insert({ deck_id: deckId, user_term_id: userTermId })
    if (error) throw error
  },
  async removeTerm(deckId: string, userTermId: string) {
    const { error } = await supabase
      .from('deck_terms')
      .delete()
      .eq('deck_id', deckId)
      .eq('user_term_id', userTermId)
    if (error) throw error
  },
  async getDeckedTermIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('deck_terms')
      .select('user_term_id, deck:decks!inner(user_id)')
      .eq('deck.user_id', userId)
    if (error) throw error
    return new Set((data ?? []).map((row) => row.user_term_id))
  },
}
