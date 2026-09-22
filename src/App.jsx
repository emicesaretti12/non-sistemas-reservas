import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase, supabaseConfigurado } from './supabaseClient'
import { ToastProvider } from './components/Toast'
import { ThemeProvider } from './contexts/ThemeContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import ErrorBoundary from './components/ErrorBoundary'
import { useRippleGlobal } from './hooks/useRippleGlobal'

// Code splitting: el panel, la app pública y el login son tres bundles
// distintos. Antes todo viajaba en un único archivo de ~1,1 MB que el cliente
// de una barbería tenía que descargar entero sólo para pedir un turno.
const LandingPage = lazy(() => import('./components/LandingPage'))
const Login = lazy(() => import('./components/Login'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const VistaPublica = lazy(() => import('./components/VistaPublica'))
const ActualizarClave = lazy(() => import('./components/ActualizarClave'))

function Splash() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      style={{
        background: 'var(--ns-bg)',
        color: 'var(--ns-text)',
        fontFamily: '"Inter Tight", "Inter", sans-serif',
      }}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative" data-testid="noni-logo">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--ns-gradient-deep)' }}
          >
            <span
              className="text-white font-bold text-2xl tracking-tight"
              style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}
            >
              N
            </span>
          </div>
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full ns-pulse-soft"
            style={{ background: 'var(--ns-primary-light)', boxShadow: '0 0 18px var(--ns-primary)' }}
          />
        </div>

        {/* Subtle progress bar */}
        <div
          className="w-44 h-[3px] overflow-hidden rounded-full"
          style={{ background: 'var(--ns-border)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: 'var(--ns-gradient-1)',
              width: '40%',
              animation: 'loadingBar 1.2s ease-in-out infinite',
            }}
          />
        </div>

        <p
          className="text-[10px] font-semibold uppercase tracking-[0.35em]"
          style={{ color: 'var(--ns-text-muted)', fontFamily: '"JetBrains Mono", monospace' }}
        >
          Cargando · Noni
        </p>
      </div>
    </div>
  )
}

/**
 * Sin credenciales de Supabase la app no puede hacer absolutamente nada.
 * Antes esto terminaba en una pantalla blanca sin mensaje.
 */
function FaltaConfiguracion() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: '#F8FAFC', fontFamily: '"Inter Tight", system-ui, sans-serif' }}
      data-testid="config-missing"
    >
      <div
        className="max-w-md w-full rounded-[38px] p-8 text-center"
        style={{ background: '#FFFFFF', boxShadow: '20px 20px 44px rgba(16,24,40,0.13), -13px -13px 30px rgba(255,255,255,0.95)' }}
      >
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-[22px] flex items-center justify-center"
          style={{ background: '#F1F4F9', boxShadow: 'inset 7px 7px 15px rgba(16,24,40,0.11), inset -6px -6px 13px rgba(255,255,255,0.95)', color: '#007AFF' }}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1D212A] mb-2">Falta configurar la app</h1>
        <p className="text-sm text-[#A92735] leading-relaxed mb-5">
          No están definidas las variables de conexión a la base de datos. Agregalas
          en el entorno de despliegue (o en un archivo <code className="font-mono text-[12px]">.env</code> local)
          y volvé a publicar.
        </p>
        <pre
          className="text-left text-[11px] font-mono rounded-[18px] p-4 overflow-x-auto"
          style={{ background: '#F1F4F9', color: '#0062D6', boxShadow: 'inset 7px 7px 15px rgba(16,24,40,0.11), inset -6px -6px 13px rgba(255,255,255,0.95)' }}
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

  // Respuesta física al toque en toda la app.
  useRippleGlobal()

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
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppShell />
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
