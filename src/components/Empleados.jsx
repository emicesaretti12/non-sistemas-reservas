import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'
import { useToast } from './Toast'
import { IconRobot, IconCelebrate, IconErrorCircle } from './NoniIcons'

export default function Empleados({ negocioId, rubro }) {
  const vocab = getVocabulario(rubro)
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [especialistas, setEspecialistas] = useState([])

  // --- ESTADOS DEL MODAL Y FORMULARIO ---
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showError, setShowError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    especialidad: '',
    foto_url: '',
    email: '',
    telefono: '',
    comision_porcentaje: 0,
    estado: 'activo',
    notas: ''
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
      toast.error("Error al subir la imagen. Intente nuevamente.")
    } finally {
      setSubiendoFoto(false)
    }
  }

  const abrirModalCrear = () => {
    setModoEdicion(null)
    setForm({ nombre: '', especialidad: '', foto_url: '', email: '', telefono: '', comision_porcentaje: 0, estado: 'activo', notas: '' })
    setModalAbierto(true)
  }

  const abrirModalEditar = (esp) => {
    setModoEdicion(esp.id)
    setForm({
      nombre: esp.nombre,
      especialidad: esp.especialidad || '',
      foto_url: esp.foto_url || '',
      email: esp.email || '',
      telefono: esp.telefono || '',
      comision_porcentaje: esp.comision_porcentaje || 0,
      estado: esp.estado || 'activo',
      notas: esp.notas || ''
    })
    setModalAbierto(true)
  }

  // --- MOTOR DE PERSISTENCIA (BLINDADO CONTRA ERROR 400 Y 403) ---
  async function guardarEspecialista(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      // Remove user ID fetch since we use the exact UUID of the business
      const payload = {
        negocio_id: negocioId,
        nombre: form.nombre.trim(),
        especialidad: form.especialidad.trim(),
        foto_url: form.foto_url,
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        comision_porcentaje: parseFloat(form.comision_porcentaje) || 0,
        estado: form.estado,
        notas: form.notas.trim() || null
      }

      // 3. ENVIAMOS A SUPABASE
      if (modoEdicion) {
        const { error } = await supabase
          .from('empleados')
          .update(payload)
          .eq('id', modoEdicion)
          .eq('negocio_id', negocioId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('empleados')
          .insert([payload])

        if (error) throw error
      }

      setModalAbierto(false)
      // Celebrate first employee!
      const wasEmpty = especialistas.length === 0 && !modoEdicion
      // Recargamos forzando el ID validado
      const { data: newData } = await supabase.from('empleados').select('*').eq('negocio_id', negocioId).order('creado_en', { ascending: true })
      setEspecialistas(newData || [])
      if (wasEmpty) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 5000)
      }

    } catch (error) {
      console.error("Payload rechazado por Supabase:", error)
      if (error.code === '42501' || error.message.includes('403')) {
        toast.error("Error 403: La base de datos bloqueó la acción. Ejecutá el script SQL de sincronización.")
      } else {
        toast.error(`Error del servidor: ${error.message}`)
      }
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarEspecialista(id) {
    if (!window.confirm('¿Desea dar de baja a este especialista/recurso?')) return
    const { error } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id)
      .eq('negocio_id', negocioId)

    if (!error) {
      toast.success('Especialista eliminado correctamente')
      setEspecialistas(especialistas.filter(e => e.id !== id))
    } else {
      toast.error("No se puede eliminar un recurso con agendas activas.")
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">

      {/* --- HEADER COMPACTO --- */}

      {/* Celebration toast */}
      {showCelebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-white rounded-2xl shadow-2xl border border-emerald-100 px-6 py-4 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-500 max-w-sm">
          <IconCelebrate size={24} className="text-emerald-500" />
          <div>
            <p className="text-sm font-bold text-slate-900">¡{vocab.empleado} agregado!</p>
            <p className="text-[10px] text-slate-500 font-medium">Ahora configurá tus horarios de atención</p>
          </div>
        </div>
      )}

      {/* Error toast */}
      {showError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-white rounded-2xl shadow-2xl border border-red-100 px-6 py-4 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-500 max-w-sm">
          <IconErrorCircle size={24} className="text-red-500" />
          <div>
            <p className="text-sm font-bold text-slate-900">Error</p>
            <p className="text-[10px] text-slate-500 font-medium">{showError}</p>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between bg-[#F7F5FF] p-8 md:p-10 rounded-[2.5rem] border border-[#EDE8F7] mb-6 md:mb-8 shrink-0 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-24 h-24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-[#1A1630] leading-none">{vocab.empleadoPlural}</h2>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] animate-pulse" />
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#A09CB5]">
              {especialistas.length} {vocab.empleados} en línea
            </p>
          </div>
        </div>
        <button
          onClick={abrirModalCrear}
          className="w-14 h-14 md:w-auto md:px-8 md:py-4 rounded-2xl md:rounded-3xl bg-[#5B3DF5] text-white flex items-center justify-center shadow-2xl shadow-[#5B3DF5]/40 active:scale-95 transition-all gap-3 hover:bg-[#5B3DF5] border border-white/20 relative z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
          <span className="hidden md:inline text-[11px] font-black uppercase tracking-[0.3em]">{vocab.nuevoEmpleado}</span>
        </button>
      </header>

      {/* --- GRILLA DE ESPECIALISTAS --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          </div>
        ) : especialistas.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-purple-100 p-8 md:p-10 flex flex-col items-center text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-50 rounded-full blur-[40px]"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-50 rounded-full blur-[30px]"></div>

            {/* Robot emoji */}
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm relative z-10">
              <IconRobot size={28} className="text-purple-500" />
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight relative z-10">¡Agregá a tu equipo!</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-[320px] leading-relaxed font-medium relative z-10">
              Acá cargás a las personas que atienden en tu negocio. Si <strong className="text-slate-700">trabajás solo</strong>, ponete a vos mismo. Los clientes van a elegir <strong className="text-slate-700">con quién reservar</strong>.
            </p>

            {/* Example card */}
            <div className="mt-5 w-full max-w-[300px] space-y-2 relative z-10">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ejemplo:</p>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">A</div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-700">Ana García</p>
                  <p className="text-[9px] text-slate-400 font-medium">{vocab.especialidad || 'Especialista'}</p>
                </div>
                <div className="ml-auto w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={abrirModalCrear}
              className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-[11px] uppercase tracking-widest shadow-lg hover:from-purple-400 hover:to-indigo-400 transition-all active:scale-95 relative z-10 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
              Agregar {vocab.empleado}
            </button>
            <p className="text-[9px] text-slate-400 mt-2 font-medium relative z-10">Necesitás al menos uno para recibir reservas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {especialistas.map((esp) => (
              <div key={esp.id} className="bg-[#F7F5FF] rounded-[2.5rem] p-6 border border-[#EDE8F7] flex items-center gap-5 group hover:bg-white transition-all relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-20 h-20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                
                <div className="relative w-20 h-20 rounded-[2rem] overflow-hidden shadow-2xl border-2 border-[#EDE8F7] bg-white shrink-0 z-10">
                  {esp.foto_url ? (
                    <img src={esp.foto_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={esp.nombre} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A09CB5] text-3xl font-black">{esp.nombre.charAt(0)}</div>
                  )}
                  {/* Estado badge */}
                  <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-4 border-white ${esp.estado === 'vacaciones' ? 'bg-amber-400' : esp.estado === 'inactivo' ? 'bg-rose-500' : 'bg-emerald-400'
                    }`}></div>
                </div>

                <div className="flex-1 overflow-hidden relative z-10">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-lg text-[#1A1630] truncate leading-tight">{esp.nombre}</h4>
                    {esp.comision_porcentaje > 0 && <span className="text-[8px] font-black text-[#5B3DF5] bg-[#5B3DF5]/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-[#5B3DF5]/20">{esp.comision_porcentaje}%</span>}
                  </div>
                  <p className="text-[10px] font-black text-[#A09CB5] uppercase tracking-[0.2em] mt-1 truncate">
                    {esp.especialidad || 'General'}
                  </p>
                  {(esp.email || esp.telefono) && (
                    <div className="flex items-center gap-3 mt-2">
                      {esp.telefono && <span className="text-[9px] text-[#A09CB5] font-bold truncate">{esp.telefono}</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                  <button onClick={() => abrirModalEditar(esp)} className="w-10 h-10 rounded-xl bg-white text-[#A09CB5] flex items-center justify-center hover:bg-[#E8DEFF]/40 hover:text-[#5B3DF5] transition-all active:scale-90 border border-[#EDE8F7]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button onClick={() => eliminarEspecialista(esp.id)} className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-90 border border-rose-500/20">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL: CREAR / EDITAR --- */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-[#0f1117]/80 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-8 md:p-10 animate-in slide-in-from-bottom-full duration-500 border border-[#EDE8F7] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#5B3DF5]/10 blur-[80px]" />
            </div>

            <div className="flex justify-between items-center mb-10 relative z-10">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-[#1A1630] leading-none">{modoEdicion ? vocab.editarEmpleado : vocab.nuevoEmpleado}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5]">Gestión de {vocab.empleados}</p>
                </div>
              </div>
              <button onClick={() => setModalAbierto(false)} className="w-12 h-12 bg-white hover:bg-[#E8DEFF]/40 rounded-2xl flex items-center justify-center text-[#A09CB5] hover:text-[#5B3DF5] transition-all active:scale-90 border border-[#EDE8F7]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
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
                      <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                    {subiendoFoto && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <input type="file" accept="image/*" className="hidden" onChange={manejarSubidaFoto} />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre</label>
                <input
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300"
                  placeholder={vocab.placeholderEmpleado}
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{vocab.especialidad}</label>
                <input
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300"
                  placeholder={vocab.placeholderEspecialidad}
                  value={form.especialidad}
                  onChange={e => setForm({ ...form, especialidad: e.target.value })}
                />
              </div>

              {/* CRM: Contacto */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email</label>
                  <input type="email" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300" placeholder="email@ejemplo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Teléfono</label>
                  <input type="tel" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300" placeholder="351..." value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
              </div>

              {/* CRM: Comisión y Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Comisión %</label>
                  <input type="number" min="0" max="100" step="0.5" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm" value={form.comision_porcentaje} onChange={e => setForm({ ...form, comision_porcentaje: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Estado</label>
                  <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none text-sm cursor-pointer" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="vacaciones">Vacaciones</option>
                  </select>
                </div>
              </div>

              {/* CRM: Notas internas */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Notas Internas</label>
                <textarea className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm resize-none h-20 placeholder:text-slate-300" placeholder="Notas privadas sobre este recurso..." value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>

              <button
                disabled={guardando || subiendoFoto}
                type="submit"
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-[11px] tracking-widest uppercase shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3 mt-4 disabled:opacity-50 hover:bg-slate-800"
              >
                {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (modoEdicion ? `Actualizar ${vocab.empleado}` : `Confirmar ${vocab.empleado}`)}
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