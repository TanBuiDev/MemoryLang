import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MascotRadialFab } from './MascotRadialFab'

vi.mock('./QuickNotesDrawer', () => ({ QuickNotesDrawer: () => null }))
vi.mock('./AddVocabularyModal', () => ({ AddVocabularyModal: () => null }))

describe('MascotRadialFab', () => {
  it('links the former settings action to AI Tutor', () => {
    render(<MemoryRouter><MascotRadialFab /></MemoryRouter>)

    expect(screen.getByTitle('Mở Gia sư AI')).toHaveAttribute('href', '/app/chat')
  })
})
