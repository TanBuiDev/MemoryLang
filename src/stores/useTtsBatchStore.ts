import { create } from 'zustand'
import { supabase } from '@/services/supabase/client'
import { generateAudio } from '@/services/api/generateAudio.api'
import type { TtsVoiceConfig } from '@/types/admin.types'

interface TtsBatchState {
  batchRunning: boolean
  batchProgress: { current: number; total: number; successes: number; failures: number }
  batchError: string | null
  stopRequested: boolean
  startBatchGenerate: (configs: TtsVoiceConfig[]) => Promise<void>
  stopBatchGenerate: () => void
}

export const useTtsBatchStore = create<TtsBatchState>((set, get) => {
  return {
    batchRunning: false,
    batchProgress: { current: 0, total: 0, successes: 0, failures: 0 },
    batchError: null,
    stopRequested: false,

    startBatchGenerate: async (configs) => {
      if (get().batchRunning) return

      set({
        batchRunning: true,
        batchError: null,
        stopRequested: false,
        batchProgress: { current: 0, total: 0, successes: 0, failures: 0 }
      })

      try {
        // Fetch uncached global terms (audio_url is null or empty, limit up to 10,000 terms)
        const { data, error: fetchErr } = await supabase
          .from('global_terms')
          .select('id, source_text, source_language')
          .is('deleted_at', null)
          .or('audio_url.is.null,audio_url.eq.""')
          .limit(10000)

        if (fetchErr) throw fetchErr

        const uncachedTerms = data ?? []
        if (uncachedTerms.length === 0) {
          alert('Tất cả các từ vựng đã có file âm thanh!')
          set({ batchRunning: false })
          return
        }

        set({ batchProgress: { current: 0, total: uncachedTerms.length, successes: 0, failures: 0 } })

        let successes = 0
        let failures = 0

        for (let i = 0; i < uncachedTerms.length; i++) {
          if (get().stopRequested) {
            break
          }

          const term = uncachedTerms[i]
          set((state) => ({
            batchProgress: {
              ...state.batchProgress,
              current: i + 1
            }
          }))

          try {
            const config = configs.find(c => c.language_code === term.source_language)
            const voiceName = config?.voice_name

            const res = await generateAudio(term.source_text, term.source_language, voiceName, term.id)
            if (res.audioUrl) {
              successes++
            } else {
              failures++
            }
          } catch (err) {
            console.error(`Failed to generate audio for term: ${term.source_text}`, err)
            failures++
          }

          set((state) => ({
            batchProgress: {
              ...state.batchProgress,
              successes,
              failures
            }
          }))

          await new Promise(resolve => setTimeout(resolve, 400))
        }

        if (get().stopRequested) {
          alert(`Đã dừng quá trình sinh audio. Hoàn thành: ${successes} thành công, ${failures} thất bại.`)
        } else {
          alert(`Đã hoàn thành sinh audio hàng loạt! Thành công: ${successes}, Thất bại: ${failures}`)
        }
      } catch (err: any) {
        console.error(err)
        set({ batchError: err.message || 'Lỗi xảy ra trong quá trình sinh audio hàng loạt' })
      } finally {
        set({ batchRunning: false })
      }
    },

    stopBatchGenerate: () => {
      set({ stopRequested: true })
    }
  }
})
