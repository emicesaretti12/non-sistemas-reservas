import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ASSISTANT_KEY = 'ns_assistant_state_v2'
const ROBOT_NAME = 'Noni'

// ── Robot SVG Avatar ────────────────────────────────────────────────────────
function RobotAvatar({ size = 40, speaking = false, mood = 'happy' }) {
  const eyeVariants = {
    happy: { ry: 2.5, y: 0 },
    wink: { ry: 0.5, y: 0 },
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <motion.line
        x1="24" y1="4" x2="24" y2="12"
        stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round"
        animate={{ y1: speaking ? 2 : 4 }}
        transition={{ repeat: speaking ? Infinity : 0, repeatType: 'reverse', duration: 0.4 }}
      />
      <motion.circle
        cx="24" cy="3" r="2.5" fill="#a29bfe"
        animate={{ scale: speaking ? [1, 1.3, 1] : 1, fill: speaking ? ['#a29bfe', '#6c5ce7', '#a29bfe'] : '#a29bfe' }}
        transition={{ repeat: speaking ? Infinity : 0, duration: 0.8 }}
      />
      {/* Head */}
      <rect x="8" y="12" width="32" height="26" rx="8" fill="url(#robotGrad)" />
      <rect x="8" y="12" width="32" height="26" rx="8" stroke="#6c5ce7" strokeWidth="1.5" fill="none" />
      {/* Visor / Face plate */}
      <rect x="12" y="17" width="24" height="14" rx="5" fill="#1e1e2e" opacity="0.85" />
      {/* Eyes */}
      <motion.ellipse
        cx="19" cy="24" rx="2.5"
        fill="#00cec9"
        animate={mood === 'wink' ? eyeVariants.wink : eyeVariants.happy}
        transition={{ duration: 0.3 }}
        ry={mood === 'wink' ? 0.5 : 2.5}
      />
      <motion.ellipse
        cx="29" cy="24" rx="2.5" ry="2.5"
        fill="#00cec9"
        animate={{ scale: speaking ? [1, 1.15, 1] : 1 }}
        transition={{ repeat: speaking ? Infinity : 0, duration: 0.6 }}
      />
      {/* Mouth */}
      <motion.path
        d={speaking ? "M20 28 Q24 31 28 28" : "M20 28 Q24 30 28 28"}
        stroke="#00cec9"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        animate={speaking ? { d: ["M20 28 Q24 31 28 28", "M20 28 Q24 27 28 28", "M20 28 Q24 31 28 28"] } : {}}
        transition={{ repeat: speaking ? Infinity : 0, duration: 0.5 }}
      />
      {/* Ears */}
      <rect x="4" y="20" width="5" height="8" rx="2" fill="#6c5ce7" />
      <rect x="39" y="20" width="5" height="8" rx="2" fill="#6c5ce7" />
      {/* Body hint */}
      <rect x="16" y="38" width="16" height="6" rx="3" fill="#6c5ce7" opacity="0.5" />
      <defs>
        <linearGradient id="robotGrad" x1="8" y1="12" x2="40" y2="38">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Contextual Messages Config ──────────────────────────────────────────────
const getContextualMessages = (tab, setupData, vocab) => {
  const messages = []

  // Global urgent messages based on setup state
  if (!setupData.hasServicios && !setupData.hasEmpleados && !setupData.hasHorarios) {
    messages.push({
      id: 'welcome',
      priority: 1,
      emoji: '👋',
      title: '¡Hola! Soy Noni, tu asistente',
      text: 'Te voy a guiar paso a paso para configurar tu sistema de reservas. Hay 3 cosas esenciales que necesitás configurar: servicios, equipo y horarios. ¡Arranquemos!',
      cta: { label: 'Empezar →', tab: 'servicios' },
      badge: '⚡ Empezar',
    })
  }

  if (setupData.hasServicios && !setupData.hasEmpleados) {
    messages.push({
      id: 'need-staff',
      priority: 2,
      emoji: '👥',
      title: 'Bien, ya tenés servicios',
      text: 'Ahora necesitás agregar al menos un profesional. Los clientes van a poder elegir con quién reservar.',
      cta: { label: 'Agregar equipo →', tab: 'equipo' },
      badge: '⚡ Siguiente paso',
    })
  }

  if (setupData.hasServicios && setupData.hasEmpleados && !setupData.hasHorarios) {
    messages.push({
      id: 'need-hours',
      priority: 2,
      emoji: '🕐',
      title: 'Casi listo, faltan tus horarios',
      text: 'Definí qué días y en qué horarios atendés. Sin horarios configurados, los clientes no pueden ver turnos disponibles.',
      cta: { label: 'Configurar horarios →', tab: 'horarios' },
      badge: '⚡ Último paso esencial',
    })
  }

  if (setupData.hasServicios && setupData.hasEmpleados && setupData.hasHorarios && !setupData.hasShared) {
    messages.push({
      id: 'share-link',
      priority: 2,
      emoji: '🚀',
      title: '¡Tu sistema está listo!',
      text: 'Ya podés compartir tu link de reservas. Envialo por WhatsApp a tus clientes para que empiecen a reservar solos, 24/7.',
      cta: { label: 'Copiar mi link', action: 'copy-link' },
      badge: '🎉 ¡Listo!',
    })
  }

  // Tab-specific educational messages
  switch (tab) {
    case 'inicio':
      if (setupData.hasServicios && setupData.hasEmpleados && setupData.hasHorarios) {
        messages.push({
          id: 'monitor-intro',
          priority: 5,
          emoji: '📊',
          title: 'Este es tu Monitor',
          text: 'Acá ves un resumen de tu negocio en tiempo real: turnos del día, ingresos, actividad reciente. Se actualiza solo cada vez que recibís una reserva.',
        })
      }
      break

    case 'agenda':
      messages.push({
        id: 'agenda-help',
        priority: 4,
        emoji: '📅',
        title: 'Gestión de turnos',
        text: setupData.hasTurnos
          ? 'Desde acá podés ver, confirmar o cancelar turnos. También podés crear turnos manualmente si un cliente te llama por teléfono.'
          : 'Cuando tus clientes reserven desde tu link, los turnos aparecen acá automáticamente. También podés crear turnos a mano con el botón "+".',
        cta: setupData.hasTurnos ? undefined : { label: 'Crear turno manual', action: 'none' },
      })
      break

    case 'servicios':
      messages.push({
        id: 'services-help',
        priority: 3,
        emoji: '⚡',
        title: setupData.hasServicios ? 'Tus servicios' : '¿Qué es un servicio?',
        text: setupData.hasServicios
          ? 'Podés editar precios, duración y nombre en cualquier momento. Los cambios se reflejan al instante en tu app pública.'
          : 'Un servicio es lo que ofrecés: un corte, una consulta, una clase, un turno... Cada servicio tiene nombre, precio y cuánto dura. Tus clientes lo ven al reservar.',
      })
      break

    case 'equipo':
      messages.push({
        id: 'staff-help',
        priority: 3,
        emoji: '👤',
        title: setupData.hasEmpleados ? 'Tu equipo' : '¿Para qué es el equipo?',
        text: setupData.hasEmpleados
          ? 'Podés agregar, editar o desactivar profesionales. Si trabajás solo, con un solo perfil alcanza.'
          : 'Acá cargás a las personas que atienden. Si sos vos solo, ponete a vos mismo. Los clientes van a elegir con quién quieren reservar.',
      })
      break

    case 'horarios':
      messages.push({
        id: 'hours-help',
        priority: 3,
        emoji: '🕐',
        title: setupData.hasHorarios ? 'Horarios configurados' : '¿Cómo funcionan los horarios?',
        text: setupData.hasHorarios
          ? 'Podés modificar días y horarios cuando quieras. Si tenés que cerrar un día especial, simplemente desactivá ese día.'
          : 'Elegí qué días de la semana abrís y en qué rango horario (ej: Lunes a Viernes de 9:00 a 18:00). El sistema calcula automáticamente los turnos disponibles.',
      })
      break

    case 'inventario':
      messages.push({
        id: 'inventory-help',
        priority: 5,
        emoji: '📦',
        title: 'Control de stock',
        text: 'Acá controlás tus productos e insumos. Definí un stock mínimo y el sistema te avisa cuando se está acabando. Útil para barberías, estéticas, veterinarias, etc.',
      })
      break

    case 'clientes':
      messages.push({
        id: 'clients-help',
        priority: 5,
        emoji: '🧑‍🤝‍🧑',
        title: 'Base de clientes',
        text: 'Los clientes se agregan automáticamente cuando reservan. Acá ves su historial, frecuencia de visitas e ingresos totales. ¡Los VIP son los que más vuelven!',
      })
      break

    case 'reportes':
      messages.push({
        id: 'reports-help',
        priority: 5,
        emoji: '📈',
        title: 'Reportes y estadísticas',
        text: 'Visualizá ingresos, servicios más pedidos y rendimiento de tu equipo. Los datos se calculan a partir de tus turnos confirmados.',
      })
      break

    case 'ajustes':
      messages.push({
        id: 'settings-help',
        priority: 4,
        emoji: '🎨',
        title: 'Personalizá tu marca',
        text: 'Subí tu logo, elegí tu color, escribí tu bio y agregá tu Instagram. Todo esto lo ven tus clientes cuando abren tu link de reservas.',
      })
      break
  }

  // Sort by priority (lower = more important)
  messages.sort((a, b) => a.priority - b.priority)

  return messages
}

// ── Quick Tips ──────────────────────────────────────────────────────────────
const QUICK_TIPS = [
  '💡 Compartí tu link de reservas en tu bio de Instagram para recibir reservas automáticas.',
  '💡 Si un cliente te llama, podés crear el turno manualmente desde la Agenda.',
  '💡 Los horarios que configurás definen qué turnos ven disponibles tus clientes.',
  '💡 Podés cambiar precios y duración de servicios en cualquier momento.',
  '💡 El color que elegís en Ajustes se refleja en la app que ven tus clientes.',
  '💡 Los clientes VIP son los que visitaron 10 o más veces. ¡Cuidalos!',
  '💡 Usá el inventario para trackear productos y recibir alertas de stock bajo.',
  '💡 Podés desactivar un profesional temporalmente sin eliminarlo.',
]

// ── Main Component ──────────────────────────────────────────────────────────
export default function FloatingAssistant({
  tab,
  setupData,
  vocab,
  publicLink,
  onNavigate,
  onStartTour,
}) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messageIdx, setMessageIdx] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [quickTip, setQuickTip] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const [mood, setMood] = useState('happy')
  const [showBubble, setShowBubble] = useState(false)
  const [copyToast, setCopyToast] = useState(false)
  const panelRef = useRef(null)

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ASSISTANT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.dismissed) setDismissed(true)
        if (parsed.minimized) setMinimized(true)
      }
    } catch {}
  }, [])

  // Save state
  useEffect(() => {
    localStorage.setItem(ASSISTANT_KEY, JSON.stringify({ dismissed, minimized }))
  }, [dismissed, minimized])

  // Speaking animation when panel opens or message changes
  useEffect(() => {
    if (open) {
      setSpeaking(true)
      const t = setTimeout(() => setSpeaking(false), 2000)
      return () => clearTimeout(t)
    }
  }, [open, messageIdx, tab])

  // Auto-show pulse for new users
  useEffect(() => {
    if (!setupData.hasServicios || !setupData.hasEmpleados || !setupData.hasHorarios) {
      setShowPulse(true)
    }
  }, [setupData])

  // Rotate quick tips
  useEffect(() => {
    setQuickTip(QUICK_TIPS[Math.floor(Math.random() * QUICK_TIPS.length)])
    const interval = setInterval(() => {
      setQuickTip(QUICK_TIPS[Math.floor(Math.random() * QUICK_TIPS.length)])
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Reset message index when tab changes
  useEffect(() => {
    setMessageIdx(0)
  }, [tab])

  // Auto-show speech bubble for first time users
  useEffect(() => {
    const bubbleSeen = localStorage.getItem('ns_bubble_shown')
    if (!bubbleSeen && !open) {
      const showTimer = setTimeout(() => {
        setShowBubble(true)
        localStorage.setItem('ns_bubble_shown', '1')
      }, 3000)
      const hideTimer = setTimeout(() => {
        setShowBubble(false)
      }, 11000) // 3s delay + 8s visible
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer) }
    }
  }, [])

  // Wink randomly
  useEffect(() => {
    const winkInterval = setInterval(() => {
      if (!open) {
        setMood('wink')
        setTimeout(() => setMood('happy'), 300)
      }
    }, 8000)
    return () => clearInterval(winkInterval)
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (dismissed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ns-assistant-reshow"
        onClick={() => { setDismissed(false); setOpen(true); localStorage.setItem(ASSISTANT_KEY, JSON.stringify({ dismissed: false, minimized: false })) }}
        title="Mostrar a Noni"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
    )
  }

  const messages = getContextualMessages(tab, setupData, vocab)
  const currentMessage = messages[messageIdx] || messages[0]

  // Calculate setup progress
  const setupSteps = [
    setupData.hasServicios,
    setupData.hasEmpleados,
    setupData.hasHorarios,
    setupData.hasBranding,
    setupData.hasShared,
  ]
  const completedCount = setupSteps.filter(Boolean).length
  const totalSteps = setupSteps.length
  const progress = Math.round((completedCount / totalSteps) * 100)
  const allDone = completedCount === totalSteps

  const handleCta = (cta) => {
    if (cta.tab) {
      onNavigate?.(cta.tab)
      setOpen(false)
    }
    if (cta.action === 'copy-link') {
      navigator.clipboard.writeText(publicLink || '').catch(() => {})
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 3000)
    }
  }

  return (
    <>
      {/* Copy toast */}
      {copyToast && (
        <div className="ns-copy-toast">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-xs font-bold text-slate-900">¡Link copiado!</p>
            <p className="text-[10px] text-slate-400 font-medium">Compartilo por WhatsApp o redes</p>
          </div>
        </div>
      )}

      {/* ── Floating Button ───────────────────────────────────────── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => { setOpen(true); setShowPulse(false); setShowBubble(false) }}
            className="ns-assistant-fab"
            title={`${ROBOT_NAME} — Tu asistente`}
          >
            {/* Pulse ring */}
            {showPulse && !allDone && (
              <span className="ns-assistant-pulse" />
            )}
            <RobotAvatar size={36} speaking={false} mood={mood} />
            {/* Speech bubble tooltip */}
            {showBubble && (
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-purple-100 px-4 py-3 whitespace-nowrap pointer-events-none"
              >
                <p className="text-xs font-bold text-slate-900">¡Hola! Soy <span className="text-purple-600">Noni</span> 🤖</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Tocame para empezar a configurar</p>
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-b border-purple-100 rotate-[-45deg]"></div>
              </motion.div>
            )}
            {/* Progress badge */}
            {!allDone && (
              <span className="ns-assistant-badge">
                {completedCount}/{totalSteps}
              </span>
            )}
            {allDone && (
              <span className="ns-assistant-badge ns-assistant-badge--done">✓</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="ns-assistant-panel"
          >
            {/* Header */}
            <div className="ns-assistant-header">
              <div className="flex items-center gap-3">
                <div className="ns-assistant-avatar-wrap">
                  <RobotAvatar size={32} speaking={speaking} mood="happy" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 tracking-tight">{ROBOT_NAME}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tu asistente</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  title="Minimizar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress Bar (only show if not all done) */}
            {!allDone && (
              <div className="px-5 pt-1 pb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Progreso de configuración</span>
                  <span className="text-[9px] font-black text-purple-600">{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #6c5ce7, #a29bfe, #00cec9)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Message */}
            <div className="ns-assistant-body">
              {currentMessage && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentMessage.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="ns-assistant-message"
                  >
                    {currentMessage.badge && (
                      <span className="ns-assistant-msg-badge">{currentMessage.badge}</span>
                    )}
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">{currentMessage.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 leading-tight">{currentMessage.title}</p>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">{currentMessage.text}</p>
                      </div>
                    </div>
                    {currentMessage.cta && (
                      <button
                        onClick={() => handleCta(currentMessage.cta)}
                        className="ns-assistant-cta mt-3"
                      >
                        {currentMessage.cta.label}
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Message navigation */}
              {messages.length > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-1">
                    {messages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setMessageIdx(i)}
                        className={`h-1.5 rounded-full transition-all ${i === messageIdx ? 'w-4 bg-purple-500' : 'w-1.5 bg-slate-200 hover:bg-slate-300'}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setMessageIdx(i => Math.max(0, i - 1))}
                      disabled={messageIdx === 0}
                      className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button
                      onClick={() => setMessageIdx(i => Math.min(messages.length - 1, i + 1))}
                      disabled={messageIdx === messages.length - 1}
                      className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tip */}
            <div className="ns-assistant-tip">
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{quickTip}</p>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
