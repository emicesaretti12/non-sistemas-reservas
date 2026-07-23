import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'
import { useToast } from './Toast'
import { motion, AnimatePresence } from 'framer-motion'
import { IconBolt, IconCheckCircle, IconTrash, IconEdit } from './NoniIcons'

export default function ServiciosV2({ negocioId, rubro }) {
  const vocab = getVocabulario(rubro)
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [servicios, setServicios] = useState([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    duracion: '',
    precio: '',
    descripcion: '',
    categoria: 'general',
  })

  useEffect(() => {
    if (negocioId) cargarServicios()
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
      console.error('Error al cargar servicios:', error.message)
      toast('Error al cargar servicios', 'error')
    } finally {
      setLoading(false)
    }
  }

  const abrirModalCrear = () => {
    setModoEdicion(null)
    setForm({ nombre: '', duracion: '', precio: '', descripcion: '', categoria: 'general' })
    setModalAbierto(true)
  }

  const abrirModalEditar = (srv) => {
    setModoEdicion(srv.id)
    setForm({
      nombre: srv.nombre,
      duracion: srv.duracion_minutos || '',
      precio: srv.precio || '',
      descripcion: srv.descripcion || '',
      categoria: srv.categoria || 'general',
    })
    setModalAbierto(true)
  }

  async function guardarServicio(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.duracion || !form.precio) {
      toast('Completa todos los campos', 'error')
      return
    }

    setGuardando(true)
    try {
      const payload = {
        negocio_id: negocioId,
        nombre: form.nombre.trim(),
        duracion_minutos: Number(form.duracion),
        precio: Number(form.precio),
        descripcion: form.descripcion.trim(),
        categoria: form.categoria,
      }

      if (modoEdicion) {
        const { error } = await supabase.from('servicios').update(payload).eq('id', modoEdicion)
        if (error) throw error
        setServicios((prev) => prev.map((s) => (s.id === modoEdicion ? { ...s, ...payload } : s)))
        toast('Servicio actualizado ✓')
      } else {
        const { data, error } = await supabase.from('servicios').insert([payload]).select()
        if (error) throw error
        setServicios((prev) => [...prev, data[0]])
        toast('Servicio creado ✓')
      }

      setModalAbierto(false)
      setForm({ nombre: '', duracion: '', precio: '', descripcion: '', categoria: 'general' })
    } catch (error) {
      console.error('Error al guardar:', error.message)
      toast('Error al guardar servicio', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarServicio(id) {
    if (!window.confirm('¿Estás seguro de que querés eliminar este servicio?')) return

    try {
      const { error } = await supabase.from('servicios').delete().eq('id', id)
      if (error) throw error
      setServicios((prev) => prev.filter((s) => s.id !== id))
      toast('Servicio eliminado')
    } catch (error) {
      console.error('Error al eliminar:', error.message)
      toast('Error al eliminar servicio', 'error')
    }
  }

  const serviciosFiltrados = servicios.filter((s) =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <IconBolt className="w-8 h-8 text-sky-500" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Servicios</h2>
          <p className="text-sm text-slate-500 mt-1">
            {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} disponible{servicios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.button
          onClick={abrirModalCrear}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-gradient-to-r from-sky-500 to-sky-400 text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all"
        >
          + Nuevo Servicio
        </motion.button>
      </div>

      {/* Búsqueda */}
      {servicios.length > 0 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar servicio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:outline-none text-sm"
          />
          <svg className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      )}

      {/* Lista de servicios */}
      {serviciosFiltrados.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200"
        >
          <IconBolt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No hay servicios creados</p>
          <p className="text-sm text-slate-400 mt-1">Crea tu primer servicio para que los clientes puedan reservar</p>
          <motion.button
            onClick={abrirModalCrear}
            whileHover={{ scale: 1.05 }}
            className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg font-bold text-sm hover:bg-sky-600 transition-all"
          >
            Crear Servicio
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {serviciosFiltrados.map((servicio, idx) => (
              <motion.div
                key={servicio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-black text-slate-900 truncate">{servicio.nombre}</h3>
                      {servicio.categoria && servicio.categoria !== 'general' && (
                        <span className="px-2.5 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-full">
                          {servicio.categoria}
                        </span>
                      )}
                    </div>

                    {servicio.descripcion && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{servicio.descripcion}</p>
                    )}

                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                        <span className="text-sm font-bold text-slate-700">{servicio.duracion_minutos} min</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-sky-600">${servicio.precio?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      onClick={() => abrirModalEditar(servicio)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 bg-sky-100 hover:bg-sky-200 text-sky-600 rounded-lg transition-all"
                      title="Editar"
                    >
                      <IconEdit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => eliminarServicio(servicio.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <IconTrash className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalAbierto(false)}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-6">
                {modoEdicion ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h3>

              <form onSubmit={guardarServicio} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del servicio *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Corte Clásico"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Descripción</label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Describe tu servicio..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none text-sm h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Duración (min) *</label>
                    <input
                      type="number"
                      value={form.duracion}
                      onChange={(e) => setForm({ ...form, duracion: e.target.value })}
                      placeholder="30"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Precio ($) *</label>
                    <input
                      type="number"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Categoría</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="premium">Premium</option>
                    <option value="basico">Básico</option>
                    <option value="especial">Especial</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    type="submit"
                    disabled={guardando}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-sky-400 text-white font-black rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
