import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconRobot, IconChart, IconCheckCircle, IconClipboard, IconBolt,
  IconCalendar, IconLink, IconPalette, IconRocket,
} from './NoniIcons'
import { haptic } from '../utils/haptics'

const TOUR_KEY = 'ns_tour_completed_v2'

/**
 * Tour guiado del panel.
 *
 * Qué estaba roto antes:
 *  · Los pasos apuntaban a ids (`tour-servicios`, `tour-agenda`, `tour-ajustes`)
 *    que existían dos veces en el documento —en la pestaña y en el contenido—,
 *    así que `getElementById` siempre resaltaba el botón y nunca la sección.
 *  · `tour-link` directamente no existía: ese paso quedaba sin posición y la
 *    tarjeta aparecía tirada arriba de todo, fuera de la pantalla.
 *  · El tour no cambiaba de pestaña, así que los pasos de Servicios, Agenda y
 *    Ajustes hablaban de secciones que no estaban montadas.
 *  · No había foco ni recorte: se veía el texto pero nada quedaba resaltado.
 *  · `tour-tabs` estaba oculto en móvil (`hidden md:flex`): el paso apuntaba a
 *    un elemento de tamaño cero.
 *
 * Cómo funciona ahora: cada paso declara uno o más objetivos `data-tour` y, si
 * hace falta, la pestaña donde viven. El tour cambia de pestaña, espera a que
 * el nodo exista, lo recorta del velo, lo trae a la vista y ancla la tarjeta al
 * espacio libre. Si un objetivo no aparece, el paso se muestra centrado en vez
 * de romperse.
 */

const STEPS = [
  {
    id: 'bienvenida',
    title: '¡Hola! Soy Noni',
    message: 'Te muestro tu panel en un minuto. Podés salir cuando quieras y retomar después desde el botón de ayuda.',
    Icon: IconRobot,
  },
  {
    id: 'monitor',
    targets: ['monitor'],
    tab: 'inicio',
    title: 'Tu resumen del día',
    message: 'Turnos de hoy, ingresos y próximos clientes. Se actualiza solo cada vez que entra una reserva nueva.',
    Icon: IconChart,
  },
  {
    id: 'setup',
    targets: ['setup'],
    tab: 'inicio',
    title: 'Primeros pasos',
    message: 'Esta lista te dice qué falta para que tus clientes puedan reservar. Cuando está completa, tu link ya funciona solo.',
    Icon: IconCheckCircle,
  },
  {
    id: 'nav',
    targets: ['nav', 'tabs', 'nav-mobile'],
    title: 'Navegación',
    message: 'Desde acá entrás a todas las secciones: agenda, servicios, equipo, horarios, clientes y ajustes.',
    Icon: IconClipboard,
  },
  {
    id: 'servicios',
    targets: ['servicios'],
    tab: 'servicios',
    title: 'Tus servicios',
    message: 'Cargá qué ofrecés con su precio y duración — por ejemplo "Corte clásico · $3500 · 30 min". Es lo primero que ven tus clientes al reservar.',
    Icon: IconBolt,
    actionLabel: 'Quedarme acá',
    actionTab: 'servicios',
  },
  {
    id: 'agenda',
    targets: ['agenda'],
    tab: 'agenda',
    title: 'Tu agenda',
    message: 'Todos los turnos en un solo lugar: los que reservan tus clientes y los que cargás vos. Podés confirmar, cancelar o escribir por WhatsApp.',
    Icon: IconCalendar,
    actionLabel: 'Ir a la agenda',
    actionTab: 'agenda',
  },
  {
    id: 'link',
    targets: ['link'],
    tab: 'ajustes',
    title: 'Tu link de reservas',
    message: 'Este es tu link público. Compartilo por WhatsApp o Instagram y tus clientes reservan solos, sin llamarte.',
    Icon: IconLink,
    actionLabel: 'Copiar mi link',
    actionCopyLink: true,
  },
  {
    id: 'marca',
    targets: ['ajustes'],
    tab: 'ajustes',
    title: 'Tu marca',
    message: 'Subí tu logo, escribí tu descripción y cargá tu dirección. Todo eso aparece en la app que ven tus clientes.',
    Icon: IconPalette,
  },
  {
    id: 'final',
    title: '¡Listo!',
    message: 'Ya conocés el panel. Si te trabás en algo, tocá el botón de Noni abajo a la derecha y te doy una mano.',
    Icon: IconRocket,
    finish: true,
  },
]

