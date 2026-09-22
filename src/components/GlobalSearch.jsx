import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { normalizar } from '../utils/asistente'

/**
 * GLOBAL SEARCH — Omnibar iOS-style con datos reales de Supabase.
 * Busca en: clientes, servicios, empleados + acciones de navegación.
 * Arreglado: ahora carga sus propios datos si no se pasan como props.
 */
export default function GlobalSearch({
  negocio, onNavigate, onClose,
  clientes = [], servicios = [], empleados = [],
}) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  // Si el padre ya nos pasa los datos, arrancamos con ellos (sin efecto).
  const tieneDatosDelPadre = clientes.length > 0 || servicios.length > 0 || empleados.length > 0
  const [localClientes, setLocalClientes] = useState(clientes)
  const [localServicios, setLocalServicios] = useState(servicios)
  const [localEmpleados, setLocalEmpleados] = useState(empleados)
  const [dataLoaded, setDataLoaded] = useState(tieneDatosDelPadre)
  const inputRef = useRef(null)

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Cerrar con Escape o click fuera
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Cargar datos propios si no se pasan desde el padre
  useEffect(() => {
    if (!negocio?.id || tieneDatosDelPadre) return

    let cancelled = false
    ;(async () => {
      try {
        // No existe una tabla `clientes`: la base de clientes se deriva del
        // historial de turnos (igual que en el panel). La consulta anterior
        // fallaba en silencio y el buscador nunca encontraba a nadie.
        const [tRes, sRes, eRes] = await Promise.all([
          supabase
            .from('turnos')
            .select('cliente_nombre, cliente_telefono, cliente_email, fecha_hora, estado')
            .eq('negocio_id', negocio.id)
            .order('fecha_hora', { ascending: false })
            .limit(2000),
          supabase.from('servicios').select('id, nombre, precio, duracion_minutos').eq('negocio_id', negocio.id),
          supabase.from('empleados').select('id, nombre, especialidad, estado, foto_url').eq('negocio_id', negocio.id),
        ])

        const mapa = new Map()
        for (const t of tRes.data || []) {
          if (t.estado === 'cancelado' || t.estado === 'no_show') continue
          const clave = (t.cliente_telefono || t.cliente_nombre || '').trim()
          if (!clave) continue
          const previo = mapa.get(clave)
          if (previo) {
            previo.visitas += 1
          } else {
            mapa.set(clave, {
              id: clave,
              nombre: t.cliente_nombre,
              telefono: t.cliente_telefono,
              email: t.cliente_email || '',
              visitas: 1,
              ultima_visita: t.fecha_hora,
            })
          }
        }
        const derivados = Array.from(mapa.values())
          .sort((a, b) => b.visitas - a.visitas)
          .map(c => ({ ...c, frecuencia: c.visitas >= 10 ? 'VIP' : c.visitas >= 5 ? 'Frecuente' : c.visitas >= 2 ? 'Regular' : 'Nuevo' }))

        if (!cancelled) {
          setLocalClientes(derivados)
          setLocalServicios(sRes.data || [])
          setLocalEmpleados(eRes.data || [])
          setDataLoaded(true)
        }
      } catch (e) {
        console.warn('GlobalSearch data load error:', e.message)
        setDataLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [negocio?.id, tieneDatosDelPadre])

  // Acciones estáticas siempre disponibles
  const ACCIONES = [
    { type: 'accion', label: 'Nueva Reserva', desc: 'Agendar un turno manual', icon: 'M12 4v16m8-8H4', tab: 'agenda' },
    { type: 'accion', label: 'Agregar Servicio', desc: 'Crear un nuevo servicio', icon: 'M12 4v16m8-8H4', tab: 'servicios' },
    { type: 'accion', label: 'Agregar Empleado', desc: 'Registrar staff', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', tab: 'equipo' },
    { type: 'accion', label: 'Ver Reportes', desc: 'Análisis de rendimiento', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z', tab: 'reportes' },
    { type: 'accion', label: 'Configurar Horarios', desc: 'Días y horas de atención', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', tab: 'horarios' },
    { type: 'accion', label: 'Ajustes del Negocio', desc: 'Marca, contacto, link público', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35', tab: 'ajustes' },
    { type: 'accion', label: 'Copiar Link Público', desc: 'Copiar link de reservas', icon: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1', tab: '__copylink' },
  ]

  const handleSelect = useCallback((item) => {
    if (item.tab === '__copylink') {
      const slug = negocio?.nombre?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ''
      const link = `${window.location.origin}/app/${slug}/${negocio?.id || ''}`
      navigator.clipboard.writeText(link).catch(() => {})
      onClose()
      return
    }
    if (item.tab === '__logout') {
      supabase.auth.signOut()
      onClose()
      return
    }
    onNavigate(item.tab)
    onClose()
  }, [negocio, onNavigate, onClose])

  // Los resultados son un DERIVADO de la búsqueda: con un useEffect + setState
  // se disparaba un render extra en cada tecla.
  const results = useMemo(() => {
    if (!query.trim()) return ACCIONES.slice(0, 6)

    // Sin tildes ni signos: buscar "jose" tiene que encontrar a "José", y
    // "corte clasico" a "Corte Clásico".
    const q = normalizar(query)
    const coincide = (texto) => normalizar(texto).includes(q)
    const matched = []

    // Buscar en clientes reales
    if (localClientes.length > 0) {
      localClientes
        .filter(c => coincide(c.nombre) || coincide(c.telefono) || coincide(c.email))
        .slice(0, 4)
        .forEach(c => matched.push({
          type: 'cliente',
          label: c.nombre,
          desc: `${c.telefono || 'Sin teléfono'} · ${c.visitas || 0} visitas`,
          icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
          tab: 'clientes',
          data: c,
        }))
    }

    // Buscar en servicios reales
    if (localServicios.length > 0) {
      localServicios
        .filter(s => coincide(s.nombre) || coincide(s.descripcion))
        .slice(0, 3)
        .forEach(s => matched.push({
          type: 'servicio',
          label: s.nombre,
          desc: `$${(s.precio || 0).toLocaleString()} · ${(s.duracion_minutos || 0)} min`,
          icon: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
          tab: 'servicios',
          data: s,
        }))
    }

    // Buscar en empleados reales
    if (localEmpleados.length > 0) {
      localEmpleados
        .filter(e => coincide(e.nombre) || coincide(e.especialidad))
        .slice(0, 3)
        .forEach(e => matched.push({
          type: 'empleado',
          label: e.nombre,
          desc: e.especialidad || 'Staff',
          icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
          tab: 'equipo',
          data: e,
        }))
    }

    // Buscar en acciones
    ACCIONES
      .filter(a => coincide(a.label) || coincide(a.desc))
      .slice(0, 4)
      .forEach(a => matched.push(a))

    return matched.slice(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, localClientes, localServicios, localEmpleados])

  // Al cambiar la búsqueda, el foco vuelve al primer resultado.
  useEffect(() => { setSelectedIdx(0) }, [query])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      handleSelect(results[selectedIdx])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const typeLabels = {
    cliente: 'Clientes',
    servicio: 'Servicios',
    empleado: 'Equipo',
    accion: 'Acciones',
  }

  let lastType = null

  return (
    <div
      className="ns-search-overlay"
      onClick={onClose}
      data-testid="global-search"
    >
      <div
        className="ns-search-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--ns-border)' }}>
          <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar cliente, servicio, equipo o acción..."
            className="ns-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.06em]" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--ui-field-sm)', color: 'var(--ns-text-muted)' }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {!dataLoaded ? (
            <div className="flex justify-center py-8">
              <span className="ui-spinner ui-spinner--sm" role="status" aria-label="Buscando" />
            </div>
          ) : results.length === 0 ? (
            <div className="ui-empty">
              <span className="ui-pod ui-pod--sunken">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="ui-empty__title">Sin resultados</p>
              <p className="ui-empty__text">Nada coincide con “{query}”. Probá con un nombre, un teléfono o el nombre de un servicio.</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const showSeparator = item.type !== lastType
              lastType = item.type
              return (
                <div key={idx}>
                  {showSeparator && query.trim() && (
                    <div className="px-5 pt-3 pb-1">
                      <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-primary)' }}>
                        {typeLabels[item.type] || item.type}
                      </span>
                    </div>
                  )}
                  <button
                    className={`ns-search-item ${idx === selectedIdx ? 'ns-search-selected' : ''}`}
                    style={idx === selectedIdx ? { background: 'var(--ns-primary-bg)' } : {}}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    data-testid={`search-item-${idx}`}
                  >
                    <span className={`ui-pod ui-pod--sm ${idx === selectedIdx ? 'ui-pod--brand' : ''}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--ns-text)' }}>{item.label}</p>
                      <p className="text-[10px] font-medium truncate" style={{ color: 'var(--ns-text-muted)' }}>{item.desc}</p>
                    </div>
                    {item.type !== 'accion' && (
                      <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--ns-text-muted)', opacity: 0.4 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ boxShadow: 'inset 0 1px 0 var(--ns-line)' }}>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold uppercase tracking-[0.06em] flex items-center gap-1.5" style={{ color: 'var(--ns-text-muted)' }}>
              <kbd className="px-1.5 py-0.5 rounded-lg" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--ui-field-sm)' }}>↑↓</kbd> Navegar
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.06em] flex items-center gap-1.5" style={{ color: 'var(--ns-text-muted)' }}>
              <kbd className="px-1.5 py-0.5 rounded-lg" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--ui-field-sm)' }}>↵</kbd> Seleccionar
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-text-muted)' }}>
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
