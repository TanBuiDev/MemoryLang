import { beforeEach, describe, expect, it, vi } from 'vitest'

const playCachedOrFetch = vi.fn()
const cancelAudioPlayback = vi.fn()

vi.mock('@/services/local/audioCache', () => ({
  playCachedOrFetch,
  cancelAudioPlayback,
}))

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: vi.fn(),
  },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('audio speaking coordination', () => {
  const speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('speechSynthesis', speechSynthesis)
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      onend: (() => void) | null = null
      lang = ''
      rate = 1
      pitch = 1
      readonly text: string
      constructor(text: string) {
        this.text = text
      }
    })
  })

  it('không cho yêu cầu cũ rơi xuống SpeechSynthesis sau khi yêu cầu mới đã phát', async () => {
    const firstResult = deferred<boolean>()
    playCachedOrFetch
      .mockReturnValueOnce(firstResult.promise)
      .mockResolvedValueOnce(true)

    const { speak } = await import('@/utils/audio')
    const firstSpeak = speak('one', { audioUrl: 'https://audio.test/one.mp3' })
    await vi.waitFor(() => expect(playCachedOrFetch).toHaveBeenCalledTimes(1))
    await speak('two', { audioUrl: 'https://audio.test/two.mp3' })

    firstResult.resolve(false)
    await firstSpeak

    expect(cancelAudioPlayback).toHaveBeenCalledTimes(2)
    expect(speechSynthesis.speak).not.toHaveBeenCalled()
  })

  it('chuyển callback onEnd xuống trình phát file audio', async () => {
    playCachedOrFetch.mockResolvedValue(true)
    const onEnd = vi.fn()

    const { speak } = await import('@/utils/audio')
    await speak('one', { audioUrl: 'https://audio.test/one.mp3', onEnd })

    expect(playCachedOrFetch).toHaveBeenCalledWith(
      'one',
      'https://audio.test/one.mp3',
      expect.objectContaining({ onEnd: expect.any(Function) })
    )
    const playbackOptions = playCachedOrFetch.mock.calls[0][2]
    playbackOptions.onEnd()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('chuẩn hóa mã ngôn ngữ ngắn trước khi dùng giọng trình duyệt', async () => {
    const { speak } = await import('@/utils/audio')
    await speak('Hallo', { lang: 'de' })

    expect(speechSynthesis.speak).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'de-DE' })
    )
  })
})
