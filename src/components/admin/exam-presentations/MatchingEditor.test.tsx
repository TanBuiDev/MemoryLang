import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MatchingEditor, type MatchingEditorValue } from './MatchingEditor'

describe('MatchingEditor', () => {
  it('lets an admin add a pair using visible text fields rather than JSON', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    function Harness() {
      const [value, setValue] = useState<MatchingEditorValue>({ leftItems: [], rightItems: [], pairs: [] })
      return <MatchingEditor value={value} onChange={(next) => { setValue(next); onChange(next) }} />
    }
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Thêm cặp ghép' }))
    await user.type(screen.getByLabelText('Mục bên trái 1'), 'Monday')
    await user.type(screen.getByLabelText('Mục bên phải 1'), 'Thứ Hai')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      leftItems: [{ id: expect.any(String), text: 'Monday' }],
      rightItems: [{ id: expect.any(String), text: 'Thứ Hai' }],
    }))
    expect(screen.queryByText(/JSON/i)).not.toBeInTheDocument()
  })
})
