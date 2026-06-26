import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateRequest {
  text: string
  language: string
  voice?: string
}

function hashKey(text: string, lang: string): string {
  const input = `${lang}:${text.toLowerCase().trim()}`
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    hash = hash >>> 0
  }
  return hash.toString(36)
}

function getDefaultVoice(language: string): string {
  const voices: Record<string, string> = {
    en: 'en-US-Wavenet-D',
    'en-US': 'en-US-Wavenet-D',
    'en-GB': 'en-GB-Wavenet-B',
    vi: 'vi-VN-Wavenet-A',
    'vi-VN': 'vi-VN-Wavenet-A',
    ja: 'ja-JP-Wavenet-B',
    'ja-JP': 'ja-JP-Wavenet-B',
    ko: 'ko-KR-Wavenet-B',
    'ko-KR': 'ko-KR-Wavenet-B',
    zh: 'cmn-CN-Wavenet-B',
    'zh-CN': 'cmn-CN-Wavenet-B',
    fr: 'fr-FR-Wavenet-B',
    'fr-FR': 'fr-FR-Wavenet-B',
    de: 'de-DE-Wavenet-B',
    'de-DE': 'de-DE-Wavenet-B',
  }
  return voices[language] ?? 'en-US-Wavenet-D'
}

interface TtsConfig {
  voice_name: string
  speaking_rate: number
  pitch: number
  ssml_gender: string
  audio_encoding: string
}

async function getTtsConfig(language: string): Promise<TtsConfig> {
  const defaults: TtsConfig = {
    voice_name: getDefaultVoice(language),
    speaking_rate: 1.0,
    pitch: 0,
    ssml_gender: 'NEUTRAL',
    audio_encoding: 'MP3',
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data } = await supabase
      .from('tts_voice_config')
      .select('voice_name, speaking_rate, pitch, ssml_gender, audio_encoding')
      .eq('language_code', language)
      .eq('enabled', true)
      .maybeSingle()

    if (data) {
      return {
        voice_name: data.voice_name ?? defaults.voice_name,
        speaking_rate: Number(data.speaking_rate) || defaults.speaking_rate,
        pitch: Number(data.pitch) || defaults.pitch,
        ssml_gender: data.ssml_gender ?? defaults.ssml_gender,
        audio_encoding: data.audio_encoding ?? defaults.audio_encoding,
      }
    }
  } catch {
    // fall through to defaults
  }

  return defaults
}

function getR2Client(): AwsClient {
  return new AwsClient({
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
  })
}

function r2Endpoint(): string {
  const accountId = Deno.env.get('R2_ACCOUNT_ID')
  return `https://${accountId}.r2.cloudflarestorage.com`
}

function getPublicUrl(key: string): string {
  const publicDomain = Deno.env.get('R2_PUBLIC_DOMAIN')
  if (publicDomain) return `${publicDomain}/${key}`

  const bucket = Deno.env.get('R2_BUCKET_NAME') ?? 'memorylang-audio'
  return `${r2Endpoint()}/${bucket}/${key}`
}

async function r2Head(key: string): Promise<boolean> {
  const bucket = Deno.env.get('R2_BUCKET_NAME') ?? 'memorylang-audio'
  const url = `${r2Endpoint()}/${bucket}/${key}`

  try {
    const client = getR2Client()
    const res = await client.fetch(url, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

async function r2Put(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const bucket = Deno.env.get('R2_BUCKET_NAME') ?? 'memorylang-audio'
  const url = `${r2Endpoint()}/${bucket}/${key}`

  const client = getR2Client()
  const res = await client.fetch(url, {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`R2 upload failed: ${res.status} ${err}`)
  }
}

async function getGoogleAccessToken(): Promise<string> {
  const credentialsB64 = Deno.env.get('GOOGLE_TTS_CREDENTIALS_B64')
  if (!credentialsB64) throw new Error('GOOGLE_TTS_CREDENTIALS_B64 not configured')

  const credentials = JSON.parse(atob(credentialsB64))

  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const enc = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const encodedHeader = enc(header)
  const encodedClaims = enc(claims)
  const signInput = `${encodedHeader}.${encodedClaims}`

  const pemContents = credentials.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signInput),
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwt = `${signInput}.${sigB64}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text()
    throw new Error(`Google OAuth failed: ${errBody}`)
  }

  const tokenData = (await tokenRes.json()) as { access_token: string }
  return tokenData.access_token
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, language, voice }: GenerateRequest = await request.json()

    if (!text || !language) {
      return Response.json(
        { error: 'text and language are required' },
        { status: 400, headers: corsHeaders },
      )
    }

    const config = await getTtsConfig(language)
    const voiceName = voice || config.voice_name
    const key = `tts/${language}/${voiceName}/${hashKey(text, language)}.mp3`

    const exists = await r2Head(key)
    if (exists) {
      return Response.json(
        { audioUrl: getPublicUrl(key), cached: true },
        { headers: corsHeaders },
      )
    }

    const accessToken = await getGoogleAccessToken()

    const ttsRes = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: language, name: voiceName, ssmlGender: config.ssml_gender },
        audioConfig: {
          audioEncoding: config.audio_encoding,
          speakingRate: config.speaking_rate,
          pitch: config.pitch,
        },
      }),
    })

    if (!ttsRes.ok) {
      const errBody = await ttsRes.text()
      console.error('Google TTS error:', errBody)
      return Response.json(
        { error: `Google TTS failed: ${errBody}` },
        { status: 500, headers: corsHeaders },
      )
    }

    const ttsData = (await ttsRes.json()) as { audioContent?: string }
    if (!ttsData.audioContent) {
      return Response.json(
        { error: 'No audio content in TTS response' },
        { status: 500, headers: corsHeaders },
      )
    }

    const audioBinary = Uint8Array.from(atob(ttsData.audioContent), (c) => c.charCodeAt(0))
    await r2Put(key, audioBinary, 'audio/mpeg')

    return Response.json(
      { audioUrl: getPublicUrl(key), cached: false },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error('generate-audio error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400, headers: corsHeaders },
    )
  }
})
