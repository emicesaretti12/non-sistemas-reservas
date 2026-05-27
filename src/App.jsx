import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { ToastProvider } from './components/Toast'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import VistaPublica from './components/VistaPublica'
import ActualizarClave from './components/ActualizarClave'
import LandingPage from './components/LandingPage'
import { ConfirmProvider } from './contexts/ConfirmContext'

function Splash() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      style={{
        background: isDark ? 'var(--ns-bg)' : 'var(--ns-bg)',
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
              className="text-white font-black text-2xl tracking-tighter"
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

function AppShell() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    }).catch((e) => {
      console.warn('Supabase Session Background Worker:', e.message)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <Splash />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/admin" replace /> : <LandingPage />} />
        <Route path="/app/:slug/:id" element={<VistaPublica />} />
        <Route path="/app/:id" element={<VistaPublica />} />
        <Route path="/actualizar-clave" element={<ActualizarClave />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/admin" replace />} />
        <Route path="/admin" element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={session ? '/admin' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppShell />
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
