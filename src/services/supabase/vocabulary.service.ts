import { supabase } from '@/services/supabase/client'
import type { VocabularyFormValues, VocabularyUpdateFormValues } from '@/features/vocabulary/vocabulary.schema'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { normalizeText } from '@/utils/normalizeText'

export const vocabularyService = {
  async findDuplicate(userId: string, sourceText: string): Promise<VocabularyItem | null> {
    const normalized = normalizeText(sourceText)
    const { data, error } = await supabase
      .from('user_terms')
      .select('id, source_text, normalized_text')
      .eq('user_id', userId)
      .eq('normalized_text', normalized)
      .limit(1)
    if (error) throw error
    return (data?.[0] as VocabularyItem) ?? null
  },
  async list(userId: string): Promise<VocabularyItem[]> {
    const { data, error } = await supabase
      .from('user_terms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as VocabularyItem[]
  },
  async get(id: string): Promise<VocabularyItem | null> {
    const { data, error } = await supabase.from('user_terms').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as VocabularyItem | null
  },
  async create(userId: string, values: VocabularyFormValues): Promise<VocabularyItem> {
    const { deck_ids, ...termValues } = values
    const { data, error } = await supabase
      .from('user_terms')
      .insert({
        ...termValues,
        user_id: userId,
        normalized_text: normalizeText(values.source_text),
        part_of_speech: values.part_of_speech || null,
        ipa: values.ipa || null,
        pronunciation_text: values.pronunciation_text || null,
        audio_url: values.audio_url || null,
        image_url: values.image_url || null,
        note: values.note || null,
        translation: values.translation || null,
      })
      .select('*')
      .single()
    if (error) throw error

    if (deck_ids.length > 0) {
      const { error: linkError } = await supabase
        .from('deck_terms')
        .insert(deck_ids.map((deck_id) => ({ deck_id, user_term_id: data.id })))
      if (linkError) throw linkError
    }

    return data as VocabularyItem
  },
  async update(id: string, values: VocabularyUpdateFormValues): Promise<VocabularyItem> {
    const { deck_ids, ...termValues } = values
    const { data, error } = await supabase
      .from('user_terms')
      .update({
        ...termValues,
        normalized_text: normalizeText(values.source_text),
        part_of_speech: values.part_of_speech || null,
        ipa: values.ipa || null,
        pronunciation_text: values.pronunciation_text || null,
        audio_url: values.audio_url || null,
        image_url: values.image_url || null,
        note: values.note || null,
        translation: values.translation || null,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    if (Array.isArray(deck_ids)) {
      const { error: deleteLinksError } = await supabase.from('deck_terms').delete().eq('user_term_id', id)
      if (deleteLinksError) throw deleteLinksError
    }

    if (deck_ids && deck_ids.length > 0) {
      const { error: linkError } = await supabase
        .from('deck_terms')
        .insert(deck_ids.map((deck_id) => ({ deck_id, user_term_id: id })))
      if (linkError) throw linkError
    }

    return data as VocabularyItem
  },
  async remove(id: string) {
    const { error } = await supabase.from('user_terms').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },
  async removeMany(ids: string[]) {
    const { error } = await supabase.from('user_terms').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) throw error
  },
}
