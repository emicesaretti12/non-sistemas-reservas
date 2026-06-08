import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'

/**
 * DashboardHome — Centro de mando oscuro y mobile-first.
 * Muestra de un vistazo: citas de hoy, turnos próximos y lugares disponibles.
 * Pensado para usarse con el dedo (targets grandes, scroll vertical).
 */

const DIAS_MAP = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const fmtHora = (d) => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

export default function DashboardHome({
  negocio,
  vocab,
  colorPrimario = '#6c5ce7',
  onNavigate,
  publicLink,
  showToast,
  clientesCount = 0,
  stats = {},
  distribucionSemanal = [0, 0, 0, 0, 0, 0, 0],
}) {
  const [loading, setLoading] = useState(true)
  const [turnosHoy, setTurnosHoy] = useState([])
  const [servicios, setServicios] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [tick, setTick] = useState(0)

  // Re-render cada minuto para countdowns / "ahora"
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!negocio?.id) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      const hoy = new Date()
      const ini = new Date(hoy); ini.setHours(0, 0, 0, 0)
      const fin = new Date(hoy); fin.setHours(23, 59, 59, 999)

      const [tRes, sRes, eRes] = await Promise.all([
        supabase.from('turnos')
          .select('*, servicios(nombre, precio, duracion_minutos), empleados(nombre, foto_url)')
          .eq('negocio_id', negocio.id)
          .gte('fecha_hora', ini.toISOString())
          .lte('fecha_hora', fin.toISOString())
          .order('fecha_hora', { ascending: true }),
        supabase.from('servicios').select('id, nombre, precio, duracion_minutos').eq('negocio_id', negocio.id),
        supabase.from('empleados').select('id, nombre, estado, foto_url').eq('negocio_id', negocio.id),
      ])

      if (cancel) return
      setTurnosHoy((tRes.data || []).filter((t) => t.estado !== 'cancelado'))
      setServicios(sRes.data || [])
      setEmpleados(eRes.data || [])
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [negocio?.id, tick === -1])

  const ahora = new Date()

  // ── Derivados de citas de hoy ──────────────────────────────────────────────
  const proximos = useMemo(
    () => turnosHoy.filter((t) => new Date(t.fecha_hora) > ahora),
    [turnosHoy, tick]
  )
  const atendidos = turnosHoy.length - proximos.length
  const ingresosHoy = turnosHoy.reduce((a, t) => a + (t.servicios?.precio || 0), 0)
  const proximaCita = proximos[0] || null

  let countdown = ''
  if (proximaCita) {
    const diff = Math.round((new Date(proximaCita.fecha_hora) - ahora) / 60000)
    if (diff <= 0) countdown = 'ahora'
    else if (diff < 60) countdown = `en ${diff} min`
    else countdown = `en ${Math.floor(diff / 60)}h ${diff % 60}m`
  }

  // ── Lugares disponibles hoy (mismo algoritmo que la Agenda) ─────────────────
  const lugares = useMemo(() => {
    const horarios = negocio?.horarios
    if (!horarios) return { estado: 'sin-config', slots: [] }
    const config = horarios[DIAS_MAP[ahora.getDay()]]
    if (!config || !config.abierto) return { estado: 'cerrado', slots: [] }

    const minDur = servicios.length > 0 ? Math.min(...servicios.map((s) => s.duracion_minutos || 30)) : 30
    const parse = (str) => { const [h, m] = String(str).split(':').map(Number); return h * 60 + m }
    const ini = parse(config.inicio)
    const fin = parse(config.fin)
    const pIni = config.pausa ? parse(config.inicioPausa) : null
    const pFin = config.pausa ? parse(config.finPausa) : null
    const nowMin = ahora.getHours() * 60 + ahora.getMinutes()

    const booked = turnosHoy.map((t) => {
      const d = new Date(t.fecha_hora)
      const start = d.getHours() * 60 + d.getMinutes()
      return { start, end: start + (t.servicios?.duracion_minutos || 30), empId: t.empleado_id }
    })

    const empsActivos = empleados.filter((e) => e.estado === 'activo' || !e.estado)
    const free = []
    const pool = empsActivos.length > 0 ? empsActivos : [{ id: null, nombre: vocab?.fallbackStaff || 'Disponible' }]

    pool.forEach((emp) => {
      const eb = booked.filter((b) => b.empId === emp.id)
      for (let slot = ini; slot + minDur <= fin; slot += minDur) {
        if (pIni !== null && slot >= pIni && slot < pFin) continue
        if (slot < nowMin) continue
        const overlap = eb.some((b) => (slot >= b.start && slot < b.end) || (slot + minDur > b.start && slot < b.end))
        if (!overlap) free.push({ timeStr: `${String(Math.floor(slot / 60)).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')}`, emp })
      }
    })

    const byTime = {}
    free.forEach((s) => { (byTime[s.timeStr] = byTime[s.timeStr] || []).push(s.emp) })
    const slots = Object.keys(byTime).sort().map((time) => ({ time, emps: byTime[time] }))
    return { estado: slots.length ? 'ok' : 'lleno', slots }
  }, [negocio?.horarios, servicios, empleados, turnosHoy, tick])

  const lugaresCount = lugares.slots.length

  // ── Recordatorio WhatsApp ───────────────────────────────────────────────────
  async function recordar(t) {
    const num = t.cliente_telefono?.replace(/[^0-9]/g, '') || ''
    const nombre = t.cliente_nombre?.split(' ')[0] || ''
    const serv = t.servicios?.nombre?.toLowerCase() || vocab?.servicio || 'turno'
    const msg = `Hola ${nombre}, te recuerdo tu ${serv} hoy a las ${fmtHora(t.fecha_hora)} hs. ¡Te esperamos!`
    if (num) window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
    await supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
    setTurnosHoy((prev) => prev.map((x) => (x.id === t.id ? { ...x, recordatorio_enviado: true } : x)))
  }

  const accent = colorPrimario || '#6c5ce7'
  const maxSem = Math.max(...distribucionSemanal, 1)
  const hoyIdx = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
  const fechaLarga = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24" data-testid="home-loading">
        <div className="w-7 h-7 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: accent }} />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5" data-testid="dashboard-home">

      {/* ═══════════ HERO / SALUDO ═══════════ */}
      <header
        className="nh-hero relative overflow-hidden rounded-[1.6rem] md:rounded-[2rem] p-5 md:p-7"
        data-testid="home-hero"
      >
        <div
          className="absolute -top-24 -right-20 w-72 h-72 rounded-full blur-[90px] opacity-40 pointer-events-none"
          style={{ background: accent }}
        />
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="nh-logo shrink-0" style={{ boxShadow: `0 10px 30px -8px ${accent}` }}>
            {negocio?.logo_url
              ? <img src={negocio.logo_url} alt="logo" className="w-full h-full object-cover" />
              : <span className="nh-logo-letter" style={{ color: accent }}>{negocio?.nombre?.charAt(0) || 'N'}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="nh-live-dot" />
              <span className="nh-eyebrow">{saludo()}</span>
            </div>
            <h1 className="nh-title truncate">{negocio?.nombre || 'Tu negocio'}</h1>
            <p className="nh-date capitalize">{fechaLarga}</p>
          </div>
          <button
            onClick={() => window.open(publicLink, '_blank')}
            className="nh-icon-btn shrink-0"
            title="Ver app pública"
            data-testid="home-view-app"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </header>

      {/* ═══════════ 3 MÉTRICAS CLAVE DEL DÍA ═══════════ */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-3" data-testid="home-today-stats">
        <button onClick={() => onNavigate?.('agenda')} className="nh-metric" data-testid="metric-citas">
          <span className="nh-metric-label">{vocab?.turnos || 'Citas'} hoy</span>
          <span className="nh-metric-value">{turnosHoy.length}</span>
          <span className="nh-metric-foot" style={{ color: accent }}>
            {proximos.length} por venir
          </span>
        </button>
        <button onClick={() => onNavigate?.('agenda')} className="nh-metric" data-testid="metric-lugares">
          <span className="nh-metric-label">Lugares libres</span>
          <span className="nh-metric-value" style={{ color: '#34d399' }}>{lugaresCount}</span>
          <span className="nh-metric-foot text-emerald-400/80">disponibles hoy</span>
        </button>
        <div className="nh-metric" data-testid="metric-ingresos">
          <span className="nh-metric-label">Ingresos día</span>
          <span className="nh-metric-value nh-metric-value--sm">${ingresosHoy.toLocaleString('es-AR')}</span>
          <span className="nh-metric-foot text-white/40">{atendidos} atendidos</span>
        </div>
      </div>

      {/* ═══════════ PRÓXIMA CITA DESTACADA ═══════════ */}
      {proximaCita && (
        <div className="nh-card nh-next p-4 md:p-5" data-testid="home-next-appointment">
          <div className="flex items-center gap-3.5">
            <div className="nh-next-time" style={{ background: `linear-gradient(150deg, ${accent}, ${accent}aa)` }}>
              <span className="text-lg font-black leading-none">{fmtHora(proximaCita.fecha_hora).split(':')[0]}</span>
              <span className="text-[10px] font-bold opacity-80">:{fmtHora(proximaCita.fecha_hora).split(':')[1]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="nh-pill" style={{ background: `${accent}22`, color: accent }}>Próxima · {countdown}</span>
              </div>
              <p className="text-[15px] font-bold text-white truncate">{proximaCita.cliente_nombre || 'Cliente'}</p>
              <p className="text-[12px] text-white/45 truncate">{proximaCita.servicios?.nombre || vocab?.servicio} · {proximaCita.empleados?.nombre?.split(' ')[0] || vocab?.fallbackStaff || ''}</p>
            </div>
            <button
              onClick={() => recordar(proximaCita)}
              className={`nh-wa-btn shrink-0 ${proximaCita.recordatorio_enviado ? 'is-sent' : ''}`}
              title={proximaCita.recordatorio_enviado ? 'Recordatorio enviado' : 'Recordar por WhatsApp'}
              data-testid="home-remind-next"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ PRÓXIMOS TURNOS ═══════════ */}
      <section className="nh-card overflow-hidden" data-testid="home-upcoming">
        <div className="nh-section-head">
          <div>
            <h2 className="nh-section-title">Próximos turnos</h2>
            <p className="nh-section-sub">{proximos.length} {proximos.length === 1 ? 'pendiente' : 'pendientes'} hoy</p>
          </div>
          <button onClick={() => onNavigate?.('agenda')} className="nh-link" data-testid="home-goto-agenda">
            Ver agenda
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {proximos.length === 0 ? (
          <div className="px-5 py-9 text-center">
            <div className="nh-empty-ic mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="text-[13px] font-semibold text-white/80">No quedan turnos por hoy</p>
            <p className="text-[11px] text-white/40 mt-1">Compartí tu link para recibir reservas 24/7.</p>
            <button onClick={() => { navigator.clipboard?.writeText(publicLink); showToast?.('¡Link copiado!') }} className="nh-mini-cta mt-3" style={{ background: accent }}>
              Copiar mi link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {proximos.slice(0, 6).map((t) => {
              const diff = Math.round((new Date(t.fecha_hora) - ahora) / 60000)
              const soon = diff <= 60
              return (
                <div key={t.id} className="nh-row" data-testid={`home-turno-${t.id}`}>
                  <div className="nh-row-time">
                    <span className="text-[14px] font-black text-white tabular-nums">{fmtHora(t.fecha_hora)}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${soon ? 'text-amber-400' : 'text-white/35'}`}>
                      {diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h`}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{t.cliente_nombre || 'Cliente'}</p>
                    <p className="text-[11px] text-white/40 truncate">{t.servicios?.nombre || vocab?.servicio} · {t.empleados?.nombre?.split(' ')[0] || vocab?.fallbackStaff || ''}</p>
                  </div>
                  <button
                    onClick={() => recordar(t)}
                    className={`nh-wa-btn nh-wa-btn--sm shrink-0 ${t.recordatorio_enviado ? 'is-sent' : ''}`}
                    title="Recordar por WhatsApp"
                    data-testid={`home-remind-${t.id}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                  </button>
                </div>
              )
            })}
            {proximos.length > 6 && (
              <button onClick={() => onNavigate?.('agenda')} className="w-full py-3 text-[11px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors">
                +{proximos.length - 6} turnos más
              </button>
            )}
          </div>
        )}
      </section>

      {/* ═══════════ LUGARES DISPONIBLES ═══════════ */}
      <section className="nh-card overflow-hidden" data-testid="home-available">
        <div className="nh-section-head">
          <div className="flex items-center gap-2">
            <span className="nh-live-dot nh-live-dot--green" />
            <div>
              <h2 className="nh-section-title">Lugares disponibles</h2>
              <p className="nh-section-sub">Tocá un horario para agendar</p>
            </div>
          </div>
          {lugares.estado === 'ok' && (
            <span className="nh-count-badge">{lugaresCount}</span>
          )}
        </div>

        <div className="px-4 pb-4 md:px-5 md:pb-5">
          {lugares.estado === 'sin-config' && (
            <button onClick={() => onNavigate?.('horarios')} className="nh-notice" data-testid="available-config">
              Configurá tus horarios para ver lugares libres →
            </button>
          )}
          {lugares.estado === 'cerrado' && (
            <p className="nh-notice nh-notice--static">Hoy no tenés horario de atención.</p>
          )}
          {lugares.estado === 'lleno' && (
            <p className="nh-notice nh-notice--static">¡Agenda completa! No quedan lugares por hoy.</p>
          )}
          {lugares.estado === 'ok' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {lugares.slots.slice(0, 12).map(({ time, emps }) => (
                <button
                  key={time}
                  onClick={() => onNavigate?.('agenda')}
                  className="nh-slot"
                  data-testid={`available-slot-${time}`}
                >
                  <span className="nh-slot-time">{time}</span>
                  <span className="nh-slot-sub">{emps.length} {emps.length === 1 ? 'libre' : 'libres'}</span>
                </button>
              ))}
            </div>
          )}
          {lugares.estado === 'ok' && lugaresCount > 12 && (
            <p className="text-[11px] text-white/35 font-medium text-center mt-3">+{lugaresCount - 12} horarios más disponibles</p>
          )}
        </div>
      </section>

      {/* ═══════════ ACCIONES RÁPIDAS ═══════════ */}
      <div className="grid grid-cols-4 gap-2.5" data-testid="home-quick-actions">
        {[
          { label: vocab?.nuevaCita || 'Nueva cita', icon: 'M12 4v16m8-8H4', action: () => onNavigate?.('agenda') },
          { label: 'Compartir', icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', action: () => { const wa = encodeURIComponent(`${vocab?.shareWA || 'Reservá en'} ${negocio?.nombre}: ${publicLink}`); window.open(`https://wa.me/?text=${wa}`, '_blank') } },
          { label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', action: () => onNavigate?.('clientes') },
          { label: 'Reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', action: () => onNavigate?.('reportes') },
        ].map((a, i) => (
          <button key={i} onClick={a.action} className="nh-action" data-testid={`quick-action-${i}`}>
            <span className="nh-action-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><path d={a.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="nh-action-label">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ PULSO SEMANAL ═══════════ */}
      <section className="nh-card p-5" data-testid="home-week">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="nh-section-title">Pulso de la semana</h2>
            <p className="nh-section-sub">{stats.semana || 0} {vocab?.turnos || 'turnos'} · {clientesCount} clientes</p>
          </div>
          <span className="text-[11px] font-bold tabular-nums text-white/50">{stats.tasaOcupacion || 0}% ocup.</span>
        </div>
        <div className="flex items-end gap-2 h-24">
          {distribucionSemanal.map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold text-white/40 tabular-nums">{val}</span>
              <div className="w-full rounded-md transition-all duration-700" style={{
                height: `${Math.max(6, (val / maxSem) * 100)}%`,
                background: idx === hoyIdx ? accent : 'rgba(255,255,255,0.10)',
              }} />
              <span className={`text-[9px] font-bold uppercase ${idx === hoyIdx ? 'text-white' : 'text-white/30'}`}>{DIAS_LABEL[idx]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
