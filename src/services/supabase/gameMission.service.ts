import { supabase } from '@/services/supabase/client'
import { parseGameHubConfig, type GameHubConfig } from '@/features/games/mission/gameConfig'
import type { GameTerm, MissionProgress } from '@/features/games/mission/mission.types'
import type { TermReviewSnapshot } from '@/features/games/mission/missionSrsAdapter'
import type { Deck } from '@/types/deck.types'

const PAGE_SIZE = 500
const TERM_SELECT = 'order_index, global_terms!fk_deck_terms_global_term!inner(id,source_text,normalized_text,source_language,native_language,item_type,part_of_speech,ipa,audio_url,image_url,meanings,examples,translation,tags)'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function mapGameTerm(row: any): GameTerm | null {
  const related = Array.isArray(row.global_terms) ? row.global_terms[0] : row.global_terms
  if (!related?.id || !related?.source_text) return null
  return {
    globalTermId: related.id,
    orderIndex: Number(row.order_index ?? 0),
    sourceText: related.source_text,
    normalizedText: related.normalized_text ?? related.source_text.toLocaleLowerCase(),
    sourceLanguage: related.source_language,
    nativeLanguage: related.native_language,
    itemType: related.item_type,
    partOfSpeech: related.part_of_speech ?? null,
    ipa: related.ipa ?? null,
    audioUrl: related.audio_url ?? null,
    imageUrl: related.image_url ?? null,
    translation: related.translation ?? null,
    meanings: asArray(related.meanings),
    examples: asArray(related.examples),
    tags: asArray(related.tags),
  }
}

export const gameMissionService = {
  async getDeck(deckId: string): Promise<Deck | null> {
    const { data, error } = await supabase.from('decks').select('*').eq('id', deckId).maybeSingle()
    if (error) throw error
    return data as Deck | null
  },

  async getConfig(): Promise<GameHubConfig> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'game_hub_config')
      .maybeSingle()
    if (error) throw error
    return parseGameHubConfig(data?.value)
  },

  async listPlayableDeckTerms(deckId: string): Promise<GameTerm[]> {
    const rows: any[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('deck_terms')
        .select(TERM_SELECT)
        .eq('deck_id', deckId)
        .is('global_terms.deleted_at', null)
        .order('order_index', { ascending: true, nullsFirst: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw error
      rows.push(...(data ?? []))
      if ((data?.length ?? 0) < PAGE_SIZE) break
    }
    return rows
      .map(mapGameTerm)
      .filter((term): term is GameTerm => Boolean(term))
      .sort((a, b) => a.orderIndex - b.orderIndex || a.globalTermId.localeCompare(b.globalTermId))
  },

  async listProgress(userId: string, deckId: string, fingerprint: string): Promise<MissionProgress[]> {
    const { data, error } = await supabase
      .from('game_mission_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('deck_id', deckId)
      .eq('curriculum_fingerprint', fingerprint)
      .order('mission_index', { ascending: true })
    if (error) throw error
    return (data ?? []) as MissionProgress[]
  },

  async completeMission(deckId: string, fingerprint: string, missionIndex: number, score: number, accuracy: number) {
    const { data, error } = await supabase.rpc('complete_game_mission', {
      p_deck_id: deckId,
      p_curriculum_fingerprint: fingerprint,
      p_mission_index: missionIndex,
      p_score: score,
      p_accuracy: accuracy,
    })
    if (error) throw error
    return data as MissionProgress
  },

  async getReviewSnapshots(userId: string, globalTermIds: string[]) {
    const unique = Array.from(new Set(globalTermIds)).filter(Boolean)
    const result = new Map<string, TermReviewSnapshot>()
    if (unique.length === 0) return result
    for (let offset = 0; offset < unique.length; offset += PAGE_SIZE) {
      const ids = unique.slice(offset, offset + PAGE_SIZE)
      const { data, error } = await supabase
        .from('user_terms')
        .select('global_term_id, correct_count, wrong_count, srs_repetition, srs_interval_days, srs_ease_factor')
        .eq('user_id', userId)
        .in('global_term_id', ids)
        .is('deleted_at', null)
      if (error) throw error
      for (const row of data ?? []) {
        result.set(row.global_term_id, {
          globalTermId: row.global_term_id,
          correctCount: row.correct_count ?? 0,
          wrongCount: row.wrong_count ?? 0,
          repetition: row.srs_repetition ?? 0,
          intervalDays: row.srs_interval_days ?? 0,
          easeFactor: row.srs_ease_factor ?? 2.5,
        })
      }
    }
    return result
  },
}
