import { describe, expect, it } from 'vitest'
import { canAccessContent, isProContent } from './contentAccess'

describe('content access helpers', () => {
  it('allows free content for Free and Pro users', () => {
    expect(canAccessContent('free', false)).toBe(true)
    expect(canAccessContent('free', true)).toBe(true)
  })

  it('treats missing access tier as free for backward compatibility', () => {
    expect(canAccessContent(undefined, false)).toBe(true)
    expect(canAccessContent(null, false)).toBe(true)
    expect(isProContent(undefined)).toBe(false)
  })

  it('blocks pro content for Free users', () => {
    expect(canAccessContent('pro', false)).toBe(false)
    expect(isProContent('pro')).toBe(true)
  })

  it('allows pro content for Pro users', () => {
    expect(canAccessContent('pro', true)).toBe(true)
  })
})
