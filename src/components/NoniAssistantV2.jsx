import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { askNoni, generateSmartTip, getContextualSuggestions } from '../utils/noniAI_v2'
import { IconCheckCircle } from './NoniIcons'

const ASSISTANT_KEY = 'ns_noni_v2_state'

/**
 * Noni Assistant V2 — Rediseñado con IA avanzada
 * Características:
 * - Avatar 3D con expresiones dinámicas
 * - Chat IA con contexto del negocio
 * - Sugerencias inteligentes basadas en métricas
 * - Interfaz tipo "chat bubble" moderna
 * - Historial persistente
 */

function NoniAvatar({ size = 56, speaking = false, mood = 'happy', blinking = false }) {
  const eyeRy = blinking ? 0.3 : mood === 'wink' ? 0.5 : 2.5
  const mouthPath = speaking
    ? 'M20 28 Q24 31 28 28'
    : mood === 'happy'
      ? 'M20 28 Q24 30.5 28 28'
      : mood === 'thinking'
        ? 'M20 28 Q24 29 28 28'
        : 'M20 28 Q24 29 28 28'

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow effect */}
      <circle cx="24" cy="25" r="20" fill="#5B3DF5" opacity={speaking ? 0.2 : 0.08} />

      {/* Antenna */}
      <line x1="24" y1="4" x2="24" y2="12" stroke="#8B7CF6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="3" r="2.5" fill="#5B3DF5" />

      {/* Head */}
      <rect x="8" y="12" width="32" height="26" rx="8" fill="url(#noniGradBrand)" />
      <rect x="8" y="12" width="32" height="26" rx="8" stroke="#8B7CF6" strokeWidth="1.5" fill="none" />

      {/* Screen */}
      <rect x="12" y="17" width="24" height="14" rx="5" fill="#1A1630" opacity="0.9" />

      {/* Eyes background */}
      <circle cx="19" cy="24" r="4" fill="#A78BFA" opacity="0.2" />
      <circle cx="29" cy="24" r="4" fill="#A78BFA" opacity="0.2" />

      {/* Eyes */}
      <ellipse cx="19" cy="24" rx="2.5" ry={eyeRy} fill="#A78BFA" style={{ transition: 'ry 0.1s' }} />
      <ellipse cx="29" cy="24" rx="2.5" ry={eyeRy} fill="#A78BFA" style={{ transition: 'ry 0.1s' }} />

      {/* Mouth */}
      <path d={mouthPath} stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Arms */}
      <rect x="4" y="20" width="5" height="8" rx="2" fill="#7C5CF8" />
      <rect x="39" y="20" width="5" height="8" rx="2" fill="#7C5CF8" />

      {/* Base */}
      <rect x="16" y="38" width="16" height="6" rx="3" fill="#5B3DF5" opacity="0.5" />

      <defs>
        <linearGradient id="noniGradBrand" x1="8" y1="12" x2="40" y2="38">
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
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--ns-primary)' }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
        />
      ))}
    </div>
  )
}

export default function NoniAssistantV2({
  tab,
  setupData,
  vocab,
  negocio,
  smartAlerts,
  publicLink,
  onNavigate,
}) {
  const [open, setOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mood, setMood] = useState('happy')
  const [blinking, setBlinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(true)
  const chatEndRef = useRef(null)
  const panelRef = useRef(null)

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ASSISTANT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.dismissed) setDismissed(true)
        if (parsed.messages) setChatMessages(parsed.messages)
      }
    } catch {}
  }, [])

  // Save state
  useEffect(() => {
    localStorage.setItem(ASSISTANT_KEY, JSON.stringify({ dismissed, messages: chatMessages }))
  }, [dismissed, chatMessages])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, loading])

  // Blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 150)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(blinkInterval)
  }, [])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSendMessage = async () => {
    if (!chatInput.trim() || loading) return

    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    setSpeaking(true)
    setMood('thinking')

    try {
      const result = await askNoni(
        userMsg,
        { negocio, vocab, smartAlerts, tab },
        chatMessages
      )

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.content,
          navTab: result.navTab,
        },
      ])

      setMood('happy')

      // Auto-navigate if suggested
      if (result.navTab) {
        setTimeout(() => {
          onNavigate?.(result.navTab)
          setOpen(false)
        }, 1500)
      }
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Hubo un problema. Intentá nuevamente.',
        },
      ])
      setMood('happy')
    } finally {
      setLoading(false)
      setSpeaking(false)
    }
  }

  if (dismissed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => {
          setDismissed(false)
          setOpen(true)
        }}
        className="fixed bottom-20 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
        style={{ background: 'var(--ns-primary)' }}
        title="Mostrar a Noni"
      >
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        </svg>
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
          className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          style={{ background: 'var(--ns-gradient-1)' }}
          whileTap={{ scale: 0.95 }}
        >
          <NoniAvatar size={56} mood={mood} blinking={blinking} speaking={speaking} />
        </motion.button>
      )}

      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 right-6 z-50 w-96 max-w-[calc(100vw-24px)] rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--ns-surface)' }}
        >
          {/* Header */}
          <div
            className="p-4 flex items-center justify-between"
            style={{ background: 'var(--ns-gradient-1)' }}
          >
            <div className="flex items-center gap-3">
              <NoniAvatar size={40} mood={mood} blinking={blinking} speaking={speaking} />
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
          <div className="h-80 overflow-y-auto flex flex-col gap-3 p-4">
            {chatMessages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-sm font-bold text-slate-900">¡Hola! Soy Noni 👋</p>
                  <p className="text-xs text-slate-600 mt-2">
                    Te ayudo a optimizar tu negocio. Preguntame sobre cómo usar el sistema, tips para
                    atraer clientes o análisis de tus métricas.
                  </p>
                </div>

                {/* Quick suggestions */}
                {showSuggestion && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Preguntas comunes:</p>
                    {[
                      '¿Cómo atraer más clientes?',
                      '¿Cómo configurar servicios?',
                      'Mostrar mis métricas',
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setChatInput(q)
                          setTimeout(handleSendMessage, 100)
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-br-none'
                      : 'bg-slate-50 text-slate-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {msg.navTab && (
                    <p className="text-xs mt-2 opacity-70">→ Ir a {msg.navTab}</p>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 rounded-2xl rounded-bl-none">
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Preguntame algo..."
              className="flex-1 px-4 py-2 rounded-full border border-slate-200 focus:border-slate-900 focus:outline-none text-sm"
              disabled={loading}
            />
            <motion.button
              onClick={handleSendMessage}
              disabled={loading || !chatInput.trim()}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
              style={{ background: 'var(--ns-primary)' }}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16346272 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99021575 L3.03521743,10.4311088 C3.03521743,10.5882061 3.19218622,10.7453035 3.50612381,10.7453035 L16.6915026,11.5307905 C16.6915026,11.5307905 17.1624089,11.5307905 17.1624089,12.0020827 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
