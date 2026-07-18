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
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)

  // Lógica de instalación PWA
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

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
        className="nh-hero relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-black/40"
        data-testid="home-hero"
      >
        <div
          className="absolute -top-24 -right-20 w-96 h-96 rounded-full blur-[100px] opacity-50 pointer-events-none animate-pulse"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full blur-[80px] opacity-20 pointer-events-none"
          style={{ background: accent }}
        />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          <div className="flex items-center gap-5">
            <div className="nh-logo shrink-0 ring-4 ring-white/5 scale-110" style={{ boxShadow: `0 20px 40px -12px ${accent}66` }}>
              {negocio?.logo_url
                ? <img src={negocio.logo_url} alt="logo" className="w-full h-full object-cover" />
                : <span className="nh-logo-letter" style={{ color: accent }}>{negocio?.nombre?.charAt(0) || 'N'}</span>}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="nh-live-dot nh-live-dot--green" />
                <span className="nh-eyebrow text-white/60 tracking-[0.3em]">{saludo()}</span>
              </div>
              <h1 className="nh-title text-3xl md:text-5xl tracking-tight mb-1">{negocio?.nombre || 'Tu negocio'}</h1>
              <p className="nh-date text-indigo-300/60 font-bold tracking-widest uppercase text-[10px] md:text-xs">{fechaLarga}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:ml-auto">
            <button
              onClick={() => window.open(publicLink, '_blank')}
              className="nh-icon-btn shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 border-white/10 hover:bg-white/20 transition-all active:scale-90"
              title="Ver app pública"
              data-testid="home-view-app"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 md:w-6 md:h-6"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button
              onClick={() => onNavigate?.('ajustes')}
              className="nh-icon-btn shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 border-white/10 hover:bg-white/20 transition-all active:scale-90"
              title="Ajustes"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 md:w-6 md:h-6"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        {/* Banner de Instalación PWA */}
        {showInstallBtn && (
          <div className="mt-4 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-indigo-500/20 flex items-center justify-between gap-4 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-white"><path d="M12 18v-6m0 0l-3 3m3-3l3 3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm md:text-base leading-tight">Instalar App</p>
                  <p className="text-white/70 text-[10px] md:text-xs font-medium">Agregá Noni a tu pantalla de inicio para acceso rápido.</p>
                </div>
              </div>
              <button
                onClick={handleInstallClick}
                className="px-5 py-3 rounded-xl bg-white text-indigo-600 font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all shrink-0"
              >
                Instalar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════ 3 MÉTRICAS CLAVE DEL DÍA ═══════════ */}
      <div className="grid grid-cols-3 gap-3 md:gap-5" data-testid="home-today-stats">
        <button onClick={() => onNavigate?.('agenda')} className="nh-metric group relative overflow-hidden" data-testid="metric-citas">
          <div className="absolute top-0 left-0 w-1 h-full" style={{ background: accent }} />
          <span className="nh-metric-label">{vocab?.turnos || 'Citas'} hoy</span>
          <span className="nh-metric-value text-4xl md:text-5xl">{turnosHoy.length}</span>
          <span className="nh-metric-foot font-black uppercase tracking-widest text-[8px] md:text-[9px]" style={{ color: accent }}>
            {proximos.length} por venir
          </span>
        </button>
        <button onClick={() => onNavigate?.('agenda')} className="nh-metric group relative overflow-hidden" data-testid="metric-lugares">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <span className="nh-metric-label">Libres hoy</span>
          <span className="nh-metric-value text-4xl md:text-5xl text-emerald-400">{lugaresCount}</span>
          <span className="nh-metric-foot font-black uppercase tracking-widest text-[8px] md:text-[9px] text-emerald-500/80">
            Cupos disponibles
          </span>
        </button>
        <div className="nh-metric group relative overflow-hidden" data-testid="metric-ingresos">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <span className="nh-metric-label">Ingresos</span>
          <span className="nh-metric-value text-2xl md:text-4xl text-amber-400 tabular-nums">${ingresosHoy.toLocaleString('es-AR')}</span>
          <span className="nh-metric-foot font-black uppercase tracking-widest text-[8px] md:text-[9px] text-amber-500/80">
            {atendidos} atendidos
          </span>
        </div>
      </div>

      {/* ═══════════ PRÓXIMA CITA DESTACADA ═══════════ */}
      {proximaCita && (
        <div className="nh-card nh-next p-5 md:p-7 relative overflow-hidden group border-white/10" data-testid="home-next-appointment">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-24 h-24 rotate-12"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="nh-next-time w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl shadow-lg shadow-black/20" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}>
              <span className="text-xl md:text-2xl font-black leading-none">{fmtHora(proximaCita.fecha_hora).split(':')[0]}</span>
              <span className="text-xs md:text-sm font-bold opacity-80">:{fmtHora(proximaCita.fecha_hora).split(':')[1]}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse" style={{ background: `${accent}22`, color: accent }}>Próxima · {countdown}</span>
              </div>
              <p className="text-lg md:text-2xl font-black text-white truncate leading-tight mb-1">{proximaCita.cliente_nombre || 'Cliente'}</p>
              <div className="flex items-center gap-2 text-white/50 text-[11px] md:text-sm font-medium">
                <span className="truncate">{proximaCita.servicios?.nombre || vocab?.servicio}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="truncate">{proximaCita.empleados?.nombre?.split(' ')[0] || vocab?.fallbackStaff || ''}</span>
              </div>
            </div>
            
            <button
              onClick={() => recordar(proximaCita)}
              className={`nh-wa-btn shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl border-2 ${proximaCita.recordatorio_enviado ? 'is-sent bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'}`}
              title={proximaCita.recordatorio_enviado ? 'Recordatorio enviado' : 'Recordar por WhatsApp'}
              data-testid="home-remind-next"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-8 md:h-8"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
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
          <div className="px-6 py-12 text-center bg-white/[0.01]">
            <div className="nh-empty-ic mx-auto mb-4 w-16 h-16 bg-white/5 border border-white/10 rounded-2xl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-white/20"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Agenda despejada</h3>
            <p className="text-[11px] text-white/40 mt-2 max-w-[200px] mx-auto leading-relaxed">No hay más turnos programados para el resto del día.</p>
            <button onClick={() => { navigator.clipboard?.writeText(publicLink); showToast?.('¡Link copiado!') }} className="mt-5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-indigo-500/20" style={{ background: accent }}>
              Compartir mi link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5 bg-white/[0.01]">
            {proximos.slice(0, 6).map((t) => {
              const diff = Math.round((new Date(t.fecha_hora) - ahora) / 60000)
              const soon = diff <= 60
              return (
                <div key={t.id} className="nh-row py-4 hover:bg-white/[0.03] transition-colors" data-testid={`home-turno-${t.id}`}>
                  <div className="nh-row-time w-14">
                    <span className="text-[15px] font-black text-white tabular-nums">{fmtHora(t.fecha_hora)}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${soon ? 'text-amber-400 animate-pulse' : 'text-white/30'}`}>
                      {diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h`}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pl-2">
                    <p className="text-[14px] font-bold text-white truncate mb-0.5">{t.cliente_nombre || 'Cliente'}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/40 font-medium truncate">
                      <span>{t.servicios?.nombre || vocab?.servicio}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                      <span>{t.empleados?.nombre?.split(' ')[0] || vocab?.fallbackStaff || ''}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => recordar(t)}
                    className={`nh-wa-btn nh-wa-btn--sm shrink-0 w-10 h-10 rounded-xl border ${t.recordatorio_enviado ? 'is-sent bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-emerald-400/60 hover:text-emerald-400 hover:border-emerald-500/20'}`}
                    title="Recordar por WhatsApp"
                    data-testid={`home-remind-${t.id}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                  </button>
                </div>
              )
            })}
            {proximos.length > 6 && (
              <button onClick={() => onNavigate?.('agenda')} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/60 hover:bg-white/[0.02] transition-all">
                +{proximos.length - 6} turnos más
              </button>
            )}
          </div>
        )}
      </section>

      {/* ═══════════ LUGARES DISPONIBLES ═══════════ */}
      <section className="nh-card overflow-hidden border-white/5" data-testid="home-available">
        <div className="nh-section-head px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-emerald-400"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h2 className="nh-section-title text-sm font-black uppercase tracking-widest text-white">Disponibilidad</h2>
              <p className="nh-section-sub text-[11px] font-medium text-white/40">Cupos libres para hoy</p>
            </div>
          </div>
          {lugares.estado === 'ok' && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-sm">
              {lugaresCount} libres
            </span>
          )}
        </div>

        <div className="p-6 md:p-8">
          {lugares.estado === 'sin-config' && (
            <button onClick={() => onNavigate?.('horarios')} className="w-full py-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/10 group hover:border-white/20 transition-all">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest group-hover:text-white/50">Configurá tus horarios para ver disponibilidad →</p>
            </button>
          )}
          {lugares.estado === 'cerrado' && (
            <div className="py-8 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/10">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Negocio cerrado hoy</p>
            </div>
          )}
          {lugares.estado === 'lleno' && (
            <div className="py-8 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/10">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Sin cupos disponibles</p>
            </div>
          )}
          {lugares.estado === 'ok' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {lugares.slots.slice(0, 11).map(({ time, emps }) => (
                <button
                  key={time}
                  onClick={() => onNavigate?.('agenda')}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 text-center hover:bg-white/10 hover:border-white/20 hover:scale-105 transition-all active:scale-90 shadow-sm group"
                  data-testid={`available-slot-${time}`}
                >
                  <span className="block text-[15px] font-black text-white mb-0.5">{time}</span>
                  <span className="block text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/50">{emps.length} {emps.length === 1 ? 'libre' : 'libres'}</span>
                </button>
              ))}
              {lugaresCount > 11 && (
                <button
                  onClick={() => onNavigate?.('agenda')}
                  className="py-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center hover:bg-indigo-500/20 transition-all active:scale-90"
                >
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">+{lugaresCount - 11} más</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ ACCIONES RÁPIDAS ═══════════ */}
      <div className="grid grid-cols-4 gap-3 md:gap-5" data-testid="home-quick-actions">
        {[
          { label: vocab?.nuevaCita || 'Nueva cita', icon: 'M12 4v16m8-8H4', action: () => onNavigate?.('agenda'), color: 'bg-indigo-500' },
          { label: 'Compartir', icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', action: () => { const wa = encodeURIComponent(`${vocab?.shareWA || 'Reservá en'} ${negocio?.nombre}: ${publicLink}`); window.open(`https://wa.me/?text=${wa}`, '_blank') }, color: 'bg-emerald-500' },
          { label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', action: () => onNavigate?.('clientes'), color: 'bg-amber-500' },
          { label: 'Reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', action: () => onNavigate?.('reportes'), color: 'bg-rose-500' },
        ].map((a, i) => (
          <button key={i} onClick={a.action} className="flex flex-col items-center gap-3 group active:scale-90 transition-all" data-testid={`quick-action-${i}`}>
            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl ${a.color} shadow-lg shadow-black/20 flex items-center justify-center text-white border border-white/20 group-hover:scale-110 transition-transform`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 md:w-7 md:h-7"><path d={a.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ PULSO SEMANAL ═══════════ */}
      <section className="nh-card p-6 md:p-10 border-white/5" data-testid="home-weekly-pulse">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="nh-section-title text-sm font-black uppercase tracking-widest text-white">Pulso semanal</h2>
            <p className="nh-section-sub text-[11px] font-medium text-white/40">{stats.semana || 0} {vocab?.turnos || 'turnos'} · {clientesCount} clientes</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-white tabular-nums">{stats.tasaOcupacion || 0}%</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Ocupación</p>
          </div>
        </div>
        <div className="flex items-end justify-between h-32 gap-3 md:gap-5">
          {distribucionSemanal.map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t-xl transition-all duration-1000 ease-out ${idx === hoyIdx ? 'shadow-[0_0_30px_rgba(108,92,231,0.4)]' : 'opacity-40'}`}
                  style={{
                    height: `${Math.max((val / maxSem) * 100, 5)}%`,
                    background: idx === hoyIdx ? accent : 'rgba(255,255,255,0.1)',
                  }}
                />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${idx === hoyIdx ? 'text-white' : 'text-white/20'}`}>
                {DIAS_LABEL[idx]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
