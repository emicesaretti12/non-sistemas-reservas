import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'
import { useToast } from './Toast'
import { useConfirm } from '../contexts/ConfirmContext'

// Explicit class map — Tailwind JIT cannot detect dynamically-built class names
const tipoMovClasses = {
  entrada: { active: 'bg-emerald-50 border-emerald-300 text-emerald-700', icon: '↑' },
  salida: { active: 'bg-red-50 border-red-300 text-red-700', icon: '↓' },
  ajuste: { active: 'bg-blue-50 border-blue-300 text-blue-700', icon: '⇄' }
}

export default function Inventario({ negocioId, rubro }) {
  const toast = useToast()
  const { showConfirm } = useConfirm()
  const vocab = getVocabulario(rubro)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalMovimiento, setModalMovimiento] = useState(null)
  const [movForm, setMovForm] = useState({ tipo: 'entrada', cantidad: '', motivo: '' })

  const [form, setForm] = useState({
    nombre: '', descripcion: '', categoria: 'General',
    cantidad: 0, stock_minimo: 5, precio_costo: 0,
    precio_venta: 0, unidad: 'unidad'
  })

  const categorias = ['General', 'Insumos', 'Productos', 'Herramientas', 'Limpieza', 'Otros']

  // --- CATÁLOGO (VIDRIERA) ---
  const [seccion, setSeccion] = useState('inventario') // 'inventario' | 'catalogo'
  const [catItems, setCatItems] = useState([])
  const [catModal, setCatModal] = useState(false)
  const [catEdicion, setCatEdicion] = useState(null)
  const [subiendoImg, setSubiendoImg] = useState(false)
  const [catForm, setCatForm] = useState({
    nombre: '', descripcion: '', categoria: 'General', precio: 0, imagen_url: '', activo: true
  })
  const catCategorias = ['General', 'Destacados', 'Nuevos', 'Ofertas', 'Accesorios', 'Otros']

  useEffect(() => { if (negocioId) cargar() }, [negocioId])

  // Scroll lock for modals — prevents background bounce on iOS
  useEffect(() => {
    if (modalAbierto || modalMovimiento || catModal) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => { document.body.style.overflow = ''; document.body.style.touchAction = '' }
  }, [modalAbierto, modalMovimiento, catModal])

  async function cargar() {
    setLoading(true)
    try {
      const [invRes, catRes] = await Promise.all([
        supabase.from('inventario').select('*').eq('negocio_id', negocioId).eq('activo', true).order('nombre', { ascending: true }),
        supabase.from('catalogo_productos').select('*').eq('negocio_id', negocioId).order('orden').order('nombre')
      ])
      if (invRes.error) throw invRes.error
      setItems(invRes.data || [])
      setCatItems(catRes.data || [])
    } catch (e) {
      console.error('Error cargando:', e.message)
    } finally { setLoading(false) }
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (modoEdicion) {
        const { error } = await supabase.from('inventario')
          .update({ ...form, actualizado_en: new Date().toISOString() })
          .eq('id', modoEdicion)
        if (error) throw error
      } else {
        const { error } = await supabase.from('inventario')
          .insert({ ...form, negocio_id: negocioId })
        if (error) throw error
      }
      cerrarModal()
      cargar()
      toast.success('Producto guardado con éxito')
    } catch (e) {
      toast.error('Error: ' + e.message)
    } finally { setGuardando(false) }
  }

  async function registrarMovimiento(e) {
    e.preventDefault()
    if (!movForm.cantidad || parseInt(movForm.cantidad) <= 0) {
      toast.warning('Cantidad inválida')
      return
    }
    setGuardando(true)
    try {
      const cant = parseInt(movForm.cantidad)
      const item = items.find(i => i.id === modalMovimiento)
      let nuevaCantidad = item.cantidad

      if (movForm.tipo === 'entrada') nuevaCantidad += cant
      else if (movForm.tipo === 'salida') nuevaCantidad = Math.max(0, nuevaCantidad - cant)
      else nuevaCantidad = cant

      const { error: movErr } = await supabase.from('movimientos_stock')
        .insert({ inventario_id: modalMovimiento, negocio_id: negocioId, tipo: movForm.tipo, cantidad: cant, motivo: movForm.motivo })
      if (movErr) throw movErr

      const { error: upErr } = await supabase.from('inventario')
        .update({ cantidad: nuevaCantidad, actualizado_en: new Date().toISOString() })
        .eq('id', modalMovimiento)
      if (upErr) throw upErr

      setModalMovimiento(null)
      setMovForm({ tipo: 'entrada', cantidad: '', motivo: '' })
      cargar()
    } catch (e) { toast.error('Error: ' + e.message) }
    finally { setGuardando(false) }
  }

  async function eliminar(id) {
    showConfirm({
      title: 'Desactivar Producto',
      message: '¿Desactivar este producto del inventario?',
      confirmText: 'Desactivar',
      isDestructive: true,
      onConfirm: async () => {
        await supabase.from('inventario').update({ activo: false }).eq('id', id)
        cargar()
        toast.success('Producto desactivado')
      }
    })
  }

  function abrirEdicion(item) {
    setForm({ nombre: item.nombre, descripcion: item.descripcion || '', categoria: item.categoria, cantidad: item.cantidad, stock_minimo: item.stock_minimo, precio_costo: item.precio_costo, precio_venta: item.precio_venta, unidad: item.unidad })
    setModoEdicion(item.id)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setModoEdicion(null)
    setForm({ nombre: '', descripcion: '', categoria: 'General', cantidad: 0, stock_minimo: 5, precio_costo: 0, precio_venta: 0, unidad: 'unidad' })
  }

  // === CATÁLOGO CRUD ===
  async function subirImagenCatalogo(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendoImg(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', 'non_sistemas')
    fd.append('cloud_name', 'ddp4r9dlu')
    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/ddp4r9dlu/image/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.secure_url) {
        setCatForm(prev => ({ ...prev, imagen_url: data.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_600/') }))
      }
    } catch { toast.error('Error al subir imagen') }
    finally { setSubiendoImg(false) }
  }

  async function guardarCatalogo(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (catEdicion) {
        const { error } = await supabase.from('catalogo_productos').update({ ...catForm, updated_at: new Date().toISOString() }).eq('id', catEdicion)
        if (error) throw error
      } else {
        const { error } = await supabase.from('catalogo_productos').insert({ ...catForm, negocio_id: negocioId })
        if (error) throw error
      }
      cerrarCatModal()
      cargar()
    } catch (e) { toast.error('Error: ' + e.message) }
    finally { setGuardando(false) }
  }

  function abrirCatEdicion(item) {
    setCatForm({ nombre: item.nombre, descripcion: item.descripcion || '', categoria: item.categoria, precio: item.precio, imagen_url: item.imagen_url || '', activo: item.activo })
    setCatEdicion(item.id)
    setCatModal(true)
  }

  function cerrarCatModal() {
    setCatModal(false)
    setCatEdicion(null)
    setCatForm({ nombre: '', descripcion: '', categoria: 'General', precio: 0, imagen_url: '', activo: true })
  }

  async function eliminarCatalogo(id) {
    showConfirm({
      title: 'Eliminar del Catálogo',
      message: '¿Eliminar este producto del catálogo?',
      confirmText: 'Eliminar',
      isDestructive: true,
      onConfirm: async () => {
        await supabase.from('catalogo_productos').delete().eq('id', id)
        cargar()
        toast.success('Producto eliminado del catálogo')
      }
    })
  }

  const getNivelStock = (item) => {
    if (item.cantidad <= 0) return { color: 'bg-red-500', text: 'Sin Stock', ring: 'ring-red-100' }
    if (item.cantidad <= item.stock_minimo) return { color: 'bg-amber-500', text: 'Bajo', ring: 'ring-amber-100' }
    return { color: 'bg-emerald-500', text: 'OK', ring: 'ring-emerald-100' }
  }

  const itemsFiltrados = items
    .filter(i => filtro === 'todos' || i.categoria === filtro)
    .filter(i => !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  const totalValor = items.reduce((a, i) => a + (i.cantidad * i.precio_venta), 0)
  const stockBajo = items.filter(i => i.cantidad <= i.stock_minimo).length
  const categoriasUsadas = [...new Set(items.map(i => i.categoria))]

  if (loading) return (
    <div className="flex justify-center items-center h-48">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="space-y-4 animate-in fade-in duration-700 pb-28 md:pb-4">

      {/* SECTION TABS */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
        <button onClick={() => setSeccion('inventario')} className={`flex-1 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${seccion === 'inventario' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Stock
        </button>
        <button onClick={() => setSeccion('catalogo')} className={`flex-1 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${seccion === 'catalogo' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Catálogo
        </button>
      </div>

      {/* ===== SECCIÓN: INVENTARIO (STOCK) ===== */}
      {seccion === 'inventario' && (<>
        <header className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-3xl font-bold tracking-tighter text-slate-900 leading-none">Inventario</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{items.length} productos registrados</p>
            </div>
            <button onClick={() => setModalAbierto(true)} className="px-4 md:px-6 py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
              Agregar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-center">
              <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Total</p>
              <p className="text-lg md:text-2xl font-black text-slate-900 tracking-tight mt-0.5">${totalValor.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-center">
              <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Productos</p>
              <p className="text-lg md:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{items.length}</p>
            </div>
            <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-center ${stockBajo > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stock Bajo</p>
              <p className={`text-lg md:text-2xl font-black tracking-tight mt-0.5 ${stockBajo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{stockBajo}</p>
            </div>
          </div>
        </header>

        {/* FILTROS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setFiltro('todos')} className={`px-4 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all shrink-0 ${filtro === 'todos' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>Todos</button>
          {categoriasUsadas.map(c => (
            <button key={c} onClick={() => setFiltro(c)} className={`px-4 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all shrink-0 ${filtro === c ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>{c}</button>
          ))}
        </div>

        {/* BÚSQUEDA */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <input type="text" placeholder="Buscar producto..." className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 transition-all font-medium text-slate-900 shadow-sm" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>

        {/* LISTADO */}
        {itemsFiltrados.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sin productos</p>
            <p className="text-xs text-slate-400 mt-1">Agregá tu primer producto al inventario</p>
          </div>
        ) : (
          <div className="space-y-2">
            {itemsFiltrados.map(item => {
              const nivel = getNivelStock(item)
              const margen = item.precio_venta > 0 && item.precio_costo > 0
                ? Math.round(((item.precio_venta - item.precio_costo) / item.precio_venta) * 100) : null
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 hover:border-slate-300 transition-all group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl ${nivel.ring} ring-4 ${nivel.color} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                      {item.cantidad}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{item.nombre}</p>
                        <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${nivel.color === 'bg-red-500' ? 'bg-red-50 text-red-600' : nivel.color === 'bg-amber-500' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{nivel.text}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.categoria}</span>
                        {item.precio_venta > 0 && <span className="text-[10px] font-bold text-emerald-600">${item.precio_venta}</span>}
                        {margen !== null && <span className="text-[9px] font-medium text-slate-400">{margen}% margen</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 justify-end border-t sm:border-none border-slate-50 pt-2 sm:pt-0">
                    <button onClick={() => { setModalMovimiento(item.id); setMovForm({ tipo: 'entrada', cantidad: '', motivo: '' }) }} className="w-10 h-10 md:w-9 md:h-9 rounded-xl md:rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-all active:scale-90" title="Movimiento de stock">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={() => abrirEdicion(item)} className="w-10 h-10 md:w-9 md:h-9 rounded-xl md:rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-all active:scale-90" title="Editar">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={() => eliminar(item.id)} className="w-10 h-10 md:w-9 md:h-9 rounded-xl md:rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all active:scale-90" title="Eliminar">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MODAL: AGREGAR / EDITAR PRODUCTO */}
        {modalAbierto && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl p-5 md:p-10 animate-in slide-in-from-bottom-[20%] duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-slate-900">{modoEdicion ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Control de inventario</p>
                </div>
                <button onClick={cerrarModal} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>

              <form onSubmit={guardar} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nombre del Producto</label>
                  <input required className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm" placeholder="Ej: Shampoo profesional" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Categoría</label>
                    <select className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none text-sm cursor-pointer" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Unidad</label>
                    <select className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none text-sm cursor-pointer" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
                      {['unidad', 'ml', 'litro', 'gr', 'kg', 'caja', 'paquete'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Cantidad</label>
                    <input type="number" min="0" className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Costo $</label>
                    <input type="number" min="0" step="0.01" className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm" value={form.precio_costo} onChange={e => setForm({ ...form, precio_costo: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Venta $</label>
                    <input type="number" min="0" step="0.01" className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Stock Mínimo (alerta)</label>
                  <input type="number" min="0" className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Descripción (opcional)</label>
                  <textarea className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm resize-none h-20" placeholder="Notas adicionales..." value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                </div>

                <button disabled={guardando} type="submit" className="w-full py-5 rounded-[1.2rem] bg-slate-900 text-white font-bold text-[10px] tracking-widest uppercase shadow-2xl active:scale-95 transition-all flex justify-center items-center gap-3 mt-4">
                  {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (modoEdicion ? 'Guardar Cambios' : 'Agregar al Inventario')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: MOVIMIENTO DE STOCK */}
        {modalMovimiento && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl p-5 md:p-8 animate-in slide-in-from-bottom-[20%] duration-500 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tighter text-slate-900">Movimiento de Stock</h2>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">{items.find(i => i.id === modalMovimiento)?.nombre}</p>
                </div>
                <button onClick={() => setModalMovimiento(null)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>

              <form onSubmit={registrarMovimiento} className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: 'entrada', label: 'Entrada' }, { id: 'salida', label: 'Salida' }, { id: 'ajuste', label: 'Ajuste' }].map(t => (
                    <button key={t.id} type="button" onClick={() => setMovForm({ ...movForm, tipo: t.id })} className={`p-3.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all active:scale-95 ${movForm.tipo === t.id ? tipoMovClasses[t.id].active : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Cantidad</label>
                  <input required type="number" min="1" className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm" placeholder="Ej: 10" value={movForm.cantidad} onChange={e => setMovForm({ ...movForm, cantidad: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Motivo (opcional)</label>
                  <input className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm" placeholder="Ej: Compra proveedor" value={movForm.motivo} onChange={e => setMovForm({ ...movForm, motivo: e.target.value })} />
                </div>
                <button disabled={guardando} type="submit" className="w-full py-5 rounded-[1.2rem] bg-slate-900 text-white font-bold text-[10px] tracking-widest uppercase shadow-2xl active:scale-95 transition-all">
                  {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : 'Registrar Movimiento'}
                </button>
              </form>
            </div>
          </div>
        )}

      </>)}

      {/* ===== SECCIÓN: CATÁLOGO (VIDRIERA) ===== */}
      {seccion === 'catalogo' && (<>
        <header className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl md:text-3xl font-bold tracking-tighter text-slate-900 leading-none">Catálogo</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Vidriera pública · {catItems.filter(c => c.activo).length} productos visibles</p>
            </div>
            <button onClick={() => setCatModal(true)} className="px-4 md:px-6 py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
              Nuevo
            </button>
          </div>
        </header>

        {/* LISTA DE PRODUCTOS DEL CATÁLOGO */}
        {catItems.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sin productos en el catálogo</p>
            <p className="text-xs text-slate-400 mt-1">Agregá productos para mostrar en tu vidriera pública</p>
          </div>
        ) : (
          <div className="space-y-3">
            {catItems.map(item => (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${item.activo ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
                <div className="flex gap-0">
                  {/* IMAGEN */}
                  <div className="w-28 h-28 md:w-36 md:h-36 bg-slate-50 shrink-0 overflow-hidden">
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    )}
                  </div>
                  {/* INFO */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">{item.nombre}</h4>
                        {!item.activo && <span className="text-[7px] font-bold uppercase tracking-wider text-red-400 bg-red-50 px-1.5 py-0.5 rounded shrink-0">Oculto</span>}
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 block">{item.categoria}</span>
                      {item.descripcion && <p className="text-[10px] text-slate-400 font-medium mt-1 line-clamp-2 leading-relaxed">{item.descripcion}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {item.precio > 0 && <p className="text-lg font-black tracking-tight text-slate-900">${item.precio.toLocaleString()}</p>}
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => abrirCatEdicion(item)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-all active:scale-90" title="Editar">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <button onClick={() => eliminarCatalogo(item.id)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all active:scale-90" title="Eliminar">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: AGREGAR / EDITAR CATÁLOGO */}
        {catModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl p-5 md:p-10 animate-in slide-in-from-bottom-[20%] duration-500 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-slate-900">{catEdicion ? 'Editar' : 'Nuevo'} Producto</h2>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Catálogo público</p>
                </div>
                <button onClick={cerrarCatModal} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>

              <form onSubmit={guardarCatalogo} className="space-y-4">
                {/* IMAGEN */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Imagen del producto</label>
                  <div className="relative">
                    {catForm.imagen_url ? (
                      <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-50">
                        <img src={catForm.imagen_url} className="w-full h-full object-cover" alt="Preview" />
                        <button type="button" onClick={() => setCatForm({ ...catForm, imagen_url: '' })} className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full aspect-[16/10] bg-[#F8FAFC] rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-slate-400 transition-all">
                        {subiendoImg ? (
                          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subir imagen</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={subirImagenCatalogo} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nombre del producto</label>
                  <input required className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 transition-all text-sm" placeholder="Ej: Crema hidratante premium" value={catForm.nombre} onChange={e => setCatForm({ ...catForm, nombre: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Categoría</label>
                    <select className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 appearance-none text-sm cursor-pointer" value={catForm.categoria} onChange={e => setCatForm({ ...catForm, categoria: e.target.value })}>
                      {catCategorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Precio $</label>
                    <input type="number" min="0" step="0.01" className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm" value={catForm.precio} onChange={e => setCatForm({ ...catForm, precio: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Descripción</label>
                  <textarea className="w-full p-4 bg-[#F8FAFC] rounded-[1.2rem] outline-none font-bold text-slate-900 border border-transparent focus:bg-white focus:border-slate-300 text-sm resize-none h-24" placeholder="Describí tu producto para tus clientes..." value={catForm.descripcion} onChange={e => setCatForm({ ...catForm, descripcion: e.target.value })} />
                </div>

                {/* TOGGLE VISIBLE */}
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-[1.2rem]">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Visible en catálogo</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">Los clientes pueden verlo en tu vidriera</p>
                  </div>
                  <button type="button" onClick={() => setCatForm({ ...catForm, activo: !catForm.activo })} className={`w-12 h-7 rounded-full transition-all relative ${catForm.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${catForm.activo ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>

                <button disabled={guardando} type="submit" className="w-full py-5 rounded-[1.2rem] bg-slate-900 text-white font-bold text-[10px] tracking-widest uppercase shadow-2xl active:scale-95 transition-all flex justify-center items-center gap-3 mt-4">
                  {guardando ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (catEdicion ? 'Guardar Cambios' : 'Publicar en Catálogo')}
                </button>
              </form>
            </div>
          </div>
        )}
      </>)}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
