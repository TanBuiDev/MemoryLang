import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MascotRadialFab } from './MascotRadialFab'
import { useChatStore } from '@/stores/useChatStore'
import { useAuthStore } from '@/stores/useAuthStore'

vi.mock('./QuickNotesDrawer', () => ({ QuickNotesDrawer: () => null }))
vi.mock('./AddVocabularyModal', () => ({ AddVocabularyModal: () => null }))

describe('MascotRadialFab', () => {
  it('không hiển thị lối thêm từ trực tiếp cho người học', () => {
    useAuthStore.setState({ profile: { is_admin: false } as never })
    render(<MemoryRouter><MascotRadialFab /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: 'Mở menu trợ lý' }))

    expect(screen.queryByTitle('Thêm từ vựng')).not.toBeInTheDocument()
  })

  it('chỉ hiển thị lối thêm từ trực tiếp cho quản trị viên', () => {
    useAuthStore.setState({ profile: { is_admin: true } as never })
    render(<MemoryRouter><MascotRadialFab /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: 'Mở menu trợ lý' }))

    expect(screen.getByTitle('Thêm từ vựng')).toBeInTheDocument()
  })

  it('opens AI Tutor Modal when clicking the AI Tutor button', () => {
    useAuthStore.setState({ profile: { is_admin: false } as never })
    render(<MemoryRouter><MascotRadialFab /></MemoryRouter>)

    const button = screen.getByTitle('Mở Gia sư AI (Ctrl+K)')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(useChatStore.getState().isAiModalOpen).toBe(true)
  })
})
