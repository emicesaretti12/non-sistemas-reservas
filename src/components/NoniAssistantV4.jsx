import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconRobot, IconCheckCircle, IconBolt, IconChart, IconCalendar, IconPalette, IconRocket } from './NoniIcons'

const ASSISTANT_KEY = 'ns_noni_v4_state'

/**
 * Noni Assistant V4 — Asistente IA Mejorado
 * - Respuestas inteligentes basadas en contexto real
 * - Integración completa con dashboard
 * - UI 3D plastilina tipo Apple
 * - Mobile-first responsive
 */

const SMART_RESPONSES = {
  ocupacion: {
    bajo: (ocupacion) =>
      `Tu ocupación está en ${ocupacion}%. Podés mejorarla:\n\n1️⃣ Compartí tu link en redes sociales\n2️⃣ Ofrece descuentos a clientes nuevos\n3️⃣ Activa recordatorios por WhatsApp`,
    normal: (ocupacion) =>
      `Ocupación en ${ocupacion}%. Vas bien. Mantené activos los recordatorios y seguí promocionando en redes.`,
    alto: (ocupacion) =>
      `¡Excelente! Ocupación al ${ocupacion}%. Estás en un buen ritmo. Considera agregar más empleados si es necesario.`,
  },
  turnos: {
    cero: () =>
      'Hoy no tenés turnos agendados. ¿Querés que te ayude a promocionar tu link de reservas?',
    pocos: (turnos) =>
      `Tenés ${turnos} turno${turnos > 1 ? 's' : ''} hoy. Buen inicio. Seguí compartiendo tu link.`,
    muchos: (turnos, ingresos) =>
      `¡Excelente! ${turnos} turno${turnos > 1 ? 's' : ''} hoy con ingresos estimados de $${ingresos?.toLocaleString() || '0'}. Día productivo.`,
  },
  setup: {
    inicio: () =>
      'Empecemos por lo básico:\n\n1️⃣ Crea tus servicios\n2️⃣ Agrega tu equipo\n3️⃣ Configura horarios\n4️⃣ Personaliza tu marca\n5️⃣ Comparte tu link',
    servicios: () =>
      'Los servicios son lo que ofrecés. Agregá nombre, duración y precio. Tus clientes los ven al reservar.',
    empleados: () =>
      'El equipo son los profesionales que atienden. Agregá nombre, especialidad, foto y datos de contacto.',
    horarios: () =>
      'Los horarios definen cuándo atiendés. Configurá días y rango horario para que los clientes vean disponibilidad.',
    branding: () =>
      'Personalizá tu marca: logo, color, descripción. Esto aparece en tu app de reservas y le da identidad a tu negocio.',
    compartir: () =>
      'Tu link de reservas permite que clientes reserven sin llamarte. Compartilo en WhatsApp, Instagram, Facebook, etc.',
  },
  clientes: {
    vip: (cantidad) =>
      `Tenés ${cantidad} cliente${cantidad > 1 ? 's' : ''} VIP. Considerá ofrecerles un beneficio especial para mantenerlos felices.`,
    nuevos: (cantidad) =>
      `Ganaste ${cantidad} cliente${cantidad > 1 ? 's' : ''} nuevo${cantidad > 1 ? 's' : ''} esta semana. ¡Excelente! Mantené el ritmo.`,
  },
  stock: {
    bajo: (cantidad) =>
      `Hay ${cantidad} producto${cantidad > 1 ? 's' : ''} con stock bajo. Revisá tu inventario para no quedarte sin stock.`,
  },
  general: {
    hola: () =>
      '¡Hola! Soy Noni, tu asistente inteligente. Puedo ayudarte con:\n\n📊 Análisis de métricas\n💡 Tips para mejorar\n🎯 Guía de configuración\n❓ Preguntas sobre el sistema',
    ayuda: () =>
      'Puedo ayudarte con:\n\n• Preguntas sobre cómo usar el sistema\n• Análisis de tus métricas\n• Tips para atraer más clientes\n• Guía de configuración inicial',
    gracias: () => '¡De nada! Estoy acá para ayudarte. ¿Hay algo más que necesites?',
    chau: () => '¡Hasta luego! Volvé cuando necesites ayuda. 👋',
  },
}

