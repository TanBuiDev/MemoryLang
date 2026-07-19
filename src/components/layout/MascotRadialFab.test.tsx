import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MascotRadialFab } from './MascotRadialFab'
import { useChatStore } from '@/stores/useChatStore'

vi.mock('./QuickNotesDrawer', () => ({ QuickNotesDrawer: () => null }))
vi.mock('./AddVocabularyModal', () => ({ AddVocabularyModal: () => null }))

describe('MascotRadialFab', () => {
  it('opens AI Tutor Modal when clicking the AI Tutor button', () => {
    render(<MemoryRouter><MascotRadialFab /></MemoryRouter>)

    const button = screen.getByTitle('Mở Gia sư AI (Ctrl+K)')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(useChatStore.getState().isAiModalOpen).toBe(true)
  })
})
