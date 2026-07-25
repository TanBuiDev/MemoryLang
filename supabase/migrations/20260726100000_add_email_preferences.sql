-- Migration: Add email preferences to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_digest_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS inactivity_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.email_reminders_enabled IS 'Controls whether daily SRS study reminder emails are sent';
COMMENT ON COLUMN public.profiles.weekly_digest_enabled IS 'Controls whether weekly progress digest emails are sent';
COMMENT ON COLUMN public.profiles.last_reminder_sent_at IS 'Timestamp when the last daily reminder email was sent';
COMMENT ON COLUMN public.profiles.inactivity_paused IS 'Automatically set to true if user is inactive for 14+ days to avoid unnecessary emails';
