import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Interceptor global: si el JWT expira, forzar refresh o redirigir al login
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Nucleus Auth: Token renovado automáticamente.')
  }
  if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
    // Solo redirigir si estamos en una ruta protegida (admin)
    if (window.location.pathname.startsWith('/admin')) {
      window.location.href = '/login'
    }
  }
})