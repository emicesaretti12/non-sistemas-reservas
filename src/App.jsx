import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase, supabaseConfigurado } from './supabaseClient'
import { ToastProvider } from './components/Toast'
import { ThemeProvider } from './contexts/ThemeContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import ErrorBoundary from './components/ErrorBoundary'
import { MotionConfig } from 'framer-motion'
import { usePantallaNativa } from './hooks/usePantallaNativa'
import { useHojasArrastrables } from './hooks/useHojasArrastrables'
import EstadoConexion from './components/ui/EstadoConexion'

// Code splitting: el panel, la app pública y el login son tres bundles
// distintos. Antes todo viajaba en un único archivo de ~1,1 MB que el cliente
// de una barbería tenía que descargar entero sólo para pedir un turno.
const LandingPage = lazy(() => import('./components/LandingPage'))
const Login = lazy(() => import('./components/Login'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const VistaPublica = lazy(() => import('./components/VistaPublica'))
const ActualizarClave = lazy(() => import('./components/ActualizarClave'))

/**
 * Arranque: la marca en una gota de vidrio sobre el mismo campo de color del
 * panel, así la transición al contenido no tiene un salto de fondo.
 */
function Splash() {
  return (
    <div className="ns-arranque" data-testid="splash-screen" role="status" aria-label="Cargando Noni">
      <span className="ns-arranque__marca" data-testid="noni-logo" aria-hidden="true">N</span>
      <span className="ns-arranque__barra" aria-hidden="true"><span /></span>
    </div>
  )
}

/**
 * Sin credenciales de Supabase la app no puede hacer absolutamente nada.
 * Antes esto terminaba en una pantalla blanca sin mensaje.
 */
function FaltaConfiguracion() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6" data-testid="config-missing">
      <div className="ui-card max-w-md w-full p-8 text-center">
        <div className="ui-pod ui-pod--amber ui-pod--lg mx-auto mb-6">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1D212A] mb-2">Falta configurar la app</h1>
        <p className="text-sm text-[#4A5462] leading-relaxed mb-5">
          No están definidas las variables de conexión a la base de datos. Agregalas
          en el entorno de despliegue (o en un archivo <code className="font-mono text-[12px]">.env</code> local)
          y volvé a publicar.
        </p>
        <pre
          className="text-left text-[11px] font-mono rounded-[18px] p-4 overflow-x-auto"
          style={{ background: 'var(--ns-sunken)', color: '#0062D6' }}
        >
VITE_SUPABASE_URL=...{'\n'}VITE_SUPABASE_ANON_KEY=...
        </pre>
      </div>
    </div>
  )
}

function AppShell() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Comportamiento de app en el celular: sin zoom, hojas que se cierran
  // deslizando y la pantalla siempre en su lugar.
  usePantallaNativa()
  useHojasArrastrables()

  useEffect(() => {
    let activo = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!activo) return
      setSession(session)
      setLoading(false)
    }).catch((e) => {
      if (!activo) return
      console.warn('No se pudo recuperar la sesión:', e.message)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activo) return
      setSession(session)
      setLoading(false)
    })

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return <Splash />

  return (
    <BrowserRouter>
      <EstadoConexion />
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/" element={session ? <Navigate to="/admin" replace /> : <LandingPage />} />
          <Route path="/app/:slug/:id" element={<VistaPublica />} />
          <Route path="/app/:id" element={<VistaPublica />} />
          <Route path="/actualizar-clave" element={<ActualizarClave />} />
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/admin" replace />} />
          <Route path="/admin" element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={session ? '/admin' : '/'} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  if (!supabaseConfigurado) return <FaltaConfiguracion />

  return (
    // ErrorBoundary existía en el repo pero no estaba montado en ningún lado:
    // cualquier excepción de render dejaba la pantalla completamente en blanco.
    <ErrorBoundary fallbackMessage="La aplicación tuvo un problema inesperado">
      {/* Quien pidió "reducir movimiento" en el sistema recibe fundidos en
          lugar de desplazamientos y resortes, en toda la app. */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AppShell />
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}

export default App
