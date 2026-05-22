import { WifiOff, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="w-full bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center justify-between gap-3 z-50 shrink-0">
      <div className="flex items-center gap-2">
        <WifiOff size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            You are offline
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Your data is safe. Changes will sync when your connection is restored.
          </p>
        </div>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline flex-shrink-0"
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  )
}
