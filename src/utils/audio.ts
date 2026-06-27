import { supabase } from '@/services/supabase/client'

export interface SpeakOptions {
  lang?: string
  rate?: number
  pitch?: number
  repeat?: number
  onEnd?: () => void
  audioUrl?: string | null
  variant?: string | null
  globalTermId?: string | null
}

let lastSpeakId = 0
const ttsConfigsCache: Record<string, any> = {}

async function getVoiceConfig(languageCode: string) {
  if (ttsConfigsCache[languageCode]) return ttsConfigsCache[languageCode]

  try {
    const { data } = await supabase
      .from('tts_voice_config')
      .select('*')
      .eq('language_code', languageCode)
      .eq('enabled', true)
      .maybeSingle()

    if (data) {
      ttsConfigsCache[languageCode] = data
      return data
    }
  } catch (err) {
    console.error('Failed to fetch TTS config:', err)
  }
  return null
}

export async function speak(text: string, options: SpeakOptions = {}) {
  const ttsText = options.variant || text
  const langCode = options.lang ?? 'en-US'

  console.log('[speak] Starting for:', text, '| audioUrl:', options.audioUrl ? 'YES' : 'NO', '| globalTermId:', options.globalTermId)

  // 1. Play from static audioUrl (DB-stored, fastest — no Edge Function)
  if (options.audioUrl) {
    console.log('[speak] Step 1: Trying audioUrl:', options.audioUrl)
    const { playCachedOrFetch } = await import('@/services/local/audioCache')
    try {
      const played = await playCachedOrFetch(text, options.audioUrl)
      console.log('[speak] Step 1 result:', played ? 'SUCCESS' : 'FAILED')
      if (played) return true
    } catch (err) {
      console.error('[speak] Step 1 error:', err)
    }
  }

  // 2. Generate dynamic audio via Edge Function (only when no audioUrl available)
  const { isSupabaseConfigured } = await import('@/services/supabase/client')
  console.log('[speak] Step 2: supabase configured:', isSupabaseConfigured)
  if (isSupabaseConfigured) {
    const config = await getVoiceConfig(langCode)
    console.log('[speak] Step 2: voice config:', config ? config.voice_name : 'NONE')
    if (config) {
      try {
        const { generateAudio } = await import('@/services/api/generateAudio.api')
        const res = await generateAudio(ttsText, langCode, config.voice_name, options.globalTermId ?? undefined)
        console.log('[speak] Step 2: generated audioUrl:', res.audioUrl)
        if (res.audioUrl) {
          const { playCachedOrFetch } = await import('@/services/local/audioCache')
          const played = await playCachedOrFetch(text, res.audioUrl)
          console.log('[speak] Step 2 play result:', played ? 'SUCCESS' : 'FAILED')
          if (played) return true
        }
      } catch (err) {
        console.error('[speak] Step 2 error:', err)
      }
    }
  }

  // 3. Browser SpeechSynthesis fallback
  console.log('[speak] Step 3: FALLBACK to browser SpeechSynthesis')
  if (!('speechSynthesis' in window)) return false

  window.speechSynthesis.cancel()
  lastSpeakId++
  const speakId = lastSpeakId

  const utterance = new SpeechSynthesisUtterance(ttsText)
  utterance.lang = options.lang ?? 'en-US'
  utterance.rate = options.rate ?? 1
  utterance.pitch = options.pitch ?? 1

  const repeat = Math.max(1, options.repeat ?? 1)
  let completed = 0

  function speakOnce() {
    if (speakId !== lastSpeakId) return
    completed++
    if (completed <= repeat) {
      utterance.onend = completed < repeat ? speakOnce : (options.onEnd ?? null)
      window.speechSynthesis.speak(utterance)
    }
  }

  speakOnce()
  return true
}

export function speakVI(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) return false

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  utterance.rate = 0.9
  utterance.pitch = 1
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
  return true
}
