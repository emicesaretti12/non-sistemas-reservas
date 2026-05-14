import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * GLOBAL SEARCH (Cmd+K) — Omnibar de búsqueda rápida para el Dashboard.
 * Busca en: clientes, servicios, empleados, turnos, acciones.
 */
export default function GlobalSearch({ negocio, session, onNavigate, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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

    const q = query.toLowerCase()
    const filtered = ACCIONES.filter(a =>
      a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
    )
    setResults(filtered.slice(0, 8))
    setSelectedIdx(0)
  }, [query])

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

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
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
            placeholder="Buscar acción, cliente, servicio..."
            className="flex-1 outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-400">Sin resultados para "{query}"</p>
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={idx}
                className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors ${
                  idx === selectedIdx ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                }`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIdx(idx)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  idx === selectedIdx ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                } transition-colors`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d={item.icon} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{item.label}</p>
                  <p className="text-[10px] font-medium text-slate-400 truncate">{item.desc}</p>
                </div>
                {idx === selectedIdx && (
                  <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0">ENTER</kbd>
                )}
              </button>
            ))
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
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Non Sistemas</span>
        </div>
      </div>
    </div>
  )
}
