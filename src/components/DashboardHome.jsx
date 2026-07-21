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
        <div className="ns-spinner" style={{ borderTopColor: 'var(--ns-primary)', borderColor: 'var(--ns-border)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5" data-testid="dashboard-home">

      {/* ═══════════ HERO / SALUDO — Bento Dark Card ═══════════ */}
      <header
        className="relative overflow-hidden rounded-3xl p-6 md:p-10 border-0"
        style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)', boxShadow: '0 20px 60px rgba(30, 27, 75, 0.15)' }}
        data-testid="home-hero"
      >
        <div
          className="absolute -top-24 -right-20 w-96 h-96 rounded-full blur-[100px] opacity-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #5B3DF5 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full blur-[80px] opacity-15 pointer-events-none"
          style={{ background: '#8B7CF6' }}
        />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: 'rgba(232, 222, 255, 0.15)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {negocio?.logo_url
                ? <img src={negocio.logo_url} alt="logo" className="w-full h-full object-cover" />
                : <span className="text-[#E8DEFF] font-black text-xl">{negocio?.nombre?.charAt(0) || 'N'}</span>}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">{saludo()}</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white mb-1">{negocio?.nombre || 'Tu negocio'}</h1>
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/40">{fechaLarga}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:ml-auto">
            <button
              onClick={() => window.open(publicLink, '_blank')}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white/70 transition-all active:scale-90" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              title="Ver app pública"
              data-testid="home-view-app"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button
              onClick={() => onNavigate?.('ajustes')}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white/70 transition-all active:scale-90" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              title="Ajustes"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 md:w-5 md:h-5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        {/* Banner de Instalación PWA */}
        {showInstallBtn && (
          <div className="mt-4">
            <div className="p-4 md:p-5 rounded-2xl flex items-center justify-between gap-4 border" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white"><path d="M12 18v-6m0 0l-3 3m3-3l3 3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm leading-tight">Instalar App</p>
                  <p className="text-white/50 text-[9px] md:text-[10px] font-medium">Agregá Noni a tu pantalla de inicio.</p>
                </div>
              </div>
              <button
                onClick={handleInstallClick}
                className="px-4 py-2.5 rounded-xl bg-white text-[#5B3DF5] font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all shrink-0"
              >
                Instalar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════ 3 MÉTRICAS CLAVE DEL DÍA — Bento Grid ═══════════ */}
      <div className="grid grid-cols-3 gap-3 md:gap-4" data-testid="home-today-stats">
        <button onClick={() => onNavigate?.('agenda')} className="nh-metric" data-testid="metric-citas">
          <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#5B3DF5' }} />
          <span className="nh-metric-label">{vocab?.turnos || 'Citas'} hoy</span>
          <span className="nh-metric-value" style={{ color: 'var(--ns-text)' }}>{turnosHoy.length}</span>
          <span className="nh-metric-foot" style={{ color: 'var(--ns-primary)' }}>
            {proximos.length} por venir
          </span>
        </button>
        <button onClick={() => onNavigate?.('agenda')} className="nh-metric" data-testid="metric-lugares">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <span className="nh-metric-label">Libres hoy</span>
          <span className="nh-metric-value text-emerald-600">{lugaresCount}</span>
          <span className="nh-metric-foot text-emerald-600">
            Cupos disponibles
          </span>
        </button>
        <div className="nh-metric" data-testid="metric-ingresos">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <span className="nh-metric-label">Ingresos</span>
          <span className="nh-metric-value nh-metric-value--sm text-amber-600 tabular-nums">${ingresosHoy.toLocaleString('es-AR')}</span>
          <span className="nh-metric-foot text-amber-600">
            {atendidos} atendidos
          </span>
        </div>
      </div>

      {/* ═══════════ PRÓXIMA CITA DESTACADA — Bento ═══════════ */}
      {proximaCita && (
        <div className="nh-card nh-next p-5 md:p-6 relative overflow-hidden group" data-testid="home-next-appointment">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-20 h-20 rotate-12 text-[#5B3DF5]"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 md:w-18 md:h-18 rounded-xl flex flex-col items-center justify-center shrink-0 text-white" style={{ background: 'var(--ns-gradient-1)' }}>
              <span className="text-xl md:text-2xl font-black leading-none">{fmtHora(proximaCita.fecha_hora).split(':')[0]}</span>
              <span className="text-[10px] font-bold opacity-80">:{fmtHora(proximaCita.fecha_hora).split(':')[1]}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest animate-pulse" style={{ background: 'var(--ns-primary-bg)', color: 'var(--ns-primary)' }}>Próxima · {countdown}</span>
              </div>
              <p className="text-base md:text-xl font-black truncate leading-tight mb-0.5" style={{ color: 'var(--ns-text)' }}>{proximaCita.cliente_nombre || 'Cliente'}</p>
              <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>
                <span className="truncate">{proximaCita.servicios?.nombre || vocab?.servicio}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-[#EDE9FE]" />
                <span className="truncate">{proximaCita.empleados?.nombre?.split(' ')[0] || vocab?.fallbackStaff || ''}</span>
              </div>
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

      {/* ═══════════ PRÓXIMOS TURNOS — Bento ═══════════ */}
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
          <div className="px-6 py-10 text-center">
            <div className="nh-empty-ic mx-auto mb-3 w-14 h-14 rounded-2xl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="text-[12px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Agenda despejada</h3>
            <p className="text-[11px] mt-2 max-w-[200px] mx-auto leading-relaxed" style={{ color: 'var(--ns-text-muted)' }}>No hay más turnos programados para el resto del día.</p>
            <button onClick={() => { navigator.clipboard?.writeText(publicLink); showToast?.('¡Link copiado!') }} className="mt-4 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all active:scale-95" style={{ background: 'var(--ns-primary)', boxShadow: '0 4px 12px rgba(91, 61, 245, 0.2)' }}>
              Compartir mi link
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--ns-border)' }}>
            {proximos.slice(0, 6).map((t) => {
              const diff = Math.round((new Date(t.fecha_hora) - ahora) / 60000)
              const soon = diff <= 60
              return (
                <div key={t.id} className="nh-row py-3.5" style={{ borderBottom: '1px solid var(--ns-border)' }} data-testid={`home-turno-${t.id}`}>
                  <div className="nh-row-time w-14">
                    <span className="text-[14px] font-black tabular-nums" style={{ color: 'var(--ns-text)' }}>{fmtHora(t.fecha_hora)}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${soon ? 'text-[#F59E0B] animate-pulse' : ''}`} style={{ color: soon ? '#F59E0B' : 'var(--ns-text-muted)' }}>
                      {diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h`}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pl-2">
                    <p className="text-[13px] font-bold truncate mb-0.5" style={{ color: 'var(--ns-text)' }}>{t.cliente_nombre || 'Cliente'}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium truncate" style={{ color: 'var(--ns-text-muted)' }}>
                      <span>{t.servicios?.nombre || vocab?.servicio}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-[#EDE9FE]" />
                      <span>{t.empleados?.nombre?.split(' ')[0] || vocab?.fallbackStaff || ''}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => recordar(t)}
                    className={`nh-wa-btn nh-wa-btn--sm shrink-0 w-9 h-9 rounded-lg ${t.recordatorio_enviado ? 'is-sent' : ''}`}
                    title="Recordar por WhatsApp"
                    data-testid={`home-remind-${t.id}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                  </button>
                </div>
              )
            })}
            {proximos.length > 6 && (
              <button onClick={() => onNavigate?.('agenda')} className="w-full py-3.5 text-[9px] font-black uppercase tracking-[0.15em] hover:opacity-70 transition-all" style={{ color: 'var(--ns-text-muted)' }}>
                +{proximos.length - 6} turnos más
              </button>
            )}
          </div>
        )}
      </section>

      {/* ═══════════ LUGARES DISPONIBLES — Bento ═══════════ */}
      <section className="nh-card overflow-hidden" data-testid="home-available">
        <div className="nh-section-head px-5 py-4" style={{ borderBottom: '1px solid var(--ns-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-emerald-500"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h2 className="nh-section-title text-[11px]">Disponibilidad</h2>
              <p className="nh-section-sub">Cupos libres para hoy</p>
            </div>
          </div>
          {lugares.estado === 'ok' && (
            <span className="nh-count-badge">{lugaresCount} libres</span>
          )}
        </div>

        <div className="p-5">
          {lugares.estado === 'sin-config' && (
            <button onClick={() => onNavigate?.('horarios')} className="w-full py-7 text-center rounded-2xl border border-dashed group hover:opacity-80 transition-all" style={{ borderColor: 'var(--ns-border)', color: 'var(--ns-text-muted)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest">Configurá tus horarios →</p>
            </button>
          )}
          {lugares.estado === 'cerrado' && (
            <div className="py-7 text-center rounded-2xl" style={{ color: 'var(--ns-text-muted)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest">Negocio cerrado hoy</p>
            </div>
          )}
          {lugares.estado === 'lleno' && (
            <div className="py-7 text-center rounded-2xl" style={{ color: 'var(--ns-text-muted)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest">Sin cupos disponibles</p>
            </div>
          )}
          {lugares.estado === 'ok' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {lugares.slots.slice(0, 11).map(({ time, emps }) => (
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
              {lugaresCount > 11 && (
                <button
                  onClick={() => onNavigate?.('agenda')}
                  className="py-3 rounded-2xl flex items-center justify-center border transition-all active:scale-95" style={{ background: 'var(--ns-primary-bg)', borderColor: 'var(--ns-border-hover)' }}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-primary)' }}>+{lugaresCount - 11} más</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ ACCIONES RÁPIDAS — Bento Grid ═══════════ */}
      <div className="grid grid-cols-4 gap-3 md:gap-4" data-testid="home-quick-actions">
        {[
          { label: vocab?.nuevaCita || 'Nueva cita', icon: 'M12 4v16m8-8H4', action: () => onNavigate?.('agenda') },
          { label: 'Compartir', icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', action: () => { const wa = encodeURIComponent(`${vocab?.shareWA || 'Reservá en'} ${negocio?.nombre}: ${publicLink}`); window.open(`https://wa.me/?text=${wa}`, '_blank') } },
          { label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', action: () => onNavigate?.('clientes') },
          { label: 'Reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', action: () => onNavigate?.('reportes') },
        ].map((a, i) => (
          <button key={i} onClick={a.action} className="nh-action" data-testid={`quick-action-${i}`}>
            <div className="nh-action-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 md:w-6 md:h-6"><path d={a.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span className="nh-action-label">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ PULSO SEMANAL — Bento ═══════════ */}
      <section className="nh-card p-5 md:p-8" data-testid="home-weekly-pulse">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="nh-section-title text-[11px]">Pulso semanal</h2>
            <p className="nh-section-sub">{stats.semana || 0} {vocab?.turnos || 'turnos'} · {clientesCount} clientes</p>
          </div>
          <div className="text-right">
            <p className="text-2xl md:text-3xl font-black tabular-nums" style={{ color: 'var(--ns-text)' }}>{stats.tasaOcupacion || 0}%</p>
            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Ocupación</p>
          </div>
        </div>
        <div className="flex items-end justify-between h-28 md:h-32 gap-3 md:gap-5">
          {distribucionSemanal.map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 md:gap-3">
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-lg transition-all duration-1000 ease-out"
                  style={{
                    height: `${Math.max((val / maxSem) * 100, 5)}%`,
                    background: idx === hoyIdx ? 'var(--ns-primary)' : 'var(--ns-primary-bg)',
                    boxShadow: idx === hoyIdx ? '0 0 20px rgba(91, 61, 245, 0.15)' : 'none',
                  }}
                />
              </div>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest" style={{ color: idx === hoyIdx ? 'var(--ns-primary)' : 'var(--ns-text-muted)' }}>
                {DIAS_LABEL[idx]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
