import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TOUR_KEY = 'ns_tour_completed_v2'

const STEPS = [
  {
    target: null, // welcome modal - no highlight
    title: '¡Bienvenido a tu panel! 🎉',
    message: 'Soy Noni y te voy a mostrar cómo funciona tu sistema de reservas en menos de 1 minuto. ¡Vamos!',
    position: 'center',
    emoji: '🤖',
    actionLabel: null,
    actionTab: null,
  },
  {
    target: 'tour-monitor',
    title: 'Tu Monitor en tiempo real',
    message: 'Este es el centro de control de tu negocio. Acá ves los turnos del día, ingresos, y la actividad reciente. Se actualiza automáticamente con cada nueva reserva.',
    position: 'bottom',
    emoji: '📊',
    actionLabel: null,
    actionTab: null,
  },
  {
    target: 'tour-setup',
    title: 'Checklist de configuración',
    message: 'Esta lista te muestra qué falta configurar. Completá todos los pasos para que tu sistema funcione al 100%. ¡Es lo primero que deberías hacer!',
    position: 'bottom',
    emoji: '✅',
    actionLabel: null,
    actionTab: null,
  },
  {
    target: 'tour-tabs',
    title: 'Secciones del panel',
    message: 'Desde acá accedés a todas las secciones: Agenda para ver turnos, Servicios para definir qué ofrecés, Equipo para cargar a tus profesionales, Horarios para definir cuándo atendés, y más.',
    position: 'bottom',
    emoji: '📋',
    actionLabel: 'Ir a Servicios',
    actionTab: 'servicios',
  },
  {
    target: 'tour-servicios',
    title: '⚡ Servicios — Lo que ofrecés',
    message: 'Cada servicio necesita un nombre, un precio y cuánto dura. Por ejemplo: "Corte Clásico — $3500 — 30 min". Tus clientes ven estos servicios cuando abren tu link.',
    position: 'bottom',
    emoji: '⚡',
    actionLabel: 'Crear servicio',
    actionTab: 'servicios',
  },
  {
    target: 'tour-agenda',
    title: '📅 Agenda — Tus turnos',
    message: 'Acá aparecen todos los turnos: los que reservan los clientes desde tu link y los que vos creés manualmente. Podés confirmarlos, cancelarlos o contactar al cliente por WhatsApp.',
    position: 'bottom',
    emoji: '📅',
    actionLabel: 'Ver Agenda',
    actionTab: 'agenda',
  },
  {
    target: 'tour-link',
    title: '🔗 Tu link público — ¡La clave!',
    message: 'Este es tu link de reservas. Compartilo por WhatsApp, Instagram o donde quieras. Tus clientes entran, eligen servicio, profesional, día y hora, ¡y reservan solos! Sin que los tengas que atender por teléfono.',
    position: 'top',
    emoji: '🔗',
    actionLabel: 'Copiar link',
    actionTab: null,
    actionCopyLink: true,
  },
  {
    target: 'tour-ajustes',
    title: '🎨 Personalizá tu marca',
    message: 'Subí tu logo, elegí tu color, escribí tu bio e Instagram. Todo esto aparece en tu app de reservas y le da identidad a tu negocio.',
    position: 'bottom',
    emoji: '🎨',
    actionLabel: 'Ir a Ajustes',
    actionTab: 'ajustes',
  },
  {
    target: null,
    title: '¡Listo! Ya sabés todo 🎉',
    message: 'Para empezar, lo más importante es:\n\n1️⃣ Creá tus servicios\n2️⃣ Agregá a tu equipo\n3️⃣ Configurá tus horarios\n4️⃣ Compartí tu link\n\nSi necesitás ayuda, tocá el ícono de Noni 🤖 abajo a la derecha.',
    position: 'center',
    emoji: '🚀',
    actionLabel: null,
    actionTab: null,
  },
]

export function useTour() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY)
    if (!completed) {
      // Delay para que el dashboard cargue primero
      setTimeout(() => setActive(true), 1500)
    }
  }, [])

  const start = () => setActive(true)
  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1')
    setActive(false)
  }

  return { active, start, dismiss }
}

