import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import useCountUp from '../hooks/useCountUp'

// Contador que arranca recién cuando la sección entra en pantalla.
function Contador({ end, decimales = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const valor = useCountUp(visible ? end : 0, { duracion: 1400, decimales })

  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(nodo)
    return () => obs.disconnect()
  }, [])

  return <span ref={ref}>{valor.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}</span>
}

const FEATURES = [
  { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', t: 'Agenda inteligente', d: 'Reservas 24/7. Sin llamadas ni WhatsApp manual: todo automático.' },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', t: 'CRM automático', d: 'Base de clientes con frecuencia, ingresos e historial completo.' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', t: 'Reportes en vivo', d: 'Ingresos, ocupación y tendencias actualizados al instante.' },
  { icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', t: 'App con tu marca', d: 'Tu logo, tus colores y tu link propio. 100% a tu nombre.' },
  { icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', t: 'Control de stock', d: 'Inventario, costos y alertas de faltante. Todo integrado.' },
  { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', t: 'Seguridad seria', d: 'SSL, backups automáticos y permisos por usuario.' },
]

const TESTIMONIALS = [
  { name: 'Martín G.', biz: 'BarberKing', text: 'Pasé de anotar en un cuaderno a tener todo automatizado. Mis clientes reservan solos y yo me enfoco en cortar.', stars: 5 },
  { name: 'Lucía R.', biz: 'Estética Lux', text: 'En la primera semana ya recuperé la inversión. El CRM de clientes es increíble, sé exactamente quién vuelve.', stars: 5 },
  { name: 'Carlos M.', biz: 'La Parrilla de Carlos', text: 'Antes perdía reservas por WhatsApp. Ahora todo queda registrado y organizado. Muy profesional.', stars: 5 },
]

const FAQS = [
  { q: '¿Necesito saber programar?', a: 'No. Un asistente visual te guía paso a paso. En 5 minutos tenés tu sistema listo.' },
  { q: '¿Mis clientes necesitan descargar una app?', a: 'No. Entran desde cualquier navegador con un link. Funciona en todos los celulares.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Sin contratos ni permanencia mínima. Cancelás cuando quieras.' },
  { q: '¿Qué rubros soporta?', a: 'Barberías, restaurantes, estéticas, veterinarias, clínicas y cualquier negocio con turnos.' },
  { q: '¿Incluye soporte técnico?', a: 'Sí. Soporte por WhatsApp directo con nuestro equipo, incluido en el plan.' },
]

const PIPELINE = [
  { emoji: '📱', t: 'Cliente reserva', d: 'Desde el celular, 24/7' },
  { emoji: '⚡', t: 'Confirmación', d: 'Mensaje instantáneo' },
  { emoji: '🔔', t: 'Recordatorio', d: 'WhatsApp automático' },
  { emoji: '📊', t: 'CRM al día', d: 'Cliente + historial' },
  { emoji: '💰', t: 'Reporte listo', d: 'Ingresos en tiempo real' },
]

const PASOS = [
  { n: '01', t: 'Creá tu cuenta', d: 'Registrate con email o Google. Sin tarjeta.' },
  { n: '02', t: 'Configurá todo', d: 'Un asistente te guía: nombre, horarios, servicios y equipo.' },
  { n: '03', t: 'Recibí reservas', d: 'Compartí tu link único y empezá a recibir clientes.' },
]

const INCLUYE = [
  'Reservas online ilimitadas',
  'App personalizada con tu marca',
  'CRM de clientes automático',
  'Reportes e inteligencia',
  'Control de inventario',
  'Gestión de equipo',
  'Soporte por WhatsApp',
  'Actualizaciones incluidas',
]

// Maqueta de celular: un teléfono de papel extruido que cicla pantallas reales.
function PhoneMockup() {
  const [screen, setScreen] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (pausado) return
    const t = setInterval(() => setScreen((s) => (s + 1) % 4), 3200)
    return () => clearInterval(t)
  }, [pausado])

  const screens = [
    { title: 'Reserva online', items: ['Corte clásico — $3.500', 'Barba premium — $2.800', 'Combo completo — $5.500'], badge: 'Paso 1: elegí servicio' },
    { title: 'Panel del día', items: ['12 turnos hoy', '$42.000 de ingresos', '98% de ocupación'], badge: 'En tiempo real' },
    { title: 'Clientes', items: ['Martín — VIP (23 visitas)', 'Lucía — Frecuente (8)', 'Carlos — Nuevo (1)'], badge: 'Base automática' },
    { title: 'Confirmado', items: ['Corte + Barba', 'Hoy 15:30 hs', 'Carlos López'], badge: 'Confirmación instantánea' },
  ]
  const s = screens[screen]

  return (
    <div
      className="max-w-sm mx-auto px-5 pb-12 md:pb-16"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="relative mx-auto w-[268px] md:w-[288px]">
        {/* Carcasa */}
        <div
          className="rounded-[2.8rem] p-2.5 overflow-hidden"
          style={{ background: 'var(--ns-surface)', boxShadow: 'var(--ui-shadow-xl)' }}
        >
          {/* Pantalla hundida dentro de la carcasa */}
          <div
            className="rounded-[2.2rem] overflow-hidden flex flex-col min-h-[392px]"
            style={{ background: 'var(--ns-paper)', boxShadow: 'var(--ui-field-deep)' }}
          >
            {/* Muesca */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--ns-mix-12)' }} />
            </div>

            {/* Cabecera de la pantalla */}
            <div
              className="px-5 py-3.5 flex items-center justify-between mx-2.5 rounded-[18px]"
              style={{ background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)' }}
            >
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.07em] opacity-70">{s.badge}</p>
                <h4 className="text-sm font-bold tracking-tight mt-0.5">{s.title}</h4>
              </div>
              <div
                className="w-8 h-8 rounded-[11px] flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                NS
              </div>
            </div>

            {/* Filas */}
            <div key={screen} className="flex-1 p-4 space-y-2.5">
              {s.items.map((item, i) => (
                <div
                  key={item}
                  className="flex items-center gap-3 p-3 rounded-[16px] ns-fade-up"
                  style={{
                    background: 'var(--ns-surface)',
                    boxShadow: 'var(--ui-shadow-sm)',
                    animationDelay: `${i * 0.08}s`
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-[11px] flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)' }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>
                    {item}
                  </span>
                </div>
              ))}
              {screen === 3 && (
                <div
                  className="mt-3 py-3 rounded-[16px] text-center font-bold text-[10px] uppercase tracking-[0.07em] ns-fade-up"
                  style={{ background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)' }}
                >
                  Reserva confirmada ✓
                </div>
              )}
            </div>

            {/* Barra de inicio */}
            <div className="flex justify-center py-2.5">
              <div className="w-24 h-1 rounded-full" style={{ background: 'var(--ns-mix-12)' }} />
            </div>
          </div>
        </div>

        {/* Puntos de navegación */}
        <div className="flex justify-center gap-2 mt-5">
          {screens.map((sc, i) => (
            <button
              key={sc.title}
              onClick={() => setScreen(i)}
              aria-label={`Ver ${sc.title}`}
              className="h-2 rounded-full transition-all duration-400"
              style={{
                width: screen === i ? 26 : 8,
                background: screen === i ? 'var(--ns-primary)' : 'var(--ns-mix-16)',
                boxShadow: screen === i ? '0 2px 8px rgba(16,24,40,0.3)' : 'var(--ui-field-sm)'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const nav = useNavigate()
  const [faq, setFaq] = useState(null)

  const Ic = ({ d, cls = 'w-5 h-5' }) => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div className="min-h-screen font-sans antialiased overflow-x-hidden" style={{ background: 'var(--ns-bg)', color: 'var(--ns-text)' }}>
      {/* NAV */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'var(--ns-glass-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 6px 22px rgba(0,122,255,0.05)'
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-[13px] flex items-center justify-center"
              style={{ background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)', boxShadow: '0 6px 16px rgba(16,24,40,0.28)' }}
            >
              <span className="font-bold text-[10px] italic">NS</span>
            </div>
            <span className="text-sm font-bold tracking-tight">Non sistemas</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[['#features', 'Funciones'], ['#como', 'Cómo funciona'], ['#precio', 'Precio'], ['#faq', 'FAQ']].map(([h, l]) => (
              <a
                key={h}
                href={h}
                className="text-[11px] font-bold uppercase tracking-[0.06em] transition-colors"
                style={{ color: 'var(--ns-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ns-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ns-text-muted)')}
              >
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => nav('/login')} className="ui-btn ui-btn--quiet ui-btn--pill hidden sm:inline-flex text-xs">
              Iniciar sesión
            </button>
            <button onClick={() => nav('/login')} className="ui-btn ui-btn--primary ui-btn--pill text-xs">
              Empezar gratis
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden ns-hero-gradient">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle,#007AFF 1px,transparent 1px)', backgroundSize: '38px 38px' }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-14 md:pb-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2.5 mb-7 ns-fade-up ui-chip ui-chip--soft">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full opacity-70" style={{ background: 'var(--ns-primary)' }} />
                <span className="relative rounded-full h-2 w-2" style={{ background: 'var(--ns-primary)' }} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.07em]">+200 negocios activos</span>
            </div>

            <h1
              className="text-[2.6rem] md:text-7xl font-bold tracking-[-0.04em] leading-[0.94] mb-5 ns-fade-up"
              style={{ animationDelay: '0.1s', fontFamily: 'var(--font-display)' }}
            >
              El sistema de reservas que <span className="ns-gradient-text">tu negocio merece</span>
            </h1>

            <p
              className="text-base md:text-xl font-medium leading-relaxed max-w-xl mx-auto mb-9 ns-fade-up"
              style={{ animationDelay: '0.2s', color: 'var(--ns-text-secondary)' }}
            >
              Automatizá turnos, conocé a tus clientes y hacé crecer tu negocio. Todo desde una plataforma que se configura en 5 minutos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center ns-fade-up" style={{ animationDelay: '0.3s' }}>
              <button onClick={() => nav('/login')} className="ui-btn ui-btn--primary ui-btn--pill ns-shimmer-btn px-9 py-4">
                Probar 7 días gratis
              </button>
              <a href="#como" className="ui-btn ui-btn--pill px-9 py-4">
                Ver la demo
              </a>
            </div>

            <p
              className="text-[10px] font-bold uppercase tracking-[0.06em] mt-6 ns-fade-up"
              style={{ animationDelay: '0.4s', color: 'var(--ns-text-muted)' }}
            >
              Sin tarjeta · Listo en 5 min · Cancelás cuando quieras
            </p>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="max-w-4xl mx-auto px-5 md:px-8 pb-10 md:pb-14">
          <div className="ui-well grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4">
            {[
              { n: 200, s: '+', l: 'Negocios activos' },
              { n: 15000, s: '+', l: 'Reservas por mes' },
              { n: 98, s: '%', l: 'Disponibilidad' },
              { n: 4.9, s: '★', l: 'Satisfacción', dec: 1 },
            ].map((s) => (
              <div key={s.l} className="ns-stat-landing">
                <p className="ui-stat__value text-2xl md:text-4xl">
                  <Contador end={s.n} decimales={s.dec || 0} />
                  {s.s}
                </p>
                <p className="ui-stat__label mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <PhoneMockup />

        {/* RUBROS */}
        <div className="max-w-6xl mx-auto px-5 md:px-8 pb-16 md:pb-24">
          <p className="ui-eyebrow text-center mb-5">Diseñado para todos los rubros</p>
          <div className="overflow-hidden relative">
            <div className="flex gap-3 ns-marquee" style={{ width: 'max-content' }}>
              {[...Array(2)].flatMap((_, r) =>
                ['🏥 Clínicas', '💇 Barberías', '🍽️ Restaurantes', '💅 Estéticas', '🐾 Veterinarias', '🏋️ Gimnasios', '📸 Estudios de foto', '🎓 Academias', '🧘 Spa & wellness', '🔧 Talleres', '🏨 Hoteles', '🎭 Eventos'].map((x) => (
                  <span key={`${r}-${x}`} className="ui-chip whitespace-nowrap">
                    {x}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FUNCIONES */}
      <section id="features" className="py-16 md:py-28" style={{ background: 'var(--ns-surface)' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-16">
            <p className="ui-eyebrow mb-3">Plataforma completa</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Todo lo que necesitás. Nada que sobre.
            </h2>
            <p className="text-sm font-medium mt-4 max-w-lg mx-auto" style={{ color: 'var(--ns-text-secondary)' }}>
              Reemplazá WhatsApp, Excel y el cuaderno con una sola herramienta.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {FEATURES.map((f) => (
              <div key={f.t} className="ns-feature-pro group">
                <div className="ui-pod ui-pod--lg mb-5 transition-transform duration-500 group-hover:scale-110">
                  <Ic d={f.icon} cls="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-2">{f.t}</h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>
                  {f.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" className="py-16 md:py-28">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-16">
            <p className="ui-eyebrow mb-3">3 pasos</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Empezá en minutos, no en semanas
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PASOS.map((p, i) => (
              <div key={p.n} className="relative group">
                <div className="ui-card ui-card--interactive p-8 h-full">
                  <span
                    className="text-6xl font-bold tracking-tight transition-opacity duration-500 opacity-15 group-hover:opacity-30"
                    style={{ color: 'var(--ns-primary)', fontFamily: 'var(--font-display)' }}
                  >
                    {p.n}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight mt-4 mb-2">{p.t}</h3>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>
                    {p.d}
                  </p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-7" style={{ color: 'var(--ns-mix-20)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUTOMATIZACIÓN */}
      <section className="py-16 md:py-28" style={{ background: 'var(--ns-surface)' }}>
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-16">
            <p className="ui-eyebrow mb-3">Automatización total</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Vos te enfocás en tu trabajo.
              <br />
              <span style={{ color: 'var(--ns-text-muted)' }}>El sistema hace el resto.</span>
            </h2>
          </div>

          {/* La secuencia se lee por relieve: cada paso sobresale un poco más */}
          <div className="ui-well grid grid-cols-1 md:grid-cols-5 gap-3 p-4 md:p-5">
            {PIPELINE.map((a, i) => (
              <div key={a.t} className="relative flex md:block items-center gap-3">
                <div
                  className="ui-tile ui-tile--interactive flex-1 md:flex-none w-full text-center p-4 md:p-5"
                  style={{ transitionDelay: `${i * 30}ms` }}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <p className="text-xs font-bold mt-2">{a.t}</p>
                  <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--ns-text-muted)' }}>
                    {a.d}
                  </p>
                </div>
                {i < PIPELINE.length - 1 && (
                  <svg
                    className="hidden md:block absolute top-1/2 -right-[13px] -translate-y-1/2 w-4 h-4 z-10"
                    style={{ color: 'var(--ns-mix-24)' }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <p className="ui-eyebrow text-center mt-8">Todo esto pasa solo. Sin intervención manual.</p>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="py-16 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="ui-eyebrow mb-3">Casos de éxito</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Lo que dicen nuestros clientes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="ns-testimonial">
                <div className="flex gap-0.5 mb-4" style={{ color: 'var(--ns-primary)' }} aria-label={`${t.stars} de 5 estrellas`}>
                  {Array(t.stars)
                    .fill(0)
                    .map((_, j) => (
                      <svg key={j} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                </div>
                <p className="text-sm font-medium leading-relaxed mb-5 italic" style={{ color: 'var(--ns-text-secondary)' }}>
                  «{t.text}»
                </p>
                <div className="ui-divider mb-4" />
                <div className="flex items-center gap-3">
                  <div className="ui-avatar ui-avatar--brand">{t.name[0]}</div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--ns-text-muted)' }}>
                      {t.biz}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIO */}
      <section id="precio" className="py-16 md:py-28" style={{ background: 'var(--ns-surface)' }}>
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="ui-eyebrow mb-3">Precio transparente</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Un plan. Todo incluido.
            </h2>
          </div>
          <div className="max-w-md mx-auto">
            <div
              className="relative rounded-[var(--ns-radius-2xl)] p-8 md:p-12 overflow-hidden ns-pricing-glow"
              style={{ background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)' }}
            >
              <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-[80px]" style={{ background: 'rgba(255,255,255,0.18)' }} />
              <div className="absolute -bottom-24 -left-24 w-44 h-44 rounded-full blur-[70px]" style={{ background: 'rgba(16,24,40,0.5)' }} />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="ui-onbrand-chip is-active text-[9px]">Más elegido</span>
                  <span className="ui-onbrand-chip text-[9px]">7 días gratis</span>
                </div>

                <h3 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Plan profesional
                </h3>
                <p className="text-sm font-medium mb-7" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Todo para operar como un profesional.
                </p>

                <div className="flex items-end gap-1.5 mb-8">
                  <span className="text-5xl md:text-6xl font-bold tracking-tight">$9.990</span>
                  <span className="text-sm font-bold mb-2.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    /mes
                  </span>
                </div>

                <ul className="space-y-3 mb-9">
                  {INCLUYE.map((x) => (
                    <li key={x} className="flex items-center gap-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.88)' }}>
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'var(--ns-paper)', color: 'var(--ns-primary)' }}
                      >
                        <Ic d="M5 13l4 4L19 7" cls="w-3 h-3" />
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => nav('/login')}
                  className="ui-onbrand-btn ns-shimmer-btn w-full py-4 text-[11px] uppercase tracking-[0.08em]"
                >
                  Empezar 7 días gratis
                </button>
                <p className="text-[10px] text-center mt-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Sin tarjeta de crédito
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-28">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <p className="ui-eyebrow mb-3">Preguntas frecuentes</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Lo que todos preguntan
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => {
              const abierta = faq === i
              return (
                <div
                  key={f.q}
                  className="rounded-[var(--ns-radius-lg)] overflow-hidden transition-all duration-400"
                  style={{
                    background: abierta ? 'var(--ns-sunken)' : 'var(--ns-surface)',
                    boxShadow: abierta ? 'var(--ui-field)' : 'var(--ui-shadow-sm)'
                  }}
                >
                  <button
                    onClick={() => setFaq(abierta ? null : i)}
                    aria-expanded={abierta}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                  >
                    <span className="text-sm font-bold">{f.q}</span>
                    <svg
                      className={`w-4 h-4 shrink-0 transition-transform duration-400 ${abierta ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--ns-primary)' }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div
                    className="grid transition-all duration-400"
                    style={{ gridTemplateRows: abierta ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm font-medium leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CIERRE */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div
            className="relative rounded-[var(--ns-radius-3xl)] overflow-hidden p-10 md:p-16 text-center"
            style={{ background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)', boxShadow: 'var(--ui-shadow-xl)' }}
          >
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[100px]" style={{ background: 'rgba(255,255,255,0.2)' }} />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[100px]" style={{ background: 'rgba(16,24,40,0.55)' }} />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                ¿Listo para profesionalizar tu negocio?
              </h2>
              <p className="text-sm md:text-base font-medium mb-9 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Sumate a los negocios que ya automatizan sus reservas.
              </p>
              <button
                onClick={() => nav('/login')}
                className="ui-onbrand-btn ns-shimmer-btn px-10 py-4 text-[11px] uppercase tracking-[0.08em]"
              >
                Crear mi cuenta gratis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PIE */}
      <footer className="py-10" style={{ background: 'var(--ns-surface)', boxShadow: '0 -1px 0 var(--ns-line)' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[11px] flex items-center justify-center"
              style={{ background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)' }}
            >
              <span className="font-bold text-[8px] italic">NS</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--ns-text-muted)' }}>
              Non Sistemas © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            {['Términos', 'Privacidad', 'Contacto'].map((x) => (
              <a
                key={x}
                href="#faq"
                className="text-[10px] font-bold uppercase tracking-[0.06em] transition-colors"
                style={{ color: 'var(--ns-text-muted)' }}
              >
                {x}
              </a>
            ))}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--ns-text-muted)' }}>
            Salsipuedes, Córdoba, Argentina
          </p>
        </div>
      </footer>
    </div>
  )
}
