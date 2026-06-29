
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch {
    // localStorage unavailable
  }

// Unregister stale service worker and clear all caches before reloading,
// so a normal reload doesn't hit the same stale cached files.
async function recoverFromStaleChunk() {
  const lastReload = localStorage.getItem('last_chunk_reload');
  const now = Date.now();

  // Prevent infinite reload loops — only attempt recovery once per 15 seconds
  if (lastReload && now - parseInt(lastReload) < 15000) {
    return;
  }

  localStorage.setItem('last_chunk_reload', now.toString());

  try {
    // Unregister any active service worker so it stops serving stale cached files
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // Clear all caches created by the service worker
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  } catch (err) {
    console.error('Error clearing stale cache:', err);
  } finally {
    // Force a genuinely fresh load, bypassing any remaining cache
    window.location.href = window.location.pathname + '?refresh=' + Date.now();
  }
}

window.addEventListener('error', (event) => {
  const isChunkError =
    event.message?.includes('Failed to fetch dynamically imported') ||
    event.message?.includes('Importing a module script failed') ||
    event.message?.includes('Unable to preload CSS') ||
    event.message?.includes('Load failed');

  if (isChunkError) {
    recoverFromStaleChunk();
  }
});

// Also handle unhandled promise rejections (lazy loaded chunks that fail)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const isChunkError =
    reason?.message?.includes('Failed to fetch dynamically imported') ||
    reason?.message?.includes('Importing a module script failed') ||
    reason?.name === 'ChunkLoadError';

  if (isChunkError) {
    recoverFromStaleChunk();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
  