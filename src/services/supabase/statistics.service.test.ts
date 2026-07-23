import { beforeEach, describe, expect, it, vi } from 'vitest'
import { statisticsService } from '@/services/supabase/statistics.service'
import { supabase } from '@/services/supabase/client'

vi.mock('@/services/supabase/client', () => ({
  supabase: { from: vi.fn() },
}))

const from = vi.mocked(supabase.from)

describe('statisticsService learning analytics visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the configured dashboard visibility flag', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { enabled: false }, error: null }),
    }
    from.mockReturnValue(query as never)

    await expect(statisticsService.isLearningAnalyticsVisible()).resolves.toBe(false)
    expect(from).toHaveBeenCalledWith('feature_flags')
    expect(query.eq).toHaveBeenCalledWith('flag', 'learning_analytics_dashboard')
  })

  it('defaults to visible while the feature flag migration is not applied', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    from.mockReturnValue(query as never)

    await expect(statisticsService.isLearningAnalyticsVisible()).resolves.toBe(true)
  })
})
