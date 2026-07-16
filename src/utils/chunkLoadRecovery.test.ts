import { describe, expect, it, vi } from 'vitest'
import { isChunkLoadError, recoverFromChunkLoadError } from '@/utils/chunkLoadRecovery'

function createDeps(href = 'https://builehoangtan.id.vn/app/admin') {
  const store = new Map<string, string>()

  return {
    deps: {
      href,
      reload: vi.fn(),
      sessionStorage: {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        removeItem: vi.fn((key: string) => {
          store.delete(key)
        }),
        setItem: vi.fn((key: string, value: string) => {
          store.set(key, value)
        }),
      },
    },
    store,
  }
}

describe('chunk load recovery', () => {
  it('detects stale dynamic import failures', () => {
    expect(isChunkLoadError(new TypeError(
      'Failed to fetch dynamically imported module: https://builehoangtan.id.vn/assets/AdminDashboardPage-cX0Y_PzL.js'
    ))).toBe(true)
    expect(isChunkLoadError(new Error('Loading chunk AdminDashboardPage failed'))).toBe(true)
    expect(isChunkLoadError(new Error('Regular route error'))).toBe(false)
  })

  it('reloads once for a stale chunk on the current URL', () => {
    const { deps, store } = createDeps()

    expect(recoverFromChunkLoadError(new TypeError('Failed to fetch dynamically imported module'), deps)).toBe(true)
    expect(deps.reload).toHaveBeenCalledTimes(1)
    expect([...store.values()]).toEqual(['https://builehoangtan.id.vn/app/admin'])

    expect(recoverFromChunkLoadError(new TypeError('Failed to fetch dynamically imported module'), deps)).toBe(false)
    expect(deps.reload).toHaveBeenCalledTimes(1)
    expect(deps.sessionStorage.removeItem).toHaveBeenCalled()
  })

  it('does not reload for non-chunk errors', () => {
    const { deps } = createDeps()

    expect(recoverFromChunkLoadError(new Error('Unauthorized'), deps)).toBe(false)
    expect(deps.reload).not.toHaveBeenCalled()
  })
})
