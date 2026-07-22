import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'
import { useToast } from './Toast'
import { IconRobot, IconCelebrate, IconErrorCircle } from './NoniIcons'

export default function Servicios({ negocioId, rubro }) {
  const vocab = getVocabulario(rubro)
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [servicios, setServicios] = useState([])

  // --- ESTADOS DEL MODAL Y FORMULARIO ---
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showError, setShowError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    duracion: '',
    precio: ''
  })

  // Al montar el componente o refrescar, cargamos directamente desde Auth
  useEffect(() => {
    if (negocioId) {
      cargarServicios()
    }
  }, [negocioId])

  // --- MOTOR DE LECTURA (AUTÓNOMO Y ANTI-REFRESH) ---
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
      console.error("Error al cargar la grilla de servicios:", error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- ACCIONES DE MODAL ---
  const abrirModalCrear = () => {
    setModoEdicion(null)
    setForm({ nombre: '', duracion: '', precio: '' })
    setModalAbierto(true)
  }

  const abrirModalEditar = (srv) => {
    setModoEdicion(srv.id)
    setForm({
      nombre: srv.nombre,
      // Mapeo exacto a la base de datos
      duracion: srv.duracion_minutos || '',
      precio: srv.precio || ''
    })
    setModalAbierto(true)
  }

  // --- MOTOR DE PERSISTENCIA (BLINDADO) ---
  async function guardarServicio(e) {
    e.preventDefault()
    setGuardando(true)

    try {
      // PAYLOAD EXACTO: duracion_minutos coincide con tu SQL
      const payload = {
        negocio_id: negocioId,
        nombre: form.nombre.trim(),
        duracion_minutos: Number(form.duracion),
        precio: Number(form.precio)
      }

      if (modoEdicion) {
        const { error } = await supabase
          .from('servicios')
          .update(payload)
          .eq('id', modoEdicion)
          .eq('negocio_id', negocioId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('servicios')
          .insert([payload])

        if (error) throw error
      }

      setModalAbierto(false)
      // Celebrate first service creation!
      const wasEmpty = servicios.length === 0 && !modoEdicion
      // Recargamos forzando la lectura directa
      cargarServicios()
      if (wasEmpty) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 5000)
      }

    } catch (error) {
      console.error("Supabase Error:", error)
      toast.showToast(`Error del servidor: ${error.message}`, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarServicio(id) {
    if (!window.confirm('¿Desea eliminar este servicio?')) return
    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id)
      .eq('negocio_id', negocioId)

    if (error) {
      toast.showToast(`Error al eliminar: ${error.message}`, 'error')
    } else {
      setServicios(servicios.filter(s => s.id !== id))
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">

      {/* Celebration toast */}
      {showCelebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-white rounded-2xl shadow-2xl border border-emerald-100 px-6 py-4 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-500 max-w-sm">
          <IconCelebrate size={24} className="text-emerald-500" />
          <div>
            <p className="text-sm font-bold text-slate-900">¡Primer {vocab.servicio} creado!</p>
            <p className="text-[10px] text-slate-500 font-medium">Ahora agregá a tu equipo para recibir reservas</p>
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

      <header className="flex items-center justify-between bg-white p-8 md:p-10 rounded-[2.5rem] border border-[#EDE8F7] mb-6 md:mb-8 shrink-0 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-24 h-24"><path d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-[#1A1630] leading-none">{vocab.servicioPlural}</h2>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] animate-pulse" />
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-[#A09CB5]">
              {servicios.length} {vocab.servicios} activos
            </p>
          </div>
        </div>
        <button
          onClick={abrirModalCrear}
          className="w-14 h-14 md:w-auto md:px-8 md:py-4 rounded-2xl md:rounded-3xl bg-[#5B3DF5] text-white flex items-center justify-center shadow-2xl shadow-[#5B3DF5]/40 active:scale-95 transition-all gap-3 hover:bg-[#5B3DF5] border border-white/20 relative z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
          <span className="hidden md:inline text-[11px] font-black uppercase tracking-[0.3em]">{vocab.nuevoServicio}</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          </div>
        ) : servicios.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-purple-100 p-8 md:p-10 flex flex-col items-center text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-50 rounded-full blur-[40px]"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-50 rounded-full blur-[30px]"></div>

            {/* Robot emoji */}
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm relative z-10">
              <IconRobot size={28} className="text-purple-500" />
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight relative z-10">¡Empezá creando tu primer {vocab.servicio}!</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-[320px] leading-relaxed font-medium relative z-10">
              Un {vocab.servicio} es lo que ofrecés a tus clientes. Cada uno tiene un <strong className="text-slate-700">nombre</strong>, un <strong className="text-slate-700">precio</strong> y <strong className="text-slate-700">cuánto dura</strong>. Tus clientes lo ven cuando abren tu link de reservas.
            </p>

            {/* Example cards */}
            <div className="mt-5 w-full max-w-[300px] space-y-2 relative z-10">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ejemplo:</p>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-700">Consulta General</p>
                  <p className="text-[9px] text-slate-400 font-medium">30 min</p>
                </div>
                <span className="text-sm font-black text-slate-900">$3500</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={abrirModalCrear}
              className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-[11px] uppercase tracking-widest shadow-lg hover:from-purple-400 hover:to-indigo-400 transition-all active:scale-95 relative z-10 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
              Crear {vocab.servicio}
            </button>
            <p className="text-[9px] text-slate-400 mt-2 font-medium relative z-10">Necesitás al menos uno para recibir reservas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {servicios.map((srv) => (
              <div key={srv.id} className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-[#EDE8F7] flex flex-col justify-between gap-6 group hover:bg-[#F7F5FF] transition-all relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-20 h-20"><path d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                </div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-xl md:text-2xl text-[#1A1630] leading-tight mb-3 truncate">{srv.nombre}</h4>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F7F5FF] text-[10px] font-black text-[#5B3DF5] tracking-[0.2em] uppercase border border-[#EDE8F7]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {srv.duracion_minutos} min
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl md:text-3xl font-black text-[#1A1630] tracking-tighter leading-none">${srv.precio}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-[#EDE8F7] relative z-10">
                  <button onClick={() => abrirModalEditar(srv)} className="flex-1 py-3.5 rounded-2xl bg-[#F7F5FF] text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5] hover:bg-[#E8DEFF]/40 hover:text-[#5B3DF5] transition-all active:scale-95 border border-[#EDE8F7]">
                    Editar
                  </button>
                  <button onClick={() => eliminarServicio(srv.id)} className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/20 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-8 md:p-10 animate-in slide-in-from-bottom-full duration-500 border border-[#EDE8F7] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#5B3DF5]/10 blur-[80px]" />
            </div>

            <div className="flex justify-between items-center mb-10 relative z-10">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-[#1A1630] leading-none">{modoEdicion ? vocab.editarServicio : vocab.nuevoServicio}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A09CB5]">Catálogo de servicios</p>
                </div>
              </div>
              <button onClick={() => setModalAbierto(false)} className="w-12 h-12 bg-[#F7F5FF] hover:bg-[#E8DEFF]/40 rounded-2xl flex items-center justify-center text-[#A09CB5] hover:text-[#5B3DF5] transition-all active:scale-90 border border-[#EDE8F7]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>

            <form onSubmit={guardarServicio} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#A09CB5] ml-2">Nombre del {vocab.servicio}</label>
                <input
                  required
                  className="w-full p-5 bg-[#F7F5FF] rounded-2xl outline-none font-bold text-[#1A1630] border border-[#EDE8F7] focus:border-[#5B3DF5] focus:bg-white transition-all text-base placeholder:text-[#A09CB5]"
                  placeholder={vocab.placeholderServicio}
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#A09CB5] ml-2">Duración (Mins)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full p-5 bg-[#F7F5FF] rounded-2xl outline-none font-bold text-[#1A1630] border border-[#EDE8F7] focus:border-[#5B3DF5] focus:bg-white transition-all text-base placeholder:text-[#A09CB5]"
                    placeholder="Ej: 30"
                    value={form.duracion}
                    onChange={e => setForm({ ...form, duracion: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#A09CB5] ml-2">Precio Total ($)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full p-5 bg-[#F7F5FF] rounded-2xl outline-none font-bold text-[#1A1630] border border-[#EDE8F7] focus:border-[#5B3DF5] focus:bg-white transition-all text-base placeholder:text-[#A09CB5]"
                    placeholder="Ej: 5000"
                    value={form.precio}
                    onChange={e => setForm({ ...form, precio: e.target.value })}
                  />
                </div>
              </div>

              <button
                disabled={guardando}
                type="submit"
                className="w-full py-6 rounded-2xl bg-[#5B3DF5] text-white font-black text-xs tracking-[0.3em] uppercase shadow-2xl shadow-[#5B3DF5]/40 active:scale-95 transition-all flex justify-center items-center gap-3 mt-4 hover:bg-[#5B3DF5] border border-white/20 disabled:opacity-30"
              >
                {guardando ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : (modoEdicion ? `Actualizar ${vocab.servicio}` : 'Confirmar y Guardar')}
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