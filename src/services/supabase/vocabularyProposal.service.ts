import { supabase } from '@/services/supabase/client'
import type { LanguageCode } from '@/types/language.types'
import type { EnrichedVocabulary } from '@/types/vocabulary.types'

export type VocabularyProposalStatus = 'pending' | 'approved' | 'rejected'
export type VocabularyProposalOutcome = 'created' | 'merged' | 'already_voted' | 'already_available'

export interface VocabularyProposal {
  id: string
  source_text: string
  normalized_text: string
  source_language: LanguageCode
  native_language: LanguageCode
  status: VocabularyProposalStatus
  vote_count: number
  reviewed_by: string | null
  reviewed_at: string | null
  approved_global_term_id: string | null
  created_at: string
  updated_at: string
}

export interface VocabularyProposalResult {
  outcome: VocabularyProposalOutcome
  proposal_id?: string
  vote_count?: number
}

export const vocabularyProposalService = {
  async submit(input: {
    sourceText: string
    sourceLanguage: LanguageCode
    nativeLanguage: LanguageCode
  }): Promise<VocabularyProposalResult> {
    const sourceText = input.sourceText.trim()
    if (!sourceText) throw new Error('Từ đề xuất không được để trống.')

    const { data, error } = await supabase.rpc('submit_vocabulary_proposal', {
      p_source_text: sourceText,
      p_source_language: input.sourceLanguage,
      p_native_language: input.nativeLanguage,
    })
    if (error) throw error
    return data as VocabularyProposalResult
  },

  async listPending(): Promise<VocabularyProposal[]> {
    const { data, error } = await supabase
      .from('vocabulary_proposals')
      .select('*')
      .eq('status', 'pending')
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as VocabularyProposal[]
  },

  async approve(proposalId: string, term: EnrichedVocabulary): Promise<string> {
    const { data, error } = await supabase.rpc('review_vocabulary_proposal', {
      p_proposal_id: proposalId,
      p_decision: 'approve',
      p_term: {
        item_type: term.itemType,
        part_of_speech: term.partOfSpeech,
        ipa: term.ipa,
        audio_url: term.audioUrl,
        image_url: term.imageUrl,
        meanings: term.meanings,
        examples: term.examples,
        translation: term.translationText ?? null,
        note: null,
        tags: [],
      },
    })
    if (error) throw error
    return data as string
  },

  async reject(proposalId: string): Promise<void> {
    const { error } = await supabase.rpc('review_vocabulary_proposal', {
      p_proposal_id: proposalId,
      p_decision: 'reject',
      p_term: null,
    })
    if (error) throw error
  },
}
