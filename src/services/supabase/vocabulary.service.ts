import { supabase } from '@/services/supabase/client'
import type { VocabularyFormValues, VocabularyUpdateFormValues } from '@/features/vocabulary/vocabulary.schema'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { derivePartOfSpeech, deriveTranslation, deriveExamples } from '@/types/vocabulary.types'
import { normalizeText } from '@/utils/normalizeText'

// Hàm trợ giúp làm phẳng đối tượng sau khi JOIN bảng
export function flattenVocabularyItem(row: any): VocabularyItem {
  if (!row) return row
  const { global_terms, ...userTerm } = row
  
  let meanings = global_terms?.meanings ?? []
  if (meanings.length === 0 && (global_terms?.translation || global_terms?.part_of_speech)) {
    meanings = [{
      text: global_terms.translation || '',
      translation: global_terms.translation || null,
      part_of_speech: global_terms.part_of_speech || null,
      language: global_terms.native_language || 'vi'
    }]
  }

  const derivedPos = derivePartOfSpeech(meanings)
  const derivedTranslation = deriveTranslation(meanings)
  const derivedExamples = deriveExamples(meanings)
  return {
    ...userTerm,
    source_text: global_terms?.source_text ?? '',
    normalized_text: global_terms?.normalized_text ?? '',
    source_language: global_terms?.source_language ?? 'en',
    native_language: global_terms?.native_language ?? 'vi',
    item_type: global_terms?.item_type ?? 'word',
    part_of_speech: derivedPos || global_terms?.part_of_speech || null,
    ipa: global_terms?.ipa ?? null,
    audio_url: global_terms?.audio_url ?? null,
    image_url: global_terms?.image_url ?? null,
    meanings,
    examples: (global_terms?.examples && global_terms.examples.length > 0) ? global_terms.examples : derivedExamples,
    note: global_terms?.note ?? null,
    tags: global_terms?.tags ?? [],
    translation: derivedTranslation || global_terms?.translation || null,
  } as VocabularyItem
}

