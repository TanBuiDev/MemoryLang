import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const timersRef = useRef<number[]>([])

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

  return (
    <div className="space-y-4">
      <section
        aria-label="Đấu Boss"
        className={
          'relative min-h-[330px] overflow-hidden rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_#000] ' +
          (battleEvent === 'boss-attack' ? 'animate-pulse' : '')
        }
        style={{
          backgroundImage: `url("${ASSETS.background}")`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-x-0 top-0 z-20 grid grid-cols-2 gap-3 bg-slate-950/75 p-3 text-white backdrop-blur-sm">
          <BattleBar
            label="Bạn"
            value={displayPlayerHpPercent}
            detail={`${displayPlayerHp}/${snapshot.playerMaxHp} HP`}
            icon={<Heart className="h-4 w-4 fill-current" />}
            fillClass="bg-emerald-400"
          />
          <BattleBar
            label="Rune Beetle"
            value={snapshot.bossHpPercent}
            detail={`${snapshot.bossHp}/${snapshot.bossMaxHp} HP`}
            icon={<ShieldAlert className="h-4 w-4" />}
            fillClass="bg-rose-500"
          />
        </div>

        <div className="absolute inset-x-4 bottom-4 z-20 rounded-xl border-2 border-slate-900 bg-white/90 p-2 shadow-[3px_3px_0px_#000]">
          <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase text-slate-800">
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-indigo-700" />
              Kỹ năng kết liễu
            </span>
            <span>{snapshot.skillReady ? 'Sẵn sàng!' : snapshot.skillPercent + '%'}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-slate-900 bg-white">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: snapshot.skillPercent + '%' }}
            />
          </div>
        </div>

        <div className="absolute inset-0 z-10 flex items-center justify-center pt-12 pb-14">
          <img
            src={bossImage}
            alt="Rune Beetle"
            draggable={false}
            className={
              'h-[230px] w-[230px] select-none object-contain drop-shadow-2xl transition-transform duration-200 sm:h-[260px] sm:w-[260px] ' +
              (battleEvent === 'boss-hit'
                ? 'scale-95 -rotate-3'
                : battleEvent === 'boss-attack'
                  ? 'scale-110 translate-x-3'
                  : battleEvent === 'finisher'
                    ? 'scale-110'
                    : battleEvent === 'defeated'
                      ? 'translate-y-6 scale-90 opacity-80'
                      : 'animate-bounce')
            }
          />

          {battleEvent === 'boss-hit' ? (
            <>
              <img
                src={ASSETS.effects.slash}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute h-52 w-52 animate-pulse object-contain"
              />
              <img
                src={ASSETS.effects.impact}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute h-36 w-36 object-contain"
              />
            </>
          ) : null}

          {battleEvent === 'finisher' ? (
            <img
              src={ASSETS.effects.finisher}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute h-80 w-80 animate-pulse object-contain"
            />
          ) : null}

          {snapshot.skillReady && battleEvent === 'idle' ? (
            <div className="absolute right-4 top-24 flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-[#fdc800] px-3 py-2 font-black text-slate-900 shadow-[3px_3px_0px_#000]">
              <img src={ASSETS.skillReady} alt="" aria-hidden="true" className="h-8 w-8" />
              <span className="text-xs uppercase">Finisher Ready</span>
            </div>
          ) : null}

          {battleEvent === 'finisher' ? (
            <div className="absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 text-center">
              <span className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-[#fdc800] px-5 py-3 text-xl font-black uppercase text-slate-900 shadow-[5px_5px_0px_#000]">
                <Sparkles className="h-6 w-6" /> Đòn kết liễu!
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
}: {
  label: string
  value: number
  detail: string
  icon: React.ReactNode
  fillClass: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-black">
        <span className="flex items-center gap-1.5 truncate">{icon}{label}</span>
        <span className="shrink-0">{detail}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-white/90 bg-slate-900">
        <div
          className={'h-full transition-all duration-500 ' + fillClass}
          style={{ width: Math.max(0, Math.min(100, value)) + '%' }}
        />
      </div>
    </div>
  )
}
