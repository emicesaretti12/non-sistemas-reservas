import { useState, useEffect } from 'react'
import { IconBolt, IconPalette, IconRocket, IconCheckCircle, IconRobot } from './NoniIcons'

/**
 * GuidedSetup — Panel de configuración guiada post-onboarding.
 * Aparece como un banner/checklist persistente hasta que el usuario
 * completa todos los pasos de configuración de su negocio.
 * 
 * v2: Descripciones educativas detalladas, badges de importancia,
 * CTA prominente en el paso siguiente, animaciones de progreso.
 */

const SETUP_STEPS = [
  {
    id: 'servicio',
    title: 'Creá tu primer servicio',
    desc: 'Definí qué ofrecés: nombre, precio y duración.',
    descLong: 'Los servicios son lo que ofrecés: cortes, consultas, sesiones, clases, etc. Cada servicio necesita un nombre, un precio y cuánto dura. Tus clientes los ven cuando entran a tu link.',
    tab: 'servicios',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    check: (data) => data.servicios > 0,
    badge: 'Esencial',
    badgeColor: 'bg-purple-100 text-purple-700',
    priority: 1,
  },
  {
    id: 'empleado',
    title: 'Agregá a tu equipo',
    desc: 'Cargá al menos un profesional o recurso.',
    descLong: 'Acá cargás a las personas que atienden en tu negocio. Si trabajás solo, ponete a vos mismo. Los clientes eligen con quién quieren reservar.',
    tab: 'equipo',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    check: (data) => data.empleados > 0,
    badge: '⚡ Esencial',
    badgeColor: 'bg-purple-100 text-purple-700',
    priority: 2,
  },
  {
    id: 'horarios',
    title: 'Configurá tus horarios',
    desc: 'Definí los días y rangos horarios de atención.',
    descLong: 'Elegí qué días de la semana abrís y en qué horario (ej: Lunes a Viernes de 9 a 18). El sistema calcula automáticamente los turnos disponibles para tus clientes.',
    tab: 'horarios',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    check: (data) => data.horarios,
    badge: '⚡ Esencial',
    badgeColor: 'bg-purple-100 text-purple-700',
    priority: 3,
  },
  {
    id: 'branding',
    title: 'Personalizá tu marca',
    desc: 'Subí tu logo, elegí colores y completá la bio.',
    descLong: 'Tu logo, color e Instagram aparecen en tu app pública de reservas. Es lo primero que ven tus clientes, así que hacé que quede lindo.',
    tab: 'ajustes',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656L10 17.657',
    check: (data) => data.logo || data.descripcion,
    badge: 'Recomendado',
    badgeColor: 'bg-blue-50 text-blue-600',
    priority: 4,
  },
  {
    id: 'compartir',
    title: 'Compartí tu link de reservas',
    desc: 'Enviá tu link a tus primeros clientes.',
    descLong: 'Este es el paso final: enviá tu link por WhatsApp a tus clientes. Ellos entran, eligen servicio, profesional, día y hora, ¡y reservan solos sin llamarte!',
    tab: null,
    icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
    check: (data) => data.compartido,
    badge: 'Final',
    badgeColor: 'bg-green-50 text-green-600',
    priority: 5,
  },
]

