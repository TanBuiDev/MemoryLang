import { describe, expect, it } from 'vitest'
import { inferItemType, normalizeText } from '@/utils/normalizeText'

describe('normalizeText', () => {
  it('trims, lowercases, and collapses whitespace', () => {
    expect(normalizeText('  Break   The ICE  ')).toBe('break the ice')
  })

  it('infers words, phrases, idioms, and sentences', () => {
    expect(inferItemType('apple')).toBe('word')
    expect(inferItemType('take care of')).toBe('phrase')
    expect(inferItemType('break the ice')).toBe('idiom')
    expect(inferItemType('I am looking forward to hearing from you.')).toBe('sentence')
  })
})
