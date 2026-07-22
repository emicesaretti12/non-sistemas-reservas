import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import { IconRobot } from './NoniIcons'

export default function ConfiguracionHorarios({ negocio, onUpdate }) {
  const toast = useToast()
  const [guardando, setGuardando] = useState(false)
  const [saved, setSaved] = useState(false)

  const defaultHorarios = {
    lunes:     { abierto: true,  inicio: '08:00', fin: '21:00', pausa: true,  inicioPausa: '13:00', finPausa: '17:00' },
    martes:    { abierto: true,  inicio: '08:00', fin: '21:00', pausa: true,  inicioPausa: '13:00', finPausa: '17:00' },
    miercoles: { abierto: true,  inicio: '08:00', fin: '21:00', pausa: true,  inicioPausa: '13:00', finPausa: '17:00' },
    jueves:    { abierto: true,  inicio: '08:00', fin: '21:00', pausa: true,  inicioPausa: '13:00', finPausa: '17:00' },
    viernes:   { abierto: true,  inicio: '08:00', fin: '21:00', pausa: true,  inicioPausa: '13:00', finPausa: '17:00' },
    sabado:    { abierto: false, inicio: '10:00', fin: '14:00', pausa: false, inicioPausa: '13:00', finPausa: '17:00' },
    domingo:   { abierto: false, inicio: '00:00', fin: '00:00', pausa: false, inicioPausa: '13:00', finPausa: '17:00' }
  }

  const [horarios, setHorarios] = useState(negocio?.horarios || defaultHorarios)

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

  async function guardarConfiguracion() {
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

      {/* ── HEADER BENTO PLASTILINA ── */}
      <header className="ns-section-header">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--ns-gradient-1)', boxShadow: 'var(--ns-plastilina-btn)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--ns-primary)' }}>Disponibilidad</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-none" style={{ color: 'var(--ns-text)' }}>Horarios</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--ns-text-muted)' }}>
              {diasAbiertos} {diasAbiertos === 1 ? 'día abierto' : 'días abiertos'}
            </p>
          </div>

          {/* Botón Guardar — Plastilina */}
          <button
            onClick={guardarConfiguracion}
            disabled={guardando}
            className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 relative overflow-hidden"
            style={{
              background: saved ? 'var(--ns-success)' : 'var(--ns-primary)',
              boxShadow: saved ? '0 4px 16px rgba(16,185,129,0.35)' : 'var(--ns-plastilina-btn)'
            }}
          >
            {/* Shine overlay */}
            <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 100%)' }} />
            {guardando ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="hidden sm:inline">Guardado</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="hidden sm:inline">Guardar</span>
              </>
            )}
          </button>
        </div>

        {/* Mini resumen de días — Pills */}
        <div className="flex gap-1.5 mt-4 flex-wrap relative z-10">
          {diasSemana.map(dia => (
            <button
              key={dia.id}
              onClick={() => toggleDia(dia.id)}
              className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-90"
              style={{
                background: horarios[dia.id]?.abierto ? 'var(--ns-primary)' : 'rgba(255,255,255,0.6)',
                color: horarios[dia.id]?.abierto ? 'white' : 'var(--ns-text-muted)',
                border: horarios[dia.id]?.abierto ? 'none' : '1px solid var(--ns-border)',
                boxShadow: horarios[dia.id]?.abierto ? 'var(--ns-plastilina-btn)' : 'var(--ns-shadow-sm)'
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
            <p className="text-[11px] font-black" style={{ color: 'var(--ns-text)' }}>¿Cómo funcionan los horarios?</p>
            <p className="text-[11px] font-medium leading-relaxed mt-0.5" style={{ color: 'var(--ns-text-secondary)' }}>
              Activá los días que abrís y configurá el rango horario. El sistema calcula automáticamente los turnos disponibles según la <strong style={{ color: 'var(--ns-text)' }}>duración de cada servicio</strong>. Usá "Pausa" si cerrás al mediodía.
            </p>
          </div>
        </div>
      )}

      {/* ── LISTA DE DÍAS — Plastilina 3D Cards ── */}
      <div className="space-y-3">
        {diasSemana.map((dia, index) => {
          const dataDia = horarios[dia.id]
          const isOpen = dataDia.abierto

          return (
            <div
              key={dia.id}
              className="rounded-2xl overflow-hidden transition-all duration-300 ns-stagger-in"
              style={{
                animationDelay: `${index * 0.04}s`,
                background: 'white',
                border: `1px solid ${isOpen ? 'var(--ns-border-hover)' : 'var(--ns-border)'}`,
                boxShadow: isOpen ? 'var(--ns-plastilina-card)' : 'var(--ns-shadow-sm)',
              }}
            >
              {/* Row principal: toggle + nombre + horas */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-5">

                {/* Toggle + Nombre */}
                <div className="flex items-center gap-4 min-w-[160px]">
                  {/* Toggle Plastilina */}
                  <button
                    onClick={() => toggleDia(dia.id)}
                    className="relative shrink-0 transition-all duration-400 active:scale-90"
                    style={{
                      width: '52px',
                      height: '28px',
                      borderRadius: '999px',
                      background: isOpen ? 'var(--ns-primary)' : 'var(--ns-border)',
                      boxShadow: isOpen
                        ? '0 0 0 3px rgba(91,61,245,0.15), 0 4px 12px rgba(91,61,245,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : 'var(--ns-shadow-inner)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    aria-label={`${isOpen ? 'Desactivar' : 'Activar'} ${dia.full}`}
                  >
                    <div
                      className="absolute top-[4px] bg-white rounded-full transition-all duration-400"
                      style={{
                        width: '20px',
                        height: '20px',
                        left: isOpen ? 'calc(100% - 24px)' : '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>

                  <div>
                    <p className="font-black text-base md:text-lg tracking-tight transition-colors"
                      style={{ color: isOpen ? 'var(--ns-text)' : 'var(--ns-text-muted)' }}>
                      {dia.full}
                    </p>
                    {!isOpen && (
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Cerrado</p>
                    )}
                  </div>
                </div>

                {/* Controles de hora */}
                <div className={`flex flex-col gap-3 flex-1 transition-all duration-400 ${isOpen ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>

                  {/* Horario principal */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                      style={{ background: 'var(--ns-accent-bg)', border: '1.5px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-inner)' }}>
                      <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ns-primary)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02l.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.95 5.05l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <input
                        type="time"
                        disabled={!isOpen}
                        value={dataDia.inicio}
                        onChange={(e) => cambiarHora(dia.id, 'inicio', e.target.value)}
                        className="bg-transparent font-black outline-none text-sm"
                        style={{ color: 'var(--ns-text)', minWidth: '80px' }}
                      />
                    </div>

                    <div className="w-5 h-0.5 rounded-full" style={{ background: 'var(--ns-border)' }} />

                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                      style={{ background: 'var(--ns-accent-bg)', border: '1.5px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-inner)' }}>
                      <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ns-text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <input
                        type="time"
                        disabled={!isOpen}
                        value={dataDia.fin}
                        onChange={(e) => cambiarHora(dia.id, 'fin', e.target.value)}
                        className="bg-transparent font-black outline-none text-sm"
                        style={{ color: 'var(--ns-text)', minWidth: '80px' }}
                      />
                    </div>
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
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-text-muted)' }}>Pausa</span>
                    </label>

                    {dataDia.pausa && (
                      <div className="flex items-center gap-2 ns-slide-right">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <input
                            type="time"
                            value={dataDia.inicioPausa || '13:00'}
                            onChange={(e) => cambiarHora(dia.id, 'inicioPausa', e.target.value)}
                            className="bg-transparent font-bold outline-none text-xs"
                            style={{ color: '#D97706', minWidth: '70px' }}
                          />
                        </div>
                        <div className="w-3 h-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.3)' }} />
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <input
                            type="time"
                            value={dataDia.finPausa || '17:00'}
                            onChange={(e) => cambiarHora(dia.id, 'finPausa', e.target.value)}
                            className="bg-transparent font-bold outline-none text-xs"
                            style={{ color: '#D97706', minWidth: '70px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Indicador de estado — Plastilina Pill */}
                <div className="shrink-0 hidden sm:flex">
                  <span
                    className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest"
                    style={{
                      background: isOpen ? 'rgba(16,185,129,0.1)' : 'var(--ns-border)',
                      color: isOpen ? '#059669' : 'var(--ns-text-muted)',
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
      <div className="sticky bottom-4 mt-2">
        <button
          onClick={guardarConfiguracion}
          disabled={guardando}
          className="w-full py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-97 disabled:opacity-40 flex items-center justify-center gap-2.5 relative overflow-hidden"
          style={{
            background: saved ? 'var(--ns-success)' : 'var(--ns-primary)',
            boxShadow: saved ? '0 8px 24px rgba(16,185,129,0.35)' : 'var(--ns-plastilina-btn)',
          }}
        >
          <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.15) 0%,transparent 100%)' }} />
          {guardando ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ¡Horarios guardados!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Guardar Horarios
            </>
          )}
        </button>
      </div>
    </div>
  )
}
