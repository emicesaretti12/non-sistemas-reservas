import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ActualizarClave() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') console.log('Sesión de recuperación detectada.')
    })
    return () => subscription.unsubscribe()
  }, [])

  const strength = useMemo(() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }, [password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMensaje(null)

    if (password.length < 8) return setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' })
    if (strength < 3) return setMensaje({ tipo: 'error', texto: 'Sumá mayúsculas, números o símbolos para mayor seguridad.' })
    if (password !== confirmPassword) return setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMensaje({ tipo: 'error', texto: error.message })
      setLoading(false)
    } else {
      setMensaje({ tipo: 'exito', texto: 'Contraseña actualizada. Redirigiendo...' })
      setTimeout(() => navigate('/admin'), 1500)
    }
  }

  const rules = [
    { id: 'length', text: '8+ caracteres', test: password.length >= 8 },
    { id: 'upper', text: 'Mayúscula', test: /[A-Z]/.test(password) },
    { id: 'num', text: 'Número', test: /[0-9]/.test(password) },
    { id: 'spec', text: 'Símbolo', test: /[^A-Za-z0-9]/.test(password) },
  ]

  return (
    <div
      className="min-h-dvh w-full flex items-center justify-center bg-[#F5F2EA] text-[#1A1814] px-6 py-12"
      style={{ fontFamily: '"Inter Tight", "Inter", sans-serif' }}
      data-testid="actualizar-clave-screen"
    >
      <div className="w-full max-w-[440px]">
        {/* Brand strip */}
        <div className="flex items-center justify-between mb-12">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-md bg-[#161412] flex items-center justify-center">
                <span className="text-[#F5F2EA] font-black text-[15px] tracking-tighter" style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}>N</span>
              </div>
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF4F00]" />
            </div>
            <div className="leading-none">
              <p className="font-bold text-[15px] tracking-tight">Noni<span className="text-[#FF4F00]">.</span></p>
              <p className="text-[8px] font-medium uppercase tracking-[0.25em] text-stone-500 mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Non Sistemas</p>
            </div>
          </a>
          <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-stone-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            Seguridad
          </span>
        </div>

        {/* Header */}
        <div className="mb-9">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF4F00]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>N°04</span>
            <div className="h-px flex-1 bg-stone-300" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-stone-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Restablecer</span>
          </div>

          <h1 className="text-[44px] sm:text-[52px] leading-[0.95] tracking-[-0.035em] font-light text-[#1A1814]" style={{ fontFamily: '"Fraunces", serif' }}>
            Nueva <em className="italic font-medium text-[#FF4F00]">clave.</em>
          </h1>
          <p className="text-stone-600 mt-3 text-[14px] font-medium">
            Elegí algo único. Algo que solo vos recuerdes.
          </p>
        </div>

        {mensaje && (
          <div
            role="alert"
            data-testid={`alert-${mensaje.tipo}`}
            className={`mb-6 p-3.5 text-[13px] font-medium flex items-start gap-3 border-l-2 ${
              mensaje.tipo === 'error' ? 'bg-red-50/70 text-red-800 border-red-500' : 'bg-emerald-50/70 text-emerald-800 border-emerald-500'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {mensaje.tipo === 'error' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
            </div>
            <p>{mensaje.texto}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="reset-form">
          <div>
            <label htmlFor="new-password" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-stone-700 mb-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
                data-testid="new-password-input"
                className="w-full pr-9 pb-2.5 pt-1 bg-transparent border-0 border-b border-stone-400 text-[15px] font-medium text-[#1A1814] placeholder:text-stone-400 outline-none transition-colors focus:border-[#FF4F00] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                data-testid="toggle-password-visibility"
                className="absolute right-0 top-1 text-stone-400 hover:text-[#FF4F00] p-1 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>

            {password && (
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                {rules.map(r => (
                  <span key={r.id} className={`inline-flex items-center gap-1 text-[10px] font-medium tracking-wide ${r.test ? 'text-emerald-700' : 'text-stone-400'}`}>
                    <span className={`w-1 h-1 rounded-full ${r.test ? 'bg-emerald-600' : 'bg-stone-300'}`} />
                    {r.text}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-stone-700 mb-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Confirmar contraseña
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí la nueva contraseña"
              disabled={loading}
              autoComplete="new-password"
              data-testid="confirm-password-input"
              className={`w-full px-0 pb-2.5 pt-1 bg-transparent border-0 border-b text-[15px] font-medium text-[#1A1814] placeholder:text-stone-400 outline-none transition-colors disabled:opacity-50 ${
                confirmPassword.length > 0 && password !== confirmPassword
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-stone-400 focus:border-[#FF4F00]'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || password !== confirmPassword}
            data-testid="submit-reset-btn"
            className="w-full py-3.5 mt-3 bg-[#1A1814] hover:bg-[#FF4F00] text-[#F5F2EA] text-[13px] font-bold tracking-wide uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/40 focus:ring-offset-2 focus:ring-offset-[#F5F2EA] active:translate-y-px"
            style={{ fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em' }}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2.5">
                <div className="w-3.5 h-3.5 border-[1.5px] border-white/40 border-t-white rounded-full animate-spin" />
                <span>Actualizando</span>
              </div>
            ) : (
              'Cambiar contraseña'
            )}
          </button>
        </form>

        <div className="mt-12 pt-5 border-t border-stone-300 flex items-center justify-between text-[9px] uppercase tracking-[0.25em] text-stone-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          <span>Cifrado · TLS 1.3</span>
          <span>© {new Date().getFullYear()} Non Sistemas</span>
        </div>
      </div>
    </div>
  )
}
