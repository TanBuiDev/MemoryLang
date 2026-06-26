import { supabase } from '@/services/supabase/client'
import type { RelationType, TermRelationship, VocabularyItem, VocabularyCardResponse } from '@/types/vocabulary.types'

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

export const relationshipService = {
  async listBySourceId(sourceId: string): Promise<TermRelationship[]> {
    const { data, error } = await supabase
      .from('term_relationships')
      .select('*')
      .eq('source_id', sourceId)
    if (error) throw error
    return (data ?? []) as TermRelationship[]
  },

  async create(sourceId: string, targetId: string, relationType: RelationType): Promise<TermRelationship> {
    const { data, error } = await supabase
      .from('term_relationships')
      .insert({ source_id: sourceId, target_id: targetId, relation_type: relationType })
      .select('*')
      .single()
    if (error) throw error
    return data as TermRelationship
  },

  async createBidirectional(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    const { error } = await supabase
      .from('term_relationships')
      .insert([
        { source_id: sourceId, target_id: targetId, relation_type: relationType },
        { source_id: targetId, target_id: sourceId, relation_type: relationType },
      ])
    if (error) throw error
  },

  async createAuto(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    const rows = [
      { source_id: sourceId, target_id: targetId, relation_type: relationType },
      ...(isBidirectionalRelationType(relationType)
        ? [{ source_id: targetId, target_id: sourceId, relation_type: relationType }]
        : []),
    ]

    const { error } = await supabase
      .from('term_relationships')
      .upsert(rows, { onConflict: 'source_id,target_id,relation_type', ignoreDuplicates: true })
    if (error) throw error
  },

  async remove(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    const { error } = await supabase
      .from('term_relationships')
      .delete()
      .eq('source_id', sourceId)
      .eq('target_id', targetId)
      .eq('relation_type', relationType)
    if (error) throw error
  },

  async removeBidirectional(sourceId: string, targetId: string, relationType: RelationType): Promise<void> {
    const { error } = await supabase
      .from('term_relationships')
      .delete()
      .or(
        `and(source_id.eq.${sourceId},target_id.eq.${targetId}),and(source_id.eq.${targetId},target_id.eq.${sourceId})`
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
    const relationships = await this.listBySourceId(entryId)

    const emptyRecord = createEmptyRelationshipGroups()

    if (relationships.length === 0) {
      if (entry) return { entry, relationships: emptyRecord }

      const { data: fetchedEntry, error } = await supabase
        .from('user_terms')
        .select('*')
        .eq('id', entryId)
        .single()
      if (error) throw error
      return { entry: fetchedEntry as VocabularyItem, relationships: emptyRecord }
    }

    const targetIds = relationships.map((r) => r.target_id)

    const { data: targets, error: targetsError } = await supabase
      .from('user_terms')
      .select('*')
      .in('id', targetIds)
    if (targetsError) throw targetsError

    const targetMap = new Map((targets ?? []).map((t) => [t.id, t as VocabularyItem]))

    const grouped = { ...emptyRecord }
    for (const rel of relationships) {
      const target = targetMap.get(rel.target_id)
      if (target) {
        grouped[rel.relation_type].push(target)
      }
    }

    if (entry) return { entry, relationships: grouped }

    const { data: fetchedEntry, error: entryError } = await supabase
      .from('user_terms')
      .select('*')
      .eq('id', entryId)
      .single()
    if (entryError) throw entryError

    return { entry: fetchedEntry as VocabularyItem, relationships: grouped }
  },
}
