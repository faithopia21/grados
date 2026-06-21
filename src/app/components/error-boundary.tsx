import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

async function handleRefresh() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
      }
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
  } finally {
    window.location.href = window.location.pathname + '?refresh=' + Date.now()
  }
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App error:', error, info)
    
    // Auto-reload for chunk errors
    const isChunkError = 
      error.message?.includes('Failed to fetch dynamically imported') ||
      error.message?.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError'
    
    if (isChunkError) {
      const lastReload = localStorage.getItem('last_chunk_reload')
      const now = Date.now()

      if (!lastReload || now - parseInt(lastReload) > 10000) {
        localStorage.setItem('last_chunk_reload', now.toString())
        handleRefresh()
        return
      }
    }
    
    this.setState({ hasError: true, error })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              This is usually fixed by refreshing the page. Your data is safe.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
            >
              <RefreshCw size={14} />
              Refresh page
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent"
            >
              Go to Dashboard
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {this.state.error?.message}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
