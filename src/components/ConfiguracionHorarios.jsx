import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import { IconRobot, IconCheckCircle, IconErrorCircle } from './NoniIcons'

export default function ConfiguracionHorarios({ negocio, onUpdate }) {
  const toast = useToast()
  const [guardando, setGuardando] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showError, setShowError] = useState(false)

  // Estructura base de la semana (por si el negocio es nuevo y no tiene horarios aún)
  const defaultHorarios = {
    lunes: { abierto: true, inicio: '08:00', fin: '21:00', pausa: true, inicioPausa: '13:00', finPausa: '17:00' },
    martes: { abierto: true, inicio: '08:00', fin: '21:00', pausa: true, inicioPausa: '13:00', finPausa: '17:00' },
    miercoles: { abierto: true, inicio: '08:00', fin: '21:00', pausa: true, inicioPausa: '13:00', finPausa: '17:00' },
    jueves: { abierto: true, inicio: '08:00', fin: '21:00', pausa: true, inicioPausa: '13:00', finPausa: '17:00' },
    viernes: { abierto: true, inicio: '08:00', fin: '21:00', pausa: true, inicioPausa: '13:00', finPausa: '17:00' },
    sabado: { abierto: false, inicio: '10:00', fin: '14:00', pausa: false, inicioPausa: '13:00', finPausa: '17:00' },
    domingo: { abierto: false, inicio: '00:00', fin: '00:00', pausa: false, inicioPausa: '13:00', finPausa: '17:00' }
  }

  // Inicializamos el estado con lo que viene de la DB, o usamos el default
  const [horarios, setHorarios] = useState(negocio?.horarios || defaultHorarios)

  const diasSemana = [
    { id: 'lunes', label: 'Lunes' },
    { id: 'martes', label: 'Martes' },
    { id: 'miercoles', label: 'Miércoles' },
    { id: 'jueves', label: 'Jueves' },
    { id: 'viernes', label: 'Viernes' },
    { id: 'sabado', label: 'Sábado' },
    { id: 'domingo', label: 'Domingo' }
  ]

  // --- LÓGICA DE MANEJO DE ESTADO ---
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

  // --- GUARDAR EN BASE DE DATOS ---
  async function guardarConfiguracion() {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('negocios')
        .update({ horarios })
        .eq('id', negocio.id)

      if (error) throw error

      toast.success("Horarios comerciales actualizados con éxito. La agenda pública ha sido modificada.")
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 4000)
      if (onUpdate) onUpdate()

    } catch (error) {
      toast.error("Hubo un error al guardar los horarios. Verifique su conexión.")
      setShowError(true)
      setTimeout(() => setShowError(false), 4000)
      console.error(error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      <header className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex items-center justify-between bg-white/[0.03] p-8 md:p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-24 h-24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white leading-none">Horarios</h2>
            <div className="flex items-center gap-2 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/30">Matriz de disponibilidad</p>
            </div>
          </div>
          <button
            onClick={guardarConfiguracion}
            disabled={guardando}
            className="w-14 h-14 md:w-auto md:px-8 md:py-4 rounded-2xl md:rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all gap-3 hover:bg-indigo-500 border border-white/20 relative z-10 disabled:opacity-30"
          >
            {guardando ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="hidden md:inline text-[11px] font-black uppercase tracking-[0.3em]">Guardar</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* --- TIP EDUCATIVO — Solo si no hay horarios configurados --- */}
      {!Object.values(horarios).some(d => d.abierto) && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 md:p-5 mb-4 md:mb-6 flex items-start gap-3">
          <IconRobot size={24} className="text-purple-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900">¿Cómo funcionan los horarios?</p>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
              Activá los días que abrís y configurá el rango horario (ej: 9:00 a 18:00). El sistema calcula automáticamente los turnos disponibles según la <strong className="text-slate-700">duración de cada servicio</strong>. Si cerrás al mediodía, usá la opción "Corte / Pausa".
            </p>
          </div>
        </div>
      )}

      {/* --- LISTA DE DÍAS (APPLE SETTINGS STYLE) --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="bg-white/[0.03] rounded-[2.5rem] border border-white/10 overflow-hidden max-w-3xl">
          {diasSemana.map((dia, index) => {
            const dataDia = horarios[dia.id]
            const isLast = index === diasSemana.length - 1

            return (
              <div
                key={dia.id}
                className={`p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-white/[0.02] ${!isLast ? 'border-b border-white/5' : ''}`}
              >
                {/* Toggle y Nombre del Día */}
                <div className="flex items-center gap-6 min-w-[180px]">
                  <button
                    onClick={() => toggleDia(dia.id)}
                    className={`relative w-14 h-8 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0 focus:outline-none border-2 ${dataDia.abierto ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${dataDia.abierto ? 'transform translate-x-6 scale-110' : ''}`}></div>
                  </button>
                  <span className={`font-black text-xl md:text-2xl tracking-tighter transition-all ${dataDia.abierto ? 'text-white' : 'text-white/10'}`}>
                    {dia.label}
                  </span>
                </div>

                {/* Controles de Hora */}
                <div className={`flex flex-col gap-4 transition-all duration-500 ${dataDia.abierto ? 'opacity-100' : 'opacity-10 pointer-events-none'}`}>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white/5 px-5 py-4 rounded-2xl border border-white/10 focus-within:border-indigo-500/50 transition-all">
                      <input
                        type="time"
                        disabled={!dataDia.abierto}
                        value={dataDia.inicio}
                        onChange={(e) => cambiarHora(dia.id, 'inicio', e.target.value)}
                        className="bg-transparent font-black text-white outline-none text-base w-full md:w-auto"
                      />
                    </div>

                    <span className="text-white/10 font-black">-</span>

                    <div className="flex items-center gap-3 bg-white/5 px-5 py-4 rounded-2xl border border-white/10 focus-within:border-indigo-500/50 transition-all">
                      <input
                        type="time"
                        disabled={!dataDia.abierto}
                        value={dataDia.fin}
                        onChange={(e) => cambiarHora(dia.id, 'fin', e.target.value)}
                        className="bg-transparent font-black text-white outline-none text-base w-full md:w-auto"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-1 px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${dataDia.pausa ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                        {dataDia.pausa && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <input type="checkbox" checked={dataDia.pausa || false} onChange={(e) => {
                        const checked = e.target.checked
                        setHorarios(prev => ({
                          ...prev,
                          [dia.id]: {
                            ...prev[dia.id],
                            pausa: checked,
                            inicioPausa: prev[dia.id].inicioPausa || '13:00',
                            finPausa: prev[dia.id].finPausa || '17:00'
                          }
                        }))
                      }} className="hidden" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Corte / Pausa</span>
                    </label>

                    {dataDia.pausa && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-center gap-2 bg-[#F8FAFC] px-2 py-1.5 rounded-xl border border-slate-100">
                          <input type="time" value={dataDia.inicioPausa || '13:00'} onChange={(e) => cambiarHora(dia.id, 'inicioPausa', e.target.value)} className="bg-transparent font-bold text-slate-900 outline-none text-xs" />
                        </div>
                        <span className="text-slate-300 font-bold text-xs">-</span>
                        <div className="flex items-center gap-2 bg-[#F8FAFC] px-2 py-1.5 rounded-xl border border-slate-100">
                          <input type="time" value={dataDia.finPausa || '17:00'} onChange={(e) => cambiarHora(dia.id, 'finPausa', e.target.value)} className="bg-transparent font-bold text-slate-900 outline-none text-xs" />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}