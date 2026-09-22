import { beforeEach, describe, expect, it, vi } from 'vitest'

const audioCacheGet = vi.fn()
const audioCachePut = vi.fn()
const audioCacheDelete = vi.fn()

vi.mock('@/services/local/studyLocalDb', () => ({
  db: {
    audioCache: {
      get: audioCacheGet,
      put: audioCachePut,
      delete: audioCacheDelete,
    },
  },
}))

class MockAudio {
  static instances: MockAudio[] = []
  static playResults: Array<() => Promise<void>> = []

  currentTime = 0
  readonly pause = vi.fn()
  readonly play = vi.fn(() => MockAudio.playResults.shift()?.() ?? Promise.resolve())
  private readonly listeners = new Map<string, Array<() => void>>()

  readonly src: string

  constructor(src: string) {
    this.src = src
    MockAudio.instances.push(this)
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  emit(type: string) {
    this.listeners.get(type)?.forEach((listener) => listener())
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('audioCache playback coordination', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    MockAudio.instances = []
    MockAudio.playResults = []
    vi.stubGlobal('Audio', MockAudio)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:cached-audio'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('chỉ phát yêu cầu mới nhất khi các lần đọc cache hoàn thành sai thứ tự', async () => {
    const firstLookup = deferred<null>()
    const secondLookup = deferred<null>()
    audioCacheGet
      .mockReturnValueOnce(firstLookup.promise)
      .mockReturnValueOnce(secondLookup.promise)

    const { playCachedOrFetch } = await import('@/services/local/audioCache')
    const firstPlay = playCachedOrFetch('one', 'https://audio.test/one.mp3')
    const secondPlay = playCachedOrFetch('two', 'https://audio.test/two.mp3')

    secondLookup.resolve(null)
    await secondPlay
    firstLookup.resolve(null)
    await firstPlay

    expect(MockAudio.instances).toHaveLength(1)
    expect(MockAudio.instances[0].src).toBe('https://audio.test/two.mp3')
    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1)
  })

  it('bỏ qua blob cache khi URL nguồn của cùng một từ đã thay đổi', async () => {
    audioCacheGet.mockResolvedValue({
      word: 'one',
      blob: new Blob(['old audio']),
      audioUrl: 'https://audio.test/old.mp3',
      cachedAt: '2026-01-01T00:00:00.000Z',
    })

    const { playCachedOrFetch } = await import('@/services/local/audioCache')
    await playCachedOrFetch('one', 'https://audio.test/new.mp3')

    expect(MockAudio.instances).toHaveLength(1)
    expect(MockAudio.instances[0].src).toBe('https://audio.test/new.mp3')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('gọi onEnd khi file audio hiện tại phát xong', async () => {
    audioCacheGet.mockResolvedValue(null)
    const onEnd = vi.fn()

    const { playCachedOrFetch } = await import('@/services/local/audioCache')
    await playCachedOrFetch('one', 'https://audio.test/one.mp3', { onEnd })
    MockAudio.instances[0].emit('ended')

    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('lặp lại file audio theo cấu hình trước khi gọi onEnd', async () => {
    audioCacheGet.mockResolvedValue(null)
    const onEnd = vi.fn()

    const { playCachedOrFetch } = await import('@/services/local/audioCache')
    await playCachedOrFetch('one', 'https://audio.test/one.mp3', { repeat: 2, onEnd })
    MockAudio.instances[0].emit('ended')

    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(2)
    expect(onEnd).not.toHaveBeenCalled()

    MockAudio.instances[0].emit('ended')
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('xóa blob cache lỗi và thử lại bằng URL nguồn', async () => {
    audioCacheGet.mockResolvedValue({
      word: 'one',
      blob: new Blob(['broken audio']),
      audioUrl: 'https://audio.test/one.mp3',
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    MockAudio.playResults = [
      () => Promise.reject(new Error('decode failed')),
      () => Promise.resolve(),
    ]

    const { playCachedOrFetch } = await import('@/services/local/audioCache')
    const played = await playCachedOrFetch('one', 'https://audio.test/one.mp3')

    expect(played).toBe(true)
    expect(audioCacheDelete).toHaveBeenCalledWith('one')
    expect(MockAudio.instances.map((audio) => audio.src)).toEqual([
      'blob:cached-audio',
      'https://audio.test/one.mp3',
    ])
  })
})
