import { useState, useEffect } from 'react'
import { IconCheckCircle } from './NoniIcons'

/**
 * GuidedSetup — Panel del asistente de configuración guiada post-onboarding.
 * Es el "asistente Noni" que aparece al ingresar al dashboard hasta que el
 * usuario completa todos los pasos de configuración de su negocio.
 */

const SETUP_STEPS = [
  {
    id: 'servicio',
    title: 'Creá tu primer servicio',
    desc: 'Definí qué ofrecés: nombre, precio y duración.',
    descLong:
      'Los servicios son lo que ofrecés: cortes, consultas, sesiones, clases, etc. Cada servicio necesita un nombre, un precio y cuánto dura. Tus clientes los ven cuando entran a tu link.',
    tab: 'servicios',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    check: (data) => data.servicios > 0,
    badge: 'Esencial',
    priority: 1,
  },
  {
    id: 'empleado',
    title: 'Agregá a tu equipo',
    desc: 'Cargá al menos un profesional o recurso.',
    descLong:
      'Acá cargás a las personas que atienden en tu negocio. Si trabajás solo, ponete a vos mismo. Los clientes eligen con quién quieren reservar.',
    tab: 'equipo',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    check: (data) => data.empleados > 0,
    badge: 'Esencial',
    priority: 2,
  },
  {
    id: 'horarios',
    title: 'Configurá tus horarios',
    desc: 'Definí los días y rangos horarios de atención.',
    descLong:
      'Elegí qué días de la semana abrís y en qué horario (ej: Lunes a Viernes de 9 a 18). El sistema calcula automáticamente los turnos disponibles para tus clientes.',
    tab: 'horarios',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    check: (data) => data.horarios,
    badge: 'Esencial',
    priority: 3,
  },
  {
    id: 'branding',
    title: 'Personalizá tu marca',
    desc: 'Subí tu logo, elegí colores y completá la bio.',
    descLong:
      'Tu logo, color e Instagram aparecen en tu app pública de reservas. Es lo primero que ven tus clientes, así que hacé que quede lindo.',
    tab: 'ajustes',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656L10 17.657',
    check: (data) => data.logo || data.descripcion,
    badge: 'Recomendado',
    priority: 4,
  },
  {
    id: 'compartir',
    title: 'Compartí tu link de reservas',
    desc: 'Enviá tu link a tus primeros clientes.',
    descLong:
      'Este es el paso final: enviá tu link por WhatsApp a tus clientes. Ellos entran, eligen servicio, profesional, día y hora, ¡y reservan solos sin llamarte!',
    tab: null,
    icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
    check: (data) => data.compartido,
    badge: 'Final',
    priority: 5,
  },
]

