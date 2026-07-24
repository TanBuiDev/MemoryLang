import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AppLoading } from '@/components/common/AppLoading'
import { showToast } from '@/components/ui/toast'
import { useFeatureFlagsStore } from '@/stores/useFeatureFlagsStore'

interface FeatureGuardProps {
  flag: string
  fallbackUrl?: string
  children?: React.ReactNode
}

export function FeatureGuard({ flag, fallbackUrl = '/app/dashboard', children }: FeatureGuardProps) {
  const flags = useFeatureFlagsStore((s) => s.flags)
  const isLoaded = useFeatureFlagsStore((s) => s.isLoaded)
  const loadFlags = useFeatureFlagsStore((s) => s.loadFlags)
  const subscribeToRealtime = useFeatureFlagsStore((s) => s.subscribeToRealtime)

  useEffect(() => {
    if (!isLoaded) {
      void loadFlags()
    }
    subscribeToRealtime()
  }, [isLoaded, loadFlags, subscribeToRealtime])

  if (!isLoaded) {
    return <AppLoading />
  }

  const isEnabled = flags[flag] ?? true

  if (!isEnabled) {
    showToast({
      type: 'warning',
      title: 'Tính năng tạm ngưng',
      message: 'Tính năng này hiện đang được tạm ẩn hoặc bảo trì bởi hệ thống.',
    })
    return <Navigate to={fallbackUrl} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
