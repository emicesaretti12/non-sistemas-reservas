import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import Contador from './ui/Contador'
import Lente from './ui/Lente'
import { useConfirm } from '../contexts/ConfirmContext'
import { usePersistentState } from '../hooks/usePersistentState'

const CATEGORIAS = ['General', 'Insumos', 'Productos', 'Herramientas', 'Limpieza', 'Otros']

// Con una sola tinta el nivel no puede depender del color: lleno = urgente,
// contorno = atención, hundido = en orden.
// Semáforo de stock: rojo si no queda nada, ámbar si está por debajo del
// mínimo, verde si está en orden.
const STOCK_LEVELS = {
  critical: { chip: 'ui-chip--danger', label: 'Sin stock' },
  low: { chip: 'ui-chip--outline', label: 'Stock bajo' },
  ok: { chip: 'ui-chip--solid', label: 'En orden' },
}

export default function InventarioPro({ negocioId }) {
  const toast = useToast()
  const { showConfirm } = useConfirm()
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  const [filtro, setFiltro] = usePersistentState('ui:inventario:categoria', 'todos', { validar: (c) => c === 'todos' || CATEGORIAS.includes(c) })
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

  const categorias = CATEGORIAS

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
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="ns-skeleton" style={{ height: 96 }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="ns-skeleton" style={{ height: 96 }} />
          <div className="ns-skeleton" style={{ height: 96 }} />
          <div className="ns-skeleton" style={{ height: 96 }} />
        </div>
        <div className="ns-skeleton" style={{ height: 220 }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Header */}
      <header className="ui-card p-5 md:p-7 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="ui-head__title">Inventario</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="ns-live-dot" style={{ width: 7, height: 7 }} />
            <p className="ui-eyebrow">{items.length} productos cargados</p>
          </div>
        </div>
        <button onClick={() => setModalAbierto(true)} className="ui-btn ui-btn--primary shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">Nuevo producto</span>
        </button>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="ui-tile">
          <span className="ui-stat__label">Valor del stock</span>
          <span className="ui-stat__value"><Contador valor={totalValor} prefijo="$" /></span>
          <span className="ui-stat__foot">A precio de venta</span>
        </div>

        <div className="ui-tile">
          <span className="ui-stat__label">Productos</span>
          <span className="ui-stat__value"><Contador valor={items.length} /></span>
          <span className="ui-stat__foot">{categorias.length} categorías</span>
        </div>

        <div
          className="ui-tile"
          style={stockBajo > 0 ? { boxShadow: 'var(--ui-shadow), inset 0 0 0 2px var(--ns-primary)' } : undefined}
        >
          <span className="ui-stat__label">Para reponer</span>
          <span className="ui-stat__value"><Contador valor={stockBajo} /></span>
          <span className="ui-stat__foot">{stockBajo > 0 ? 'Revisalos antes de quedarte sin nada' : 'Todo en orden'}</span>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="ui-field pl-11"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="ui-segment w-max">
            {['todos', ...categorias].map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltro(cat)}
                className={filtro === cat ? 'is-active' : ''}
                aria-pressed={filtro === cat}
              >
                {filtro === cat && <Lente grupo="inventario-categoria" />}
                {cat === 'todos' ? 'Todos' : cat}
              </button>
            ))}
          </div>
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
              className="ui-card"
            >
              <div className="ui-empty">
                <span className="ui-pod ui-pod--sunken ui-pod--lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <p className="ui-empty__title">{busqueda || filtro !== 'todos' ? 'Nada con ese filtro' : 'Inventario vacío'}</p>
                <p className="ui-empty__text">
                  {busqueda || filtro !== 'todos'
                    ? 'Probá con otro nombre o volvé a "todos".'
                    : 'Cargá tus productos para llevar el stock desde acá.'}
                </p>
                <button onClick={() => setModalAbierto(true)} className="ui-btn ui-btn--primary mt-1">Nuevo producto</button>
              </div>
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
                  className="ui-tile"
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
                        <span className="ui-chip ui-chip--soft">{item.categoria}</span>
                        <span className={`ui-chip ${nivel.chip}`}>{nivel.label}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-display text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--ns-text)' }}>
                        {item.cantidad}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.06em] mt-1" style={{ color: 'var(--ns-text-muted)' }}>
                        {item.unidad}
                      </p>
                      <p className="text-[13px] font-bold mt-2 tabular-nums" style={{ color: 'var(--ns-text-secondary)' }}>
                        ${(item.cantidad * item.precio_venta).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setModalMovimiento(item.id)} className="ui-btn ui-btn--primary ui-btn--quiet flex-1">
                      Movimiento
                    </button>
                    <button onClick={() => abrirEdicion(item)} className="ui-btn ui-btn--quiet flex-1">
                      Editar
                    </button>
                    <button onClick={() => eliminar(item.id)} className="ui-icon-btn shrink-0" aria-label={`Desactivar ${item.nombre}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
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
            className="ui-scrim flex items-end md:items-center justify-center md:p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain ns-hoja ns-hoja--motion"
              style={{
                paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
              }}
              role="dialog"
              aria-modal="true"
              aria-label={modoEdicion ? 'Editar producto' : 'Nuevo producto'}
            >
              <div className="ui-sheet__handle md:hidden" />
              <div className="p-6 pt-3 md:p-8 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="ui-head__title text-2xl">{modoEdicion ? 'Editar producto' : 'Nuevo producto'}</h3>
                  <button type="button" onClick={cerrarModal} className="ui-icon-btn" aria-label="Cerrar">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                </div>

                <form onSubmit={guardar} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="ui-field"
                    required
                  />

                  <textarea
                    placeholder="Descripción"
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="ui-field resize-none h-20"
                  />

                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="ui-field"
                  >
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="ui-eyebrow">Cantidad</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={form.cantidad}
                        onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || 0 })}
                        className="ui-field"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="ui-eyebrow">Stock mínimo</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="5"
                        value={form.stock_minimo}
                        onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })}
                        className="ui-field"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="ui-eyebrow">Precio de costo</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="$0"
                        value={form.precio_costo}
                        onChange={(e) => setForm({ ...form, precio_costo: parseFloat(e.target.value) || 0 })}
                        className="ui-field"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="ui-eyebrow">Precio de venta</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="$0"
                        value={form.precio_venta}
                        onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })}
                        className="ui-field"
                      />
                    </label>
                  </div>

                  <button type="submit" disabled={guardando} className="ui-btn ui-btn--primary ui-btn--block">
                    {guardando ? 'Guardando…' : 'Guardar producto'}
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
            className="ui-scrim flex items-end md:items-center justify-center md:p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain ns-hoja ns-hoja--motion"
              style={{
                paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Registrar movimiento"
            >
              <div className="ui-sheet__handle md:hidden" />
              <div className="p-6 pt-3 md:p-8 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="ui-head__title text-2xl">Registrar movimiento</h3>
                  <button type="button" onClick={() => setModalMovimiento(null)} className="ui-icon-btn" aria-label="Cerrar">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                </div>

                <form onSubmit={registrarMovimiento} className="space-y-4">
                  <select
                    value={movForm.tipo}
                    onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value })}
                    className="ui-field"
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
                    className="ui-field"
                    required
                  />

                  <input
                    type="text"
                    placeholder="Motivo"
                    value={movForm.motivo}
                    onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })}
                    className="ui-field"
                  />

                  <button type="submit" disabled={guardando} className="ui-btn ui-btn--primary ui-btn--block">
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
