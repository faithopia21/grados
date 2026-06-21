import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

class DynamicAuthStorage {
  getItem(key) {
    const remember = localStorage.getItem('grados_remember_me') !== 'false'
    const store = remember ? localStorage : sessionStorage
    return store.getItem(key)
  }

  setItem(key, value) {
    const remember = localStorage.getItem('grados_remember_me') !== 'false'
    const store = remember ? localStorage : sessionStorage
    store.setItem(key, value)
  }

  removeItem(key) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new DynamicAuthStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
