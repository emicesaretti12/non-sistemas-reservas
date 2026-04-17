import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Servicios({ negocioId }) {
  const [loading, setLoading] = useState(true)
  const [servicios, setServicios] = useState([])
  
  // --- ESTADOS DEL MODAL Y FORMULARIO ---
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null) // null = Crear, ID = Editar
  
  const [form, setForm] = useState({
    nombre: '',
    duracion: 30,
    precio: ''
  })

  useEffect(() => {
    if (negocioId) {
      cargarServicios()
    }
  }, [negocioId])

  async function cargarServicios() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('creado_en', { ascending: true })

      if (error) throw error
      setServicios(data || [])
    } catch (error) {
      console.error("Error al cargar actividades:", error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- GESTIÓN DE MODAL ---
  const abrirModalCrear = () => {
    setModoEdicion(null)
    setForm({ nombre: '', duracion: 60, precio: '' }) // Por defecto 1 hora para multi-rubro
    setModalAbierto(true)
  }

  const abrirModalEditar = (servicio) => {
    setModoEdicion(servicio.id)
    setForm({ 
      nombre: servicio.nombre, 
      duracion: servicio.duracion, 
      precio: servicio.precio 
    })
    setModalAbierto(true)
  }

  // --- LÓGICA DE BASE DE DATOS (CRUD) ---
  async function guardarServicio(e) {
    e.preventDefault()
    setGuardando(true)
    
    try {
      if (modoEdicion) {
        // ACTUALIZAR
        const { error } = await supabase
          .from('servicios')
          .update({
            nombre: form.nombre,
            duracion: parseInt(form.duracion),
            precio: parseFloat(form.precio)
          })
          .eq('id', modoEdicion)
          
        if (error) throw error
      } else {
        // CREAR NUEVO
        const { error } = await supabase
          .from('servicios')
          .insert([{
            negocio_id: negocioId,
            nombre: form.nombre,
            duracion: parseInt(form.duracion),
            precio: parseFloat(form.precio)
          }])
          
        if (error) throw error
      }

      setModalAbierto(false)
      cargarServicios()
    } catch (error) {
      alert("Error al guardar la actividad. Verifique los datos.")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarServicio(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta actividad del catálogo público?')) {
      const { error } = await supabase.from('servicios').delete().eq('id', id)
      if (!error) {
        cargarServicios()
      } else {
        alert("No se pudo eliminar. Es posible que tenga turnos históricos asociados a este servicio.")
      }
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      
      {/* --- HEADER COMPACTO --- */}
      <header className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-4 md:mb-6 shrink-0">
         <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-slate-900 leading-none">Catálogo</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">
               {servicios.length} Actividades activas
            </p>
         </div>
         <button 
           onClick={abrirModalCrear}
           className="w-10 h-10 md:w-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all gap-2"
         >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round"/></svg>
            <span className="hidden md:inline text-[11px] font-bold uppercase tracking-widest">Nueva Actividad</span>
         </button>
      </header>

      {/* --- CATÁLOGO DE SERVICIOS / ACTIVIDADES --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
         {loading ? (
           <div className="flex justify-center items-center h-40">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
           </div>
         ) : servicios.length === 0 ? (
           <div className="bg-white rounded-[2rem] border border-dashed border-slate-300 p-12 flex flex-col items-center text-center">
              <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <h3 className="text-sm font-bold text-slate-900">Catálogo Vacío</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-2 max-w-[200px]">
                Aún no has creado ninguna actividad. Añade opciones para que tus clientes puedan reservar.
              </p>
           </div>
         ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {servicios.map((s) => (
                <div key={s.id} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between group hover:border-slate-300 transition-colors">
                   
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shrink-0">
                            {/* Icono más universal (Estrella/Destello) */}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                         </div>
                         <div>
                            <h4 className="font-bold text-base md:text-lg tracking-tight text-slate-900 leading-tight">{s.nombre}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              {s.duracion >= 60 ? `${s.duracion / 60} HORAS` : `${s.duracion} MIN`}
                            </p>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                      <span className="font-black text-2xl tracking-tighter text-slate-900">${s.precio}</span>
                      
                      <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                         <button onClick={() => abrirModalEditar(s)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-900 transition-colors" title="Editar">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                         </button>
                         <button onClick={() => eliminarServicio(s.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Eliminar">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                         </button>
                      </div>
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>

      {/* --- MODAL: CREAR / EDITAR (iOS BOTTOM SHEET) --- */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-6 md:p-8 animate-in slide-in-from-bottom-full duration-500 border border-slate-100">
              
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tighter text-slate-900">{modoEdicion ? 'Modificar Datos' : 'Nueva Actividad'}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Catálogo Público</p>
                 </div>
                 <button onClick={() => setModalAbierto(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
                 </button>
              </div>

              <form onSubmit={guardarServicio} className="space-y-4">
                 
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre de la Actividad / Servicio</label>
                    <input 
                      required 
                      autoFocus
                      className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300" 
                      placeholder="Ej: Consulta Médica, Alquiler Cancha, etc." 
                      value={form.nombre} 
                      onChange={e => setForm({...form, nombre: e.target.value})} 
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Bloque de Tiempo</label>
                       <div className="relative flex items-center">
                          <select 
                            required 
                            className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none transition-all text-sm cursor-pointer pr-10" 
                            value={form.duracion} 
                            onChange={e => setForm({...form, duracion: e.target.value})}
                          >
                             <option value="15">15 minutos</option>
                             <option value="30">30 minutos</option>
                             <option value="45">45 minutos</option>
                             <option value="60">1 Hora</option>
                             <option value="90">1.5 Horas</option>
                             <option value="120">2 Horas</option>
                             <option value="180">3 Horas</option>
                             <option value="240">4 Horas</option>
                             <option value="360">6 Horas</option>
                          </select>
                          <svg className="w-4 h-4 text-slate-400 absolute right-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                       </div>
                    </div>
                    
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Costo ($)</label>
                       <div className="relative flex items-center">
                          <div className="absolute left-4 font-bold text-slate-400 pointer-events-none">$</div>
                          <input 
                            required 
                            type="number" 
                            step="any"
                            min="0"
                            className="w-full p-4 pl-8 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300" 
                            placeholder="0.00" 
                            value={form.precio} 
                            onChange={e => setForm({...form, precio: e.target.value})} 
                          />
                       </div>
                    </div>
                 </div>

                 <button 
                    disabled={guardando} 
                    type="submit" 
                    className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-[11px] tracking-widest uppercase shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3 mt-6"
                 >
                    {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (modoEdicion ? 'Actualizar Datos' : 'Guardar y Publicar')}
                 </button>
              </form>
           </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}