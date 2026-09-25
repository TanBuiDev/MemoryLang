import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Heart, ShieldAlert, Sparkles, Zap } from 'lucide-react'
import { useSoundStore } from '@/stores/useSoundStore'
import type { AnswerRecord } from '../mission.types'
import { calculateBossBattleSnapshot } from '../bossBattle'
import {
  MissionQuestionStage,
  type MissionQuestionStageProps,
} from './MissionQuestionStage'

const ASSETS = {
  background: '/game/boss-battle/art/backgrounds/forest-arena.svg',
  boss: {
    idle: '/game/boss-battle/art/boss/rune-beetle-idle.svg',
    hit: '/game/boss-battle/art/boss/rune-beetle-hit.svg',
    attack: '/game/boss-battle/art/boss/rune-beetle-attack.svg',
    defeated: '/game/boss-battle/art/boss/rune-beetle-defeated.svg',
    finisher: '/game/boss-battle/art/boss/rune-beetle-finisher-hit.svg',
  },
  effects: {
    slash: '/game/boss-battle/art/effects/slash.svg',
    impact: '/game/boss-battle/art/effects/impact.svg',
    finisher: '/game/boss-battle/art/effects/finisher-burst.svg',
  },
  skillReady: '/game/boss-battle/art/ui/skill-ready.svg',
  sfx: {
    playerAttack: '/game/boss-battle/audio/sfx/player-attack.wav',
    bossHit: '/game/boss-battle/audio/sfx/boss-hit.wav',
    bossAttack: '/game/boss-battle/audio/sfx/boss-attack.wav',
    playerHit: '/game/boss-battle/audio/sfx/player-hit.wav',
    skillCharge: '/game/boss-battle/audio/sfx/skill-charge.wav',
    finisher: '/game/boss-battle/audio/sfx/finisher.wav',
    victory: '/game/boss-battle/audio/sfx/victory.wav',
  },
  bgm: '/game/boss-battle/audio/bgm/boss-battle-loop.wav',
} as const

type BattleEvent = 'idle' | 'boss-hit' | 'boss-attack' | 'finisher' | 'defeated'

interface MissionBossBattleStageProps
  extends Omit<
    MissionQuestionStageProps,
    'stageType' | 'bossHpPercent' | 'showBossHud' | 'interactionLocked'
  > {
  answers: AnswerRecord[]
  bossQuestionIds: string[]
}

