import { describe, expect, it } from 'vitest'
import { needsMediaReplacementConfirmation } from './mediaReplacement'

describe('needsMediaReplacementConfirmation', () => {
  it('requires confirmation only when a published resource replaces an existing media URL', () => {
    expect(needsMediaReplacementConfirmation({ isPublished: true, currentUrl: 'https://cdn.example/old.mp3', nextUrl: 'https://cdn.example/new.mp3' })).toBe(true)
    expect(needsMediaReplacementConfirmation({ isPublished: true, currentUrl: 'https://cdn.example/old.mp3', nextUrl: 'https://cdn.example/old.mp3' })).toBe(false)
    expect(needsMediaReplacementConfirmation({ isPublished: false, currentUrl: 'https://cdn.example/old.mp3', nextUrl: 'https://cdn.example/new.mp3' })).toBe(false)
    expect(needsMediaReplacementConfirmation({ isPublished: true, currentUrl: null, nextUrl: 'https://cdn.example/new.mp3' })).toBe(false)
  })
})
