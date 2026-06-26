import { supabase } from '@/services/supabase/client'
import type { VocabularyFormValues, VocabularyUpdateFormValues } from '@/features/vocabulary/vocabulary.schema'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { normalizeText } from '@/utils/normalizeText'

// Hàm trợ giúp làm phẳng đối tượng sau khi JOIN bảng
export function flattenVocabularyItem(row: any): VocabularyItem {
  if (!row) return row
  const { global_terms, ...userTerm } = row
  return {
    ...userTerm,
    source_text: global_terms?.source_text ?? '',
    normalized_text: global_terms?.normalized_text ?? '',
    source_language: global_terms?.source_language ?? 'en',
    native_language: global_terms?.native_language ?? 'vi',
    item_type: global_terms?.item_type ?? 'word',
    part_of_speech: global_terms?.part_of_speech ?? null,
    ipa: global_terms?.ipa ?? null,
    audio_url: global_terms?.audio_url ?? null,
    image_url: global_terms?.image_url ?? null,
    meanings: global_terms?.meanings ?? [],
    examples: global_terms?.examples ?? [],
    note: global_terms?.note ?? null,
    tags: global_terms?.tags ?? [],
    translation: global_terms?.translation ?? null,
  } as VocabularyItem
}

export const vocabularyService = {
  async findDuplicate(userId: string, sourceText: string): Promise<VocabularyItem | null> {
    const normalized = normalizeText(sourceText)
    const { data, error } = await supabase
      .from('user_terms')
      .select('id, global_term_id, global_terms!fk_user_terms_global_term!inner(source_text, normalized_text)')
      .eq('user_id', userId)
      .eq('global_terms!fk_user_terms_global_term.normalized_text', normalized)
      .limit(1)
      
    if (error) throw error
    if (!data || data.length === 0) return null
    
    const row = data[0]
    return {
      id: row.id,
      global_term_id: row.global_term_id,
      source_text: (row.global_terms as any).source_text,
      normalized_text: (row.global_terms as any).normalized_text,
    } as any
  },

  async list(userId: string): Promise<VocabularyItem[]> {
    // Đảm bảo user có đầy đủ từ vựng từ global_terms (idempotent, chỉ thêm từ mới)
    await supabase.rpc('seed_user_vocabulary', { p_user_id: userId })
    
    const { data, error } = await supabase
      .from('user_terms')
      .select(`
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
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      
    if (error) throw error
    return (data ?? []).map(row => flattenVocabularyItem(row))
  },

  async get(id: string): Promise<VocabularyItem | null> {
    const { data, error } = await supabase
      .from('user_terms')
      .select(`
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
      `)
      .eq('id', id)
      .maybeSingle()
      
    if (error) throw error
    if (!data) return null
    return flattenVocabularyItem(data)
  },

  async create(userId: string, values: VocabularyFormValues): Promise<VocabularyItem> {
    const { deck_ids } = values
    const normalized = normalizeText(values.source_text)
    
    // 1. Kiểm tra xem từ đã tồn tại trong global_terms chưa
    let globalTermId = (values as any).global_term_id
    if (!globalTermId) {
      const { data: existingGlobal } = await supabase
        .from('global_terms')
        .select('id')
        .eq('normalized_text', normalized)
        .eq('source_language', values.source_language)
        .eq('native_language', values.native_language)
        .maybeSingle()
        
      if (existingGlobal) {
        globalTermId = existingGlobal.id
      } else {
        // Tạo mới trong global_terms
        const { data: newGlobal, error: globalError } = await supabase
          .from('global_terms')
          .insert({
            source_text: values.source_text,
            normalized_text: normalized,
            source_language: values.source_language,
            native_language: values.native_language,
            item_type: values.item_type,
            part_of_speech: values.part_of_speech || null,
            ipa: values.ipa || null,
            audio_url: values.audio_url || null,
            image_url: values.image_url || null,
            meanings: values.meanings,
            examples: values.examples || [],
            translation: values.translation || null,
            note: values.note || null,
            tags: values.tags || [],
          })
          .select('id')
          .single()
          
        if (globalError) throw globalError
        globalTermId = newGlobal.id
      }
    }

    // 2. Tạo liên kết trong user_terms
    const { data, error } = await supabase
      .from('user_terms')
      .insert({
        user_id: userId,
        global_term_id: globalTermId,
        status: 'new',
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

    return await this.get(data.id) as VocabularyItem
  },

  async update(id: string, values: VocabularyUpdateFormValues): Promise<VocabularyItem> {
    const { deck_ids } = values
    const normalized = normalizeText(values.source_text)

    // 1. Lấy thông tin user_term hiện tại để tìm global_term_id
    const { data: currentTerm, error: fetchError } = await supabase
      .from('user_terms')
      .select('global_term_id')
      .eq('id', id)
      .single()
      
    if (fetchError) throw fetchError
    const globalTermId = currentTerm.global_term_id

    // 2. Cập nhật dữ liệu từ điển trong global_terms
    const { error: globalError } = await supabase
      .from('global_terms')
      .update({
        source_text: values.source_text,
        normalized_text: normalized,
        part_of_speech: values.part_of_speech || null,
        ipa: values.ipa || null,
        audio_url: values.audio_url || null,
        image_url: values.image_url || null,
        meanings: values.meanings,
        examples: values.examples || [],
        translation: values.translation || null,
        note: values.note || null,
        tags: values.tags || [],
      })
      .eq('id', globalTermId)
      
    if (globalError) throw globalError

    // 3. Cập nhật các trường cá nhân trong user_terms (chỉ còn status)
    const { error } = await supabase
      .from('user_terms')
      .update({
        status: values.status,
      })
      .eq('id', id)
      
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

    return await this.get(id) as VocabularyItem
  },

  async remove(id: string) {
    const { error } = await supabase.from('user_terms').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },

  async removeMany(ids: string[]) {
    const { error } = await supabase.from('user_terms').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    if (error) throw error
  },

  async flagTerm(id: string): Promise<void> {
    const { error } = await supabase.from('user_terms').update({ flagged: true }).eq('id', id)
    if (error) throw error
  },

  async unflagTerm(id: string): Promise<void> {
    const { error } = await supabase.from('user_terms').update({ flagged: false }).eq('id', id)
    if (error) throw error
  },
}
