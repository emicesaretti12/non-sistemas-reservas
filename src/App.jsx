import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { ToastProvider } from './components/Toast'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import VistaPublica from './components/VistaPublica'
import ActualizarClave from './components/ActualizarClave'
import LandingPage from './components/LandingPage'
import { ConfirmProvider } from './contexts/ConfirmContext'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Consultar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    }).catch((e) => {
      console.warn("Supabase Session Background Worker:", e.message)
      setLoading(false)
    })

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Mientras comprobamos la sesión, mostramos un splash editorial
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F5F2EA] text-[#1A1814]" data-testid="splash-screen" style={{ fontFamily: '"Inter Tight", "Inter", sans-serif' }}>
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="relative">
            <div className="w-12 h-12 rounded-md bg-[#161412] flex items-center justify-center">
              <span className="text-[#F5F2EA] font-black text-xl tracking-tighter" style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}>N</span>
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF4F00] animate-pulse" />
          </div>

          {/* Subtle progress bar */}
          <div className="w-40 h-px bg-stone-300 overflow-hidden">
            <div className="h-full bg-[#FF4F00] animate-[loadingBar_1.2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
          </div>

          <p className="text-stone-500 text-[10px] font-medium uppercase tracking-[0.35em]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            Cargando · Noni
          </p>
        </div>

        <style>{`
          @keyframes loadingBar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            {/* LANDING PAGE: Página de venta pública */}
            <Route path="/" element={session ? <Navigate to="/admin" replace /> : <LandingPage />} />

            {/* RUTA PÚBLICA NUEVA CON NOMBRE: Debe estar arriba para que no la atrape el "*" */}
            <Route path="/app/:slug/:id" element={<VistaPublica />} />

            {/* RUTA PÚBLICA LEGACY: Se mantiene por compatibilidad de links viejos */}
            <Route path="/app/:id" element={<VistaPublica />} />

            {/* RECUPERAR CLAVE */}
            <Route path="/actualizar-clave" element={<ActualizarClave />} />

            {/* LOGIN: Si hay sesión, te manda al admin automáticamente */}
            <Route
              path="/login"
              element={!session ? <Login /> : <Navigate to="/admin" replace />}
            />

            {/* ADMIN: Si NO hay sesión, te manda al login */}
            <Route
              path="/admin"
              element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />}
            />

            {/* RUTA POR DEFECTO: Siempre al final */}
            <Route path="*" element={<Navigate to={session ? "/admin" : "/"} replace />} />
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App