import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { responder, sugerencias } from '../utils/asistente'
import { haptic } from '../utils/haptics'

const ASSISTANT_KEY_BASE = 'ns_noni_v4_state'

/** Lee el historial guardado; si no hay o el storage está bloqueado, vacío. */
function leerHistorial(key) {
  try {
    const guardado = localStorage.getItem(key)
    if (!guardado) return []
    const parsed = JSON.parse(guardado)
    return Array.isArray(parsed?.mensajes) ? parsed.mensajes : []
  } catch {
    return []
  }
}

/**
 * Noni — asistente del panel.
 * Hoja inferior en móvil, tarjeta flotante en escritorio. Responde con los
 * datos reales del negocio y, cuando la respuesta implica ir a algún lado,
 * ofrece el botón que te lleva.
 */

/** Carita de Noni, moldeada en los dos colores de la marca. */
function NoniAvatar({ size = 44, mood = 'happy' }) {
  const ry = mood === 'thinking' ? 0.9 : 2.6
  const boca = mood === 'happy' ? 'M18.5 29.5 Q24 33 29.5 29.5' : 'M19 30 Q24 31.4 29 30'

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="noniShell" x1="10" y1="10" x2="40" y2="40">
          <stop offset="0%" stopColor="#A81322" />
          <stop offset="100%" stopColor="#8A000F" />
        </linearGradient>
      </defs>
      {/* antena */}
      <path d="M24 9V5" stroke="#990011" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="4" r="2.6" fill="#990011" />
      {/* cuerpo */}
      <rect x="7" y="10" width="34" height="28" rx="11" fill="url(#noniShell)" />
      <rect x="7" y="10" width="34" height="28" rx="11" fill="none" stroke="#FCF6F5" strokeOpacity="0.22" strokeWidth="1.2" />
      {/* visor hundido */}
      <rect x="12" y="16" width="24" height="16" rx="7" fill="#7A000E" />
      {/* ojos + boca */}
      <ellipse cx="19" cy="23.5" rx="2.4" ry={ry} fill="#FCF6F5" />
      <ellipse cx="29" cy="23.5" rx="2.4" ry={ry} fill="#FCF6F5" />
      <path d={boca} stroke="#FCF6F5" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      {/* orejas */}
      <rect x="4" y="20" width="3" height="8" rx="1.5" fill="#990011" />
      <rect x="41" y="20" width="3" height="8" rx="1.5" fill="#990011" />
    </svg>
  )
}

function Escribiendo() {
  return (
    <div className="ns-chat-assistant ns-assistant-chat-msg flex items-center gap-1.5" aria-label="Noni está escribiendo">
      <span className="ns-typing-dot" />
      <span className="ns-typing-dot" style={{ animationDelay: '0.15s' }} />
      <span className="ns-typing-dot" style={{ animationDelay: '0.3s' }} />
    </div>
  )
}

/** Atajos según lo que todavía falta configurar. */
function accionesPendientes({ setupData = {}, vocab = {}, tab, publicLink }) {
  const acciones = []
  if (!setupData.hasServicios) acciones.push({ id: 'servicios', tab: 'servicios', texto: `Cargar mi primer ${vocab.servicio || 'servicio'}` })
  if (!setupData.hasHorarios) acciones.push({ id: 'horarios', tab: 'horarios', texto: 'Definir mis horarios' })
  if (!setupData.hasEmpleados) acciones.push({ id: 'equipo', tab: 'equipo', texto: `Sumar ${vocab.empleado || 'a mi equipo'}` })
  if (!setupData.hasBranding) acciones.push({ id: 'marca', tab: 'ajustes', texto: 'Subir mi logo' })
  if (!setupData.hasShared && publicLink) acciones.push({ id: 'link', copiarLink: true, texto: 'Copiar mi link de reservas' })
  return acciones.filter((a) => a.tab !== tab).slice(0, 3)
}

