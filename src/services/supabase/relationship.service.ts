import { supabase } from '@/services/supabase/client'
import type { RelationType, TermRelationship, VocabularyItem, VocabularyCardResponse } from '@/types/vocabulary.types'
import { flattenVocabularyItem } from '@/services/supabase/vocabulary.service'

export const relationshipTypes: RelationType[] = ['synonym', 'antonym', 'noun', 'verb', 'adjective', 'adverb']
export const bidirectionalRelationshipTypes = new Set<RelationType>(['synonym', 'antonym'])

export function createEmptyRelationshipGroups(): Record<RelationType, VocabularyItem[]> {
  return {
    synonym: [],
    antonym: [],
    noun: [],
    verb: [],
    adjective: [],
    adverb: [],
  }
}

export function isBidirectionalRelationType(relationType: RelationType): boolean {
  return bidirectionalRelationshipTypes.has(relationType)
}

async function resolveGlobalTermId(userTermId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_terms')
    .select('global_term_id')
    .eq('id', userTermId)
    .maybeSingle()

  if (data?.global_term_id) return data.global_term_id

  // Fallback to checking if it is already a global_term_id
  const { data: globalData } = await supabase
    .from('global_terms')
    .select('id')
    .eq('id', userTermId)
    .maybeSingle()

  return globalData?.id ?? null
}

// Lấy entry từ vựng theo id. Thử user_terms trước (kèm JOIN global_terms);
// nếu không có (from vựng chưa bắt đầu học, id thực chất là global_term_id),
// lấy trực tiếp từ global_terms và dựng VocabularyItem mặc định.
async function fetchEntryById(entryId: string): Promise<VocabularyItem | null> {
  const { data: fetchedEntry, error } = await supabase
    .from('user_terms')
    .select(`
      *,
      global_terms!fk_user_terms_global_term (
        source_text, normalized_text, source_language, native_language,
        item_type, part_of_speech, ipa, audio_url, image_url, meanings, examples,
        translation, note, tags
      )
    `)
    .eq('id', entryId)
    .maybeSingle()
  if (error) throw error
  if (fetchedEntry) return flattenVocabularyItem(fetchedEntry)

  // Fallback: id là global_term_id của từ chưa được user học
  const { data: globalData, error: globalError } = await supabase
    .from('global_terms')
    .select('*')
    .eq('id', entryId)
    .maybeSingle()
  if (globalError) throw globalError
  if (!globalData) return null

  return {
    id: globalData.id,
    global_term_id: globalData.id,
    user_id: '',
    status: 'new',
    view_count: 0,
    correct_count: 0,
    wrong_count: 0,
    audio_play_count: 0,
    srs_repetition: 0,
    srs_interval_days: 0,
    srs_ease_factor: 2.5,
    last_reviewed_at: null,
    next_review_at: null,
    flagged: false,
    deleted_at: null,
    created_at: globalData.created_at,
    updated_at: globalData.updated_at,
    source_text: globalData.source_text,
    normalized_text: globalData.normalized_text,
    source_language: globalData.source_language,
    native_language: globalData.native_language,
    item_type: globalData.item_type,
    part_of_speech: globalData.part_of_speech,
    ipa: globalData.ipa,
    audio_url: globalData.audio_url,
    image_url: globalData.image_url,
    meanings: globalData.meanings,
    examples: globalData.examples,
    note: globalData.note,
    tags: globalData.tags,
    translation: globalData.translation,
  } as VocabularyItem
}

