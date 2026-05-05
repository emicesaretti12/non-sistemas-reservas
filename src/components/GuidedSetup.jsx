import { useState, useEffect } from 'react'

/**
 * GuidedSetup — Panel de configuración guiada post-onboarding.
 * Aparece como un banner/checklist persistente hasta que el usuario
 * completa todos los pasos de configuración de su negocio.
 */

const SETUP_STEPS = [
  {
    id: 'servicio',
    title: 'Creá tu primer servicio',
    desc: 'Definí qué ofrecés: nombre, precio y duración.',
    tab: 'servicios',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    check: (data) => data.servicios > 0,
  },
  {
    id: 'empleado',
    title: 'Agregá a tu equipo',
    desc: 'Cargá al menos un profesional o recurso.',
    tab: 'equipo',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    check: (data) => data.empleados > 0,
  },
  {
    id: 'horarios',
    title: 'Configurá tus horarios',
    desc: 'Definí los días y rangos horarios de atención.',
    tab: 'horarios',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    check: (data) => data.horarios,
  },
  {
    id: 'branding',
    title: 'Personalizá tu marca',
    desc: 'Subí tu logo, elegí colores y completá la bio.',
    tab: 'ajustes',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656L10 17.657',
    check: (data) => data.logo || data.descripcion,
  },
  {
    id: 'compartir',
    title: 'Compartí tu link',
    desc: 'Enviá tu link de reservas a tus primeros clientes.',
    tab: null,
    icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
    check: (data) => data.compartido,
  },
]

export default function GuidedSetup({ negocio, serviciosCount, empleadosCount, onNavigate, onDismiss }) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [shared, setShared] = useState(false)

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

  // Auto-dismiss when all complete
  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => setDismissed(true), 5000)
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
    navigator.clipboard.writeText(publicLink)
    setShared(true)
    alert('¡Link copiado!')
  }

  return (
    <div className="mb-4 md:mb-6 animate-in slide-in-from-top-4 duration-700">
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
              {allDone ? '¡Configuración completa!' : 'Configurá tu negocio'}
            </h3>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">
              {allDone ? 'Tu sistema está 100% operativo. ¡A recibir reservas!' : `${completedSteps.length} de ${totalSteps} pasos completados — ${progress}%`}
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
        <div className={`overflow-hidden transition-all duration-500 ${expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 md:px-7 py-4 md:py-5 space-y-2">
            {SETUP_STEPS.map((step, i) => {
              const done = step.check(data)
              const isShareStep = step.id === 'compartir'

              return (
                <div key={step.id}
                  className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-all duration-300 ${
                    done
                      ? 'bg-emerald-50/50 border-emerald-100'
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
                    done ? 'bg-emerald-500 text-white' : 'bg-purple-50 text-purple-500'
                  }`}>
                    {done ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d={step.icon} strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${done ? 'text-emerald-700 line-through opacity-70' : 'text-slate-900'}`}>
                      {step.title}
                    </p>
                    <p className={`text-[9px] font-medium mt-0.5 ${done ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {done ? 'Completado ✓' : step.desc}
                    </p>
                  </div>

                  {/* Action */}
                  {!done && (
                    isShareStep ? (
                      <div className="flex gap-1.5 shrink-0">
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
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )
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
