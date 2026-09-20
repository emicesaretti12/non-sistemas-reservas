import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Falta de configuración: sin estas dos variables la app no puede hablar con la
 * base de datos. Antes esto tiraba una excepción dentro de createClient y el
 * usuario veía una pantalla en blanco sin ninguna explicación.
 */
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigurado && import.meta.env.DEV) {
  console.error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
    'Creá un archivo .env en la raíz del proyecto (ver .env.example).'
  )
}

// Cliente real si hay credenciales; si no, un cliente apuntando a un host
// inexistente para que la app siga montando y pueda mostrar la pantalla de
// "falta configuración" en vez de romperse entera.
export const supabase = createClient(
  supabaseUrl || 'https://configuracion-faltante.invalid',
  supabaseAnonKey || 'sin-configurar',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

// Interceptor global: si la sesión se cierra o el token deja de ser válido,
// sacamos al usuario de las rutas protegidas.
if (supabaseConfigurado) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login'
      }
    }
  })
}
