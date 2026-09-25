import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { normalizarHorarios, horariosPorDefecto } from '../utils/reservas'
import { useToast } from './Toast'
import { IconRobot } from './NoniIcons'

export default function ConfiguracionHorarios({ negocio, onUpdate }) {
  const toast = useToast()
  const [guardando, setGuardando] = useState(false)
  const [saved, setSaved] = useState(false)

  // Normalizamos: varios negocios tienen el JSON incompleto o en null y al
  // leer `horarios[dia].abierto` la pantalla explotaba.
  const [horarios, setHorarios] = useState(() => normalizarHorarios(negocio?.horarios))

  const diasSemana = [
    { id: 'lunes',     label: 'Lun', full: 'Lunes' },
    { id: 'martes',    label: 'Mar', full: 'Martes' },
    { id: 'miercoles', label: 'Mié', full: 'Miércoles' },
    { id: 'jueves',    label: 'Jue', full: 'Jueves' },
    { id: 'viernes',   label: 'Vie', full: 'Viernes' },
    { id: 'sabado',    label: 'Sáb', full: 'Sábado' },
    { id: 'domingo',   label: 'Dom', full: 'Domingo' }
  ]

  const toggleDia = (diaId) => {
    setHorarios(prev => ({
      ...prev,
      [diaId]: { ...prev[diaId], abierto: !prev[diaId].abierto }
    }))
  }

  const cambiarHora = (diaId, campo, valor) => {
    setHorarios(prev => ({
      ...prev,
      [diaId]: { ...prev[diaId], [campo]: valor }
    }))
  }

  const aMinutos = (hhmm) => {
    const [h, m] = String(hhmm || '').split(':').map(Number)
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
  }

  async function guardarConfiguracion() {
    // Validación: una pausa fuera del horario dejaba la agenda sin turnos y
    // no había ninguna señal de por qué.
    for (const dia of diasSemana) {
      const d = horarios[dia.id]
      if (!d?.abierto) continue
      if (aMinutos(d.inicio) === aMinutos(d.fin)) {
        toast.error(`${dia.full}: la hora de apertura y cierre no pueden ser iguales.`)
        return
      }
      if (d.pausa) {
        const ini = aMinutos(d.inicio), fin = aMinutos(d.fin)
        const pIni = aMinutos(d.inicioPausa), pFin = aMinutos(d.finPausa)
        const nocturno = fin <= ini
        if (pFin <= pIni) {
          toast.error(`${dia.full}: el fin de la pausa tiene que ser posterior al inicio.`)
          return
        }
        if (!nocturno && (pIni < ini || pFin > fin)) {
          toast.error(`${dia.full}: la pausa tiene que estar dentro del horario de atención.`)
          return
        }
      }
    }

    setGuardando(true)
    try {
      const { error } = await supabase
        .from('negocios')
        .update({ horarios })
        .eq('id', negocio.id)

      if (error) throw error

      toast.success('Horarios actualizados. La agenda pública fue modificada.')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      if (onUpdate) onUpdate()
    } catch (error) {
      toast.error('Error al guardar los horarios. Verificá tu conexión.')
      console.error(error.message)
    } finally {
      setGuardando(false)
    }
  }

  const diasAbiertos = Object.values(horarios).filter(d => d.abierto).length

  return (
    <div className="flex flex-col gap-4 ns-tab-content-enter pb-6">

      {/* Título grande y "Guardar" a la derecha */}
      <header className="ns-cabecera ns-cabecera--bloque">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ui-head__title">Horarios</h2>
            <p className="ui-eyebrow mt-1">
              {diasAbiertos} {diasAbiertos === 1 ? 'día abierto' : 'días abiertos'}
            </p>
          </div>

          <button
            onClick={guardarConfiguracion}
            disabled={guardando}
            className="ui-btn ui-btn--primary shrink-0"
            style={saved ? { background: 'var(--ns-success-solid)' } : undefined}
          >
            {guardando ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>Guardado</span>
              </>
            ) : (
              <>
                <span>Guardar</span>
              </>
            )}
          </button>
        </div>

        {/* Mini resumen de días — Pills */}
        <div className="flex gap-1.5 flex-wrap">
          {diasSemana.map(dia => (
            <button
              key={dia.id}
              onClick={() => toggleDia(dia.id)}
              aria-pressed={Boolean(horarios[dia.id]?.abierto)}
              className="min-h-[36px] min-w-[46px] px-3 rounded-full text-[13px] font-semibold active:opacity-60"
              style={{
                background: horarios[dia.id]?.abierto ? 'var(--ns-primary)' : 'var(--ns-paper)',
                color: horarios[dia.id]?.abierto ? 'white' : 'var(--ns-text-muted)',
              }}
            >
              {dia.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── TIP EDUCATIVO ── */}
      {!Object.values(horarios).some(d => d.abierto) && (
        <div className="flex items-start gap-3 p-4 rounded-2xl ns-fade-up" style={{ background: 'var(--ns-primary-bg)', border: '1px solid var(--ns-border)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--ns-primary)', boxShadow: 'var(--ns-shadow-sm)' }}>
            <IconRobot size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold" style={{ color: 'var(--ns-text)' }}>¿Cómo funcionan los horarios?</p>
            <p className="text-[11px] font-medium leading-relaxed mt-0.5" style={{ color: 'var(--ns-text-secondary)' }}>
              Activá los días que abrís y configurá el rango horario. El sistema calcula automáticamente los turnos disponibles según la <strong style={{ color: 'var(--ns-text)' }}>duración de cada servicio</strong>. Usá "Pausa" si cerrás al mediodía.
            </p>
          </div>
        </div>
      )}

      {/* ── LISTA DE DÍAS — Plastilina 3D Cards ── */}
      <div className="space-y-3">
        {diasSemana.map((dia, index) => {
          const dataDia = horarios[dia.id] || horariosPorDefecto()[dia.id]
          const isOpen = dataDia.abierto

          return (
            <div
              key={dia.id}
              className="overflow-hidden transition-all duration-300 ns-stagger-in"
              style={{
                animationDelay: `${index * 0.04}s`,
                borderRadius: 'var(--ns-radius-lg)',
                background: isOpen ? 'var(--ns-surface)' : 'var(--ns-sunken)',
                boxShadow: isOpen ? 'var(--ui-shadow)' : 'var(--ui-field-sm)',
              }}
            >
              {/* Row principal: toggle + nombre + horas */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-5">

                {/* Toggle + Nombre */}
                <div className="flex items-center gap-4 min-w-[160px]">
                  {/* Toggle Plastilina */}
                  <button
                    type="button"
                    onClick={() => toggleDia(dia.id)}
                    className={`ui-switch ${isOpen ? 'is-on' : ''}`}
                    role="switch"
                    aria-checked={isOpen}
                    aria-label={`${isOpen ? 'Cerrar' : 'Abrir'} ${dia.full}`}
                  />

                  <div>
                    <p className="font-bold text-base md:text-lg tracking-tight transition-colors"
                      style={{ color: isOpen ? 'var(--ns-text)' : 'var(--ns-text-muted)' }}>
                      {dia.full}
                    </p>
                    {!isOpen && (
                      <p className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-text-muted)' }}>Cerrado</p>
                    )}
                  </div>
                </div>

                {/* Controles de hora */}
                <div className={`flex flex-col gap-3 flex-1 transition-all duration-400 ${isOpen ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>

                  {/* Horario principal: dos campos que se reparten el ancho. En
                      pantallas de 360 px el segundo quedaba cortado afuera. */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <label className="flex items-center gap-2 min-w-0 px-3 min-h-[44px] rounded-xl transition-all cursor-text"
                      style={{ background: 'var(--ns-accent-bg)', border: '1.5px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-inner)' }}>
                      <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02l.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <input
                        type="time"
                        disabled={!isOpen}
                        value={dataDia.inicio}
                        onChange={(e) => cambiarHora(dia.id, 'inicio', e.target.value)}
                        className="w-full min-w-0 bg-transparent font-bold outline-none text-sm sm:min-w-[80px]"
                        style={{ color: 'var(--ns-text)' }}
                      />
                    </label>

                    <div className="hidden sm:block w-5 h-0.5 rounded-full shrink-0" style={{ background: 'var(--ns-border)' }} />

                    <label className="flex items-center gap-2 min-w-0 px-3 min-h-[44px] rounded-xl transition-all cursor-text"
                      style={{ background: 'var(--ns-accent-bg)', border: '1.5px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-inner)' }}>
                      <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <input
                        type="time"
                        disabled={!isOpen}
                        value={dataDia.fin}
                        onChange={(e) => cambiarHora(dia.id, 'fin', e.target.value)}
                        className="w-full min-w-0 bg-transparent font-bold outline-none text-sm sm:min-w-[80px]"
                        style={{ color: 'var(--ns-text)' }}
                      />
                    </label>
                  </div>

                  {/* Pausa toggle + horas pausa */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                      <div
                        className="w-4 h-4 rounded-md flex items-center justify-center transition-all"
                        style={{
                          background: dataDia.pausa ? 'var(--ns-primary)' : 'white',
                          border: dataDia.pausa ? 'none' : '1.5px solid var(--ns-border)',
                          boxShadow: dataDia.pausa ? 'var(--ns-shadow-sm)' : 'var(--ns-shadow-inner)',
                        }}
                      >
                        {dataDia.pausa && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={dataDia.pausa || false}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setHorarios(prev => ({
                            ...prev,
                            [dia.id]: { ...prev[dia.id], pausa: checked, inicioPausa: prev[dia.id].inicioPausa || '13:00', finPausa: prev[dia.id].finPausa || '17:00' }
                          }))
                        }}
                        className="hidden"
                      />
                      <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ns-text-muted)' }}>Pausa</span>
                    </label>

                    {dataDia.pausa && (
                      <div className="flex items-center gap-2 ns-slide-right">
                        <label className="flex items-center gap-2 px-2.5 min-h-[40px] rounded-xl cursor-text"
                          style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)' }}>
                          <input
                            type="time"
                            value={dataDia.inicioPausa || '13:00'}
                            onChange={(e) => cambiarHora(dia.id, 'inicioPausa', e.target.value)}
                            className="bg-transparent font-bold outline-none text-xs"
                            style={{ color: 'var(--ns-primary-dark)', minWidth: '70px' }}
                          />
                        </label>
                        <div className="w-3 h-0.5 rounded-full" style={{ background: 'rgba(0,122,255,0.3)' }} />
                        <label className="flex items-center gap-2 px-2.5 min-h-[40px] rounded-xl cursor-text"
                          style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)' }}>
                          <input
                            type="time"
                            value={dataDia.finPausa || '17:00'}
                            onChange={(e) => cambiarHora(dia.id, 'finPausa', e.target.value)}
                            className="bg-transparent font-bold outline-none text-xs"
                            style={{ color: 'var(--ns-primary-dark)', minWidth: '70px' }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Indicador de estado — Plastilina Pill */}
                <div className="shrink-0 hidden sm:flex">
                  <span
                    className="px-3 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-[0.06em]"
                    style={{
                      background: isOpen ? 'rgba(0,122,255,0.1)' : 'var(--ns-border)',
                      color: isOpen ? '#93C5FD' : 'var(--ns-text-muted)',
                    }}
                  >
                    {isOpen ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── BOTÓN GUARDAR MOBILE ── */}
      {/* Barra pegada al fondo con velo propio: antes el botón flotaba
          encima de las filas y tapaba el último día. */}
      <div
        className="ns-barra-accion mt-3 z-20 rounded-[26px] p-2"
        style={{
          background: 'var(--ns-paper)',
          boxShadow: 'var(--ui-shadow-lg)',
        }}
      >
        <button
          onClick={guardarConfiguracion}
          disabled={guardando}
          className="ui-btn ui-btn--primary ui-btn--block"
        >
          {guardando ? (
            <span className="ui-spinner ui-spinner--sm" style={{ borderTopColor: 'var(--ns-paper)' }} />
          ) : saved ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ¡Horarios guardados!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Guardar horarios
            </>
          )}
        </button>
      </div>
    </div>
  )
}
