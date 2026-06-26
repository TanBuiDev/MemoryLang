import { supabase } from '@/services/supabase/client'

interface GenerateAudioResponse {
  audioUrl: string | null
  cached: boolean
}

export async function generateAudio(
  text: string,
  language: string,
  voice?: string,
  globalTermId?: string,
): Promise<GenerateAudioResponse> {
  const { data, error } = await supabase.functions.invoke<GenerateAudioResponse>('generate-audio', {
    body: { text, language, voice, globalTermId },
  })

  if (!error && data?.audioUrl) {
    return { audioUrl: data.audioUrl, cached: data.cached }
  }

  if (error) console.error('generate-audio invoke error:', error)

  return { audioUrl: null, cached: false }
}