function getSmartResponse(query, context) {
  const q = query.toLowerCase()

  if (q.includes('ocupación') || q.includes('ocupacion') || q.includes('cliente')) {
    const ocupacion = context.ocupacion || 0
    if (ocupacion < 40) return SMART_RESPONSES.ocupacion.bajo(ocupacion)
    if (ocupacion < 70) return SMART_RESPONSES.ocupacion.normal(ocupacion)
    return SMART_RESPONSES.ocupacion.alto(ocupacion)
  }

  if (q.includes('turno') || q.includes('reserva') || q.includes('hoy')) {
    const turnos = context.turnosHoy || 0
    const ingresos = context.ingresosHoy || 0
    if (turnos === 0) return SMART_RESPONSES.turnos.cero()
    if (turnos < 5) return SMART_RESPONSES.turnos.pocos(turnos)
    return SMART_RESPONSES.turnos.muchos(turnos, ingresos)
  }

  if (q.includes('empez') || q.includes('primero') || q.includes('como empiez')) {
    return SMART_RESPONSES.setup.inicio()
  }
  if (q.includes('servicio')) return SMART_RESPONSES.setup.servicios()
  if (q.includes('empleado') || q.includes('equipo') || q.includes('staff')) {
    return SMART_RESPONSES.setup.empleados()
  }
  if (q.includes('horario') || q.includes('hora')) return SMART_RESPONSES.setup.horarios()
  if (q.includes('marca') || q.includes('logo') || q.includes('color') || q.includes('personaliz')) {
    return SMART_RESPONSES.setup.branding()
  }
  if (q.includes('compartir') || q.includes('link') || q.includes('promocion')) {
    return SMART_RESPONSES.setup.compartir()
  }

  if (q.includes('vip')) {
    const vip = context.clientesVIP || 0
    if (vip > 0) return SMART_RESPONSES.clientes.vip(vip)
    return 'Aún no tenés clientes VIP. Cuando alguien reserve varias veces, se marcarán como VIP.'
  }

  if (q.includes('stock') || q.includes('inventario')) {
    const stock = context.stockBajo || 0
    if (stock > 0) return SMART_RESPONSES.stock.bajo(stock)
    return 'Tu inventario está bien. No hay productos con stock bajo.'
  }

  if (q.includes('hola') || q.includes('hey') || q.includes('qué onda')) {
    return SMART_RESPONSES.general.hola()
  }
  if (q.includes('ayuda') || q.includes('que podes')) {
    return SMART_RESPONSES.general.ayuda()
  }
  if (q.includes('gracias')) return SMART_RESPONSES.general.gracias()
  if (q.includes('chau') || q.includes('adiós') || q.includes('bye')) {
    return SMART_RESPONSES.general.chau()
  }

  return `Hmm, no estoy seguro sobre eso. Probá preguntando sobre:\n\n• Cómo mejorar ocupación\n• Tus turnos de hoy\n• Cómo configurar servicios\n• Tus métricas\n\n¿Hay algo específico que necesites?`
}

function NoniAvatar({ size = 56, mood = 'happy' }) {
  const eyeRy = mood === 'thinking' ? 1 : 2.5
  const mouthPath = mood === 'happy' ? 'M18 28 Q22 31 26 28' : 'M18 28 Q22 29 26 28'

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="25" r="20" fill="#5B3DF5" opacity="0.1" />
      <rect x="8" y="12" width="32" height="26" rx="8" fill="url(#noniGrad)" />
      <rect x="8" y="12" width="32" height="26" rx="8" stroke="#8B7CF6" strokeWidth="1.5" fill="none" />
      <rect x="12" y="17" width="24" height="14" rx="5" fill="#1A1630" opacity="0.9" />
      <circle cx="19" cy="24" r="4" fill="#A78BFA" opacity="0.2" />
      <circle cx="29" cy="24" r="4" fill="#A78BFA" opacity="0.2" />
      <ellipse cx="19" cy="24" rx="2.5" ry={eyeRy} fill="#A78BFA" />
      <ellipse cx="29" cy="24" rx="2.5" ry={eyeRy} fill="#A78BFA" />
      <path d={mouthPath} stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <defs>
        <linearGradient id="noniGrad" x1="8" y1="12" x2="40" y2="38">
          <stop offset="0%" stopColor="#E8DEFF" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-slate-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
        />
      ))}
    </div>
  )
}

