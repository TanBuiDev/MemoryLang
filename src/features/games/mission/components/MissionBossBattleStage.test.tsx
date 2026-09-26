import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MissionBossBattleStage } from './MissionBossBattleStage'
import type { QuestionDefinition } from '../mission.types'
import { FALLBACK_BOSS_BACKGROUND } from '../bossBattleAssets'

const sampleQuestion: QuestionDefinition = {
  id: 'boss-q1',
  type: 'context_cloze',
  targetTermId: 'term-boss',
  prompt: 'Complete this sentence',
  acceptedAnswers: ['victory'],
}

const actions = {
  onAnswerChange: vi.fn(),
  onSubmit: vi.fn(),
  onNext: vi.fn(),
  onPlayAudio: vi.fn(),
  onHint: vi.fn(),
  onShowTranslation: vi.fn(),
  onSkip: vi.fn(),
}

describe('MissionBossBattleStage background rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders theme 1 (forest-sunlit-enchanted) for missionIndex 0 (Mission 1)', () => {
    const { container } = render(
      <MissionBossBattleStage
        {...actions}
        missionIndex={0}
        answers={[]}
        bossQuestionIds={['boss-q1']}
        question={sampleQuestion}
        index={0}
        total={1}
        answerValue=""
        hintLevel={0}
        contextTranslation={null}
        contextTranslationShown={false}
        feedback={null}
        isLastQuestion={true}
      />,
    )

    const source = container.querySelector('picture source')
    const img = container.querySelector('picture img')

    expect(source?.getAttribute('srcSet')).toBe(
      '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-mobile.webp',
    )
    expect(img?.getAttribute('src')).toBe(
      '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-desktop.webp',
    )
  })

  it('renders theme 2 (forest-peaceful-shrine) for missionIndex 1 (Mission 2)', () => {
    const { container } = render(
      <MissionBossBattleStage
        {...actions}
        missionIndex={1}
        answers={[]}
        bossQuestionIds={['boss-q1']}
        question={sampleQuestion}
        index={0}
        total={1}
        answerValue=""
        hintLevel={0}
        contextTranslation={null}
        contextTranslationShown={false}
        feedback={null}
        isLastQuestion={true}
      />,
    )

    const source = container.querySelector('picture source')
    const img = container.querySelector('picture img')

    expect(source?.getAttribute('srcSet')).toBe(
      '/game/boss-battle/art/backgrounds/webp/forest-peaceful-shrine-mobile.webp',
    )
    expect(img?.getAttribute('src')).toBe(
      '/game/boss-battle/art/backgrounds/webp/forest-peaceful-shrine-desktop.webp',
    )
  })

  it('renders theme 3 (meadow-rpg-mountains) for missionIndex 2 (Mission 3)', () => {
    const { container } = render(
      <MissionBossBattleStage
        {...actions}
        missionIndex={2}
        answers={[]}
        bossQuestionIds={['boss-q1']}
        question={sampleQuestion}
        index={0}
        total={1}
        answerValue=""
        hintLevel={0}
        contextTranslation={null}
        contextTranslationShown={false}
        feedback={null}
        isLastQuestion={true}
      />,
    )

    const source = container.querySelector('picture source')
    const img = container.querySelector('picture img')

    expect(source?.getAttribute('srcSet')).toBe(
      '/game/boss-battle/art/backgrounds/webp/meadow-rpg-mountains-mobile.webp',
    )
    expect(img?.getAttribute('src')).toBe(
      '/game/boss-battle/art/backgrounds/webp/meadow-rpg-mountains-desktop.webp',
    )
  })

  it('renders theme 4 (valley-snowy-mountains) for missionIndex 3 (Mission 4)', () => {
    const { container } = render(
      <MissionBossBattleStage
        {...actions}
        missionIndex={3}
        answers={[]}
        bossQuestionIds={['boss-q1']}
        question={sampleQuestion}
        index={0}
        total={1}
        answerValue=""
        hintLevel={0}
        contextTranslation={null}
        contextTranslationShown={false}
        feedback={null}
        isLastQuestion={true}
      />,
    )

    const source = container.querySelector('picture source')
    const img = container.querySelector('picture img')

    expect(source?.getAttribute('srcSet')).toBe(
      '/game/boss-battle/art/backgrounds/webp/valley-snowy-mountains-mobile.webp',
    )
    expect(img?.getAttribute('src')).toBe(
      '/game/boss-battle/art/backgrounds/webp/valley-snowy-mountains-desktop.webp',
    )
  })

  it('loops back to theme 1 for missionIndex 4 (Mission 5)', () => {
    const { container } = render(
      <MissionBossBattleStage
        {...actions}
        missionIndex={4}
        answers={[]}
        bossQuestionIds={['boss-q1']}
        question={sampleQuestion}
        index={0}
        total={1}
        answerValue=""
        hintLevel={0}
        contextTranslation={null}
        contextTranslationShown={false}
        feedback={null}
        isLastQuestion={true}
      />,
    )

    const source = container.querySelector('picture source')
    const img = container.querySelector('picture img')

    expect(source?.getAttribute('srcSet')).toBe(
      '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-mobile.webp',
    )
    expect(img?.getAttribute('src')).toBe(
      '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-desktop.webp',
    )
  })

  it('falls back to default theme when missionIndex is undefined', () => {
    const { container } = render(
      <MissionBossBattleStage
        {...actions}
        answers={[]}
        bossQuestionIds={['boss-q1']}
        question={sampleQuestion}
        index={0}
        total={1}
        answerValue=""
        hintLevel={0}
        contextTranslation={null}
        contextTranslationShown={false}
        feedback={null}
        isLastQuestion={true}
      />,
    )

    const source = container.querySelector('picture source')
    const img = container.querySelector('picture img')

    expect(source?.getAttribute('srcSet')).toBe(
      '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-mobile.webp',
    )
    expect(img?.getAttribute('src')).toBe(
      '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-desktop.webp',
    )
  })

  it('falls back to svg asset when desktop image fails to load', () => {
    const { container } = render(
      <MissionBossBattleStage
        {...actions}
        missionIndex={2}
        answers={[]}
        bossQuestionIds={['boss-q1']}
        question={sampleQuestion}
        index={0}
        total={1}
        answerValue=""
        hintLevel={0}
        contextTranslation={null}
        contextTranslationShown={false}
        feedback={null}
        isLastQuestion={true}
      />,
    )

    const img = container.querySelector('picture img') as HTMLImageElement
    expect(img).not.toBeNull()

    fireEvent.error(img)
    expect(img.src).toContain(FALLBACK_BOSS_BACKGROUND)
  })
})
