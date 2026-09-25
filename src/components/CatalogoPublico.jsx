import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import { useConfirm } from '../contexts/ConfirmContext'
import { haptic } from '../utils/haptics'
import Lente from './ui/Lente'
import { pesos } from '../utils/formato'

/**
 * Catálogo público: la vidriera de productos que ven los clientes en la
 * pestaña "Catálogo" de la app de reservas (tabla `catalogo_productos`).
 *
 * Es distinto del inventario: el inventario es el stock interno del local
 * (insumos, cantidades, costos); el catálogo es lo que se muestra y se puede
 * pedir por WhatsApp desde el link público, con foto, precio y descripción.
 *
 * Este editor existía dentro del inventario viejo. Cuando el inventario se
 * reemplazó por la versión nueva el editor quedó sin ningún botón que lo
 * abriera, y después el archivo se borró como código muerto: la vidriera
 * seguía mostrándose, pero ya no se podía cargar ni cambiar nada.
 */

const CATEGORIAS_BASE = ['General', 'Destacados', 'Nuevos', 'Ofertas', 'Accesorios', 'Otros']
const VACIO = { nombre: '', descripcion: '', categoria: 'General', precio: '', imagen_url: '', activo: true }

const formatoPrecio = pesos

// La tabla no existe en la base (no se corrió sql/legacy/sql_catalogo.sql).
const faltaTabla = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || ''))

// Mismo servicio y preset que el logo, la portada y las fotos del equipo.
async function subirImagen(archivo) {
  const fd = new FormData()
  fd.append('file', archivo)
  fd.append('upload_preset', 'non_sistemas')
  fd.append('cloud_name', 'ddp4r9dlu')
  const res = await fetch('https://api.cloudinary.com/v1_1/ddp4r9dlu/image/upload', { method: 'POST', body: fd })
  const data = await res.json()
  if (!data.secure_url) throw new Error(data.error?.message || 'La imagen no se pudo subir')
  // Cuadrada y liviana: la vidriera la muestra en un recuadro 1:1.
  return data.secure_url.replace('/upload/', '/upload/c_fill,ar_1:1,w_800,q_auto,f_auto/')
}

