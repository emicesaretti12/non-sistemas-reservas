import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TOUR_KEY = 'ns_tour_completed_v1'

const STEPS = [
  {
    target: null, // welcome modal - no highlight
    title: '¡Bienvenido a tu panel! 🎉',
    message: 'Te voy a mostrar en 30 segundos cómo funciona todo. Podés saltearlo cuando quieras.',
    position: 'center',
    emoji: '👋',
  },
  {
    target: 'tour-monitor',
    title: 'Monitor de negocio',
    message: 'Acá ves en tiempo real tus turnos del día, ingresos proyectados y el servicio más popular.',
    position: 'bottom',
    emoji: '📊',
  },
  {
    target: 'tour-agenda',
    title: 'Agenda',
    message: 'Gestioná todos tus turnos desde acá. Podés crear, confirmar o cancelar citas manualmente.',
    position: 'bottom',
    emoji: '📅',
  },
  {
    target: 'tour-servicios',
    title: 'Servicios',
    message: 'Agregá los servicios que ofrecés con su precio y duración. Tus clientes los verán en tu app pública.',
    position: 'bottom',
    emoji: '⚡',
  },
  {
    target: 'tour-link',
    title: 'Tu link público',
    message: '¡Este es tu link único! Compartilo por WhatsApp o Instagram y tus clientes podrán reservar 24/7 sin llamarte.',
    position: 'top',
    emoji: '🔗',
  },
  {
    target: 'tour-ajustes',
    title: 'Ajustes y branding',
    message: 'Personalizá el logo, colores, descripción e Instagram de tu negocio para que tu app quede perfecta.',
    position: 'bottom',
    emoji: '🎨',
  },
]

export function useTour() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY)
    if (!completed) {
      // Delay para que el dashboard cargue primero
      setTimeout(() => setActive(true), 1200)
    }
  }, [])

  const start = () => setActive(true)
  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1')
    setActive(false)
  }

  return { active, start, dismiss }
}

export default function DashboardTour({ active, onDismiss, negocio }) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
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
    const base = { position: 'fixed', zIndex: 9999, width: 320 }
    if (current.position === 'bottom') return { ...base, top: targetRect.bottom + PAD, left: Math.max(16, targetRect.left) }
    if (current.position === 'top') return { ...base, bottom: window.innerHeight - targetRect.top + PAD, left: Math.max(16, targetRect.left) }
    return base
  }

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          />

          {/* Spotlight cutout */}
          {targetRect && (
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed z-[9991] rounded-2xl pointer-events-none ring-4 ring-sky-400 shadow-[0_0_0_4000px_rgba(0,0,0,0.55)]"
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
            // Welcome modal
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.85, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-auto"
            >
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center">
                <div className="text-6xl mb-4">{current.emoji}</div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{current.title}</h2>
                {negocio && <p className="text-sky-600 font-bold mt-1">{negocio.nombre}</p>}
                <p className="text-slate-500 text-sm mt-3 leading-relaxed">{current.message}</p>
                <div className="flex gap-3 mt-6">
                  <button onClick={onDismiss} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition-all">
                    Saltar tour
                  </button>
                  <button onClick={next} className="flex-[2] py-3 rounded-xl bg-sky-500 text-white font-black text-sm hover:bg-sky-400 transition-all">
                    Comenzar →
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            // Step tooltip
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="z-[9999] pointer-events-auto"
              style={tooltipStyle()}
            >
              <div className="bg-slate-900 rounded-2xl shadow-2xl p-5 border border-white/10">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{current.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-sm">{current.title}</p>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{current.message}</p>
                  </div>
                  <button onClick={onDismiss} className="text-slate-600 hover:text-white shrink-0 transition-colors text-lg leading-none">×</button>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-1">
                    {STEPS.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-sky-400' : i < step ? 'w-1.5 bg-sky-700' : 'w-1.5 bg-white/20'}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {step > 0 && (
                      <button onClick={prev} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20 transition-all">
                        ← Atrás
                      </button>
                    )}
                    <button onClick={next} className="px-4 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-black hover:bg-sky-400 transition-all">
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
