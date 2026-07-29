import { useEffect, useState } from 'react'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { shouldChallengeMfa } from '@/utils/mfa'

export function useMfaChallenge() {
  const session = useAuthStore((state) => state.session)
  const currentAccessToken = session?.access_token ?? null
  const [requiresChallenge, setRequiresChallenge] = useState(false)
  const [checkedAccessToken, setCheckedAccessToken] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!session?.user) {
      setRequiresChallenge(false)
      setCheckedAccessToken(null)
      return () => { active = false }
    }

    const accessToken = session.access_token
    void authService.getMfaAssuranceLevel()
      .then((levels) => {
        if (active) setRequiresChallenge(shouldChallengeMfa(levels))
      })
      .catch(() => {
        if (active) setRequiresChallenge(false)
      })
      .finally(() => {
        if (active) setCheckedAccessToken(accessToken)
      })

    return () => { active = false }
  }, [currentAccessToken, session?.user])

  return {
    loading: Boolean(session?.user) && checkedAccessToken !== currentAccessToken,
    requiresChallenge,
  }
}
