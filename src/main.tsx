
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }

// Detect stale chunk errors and reload
window.addEventListener('error', (event) => {
  const isChunkError = 
    event.message?.includes('Failed to fetch dynamically imported') ||
    event.message?.includes('Importing a module script failed') ||
    event.message?.includes('Unable to preload CSS') ||
    event.message?.includes('Load failed');

  if (isChunkError) {
    // Only reload once to prevent infinite reload loop
    const lastReload = localStorage.getItem('last_chunk_reload');
    const now = Date.now();
    
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      localStorage.setItem('last_chunk_reload', now.toString());
      window.location.reload();
    }
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
    const lastReload = localStorage.getItem('last_chunk_reload');
    const now = Date.now();
    
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      localStorage.setItem('last_chunk_reload', now.toString());
      window.location.reload();
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
  