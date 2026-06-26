-- Drop ssml_gender column from tts_voice_config
-- Gender is now determined from the Google voice name suffix (-A/-C/-E/-F = Nữ, -B/-D = Nam)

ALTER TABLE public.tts_voice_config DROP COLUMN IF EXISTS ssml_gender;

-- Update seed data for current entries (removing ssml_gender references)
INSERT INTO public.tts_voice_config (language_code, voice_name, speaking_rate, pitch, audio_encoding, enabled) VALUES
  ('en-US', 'en-US-Wavenet-D', 1.0, 0, 'MP3', true),
  ('en-GB', 'en-GB-Wavenet-B', 1.0, 0, 'MP3', true),
  ('vi-VN', 'vi-VN-Wavenet-A', 1.0, 0, 'MP3', true),
  ('ja-JP', 'ja-JP-Wavenet-B', 1.0, 0, 'MP3', true),
  ('ko-KR', 'ko-KR-Wavenet-B', 1.0, 0, 'MP3', true),
  ('zh-CN', 'cmn-CN-Wavenet-B', 1.0, 0, 'MP3', true),
  ('fr-FR', 'fr-FR-Wavenet-B', 1.0, 0, 'MP3', true),
  ('de-DE', 'de-DE-Wavenet-B', 1.0, 0, 'MP3', true)
ON CONFLICT (language_code) DO UPDATE SET
  voice_name = EXCLUDED.voice_name,
  speaking_rate = EXCLUDED.speaking_rate,
  pitch = EXCLUDED.pitch,
  audio_encoding = EXCLUDED.audio_encoding,
  enabled = EXCLUDED.enabled;
