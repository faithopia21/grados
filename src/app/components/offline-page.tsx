import { WifiOff, RefreshCw } from 'lucide-react'

interface OfflinePageProps {
  onRetry: () => void
  pageName?: string
}

export function OfflinePage({
  onRetry,
  pageName = 'this page',
}: OfflinePageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
        <WifiOff size={28} className="text-amber-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          No internet connection
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Could not load {pageName}. Your data is safe and will appear once
          your connection is restored.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <RefreshCw size={14} />
        Try again
      </button>
      <p className="text-xs text-muted-foreground">
        All your existing data is stored safely in the cloud and has not been lost.
      </p>
    </div>
  )
}
