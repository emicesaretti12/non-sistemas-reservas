import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'

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
      alert(`Error del servidor: ${error.message}`)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarServicio(id) {
    if (confirm('¿Desea eliminar este servicio? Ya no estará disponible para nuevas reservas.')) {
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', id)
        .eq('negocio_id', negocioId)

      if (error) {
        alert(`Error al eliminar: ${error.message}`)
      } else {
        setServicios(servicios.filter(s => s.id !== id))
      }
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

      <header className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-4 md:mb-6 shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-slate-900 leading-none">{vocab.servicioPlural}</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">
            {servicios.length} {vocab.servicios} configurados
          </p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="w-10 h-10 md:w-auto md:px-6 md:py-3 rounded-full md:rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all gap-2 hover:bg-slate-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
          <span className="hidden md:inline text-[11px] font-bold uppercase tracking-widest">{vocab.nuevoServicio}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {servicios.map((srv) => (
              <div key={srv.id} className="bg-white rounded-[1.5rem] p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between gap-4 group hover:border-slate-300 transition-all">

                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 leading-tight">{srv.nombre}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-[10px] font-bold text-slate-500 tracking-widest uppercase border border-slate-100">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {srv.duracion_minutos} min
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900 tracking-tighter">${srv.precio}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirModalEditar(srv)} className="flex-1 py-2 rounded-xl bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => eliminarServicio(srv.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-6 md:p-8 animate-in slide-in-from-bottom-full duration-500 border border-slate-100">

            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tighter text-slate-900">{modoEdicion ? vocab.editarServicio : vocab.nuevoServicio}</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Configuración del catálogo</p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>

            <form onSubmit={guardarServicio} className="space-y-4">

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre del {vocab.servicio}</label>
                <input
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300"
                  placeholder={vocab.placeholderServicio}
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Duración (Mins)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300"
                    placeholder="Ej: 30"
                    value={form.duracion}
                    onChange={e => setForm({ ...form, duracion: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Precio Total ($)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm placeholder:text-slate-300"
                    placeholder="Ej: 5000"
                    value={form.precio}
                    onChange={e => setForm({ ...form, precio: e.target.value })}
                  />
                </div>
              </div>

              <button
                disabled={guardando}
                type="submit"
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-[11px] tracking-widest uppercase shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3 mt-6 hover:bg-slate-800 disabled:opacity-50"
              >
                {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (modoEdicion ? `Actualizar ${vocab.servicio}` : 'Confirmar y Guardar')}
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