export const relationshipService = {
  async listBySourceId(sourceId: string): Promise<TermRelationship[]> {
    const globalTermId = await resolveGlobalTermId(sourceId)
    if (!globalTermId) return []

    const { data, error } = await supabase
      .from('term_relationships')
      .select('*')
      .eq('source_id', globalTermId)
    if (error) throw error
    return (data ?? []) as TermRelationship[]
  },

  async create(sourceId: string, targetId: string, relationType: RelationType): Promise<TermRelationship> {
    const sourceGlobalId = await resolveGlobalTermId(sourceId)
    const targetGlobalId = await resolveGlobalTermId(targetId)
    if (!sourceGlobalId || !targetGlobalId) throw new Error('Cannot resolve global_term_id for source or target')

    const { data, error } = await supabase
      .from('term_relationships')
      .insert({ source_id: sourceGlobalId, target_id: targetGlobalId, relation_type: relationType })
      .select('*')
      .single()
    if (error) throw error
    return data as TermRelationship
  },

  async createBidirectional(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    const sourceGlobalId = await resolveGlobalTermId(sourceId)
    const targetGlobalId = await resolveGlobalTermId(targetId)
    if (!sourceGlobalId || !targetGlobalId) throw new Error('Cannot resolve global_term_id for source or target')

    const { error } = await supabase
      .from('term_relationships')
      .insert([
        { source_id: sourceGlobalId, target_id: targetGlobalId, relation_type: relationType },
        { source_id: targetGlobalId, target_id: sourceGlobalId, relation_type: relationType },
      ])
    if (error) throw error
  },

  async createAuto(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    const sourceGlobalId = await resolveGlobalTermId(sourceId)
    const targetGlobalId = await resolveGlobalTermId(targetId)
    if (!sourceGlobalId || !targetGlobalId) return

    const rows = [
      { source_id: sourceGlobalId, target_id: targetGlobalId, relation_type: relationType },
      ...(isBidirectionalRelationType(relationType)
        ? [{ source_id: targetGlobalId, target_id: sourceGlobalId, relation_type: relationType }]
        : []),
    ]

    const { error } = await supabase
      .from('term_relationships')
      .upsert(rows, { onConflict: 'source_id,target_id,relation_type', ignoreDuplicates: true })
    if (error) throw error
  },

  async remove(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    const sourceGlobalId = await resolveGlobalTermId(sourceId)
    const targetGlobalId = await resolveGlobalTermId(targetId)
    if (!sourceGlobalId || !targetGlobalId) return

    const { error } = await supabase
      .from('term_relationships')
      .delete()
      .eq('source_id', sourceGlobalId)
      .eq('target_id', targetGlobalId)
      .eq('relation_type', relationType)
    if (error) throw error
  },

  async removeBidirectional(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    const sourceGlobalId = await resolveGlobalTermId(sourceId)
    const targetGlobalId = await resolveGlobalTermId(targetId)
    if (!sourceGlobalId || !targetGlobalId) return

    const { error } = await supabase
      .from('term_relationships')
      .delete()
      .or(
        `and(source_id.eq.${sourceGlobalId},target_id.eq.${targetGlobalId}),and(source_id.eq.${targetGlobalId},target_id.eq.${sourceGlobalId})`
      )
      .eq('relation_type', relationType)
    if (error) throw error
  },

  async removeAuto(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    if (isBidirectionalRelationType(relationType)) {
      await this.removeBidirectional(sourceId, targetId, relationType)
      return
    }

    await this.remove(sourceId, targetId, relationType)
  },

  async getCard(entryId: string, entry?: VocabularyItem): Promise<VocabularyCardResponse> {
    const globalTermId = await resolveGlobalTermId(entryId)

    const emptyRecord = createEmptyRelationshipGroups()

    if (!globalTermId) {
      if (entry) return { entry, relationships: emptyRecord }

      const fetchedEntry = await fetchEntryById(entryId)
      return { entry: fetchedEntry, relationships: emptyRecord }
    }

    const relationships = await this.listBySourceId(entryId)

    if (relationships.length === 0) {
      if (entry) return { entry, relationships: emptyRecord }

      const fetchedEntry = await fetchEntryById(entryId)
      return { entry: fetchedEntry, relationships: emptyRecord }
    }

    const targetGlobalIds = relationships.map((r) => r.target_id)

    const { data: targets, error: targetsError } = await supabase
      .from('global_terms')
      .select(`
        *,
        user_terms!fk_user_terms_global_term (
          id, user_id, status,
          view_count, correct_count, wrong_count, audio_play_count,
          srs_repetition, srs_interval_days, srs_ease_factor,
          last_reviewed_at, next_review_at, flagged, deleted_at,
          created_at, updated_at
        )
      `)
      .in('id', targetGlobalIds)
      .is('deleted_at', null)
    if (targetsError) throw targetsError

    const targetMap = new Map((targets ?? []).map((t: any) => {
      const userTerm = Array.isArray(t.user_terms) ? t.user_terms[0] : t.user_terms
      const merged = userTerm ? { ...userTerm, global_terms: t } : { global_terms: t, id: t.id, global_term_id: t.id }
      return [t.id, flattenVocabularyItem(merged)]
    }))

    const grouped = { ...emptyRecord }
    for (const rel of relationships) {
      const target = targetMap.get(rel.target_id)
      if (target) {
        grouped[rel.relation_type].push(target)
      }
    }

    if (entry) return { entry, relationships: grouped }

    const fetchedEntry = await fetchEntryById(entryId)
    return { entry: fetchedEntry, relationships: grouped }
  },
}
