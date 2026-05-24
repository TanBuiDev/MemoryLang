import { beforeEach, describe, expect, it } from 'vitest'
import { defaultStudyHotkeys } from '@/features/study/studyHotkeys'
import { useStudyStore } from '@/stores/useStudyStore'

describe('useStudyStore confirmation preferences', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useStudyStore.setState({
      requireRememberConfirmation: false,
      rememberConfirmationSeconds: 2,
      hotkeys: defaultStudyHotkeys,
    })
  })

  it('persists remember confirmation preferences for later sessions', () => {
    const { setRequireRememberConfirmation, setRememberConfirmationSeconds } = useStudyStore.getState()

    setRequireRememberConfirmation(true)
    setRememberConfirmationSeconds(3)

    expect(window.localStorage.getItem('memorylang.study.preferences')).toBe(JSON.stringify({
      requireRememberConfirmation: true,
      rememberConfirmationSeconds: 3,
      hotkeys: defaultStudyHotkeys,
    }))
  })

  it('persists customized flashcard hotkeys with study preferences', () => {
    useStudyStore.getState().setHotkeys({
      ...defaultStudyHotkeys,
      confirmRemember: 'R',
      toggleAuto: 'Ctrl+A',
    })

    expect(useStudyStore.getState().hotkeys.confirmRemember).toBe('R')
    expect(window.localStorage.getItem('memorylang.study.preferences')).toBe(JSON.stringify({
      requireRememberConfirmation: false,
      rememberConfirmationSeconds: 2,
      hotkeys: {
        ...defaultStudyHotkeys,
        confirmRemember: 'R',
        toggleAuto: 'Ctrl+A',
      },
    }))
  })
})