const IconoFoto = ({ className = 'w-7 h-7' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconoOjo = ({ abierto }) => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
    {abierto ? (
      <>
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
)

export default function CatalogoPublico({ negocioId, publicLink }) {
  const toast = useToast()
  const { showConfirm } = useConfirm()

  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [sinTabla, setSinTabla] = useState(false)
  const [filtro, setFiltro] = useState('todos')

  // Hoja de alta/edición: null cerrada, { id: null } nuevo, { id } editando.
  const [hoja, setHoja] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  const cargar = useCallback(async () => {
    if (!negocioId) return
    try {
      const { data, error } = await supabase
        .from('catalogo_productos')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('orden')
        .order('nombre')
      if (error) throw error
      setSinTabla(false)
      setItems(data || [])
    } catch (e) {
      if (faltaTabla(e)) setSinTabla(true)
      else {
        console.error('Error cargando el catálogo:', e.message)
        toast.error('No pudimos cargar el catálogo. Revisá tu conexión.')
      }
    } finally {
      setCargando(false)
    }
  }, [negocioId, toast])

  useEffect(() => { cargar() }, [cargar])

  // En escritorio la hoja es un diálogo sobre la página: que no scrollee atrás.
  useEffect(() => {
    if (!hoja) return undefined
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previo }
  }, [hoja])

  const categorias = useMemo(() => {
    const usadas = [...new Set(items.map((i) => i.categoria).filter(Boolean))]
    return usadas
  }, [items])

  const opcionesCategoria = useMemo(
    () => [...new Set([...CATEGORIAS_BASE, ...categorias, form.categoria].filter(Boolean))],
    [categorias, form.categoria],
  )

  const visibles = items.filter((i) => i.activo).length
  const ocultos = items.length - visibles
  const filtrados = items.filter((i) => filtro === 'todos' || i.categoria === filtro)

  const abrirNuevo = () => {
    haptic()
    setForm({ ...VACIO, categoria: filtro !== 'todos' ? filtro : 'General' })
    setHoja({ id: null })
  }

  const abrirEdicion = (item) => {
    haptic()
    setForm({
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      categoria: item.categoria || 'General',
      precio: item.precio ?? '',
      imagen_url: item.imagen_url || '',
      activo: item.activo !== false,
    })
    setHoja({ id: item.id })
  }

  const cerrar = () => {
    if (guardando) return
    setHoja(null)
    setForm(VACIO)
  }

  async function alSubirImagen(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    if (!archivo.type.startsWith('image/')) {
      toast.error('Elegí una imagen (JPG, PNG o WEBP).')
      return
    }
    setSubiendo(true)
    try {
      const url = await subirImagen(archivo)
      setForm((f) => ({ ...f, imagen_url: url }))
    } catch {
      toast.error('No pudimos subir la imagen. Revisá tu conexión y reintentá.')
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar(e) {
    e.preventDefault()
    const nombre = form.nombre.trim()
    if (nombre.length < 2) {
      toast.error('Escribí el nombre del producto.')
      return
    }
    const precio = form.precio === '' ? 0 : Number(form.precio)
    if (!Number.isFinite(precio) || precio < 0) {
      toast.error('Revisá el precio: tiene que ser un número.')
      return
    }

    const datos = {
      nombre,
      descripcion: form.descripcion.trim(),
      categoria: form.categoria || 'General',
      precio,
      imagen_url: form.imagen_url || '',
      activo: form.activo,
    }

    setGuardando(true)
    try {
      if (hoja?.id) {
        const { error } = await supabase
          .from('catalogo_productos')
          .update({ ...datos, updated_at: new Date().toISOString() })
          .eq('id', hoja.id)
        if (error) throw error
        toast.success('Cambios guardados')
      } else {
        // Los nuevos van al final de la vidriera.
        const orden = items.reduce((max, i) => Math.max(max, i.orden || 0), 0) + 1
        const { error } = await supabase
          .from('catalogo_productos')
          .insert({ ...datos, orden, negocio_id: negocioId })
        if (error) throw error
        toast.success(datos.activo ? 'Producto publicado en tu catálogo' : 'Producto guardado (oculto)')
      }
      haptic('success')
      setHoja(null)
      setForm(VACIO)
      cargar()
    } catch (err) {
      if (faltaTabla(err)) setSinTabla(true)
      toast.error('No pudimos guardar el producto. Revisá tu conexión y reintentá.')
    } finally {
      setGuardando(false)
    }
  }

  // Mostrar/ocultar desde la lista, sin abrir la hoja. Se ve al instante y
  // se deshace si la base no lo acepta.
  async function alternarVisible(item) {
    haptic('select')
    const activo = !item.activo
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, activo } : i)))
    const { error } = await supabase
      .from('catalogo_productos')
      .update({ activo, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, activo: item.activo } : i)))
      toast.error('No pudimos cambiarlo. Revisá tu conexión.')
      return
    }
    toast.success(activo ? `"${item.nombre}" ya se ve en tu catálogo` : `"${item.nombre}" quedó oculto`)
  }

  function eliminar(item) {
    showConfirm({
      title: 'Eliminar del catálogo',
      message: `"${item.nombre}" deja de aparecer en tu vidriera. No se puede deshacer; si sólo querés sacarlo por un tiempo, ocultalo.`,
      confirmText: 'Eliminar',
      isDestructive: true,
      onConfirm: async () => {
        const { error } = await supabase.from('catalogo_productos').delete().eq('id', item.id)
        if (error) {
          toast.error('No pudimos eliminarlo. Revisá tu conexión.')
          return
        }
        setHoja(null)
        setForm(VACIO)
        setItems((prev) => prev.filter((i) => i.id !== item.id))
        toast.success('Producto eliminado del catálogo')
      },
    })
  }

  const verComoCliente = () => {
    if (!publicLink) return
    window.open(`${publicLink}#catalogo`, '_blank', 'noopener')
  }

  const editando = hoja?.id ? items.find((i) => i.id === hoja.id) : null

  return (
    <div className="flex flex-col gap-5 ns-tab-content-enter" data-testid="catalogo-publico">
      {/* Cabecera */}
      <header className="ns-cabecera ns-cabecera--bloque">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="ui-head__title">Catálogo</h2>
            <div className="flex items-center gap-2 mt-2">
              <p className="ui-eyebrow">
                {visibles} {visibles === 1 ? 'visible' : 'visibles'}
                {ocultos > 0 ? ` · ${ocultos} ${ocultos === 1 ? 'oculto' : 'ocultos'}` : ''}
              </p>
            </div>
          </div>
          <button onClick={abrirNuevo} className="ui-btn ui-btn--primary shrink-0" disabled={sinTabla} aria-label="Nuevo producto" data-testid="catalogo-nuevo">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
            <span className="hidden sm:inline">Nuevo producto</span>
          </button>
        </div>
        <p className="text-[13px] leading-relaxed mt-3" style={{ color: 'var(--ns-text-muted)' }}>
          Lo que cargues acá aparece en la pestaña <b style={{ color: 'var(--ns-text-secondary)' }}>Catálogo</b> de tu link de reservas, y tus clientes te lo pueden pedir por WhatsApp.
        </p>
        {publicLink && items.length > 0 && (
          <button onClick={verComoCliente} className="ui-btn ui-btn--quiet mt-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Ver como cliente
          </button>
        )}
      </header>

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="ns-skeleton rounded-[24px]" style={{ height: 124 }} />)}
        </div>
      ) : sinTabla ? (
        <div className="ui-card">
          <div className="ui-empty">
            <span className="ui-pod ui-pod--amber ui-pod--lg"><IconoFoto className="w-6 h-6" /></span>
            <p className="ui-empty__title">El catálogo no está activado en la base de datos</p>
            <p className="ui-empty__text">
              Falta crear la tabla <code>catalogo_productos</code>. Corré el script <code>sql/legacy/sql_catalogo.sql</code> en el SQL Editor de Supabase y volvé a entrar.
            </p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="ui-card">
          <div className="ui-empty">
            <span className="ui-pod ui-pod--sunken ui-pod--lg"><IconoFoto className="w-6 h-6" /></span>
            <p className="ui-empty__title">Tu vidriera está vacía</p>
            <p className="ui-empty__text">Cargá productos con foto y precio: van a aparecer en tu link para que tus clientes te los pidan.</p>
            <button onClick={abrirNuevo} className="ui-btn ui-btn--primary mt-1">Cargar el primero</button>
          </div>
        </div>
      ) : (
        <>
          {categorias.length > 1 && (
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <div className="ui-segment w-max">
                {['todos', ...categorias].map((c) => (
                  <button key={c} onClick={() => setFiltro(c)} className={filtro === c ? 'is-active' : ''} aria-pressed={filtro === c}>
                    {filtro === c && <Lente />}
                    {c === 'todos' ? 'Todos' : c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((item) => (
              <article key={item.id} className={`ui-card ns-cat-item ${item.activo ? '' : 'is-oculto'}`}>
                <button type="button" onClick={() => abrirEdicion(item)} className="ns-cat-item__foto" aria-label={`Editar ${item.nombre}`}>
                  {item.imagen_url ? <img src={item.imagen_url} alt="" loading="lazy" /> : <IconoFoto />}
                </button>
                <div className="min-w-0 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-bold leading-snug line-clamp-2" style={{ color: 'var(--ns-text)' }}>{item.nombre}</h3>
                    {!item.activo && <span className="ui-chip ui-chip--quiet shrink-0">Oculto</span>}
                  </div>
                  <p className="text-[12px] font-semibold mt-0.5" style={{ color: 'var(--ns-primary)' }}>{item.categoria}</p>
                  {item.descripcion && (
                    <p className="text-[12px] leading-snug mt-1 line-clamp-2" style={{ color: 'var(--ns-text-muted)' }}>{item.descripcion}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                    <span className="font-display text-[17px] font-bold tabular-nums" style={{ color: item.precio > 0 ? 'var(--ns-text)' : 'var(--ns-text-muted)' }}>
                      {item.precio > 0 ? formatoPrecio(item.precio) : 'Sin precio'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => alternarVisible(item)}
                        className="ui-icon-btn"
                        aria-label={item.activo ? `Ocultar ${item.nombre} del catálogo` : `Mostrar ${item.nombre} en el catálogo`}
                        title={item.activo ? 'Ocultar' : 'Mostrar'}
                      >
                        <IconoOjo abierto={item.activo} />
                      </button>
                      <button type="button" onClick={() => abrirEdicion(item)} className="ui-icon-btn" aria-label={`Editar ${item.nombre}`} title="Editar">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Hoja de alta / edición */}
      {hoja && (
        <div className="ui-scrim flex items-end sm:items-center justify-center" onClick={cerrar} role="presentation">
          <div
            className="w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain ns-hoja"
            style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={hoja.id ? 'Editar producto del catálogo' : 'Nuevo producto del catálogo'}
          >
            <div className="ui-sheet__handle sm:hidden" />
            <div className="px-5 sm:px-8 pt-3 sm:pt-7">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="ui-head__title text-2xl md:text-3xl">{hoja.id ? 'Editar producto' : 'Nuevo producto'}</h2>
                  <p className="ui-eyebrow mt-1.5">Catálogo público</p>
                </div>
                <button type="button" onClick={cerrar} className="ui-icon-btn" aria-label="Cerrar">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>

              <form onSubmit={guardar} className="flex flex-col gap-4">
                {/* Foto: cuadrada, como la ven los clientes */}
                <div className="flex items-center gap-4">
                  <label className={`ns-cat-foto ${form.imagen_url ? 'tiene-foto' : ''}`}>
                    {subiendo ? (
                      <span className="ui-spinner" role="status" aria-label="Subiendo imagen" />
                    ) : form.imagen_url ? (
                      <img src={form.imagen_url} alt="Foto del producto" />
                    ) : (
                      <span className="flex flex-col items-center gap-1.5">
                        <IconoFoto />
                        <span className="text-[12px] font-semibold">Agregar foto</span>
                      </span>
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={alSubirImagen} disabled={subiendo} />
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ns-text-secondary)' }}>Foto del producto</p>
                    <p className="text-[12px] leading-snug mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>Se muestra cuadrada en tu vidriera. Tocá el recuadro para {form.imagen_url ? 'cambiarla' : 'elegirla'}.</p>
                    {form.imagen_url && !subiendo && (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, imagen_url: '' }))} className="text-[13px] font-semibold mt-2" style={{ color: 'var(--ns-danger)' }}>
                        Quitar foto
                      </button>
                    )}
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="ui-eyebrow">Nombre</span>
                  <input
                    required
                    className="ui-field"
                    placeholder="Ej: Cera mate para peinar"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 min-w-0">
                    <span className="ui-eyebrow">Categoría</span>
                    <select className="ui-field" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
                      {opcionesCategoria.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 min-w-0">
                    <span className="ui-eyebrow">Precio</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      className="ui-field"
                      placeholder="$0"
                      value={form.precio}
                      onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="ui-eyebrow">Descripción</span>
                  <textarea
                    rows="3"
                    className="ui-field resize-none"
                    placeholder="Contale a tus clientes qué es, para qué sirve o qué incluye."
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  />
                </label>

                <div className="flex items-center justify-between gap-4 p-4 rounded-[20px]" style={{ background: 'var(--ns-sunken)' }}>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold" style={{ color: 'var(--ns-text)' }}>Visible en el catálogo</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>
                      {form.activo ? 'Tus clientes lo ven en tu link.' : 'Queda guardado, pero nadie lo ve.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { haptic('select'); setForm((f) => ({ ...f, activo: !f.activo })) }}
                    className={`ui-switch ${form.activo ? 'is-on' : ''}`}
                    role="switch"
                    aria-checked={form.activo}
                    aria-label="Visible en el catálogo"
                  />
                </div>

                <button type="submit" disabled={guardando || subiendo} className="ui-btn ui-btn--primary ui-btn--block mt-1">
                  {guardando
                    ? <span className="ui-spinner ui-spinner--sm" style={{ borderTopColor: '#FFFFFF' }} />
                    : hoja.id ? 'Guardar cambios' : (form.activo ? 'Publicar en el catálogo' : 'Guardar oculto')}
                </button>

                {editando && (
                  <button type="button" onClick={() => eliminar(editando)} className="ui-btn ui-btn--quiet ui-btn--block" style={{ color: 'var(--ns-danger)' }}>
                    Eliminar del catálogo
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
