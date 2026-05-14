import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconRobot, IconChart, IconCheckCircle, IconClipboard, IconBolt, IconCalendar, IconLink, IconPalette, IconRocket, IconCelebrate } from './NoniIcons'

const TOUR_KEY = 'ns_tour_completed_v2'

const STEPS = [
  {
    target: null,
    title: '¡Hola! Soy Noni 👋',
    message: 'Te voy a guiar paso a paso por tu panel de control. En menos de 1 minuto vas a saber cómo funciona todo.',
    position: 'center',
    Icon: IconRobot,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  {
    target: 'tour-monitor',
    title: 'Centro de control',
    message: 'Acá ves todo de un vistazo: turnos del día, ingresos y actividad reciente. Se actualiza solo con cada reserva nueva.',
    position: 'bottom',
    Icon: IconChart,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    target: 'tour-setup',
    title: 'Pasos iniciales',
    message: 'Esta checklist te indica qué falta configurar para que tu sistema quede al 100%. ¡Empezá por acá!',
    position: 'bottom',
    Icon: IconCheckCircle,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    target: 'tour-tabs',
    title: 'Navegación del panel',
    message: 'Desde estas pestañas accedés a todas las secciones: Agenda, Servicios, Equipo, Horarios, y Ajustes.',
    position: 'bottom',
    Icon: IconClipboard,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    actionLabel: 'Ir a Servicios',
    actionTab: 'servicios',
  },
  {
    target: 'tour-servicios',
    title: 'Tus servicios',
    message: 'Definí qué ofrecés: nombre, precio y duración. Por ejemplo: "Corte Clásico — $3500 — 30 min". Tus clientes los ven al reservar.',
    position: 'bottom',
    Icon: IconBolt,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    actionLabel: 'Crear servicio',
    actionTab: 'servicios',
  },
  {
    target: 'tour-agenda',
    title: 'Tu agenda de turnos',
    message: 'Acá aparecen todos los turnos: los de tus clientes y los que vos creés. Podés confirmar, cancelar o contactar por WhatsApp.',
    position: 'bottom',
    Icon: IconCalendar,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    actionLabel: 'Ver Agenda',
    actionTab: 'agenda',
  },
  {
    target: 'tour-link',
    title: 'Tu link de reservas',
    message: 'Este es tu link público. Compartilo por WhatsApp, Instagram o donde quieras. ¡Tus clientes reservan solos sin llamarte!',
    position: 'top',
    Icon: IconLink,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    actionLabel: 'Copiar link',
    actionCopyLink: true,
  },
  {
    target: 'tour-ajustes',
    title: 'Personalizá tu marca',
    message: 'Subí tu logo, elegí tu color, escribí tu bio. Todo esto aparece en tu app de reservas y le da identidad a tu negocio.',
    position: 'bottom',
    Icon: IconPalette,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    actionLabel: 'Ir a Ajustes',
    actionTab: 'ajustes',
  },
  {
    target: null,
    title: '¡Todo listo! 🚀',
    message: 'Ahora solo tenés que:\n\n1. Crear tus servicios\n2. Agregar tu equipo\n3. Configurar tus horarios\n4. Compartir tu link\n\nSi necesitás ayuda, tocá el ícono de Noni.',
    position: 'center',
    Icon: IconRocket,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
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
  const total = STEPS.length

  // Recalcular posición del target al cambiar paso o al hacer resize
  const recalcTarget = useCallback(() => {
    if (!active || !current.target) { setTargetRect(null); return }
    const el = document.getElementById(current.target)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        const r = el.getBoundingClientRect()
        setTargetRect(r)
      }, 450)
    } else {
      setTargetRect(null)
    }
  }, [step, active, current.target])

  useEffect(() => {
    if (!active) { setStep(0); return }
    recalcTarget()
  }, [step, active, recalcTarget])

  // Recalcular en resize/scroll
  useEffect(() => {
    if (!active) return
    const handler = () => {
      if (current.target) {
        const el = document.getElementById(current.target)
        if (el) setTargetRect(el.getBoundingClientRect())
      }
    }
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [active, current.target])

  const next = () => {
    if (step < total - 1) setStep(s => s + 1)
    else onDismiss()
  }
  const prev = () => { if (step > 0) setStep(s => s - 1) }

  if (!active) return null

  const PAD = 14

  // ─── Tooltip positioning (mobile-safe) ───
  const getTooltipPosition = () => {
    if (!targetRect || current.position === 'center') return {}

    const isMobile = window.innerWidth < 640
    const tooltipWidth = isMobile ? window.innerWidth - 32 : 380
    const safeLeft = Math.max(16, Math.min(
      targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
      window.innerWidth - tooltipWidth - 16
    ))

    if (current.position === 'bottom') {
      const topPos = targetRect.bottom + PAD
      const maxTop = window.innerHeight - 300
      return {
        position: 'fixed', zIndex: 9999,
        width: tooltipWidth,
        top: Math.min(topPos, maxTop),
        left: safeLeft,
      }
    }
    if (current.position === 'top') {
      return {
        position: 'fixed', zIndex: 9999,
        width: tooltipWidth,
        bottom: Math.max(16, window.innerHeight - targetRect.top + PAD),
        left: safeLeft,
      }
    }
    return { position: 'fixed', zIndex: 9999, width: tooltipWidth }
  }

  const handleAction = () => {
    if (current.actionCopyLink && publicLink) {
      navigator.clipboard.writeText(publicLink).catch(() => {})
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 3000)
    } else if (current.actionTab) {
      onNavigate?.(current.actionTab)
    }
  }

  // ─── Progress bar ───
  const progressPercent = ((step + 1) / total) * 100

  // ─── Step dots ───
  const renderDots = () => (
    <div className="flex items-center gap-1">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i === step ? 'w-6 bg-sky-500' : i < step ? 'w-2 bg-sky-300' : 'w-2 bg-slate-200'
          }`}
        />
      ))}
    </div>
  )

  // ─── Center Modal (Welcome / Final) ───
  const renderCenterModal = () => (
    <motion.div
      key={`modal-${step}`}
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
    >
      <div className="bg-white rounded-[1.75rem] sm:rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.25)] max-w-[360px] w-full overflow-hidden">
        {/* Top progress */}
        <div className="h-1 bg-slate-100">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-400 to-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="p-6 sm:p-8 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[1.4rem] ${current.iconBg} flex items-center justify-center mx-auto mb-5`}
          >
            <current.Icon size={32} className={current.iconColor} />
          </motion.div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {current.title}
          </h2>

          {/* Business name on welcome */}
          {negocio && step === 0 && (
            <p className="text-sky-600 font-bold mt-1.5 text-sm">{negocio.nombre}</p>
          )}

          {/* Message */}
          <p className="text-slate-500 text-[13px] sm:text-sm mt-3 leading-relaxed whitespace-pre-line">
            {current.message}
          </p>

          {/* Step counter */}
          <div className="flex justify-center mt-5 mb-1">{renderDots()}</div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            Paso {step + 1} de {total}
          </p>

          {/* Buttons */}
          <div className="flex gap-2.5 mt-5">
            {step === 0 ? (
              <>
                <button
                  onClick={onDismiss}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs sm:text-sm hover:bg-slate-200 transition-all active:scale-95"
                >
                  Saltar
                </button>
                <button
                  onClick={next}
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-sky-500 to-sky-400 text-white font-black text-xs sm:text-sm hover:from-sky-400 hover:to-sky-300 transition-all shadow-lg shadow-sky-500/25 active:scale-95"
                >
                  ¡Empecemos! →
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={prev}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs sm:text-sm hover:bg-slate-200 transition-all active:scale-95"
                >
                  ← Atrás
                </button>
                <button
                  onClick={onDismiss}
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-sky-500 to-sky-400 text-white font-black text-xs sm:text-sm hover:from-sky-400 hover:to-sky-300 transition-all shadow-lg shadow-sky-500/25 active:scale-95 flex items-center justify-center gap-2"
                >
                  <IconRocket size={15} /> ¡A configurar!
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )

  // ─── Step Tooltip (positioned near target) ───
  const renderTooltip = () => (
    <motion.div
      key={`tooltip-${step}`}
      initial={{ opacity: 0, y: current.position === 'top' ? -12 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: current.position === 'top' ? -8 : 8 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="z-[9999] pointer-events-auto"
      style={getTooltipPosition()}
    >
      <div className="bg-white rounded-2xl sm:rounded-[1.4rem] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-200/60 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-400 to-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-0 flex items-start gap-3">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${current.iconBg} flex items-center justify-center shrink-0`}>
            <current.Icon size={20} className={current.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-900 text-[15px] sm:text-base tracking-tight leading-tight">
              {current.title}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Paso {step + 1} de {total}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shrink-0 text-base leading-none active:scale-90"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 pt-2.5 pb-4 sm:pb-5">
          <p className="text-slate-600 text-[13px] sm:text-sm leading-relaxed">
            {current.message}
          </p>

          {/* Action */}
          {current.actionLabel && (
            <button
              onClick={handleAction}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 text-sky-600 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-sky-500 hover:text-white transition-all active:scale-95"
            >
              {current.actionCopyLink && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              {current.actionLabel}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          {renderDots()}
          <div className="flex gap-2 shrink-0">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px] sm:text-xs font-bold hover:bg-slate-100 transition-all active:scale-95"
              >
                ←
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-2 rounded-lg bg-sky-500 text-white text-[11px] sm:text-xs font-black hover:bg-sky-400 transition-all shadow-sm active:scale-95"
            >
              {step === total - 1 ? '✓ Listo' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <AnimatePresence mode="wait">
      {active && (
        <>
          {/* Copy toast */}
          <AnimatePresence>
            {copyToast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] bg-white rounded-2xl shadow-2xl border border-slate-200 px-5 py-3.5 flex items-center gap-3"
              >
                <IconCheckCircle size={20} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900">¡Link copiado!</p>
                  <p className="text-[10px] text-slate-400 font-medium">Compartilo por WhatsApp o redes</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9990] pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          />

          {/* Spotlight cutout */}
          <AnimatePresence>
            {targetRect && (
              <motion.div
                key={`spotlight-${step}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                className="fixed z-[9991] rounded-2xl pointer-events-none"
                style={{
                  top: targetRect.top - PAD,
                  left: targetRect.left - PAD,
                  width: targetRect.width + PAD * 2,
                  height: targetRect.height + PAD * 2,
                  boxShadow: '0 0 0 4000px rgba(0,0,0,0.55), 0 0 0 3px rgba(56, 189, 248, 0.5), 0 0 30px rgba(56, 189, 248, 0.2)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Content: Modal or Tooltip */}
          {current.position === 'center' ? renderCenterModal() : renderTooltip()}
        </>
      )}
    </AnimatePresence>
  )
}
