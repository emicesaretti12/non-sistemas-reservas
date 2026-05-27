import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../contexts/ThemeContext'

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

    if (password.length < 8)
      return setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' })
    if (strength < 3)
      return setMensaje({
        tipo: 'error',
        texto: 'Sumá mayúsculas, números o símbolos para mayor seguridad.',
      })
    if (password !== confirmPassword)
      return setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })

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
      className="min-h-dvh w-full flex items-center justify-center px-6 py-12 relative"
      style={{
        background: 'var(--ns-bg)',
        color: 'var(--ns-text)',
        fontFamily: '"Inter Tight", "Inter", sans-serif',
      }}
      data-testid="actualizar-clave-screen"
    >
      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[460px]">
        {/* Brand strip */}
        <div className="flex items-center justify-between mb-10">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'var(--ns-gradient-deep)' }}
              >
                <span
                  className="text-white font-black text-[17px] tracking-tighter"
                  style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}
                >
                  N
                </span>
              </div>
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                style={{ background: 'var(--ns-primary-light)' }}
              />
            </div>
            <div className="leading-none">
              <p className="font-bold text-[16px] tracking-tight" style={{ color: 'var(--ns-text)' }}>
                Noni<span style={{ color: 'var(--ns-primary)' }}>.</span>
              </p>
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.25em] mt-1"
                style={{
                  color: 'var(--ns-text-muted)',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                Sistema de reservas
              </p>
            </div>
          </a>
        </div>

        {/* Header */}
        <div className="mb-9">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                color: 'var(--ns-primary)',
              }}
            >
              N°04 · Restablecer
            </span>
            <div className="h-px flex-1" style={{ background: 'var(--ns-border)' }} />
          </div>

          <h1
            className="text-[40px] sm:text-[48px] leading-[1.05] tracking-[-0.025em] font-light"
            style={{ fontFamily: '"Fraunces", serif', color: 'var(--ns-text)' }}
          >
            Nueva <em className="italic font-semibold" style={{ color: 'var(--ns-primary)' }}>clave.</em>
          </h1>
          <p className="mt-3 text-[15px] font-medium leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>
            Elegí algo único. Algo que solo vos recuerdes.
          </p>
        </div>

        {mensaje && (
          <div
            role="alert"
            data-testid={`alert-${mensaje.tipo}`}
            className="mb-6 p-4 text-[13px] font-medium flex items-start gap-3 rounded-xl border"
            style={{
              background: mensaje.tipo === 'error' ? 'var(--ns-danger-bg)' : 'var(--ns-success-bg)',
              color: mensaje.tipo === 'error' ? 'var(--ns-danger)' : 'var(--ns-success)',
              borderColor:
                mensaje.tipo === 'error'
                  ? 'color-mix(in srgb, var(--ns-danger) 30%, transparent)'
                  : 'color-mix(in srgb, var(--ns-success) 30%, transparent)',
            }}
          >
            <div className="shrink-0 mt-0.5">
              {mensaje.tipo === 'error' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p>{mensaje.texto}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="reset-form">
          <div>
            <label
              htmlFor="new-password"
              className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-2"
              style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--ns-text-secondary)' }}
            >
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
                className="ns-input-clean pr-11 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                data-testid="toggle-password-visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--ns-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ns-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ns-text-muted)')}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {password && (
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                {rules.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                    style={{ color: r.test ? 'var(--ns-success)' : 'var(--ns-text-muted)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: r.test ? 'var(--ns-success)' : 'var(--ns-border-strong)' }}
                    />
                    {r.text}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-2"
              style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--ns-text-secondary)' }}
            >
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
              className="ns-input-clean disabled:opacity-50"
              style={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? { borderColor: 'var(--ns-danger)' }
                  : undefined
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || password !== confirmPassword}
            data-testid="submit-reset-btn"
            className="ns-btn-celeste w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2.5">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Actualizando…</span>
              </span>
            ) : (
              'Cambiar contraseña'
            )}
          </button>
        </form>

        <div
          className="mt-10 pt-5 border-t flex items-center justify-between text-[10px] uppercase tracking-[0.25em]"
          style={{
            borderColor: 'var(--ns-border)',
            color: 'var(--ns-text-muted)',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          <span>Cifrado · TLS 1.3</span>
          <span>© {new Date().getFullYear()} Noni</span>
        </div>
      </div>
    </div>
  )
}
