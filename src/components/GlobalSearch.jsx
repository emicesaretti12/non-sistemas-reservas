import { useState, useEffect, useRef } from 'react'

/**
 * GLOBAL SEARCH (Cmd+K) — Omnibar de búsqueda con datos reales.
 * Busca en: clientes, servicios, empleados, turnos recientes + acciones de navegación.
 */
export default function GlobalSearch({ negocio, session, onNavigate, onClose, clientes = [], servicios = [], empleados = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Cerrar con Escape o click fuera
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Acciones estáticas siempre disponibles
  const ACCIONES = [
    { type: 'accion', label: 'Nueva Reserva', desc: 'Agendar un turno manual', icon: 'M12 4v16m8-8H4', tab: 'agenda' },
    { type: 'accion', label: 'Agregar Servicio', desc: 'Crear un nuevo servicio', icon: 'M12 4v16m8-8H4', tab: 'servicios' },
    { type: 'accion', label: 'Agregar Empleado', desc: 'Registrar staff', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', tab: 'equipo' },
    { type: 'accion', label: 'Ver Reportes', desc: 'Análisis de rendimiento', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z', tab: 'reportes' },
    { type: 'accion', label: 'Configurar Horarios', desc: 'Días y horas de atención', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', tab: 'horarios' },
    { type: 'accion', label: 'Ajustes del Negocio', desc: 'Marca, contacto, link público', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35', tab: 'ajustes' },
    { type: 'accion', label: 'Ver Inventario', desc: 'Control de stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', tab: 'inventario' },
    { type: 'accion', label: 'Base de Clientes', desc: 'CRM automático', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857', tab: 'clientes' },
    { type: 'accion', label: 'Copiar Link Público', desc: 'Copiar link de reservas', icon: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1', tab: '__copylink' },
    { type: 'accion', label: 'Cerrar Sesión', desc: 'Salir de la plataforma', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', tab: '__logout' },
  ]

  useEffect(() => {
    if (!query.trim()) {
      setResults(ACCIONES.slice(0, 6))
      setSelectedIdx(0)
      return
    }

    const q = query.toLowerCase().trim()
    const matched = []

    // Buscar en clientes reales
    if (clientes.length > 0) {
      const clienteResults = clientes
        .filter(c =>
          c.nombre?.toLowerCase().includes(q) ||
          c.telefono?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
        )
        .slice(0, 4)
        .map(c => ({
          type: 'cliente',
          label: c.nombre,
          desc: `${c.telefono || 'Sin teléfono'} · ${c.visitas} visitas · ${c.frecuencia}`,
          icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
          tab: 'clientes',
          data: c,
        }))
      matched.push(...clienteResults)
    }

    // Buscar en servicios reales
    if (servicios.length > 0) {
      const servicioResults = servicios
        .filter(s =>
          s.nombre?.toLowerCase().includes(q) ||
          s.descripcion?.toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map(s => ({
          type: 'servicio',
          label: s.nombre,
          desc: `$${s.precio?.toLocaleString() || 0} · ${s.duracion_minutos || 0} min`,
          icon: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
          tab: 'servicios',
          data: s,
        }))
      matched.push(...servicioResults)
    }

    // Buscar en empleados reales
    if (empleados.length > 0) {
      const empResults = empleados
        .filter(e =>
          e.nombre?.toLowerCase().includes(q) ||
          e.especialidad?.toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map(e => ({
          type: 'empleado',
          label: e.nombre,
          desc: e.especialidad || 'Staff',
          icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
          tab: 'equipo',
          data: e,
        }))
      matched.push(...empResults)
    }

    // Buscar en acciones
    const accionResults = ACCIONES.filter(a =>
      a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
    ).slice(0, 4)
    matched.push(...accionResults)

    setResults(matched.slice(0, 10))
    setSelectedIdx(0)
  }, [query, clientes, servicios, empleados])

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

  const handleSelect = (item) => {
    if (item.tab === '__copylink') {
      const slug = negocio?.nombre?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ''
      const link = `${window.location.origin}/app/${slug}/${negocio?.id || ''}`
      navigator.clipboard.writeText(link)
      onClose()
      return
    }
    if (item.tab === '__logout') {
      import('../supabaseClient').then(({ supabase }) => supabase.auth.signOut())
      onClose()
      return
    }
    onNavigate(item.tab)
    onClose()
  }

  // Agrupar resultados por tipo
  const typeLabels = {
    cliente: '👤 Clientes',
    servicio: '✂️ Servicios',
    empleado: '👥 Equipo',
    accion: '⚡ Acciones',
  }

  const typeBadgeColors = {
    cliente: 'bg-blue-100 text-blue-600',
    servicio: 'bg-purple-100 text-purple-600',
    empleado: 'bg-emerald-100 text-emerald-600',
    accion: 'bg-slate-100 text-slate-600',
  }

  // Detectar cambio de grupo para separadores
  let lastType = null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar cliente, servicio, empleado o acción..."
            className="flex-1 outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-sm font-medium text-slate-400">Sin resultados para "{query}"</p>
              <p className="text-[10px] text-slate-300 mt-1">Probá con otro término de búsqueda</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const showSeparator = item.type !== lastType
              lastType = item.type
              return (
                <div key={idx}>
                  {showSeparator && query.trim() && (
                    <div className="px-5 pt-3 pb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${typeBadgeColors[item.type]?.split(' ')[1] || 'text-slate-400'}`}>
                        {typeLabels[item.type] || item.type}
                      </span>
                    </div>
                  )}
                  <button
                    className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors ${
                      idx === selectedIdx ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                    }`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      idx === selectedIdx ? 'bg-slate-900 text-white' : `${typeBadgeColors[item.type]?.split(' ')[0] || 'bg-slate-100'} ${typeBadgeColors[item.type]?.split(' ')[1] || 'text-slate-500'}`
                    } transition-colors`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d={item.icon} strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.label}</p>
                      <p className="text-[10px] font-medium text-slate-400 truncate">{item.desc}</p>
                    </div>
                    {item.type !== 'accion' && (
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0 ${typeBadgeColors[item.type] || 'bg-slate-100 text-slate-400'}`}>
                        {item.type}
                      </span>
                    )}
                    {idx === selectedIdx && (
                      <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0">ENTER</kbd>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">↑↓</kbd> Navegar
            </span>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">↵</kbd> Seleccionar
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