function cleanMeanings(meanings: any[] | undefined) {
  if (!meanings) return []
  return meanings.map(({ examples, ...m }) => m)
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
    // PostgREST silently truncates RPC responses at the project's API max-rows
    // cap (default 1000). Paginate with .range() until a short page arrives so
    // every consumer (vocabulary list, dashboard, study, quiz, review,
    // statistics, deck picker) sees the full vocabulary set.
    const PAGE_SIZE = 1000
    const MAX_PAGES = 100
    const rows: Record<string, unknown>[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error } = await supabase
        .rpc('get_user_vocabulary', { p_user_id: userId })
        .range(from, to)
      if (error) throw error
      const pageRows = (data ?? []) as Record<string, unknown>[]
      rows.push(...pageRows)
      if (pageRows.length < PAGE_SIZE) break
    }

    // get_user_vocabulary đã trả về cấu trúc phẳng hoàn chỉnh, không cần flat lại.
    // LEFT JOIN khiến user_terms.id = NULL với các từ chưa học (chỉ tồn tại trong global_terms).
    // Dùng global_term_id làm id dự phòng để các link/điều hướng trang chi tiết hoạt động.
    return rows.map((item) => {
      const row = item as { id?: string; global_term_id?: string }
      return { ...item, id: row.id ?? row.global_term_id }
    }) as VocabularyItem[]
  },

  async get(id: string): Promise<VocabularyItem | null> {
    // 1. Thử lấy từ user_terms
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
    if (data) return flattenVocabularyItem(data)

    // 2. Nếu không tìm thấy, thử tìm trong global_terms (coi id là global_term_id)
    const { data: globalData, error: globalError } = await supabase
      .from('global_terms')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (globalError) throw globalError
    if (!globalData) return null

    // Trả về bản ghi từ vựng phẳng mặc định khi chưa bắt đầu học
    const flat = flattenVocabularyItem({ global_terms: globalData })
    return {
      ...flat,
      id: globalData.id,
      global_term_id: globalData.id,
      status: 'new' as const,
      view_count: 0,
      correct_count: 0,
      wrong_count: 0,
      audio_play_count: 0,
      last_reviewed_at: null,
      next_review_at: null,
      flagged: false,
      deleted_at: null,
    } as VocabularyItem
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
        .is('deleted_at', null)
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
            image_url: values.image_url ?? null,
            meanings: cleanMeanings(values.meanings),
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

    // 1. Tìm thông tin global_term_id và user_term hiện tại
    let globalTermId: string | null = null
    let userTermId = id
    let isNewUserTerm = false

    const { data: currentTerm } = await supabase
      .from('user_terms')
      .select('id, global_term_id')
      .eq('id', id)
      .maybeSingle()

    if (currentTerm) {
      globalTermId = currentTerm.global_term_id
    } else {
      // ID truyền vào có thể là global_term_id.
      // Kiểm tra xem user hiện tại đã có dòng trong user_terms cho global_term_id này chưa
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingUserTerm } = await supabase
          .from('user_terms')
          .select('id')
          .eq('user_id', user.id)
          .eq('global_term_id', id)
          .maybeSingle()

        if (existingUserTerm) {
          userTermId = existingUserTerm.id
          globalTermId = id
          isNewUserTerm = false
        } else {
          globalTermId = id
          isNewUserTerm = true
        }
      } else {
        globalTermId = id
        isNewUserTerm = true
      }
    }

    if (!globalTermId) throw new Error('Cannot find global term ID')

    // 2. Cập nhật dữ liệu từ điển trong global_terms (chỉ Admin mới lưu được - RLS sẽ kiểm soát)
    const { error: globalError } = await supabase
      .from('global_terms')
      .update({
        source_text: values.source_text,
        normalized_text: normalized,
        part_of_speech: values.part_of_speech || null,
        ipa: values.ipa || null,
        audio_url: values.audio_url || null,
        image_url: values.image_url || null,
        meanings: cleanMeanings(values.meanings),
        examples: values.examples || [],
        translation: values.translation || null,
        note: values.note || null,
        tags: values.tags || [],
      })
      .eq('id', globalTermId)
      
    if (globalError) {
      // Nếu có lỗi (ví dụ do phân quyền RLS vì user thường cố cập nhật global_terms), ta bỏ qua
      console.warn('Global terms update ignored (probably due to RLS policies):', globalError.message)
    }

    // 3. Cập nhật hoặc chèn mới tiến trình trong user_terms
    if (isNewUserTerm) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User session is required to initialize user vocabulary progress')

      const { data: newUserTerm, error: insertError } = await supabase
        .from('user_terms')
        .insert({
          user_id: user.id,
          global_term_id: globalTermId,
          status: values.status || 'new',
        })
        .select('id')
        .single()
        
      if (insertError) throw insertError
      userTermId = newUserTerm.id
    } else {
      const { error } = await supabase
        .from('user_terms')
        .update({
          status: values.status,
        })
        .eq('id', userTermId)
        
      if (error) throw error
    }

    if (Array.isArray(deck_ids)) {
      const { error: deleteLinksError } = await supabase.from('deck_terms').delete().eq('user_term_id', userTermId)
      if (deleteLinksError) throw deleteLinksError
    }

    if (deck_ids && deck_ids.length > 0) {
      const { error: linkError } = await supabase
        .from('deck_terms')
        .insert(deck_ids.map((deck_id) => ({ deck_id, user_term_id: userTermId })))
      if (linkError) throw linkError
    }

    return await this.get(userTermId) as VocabularyItem
  },

  async remove(id: string) {
    const { data: ut } = await supabase
      .from('user_terms')
      .select('global_term_id')
      .eq('id', id)
      .maybeSingle()

    const globalTermId = ut?.global_term_id || id

    // 1. Soft-delete global_terms (chỉ Admin mới có quyền thực hiện - RLS sẽ kiểm soát)
    await supabase
      .from('global_terms')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', globalTermId)

    // 2. Soft-delete user_terms (cho user hiện tại hoặc tất cả user qua trigger)
    const { error: userErr } = await supabase
      .from('user_terms')
      .update({ deleted_at: new Date().toISOString() })
      .or(`id.eq.${id},global_term_id.eq.${globalTermId}`)

    if (userErr) throw userErr
  },

  async removeMany(ids: string[]) {
    for (const id of ids) {
      await this.remove(id)
    }
  },

  async flagTerm(id: string): Promise<void> {
    const { data: currentTerm } = await supabase
      .from('user_terms')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (currentTerm) {
      const { error } = await supabase.from('user_terms').update({ flagged: true }).eq('id', id)
      if (error) throw error
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User session is required to flag term')
      const { error } = await supabase.from('user_terms').insert({
        user_id: user.id,
        global_term_id: id,
        flagged: true,
        status: 'new',
      })
      if (error) throw error
    }
  },

  async unflagTerm(id: string): Promise<void> {
    const { data: currentTerm } = await supabase
      .from('user_terms')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (currentTerm) {
      const { error } = await supabase.from('user_terms').update({ flagged: false }).eq('id', id)
      if (error) throw error
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User session is required to unflag term')
      const { error } = await supabase.from('user_terms').insert({
        user_id: user.id,
        global_term_id: id,
        flagged: false,
        status: 'new',
      })
      if (error) throw error
    }
  },
}
