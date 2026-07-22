import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'

const COOLDOWN_SEGUNDOS = 60

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [legalSheet, setLegalSheet] = useState(null)

  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const hash = window.location.hash.substring(1)
    const queryParams = new URLSearchParams(window.location.search)
    const errorDesc =
      new URLSearchParams(hash).get('error_description') || queryParams.get('error_description')
    const hasAuthToken =
      hash.includes('access_token') || hash.includes('refresh_token') || queryParams.get('code')

    if (!hasAuthToken) {
      supabase.auth.signOut().catch(() => {})
    }

    if (errorDesc) {
      const errorReal = decodeURIComponent(errorDesc.replace(/\+/g, ' '))
      let texto = errorReal
      if (errorReal.includes('Database error saving new user')) {
        texto = 'No pudimos crear tu cuenta. Verificá la configuración o contactá soporte.'
      }
      setMensaje({ tipo: 'error', texto })
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const cambiarModo = (nuevoModo) => {
    setMode(nuevoModo)
    setMensaje(null)
    setPassword('')
    setConfirmPassword('')
    setAcceptTerms(false)
  }

  const passwordStrength = useMemo(() => {
    if (mode !== 'registro' || !password) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }, [password, mode])

  const isValidEmail = useCallback((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), [])

  const esRateLimit = useCallback((msg) => {
    const l = msg.toLowerCase()
    return (
      l.includes('rate limit') ||
      l.includes('too many requests') ||
      l.includes('over_email_send_rate_limit') ||
      l.includes('email rate limit exceeded') ||
      l.includes('for security purposes') ||
      l.includes('you can only request this')
    )
  }, [])

  const extraerSegundos = useCallback((msg) => {
    const m = msg.match(/after (\d+) second/i)
    return m ? Math.max(parseInt(m[1], 10), COOLDOWN_SEGUNDOS) : COOLDOWN_SEGUNDOS
  }, [])

  const traducirError = useCallback(
    (errorMsg) => {
      const msg = errorMsg.toLowerCase()
      if (esRateLimit(errorMsg)) return `Demasiados intentos. Esperá ${COOLDOWN_SEGUNDOS} segundos.`
      if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
      if (msg.includes('user already registered'))
        return 'Este email ya está registrado. Iniciá sesión.'
      if (msg.includes('email link is invalid') || msg.includes('token has expired'))
        return 'El enlace expiró. Solicitá uno nuevo.'
      if (msg.includes('email not confirmed')) return 'Confirmá tu email antes de iniciar sesión.'
      if (msg.includes('signup disabled')) return 'Los registros están deshabilitados temporalmente.'
      if (msg.includes('weak password')) return 'La contraseña es demasiado débil.'
      return errorMsg
    },
    [esRateLimit]
  )

  const activarCooldown = useCallback((s) => {
    setCooldown(s)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current)
          cooldownRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleSocialLogin = async (provider) => {
    if (cooldown > 0) return
    setLoading(true)
    setMensaje(null)
    try {
      await supabase.auth.signOut()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/admin`,
          ...(provider === 'google' && {
            queryParams: { access_type: 'offline', prompt: 'select_account' },
          }),
        },
      })
      if (error) {
        setMensaje({ tipo: 'error', texto: `${provider}: ${error.message}` })
        setLoading(false)
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message })
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    if (cooldown > 0) return
    setMensaje(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return setMensaje({ tipo: 'error', texto: 'Ingresá tu correo.' })
    if (!isValidEmail(cleanEmail))
      return setMensaje({ tipo: 'error', texto: 'El formato del correo no es válido.' })

    if (mode === 'registro') {
      if (!password) return setMensaje({ tipo: 'error', texto: 'Ingresá una contraseña.' })
      if (passwordStrength < 3)
        return setMensaje({
          tipo: 'error',
          texto: 'Tu contraseña es débil. Sumá mayúsculas, números o símbolos.',
        })
      if (password !== confirmPassword)
        return setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      if (!acceptTerms)
        return setMensaje({ tipo: 'error', texto: 'Aceptá los términos para continuar.' })
    }
    if (mode === 'login' && !password)
      return setMensaje({ tipo: 'error', texto: 'Ingresá tu contraseña.' })

    setLoading(true)
    let hasRedirected = false

    try {
      await supabase.auth.signOut()

      if (mode === 'registro') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        })
        if (error) {
          if (esRateLimit(error.message)) {
            const s = extraerSegundos(error.message)
            activarCooldown(s)
            return setMensaje({
              tipo: 'error',
              texto: `Demasiados registros. Esperá ${s} segundos.`,
            })
          }
          throw error
        }
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          return setMensaje({ tipo: 'error', texto: 'Este email ya está registrado.' })
        }
        if (data?.user && !data.session) {
          setMensaje({
            tipo: 'exito',
            texto: 'Cuenta creada. Revisá tu email para confirmarla.',
          })
          setMode('login')
          setPassword('')
          setConfirmPassword('')
          return
        }
        if (data?.session) {
          setMensaje({ tipo: 'exito', texto: 'Bienvenido. Preparando tu workspace...' })
          hasRedirected = true
          setTimeout(() => {
            window.location.href = '/admin'
          }, 500)
          return
        }
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        if (error) {
          if (esRateLimit(error.message)) {
            const s = extraerSegundos(error.message)
            activarCooldown(s)
            return setMensaje({
              tipo: 'error',
              texto: `Demasiados intentos. Esperá ${s} segundos.`,
            })
          }
          throw error
        }
        if (!data.session) throw new Error('No se pudo iniciar sesión.')
        setMensaje({ tipo: 'exito', texto: 'Acceso confirmado.' })
        hasRedirected = true
        setTimeout(() => {
          window.location.href = '/admin'
        }, 400)
      } else if (mode === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/actualizar-clave`,
        })
        if (error) {
          if (esRateLimit(error.message)) {
            const s = extraerSegundos(error.message)
            activarCooldown(s)
            return setMensaje({
              tipo: 'error',
              texto: `Esperá ${s} segundos antes de pedir otro enlace.`,
            })
          }
          throw error
        }
        setMensaje({
          tipo: 'exito',
          texto: 'Si el email está registrado, te enviamos las instrucciones.',
        })
        activarCooldown(30)
        setMode('login')
        setPassword('')
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: traducirError(error.message) })
    } finally {
      if (!hasRedirected) setLoading(false)
    }
  }

  const configUI = {
    login: {
      titulo: 'Bienvenido a',
      acento: 'Noni',
      subtitulo: 'Gestioná tu agenda, equipo y reservas desde un solo lugar.',
      btn: 'Iniciar sesión',
    },
    registro: {
      titulo: 'Tu negocio merece',
      acento: 'Noni',
      subtitulo: 'Creá tu cuenta gratis en menos de un minuto.',
      btn: 'Crear cuenta',
    },
    recuperar: {
      titulo: 'Recuperá tu',
      acento: 'acceso',
      subtitulo: 'Te enviamos un enlace seguro para restablecer tu contraseña.',
      btn: 'Enviar enlace',
    },
  }

  const renderPasswordMeter = () => {
    if (mode !== 'registro' || !password) return null
    const rules = [
      { id: 'length', text: '8+ caracteres', test: password.length >= 8 },
      { id: 'upper', text: 'Mayúscula', test: /[A-Z]/.test(password) },
      { id: 'num', text: 'Número', test: /[0-9]/.test(password) },
      { id: 'spec', text: 'Símbolo', test: /[^A-Za-z0-9]/.test(password) },
    ]
    return (
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5" data-testid="password-strength-meter">
        {rules.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
            style={{ color: r.test ? '#10B981' : '#9CA3AF' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ background: r.test ? '#10B981' : '#EDE9FE' }}
            />
            {r.text}
          </span>
        ))}
      </div>
    )
  }

  const botonDeshabilitado =
    loading ||
    cooldown > 0 ||
    (mode === 'registro' &&
      (!acceptTerms || password !== confirmPassword || passwordStrength < 3))

  const renderBotonTexto = () => {
    if (loading)
      return (
        <span className="flex items-center justify-center gap-2.5">
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          <span>Procesando…</span>
        </span>
      )
    if (cooldown > 0) return <span>Esperá {cooldown}s</span>
    return (
      <span className="flex items-center justify-center gap-2">
        {configUI[mode].btn}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </span>
    )
  }

  return (
    <div className="ns-login-shell" data-testid="login-screen">
      {/* Background */}
      <div className="ns-login-bg" />
      <div className="ns-login-orb ns-login-orb-1" />
      <div className="ns-login-orb ns-login-orb-2" />
      <div className="ns-login-orb ns-login-orb-3" />

      <div className="ns-login-card w-full max-w-md mx-auto z-10 relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="ns-login-logo">
            <span className="text-white font-black text-xl tracking-tighter">N</span>
          </div>
          <div className="leading-none">
            <p className="font-black text-xl tracking-tight text-[#1E1B4B]">
              Noni<span className="text-[#5B3DF5]">.</span>
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9CA3AF] mt-1">
              Sistema de reservas
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-[#1E1B4B] leading-[1.05] mb-2">
            {configUI[mode].titulo}{' '}
            <span className="text-[#5B3DF5]">
              {configUI[mode].acento}
              {mode === 'login' || mode === 'registro' ? '.' : ''}
            </span>
          </h2>
          <p className="text-[13px] font-medium text-[#6B7280] leading-relaxed">
            {configUI[mode].subtitulo}
          </p>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div
            role="alert"
            data-testid={`alert-${mensaje.tipo}`}
            className="mb-6 p-4 text-[13px] font-medium flex items-start gap-3 rounded-2xl border"
            style={{
              background:
                mensaje.tipo === 'error' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)',
              color: mensaje.tipo === 'error' ? '#EF4444' : '#10B981',
              borderColor:
                mensaje.tipo === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            }}
          >
            <div className="shrink-0 mt-0.5">
              {mensaje.tipo === 'error' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="leading-snug">{mensaje.texto}</p>
              {cooldown > 0 && mensaje.tipo === 'error' && (
                <div className="mt-2 h-1 w-full rounded-full overflow-hidden bg-[#EDE9FE]">
                  <div
                    className="h-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${(cooldown / COOLDOWN_SEGUNDOS) * 100}%`,
                      background: '#EF4444',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Social */}
        {mode !== 'recuperar' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={loading || cooldown > 0}
                className="ns-login-social-btn"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('github')}
                disabled={loading || cooldown > 0}
                className="ns-login-social-btn"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1E1B4B">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>
            <div className="relative mb-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-[#EDE9FE]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9CA3AF]">O con email</span>
              <div className="flex-1 h-px bg-[#EDE9FE]" />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4" data-testid="auth-form">
          <div>
            <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-2">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              disabled={loading || cooldown > 0}
              autoComplete="email"
              className="ns-login-input"
            />
          </div>

          {mode !== 'recuperar' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF]">Contraseña</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => cambiarModo('recuperar')} className="text-[10px] font-bold uppercase tracking-widest text-[#5B3DF5] hover:text-[#4328D4] transition-colors">¿La olvidaste?</button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading || cooldown > 0}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="ns-login-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#5B3DF5] transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {renderPasswordMeter()}
            </div>
          )}

          {mode === 'registro' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-2">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí la contraseña"
                disabled={loading || cooldown > 0}
                autoComplete="new-password"
                data-testid="confirm-password-input"
                className="ns-login-input"
                style={confirmPassword.length > 0 && password !== confirmPassword ? { borderColor: '#EF4444' } : undefined}
              />
            </div>
          )}

          {mode === 'registro' && (
            <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={cooldown > 0}
                data-testid="terms-checkbox"
                className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-[#5B3DF5]"
              />
              <span className="text-[12px] leading-snug text-[#6B7280]">
                Acepto los{' '}
                <button type="button" onClick={() => setLegalSheet('terms')} className="font-semibold underline-offset-4 hover:underline text-[#5B3DF5]">Términos</button>
                {' '}y la{' '}
                <button type="button" onClick={() => setLegalSheet('privacy')} className="font-semibold underline-offset-4 hover:underline text-[#5B3DF5]">Política de Privacidad</button>.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={botonDeshabilitado}
            className="ns-login-submit-btn"
          >
            {renderBotonTexto()}
          </button>
        </form>

        {/* Switch */}
        <div className="mt-8 pt-6 border-t border-[#EDE9FE]">
          {mode === 'recuperar' ? (
            <button
              type="button"
              onClick={() => cambiarModo('login')}
              className="text-[11px] font-black uppercase tracking-widest text-[#9CA3AF] hover:text-[#1E1B4B] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio de sesión
            </button>
          ) : (
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              {mode === 'login' ? '¿Primera vez por acá?' : '¿Ya tenés cuenta?'}{' '}
              <button
                type="button"
                onClick={() => cambiarModo(mode === 'login' ? 'registro' : 'login')}
                className="text-[#5B3DF5] hover:text-[#4328D4] transition-colors ml-2 font-bold"
              >
                {mode === 'login' ? 'Creá una cuenta gratis' : 'Iniciá sesión'}
              </button>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#EDE9FE] flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-[#9CA3AF]">
          <span>© {new Date().getFullYear()} Noni</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Online
          </span>
        </div>
      </div>

      {legalSheet && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5" role="presentation">
          <button type="button" aria-label="Cerrar información legal" className="absolute inset-0 bg-[#18152e]/45 backdrop-blur-sm" onClick={() => setLegalSheet(null)} />
          <section role="dialog" aria-modal="true" aria-labelledby="legal-sheet-title" className="relative w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] bg-white p-6 sm:p-7 shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-[#EEEBFF] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#5B3DF5]">Noni</span>
                <h2 id="legal-sheet-title" className="mt-3 text-xl font-black tracking-tight text-[#1E1B4B]">
                  {legalSheet === 'terms' ? 'Términos de uso' : 'Política de privacidad'}
                </h2>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setLegalSheet(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#5B3DF5] transition-colors hover:bg-[#E8DEFF]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-[#656273]">
              {legalSheet === 'terms' ? (
                <>
                  <p>Al crear una cuenta, usás Noni para administrar reservas y la información operativa de tu negocio. Debés proporcionar datos correctos y mantener el acceso a tu cuenta de forma responsable.</p>
                  <p>Las reservas, servicios y horarios configurados son responsabilidad del negocio que administra la cuenta. Podés dejar de usar el servicio desde la configuración de tu cuenta.</p>
                </>
              ) : (
                <>
                  <p>Usamos los datos de registro y la información necesaria para autenticar tu cuenta, mostrar tus reservas y brindar soporte al funcionamiento de la aplicación.</p>
                  <p>La información se procesa únicamente para operar el servicio y no se comparte para fines ajenos a la gestión de reservas. Podés solicitar ayuda sobre tus datos desde los canales de contacto del servicio.</p>
                </>
              )}
            </div>
            <button type="button" onClick={() => setLegalSheet(null)} className="mt-6 min-h-11 w-full rounded-2xl bg-[#5B3DF5] px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-white shadow-[0_10px_22px_rgba(91,61,245,0.25)] transition-transform active:scale-[0.98]">Entendido</button>
          </section>
        </div>
      )}
    </div>
  )
}
