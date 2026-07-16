import React from 'react'

type LazyModule = { default: React.ComponentType }
type LazyImporter<T extends LazyModule> = () => Promise<T>

interface RecoveryDeps {
  href: string
  reload: () => void
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>
}

const CHUNK_RELOAD_KEY = 'memorylang:chunk-load-reloaded'

export function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'error loading dynamically imported module',
    'Loading chunk',
    'ChunkLoadError',
  ].some((pattern) => message.includes(pattern))
}

function getDefaultRecoveryDeps(): RecoveryDeps | null {
  if (typeof window === 'undefined') return null

  return {
    href: window.location.href,
    reload: () => window.location.reload(),
    sessionStorage: window.sessionStorage,
  }
}

export function recoverFromChunkLoadError(error: unknown, deps = getDefaultRecoveryDeps()) {
  if (!isChunkLoadError(error) || !deps) return false

  const previousHref = deps.sessionStorage.getItem(CHUNK_RELOAD_KEY)
  if (previousHref === deps.href) {
    deps.sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    return false
  }

  deps.sessionStorage.setItem(CHUNK_RELOAD_KEY, deps.href)
  deps.reload()
  return true
}

export function clearChunkLoadRecoveryFlag(deps = getDefaultRecoveryDeps()) {
  deps?.sessionStorage.removeItem(CHUNK_RELOAD_KEY)
}

export function lazyWithChunkRecovery<T extends LazyModule>(importer: LazyImporter<T>) {
  return React.lazy(async () => {
    try {
      const module = await importer()
      clearChunkLoadRecoveryFlag()
      return module
    } catch (error) {
      if (recoverFromChunkLoadError(error)) {
        return new Promise<T>(() => undefined)
      }

      throw error
    }
  })
}
