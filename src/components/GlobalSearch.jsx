import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

/**
 * GLOBAL SEARCH — Omnibar iOS-style con datos reales de Supabase.
 * Busca en: clientes, servicios, empleados + acciones de navegación.
 * Arreglado: ahora carga sus propios datos si no se pasan como props.
 */
export default function GlobalSearch({
  negocio, session, onNavigate, onClose,
  clientes = [], servicios = [], empleados = [],
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [localClientes, setLocalClientes] = useState(clientes)
  const [localServicios, setLocalServicios] = useState(servicios)
  const [localEmpleados, setLocalEmpleados] = useState(empleados)
  const [dataLoaded, setDataLoaded] = useState(false)
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
    if (!negocio?.id) return
    if (clientes.length > 0 || servicios.length > 0 || empleados.length > 0) {
      setLocalClientes(clientes)
      setLocalServicios(servicios)
      setLocalEmpleados(empleados)
      setDataLoaded(true)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const [cRes, sRes, eRes] = await Promise.all([
          supabase.from('clientes').select('id, nombre, telefono, email, visitas, frecuencia, ultima_visita').eq('negocio_id', negocio.id).order('visitas', { ascending: false }).limit(100),
          supabase.from('servicios').select('id, nombre, precio, duracion_minutos, descripcion').eq('negocio_id', negocio.id),
          supabase.from('empleados').select('id, nombre, especialidad, estado, foto_url').eq('negocio_id', negocio.id),
        ])
        if (!cancelled) {
          setLocalClientes(cRes.data || [])
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
  }, [negocio?.id])

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

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults(ACCIONES.slice(0, 6))
      setSelectedIdx(0)
      return
    }

    const q = query.toLowerCase().trim()
    const matched = []

    // Buscar en clientes reales
    if (localClientes.length > 0) {
      localClientes
        .filter(c =>
          c.nombre?.toLowerCase().includes(q) ||
          c.telefono?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
        )
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
        .filter(s =>
          s.nombre?.toLowerCase().includes(q) ||
          s.descripcion?.toLowerCase().includes(q)
        )
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
        .filter(e =>
          e.nombre?.toLowerCase().includes(q) ||
          e.especialidad?.toLowerCase().includes(q)
        )
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
      .filter(a => a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(a => matched.push(a))

    setResults(matched.slice(0, 10))
    setSelectedIdx(0)
  }, [query, localClientes, localServicios, localEmpleados])

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

  const typeIconColors = {
    cliente: { bg: 'bg-blue-50', fg: 'text-blue-500' },
    servicio: { bg: 'bg-violet-50', fg: 'text-violet-500' },
    empleado: { bg: 'bg-emerald-50', fg: 'text-emerald-500' },
    accion: { bg: 'bg-slate-50', fg: 'text-slate-500' },
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
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest" style={{ background: 'var(--ns-accent-bg)', color: 'var(--ns-text-muted)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {!dataLoaded ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ns-border)', borderTopColor: 'var(--ns-primary)' }} />
            </div>
          ) : results.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <svg className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ns-border)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-bold" style={{ color: 'var(--ns-text-muted)' }}>Sin resultados para "{query}"</p>
              <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--ns-text-muted)', opacity: 0.6 }}>Probá con otro término</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const showSeparator = item.type !== lastType
              lastType = item.type
              const colors = typeIconColors[item.type] || typeIconColors.accion
              return (
                <div key={idx}>
                  {showSeparator && query.trim() && (
                    <div className="px-5 pt-3 pb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-primary)' }}>
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
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${colors.bg} ${colors.fg}`}
                      style={idx === selectedIdx ? { boxShadow: 'var(--ns-shadow-sm)' } : {}}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
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
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--ns-border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--ns-text-muted)' }}>
              <kbd className="px-1.5 py-0.5 rounded-lg" style={{ background: 'var(--ns-accent-bg)' }}>↑↓</kbd> Navegar
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--ns-text-muted)' }}>
              <kbd className="px-1.5 py-0.5 rounded-lg" style={{ background: 'var(--ns-accent-bg)' }}>↵</kbd> Seleccionar
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
