import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LongFormPromptWorkspace } from './LongFormPromptWorkspace'

describe('LongFormPromptWorkspace', () => {
  it('autosaves editable draft content and compares two immutable versions', async () => {
    const user = userEvent.setup()
    const onDraftChange = vi.fn()
    const onSaveVersion = vi.fn()
    render(<LongFormPromptWorkspace
      draftContent="First draft"
      onDraftChange={onDraftChange}
      onSaveVersion={onSaveVersion}
      isSaving={false}
      disabled={false}
      drafts={[
        { id: 'v1', version_number: 1, content: 'First draft', word_count: 2 },
        { id: 'v2', version_number: 2, content: 'Improved draft', word_count: 2 },
      ] as never}
      isLoadingDrafts={false}
      leftVersionId="v1"
      rightVersionId="v2"
      onLeftVersionChange={vi.fn()}
      onRightVersionChange={vi.fn()}
    />)

    await user.type(screen.getByLabelText('Bản nháp bài làm của bạn'), ' updated')
    expect(onDraftChange).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Lưu thành phiên bản' }))
    expect(onSaveVersion).toHaveBeenCalledOnce()
    expect(screen.getAllByText('First draft')).toHaveLength(2)
    expect(screen.getByText('Improved draft')).toBeInTheDocument()
  })
})
