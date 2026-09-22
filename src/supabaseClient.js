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

/**
 * Tiempo máximo de espera de cada pedido.
 *
 * `fetch` no tiene timeout propio: con señal mala (un subte, un ascensor, un
 * wifi que dejó de responder) el pedido queda pendiente para siempre y la
 * pantalla se queda girando sin forma de salir. Con el corte, la promesa
 * falla, los `catch` que ya existen en cada sección se disparan y el usuario
 * ve un estado con el que puede hacer algo.
 */
const TIMEOUT_MS = 15000

function fetchConTimeout(input, init = {}) {
  const control = new AbortController()
  const corte = setTimeout(() => control.abort(new Error('La conexión tardó demasiado')), TIMEOUT_MS)

  // Si quien llama ya traía su propia señal (por ejemplo, un componente que
  // se desmonta), la respetamos además de la nuestra.
  const externa = init.signal
  if (externa) {
    if (externa.aborted) control.abort(externa.reason)
    else externa.addEventListener('abort', () => control.abort(externa.reason), { once: true })
  }

  return fetch(input, { ...init, signal: control.signal }).finally(() => clearTimeout(corte))
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
    global: {
      fetch: fetchConTimeout,
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
