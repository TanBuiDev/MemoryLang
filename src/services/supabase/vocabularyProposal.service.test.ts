import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}))

import { vocabularyProposalService } from '@/services/supabase/vocabularyProposal.service'

describe('vocabularyProposalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits a proposal through the deduplicating RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: { outcome: 'merged', proposal_id: 'proposal-1', vote_count: 4 },
      error: null,
    })

    await expect(vocabularyProposalService.submit({
      sourceText: '  take off  ',
      sourceLanguage: 'en',
      nativeLanguage: 'vi',
    })).resolves.toEqual({ outcome: 'merged', proposal_id: 'proposal-1', vote_count: 4 })

    expect(mocks.rpc).toHaveBeenCalledWith('submit_vocabulary_proposal', {
      p_source_text: 'take off',
      p_source_language: 'en',
      p_native_language: 'vi',
    })
  })

  it('loads pending proposals in vote priority order', async () => {
    const proposals = [{ id: 'proposal-1', source_text: 'take off', vote_count: 4 }]
    const orderCreatedAt = vi.fn().mockResolvedValue({ data: proposals, error: null })
    const orderVotes = vi.fn(() => ({ order: orderCreatedAt }))
    const eq = vi.fn(() => ({ order: orderVotes }))
    const select = vi.fn(() => ({ eq }))
    mocks.from.mockReturnValue({ select })

    await expect(vocabularyProposalService.listPending()).resolves.toEqual(proposals)
    expect(mocks.from).toHaveBeenCalledWith('vocabulary_proposals')
    expect(eq).toHaveBeenCalledWith('status', 'pending')
    expect(orderVotes).toHaveBeenCalledWith('vote_count', { ascending: false })
    expect(orderCreatedAt).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('approves with enriched content without creating a learner term', async () => {
    mocks.rpc.mockResolvedValue({ data: 'global-term-1', error: null })

    await expect(vocabularyProposalService.approve('proposal-1', {
      sourceText: 'take off',
      normalizedText: 'take off',
      itemType: 'phrase',
      ipa: 'teɪk ɒf',
      partOfSpeech: 'verb',
      meanings: [{ text: 'rời mặt đất', language: 'vi' }],
      examples: [{ sentence: 'The plane took off.' }],
      translationText: 'cất cánh',
      audioUrl: null,
      imageUrl: null,
      source: 'ai',
    })).resolves.toBe('global-term-1')

    expect(mocks.rpc).toHaveBeenCalledWith('review_vocabulary_proposal', {
      p_proposal_id: 'proposal-1',
      p_decision: 'approve',
      p_term: expect.objectContaining({
        item_type: 'phrase',
        meanings: [{ text: 'rời mặt đất', language: 'vi' }],
        translation: 'cất cánh',
      }),
    })
  })

  it('rejects without sending term content', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null })

    await vocabularyProposalService.reject('proposal-1')

    expect(mocks.rpc).toHaveBeenCalledWith('review_vocabulary_proposal', {
      p_proposal_id: 'proposal-1',
      p_decision: 'reject',
      p_term: null,
    })
  })
})
