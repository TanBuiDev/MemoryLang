import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listGlobalTerms: vi.fn(),
  deleteGlobalTerm: vi.fn(),
  bulkImportVocabulary: vi.fn(),
  listPending: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  enrichVocabulary: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('@/services/supabase/admin.service', () => ({
  adminService: {
    listGlobalTerms: mocks.listGlobalTerms,
    deleteGlobalTerm: mocks.deleteGlobalTerm,
    bulkImportVocabulary: mocks.bulkImportVocabulary,
  },
}))
vi.mock('@/services/supabase/vocabularyProposal.service', () => ({
  vocabularyProposalService: {
    listPending: mocks.listPending,
    approve: mocks.approve,
    reject: mocks.reject,
  },
}))
vi.mock('@/services/api/enrichVocabulary.api', () => ({
  enrichVocabulary: mocks.enrichVocabulary,
}))
vi.mock('@/components/ui/toast', () => ({ showToast: mocks.showToast }))

import AdminVocabularyPage from '@/pages/admin/AdminVocabularyPage'

const proposal = {
  id: 'proposal-1',
  source_text: 'take off',
  normalized_text: 'take off',
  source_language: 'en',
  native_language: 'vi',
  status: 'pending',
  vote_count: 7,
  reviewed_by: null,
  reviewed_at: null,
  approved_global_term_id: null,
  created_at: '2026-09-23T00:00:00.000Z',
  updated_at: '2026-09-23T00:00:00.000Z',
}

describe('AdminVocabularyPage proposal review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listGlobalTerms.mockResolvedValue([])
    mocks.listPending.mockResolvedValue([proposal])
    mocks.approve.mockResolvedValue('global-term-1')
    mocks.reject.mockResolvedValue(undefined)
    mocks.enrichVocabulary.mockResolvedValue({
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
    })
  })

  it('shows proposal votes and approves into the shared library', async () => {
    const user = userEvent.setup()
    render(<AdminVocabularyPage />)

    expect(await screen.findByText('take off')).toBeInTheDocument()
    expect(screen.getByText('7 lượt')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Duyệt & thêm' }))

    await waitFor(() => {
      expect(mocks.enrichVocabulary).toHaveBeenCalledWith('take off', 'en', 'vi')
      expect(mocks.approve).toHaveBeenCalledWith('proposal-1', expect.objectContaining({
        sourceText: 'take off',
      }))
    })
    expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      title: 'Đã duyệt đề xuất',
    }))
  })

  it('requires the custom confirmation modal before rejecting', async () => {
    const user = userEvent.setup()
    render(<AdminVocabularyPage />)

    await screen.findByText('take off')
    await user.click(screen.getByRole('button', { name: 'Từ chối' }))
    expect(mocks.reject).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }))
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith('proposal-1'))
  })
})