const PAD = 12
const CARD_W = 372

export function useTour() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let completado = false
    try { completado = localStorage.getItem(TOUR_KEY) === '1' } catch { /* modo privado */ }
    if (completado) return

    const t = setTimeout(() => setActive(true), 1400)
    return () => clearTimeout(t)
  }, [])

  const start = useCallback(() => setActive(true), [])
  const dismiss = useCallback(() => {
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* modo privado */ }
    setActive(false)
  }, [])

  return { active, start, dismiss }
}

/** Devuelve el primer nodo visible de la lista de objetivos del paso. */
function resolveTarget(targets) {
  if (!targets?.length) return null
  for (const key of targets) {
    const nodos = document.querySelectorAll(`[data-tour="${key}"]`)
    for (const nodo of nodos) {
      const r = nodo.getBoundingClientRect()
      // Un elemento oculto por media query mide 0 y no sirve como ancla.
      if (r.width > 8 && r.height > 8) return nodo
    }
  }
  return null
}

export default function DashboardTourV2({ active, onDismiss, negocio, onNavigate, publicLink }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const cardRef = useRef(null)
  const rafRef = useRef(0)
  // `onNavigate` es una función nueva en cada render del panel; guardarla en
  // un ref evita que el efecto se reinicie (y vuelva a hacer scroll) cada vez
  // que el dashboard se refresca por una reserva nueva.
  const navigateRef = useRef(onNavigate)
  useEffect(() => { navigateRef.current = onNavigate }, [onNavigate])

  const current = STEPS[step]
  const total = STEPS.length
  const esCentrado = !rect

  // ── Cambio de pestaña + medición del objetivo ─────────────────────────────
  useEffect(() => {
    if (!active) return undefined
    let vivo = true
    let intentos = 0

    if (current.tab) navigateRef.current?.(current.tab)

    const medir = () => {
      if (!vivo) return
      const el = resolveTarget(current.targets)
      if (!el) {
        // La sección puede tardar en montarse (carga de datos): reintentamos
        // un rato corto antes de caer al modo centrado.
        if (intentos++ < 12) {
          rafRef.current = window.setTimeout(medir, 120)
          return
        }
        setRect(null)
        return
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      // Esperamos a que el scroll suave termine antes de fijar el recorte,
      // si no el agujero del velo queda corrido respecto del elemento.
      rafRef.current = window.setTimeout(() => {
        if (!vivo) return
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }, 340)
    }

    // Un frame para que React monte la pestaña nueva antes de buscar el nodo.
    rafRef.current = window.setTimeout(medir, current.tab ? 90 : 0)

    return () => {
      vivo = false
      clearTimeout(rafRef.current)
    }
  }, [active, step, current])

  // ── Reposicionar si cambia el viewport ────────────────────────────────────
  useEffect(() => {
    if (!active || !current.targets) return undefined
    const recolocar = () => {
      const el = resolveTarget(current.targets)
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    window.addEventListener('resize', recolocar)
    window.addEventListener('scroll', recolocar, true)
    return () => {
      window.removeEventListener('resize', recolocar)
      window.removeEventListener('scroll', recolocar, true)
    }
  }, [active, current])

  const cerrar = useCallback(() => {
    setStep(0)
    setRect(null)
    onDismiss?.()
  }, [onDismiss])

  const siguiente = useCallback(() => {
    haptic('select')
    setRect(null)
    setStep((s) => (s < total - 1 ? s + 1 : s))
    if (step >= total - 1) cerrar()
  }, [step, total, cerrar])

  const anterior = useCallback(() => {
    if (step === 0) return
    haptic()
    setRect(null)
    setStep((s) => s - 1)
  }, [step])

  // ── Teclado ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar() }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); siguiente() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); anterior() }
      else if (e.key === 'Tab' && cardRef.current) {
        // El foco no debe escaparse a la página de atrás mientras el tour manda.
        const focusables = cardRef.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')
        if (!focusables.length) return
        const primero = focusables[0]
        const ultimo = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, cerrar, siguiente, anterior])

  useEffect(() => {
    if (!active) return
    // Anunciamos el paso a lectores de pantalla y damos foco al panel.
    const t = setTimeout(() => cardRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [active, step])

  // ── Posición de la tarjeta ────────────────────────────────────────────────
  const cardStyle = useMemo(() => {
    if (typeof window === 'undefined') return {}
    const vw = window.innerWidth
    const vh = window.innerHeight
    const compacto = vw < 720

    if (!rect) {
      return compacto
        ? { left: 12, right: 12, bottom: 'max(16px, env(safe-area-inset-bottom, 0px))', width: 'auto' }
        : { left: (vw - CARD_W) / 2, top: Math.max(24, vh / 2 - 190), width: CARD_W }
    }

    // Un objetivo más alto que la pantalla no deja hueco arriba ni abajo: en
    // ese caso la tarjeta se ancla a una esquina y no tapa el centro.
    if (rect.height > vh * 0.62) {
      return compacto
        ? { left: 12, right: 12, bottom: 'max(16px, env(safe-area-inset-bottom, 0px))', width: 'auto' }
        : { right: 28, bottom: 28, width: CARD_W }
    }

    // En pantallas chicas la tarjeta vive abajo, como una hoja nativa, y el
    // recorte se ve arriba. Es más estable que perseguir al elemento.
    if (compacto) {
      const abajoDelObjetivo = rect.top + rect.height + PAD
      const cabeAbajo = vh - abajoDelObjetivo > 250
      return cabeAbajo
        ? { left: 12, right: 12, top: abajoDelObjetivo, width: 'auto' }
        : { left: 12, right: 12, bottom: 'max(16px, env(safe-area-inset-bottom, 0px))', width: 'auto' }
    }

    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 16)
    const espacioAbajo = vh - (rect.top + rect.height)
    if (espacioAbajo > 280) return { left, top: rect.top + rect.height + PAD, width: CARD_W }
    if (rect.top > 280) return { left, bottom: vh - rect.top + PAD, width: CARD_W }
    return { left, top: Math.max(16, vh / 2 - 180), width: CARD_W }
  }, [rect])

  const copiarLink = () => {
    if (!publicLink) return
    navigator.clipboard?.writeText(publicLink).catch(() => {})
    try { localStorage.setItem('ns_link_shared', '1') } catch { /* modo privado */ }
    haptic('success')
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2600)
  }

  const ejecutarAccion = () => {
    if (current.actionCopyLink) copiarLink()
    else if (current.actionTab) { haptic(); navigateRef.current?.(current.actionTab) }
  }

  if (!active) return null

  const progreso = ((step + 1) / total) * 100
  const Icono = current.Icon

  return (
    <>
      {/* ═══ Velo con recorte sobre el elemento resaltado ═══ */}
      <motion.div
        className="ns-tour-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        aria-hidden="true"
        style={{
          // El velo se recorta con clip-path: el elemento resaltado queda
          // nítido y además se puede seguir tocando durante el tour.
          background: 'rgba(94,0,10,0.42)',
          clipPath: rect
            ? `polygon(
                0% 0%, 0% 100%, ${rect.left - 6}px 100%, ${rect.left - 6}px ${rect.top - 6}px,
                ${rect.left + rect.width + 6}px ${rect.top - 6}px,
                ${rect.left + rect.width + 6}px ${rect.top + rect.height + 6}px,
                ${rect.left - 6}px ${rect.top + rect.height + 6}px, ${rect.left - 6}px 100%,
                100% 100%, 100% 0%
              )`
            : undefined,
        }}
      />

      {/* ═══ Aro alrededor del objetivo ═══ */}
      {rect && (
        <motion.div
          className="ns-tour-ring"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      {/* ═══ Tarjeta del paso ═══ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          ref={cardRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ns-tour-title"
          aria-describedby="ns-tour-desc"
          className="ns-tour-card outline-none"
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          style={cardStyle}
        >
          <div className="neo-progress" style={{ height: 4, borderRadius: 0 }}>
            <motion.div
              className="neo-progress__fill"
              style={{ borderRadius: 0 }}
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div className={`p-5 ${esCentrado ? 'sm:p-7 text-center' : 'sm:p-6'}`}>
            <div className={`flex items-start gap-3.5 ${esCentrado ? 'flex-col items-center' : ''}`}>
              <motion.span
                className="neo-avatar neo-avatar--brand shrink-0"
                style={{ width: esCentrado ? 60 : 46, height: esCentrado ? 60 : 46 }}
                initial={{ scale: 0.4, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 13, stiffness: 240, delay: 0.1 }}
              >
                <Icono size={esCentrado ? 28 : 22} />
              </motion.span>

              <div className="flex-1 min-w-0">
                <h2
                  id="ns-tour-title"
                  className={`font-display font-black tracking-tight leading-tight ${esCentrado ? 'text-2xl mt-3' : 'text-[17px]'}`}
                  style={{ color: 'var(--ns-text)' }}
                >
                  {current.title}
                </h2>
                {step === 0 && negocio?.nombre && (
                  <p className="text-[12px] font-bold mt-1" style={{ color: 'var(--ns-primary)' }}>{negocio.nombre}</p>
                )}
                <p className="neo-eyebrow mt-1.5">Paso {step + 1} de {total}</p>
              </div>

              {!esCentrado && (
                <button
                  onClick={cerrar}
                  className="neo-icon-btn w-9 h-9 shrink-0"
                  aria-label="Cerrar el tour"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
            </div>

            <p
              id="ns-tour-desc"
              className="text-[13.5px] leading-relaxed mt-3.5"
              style={{ color: 'var(--ns-text-secondary)' }}
            >
              {current.message}
            </p>

            {current.actionLabel && (
              <button
                onClick={ejecutarAccion}
                className="neo-btn neo-btn--quiet mt-3.5"
                style={{ color: 'var(--ns-primary)' }}
              >
                {current.actionCopyLink && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
                {copiado ? '¡Copiado!' : current.actionLabel}
              </button>
            )}

            {/* Puntos de progreso */}
            <div className={`flex items-center gap-1.5 mt-5 ${esCentrado ? 'justify-center' : ''}`}>
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => { haptic(); setRect(null); setStep(i) }}
                  aria-label={`Ir al paso ${i + 1}: ${s.title}`}
                  aria-current={i === step ? 'step' : undefined}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 22 : 7,
                    background: i <= step ? 'var(--ns-primary)' : 'var(--ns-line-strong)',
                    opacity: i <= step ? 1 : 0.7,
                  }}
                />
              ))}
            </div>

            <div className="flex gap-2.5 mt-4">
              {step === 0 ? (
                <>
                  <button onClick={cerrar} className="neo-btn flex-1">Ahora no</button>
                  <button onClick={siguiente} className="neo-btn neo-btn--primary flex-[1.6]">Empecemos</button>
                </>
              ) : current.finish ? (
                <button onClick={cerrar} className="neo-btn neo-btn--primary neo-btn--block">
                  Ir a mi panel
                </button>
              ) : (
                <>
                  <button onClick={anterior} className="neo-btn" aria-label="Paso anterior">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button onClick={cerrar} className="neo-btn neo-btn--ghost flex-1">Saltar</button>
                  <button onClick={siguiente} className="neo-btn neo-btn--primary flex-[1.4]">
                    Siguiente
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {copiado && (
        <div className="ns-copy-toast" role="status" style={{ zIndex: 10001 }}>
          <span className="neo-avatar w-9 h-9">
            <IconLink size={18} />
          </span>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>¡Link copiado!</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>Pegalo en WhatsApp o Instagram</p>
          </div>
        </div>
      )}
    </>
  )
}