export default function DashboardTour({ active, onDismiss, negocio, onNavigate, publicLink }) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [copyToast, setCopyToast] = useState(false)
  const current = STEPS[step]

  useEffect(() => {
    if (!active) { setStep(0); return }
    if (current.target) {
      const el = document.getElementById(current.target)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          const r = el.getBoundingClientRect()
          setTargetRect(r)
        }, 400)
      } else {
        setTargetRect(null)
      }
    } else {
      setTargetRect(null)
    }
  }, [step, active])

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else onDismiss()
  }
  const prev = () => { if (step > 0) setStep(s => s - 1) }

  if (!active) return null

  const PAD = 12
  const tooltipStyle = () => {
    if (!targetRect || current.position === 'center') return {}
    const base = { position: 'fixed', zIndex: 9999, maxWidth: 360, width: 'calc(100vw - 32px)' }
    if (current.position === 'bottom') {
      return {
        ...base,
        top: Math.min(targetRect.bottom + PAD, window.innerHeight - 280),
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 376)),
      }
    }
    if (current.position === 'top') {
      return {
        ...base,
        bottom: Math.max(16, window.innerHeight - targetRect.top + PAD),
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 376)),
      }
    }
    return base
  }

  return (
    <AnimatePresence>
      {active && (
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

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
          />

          {/* Spotlight cutout */}
          {targetRect && (
            <motion.div
              key={`spotlight-${step}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed z-[9991] rounded-2xl pointer-events-none ring-4 ring-purple-400 shadow-[0_0_0_4000px_rgba(0,0,0,0.6)]"
              style={{
                top: targetRect.top - PAD,
                left: targetRect.left - PAD,
                width: targetRect.width + PAD * 2,
                height: targetRect.height + PAD * 2,
              }}
            />
          )}

          {/* Tooltip / Modal */}
          {current.position === 'center' ? (
            // Welcome/Final modal
            <motion.div
              key={`modal-${step}`}
              initial={{ opacity: 0, scale: 0.85, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-auto"
            >
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center">
                <div className="text-6xl mb-4">{current.emoji}</div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{current.title}</h2>
                {negocio && step === 0 && <p className="text-purple-600 font-bold mt-1">{negocio.nombre}</p>}
                <p className="text-slate-500 text-sm mt-3 leading-relaxed whitespace-pre-line">{current.message}</p>
                <div className="flex gap-3 mt-6">
                  {step === 0 ? (
                    <>
                      <button onClick={onDismiss} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition-all">
                        Saltar tour
                      </button>
                      <button onClick={next} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-sm hover:from-purple-400 hover:to-indigo-400 transition-all shadow-lg">
                        ¡Dale, empecemos! →
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={prev} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition-all">
                        ← Atrás
                      </button>
                      <button onClick={onDismiss} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-sm hover:from-purple-400 hover:to-indigo-400 transition-all shadow-lg">
                        ¡Entendido, a configurar! 🚀
                      </button>
                    </>
                  )}
                </div>

                {/* Step counter */}
                <div className="flex justify-center gap-1 mt-5">
                  {STEPS.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all ${i === step ? 'w-5 bg-purple-500' : i < step ? 'w-1.5 bg-purple-300' : 'w-1.5 bg-slate-200'}`} />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            // Step tooltip
            <motion.div
              key={`tooltip-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="z-[9999] pointer-events-auto"
              style={tooltipStyle()}
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Tooltip header */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-3 border-b border-purple-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{current.emoji}</span>
                    <p className="font-black text-slate-900 text-sm tracking-tight">{current.title}</p>
                  </div>
                  <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center">×</button>
                </div>

                {/* Tooltip body */}
                <div className="px-5 py-4">
                  <p className="text-slate-600 text-xs leading-relaxed">{current.message}</p>

                  {/* Action button */}
                  {current.actionLabel && (
                    <button
                      onClick={() => {
                        if (current.actionCopyLink && publicLink) {
                          navigator.clipboard.writeText(publicLink).catch(() => {})
                          setCopyToast(true)
                          setTimeout(() => setCopyToast(false), 3000)
                        } else if (current.actionTab) {
                          onNavigate?.(current.actionTab)
                        }
                      }}
                      className="mt-3 px-4 py-2 bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-purple-500 hover:text-white transition-all"
                    >
                      {current.actionLabel}
                    </button>
                  )}
                </div>

                {/* Tooltip footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex gap-1">
                    {STEPS.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-purple-500' : i < step ? 'w-1.5 bg-purple-300' : 'w-1.5 bg-slate-200'}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {step > 0 && (
                      <button onClick={prev} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-100 transition-all">
                        ← Atrás
                      </button>
                    )}
                    <button onClick={next} className="px-4 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-black hover:bg-purple-400 transition-all">
                      {step === STEPS.length - 1 ? '¡Entendido! ✓' : 'Siguiente →'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
