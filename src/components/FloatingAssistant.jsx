import { useState, useEffect, useRef } from 'react'
import { IconRobot, IconCheckCircle, IconBolt, IconChart, IconCalendar, IconPalette, IconRocket, IconClipboard } from './NoniIcons'

const ASSISTANT_KEY = 'ns_assistant_state_v2'
const ROBOT_NAME = 'Noni'

function getGreeting(nombre) {
  const h = new Date().getHours()
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  return nombre ? `${saludo}, ${nombre} 👋` : `${saludo} 👋`
}

// ── Typing Indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full ns-typing-dot"
          style={{ background: 'var(--ns-primary)', animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// ── Robot Avatar — Plastilina 3D ────────────────────────────────────────────
function RobotAvatar({ size = 40, speaking = false, mood = 'happy', blinking = false }) {
  const eyeRy = blinking ? 0.3 : mood === 'wink' ? 0.5 : 2.5
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow */}
      <circle cx="24" cy="25" r="18" fill="#5B3DF5" opacity={speaking ? 0.15 : 0.06} className={speaking ? 'ns-robot-glow' : ''} />
      {/* Antenna */}
      <line x1="24" y1="4" x2="24" y2="12" stroke="#8B7CF6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="3" r="2.5" fill="#5B3DF5" className="ns-robot-antenna" />
      {/* Head */}
      <rect x="8" y="12" width="32" height="26" rx="8" fill="url(#robotGradBrand)" />
      <rect x="8" y="12" width="32" height="26" rx="8" stroke="#8B7CF6" strokeWidth="1.5" fill="none" />
      {/* Visor */}
      <rect x="12" y="17" width="24" height="14" rx="5" fill="#1A1630" opacity="0.9" />
      {/* Eye glow */}
      <circle cx="19" cy="24" r="4" fill="#A78BFA" opacity="0.2" />
      <circle cx="29" cy="24" r="4" fill="#A78BFA" opacity="0.2" />
      {/* Eyes */}
      <ellipse cx="19" cy="24" rx="2.5" ry={eyeRy} fill="#A78BFA" style={{ transition: 'ry 0.1s' }} />
      <ellipse cx="29" cy="24" rx="2.5" ry={eyeRy} fill="#A78BFA" style={{ transition: 'ry 0.1s' }} />
      {/* Mouth */}
      <path
        d={speaking ? 'M20 28 Q24 31 28 28' : mood === 'happy' ? 'M20 28 Q24 30.5 28 28' : 'M20 28 Q24 29 28 28'}
        stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
      {/* Ears */}
      <rect x="4" y="20" width="5" height="8" rx="2" fill="#7C5CF8" />
      <rect x="39" y="20" width="5" height="8" rx="2" fill="#7C5CF8" />
      {/* Body hint */}
      <rect x="16" y="38" width="16" height="6" rx="3" fill="#5B3DF5" opacity="0.5" />
      <defs>
        <linearGradient id="robotGradBrand" x1="8" y1="12" x2="40" y2="38">
          <stop offset="0%" stopColor="#E8DEFF" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Contextual Messages ─────────────────────────────────────────────────────
const getContextualMessages = (tab, setupData, vocab, smartAlerts = {}) => {
  const messages = []

  if (!setupData.hasServicios && !setupData.hasEmpleados && !setupData.hasHorarios) {
    messages.push({
      id: 'welcome', priority: 1, emoji: 'bolt', badge: 'Empezar',
      title: '¡Hola! Soy Noni, tu asistente',
      text: 'Te guío paso a paso para configurar tu sistema de reservas. Hay 3 cosas esenciales: servicios, equipo y horarios.',
      cta: { label: 'Empezar →', tab: 'servicios' },
    })
  }

  if (setupData.hasServicios && !setupData.hasEmpleados) {
    messages.push({
      id: 'need-staff', priority: 2, emoji: 'bolt', badge: 'Siguiente paso',
      title: 'Bien, ya tenés servicios',
      text: 'Ahora agregá al menos un profesional. Los clientes podrán elegir con quién reservar.',
      cta: { label: 'Agregar equipo →', tab: 'equipo' },
    })
  }

  if (setupData.hasServicios && setupData.hasEmpleados && !setupData.hasHorarios) {
    messages.push({
      id: 'need-hours', priority: 2, emoji: 'calendar', badge: 'Último paso esencial',
      title: 'Casi listo, faltan tus horarios',
      text: 'Definí qué días y en qué horarios atendés. Sin horarios, los clientes no pueden ver turnos disponibles.',
      cta: { label: 'Configurar horarios →', tab: 'horarios' },
    })
  }

  if (setupData.hasServicios && setupData.hasEmpleados && setupData.hasHorarios && !setupData.hasShared) {
    messages.push({
      id: 'share-link', priority: 2, emoji: 'rocket', badge: '¡Listo!',
      title: '¡Tu sistema está listo!',
      text: 'Ya podés compartir tu link de reservas. Envialo por WhatsApp a tus clientes para que reserven solos, 24/7.',
      cta: { label: 'Copiar mi link', action: 'copy-link' },
    })
  }

  if (smartAlerts.turnosHoy > 0 && tab === 'inicio') {
    const ingFmt = smartAlerts.ingresosHoy?.toLocaleString() || '0'
    messages.push({
      id: 'smart-today', priority: 3, emoji: 'chart',
      title: `Hoy tenés ${smartAlerts.turnosHoy} ${smartAlerts.turnosHoy === 1 ? vocab?.turno || 'turno' : vocab?.turnos || 'turnos'}`,
      text: `Ingresos esperados: $${ingFmt}. ${smartAlerts.ocupacion > 70 ? '¡Gran ocupación!' : smartAlerts.ocupacion > 40 ? 'Buena actividad.' : 'Hay margen para más reservas.'}`,
    })
  }

  if (smartAlerts.proximaCita && tab === 'inicio') {
    const proximo = new Date(smartAlerts.proximaCita.fecha_hora)
    const diffMin = Math.round((proximo - new Date()) / 60000)
    if (diffMin > 0 && diffMin < 120) {
      messages.push({
        id: 'smart-proxima', priority: 2, emoji: 'calendar',
        title: `${smartAlerts.proximaCita.cliente_nombre} llega ${diffMin < 60 ? `en ${diffMin} min` : `en ${Math.floor(diffMin / 60)}h`}`,
        text: `${smartAlerts.proximaCita.servicios?.nombre || vocab?.servicio || 'Turno'}. ¿Querés enviarle un recordatorio?`,
        cta: { label: 'Ver agenda →', tab: 'agenda' },
      })
    }
  }

  if (smartAlerts.clientesVIP > 0 && tab === 'clientes') {
    messages.push({
      id: 'smart-vip', priority: 4, emoji: 'rocket',
      title: `Tenés ${smartAlerts.clientesVIP} ${smartAlerts.clientesVIP === 1 ? 'cliente VIP' : 'clientes VIP'}`,
      text: 'Son los que más vuelven. Considerá ofrecerles descuentos o beneficios exclusivos.',
    })
  }

  if (smartAlerts.ingresosMes > 0 && tab === 'reportes') {
    messages.push({
      id: 'smart-ingresos', priority: 4, emoji: 'chart',
      title: `Este mes: $${smartAlerts.ingresosMes?.toLocaleString()}`,
      text: `Con ${smartAlerts.turnosSemana} ${vocab?.turnos || 'turnos'} esta semana y ${smartAlerts.totalClientes} clientes registrados.`,
    })
  }

  switch (tab) {
    case 'inicio':
      if (setupData.hasServicios && setupData.hasEmpleados && setupData.hasHorarios && !smartAlerts.turnosHoy) {
        messages.push({ id: 'monitor-intro', priority: 5, emoji: 'chart', title: 'Tu panel de control', text: 'Acá ves el resumen de tu negocio en tiempo real. Se actualiza con cada reserva nueva.' })
      }
      break
    case 'agenda':
      messages.push({ id: 'agenda-help', priority: 4, emoji: 'calendar', title: 'Gestión de turnos', text: setupData.hasTurnos ? 'Desde acá podés ver, confirmar o cancelar turnos. También podés crear turnos manualmente.' : 'Cuando tus clientes reserven desde tu link, los turnos aparecen acá automáticamente.' })
      break
    case 'servicios':
      messages.push({ id: 'services-help', priority: 3, emoji: 'bolt', title: setupData.hasServicios ? 'Tus servicios' : '¿Qué es un servicio?', text: setupData.hasServicios ? 'Podés editar precios, duración y nombre en cualquier momento.' : 'Un servicio es lo que ofrecés: corte, consulta, clase... Cada uno tiene nombre, precio y duración.' })
      break
    case 'equipo':
      messages.push({ id: 'staff-help', priority: 3, emoji: 'robot', title: setupData.hasEmpleados ? 'Tu equipo' : '¿Para qué es el equipo?', text: setupData.hasEmpleados ? 'Podés agregar, editar o desactivar profesionales.' : 'Acá cargás a las personas que atienden. Si sos vos solo, ponete a vos mismo.' })
      break
    case 'horarios':
      messages.push({ id: 'hours-help', priority: 3, emoji: 'calendar', title: setupData.hasHorarios ? 'Horarios configurados' : '¿Cómo funcionan los horarios?', text: setupData.hasHorarios ? 'Podés modificar días y horarios cuando quieras.' : 'Elegí qué días abrís y en qué rango horario. El sistema calcula los turnos disponibles automáticamente.' })
      break
    case 'clientes':
      messages.push({ id: 'clients-help', priority: 5, emoji: 'robot', title: 'Base de clientes', text: 'Los clientes se agregan automáticamente cuando reservan. Ves su historial, frecuencia e ingresos. ¡Los VIP son los que más vuelven!' })
      break
    case 'reportes':
      messages.push({ id: 'reports-help', priority: 5, emoji: 'chart', title: 'Reportes y estadísticas', text: 'Visualizá ingresos, servicios más pedidos y rendimiento de tu equipo. Los datos vienen de tus turnos confirmados.' })
      break
    case 'ajustes':
      messages.push({ id: 'settings-help', priority: 4, emoji: 'palette', title: 'Personalizá tu marca', text: 'Subí tu logo, elegí tu color y escribí tu bio. Todo esto lo ven tus clientes al abrir tu link de reservas.' })
      break
    case 'flyer':
      messages.push({ id: 'flyer-help', priority: 5, emoji: 'palette', title: 'Creador de flyers', text: 'Diseñá un flyer con tu link de reservas y compartilo en redes. Elegí el formato y estilo que más te guste.' })
      break
  }

  messages.sort((a, b) => a.priority - b.priority)
  return messages
}

const QUICK_TIPS = [
  'Tip: Compartí tu link de reservas en tu bio de Instagram para recibir reservas automáticas.',
  'Tip: Si un cliente te llama, podés crear el turno manualmente desde la Agenda.',
  'Tip: Los horarios que configurás definen qué turnos ven disponibles tus clientes.',
  'Tip: Podés cambiar precios y duración de servicios en cualquier momento.',
  'Tip: El color que elegís en Ajustes se refleja en la app que ven tus clientes.',
  'Tip: Los clientes VIP son los que visitaron 10 o más veces. ¡Cuidalos!',
  'Tip: Podés desactivar un profesional temporalmente sin eliminarlo.',
]

// ── Main Component ──────────────────────────────────────────────────────────
export default function FloatingAssistant({
  tab, setupData, vocab, publicLink, onNavigate, onStartTour, negocioNombre, smartAlerts = {},
}) {
  const [open, setOpen] = useState(false)
  const [messageIdx, setMessageIdx] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [quickTip, setQuickTip] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const [mood, setMood] = useState('happy')
  const [showBubble, setShowBubble] = useState(false)
  const [copyToast, setCopyToast] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [blinking, setBlinking] = useState(false)
  const panelRef = useRef(null)

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ASSISTANT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.dismissed) setDismissed(true)
      }
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(ASSISTANT_KEY, JSON.stringify({ dismissed }))
  }, [dismissed])

  // Speaking animation when panel opens or message changes
  useEffect(() => {
    if (open) {
      setIsTyping(true)
      const t1 = setTimeout(() => { setIsTyping(false); setSpeaking(true) }, 600)
      const t2 = setTimeout(() => setSpeaking(false), 2600)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [open, messageIdx, tab])

  useEffect(() => {
    if (!setupData.hasServicios || !setupData.hasEmpleados || !setupData.hasHorarios) setShowPulse(true)
  }, [setupData])

  useEffect(() => {
    setQuickTip(QUICK_TIPS[Math.floor(Math.random() * QUICK_TIPS.length)])
    const interval = setInterval(() => setQuickTip(QUICK_TIPS[Math.floor(Math.random() * QUICK_TIPS.length)]), 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { setMessageIdx(0) }, [tab])

  // Auto-show speech bubble for first time users
  useEffect(() => {
    const bubbleSeen = localStorage.getItem('ns_bubble_shown')
    if (!bubbleSeen && !open) {
      const t1 = setTimeout(() => { setShowBubble(true); localStorage.setItem('ns_bubble_shown', '1') }, 3000)
      const t2 = setTimeout(() => setShowBubble(false), 11000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [])

  // Blink + wink randomly
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 150)
    }, 3000 + Math.random() * 2000)
    const winkInterval = setInterval(() => {
      if (!open) { setMood('wink'); setTimeout(() => setMood('happy'), 400) }
    }, 12000)
    return () => { clearInterval(blinkInterval); clearInterval(winkInterval) }
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (dismissed) {
    return (
      <button
        className="ns-assistant-reshow"
        onClick={() => { setDismissed(false); setOpen(true); localStorage.setItem(ASSISTANT_KEY, JSON.stringify({ dismissed: false })) }}
        title="Mostrar a Noni"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    )
  }

  const messages = getContextualMessages(tab, setupData, vocab, smartAlerts)
  const currentMessage = messages[messageIdx] || messages[0]

  const setupSteps = [setupData.hasServicios, setupData.hasEmpleados, setupData.hasHorarios, setupData.hasBranding, setupData.hasShared]
  const completedCount = setupSteps.filter(Boolean).length
  const totalSteps = setupSteps.length
  const progress = Math.round((completedCount / totalSteps) * 100)
  const allDone = completedCount === totalSteps

  const handleCta = (cta) => {
    if (cta.tab) { onNavigate?.(cta.tab); setOpen(false) }
    if (cta.action === 'copy-link') {
      navigator.clipboard.writeText(publicLink || '').catch(() => {})
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 3000)
    }
  }

  return (
    <>
      {/* Copy toast — Plastilina */}
      {copyToast && (
        <div className="ns-copy-toast">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <IconCheckCircle size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-black" style={{ color: 'var(--ns-text)' }}>¡Link copiado!</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>Compartilo por WhatsApp o redes</p>
          </div>
        </div>
      )}

      {/* ── FAB Button — Plastilina 3D ── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setShowPulse(false); setShowBubble(false) }}
          className="ns-assistant-fab"
          title={`${ROBOT_NAME} — Tu asistente`}
        >
          {/* Pulse ring */}
          {showPulse && !allDone && <span className="ns-assistant-pulse" />}

          {/* Avatar container — Plastilina */}
          <div className="relative z-10">
            <RobotAvatar size={34} speaking={false} mood={mood} blinking={blinking} />
          </div>

          {/* Speech bubble */}
          {showBubble && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 rounded-2xl px-4 py-3 whitespace-nowrap pointer-events-none ns-fade-up"
              style={{ background: 'white', boxShadow: 'var(--ns-shadow-lg)', border: '1px solid var(--ns-border)' }}>
              <p className="text-xs font-black" style={{ color: 'var(--ns-text)' }}>¡Hola! Soy <span style={{ color: 'var(--ns-primary)' }}>Noni</span></p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>Tocame para empezar</p>
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-[-45deg]"
                style={{ border: '1px solid var(--ns-border)', borderLeft: 'none', borderTop: 'none' }} />
            </div>
          )}

          {/* Progress badge */}
          {!allDone ? (
            <span className="ns-assistant-badge">{completedCount}/{totalSteps}</span>
          ) : (
            <span className="ns-assistant-badge ns-assistant-badge--done">✓</span>
          )}
        </button>
      )}

      {/* ── Panel — Plastilina 3D ── */}
      {open && (
        <div ref={panelRef} className="ns-assistant-panel">

          {/* Header — Plastilina gradient */}
          <div className="relative overflow-hidden rounded-t-[1.75rem]" style={{ background: 'var(--ns-gradient-1)' }}>
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(20px)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(15px)', transform: 'translate(-20%, 20%)' }} />
            {/* Shine */}
            <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 100%)' }} />

            <div className="relative px-5 pt-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                  <RobotAvatar size={26} speaking={speaking} mood="happy" blinking={blinking} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white tracking-tight">{ROBOT_NAME}</h4>
                  <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">
                    {speaking ? 'Escribiendo...' : 'Tu asistente IA'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                title="Cerrar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Greeting */}
            <div className="px-5 pb-4">
              <p className="text-[11px] text-white/80 font-medium">{getGreeting(negocioNombre)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          {!allDone && (
            <div className="px-5 pt-3 pb-2" style={{ background: 'var(--ns-accent-bg)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Configuración</span>
                <span className="text-[9px] font-black" style={{ color: 'var(--ns-primary)' }}>{progress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--ns-border)', boxShadow: 'var(--ns-shadow-inner)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ background: 'var(--ns-gradient-1)', width: `${progress}%`, boxShadow: '0 0 8px rgba(91,61,245,0.4)' }}
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {setupSteps.map((done, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
                    style={{ background: done ? 'var(--ns-primary)' : 'var(--ns-border)' }} />
                ))}
              </div>
            </div>
          )}

          {/* Message Body */}
          <div className="ns-assistant-body">
            {isTyping && <TypingIndicator />}
            {!isTyping && currentMessage && (
              <div key={currentMessage.id} className="ns-assistant-message ns-fade-up">
                {currentMessage.badge && (
                  <span className="ns-assistant-msg-badge">{currentMessage.badge}</span>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'var(--ns-primary-bg)' }}>
                    {currentMessage.emoji === 'bolt' && <IconBolt size={16} className="text-[#5B3DF5]" />}
                    {currentMessage.emoji === 'rocket' && <IconRocket size={16} className="text-[#5B3DF5]" />}
                    {currentMessage.emoji === 'chart' && <IconChart size={16} className="text-[#5B3DF5]" />}
                    {currentMessage.emoji === 'calendar' && <IconCalendar size={16} className="text-[#5B3DF5]" />}
                    {currentMessage.emoji === 'palette' && <IconPalette size={16} className="text-[#5B3DF5]" />}
                    {currentMessage.emoji === 'robot' && <IconRobot size={16} className="text-[#5B3DF5]" />}
                    {currentMessage.emoji === 'clipboard' && <IconClipboard size={16} className="text-[#5B3DF5]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black leading-tight" style={{ color: 'var(--ns-text)' }}>{currentMessage.title}</p>
                    <p className="text-[11px] font-medium leading-relaxed mt-1" style={{ color: 'var(--ns-text-secondary)' }}>{currentMessage.text}</p>
                  </div>
                </div>
                {currentMessage.cta && (
                  <button
                    onClick={() => handleCta(currentMessage.cta)}
                    className="ns-assistant-cta mt-3 w-full"
                  >
                    {currentMessage.cta.label}
                  </button>
                )}
              </div>
            )}

            {/* Message navigation dots */}
            {messages.length > 1 && (
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1.5">
                  {messages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMessageIdx(i)}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: i === messageIdx ? '16px' : '6px',
                        background: i === messageIdx ? 'var(--ns-primary)' : 'var(--ns-border)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMessageIdx(i => Math.max(0, i - 1))}
                    disabled={messageIdx === 0}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: 'var(--ns-accent-bg)', color: 'var(--ns-text-muted)' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button
                    onClick={() => setMessageIdx(i => Math.min(messages.length - 1, i + 1))}
                    disabled={messageIdx === messages.length - 1}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: 'var(--ns-accent-bg)', color: 'var(--ns-text-muted)' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Tip */}
          <div className="ns-assistant-tip">
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <p className="text-[10px] font-medium leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>{quickTip}</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="ns-assistant-footer">
            <button
              onClick={() => { onStartTour?.(); setOpen(false) }}
              className="ns-assistant-footer-btn"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Tour guiado
            </button>
            <button
              onClick={() => { setDismissed(true); setOpen(false) }}
              className="ns-assistant-footer-btn ns-assistant-footer-btn--muted"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ocultar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
