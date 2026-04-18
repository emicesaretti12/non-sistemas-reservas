import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ActualizarClave() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Al entrar a esta página, escuchamos la recuperación de sesión
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // La sesión se estableció temporalmente para permitir cambiar la clave
        console.log("Sesión de recuperación detectada.")
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMensaje(null)

    if (password.length < 8) {
      return setMensaje({ tipo: 'error', texto: 'La clave debe tener al menos 8 caracteres.' })
    }
    if (password !== confirmPassword) {
      return setMensaje({ tipo: 'error', texto: 'Las claves no coinciden.' })
    }

    setLoading(true)
    const { data, error } = await supabase.auth.updateUser({ password: password })
    
    if (error) {
      setMensaje({ tipo: 'error', texto: `Error: ${error.message}` })
      setLoading(false)
    } else {
      setMensaje({ tipo: 'exito', texto: 'Contraseña actualizada con éxito. Redirigiendo...' })
      setTimeout(() => {
        navigate('/admin')
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-[#0A0A0B] text-white">
      <div className="w-full max-w-[440px] z-10 ns-fade-up">
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Nueva Contraseña</h1>
            <p className="text-white/40 text-[11px] md:text-sm">Por favor, escribe tu nueva credencial de seguridad.</p>
          </div>

          {mensaje && (
            <div className={`p-4 rounded-xl mb-6 text-xs font-bold text-center ${
              mensaje.tipo === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
            }`}>
              {mensaje.texto}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase ml-1 tracking-widest mb-1.5 block">Nueva Clave</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:border-[#6c5ce7] focus:bg-white/10 outline-none font-semibold text-white placeholder:text-white/20 text-sm"
                placeholder="••••••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase ml-1 tracking-widest mb-1.5 block">Confirmar Clave</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-5 py-4 bg-white/5 border rounded-xl outline-none font-semibold text-white placeholder:text-white/20 text-sm ${
                  confirmPassword.length > 0 && password !== confirmPassword ? 'border-red-500/50' : 'border-white/10 focus:border-[#6c5ce7]'
                }`}
                placeholder="Repetir nueva clave"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || password !== confirmPassword}
              className="w-full text-white font-black py-4 rounded-xl shadow-xl transition-all disabled:opacity-40 uppercase tracking-[0.2em] text-[11px] mt-6 bg-[#6c5ce7] hover:bg-[#a29bfe]"
            >
              {loading ? 'Procesando...' : 'Cambiar y Entrar'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
