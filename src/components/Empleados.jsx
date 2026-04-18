import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Empleados({ negocioId }) {
  const [loading, setLoading] = useState(true)
  const [especialistas, setEspecialistas] = useState([])
  
  // --- ESTADOS DEL MODAL Y FORMULARIO ---
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  
  const [form, setForm] = useState({
    nombre: '',
    especialidad: '',
    foto_url: ''
  })

  useEffect(() => {
    if (negocioId) {
      cargarEspecialistas()
    }
  }, [negocioId])

  async function cargarEspecialistas() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('creado_en', { ascending: true })

      if (error) throw error
      setEspecialistas(data || [])
    } catch (error) {
      console.error("Error al cargar especialistas:", error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- GESTIÓN DE MEDIA (CLOUDINARY) ---
  async function manejarSubidaFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    
    setSubiendoFoto(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'non_sistemas') 
    formData.append('cloud_name', 'ddp4r9dlu') 

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/ddp4r9dlu/image/upload', { 
        method: 'POST', 
        body: formData 
      })
      const data = await res.json()
      
      if (data.secure_url) {
        const urlOptimizada = data.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill,g_face,q_auto,f_auto/')
        setForm({ ...form, foto_url: urlOptimizada })
      }
    } catch (error) {
      alert("Error al subir la imagen. Intente nuevamente.")
    } finally {
      setSubiendoFoto(false)
    }
  }

  const abrirModalCrear = () => {
    setModoEdicion(null)
    setForm({ nombre: '', especialidad: '', foto_url: '' })
    setModalAbierto(true)
  }

  const abrirModalEditar = (esp) => {
    setModoEdicion(esp.id)
    setForm({ 
      nombre: esp.nombre, 
      especialidad: esp.especialidad || '', 
      foto_url: esp.foto_url || '' 
    })
    setModalAbierto(true)
  }

  // --- MOTOR DE PERSISTENCIA (BLINDADO CONTRA ERROR 400 Y 403) ---
  async function guardarEspecialista(e) {
    e.preventDefault()
    setGuardando(true)
    
    try {
      // 1. OBTENEMOS EL ID EXACTO DE LA SESIÓN PARA EVITAR EL ERROR 400
      const { data: authData, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authData?.user) {
        alert("Tu sesión caducó. Por favor, refrescá la página e iniciá sesión nuevamente.")
        setGuardando(false)
        return
      }

      const userIdExacto = authData.user.id

      // 2. ARMAMOS EL PAYLOAD 
      const payload = {
        negocio_id: userIdExacto,
        nombre: form.nombre.trim(),
        especialidad: form.especialidad.trim(),
        foto_url: form.foto_url
      }

      // 3. ENVIAMOS A SUPABASE
      if (modoEdicion) {
        const { error } = await supabase
          .from('empleados')
          .update(payload)
          .eq('id', modoEdicion)
          .eq('negocio_id', userIdExacto)
          
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('empleados')
          .insert([payload])
          
        if (error) throw error
      }

      setModalAbierto(false)
      // Recargamos forzando el ID validado
      const { data: newData } = await supabase.from('empleados').select('*').eq('negocio_id', userIdExacto).order('creado_en', { ascending: true })
      setEspecialistas(newData || [])

    } catch (error) {
      console.error("Payload rechazado por Supabase:", error)
      if (error.code === '42501' || error.message.includes('403')) {
        alert("Error 403: La base de datos bloqueó la acción. Ejecutá el script SQL de sincronización.")
      } else {
        alert(`Error del servidor: ${error.message}`)
      }
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarEspecialista(id) {
    if (confirm('¿Desea dar de baja a este especialista/recurso?')) {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user) return

      const { error } = await supabase
        .from('empleados')
        .delete()
        .eq('id', id)
        .eq('negocio_id', authData.user.id)

      if (!error) {
        setEspecialistas(especialistas.filter(e => e.id !== id))
      } else {
        alert("No se puede eliminar un recurso con agendas activas.")
      }
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      
      {/* --- HEADER COMPACTO --- */}
      <header className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-4 md:mb-6 shrink-0">
         <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-slate-900 leading-none">Especialistas</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">
               {especialistas.length} Recursos disponibles
            </p>
         </div>
         <button 
           onClick={abrirModalCrear}
           className="w-10 h-10 md:w-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all gap-2 hover:bg-slate-800"
         >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round"/></svg>
            <span className="hidden md:inline text-[11px] font-bold uppercase tracking-widest">Nuevo Registro</span>
         </button>
      </header>

      {/* --- GRILLA DE ESPECIALISTAS --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
         {loading ? (
           <div className="flex justify-center items-center h-40">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
           </div>
         ) : especialistas.length === 0 ? (
           <div className="bg-white rounded-[2rem] border border-dashed border-slate-300 p-12 flex flex-col items-center text-center">
              <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <h3 className="text-sm font-bold text-slate-900">Sin Staff</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-2 max-w-[200px]">
                Debes agregar al menos un especialista o recurso para recibir reservas.
              </p>
           </div>
         ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {especialistas.map((esp) => (
                <div key={esp.id} className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex items-center gap-4 group hover:border-slate-300 transition-all">
                   
                   <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50 shrink-0">
                      {esp.foto_url ? (
                        <img src={esp.foto_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={esp.nombre} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-2xl font-bold">{esp.nombre.charAt(0)}</div>
                      )}
                   </div>

                   <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-base text-slate-900 truncate">{esp.nombre}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                        {esp.especialidad || 'General'}
                      </p>
                   </div>

                   <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirModalEditar(esp)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-900 transition-colors">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button onClick={() => eliminarEspecialista(esp.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>

      {/* --- MODAL: CREAR / EDITAR --- */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-6 md:p-8 animate-in slide-in-from-bottom-full duration-500 border border-slate-100">
              
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tighter text-slate-900">{modoEdicion ? 'Editar Perfil' : 'Nuevo Especialista'}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Gestión de Staff y Recursos</p>
                 </div>
                 <button onClick={() => setModalAbierto(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
                 </button>
              </div>

              <form onSubmit={guardarEspecialista} className="space-y-5">
                 
                 {/* UPLOAD FOTO PERFIL */}
                 <div className="flex flex-col items-center mb-2">
                    <div className="relative group">
                       <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-50 border-2 border-slate-100 shadow-inner flex items-center justify-center">
                          {form.foto_url ? (
                            <img src={form.foto_url} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                          {subiendoFoto && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                               <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                            </div>
                          )}
                       </div>
                       <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <input type="file" accept="image/*" className="hidden" onChange={manejarSubidaFoto} />
                       </label>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre Completo</label>
                    <input 
                      required 
                      className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300" 
                      placeholder="Ej: Dr. Alejandro Sanz" 
                      value={form.nombre} 
                      onChange={e => setForm({...form, nombre: e.target.value})} 
                    />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Especialidad / Rol</label>
                    <input 
                      required 
                      className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300" 
                      placeholder="Ej: Traumatólogo, Barbero Senior, etc." 
                      value={form.especialidad} 
                      onChange={e => setForm({...form, especialidad: e.target.value})} 
                    />
                 </div>

                 <button 
                    disabled={guardando || subiendoFoto} 
                    type="submit" 
                    className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-[11px] tracking-widest uppercase shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3 mt-4 disabled:opacity-50 hover:bg-slate-800"
                 >
                    {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (modoEdicion ? 'Actualizar Registro' : 'Confirmar Especialista')}
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