export default function NoniAssistantV4({ tab, setupData, vocab, negocio, smartAlerts, publicLink, onNavigate, onStartTour }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mood, setMood] = useState('happy')
  const [dismissed, setDismissed] = useState(false)
  const messagesEndRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ASSISTANT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.dismissed) setDismissed(true)
        if (parsed.messages) setMessages(parsed.messages)
      }
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(ASSISTANT_KEY, JSON.stringify({ dismissed, messages }))
  }, [dismissed, messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    setMood('thinking')

    await new Promise((resolve) => setTimeout(resolve, 600))

    try {
      const response = getSmartResponse(userMsg, smartAlerts)
      setMessages((prev) => [...prev, { role: 'assistant', content: response }])
      setMood('happy')
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Hubo un problema. Intentá nuevamente.' },
      ])
      setMood('happy')
    } finally {
      setLoading(false)
    }
  }, [input, loading, smartAlerts])

  if (dismissed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => {
          setDismissed(false)
          setOpen(true)
        }}
        className="ns-assistant-fab"
        title="Mostrar a Noni"
      >
        <NoniAvatar size={56} mood={mood} />
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      {!open && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={() => setOpen(true)}
          className="ns-assistant-fab"
          whileTap={{ scale: 0.95 }}
        >
          <NoniAvatar size={56} mood={mood} />
        </motion.button>
      )}

      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="ns-assistant-panel"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-sky-500 to-sky-400 flex items-center justify-between rounded-t-3xl">
            <div className="flex items-center gap-3">
              <NoniAvatar size={40} mood={mood} />
              <div>
                <h3 className="font-black text-white text-sm">Noni</h3>
                <p className="text-xs text-white/70">Tu asistente inteligente</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto flex flex-col gap-3 p-4 bg-slate-50">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <p className="text-sm font-bold text-slate-900">¡Hola! Soy Noni 👋</p>
                  <p className="text-xs text-slate-600 mt-2">
                    Soy tu asistente inteligente. Preguntame sobre tus métricas, cómo mejorar tu negocio o cómo usar el sistema.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Preguntas comunes:</p>
                  {[
                    { icon: '📊', text: '¿Cómo va mi ocupación?' },
                    { icon: '📅', text: '¿Cuántos turnos tengo hoy?' },
                    { icon: '🚀', text: '¿Cómo empiezo?' },
                    { icon: '💡', text: '¿Cómo atraer clientes?' },
                  ].map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        setInput(q.text)
                        setTimeout(() => {
                          setMessages((prev) => [...prev, { role: 'user', content: q.text }])
                          setLoading(true)
                          setMood('thinking')
                          setTimeout(() => {
                            const response = getSmartResponse(q.text, smartAlerts)
                            setMessages((prev) => [...prev, { role: 'assistant', content: response }])
                            setMood('happy')
                            setLoading(false)
                            setInput('')
                          }, 600)
                        }, 50)
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-2"
                      whileHover={{ x: 4 }}
                    >
                      <span>{q.icon}</span>
                      {q.text}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`ns-assistant-chat-msg ${msg.role === 'user' ? 'ns-chat-user' : 'ns-chat-assistant'}`}
              >
                {msg.content}
              </motion.div>
            ))}

            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-200 rounded-b-3xl flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Preguntame algo..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-lg bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 disabled:opacity-50 transition-all"
            >
              →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
