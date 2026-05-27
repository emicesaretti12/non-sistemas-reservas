/**
 * AutoReminders — Recordatorios pendientes de WhatsApp
 * Muestra turnos próximos que necesitan recordatorio y permite
 * enviarlos individualmente o en lote.
 */
export default function AutoReminders({
  pendientes = [],
  loading = false,
  enviando = false,
  enviarRecordatorio,
  enviarTodos,
  count = 0,
  vocab = {}
}) {
  // ── Helpers ──
  const formatearHora = (fechaStr) => {
    if (!fechaStr) return ''
    return new Date(fechaStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const esDiaLabel = (fechaStr) => {
    if (!fechaStr) return null
    const fecha = new Date(fechaStr)
    const ahora = new Date()
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    const fechaDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    if (fechaDia.getTime() === hoy.getTime()) return 'HOY'
    if (fechaDia.getTime() === manana.getTime()) return 'MAÑANA'
    return null
  }

  // ── Estado vacío compacto ──
  if (!loading && count === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in duration-500">
        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[11px] font-bold text-emerald-700">Todos los recordatorios al día</span>
        <span className="text-xs">✨</span>
      </div>
    )
  }

  // ── Estado de carga ──
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-[1.5rem] border border-amber-100/80 shadow-sm p-5 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-[11px] font-bold text-amber-700">Cargando recordatorios...</span>
        </div>
      </div>
    )
  }

  // ── Card principal ──
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-[1.5rem] border border-amber-100/80 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-sm font-black text-amber-900 tracking-tight">Recordatorios Pendientes</h3>
        </div>
        {count > 0 && (
          <span className="bg-amber-500 text-white rounded-full text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1.5">
            {count}
          </span>
        )}
      </div>

      {/* Enviando — Progress indicator */}
      {enviando && (
        <div className="mx-5 mb-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
            <div className="w-3.5 h-3.5 border-2 border-green-200 border-t-green-500 rounded-full animate-spin shrink-0" />
            <span className="text-[10px] font-bold text-green-700">Enviando recordatorios...</span>
          </div>
        </div>
      )}

      {/* Lista de pendientes */}
      <div className="px-5 pb-3 space-y-1">
        {pendientes.map((turno, idx) => {
          const hora = formatearHora(turno.fecha_hora)
          const diaLabel = esDiaLabel(turno.fecha_hora)

          return (
            <div
              key={turno.id || idx}
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-amber-100/50 transition-colors"
            >
              {/* Info del turno */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="text-xs font-black text-amber-800 shrink-0">{hora}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-amber-900 truncate">{turno.cliente_nombre}</p>
                  <p className="text-[9px] text-amber-600 truncate">{turno.servicios?.nombre || vocab?.servicio || 'Servicio'}</p>
                </div>
                {diaLabel && (
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                    diaLabel === 'HOY'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {diaLabel}
                  </span>
                )}
              </div>

              {/* Botón WhatsApp individual */}
              <button
                onClick={() => enviarRecordatorio?.(turno)}
                disabled={enviando}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-green-600 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                Recordar
              </button>
            </div>
          )
        })}
      </div>

      {/* Botón enviar todos */}
      {pendientes.length > 1 && (
        <div className="px-5 pb-5">
          <button
            onClick={() => enviarTodos?.()}
            disabled={enviando}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                Enviar todos ({count})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
