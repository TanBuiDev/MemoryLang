import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMissionAudioCoordinator, parseMissionSoundConfig } from './missionAudio'

afterEach(() => vi.useRealTimers())

describe('mission audio coordinator', () => {
  it('accepts only configured Mission effects from admin sound settings', () => {
    expect(parseMissionSoundConfig({
      engine_mode: 'custom_files',
      custom_urls: {
        matchSuccess: 'https://example.com/right.mp3',
        matchError: 'https://example.com/wrong.mp3',
        roundComplete: 'https://example.com/done.mp3',
        hover: 'https://example.com/hover.mp3',
      },
    })).toEqual({
      mode: 'custom_files',
      urls: {
        matchSuccess: 'https://example.com/right.mp3',
        matchError: 'https://example.com/wrong.mp3',
        roundComplete: 'https://example.com/done.mp3',
      },
    })
    expect(parseMissionSoundConfig(null)).toEqual({ mode: 'synth', urls: {} })
  })
  it('plays each Learn term once and stops prior playback on transition', () => {
    const speak = vi.fn()
    const stop = vi.fn()
    const audio = createMissionAudioCoordinator(speak, stop)

    audio.playLearn('attempt-1:0', 'approve', { audioUrl: 'approve.mp3' })
    audio.playLearn('attempt-1:0', 'approve', { audioUrl: 'approve.mp3' })
    expect(speak).toHaveBeenCalledTimes(1)

    audio.transition()
    audio.playLearn('attempt-1:1', 'compete', { audioUrl: 'compete.mp3' })
    expect(stop).toHaveBeenCalled()
    expect(speak).toHaveBeenCalledTimes(2)
  })

  it('replays a correct listening answer only once after the feedback cue and cancels on transition', () => {
    vi.useFakeTimers()
    const events: string[] = []
    const audio = createMissionAudioCoordinator(
      (text) => { events.push('speak:' + text) },
      () => { events.push('stop') },
      (effect) => { events.push('sfx:' + effect) },
    )

    audio.correct('q1', 'approve', { audioUrl: 'approve.mp3' })
    audio.correct('q1', 'approve', { audioUrl: 'approve.mp3' })
    expect(events).toEqual(['sfx:matchSuccess'])
    vi.advanceTimersByTime(450)
    expect(events).toEqual(['sfx:matchSuccess', 'speak:approve'])

    audio.correct('q2', 'compete', { audioUrl: 'compete.mp3' })
    audio.transition()
    vi.runAllTimers()
    expect(events).not.toContain('speak:compete')
  })
})