export function MissionBossBattleStage({
  answers,
  bossQuestionIds,
  question,
  feedback,
  ...questionProps
}: MissionBossBattleStageProps) {
  const sfxEnabled = useSoundStore((state) => state.sfxEnabled)
  const sfxVolume = useSoundStore((state) => state.sfxVolume)
  const [battleEvent, setBattleEvent] = useState<BattleEvent>('idle')
  const [interactionLocked, setInteractionLocked] = useState(false)
  const [typingFocused, setTypingFocused] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const timersRef = useRef<number[]>([])

  const compactMode = typingFocused || keyboardVisible

  const snapshot = useMemo(
    () => calculateBossBattleSnapshot(bossQuestionIds, answers),
    [answers, bossQuestionIds],
  )

  const pendingWrong = feedback && !feedback.correct && !feedback.finalized ? 1 : 0
  const displayPlayerHp = Math.max(0, snapshot.playerHp - pendingWrong)
  const displayPlayerHpPercent = Math.round(
    (displayPlayerHp / snapshot.playerMaxHp) * 100,
  )

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer)
    timersRef.current = []
  }, [])

  const playSfx = useCallback((url: string, volumeScale = 1) => {
    if (!sfxEnabled || typeof Audio === 'undefined') return
    const audio = new Audio(url)
    audio.volume = Math.max(0, Math.min(1, sfxVolume * volumeScale))
    void audio.play().catch(() => undefined)
  }, [sfxEnabled, sfxVolume])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const viewport = window.visualViewport
    const updateKeyboardState = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height)
      setKeyboardVisible(keyboardHeight > 120)
    }

    updateKeyboardState()
    viewport.addEventListener('resize', updateKeyboardState)
    viewport.addEventListener('scroll', updateKeyboardState)

    return () => {
      viewport.removeEventListener('resize', updateKeyboardState)
      viewport.removeEventListener('scroll', updateKeyboardState)
    }
  }, [])

  useEffect(() => {
    if (!sfxEnabled || typeof Audio === 'undefined') {
      bgmRef.current?.pause()
      bgmRef.current = null
      return
    }

    const bgm = new Audio(ASSETS.bgm)
    bgm.loop = true
    bgm.volume = Math.max(0, Math.min(0.22, sfxVolume * 0.22))
    bgmRef.current = bgm
    void bgm.play().catch(() => undefined)

    return () => {
      bgm.pause()
      bgm.currentTime = 0
      if (bgmRef.current === bgm) bgmRef.current = null
    }
  }, [sfxEnabled, sfxVolume])

  useEffect(() => {
    clearTimers()

    if (!feedback) {
      setBattleEvent(snapshot.defeated ? 'defeated' : 'idle')
      setInteractionLocked(false)
      return
    }

    if (!feedback.correct) {
      setBattleEvent('boss-attack')
      setInteractionLocked(true)
      playSfx(ASSETS.sfx.bossAttack, 0.9)
      timersRef.current.push(window.setTimeout(() => {
        playSfx(ASSETS.sfx.playerHit, 0.9)
      }, 160))
      timersRef.current.push(window.setTimeout(() => {
        setBattleEvent(snapshot.defeated ? 'defeated' : 'idle')
        setInteractionLocked(false)
      }, 720))
      return clearTimers
    }

    if (snapshot.defeated) {
      setBattleEvent('finisher')
      setInteractionLocked(true)
      playSfx(ASSETS.sfx.skillCharge, 0.9)
      timersRef.current.push(window.setTimeout(() => {
        playSfx(ASSETS.sfx.finisher, 1)
      }, 260))
      timersRef.current.push(window.setTimeout(() => {
        setBattleEvent('defeated')
        playSfx(ASSETS.sfx.victory, 0.9)
      }, 1050))
      timersRef.current.push(window.setTimeout(() => {
        setInteractionLocked(false)
      }, 1550))
      return clearTimers
    }

    setBattleEvent('boss-hit')
    setInteractionLocked(true)
    playSfx(ASSETS.sfx.playerAttack, 0.85)
    timersRef.current.push(window.setTimeout(() => {
      playSfx(ASSETS.sfx.bossHit, 0.85)
    }, 120))
    timersRef.current.push(window.setTimeout(() => {
      setBattleEvent('idle')
      setInteractionLocked(false)
    }, 620))

    return clearTimers
  }, [
    clearTimers,
    feedback?.correct,
    feedback?.finalized,
    feedback?.text,
    playSfx,
    question.id,
    snapshot.defeated,
  ])

  useEffect(() => clearTimers, [clearTimers])

  const bossImage =
    battleEvent === 'boss-hit'
      ? ASSETS.boss.hit
      : battleEvent === 'boss-attack'
        ? ASSETS.boss.attack
        : battleEvent === 'finisher'
          ? ASSETS.boss.finisher
          : battleEvent === 'defeated'
            ? ASSETS.boss.defeated
            : ASSETS.boss.idle

  const battleStatus =
    battleEvent === 'boss-attack'
      ? 'Boss đang phản công'
      : battleEvent === 'boss-hit'
        ? 'Boss trúng đòn'
        : battleEvent === 'finisher'
          ? 'Đang tung đòn kết liễu'
          : battleEvent === 'defeated'
            ? 'Boss đã bị đánh bại'
            : 'Sẵn sàng chiến đấu'

  return (
    <div className="space-y-3 sm:space-y-4">
      <section
        aria-label="Đấu Boss"
        className={
          'relative overflow-hidden rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_#000] transition-[height,transform] duration-200 ' +
          'max-md:sticky max-md:top-[4.5rem] max-md:z-30 md:relative md:top-auto ' +
          (compactMode ? 'h-[165px] md:h-[330px] ' : 'h-[270px] md:h-[330px] ') +
          (battleEvent === 'boss-attack' ? 'animate-pulse' : '')
        }
        style={{
          backgroundImage: `url("${ASSETS.background}")`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <span className="sr-only" aria-live="polite">{battleStatus}</span>

        <div
          className={
            'absolute inset-x-0 top-0 z-20 grid grid-cols-2 bg-slate-950/80 text-white backdrop-blur-sm transition-all ' +
            (compactMode ? 'gap-2 p-1.5 md:gap-3 md:p-3' : 'gap-3 p-2.5 md:p-3')
          }
        >
          <BattleBar
            label="Bạn"
            value={displayPlayerHpPercent}
            detail={`${displayPlayerHp}/${snapshot.playerMaxHp} HP`}
            icon={<Heart className="h-3.5 w-3.5 fill-current md:h-4 md:w-4" />}
            fillClass="bg-emerald-400"
            compact={compactMode}
          />
          <BattleBar
            label="Rune Beetle"
            value={snapshot.bossHpPercent}
            detail={`${snapshot.bossHp}/${snapshot.bossMaxHp} HP`}
            icon={<ShieldAlert className="h-3.5 w-3.5 md:h-4 md:w-4" />}
            fillClass="bg-rose-500"
            compact={compactMode}
          />
        </div>

        <div
          className={
            'absolute z-20 rounded-xl border-2 border-slate-900 bg-white/92 shadow-[3px_3px_0px_#000] transition-all ' +
            (compactMode
              ? 'inset-x-2 bottom-2 p-1.5 md:inset-x-4 md:bottom-4 md:p-2'
              : 'inset-x-3 bottom-3 p-2 md:inset-x-4 md:bottom-4')
          }
        >
          <div
            className={
              'flex items-center justify-between font-black uppercase text-slate-800 ' +
              (compactMode ? 'mb-0.5 text-[9px] md:mb-1 md:text-[11px]' : 'mb-1 text-[10px] md:text-[11px]')
            }
          >
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-indigo-700 md:h-3.5 md:w-3.5" />
              <span className={compactMode ? 'max-md:hidden' : ''}>Kỹ năng kết liễu</span>
              <span className={compactMode ? 'md:hidden' : 'hidden'}>Skill</span>
            </span>
            <span>{snapshot.skillReady ? 'Sẵn sàng!' : snapshot.skillPercent + '%'}</span>
          </div>
          <div
            className={
              'overflow-hidden rounded-full border-2 border-slate-900 bg-white ' +
              (compactMode ? 'h-2 md:h-3' : 'h-2.5 md:h-3')
            }
          >
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: snapshot.skillPercent + '%' }}
            />
          </div>
        </div>

        <div
          className={
            'absolute inset-x-0 z-10 flex items-center justify-center overflow-hidden transition-all ' +
            (compactMode
              ? 'top-[46px] bottom-[38px] md:top-[58px] md:bottom-[58px]'
              : 'top-[52px] bottom-[50px] md:top-[58px] md:bottom-[58px]')
          }
        >
          <img
            src={bossImage}
            alt="Rune Beetle"
            draggable={false}
            className={
              'select-none object-contain drop-shadow-2xl transition-[transform,opacity,height,width] duration-200 ' +
              (compactMode
                ? 'h-[86px] w-[86px] md:h-[220px] md:w-[220px] '
                : 'h-[165px] w-[165px] md:h-[230px] md:w-[230px] ') +
              (battleEvent === 'boss-hit'
                ? 'scale-95 -rotate-3'
                : battleEvent === 'boss-attack'
                  ? 'scale-105 translate-x-2'
                  : battleEvent === 'finisher'
                    ? 'scale-105'
                    : battleEvent === 'defeated'
                      ? 'translate-y-2 scale-90 opacity-80'
                      : 'animate-bounce')
            }
          />

          {battleEvent === 'boss-hit' ? (
            <>
              <img
                src={ASSETS.effects.slash}
                alt=""
                aria-hidden="true"
                className={
                  'pointer-events-none absolute animate-pulse object-contain ' +
                  (compactMode ? 'h-24 w-24 md:h-52 md:w-52' : 'h-36 w-36 md:h-52 md:w-52')
                }
              />
              <img
                src={ASSETS.effects.impact}
                alt=""
                aria-hidden="true"
                className={
                  'pointer-events-none absolute object-contain ' +
                  (compactMode ? 'h-16 w-16 md:h-36 md:w-36' : 'h-24 w-24 md:h-36 md:w-36')
                }
              />
            </>
          ) : null}

          {battleEvent === 'finisher' ? (
            <img
              src={ASSETS.effects.finisher}
              alt=""
              aria-hidden="true"
              className={
                'pointer-events-none absolute animate-pulse object-contain ' +
                (compactMode ? 'h-32 w-32 md:h-80 md:w-80' : 'h-52 w-52 md:h-80 md:w-80')
              }
            />
          ) : null}

          {snapshot.skillReady && battleEvent === 'idle' && !compactMode ? (
            <div className="absolute right-3 top-3 flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-[#fdc800] px-2.5 py-1.5 font-black text-slate-900 shadow-[3px_3px_0px_#000] md:right-4 md:top-6 md:px-3 md:py-2">
              <img src={ASSETS.skillReady} alt="" aria-hidden="true" className="h-7 w-7 md:h-8 md:w-8" />
              <span className="text-[10px] uppercase md:text-xs">Finisher Ready</span>
            </div>
          ) : null}

          {battleEvent === 'finisher' ? (
            <div className="absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 text-center">
              <span
                className={
                  'inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-[#fdc800] font-black uppercase text-slate-900 shadow-[5px_5px_0px_#000] ' +
                  (compactMode ? 'px-3 py-1.5 text-xs md:px-5 md:py-3 md:text-xl' : 'px-4 py-2 text-base md:px-5 md:py-3 md:text-xl')
                }
              >
                <Sparkles className="h-4 w-4 md:h-6 md:w-6" /> Đòn kết liễu!
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <MissionQuestionStage
        {...questionProps}
        question={question}
        feedback={feedback}
        stageType="boss"
        bossHpPercent={snapshot.bossHpPercent}
        showBossHud={false}
        interactionLocked={interactionLocked}
        compactMode={compactMode}
        onTypingFocusChange={setTypingFocused}
      />
    </div>
  )
}

function BattleBar({
  label,
  value,
  detail,
  icon,
  fillClass,
  compact,
}: {
  label: string
  value: number
  detail: string
  icon: ReactNode
  fillClass: string
  compact: boolean
}) {
  return (
    <div>
      <div
        className={
          'flex items-center justify-between gap-1 font-black ' +
          (compact ? 'mb-0.5 text-[10px] md:mb-1 md:text-xs' : 'mb-1 text-[11px] md:text-xs')
        }
      >
        <span className="flex min-w-0 items-center gap-1 truncate md:gap-1.5">{icon}{label}</span>
        <span className="shrink-0">{detail}</span>
      </div>
      <div
        className={
          'overflow-hidden rounded-full border-2 border-white/90 bg-slate-900 ' +
          (compact ? 'h-2.5 md:h-3' : 'h-3')
        }
      >
        <div
          className={'h-full transition-all duration-500 ' + fillClass}
          style={{ width: Math.max(0, Math.min(100, value)) + '%' }}
        />
      </div>
    </div>
  )
}
