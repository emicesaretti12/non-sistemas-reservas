import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import VistaPublica from './components/VistaPublica'
import ActualizarClave from './components/ActualizarClave'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true) // 1. Nuevo estado de carga

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

  // 3. Mientras comprobamos la sesión, mostramos un splash animado
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center ns-animated-bg relative overflow-hidden">
        {/* Animated orbs */}
        <div className="ns-orb w-[300px] h-[300px] bg-purple-500/30 top-[10%] left-[20%]"></div>
        <div className="ns-orb w-[200px] h-[200px] bg-cyan-400/20 bottom-[20%] right-[15%]" style={{animationDelay: '2s'}}></div>
        
        <div className="relative z-10 flex flex-col items-center gap-6 ns-scale-in">
          {/* Logo */}
          <div className="w-20 h-20 rounded-[1.5rem] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl ns-float">
            <span className="text-white font-black text-2xl italic tracking-tighter">NS</span>
          </div>
          
          {/* Spinner */}
          <div className="ns-spinner" style={{borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#a29bfe'}}></div>
          
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Cargando plataforma...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
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
        <Route path="*" element={<Navigate to={session ? "/admin" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App