export default function NoniAssistantV4({
  tab, setupData, vocab, negocio, smartAlerts, publicLink, onNavigate, onStartTour,
}) {
  const [open, setOpen] = useState(false)
  const [mensajes, setMensajes] = useState(() => leerHistorial(`${ASSISTANT_KEY_BASE}_${negocio?.id || 'anon'}`))
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const finRef = useRef(null)
  const dragControls = useDragControls()
  const panelRef = useRef(null)
  const inputRef = useRef(null)

  // El historial se guarda por negocio: con una clave global, al cambiar de
  // cuenta en el mismo navegador aparecía la conversación del negocio anterior.
  const KEY = `${ASSISTANT_KEY_BASE}_${negocio?.id || 'anon'}`

  const pendientes = useMemo(
    () => accionesPendientes({ setupData, vocab, tab, publicLink }),
    [setupData, vocab, tab, publicLink]
  )

  const preguntas = useMemo(
    () => sugerencias({ setupData, smartAlerts }),
    [setupData, smartAlerts]
  )

  // Si se cambia de negocio en la misma pestaña, recargamos su historial.
  const keyRef = useRef(KEY)
  useEffect(() => {
    if (keyRef.current === KEY) return undefined
    keyRef.current = KEY
    const id = requestAnimationFrame(() => setMensajes(leerHistorial(KEY)))
    return () => cancelAnimationFrame(id)
  }, [KEY])

  useEffect(() => {
    try {
      // Guardamos sólo los últimos 30 mensajes: el historial completo podía
      // llenar la cuota de localStorage y tirar QuotaExceededError.
      localStorage.setItem(KEY, JSON.stringify({ mensajes: mensajes.slice(-30) }))
    } catch { /* sin storage: el chat sigue en memoria */ }
  }, [mensajes, KEY])

  useEffect(() => {
    // Sólo seguimos la conversación hacia abajo cuando ya hay mensajes: si no,
    // al abrir el panel el saludo quedaba scrolleado fuera de la vista.
    if (open && (mensajes.length > 0 || pensando)) {
      finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [mensajes, pensando, open])

  useEffect(() => {
    if (!open) return undefined
    const alTocarAfuera = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    const alTeclear = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', alTocarAfuera)
    document.addEventListener('keydown', alTeclear)
    const t = setTimeout(() => {
      // En móvil no enfocamos solo: el teclado tapando media pantalla apenas
      // se abre el asistente es justo lo contrario de sentirse cómodo.
      if (window.innerWidth >= 768) inputRef.current?.focus()
    }, 260)
    return () => {
      document.removeEventListener('mousedown', alTocarAfuera)
      document.removeEventListener('keydown', alTeclear)
      clearTimeout(t)
    }
  }, [open])

  const contexto = useMemo(() => ({ ...smartAlerts, negocio, vocab }), [smartAlerts, negocio, vocab])

  const ejecutar = useCallback((accion) => {
    if (!accion) return
    haptic('select')
    if (accion.copiarLink && publicLink) {
      navigator.clipboard?.writeText(publicLink).catch(() => {})
      try { localStorage.setItem('ns_link_shared', '1') } catch { /* modo privado */ }
      setMensajes((prev) => [...prev, {
        rol: 'noni',
        texto: '¡Listo, copiado! Pegalo en WhatsApp, en tu bio de Instagram o donde quieras. Tus clientes ya pueden reservar solos.',
      }])
      return
    }
    if (accion.tour) { setOpen(false); onStartTour?.(); return }
    if (accion.tab) { setOpen(false); onNavigate?.(accion.tab) }
  }, [publicLink, onNavigate, onStartTour])

  const enviar = useCallback((consulta) => {
    const pregunta = String(consulta ?? '').trim()
    if (!pregunta || pensando) return

    haptic()
    setTexto('')
    setMensajes((prev) => [...prev, { rol: 'yo', texto: pregunta }])
    setPensando(true)

    // Una pausa corta: una respuesta instantánea se siente a "buscador",
    // no a alguien que te está contestando.
    const t = setTimeout(() => {
      const r = responder(pregunta, contexto)
      setMensajes((prev) => [...prev, { rol: 'noni', texto: r.texto, accion: r.accion }])
      setPensando(false)
    }, 520)
    return () => clearTimeout(t)
  }, [pensando, contexto])

  const limpiar = () => {
    setMensajes([])
    try { localStorage.removeItem(KEY) } catch { /* modo privado */ }
  }

  const pendientesCount = pendientes.length

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.7, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 18 }}
            transition={{ type: 'spring', damping: 18, stiffness: 320 }}
            onClick={() => { haptic(); setOpen(true) }}
            className="ns-assistant-fab"
            aria-label="Abrir el asistente Noni"
            title="Hablar con Noni"
          >
            <NoniAvatar size={38} mood={pensando ? 'thinking' : 'happy'} />
            {pendientesCount > 0 && (
              <span className="ns-assistant-badge" aria-hidden="true">{pendientesCount}</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-label="Asistente Noni"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="ns-assistant-panel"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={(_, info) => {
              // Arrastrar la hoja hacia abajo la cierra, como en iOS.
              if (info.offset.y > 110 || info.velocity.y > 650) setOpen(false)
            }}
          >
            {/* Manija: sólo desde acá arranca el gesto de arrastre */}
            <div
              className="neo-sheet__handle md:hidden"
              onPointerDown={(e) => dragControls.start(e)}
              role="presentation"
            />

            {/* Cabecera */}
            <div className="flex items-center gap-3 px-4 pb-3 pt-1 md:pt-4" style={{ boxShadow: 'inset 0 -1px 0 var(--ns-line)' }}>
              <span className="neo-avatar w-11 h-11 shrink-0" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset-sm)' }}>
                <NoniAvatar size={30} mood={pensando ? 'thinking' : 'happy'} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black tracking-tight leading-none" style={{ color: 'var(--ns-text)' }}>Noni</p>
                <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--ns-text-muted)' }}>
                  {pensando ? 'Escribiendo…' : 'Tu asistente del panel'}
                </p>
              </div>
              {mensajes.length > 0 && (
                <button onClick={limpiar} className="neo-btn neo-btn--ghost neo-btn--quiet" title="Borrar la conversación">
                  Limpiar
                </button>
              )}
              <button onClick={() => setOpen(false)} className="neo-icon-btn w-9 h-9" aria-label="Cerrar el asistente">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            {/* Conversación */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain flex flex-col gap-2.5 px-4 py-4"
              style={{ background: 'var(--ns-sunken)', minHeight: 240, maxHeight: '52dvh' }}
            >
              {mensajes.length === 0 && (
                <div className="flex flex-col gap-3">
                  <div className="ns-chat-assistant ns-assistant-chat-msg" style={{ maxWidth: '100%' }}>
                    {`¡Hola${negocio?.nombre ? `, ${negocio.nombre}` : ''}! Soy Noni.\n\nPreguntame cómo viene tu día, qué te falta configurar o cómo funciona cualquier parte del panel.`}
                  </div>

                  {pendientes.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="neo-eyebrow px-1">Te falta esto</p>
                      {pendientes.map((a, i) => (
                        <motion.button
                          key={a.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => ejecutar(a)}
                          className="neo-btn neo-btn--quiet justify-start w-full"
                          style={{ color: 'var(--ns-primary)' }}
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {a.texto}
                        </motion.button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <p className="neo-eyebrow px-1">Preguntas frecuentes</p>
                    {preguntas.map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        onClick={() => enviar(q)}
                        className="neo-btn neo-btn--quiet justify-start w-full text-left"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {mensajes.map((m, i) => (
                <div key={i} className="flex flex-col gap-2" style={{ alignItems: m.rol === 'yo' ? 'flex-end' : 'flex-start' }}>
                  <div className={`ns-assistant-chat-msg ${m.rol === 'yo' ? 'ns-chat-user' : 'ns-chat-assistant'}`}>
                    {m.texto}
                  </div>
                  {m.accion && (
                    <button onClick={() => ejecutar(m.accion)} className="neo-btn neo-btn--primary neo-btn--quiet">
                      {m.accion.label}
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </div>
              ))}

              {pensando && <Escribiendo />}
              <div ref={finRef} />
            </div>

            {/* Entrada */}
            <form
              className="flex items-center gap-2 p-3"
              style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
              onSubmit={(e) => { e.preventDefault(); enviar(texto) }}
            >
              <input
                ref={inputRef}
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribime lo que necesites…"
                aria-label="Escribile a Noni"
                className="neo-field flex-1"
                enterKeyHint="send"
              />
              <button
                type="submit"
                disabled={pensando || !texto.trim()}
                className="neo-btn neo-btn--primary shrink-0"
                style={{ width: 48, minHeight: 48, padding: 0 }}
                aria-label="Enviar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