export default function GuidedSetup({ negocio, serviciosCount, empleadosCount, onNavigate, onDismiss }) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [shared, setShared] = useState(false)
  const [expandedStep, setExpandedStep] = useState(null)
  const [copyToast, setCopyToast] = useState(false)

  // Check completion state
  const data = {
    servicios: serviciosCount || 0,
    empleados: empleadosCount || 0,
    horarios: negocio?.horarios && Object.values(negocio.horarios).some(d => d.abierto),
    logo: negocio?.logo_url,
    descripcion: negocio?.descripcion,
    compartido: shared,
  }

  const completedSteps = SETUP_STEPS.filter(s => s.check(data))
  const totalSteps = SETUP_STEPS.length
  const progress = Math.round((completedSteps.length / totalSteps) * 100)
  const allDone = completedSteps.length === totalSteps

  // Find the first incomplete step
  const nextStep = SETUP_STEPS.find(s => !s.check(data))

  // Auto-dismiss when all complete
  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => setDismissed(true), 8000)
      return () => clearTimeout(t)
    }
  }, [allDone])

  if (dismissed) return null

  const publicSlug = negocio?.nombre?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ''
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
    <div id="tour-setup" className="mb-4 md:mb-6 animate-in slide-in-from-top-4 duration-700">
      {/* Copy toast */}
      {copyToast && (
        <div className="ns-copy-toast">
          <IconCheckCircle size={18} className="text-emerald-500" />
          <div>
            <p className="text-xs font-bold text-slate-900">¡Link copiado!</p>
            <p className="text-[10px] text-slate-400 font-medium">Compartilo por WhatsApp o redes</p>
          </div>
        </div>
      )}
      <div className={`relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-500 ${allDone ? 'bg-emerald-50 border-emerald-200' : 'bg-gradient-to-br from-purple-50 via-white to-blue-50 border-purple-100'}`}>

        {/* Header — always visible */}
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-5 md:px-7 py-4 md:py-5 flex items-center gap-4">
          {/* Progress ring */}
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
              <circle cx="24" cy="24" r="20" fill="none" stroke={allDone ? '#10b981' : '#6c5ce7'} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                style={{transition:'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)'}}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-900">
              {allDone ? '✓' : `${completedSteps.length}/${totalSteps}`}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
              {allDone ? '¡Configuración completa!' : 'Configurá tu negocio paso a paso'}
            </h3>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">
              {allDone
                ? 'Tu sistema está 100% operativo. ¡A recibir reservas!'
                : nextStep
                  ? `Siguiente: ${nextStep.title}`
                  : `${completedSteps.length} de ${totalSteps} pasos completados — ${progress}%`
              }
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!allDone && (
              <button onClick={(e) => { e.stopPropagation(); setDismissed(true); onDismiss?.() }}
                className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 px-2 py-1 hidden md:block">
                Ocultar
              </button>
            )}
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {/* Progress bar */}
        <div className="px-5 md:px-7">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: allDone ? '#10b981' : 'linear-gradient(90deg, #6c5ce7, #a29bfe, #00cec9)'
              }}
            />
          </div>
        </div>

        {/* Steps list — collapsible */}
        <div className={`overflow-hidden transition-all duration-500 ${expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 md:px-7 py-4 md:py-5 space-y-2">
            {SETUP_STEPS.map((step, i) => {
              const done = step.check(data)
              const isShareStep = step.id === 'compartir'
              const isNext = nextStep?.id === step.id
              const isExpanded = expandedStep === step.id

              return (
                <div key={step.id}>
                  <div
                    className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-all duration-300 ${
                      done
                        ? 'bg-emerald-50/50 border-emerald-100'
                        : isNext
                          ? 'bg-purple-50 border-purple-200 shadow-sm ring-1 ring-purple-100'
                          : 'bg-white border-slate-100 hover:border-purple-200 hover:shadow-sm cursor-pointer'
                    }`}
                    onClick={() => {
                      if (done) return
                      if (isShareStep) return
                      if (step.tab) onNavigate?.(step.tab)
                    }}
                  >
                    {/* Check / Number */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ${
                      done ? 'bg-emerald-500 text-white' : isNext ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-500'
                    }`}>
                      {done ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <span className="text-xs font-black">{i + 1}</span>
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-xs font-bold ${done ? 'text-emerald-700 line-through opacity-70' : 'text-slate-900'}`}>
                          {step.title}
                        </p>
                        {!done && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${step.badgeColor}`}>
                            {step.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-[9px] font-medium mt-0.5 ${done ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {done ? 'Completado ✓' : step.desc}
                      </p>
                    </div>

                    {/* Actions */}
                    {!done && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isShareStep ? (
                          <div className="flex gap-1.5">
                            <button onClick={(e) => { e.stopPropagation(); handleCopyLink() }}
                              className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-[9px] font-bold uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all">
                              Copiar
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleShare() }}
                              className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-[9px] font-bold uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all">
                              WA
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Info toggle */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedStep(isExpanded ? null : step.id) }}
                              className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-purple-500 hover:bg-purple-50 transition-all"
                              title="Más info"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            {/* Go arrow */}
                            {isNext ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); if (step.tab) onNavigate?.(step.tab) }}
                                className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-purple-400 transition-all animate-pulse"
                              >
                                Ir →
                              </button>
                            ) : (
                              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded description */}
                  {isExpanded && !done && (
                    <div className="ml-11 mt-1 mb-1 p-3 bg-purple-50 rounded-xl border border-purple-100 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[11px] text-purple-700 font-medium leading-relaxed">{step.descLong}</p>
                      {step.tab && (
                        <button
                          onClick={() => onNavigate?.(step.tab)}
                          className="mt-2 text-[9px] font-bold text-purple-600 uppercase tracking-widest hover:text-purple-800 transition-colors"
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
      </div>
    </div>
  )
}
