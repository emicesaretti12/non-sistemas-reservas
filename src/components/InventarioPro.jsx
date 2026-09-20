import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import { useConfirm } from '../contexts/ConfirmContext'

const STOCK_LEVELS = {
  critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Crítico' },
  low: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Bajo' },
  ok: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'OK' },
}

export default function InventarioPro({ negocioId }) {
  const toast = useToast()
  const { showConfirm } = useConfirm()
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalMovimiento, setModalMovimiento] = useState(null)
  
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'General',
    cantidad: 0,
    stock_minimo: 5,
    precio_costo: 0,
    precio_venta: 0,
    unidad: 'unidad'
  })

  const [movForm, setMovForm] = useState({
    tipo: 'entrada',
    cantidad: '',
    motivo: ''
  })

  const categorias = ['General', 'Insumos', 'Productos', 'Herramientas', 'Limpieza', 'Otros']

  useEffect(() => {
    if (negocioId) cargar()
  }, [negocioId])

  useEffect(() => {
    if (modalAbierto || modalMovimiento) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modalAbierto, modalMovimiento])

  async function cargar() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .eq('negocio_id', negocioId)
        .eq('activo', true)
        .order('nombre', { ascending: true })
      
      if (error) throw error
      setItems(data || [])
    } catch (e) {
      console.error('Error cargando inventario:', e.message)
      // Si la tabla todavía no existe (migración sin correr), avisamos claro.
      toast.error(/relation .* does not exist/i.test(e.message)
        ? 'El inventario no está habilitado todavía. Ejecutá la migración de la base.'
        : 'No pudimos cargar el inventario. Revisá tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  async function guardar(e) {
    e.preventDefault()

    const nombre = String(form.nombre || '').trim()
    if (!nombre) return toast.error('Poné un nombre para el producto.')

    const numero = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
    if (numero(form.cantidad) < 0) return toast.error('La cantidad no puede ser negativa.')
    if (numero(form.precio_costo) < 0 || numero(form.precio_venta) < 0) {
      return toast.error('Los precios no pueden ser negativos.')
    }

    const payload = {
      nombre,
      descripcion: String(form.descripcion || '').trim(),
      categoria: form.categoria || 'General',
      cantidad: Math.round(numero(form.cantidad)),
      stock_minimo: Math.max(0, Math.round(numero(form.stock_minimo))),
      precio_costo: numero(form.precio_costo),
      precio_venta: numero(form.precio_venta),
      unidad: form.unidad || 'unidad',
    }

    setGuardando(true)
    try {
      if (modoEdicion) {
        const { error } = await supabase
          .from('inventario')
          .update({ ...payload, actualizado_en: new Date().toISOString() })
          .eq('id', modoEdicion)
          .eq('negocio_id', negocioId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('inventario')
          .insert({ ...payload, negocio_id: negocioId })
        if (error) throw error
      }
      cerrarModal()
      cargar()
      toast.success('Producto guardado')
    } catch (e) {
      toast.error('No se pudo guardar: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function registrarMovimiento(e) {
    e.preventDefault()
    if (!movForm.cantidad || parseInt(movForm.cantidad, 10) <= 0) {
      toast.error('Poné una cantidad mayor a cero.')
      return
    }
    
    setGuardando(true)
    try {
      const cant = parseInt(movForm.cantidad, 10)
      const item = items.find(i => i.id === modalMovimiento)
      if (!item) { toast.error('No encontramos el producto.'); setGuardando(false); return }
      let nuevaCantidad = Number(item.cantidad) || 0

      if (movForm.tipo === 'entrada') nuevaCantidad += cant
      else if (movForm.tipo === 'salida') nuevaCantidad = Math.max(0, nuevaCantidad - cant)
      else nuevaCantidad = cant

      await supabase.from('movimientos_stock').insert({
        inventario_id: modalMovimiento,
        negocio_id: negocioId,
        tipo: movForm.tipo,
        cantidad: cant,
        motivo: movForm.motivo
      })

      const { error: errStock } = await supabase
        .from('inventario')
        .update({ cantidad: nuevaCantidad, actualizado_en: new Date().toISOString() })
        .eq('id', modalMovimiento)
        .eq('negocio_id', negocioId)
      if (errStock) throw errStock

      setModalMovimiento(null)
      setMovForm({ tipo: 'entrada', cantidad: '', motivo: '' })
      cargar()
      toast.success(`Stock actualizado: ${nuevaCantidad} ${item.unidad || 'u'}`)
    } catch (e) {
      toast.error('No se pudo registrar el movimiento: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id) {
    showConfirm({
      title: 'Desactivar Producto',
      message: '¿Desactivar este producto del inventario?',
      confirmText: 'Desactivar',
      isDestructive: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from('inventario')
          .update({ activo: false })
          .eq('id', id)
          .eq('negocio_id', negocioId)
        cargar()
        if (error) toast.error('No se pudo desactivar el producto.')
        else toast.success('Producto desactivado')
      }
    })
  }

  function abrirEdicion(item) {
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      categoria: item.categoria,
      cantidad: item.cantidad,
      stock_minimo: item.stock_minimo,
      precio_costo: item.precio_costo,
      precio_venta: item.precio_venta,
      unidad: item.unidad
    })
    setModoEdicion(item.id)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setModoEdicion(null)
    setForm({
      nombre: '',
      descripcion: '',
      categoria: 'General',
      cantidad: 0,
      stock_minimo: 5,
      precio_costo: 0,
      precio_venta: 0,
      unidad: 'unidad'
    })
  }

  function getNivelStock(item) {
    if (item.cantidad <= 0) return STOCK_LEVELS.critical
    if (item.cantidad <= item.stock_minimo) return STOCK_LEVELS.low
    return STOCK_LEVELS.ok
  }

  const itemsFiltrados = items
    .filter(i => filtro === 'todos' || i.categoria === filtro)
    .filter(i => !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  const totalValor = items.reduce((a, i) => a + (i.cantidad * i.precio_venta), 0)
  const stockBajo = items.filter(i => i.cantidad <= i.stock_minimo).length

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Header */}
      <div className="ns-stat-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--ns-text)' }}>
              Inventario
            </h2>
            <p className="text-sm md:text-base font-medium" style={{ color: 'var(--ns-text-muted)' }}>
              Gestiona tu stock y productos con precisión
            </p>
          </div>
          <motion.button
            onClick={() => setModalAbierto(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 text-white"
            style={{ background: 'var(--ns-primary)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ns-stat-card"
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ns-text-muted)' }}>
            Valor Total
          </p>
          <p className="text-2xl md:text-3xl font-black" style={{ color: 'var(--ns-primary)' }}>
            ${totalValor.toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ns-stat-card"
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ns-text-muted)' }}>
            Productos
          </p>
          <p className="text-2xl md:text-3xl font-black" style={{ color: 'var(--ns-primary)' }}>
            {items.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="ns-stat-card"
          style={{
            background: stockBajo > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--ns-surface)'
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ns-text-muted)' }}>
            Stock Bajo
          </p>
          <p className="text-2xl md:text-3xl font-black" style={{ color: stockBajo > 0 ? '#ef4444' : '#10b981' }}>
            {stockBajo}
          </p>
        </motion.div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="ns-input pl-10"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
          {['todos', ...categorias].map((cat) => (
            <motion.button
              key={cat}
              onClick={() => setFiltro(cat)}
              whileHover={{ y: -2 }}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                filtro === cat
                  ? 'text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={
                filtro === cat
                  ? { background: 'var(--ns-primary)' }
                  : { background: 'var(--ns-surface)' }
              }
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lista de Productos */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {itemsFiltrados.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ns-stat-card text-center py-12"
            >
              <p style={{ color: 'var(--ns-text-muted)' }}>No hay productos que coincidan con tu búsqueda</p>
            </motion.div>
          ) : (
            itemsFiltrados.map((item, idx) => {
              const nivel = getNivelStock(item)
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                  className="ns-stat-card hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm md:text-base mb-1" style={{ color: 'var(--ns-text)' }}>
                        {item.nombre}
                      </h3>
                      {item.descripcion && (
                        <p className="text-xs mb-2" style={{ color: 'var(--ns-text-muted)' }}>
                          {item.descripcion}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--ns-primary-bg)', color: 'var(--ns-primary)' }}>
                          {item.categoria}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: nivel.bg, color: nivel.color }}>
                          {nivel.label}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg md:text-xl font-black" style={{ color: 'var(--ns-primary)' }}>
                        {item.cantidad}
                      </p>
                      <p className="text-xs mb-2" style={{ color: 'var(--ns-text-muted)' }}>
                        {item.unidad}
                      </p>
                      <p className="text-sm font-bold mb-3" style={{ color: 'var(--ns-text)' }}>
                        ${(item.cantidad * item.precio_venta).toLocaleString()}
                      </p>

                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => setModalMovimiento(item.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all"
                          style={{ background: 'var(--ns-primary)' }}
                        >
                          Movimiento
                        </motion.button>
                        <motion.button
                          onClick={() => abrirEdicion(item)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ background: 'var(--ns-surface)', color: 'var(--ns-primary)' }}
                        >
                          Editar
                        </motion.button>
                        <motion.button
                          onClick={() => eliminar(item.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-3 py-2 rounded-lg text-xs font-bold text-white transition-all bg-red-500 hover:bg-red-600"
                        >
                          ✕
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Modal Producto */}
      <AnimatePresence>
        {modalAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cerrarModal}
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl md:rounded-2xl w-full md:max-w-md md:max-h-96 overflow-y-auto"
            >
              <div className="p-6 md:p-8 space-y-4">
                <h3 className="text-xl font-black" style={{ color: 'var(--ns-text)' }}>
                  {modoEdicion ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>

                <form onSubmit={guardar} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="ns-input"
                    required
                  />

                  <textarea
                    placeholder="Descripción"
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="ns-input resize-none h-20"
                  />

                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="ns-input"
                  >
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={form.cantidad}
                      onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || 0 })}
                      className="ns-input"
                    />
                    <input
                      type="number"
                      placeholder="Stock Mín."
                      value={form.stock_minimo}
                      onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })}
                      className="ns-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Precio Costo"
                      value={form.precio_costo}
                      onChange={(e) => setForm({ ...form, precio_costo: parseFloat(e.target.value) || 0 })}
                      className="ns-input"
                    />
                    <input
                      type="number"
                      placeholder="Precio Venta"
                      value={form.precio_venta}
                      onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })}
                      className="ns-input"
                    />
                  </div>

                  <button type="submit" disabled={guardando} className="ns-btn-primary">
                    {guardando ? 'Guardando...' : 'Guardar Producto'}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Movimiento */}
      <AnimatePresence>
        {modalMovimiento && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalMovimiento(null)}
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl md:rounded-2xl w-full md:max-w-md overflow-y-auto"
            >
              <div className="p-6 md:p-8 space-y-4">
                <h3 className="text-xl font-black" style={{ color: 'var(--ns-text)' }}>
                  Registrar Movimiento
                </h3>

                <form onSubmit={registrarMovimiento} className="space-y-4">
                  <select
                    value={movForm.tipo}
                    onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value })}
                    className="ns-input"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={movForm.cantidad}
                    onChange={(e) => setMovForm({ ...movForm, cantidad: e.target.value })}
                    className="ns-input"
                    required
                  />

                  <input
                    type="text"
                    placeholder="Motivo"
                    value={movForm.motivo}
                    onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })}
                    className="ns-input"
                  />

                  <button type="submit" disabled={guardando} className="ns-btn-primary">
                    {guardando ? 'Registrando...' : 'Registrar Movimiento'}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
