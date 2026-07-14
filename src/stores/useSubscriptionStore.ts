import { create } from 'zustand'
import { subscriptionService } from '@/services/supabase/subscription.service'
import type { Subscription } from '@/types/subscription.types'
import { FREE_LIMITS } from '@/types/subscription.types'
import { supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'

interface SubscriptionState {
  subscription: Subscription | null
  isLoading: boolean
  termCount: number
  deckCount: number

  // Computed-like getters (cập nhật khi subscription thay đổi)
  isPro: boolean
  isFree: boolean
  canAddTerm: boolean
  canAddDeck: boolean

  // Actions
  loadSubscription: () => Promise<void>
  updateCounts: (terms: number, decks: number) => void
  setSubscription: (sub: Subscription | null) => void
  reset: () => void
}

const computeState = (
  sub: Subscription | null,
  termCount: number,
  deckCount: number
) => {
  const isPro =
    sub?.plan_type === 'pro' &&
    (sub.status === 'active' || sub.status === 'trialing')
  return {
    isPro,
    isFree: !isPro,
    canAddTerm: isPro || termCount < FREE_LIMITS.maxTerms,
    canAddDeck: isPro || deckCount < FREE_LIMITS.maxDecks,
  }
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  isLoading: false,
  termCount: 0,
  deckCount: 0,
  isPro: false,
  isFree: true,
  canAddTerm: true,
  canAddDeck: true,

  loadSubscription: async () => {
    set({ isLoading: true })
    try {
      const auth = useAuthStore.getState()
      const userId = auth.user?.id

      let termCount = 0
      let deckCount = 0

      if (userId) {
        const [{ count: tc }, { count: dc }] = await Promise.all([
          supabase
            .from('user_terms')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('deleted_at', null),
          supabase
            .from('decks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
        ])
        termCount = tc ?? 0
        deckCount = dc ?? 0
      }

      const sub = await subscriptionService.getMySubscription()
      set({
        subscription: sub,
        termCount,
        deckCount,
        isLoading: false,
        ...computeState(sub, termCount, deckCount),
      })
    } catch {
      set({ isLoading: false })
    }
  },

  updateCounts: (terms: number, decks: number) => {
    const { subscription } = get()
    set({
      termCount: terms,
      deckCount: decks,
      ...computeState(subscription, terms, decks),
    })
  },

  setSubscription: (sub: Subscription | null) => {
    const { termCount, deckCount } = get()
    set({
      subscription: sub,
      ...computeState(sub, termCount, deckCount),
    })
  },

  reset: () => {
    set({
      subscription: null,
      isLoading: false,
      termCount: 0,
      deckCount: 0,
      isPro: false,
      isFree: true,
      canAddTerm: true,
      canAddDeck: true,
    })
  },
}))
