import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useTheme, ThemeToggle } from '../contexts/ThemeContext'

const COOLDOWN_SEGUNDOS = 60

export default function Login() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const [cooldown, setCooldown] = useState(0)
  const [now, setNow] = useState(new Date())
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
    const id = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => {
      clearInterval(id)
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
      titulo: 'Bienvenido de vuelta a',
      acento: 'Noni',
      subtitulo: 'Gestioná tu agenda, equipo y reservas desde un sólo lugar.',
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

  const horaAhora = useMemo(
    () => now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    [now]
  )
  const fechaHoy = useMemo(
    () =>
      now
        .toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
        .replace(/^./, (c) => c.toUpperCase()),
    [now]
  )

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
            style={{ color: r.test ? 'var(--ns-success)' : 'var(--ns-text-muted)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ background: r.test ? 'var(--ns-success)' : 'var(--ns-border-strong)' }}
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

  // Theme-aware styles
  const styles = {
    shell: {
      background: 'var(--ns-bg)',
      color: 'var(--ns-text)',
    },
    asidePattern: {
      background:
        'radial-gradient(at 25% 15%, rgba(56, 189, 248, 0.45) 0%, transparent 55%), radial-gradient(at 80% 80%, rgba(8, 145, 178, 0.55) 0%, transparent 55%), linear-gradient(135deg, #075985 0%, #0C4A6E 50%, #0B1220 100%)',
    },
    grain: {
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    },
  }

  return (
    <div
      className="min-h-dvh w-full flex"
      style={{ ...styles.shell, fontFamily: '"Inter Tight", "Inter", -apple-system, sans-serif' }}
      data-testid="login-screen"
    >
      {/* ═══════════════════ LEFT — BRAND HERO ═══════════════════ */}
      <aside
        className="hidden lg:flex lg:w-[48%] xl:w-[52%] relative overflow-hidden flex-col text-white"
        style={styles.asidePattern}
      >
        {/* Grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={styles.grain}
        />
        {/* Glow orbs */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(56,189,248,0) 70%)',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(125,211,252,0.35) 0%, rgba(125,211,252,0) 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full px-12 xl:px-16 py-10">
          {/* TOP STRIP */}
          <header className="flex items-start justify-between">
            <a href="/" className="group flex items-center gap-3" data-testid="brand-link">
              <div className="relative">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span
                    className="font-black text-xl tracking-tighter"
                    style={{
                      fontFamily: '"Fraunces", serif',
                      fontStyle: 'italic',
                      color: '#0369A1',
                    }}
                  >
                    N
                  </span>
                </div>
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                  style={{
                    background: '#38BDF8',
                    boxShadow: '0 0 16px rgba(56,189,248,0.8)',
                  }}
                />
              </div>
              <div className="leading-none">
                <p className="font-bold text-[17px] tracking-tight text-white">
                  Noni<span style={{ color: '#7DD3FC' }}>.</span>
                </p>
                <p
                  className="text-[9px] font-semibold uppercase tracking-[0.32em] text-white/55 mt-1.5"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  Sistema de reservas
                </p>
              </div>
            </a>

            <div
              className="text-right text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              <p>Est. MMXXIV</p>
              <p className="mt-1 text-white/40">Salsipuedes · Argentina</p>
            </div>
          </header>

          {/* EDITORIAL HEADLINE */}
          <div className="my-10 xl:my-16">
            <div className="flex items-center gap-3 mb-8">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ fontFamily: '"JetBrains Mono", monospace', color: '#7DD3FC' }}
              >
                N°01 · Operaciones
              </span>
              <div className="h-px w-16" style={{ background: 'rgba(125,211,252,0.4)' }} />
            </div>

            <h1
              className="text-[clamp(2.6rem,5vw,4.4rem)] leading-[1.02] tracking-[-0.035em] font-light text-white"
              style={{ fontFamily: '"Fraunces", serif' }}
            >
              Tu agenda,
              <br />
              <em className="font-light italic" style={{ color: '#7DD3FC' }}>
                orquestada
              </em>
              <br />
              <span className="font-bold text-white">al detalle.</span>
            </h1>

            <p className="mt-7 text-[16px] leading-[1.65] text-white/75 max-w-md font-light">
              Reservas, equipo, inventario y métricas. Una plataforma que respira al ritmo de tu
              negocio.{' '}
              <span className="text-white/55">Premium. Simple. Sin fricción.</span>
            </p>
          </div>

          {/* LIVE OPS MOCK PANEL */}
          <div
            className="rounded-2xl overflow-hidden ns-hero-glass"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-white/10"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full ns-pulse-soft"
                  style={{ background: '#38BDF8' }}
                />
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/85"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  Agenda en vivo
                </p>
              </div>
              <p
                className="text-[10px] font-semibold text-white/55"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {fechaHoy} · {horaAhora}
              </p>
            </div>
            <ul className="divide-y divide-white/8">
              {[
                { h: '09:30', s: 'Corte + Barba', c: 'M. Álvarez', t: 'Confirmado' },
                { h: '11:00', s: 'Coloración', c: 'L. Pereyra', t: 'En curso' },
                { h: '14:15', s: 'Manicura', c: 'P. Romero', t: 'Pendiente' },
              ].map((r, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[60px_1fr_auto] items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors"
                >
                  <span
                    className="text-[12px] font-bold"
                    style={{ fontFamily: '"JetBrains Mono", monospace', color: '#7DD3FC' }}
                  >
                    {r.h}
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-white leading-tight">{r.s}</p>
                    <p className="text-[10px] text-white/55 mt-0.5">{r.c}</p>
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      background:
                        r.t === 'En curso'
                          ? 'rgba(52, 211, 153, 0.18)'
                          : r.t === 'Confirmado'
                          ? 'rgba(56, 189, 248, 0.18)'
                          : 'rgba(251, 191, 36, 0.18)',
                      color:
                        r.t === 'En curso'
                          ? '#6EE7B7'
                          : r.t === 'Confirmado'
                          ? '#7DD3FC'
                          : '#FCD34D',
                    }}
                  >
                    {r.t}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* FOOTER STRIP */}
          <footer
            className="mt-10 pt-5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <div className="flex items-center gap-4">
              <span>v2.5.0</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#34D399', boxShadow: '0 0 8px #34D399' }}
                />
                Servicios operativos
              </span>
            </div>
            <span>© {new Date().getFullYear()} · Hecho con oficio</span>
          </footer>
        </div>
      </aside>

      {/* ═══════════════════ RIGHT — FORM ═══════════════════ */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 sm:px-10 lg:px-14 relative">
        {/* Top right: theme toggle */}
        <div className="absolute top-6 right-6 z-10">
          <ThemeToggle testId="theme-toggle-btn" />
        </div>

        {/* Mobile brand strip */}
        <div
          className="lg:hidden w-full max-w-[420px] flex items-center justify-between mb-10"
          data-testid="brand-mobile"
        >
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
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{ background: 'var(--ns-primary-light)' }}
              />
            </div>
            <div className="leading-none">
              <p
                className="font-bold text-[16px] tracking-tight"
                style={{ color: 'var(--ns-text)' }}
              >
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
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.25em]"
            style={{
              color: 'var(--ns-text-muted)',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {horaAhora}
          </span>
        </div>

        <div className="w-full max-w-[440px]">
          {/* HEADER */}
          <div className="mb-9">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  color: 'var(--ns-primary)',
                }}
              >
                {mode === 'login' ? 'N°02 · Acceso' : mode === 'registro' ? 'N°00 · Registro' : 'N°03 · Recuperar'}
              </span>
              <div className="h-px flex-1" style={{ background: 'var(--ns-border)' }} />
            </div>

            <h2
              className="text-[36px] sm:text-[44px] leading-[1.05] tracking-[-0.025em] font-light"
              style={{ fontFamily: '"Fraunces", serif', color: 'var(--ns-text)' }}
              data-testid="login-title"
            >
              {configUI[mode].titulo}{' '}
              <em className="italic font-semibold" style={{ color: 'var(--ns-primary)' }}>
                {configUI[mode].acento}
                {mode === 'login' || mode === 'registro' ? '.' : ''}
              </em>
            </h2>
            <p
              className="mt-4 text-[15px] font-medium leading-relaxed"
              style={{ color: 'var(--ns-text-secondary)' }}
              data-testid="login-subtitle"
            >
              {configUI[mode].subtitulo}
            </p>
          </div>

          {/* MENSAJE */}
          {mensaje && (
            <div
              role="alert"
              data-testid={`alert-${mensaje.tipo}`}
              className="mb-6 p-4 text-[13px] font-medium flex items-start gap-3 rounded-xl border"
              style={{
                background:
                  mensaje.tipo === 'error' ? 'var(--ns-danger-bg)' : 'var(--ns-success-bg)',
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="leading-snug">{mensaje.texto}</p>
                {cooldown > 0 && mensaje.tipo === 'error' && (
                  <div className="mt-2 h-1 w-full rounded-full overflow-hidden bg-white/40">
                    <div
                      className="h-full transition-all duration-1000 ease-linear"
                      style={{
                        width: `${(cooldown / COOLDOWN_SEGUNDOS) * 100}%`,
                        background: 'var(--ns-danger)',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SOCIAL */}
          {mode !== 'recuperar' && (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading || cooldown > 0}
                  data-testid="google-login-btn"
                  className="group flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--ns-surface)',
                    border: '1.5px solid var(--ns-border)',
                    color: 'var(--ns-text)',
                  }}
                  onMouseEnter={(e) =>
                    !e.currentTarget.disabled &&
                    (e.currentTarget.style.borderColor = 'var(--ns-primary)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ns-border)')}
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('github')}
                  disabled={loading || cooldown > 0}
                  data-testid="github-login-btn"
                  className="group flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--ns-surface)',
                    border: '1.5px solid var(--ns-border)',
                    color: 'var(--ns-text)',
                  }}
                  onMouseEnter={(e) =>
                    !e.currentTarget.disabled &&
                    (e.currentTarget.style.borderColor = 'var(--ns-primary)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ns-border)')}
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  <span>GitHub</span>
                </button>
              </div>
              <div className="relative mb-6 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--ns-border)' }} />
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                  style={{
                    color: 'var(--ns-text-muted)',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  O con email
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--ns-border)' }} />
              </div>
            </>
          )}

          {/* FORM */}
          <form onSubmit={handleAuth} className="space-y-5" data-testid="auth-form">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-2"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  color: 'var(--ns-text-secondary)',
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                disabled={loading || cooldown > 0}
                autoComplete="email"
                data-testid="email-input"
                className="ns-input-clean disabled:opacity-50"
              />
            </div>

            {/* Password */}
            {mode !== 'recuperar' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-bold uppercase tracking-[0.2em]"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      color: 'var(--ns-text-secondary)',
                    }}
                  >
                    Contraseña
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => cambiarModo('recuperar')}
                      data-testid="forgot-password-link"
                      className="text-[11px] font-semibold transition-colors underline-offset-4 hover:underline"
                      style={{ color: 'var(--ns-primary)' }}
                    >
                      ¿La olvidaste?
                    </button>
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
                    data-testid="password-input"
                    className="ns-input-clean pr-11 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="toggle-password-visibility"
                    aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
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
                {renderPasswordMeter()}
              </div>
            )}

            {/* Confirmar */}
            {mode === 'registro' && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-2"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: 'var(--ns-text-secondary)',
                  }}
                >
                  Confirmar contraseña
                </label>
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
                  className="ns-input-clean disabled:opacity-50"
                  style={
                    confirmPassword.length > 0 && password !== confirmPassword
                      ? { borderColor: 'var(--ns-danger)' }
                      : undefined
                  }
                />
              </div>
            )}

            {/* Terms */}
            {mode === 'registro' && (
              <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  disabled={cooldown > 0}
                  data-testid="terms-checkbox"
                  className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-sky-500"
                />
                <span className="text-[12.5px] leading-snug" style={{ color: 'var(--ns-text-secondary)' }}>
                  Acepto los{' '}
                  <a
                    href="#"
                    className="font-semibold underline-offset-4 hover:underline"
                    style={{ color: 'var(--ns-primary)' }}
                  >
                    Términos
                  </a>{' '}
                  y la{' '}
                  <a
                    href="#"
                    className="font-semibold underline-offset-4 hover:underline"
                    style={{ color: 'var(--ns-primary)' }}
                  >
                    Política de Privacidad
                  </a>
                  .
                </span>
              </label>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={botonDeshabilitado}
              data-testid="submit-btn"
              className="ns-btn-celeste w-full mt-2"
              style={{ marginTop: '8px' }}
            >
              {renderBotonTexto()}
            </button>
          </form>

          {/* SWITCH */}
          <div
            className="mt-8 pt-5 border-t"
            style={{ borderColor: 'var(--ns-border)' }}
          >
            {mode === 'recuperar' ? (
              <button
                type="button"
                onClick={() => cambiarModo('login')}
                data-testid="back-to-login"
                className="text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5"
                style={{ color: 'var(--ns-text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ns-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ns-text-secondary)')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al inicio de sesión
              </button>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--ns-text-secondary)' }}>
                {mode === 'login' ? '¿Primera vez por acá?' : '¿Ya tenés cuenta?'}{' '}
                <button
                  type="button"
                  onClick={() => cambiarModo(mode === 'login' ? 'registro' : 'login')}
                  data-testid="switch-mode-link"
                  className="font-bold underline-offset-4 hover:underline transition-colors"
                  style={{ color: 'var(--ns-primary)' }}
                >
                  {mode === 'login' ? 'Creá una cuenta gratis' : 'Iniciá sesión'}
                </button>
              </p>
            )}
          </div>

          {/* Mobile footer */}
          <div
            className="lg:hidden mt-10 pt-5 border-t flex items-center justify-between text-[10px] uppercase tracking-[0.25em]"
            style={{
              borderColor: 'var(--ns-border)',
              color: 'var(--ns-text-muted)',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            <span>© {new Date().getFullYear()} Noni</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ns-success)' }} />
              Online
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