export default function GuidedSetup({
  negocio,
  serviciosCount,
  empleadosCount,
  onNavigate,
  onDismiss,
}) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [shared, setShared] = useState(false)
  const [expandedStep, setExpandedStep] = useState(null)
  const [copyToast, setCopyToast] = useState(false)

  const data = {
    servicios: serviciosCount || 0,
    empleados: empleadosCount || 0,
    horarios: negocio?.horarios && Object.values(negocio.horarios).some((d) => d.abierto),
    logo: negocio?.logo_url,
    descripcion: negocio?.descripcion,
    compartido: shared,
  }

  const completedSteps = SETUP_STEPS.filter((s) => s.check(data))
  const totalSteps = SETUP_STEPS.length
  const progress = Math.round((completedSteps.length / totalSteps) * 100)
  const allDone = completedSteps.length === totalSteps
  const nextStep = SETUP_STEPS.find((s) => !s.check(data))

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => setDismissed(true), 8000)
      return () => clearTimeout(t)
    }
  }, [allDone])

  if (dismissed) return null

  const publicSlug =
    negocio?.nombre?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ''
  const publicLink = `${window.location.origin}/app/${publicSlug}/${negocio?.id || ''}`

  const handleShare = () => {
    const msg = encodeURIComponent(`Reservá en ${negocio?.nombre}: ${publicLink}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
    setShared(true)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink).catch(() => {})
    setShared(true)
    setCopyToast(true)
    setTimeout(() => setCopyToast(false), 3000)
  }

  return (
    <div
      id="tour-setup"
      className="mb-4 md:mb-6 animate-in slide-in-from-top-4 duration-700"
      data-testid="guided-setup"
    >
      {copyToast && (
        <div className="ns-copy-toast">
          <IconCheckCircle size={18} className="text-emerald-500" />
          <div>
            <p className="text-xs font-bold text-slate-900">¡Link copiado!</p>
            <p className="text-[10px] text-slate-400 font-medium">Compartilo por WhatsApp o redes</p>
          </div>
        </div>
      )}

      <div
        className="relative overflow-hidden rounded-2xl md:rounded-3xl border transition-all duration-500"
        style={{
          background: allDone
            ? 'linear-gradient(135deg, var(--ns-success-bg) 0%, var(--ns-surface) 75%)'
            : 'linear-gradient(135deg, var(--ns-primary-bg) 0%, var(--ns-surface) 60%)',
          borderColor: allDone ? 'color-mix(in srgb, var(--ns-success) 30%, transparent)' : 'var(--ns-primary-bg-strong)',
          boxShadow: 'var(--ns-shadow-md)',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left px-5 md:px-7 py-4 md:py-5 flex items-center gap-4"
          data-testid="guided-setup-toggle"
        >
          {/* Avatar Noni */}
          <div className="relative shrink-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
              style={{
                background: allDone ? 'var(--ns-success)' : 'var(--ns-gradient-deep)',
              }}
            >
              <span
                className="text-white font-black text-xl tracking-tighter"
                style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic' }}
              >
                N
              </span>
            </div>
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full ns-pulse-soft"
              style={{
                background: allDone ? 'var(--ns-success)' : 'var(--ns-primary-light)',
                boxShadow: '0 0 12px currentColor',
                color: allDone ? 'var(--ns-success)' : 'var(--ns-primary)',
              }}
            />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                color: 'var(--ns-primary)',
              }}
            >
              {allDone ? 'Asistente · Listo' : 'Noni · Tu asistente'}
            </p>
            <h3
              className="text-base md:text-lg font-bold tracking-tight leading-tight"
              style={{ color: 'var(--ns-text)' }}
            >
              {allDone
                ? '¡Configuración completa!'
                : 'Te ayudo a configurar tu cuenta paso a paso'}
            </h3>
            <p
              className="text-[11px] md:text-[12px] mt-1 font-medium"
              style={{ color: 'var(--ns-text-secondary)' }}
            >
              {allDone
                ? 'Tu sistema está 100% operativo. ¡A recibir reservas!'
                : nextStep
                ? `Siguiente: ${nextStep.title}`
                : `${completedSteps.length} de ${totalSteps} pasos · ${progress}%`}
            </p>
          </div>

          {/* Progress ring + chevron */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--ns-border)" strokeWidth="3" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={allDone ? 'var(--ns-success)' : 'var(--ns-primary)'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-[12px] font-black"
                style={{ color: 'var(--ns-text)' }}
              >
                {allDone ? '✓' : `${completedSteps.length}/${totalSteps}`}
              </span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              style={{ color: 'var(--ns-text-muted)' }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* Progress bar */}
        <div className="px-5 md:px-7">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ns-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: allDone ? 'var(--ns-success)' : 'var(--ns-gradient-1)',
              }}
            />
          </div>
        </div>

        {/* Steps list */}
        <div
          className={`overflow-hidden transition-all duration-500 ${
            expanded ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-5 md:px-7 py-4 md:py-5 space-y-2">
            {SETUP_STEPS.map((step, i) => {
              const done = step.check(data)
              const isShareStep = step.id === 'compartir'
              const isNext = nextStep?.id === step.id
              const isExpanded = expandedStep === step.id

              return (
                <div key={step.id}>
                  <div
                    className="flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-all duration-300"
                    style={{
                      background: done
                        ? 'var(--ns-success-bg)'
                        : isNext
                        ? 'var(--ns-primary-bg)'
                        : 'var(--ns-surface)',
                      borderColor: done
                        ? 'color-mix(in srgb, var(--ns-success) 30%, transparent)'
                        : isNext
                        ? 'var(--ns-primary)'
                        : 'var(--ns-border)',
                      boxShadow: isNext ? '0 0 0 3px color-mix(in srgb, var(--ns-primary) 15%, transparent)' : 'none',
                      cursor: done ? 'default' : 'pointer',
                    }}
                    onClick={() => {
                      if (done) return
                      if (isShareStep) return
                      if (step.tab) onNavigate?.(step.tab)
                    }}
                    data-testid={`guided-step-${step.id}`}
                  >
                    {/* Check / Number */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 text-white font-black"
                      style={{
                        background: done
                          ? 'var(--ns-success)'
                          : isNext
                          ? 'var(--ns-primary)'
                          : 'var(--ns-primary-bg-strong)',
                        color: done ? '#fff' : isNext ? '#fff' : 'var(--ns-primary-deep)',
                      }}
                    >
                      {done ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-xs">{i + 1}</span>
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="text-[13px] font-bold"
                          style={{
                            color: done ? 'var(--ns-success)' : 'var(--ns-text)',
                            textDecoration: done ? 'line-through' : 'none',
                            opacity: done ? 0.7 : 1,
                          }}
                        >
                          {step.title}
                        </p>
                        {!done && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{
                              background: step.badge === 'Esencial'
                                ? 'var(--ns-primary-bg-strong)'
                                : step.badge === 'Final'
                                ? 'var(--ns-success-bg)'
                                : 'var(--ns-accent-bg)',
                              color: step.badge === 'Esencial'
                                ? 'var(--ns-primary-deep)'
                                : step.badge === 'Final'
                                ? 'var(--ns-success)'
                                : 'var(--ns-primary)',
                            }}
                          >
                            {step.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[11px] font-medium mt-0.5"
                        style={{ color: done ? 'var(--ns-success)' : 'var(--ns-text-muted)' }}
                      >
                        {done ? 'Completado ✓' : step.desc}
                      </p>
                    </div>

                    {/* Actions */}
                    {!done && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isShareStep ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyLink()
                              }}
                              data-testid="guided-share-copy"
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                              style={{
                                background: 'var(--ns-primary-bg)',
                                color: 'var(--ns-primary)',
                                border: '1px solid var(--ns-primary-bg-strong)',
                              }}
                            >
                              Copiar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShare()
                              }}
                              data-testid="guided-share-wa"
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white transition-all"
                              style={{ background: 'var(--ns-success)' }}
                            >
                              WhatsApp
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedStep(isExpanded ? null : step.id)
                              }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                              style={{
                                background: 'var(--ns-surface-hover)',
                                color: 'var(--ns-text-muted)',
                              }}
                              title="Más info"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                                <path
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            {isNext ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (step.tab) onNavigate?.(step.tab)
                                }}
                                data-testid={`guided-step-go-${step.id}`}
                                className="ns-btn-celeste text-[10px] py-1.5 px-3 ns-pulse-soft"
                                style={{ boxShadow: '0 4px 14px rgba(14,165,233,0.35)' }}
                              >
                                Ir
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                style={{ color: 'var(--ns-text-muted)' }}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded description */}
                  {isExpanded && !done && (
                    <div
                      className="ml-12 mt-2 mb-1 p-3.5 rounded-xl border animate-in slide-in-from-top-2 duration-300"
                      style={{
                        background: 'var(--ns-primary-bg)',
                        borderColor: 'var(--ns-primary-bg-strong)',
                      }}
                    >
                      <p
                        className="text-[12px] font-medium leading-relaxed"
                        style={{ color: 'var(--ns-primary-deep)' }}
                      >
                        {step.descLong}
                      </p>
                      {step.tab && (
                        <button
                          onClick={() => onNavigate?.(step.tab)}
                          className="mt-2 text-[10px] font-bold uppercase tracking-widest transition-colors"
                          style={{ color: 'var(--ns-primary)' }}
                        >
                          Ir a {step.title.toLowerCase()} →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom strip — dismiss option */}
        {!allDone && (
          <div
            className="px-5 md:px-7 py-2.5 border-t flex items-center justify-between text-[11px]"
            style={{ borderColor: 'var(--ns-border)', background: 'var(--ns-surface-alt)' }}
          >
            <span style={{ color: 'var(--ns-text-muted)' }}>
              💡 Configuralo ahora — toma menos de 5 minutos
            </span>
            <button
              onClick={() => {
                setDismissed(true)
                onDismiss?.()
              }}
              className="text-[10px] font-bold uppercase tracking-widest transition-colors"
              style={{ color: 'var(--ns-text-muted)' }}
              data-testid="guided-setup-dismiss"
            >
              Ocultar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
