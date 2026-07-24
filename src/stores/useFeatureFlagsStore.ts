import { create } from 'zustand'
import { supabase } from '@/services/supabase/client'
import type { FeatureFlag } from '@/types/admin.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface FeatureFlagsState {
  flags: Record<string, boolean>
  isLoaded: boolean
  channel: RealtimeChannel | null

  loadFlags: () => Promise<void>
  isFeatureEnabled: (flagKey?: string, defaultVal?: boolean) => boolean
  setFlag: (flagKey: string, enabled: boolean) => void
  subscribeToRealtime: () => void
  unsubscribe: () => void
}

// Mặc định tất cả các flag chính đều bật (trừ các module chưa ra mắt)
const DEFAULT_FLAGS: Record<string, boolean> = {
  // Main Nav Items
  grammar_module: true,
  vocabulary_module: true,
  listening_module: true,
  speaking_module: true,
  reading_module: true,
  writing_module: true,
  games_module: true,

  // More Dropdown Items
  dashboard_nav: true,
  decks_nav: true,
  study_nav: true,
  quiz_nav: true,
  review_nav: true,
  roadmap_module: true,
  exams_module: true,
  videos_module: true,
  blog_module: true,
  community_module: true,
  contact_module: true,

  // Header Action Controls
  ai_tutor_button: true,
  pro_upgrade_button: true,
  notifications_button: true,
  profile_menu_button: true,

  // Unreleased & Feature Extensions
  template_builder: false,
  matching_quiz: false,
  fill_blank_quiz: false,
  google_oauth: true,
  image_search: true,
  tts_auto_generate: true,
  mascot_radial_fab: true,
  learning_analytics_dashboard: true,
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: DEFAULT_FLAGS,
  isLoaded: false,
  channel: null,

  async loadFlags() {
    try {
      const { data, error } = await supabase.from('feature_flags').select('flag, enabled')
      if (error) {
        console.warn('Failed to load feature flags from Supabase, using defaults:', error.message)
        set({ isLoaded: true })
        return
      }

      if (data && Array.isArray(data)) {
        const flagMap: Record<string, boolean> = { ...DEFAULT_FLAGS }
        data.forEach((item) => {
          if (item.flag) {
            flagMap[item.flag] = Boolean(item.enabled)
          }
        })
        set({ flags: flagMap, isLoaded: true })
      } else {
        set({ isLoaded: true })
      }
    } catch (err) {
      console.warn('Error loading feature flags:', err)
      set({ isLoaded: true })
    }
  },

  isFeatureEnabled(flagKey?: string, defaultVal = true) {
    if (!flagKey) return true
    const { flags } = get()
    if (Object.prototype.hasOwnProperty.call(flags, flagKey)) {
      return flags[flagKey]
    }
    return defaultVal
  },

  setFlag(flagKey: string, enabled: boolean) {
    set((state) => ({
      flags: {
        ...state.flags,
        [flagKey]: enabled,
      },
    }))
  },

  subscribeToRealtime() {
    const currentChannel = get().channel
    if (currentChannel) return // Đã đăng ký rồi

    const newChannel = supabase
      .channel('public:feature_flags')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_flags' },
        (payload) => {
          const newRow = payload.new as Partial<FeatureFlag> | null
          if (newRow && newRow.flag) {
            get().setFlag(newRow.flag, Boolean(newRow.enabled))
          }
        }
      )
      .subscribe()

    set({ channel: newChannel })
  },

  unsubscribe() {
    const { channel } = get()
    if (channel) {
      void supabase.removeChannel(channel)
      set({ channel: null })
    }
  },
}))
