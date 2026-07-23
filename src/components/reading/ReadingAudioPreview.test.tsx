import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReadingAudioPreview } from '@/components/reading/ReadingAudioPreview'

describe('ReadingAudioPreview', () => {
  it('lets the admin play and pause generated audio without emoji labels', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {})

    render(<ReadingAudioPreview audioUrl="https://audio.example/article.mp3" />)

    const playButton = screen.getByRole('button', { name: 'Nghe audio' })
    expect(playButton.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)

    fireEvent.click(playButton)
    expect(play).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Dừng audio' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dừng audio' }))
    expect(pause).toHaveBeenCalledOnce()
  })
})
