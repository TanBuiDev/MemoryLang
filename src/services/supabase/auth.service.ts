import { supabase } from '@/services/supabase/client'
import { getDefaultUiLanguage } from '@/i18n'
import type { Profile } from '@/types/auth.types'
import type { LanguageCode } from '@/types/language.types'

export interface OnboardingInput {
  userId: string
  nativeLanguage: LanguageCode
  targetLanguage: LanguageCode
  level: string
  goal: string
  dailyGoal: number
}

export const authService = {
  getSession: () => supabase.auth.getSession(),
  onAuthStateChange: (callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(callback),
  signInWithPassword: (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }),
  signUpWithPassword: (email: string, password: string) => supabase.auth.signUp({ email, password }),
  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app/dashboard` },
    }),
  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` }),
  signOut: () => supabase.auth.signOut(),
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error
    return data as Profile | null
  },
  async completeOnboarding(input: OnboardingInput): Promise<Profile> {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: input.userId,
        native_language: input.nativeLanguage,
        current_target_language: input.targetLanguage,
        ui_language: getDefaultUiLanguage(input.nativeLanguage),
        onboarding_completed: true,
      })
      .select('*')
      .single()

    if (profileError) throw profileError

    const { error: languageError } = await supabase.from('language_profiles').insert({
      user_id: input.userId,
      native_language: input.nativeLanguage,
      target_language: input.targetLanguage,
      level: input.level,
      goal: input.goal,
      daily_goal: input.dailyGoal,
    })

    if (languageError) throw languageError

    return profile as Profile
  },
  async updateProfile(
    userId: string,
    input: Partial<Pick<Profile, 'display_name' | 'native_language' | 'current_target_language' | 'ui_language'>>,
  ): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').update(input).eq('id', userId).select('*').single()
    if (error) throw error
    return data as Profile
  },
}
