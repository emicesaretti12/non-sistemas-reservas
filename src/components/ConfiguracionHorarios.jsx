import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ConfiguracionHorarios({ negocio, onUpdate }) {
  const [guardando, setGuardando] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

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
      
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 5000)
      if (onUpdate) onUpdate() // Llama a la función del padre (Dashboard) para refrescar datos
      
    } catch (error) {
      alert("Hubo un error al guardar los horarios. Verifique su conexión.")
      console.error(error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      
      {/* --- HEADER --- */}

      {/* Celebration toast */}
      {showCelebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-white rounded-2xl shadow-2xl border border-emerald-100 px-6 py-4 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-500 max-w-sm">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-bold text-slate-900">¡Horarios guardados!</p>
            <p className="text-[10px] text-slate-500 font-medium">Tus clientes ya pueden ver los turnos disponibles. ¡Compartí tu link!</p>
          </div>
        </div>
      )}

      <header className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 mb-4 md:mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-slate-900 leading-none">Matriz de Horarios</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">
               Configuración de disponibilidad semanal
            </p>
         </div>
         <button 
           onClick={guardarConfiguracion}
           disabled={guardando}
           className="w-full md:w-auto px-8 py-4 rounded-xl bg-slate-900 text-white font-bold text-[11px] tracking-widest uppercase shadow-lg active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-50"
         >
            {guardando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Guardar y Sincronizar'}
         </button>
      </header>

      {/* --- TIP EDUCATIVO — Solo si no hay horarios configurados --- */}
      {!Object.values(horarios).some(d => d.abierto) && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 md:p-5 mb-4 md:mb-6 flex items-start gap-3">
          <span className="text-2xl shrink-0">🤖</span>
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
         <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden max-w-3xl">
            {diasSemana.map((dia, index) => {
               const dataDia = horarios[dia.id]
               const isLast = index === diasSemana.length - 1

               return (
                 <div 
                   key={dia.id} 
                   className={`p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 ${!isLast ? 'border-b border-slate-100' : ''}`}
                 >
                    {/* Toggle y Nombre del Día */}
                    <div className="flex items-center gap-4 min-w-[140px]">
                       <button 
                          onClick={() => toggleDia(dia.id)}
                          className={`relative w-12 h-7 rounded-full transition-colors duration-300 ease-in-out shrink-0 focus:outline-none ${dataDia.abierto ? 'bg-[#34C759]' : 'bg-slate-200'}`}
                       >
                          <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${dataDia.abierto ? 'transform translate-x-5' : ''}`}></div>
                       </button>
                       <span className={`font-bold text-base md:text-lg tracking-tight transition-colors ${dataDia.abierto ? 'text-slate-900' : 'text-slate-400'}`}>
                          {dia.label}
                       </span>
                    </div>

                    {/* Controles de Hora */}
                    <div className={`flex flex-col gap-2 transition-opacity duration-300 ${dataDia.abierto ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                       
                       <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-2 md:px-4 md:py-2.5 rounded-xl border border-slate-100">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Apertura</span>
                             <input 
                               type="time" 
                               disabled={!dataDia.abierto}
                               value={dataDia.inicio}
                               onChange={(e) => cambiarHora(dia.id, 'inicio', e.target.value)}
                               className="bg-transparent font-bold text-slate-900 outline-none text-sm w-full md:w-auto"
                             />
                          </div>
                          
                          <span className="text-slate-300 font-bold">-</span>

                          <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-2 md:px-4 md:py-2.5 rounded-xl border border-slate-100">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Cierre</span>
                             <input 
                               type="time" 
                               disabled={!dataDia.abierto}
                               value={dataDia.fin}
                               onChange={(e) => cambiarHora(dia.id, 'fin', e.target.value)}
                               className="bg-transparent font-bold text-slate-900 outline-none text-sm w-full md:w-auto"
                             />
                          </div>
                       </div>

                       <div className="flex items-center gap-3 mt-1 px-1">
                          <label className="flex items-center gap-2 cursor-pointer group">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${dataDia.pausa ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                                {dataDia.pausa && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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