import { describe, expect, it } from 'vitest'
import { defaultStudyHotkeys, hotkeyFromKeyboardEvent, sanitizeStudyHotkeys } from '@/features/study/studyHotkeys'

describe('study hotkeys', () => {
  it('creates canonical single-key and modifier shortcuts', () => {
    expect(hotkeyFromKeyboardEvent({ key: ' ', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false })).toBe('Space')
    expect(hotkeyFromKeyboardEvent({ key: 'r', ctrlKey: true, altKey: false, shiftKey: true, metaKey: false })).toBe('Ctrl+Shift+R')
    expect(hotkeyFromKeyboardEvent({ key: 'r', ctrlKey: false, altKey: false, shiftKey: true, metaKey: false })).toBe('Shift+R')
  })

  it('replaces malformed stored shortcuts with defaults', () => {
    expect(sanitizeStudyHotkeys({
      ...defaultStudyHotkeys,
      confirmRemember: '',
      next: 'Ctrl++',
    })).toEqual({
      ...defaultStudyHotkeys,
      confirmRemember: 'Space',
      next: 'ArrowRight',
    })
  })
})
