export const studyHotkeyActions = [
  'confirmRemember',
  'know',
  'dontKnow',
  'flip',
  'previous',
  'next',
  'playAudio',
  'toggleAuto',
  'endSession',
] as const

export type StudyHotkeyAction = typeof studyHotkeyActions[number]
export type StudyHotkeyMap = Record<StudyHotkeyAction, string | null>

export const defaultStudyHotkeys: StudyHotkeyMap = {
  confirmRemember: 'Space',
  know: '1',
  dontKnow: '2',
  flip: 'F',
  previous: 'ArrowLeft',
  next: 'ArrowRight',
  playAudio: null,
  toggleAuto: null,
  endSession: null,
}

interface HotkeyEvent {
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

const modifierKeys = new Set(['Alt', 'Control', 'Meta', 'Shift'])
const supportedPrimaryKey = /^(?:[A-Z0-9]|Space|Arrow(?:Left|Right|Up|Down)|Enter|Escape|Tab|Backspace|F(?:[1-9]|1[0-2]))$/
const modifierOrder = ['Ctrl', 'Alt', 'Shift', 'Meta']

function isSupportedStudyHotkey(hotkey: string) {
  const parts = hotkey.split('+')
  const primaryKey = parts.at(-1)
  if (!primaryKey || !supportedPrimaryKey.test(primaryKey)) return false
  const modifiers = parts.slice(0, -1)
  return modifiers.every((modifier, index) => {
    const order = modifierOrder.indexOf(modifier)
    const previousOrder = index === 0 ? -1 : modifierOrder.indexOf(modifiers[index - 1])
    return order > previousOrder
  })
}

export function hotkeyFromKeyboardEvent(event: HotkeyEvent): string | null {
  if (modifierKeys.has(event.key)) return null

  const key = event.key === ' '
    ? 'Space'
    : event.key.length === 1
      ? event.key.toUpperCase()
      : event.key
  const parts = [
    event.ctrlKey ? 'Ctrl' : null,
    event.altKey ? 'Alt' : null,
    event.shiftKey ? 'Shift' : null,
    event.metaKey ? 'Meta' : null,
    key,
  ].filter(Boolean)

  const hotkey = parts.join('+')
  return isSupportedStudyHotkey(hotkey) ? hotkey : null
}

export function formatStudyHotkey(hotkey: string | null) {
  return hotkey?.replaceAll('+', ' + ') ?? ''
}

export function sanitizeStudyHotkeys(value: unknown): StudyHotkeyMap {
  const stored = value && typeof value === 'object' ? value as Partial<StudyHotkeyMap> : {}
  return Object.fromEntries(
    studyHotkeyActions.map((action) => {
      const hotkey = stored[action]
      return [action, hotkey === null || (typeof hotkey === 'string' && isSupportedStudyHotkey(hotkey))
        ? hotkey
        : defaultStudyHotkeys[action]]
    }),
  ) as StudyHotkeyMap
}

export function duplicateStudyHotkeys(hotkeys: StudyHotkeyMap) {
  const assigned = new Map<string, StudyHotkeyAction>()
  const duplicates = new Set<string>()

  for (const action of studyHotkeyActions) {
    const hotkey = hotkeys[action]
    if (!hotkey) continue
    if (assigned.has(hotkey)) duplicates.add(hotkey)
    else assigned.set(hotkey, action)
  }

  return duplicates
}
