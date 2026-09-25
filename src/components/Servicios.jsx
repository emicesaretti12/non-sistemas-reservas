import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'
import { useToast } from './Toast'
import { haptic } from '../utils/haptics'
import { useConfirm } from '../contexts/ConfirmContext'
import { IconRobot, IconCelebrate } from './NoniIcons'
import { numero } from '../utils/formato'

export default function Servicios({ negocioId, rubro }) {
  const vocab = getVocabulario(rubro)
  const toast = useToast()
  const { showConfirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [servicios, setServicios] = useState([])

  // --- ESTADOS DEL MODAL Y FORMULARIO ---
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)

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
      const nombre = form.nombre.trim()
      const duracion = Number(form.duracion)
      const precio = Number(form.precio)

      if (!nombre) throw new Error('Poné un nombre para el ' + vocab.servicio + '.')
      if (!Number.isFinite(duracion) || duracion < 5) throw new Error('La duración tiene que ser de al menos 5 minutos.')
      if (duracion > 720) throw new Error('La duración no puede superar las 12 horas.')
      if (!Number.isFinite(precio) || precio < 0) throw new Error('El precio no puede ser negativo.')

      // PAYLOAD EXACTO: duracion_minutos coincide con tu SQL
      const payload = {
        negocio_id: negocioId,
        nombre,
        duracion_minutos: Math.round(duracion),
        precio
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
      toast.error(error.message || 'No pudimos guardar el servicio. Reintentá.')
    } finally {
      setGuardando(false)
    }
  }

  function eliminarServicio(srv) {
    showConfirm({
      title: `¿Eliminar "${srv.nombre}"?`,
      message: `Se va a quitar de tu app de reservas. Los turnos ya agendados con este ${vocab.servicio} se mantienen, pero pierden el precio y la duración asociados.`,
      confirmText: 'Eliminar',
      isDestructive: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from('servicios')
          .delete()
          .eq('id', srv.id)
          .eq('negocio_id', negocioId)

        if (error) {
          // Si hay turnos que lo referencian, Postgres bloquea el borrado.
          toast.error('No se pudo eliminar: puede tener turnos asociados.')
        } else {
          setServicios(prev => prev.filter(s => s.id !== srv.id))
          toast.success('Servicio eliminado')
        }
      }
    })
  }

  return (
    <div className="flex flex-col gap-5 ns-tab-content-enter">

      {/* Aviso del primer servicio creado */}
      {showCelebration && (
        <div className="ns-copy-toast" role="status" style={{ top: 'calc(80px + env(safe-area-inset-top, 0px))', bottom: 'auto' }}>
          <span className="ui-pod ui-pod--brand ui-pod--sm">
            <IconCelebrate size={18} />
          </span>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>¡Primer {vocab.servicio} creado!</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>Ahora sumá a tu equipo para recibir reservas</p>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <header className="ns-cabecera">
        <div className="min-w-0">
          <h2 className="ui-head__title">{vocab.servicioPlural}</h2>
          <div className="flex items-center gap-2 mt-2">
            <p className="ui-eyebrow">{servicios.length} {vocab.servicios} activos</p>
          </div>
        </div>
        <button onClick={() => { haptic(); abrirModalCrear() }} className="ui-btn ui-btn--primary shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
          <span className="hidden sm:inline">{vocab.nuevoServicio}</span>
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
          <div className="ns-skeleton" style={{ height: 168 }} />
          <div className="ns-skeleton" style={{ height: 168 }} />
          <div className="ns-skeleton" style={{ height: 168 }} />
        </div>
      ) : servicios.length === 0 ? (
        <section className="ui-card">
          <div className="ui-empty">
            <span className="ui-pod ui-pod--lg">
              <IconRobot size={26} />
            </span>
            <p className="ui-empty__title text-base">Creá tu primer {vocab.servicio}</p>
            <p className="ui-empty__text">
              Un {vocab.servicio} es lo que ofrecés: tiene un nombre, un precio y cuánto dura.
              Es lo primero que ve tu cliente cuando abre tu link.
            </p>

            <div className="ui-well w-full max-w-[320px] mt-2 text-left">
              <p className="ui-eyebrow mb-2.5">Así se ve</p>
              <div className="ui-tile !p-3.5 !flex-row items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold" style={{ color: 'var(--ns-text)' }}>Consulta general</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>30 min</p>
                </div>
                <span className="font-display text-lg font-bold tabular-nums" style={{ color: 'var(--ns-text)' }}>$3.500</span>
              </div>
            </div>

            <button onClick={() => { haptic(); abrirModalCrear() }} className="ui-btn ui-btn--primary mt-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
              Crear {vocab.servicio}
            </button>
            <p className="text-[10px] font-medium" style={{ color: 'var(--ns-text-faint)' }}>
              Necesitás al menos uno para recibir reservas
            </p>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ns-stagger">
          {servicios.map((srv) => (
            <article key={srv.id} className="ui-tile !gap-0 justify-between">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-lg md:text-xl font-bold leading-snug line-clamp-2" style={{ color: 'var(--ns-text)', letterSpacing: '-0.02em' }}>
                    {srv.nombre}
                  </h4>
                  <span className="ui-chip ui-chip--quiet mt-2.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {srv.duracion_minutos} min
                  </span>
                </div>
                <span className="font-display text-xl md:text-2xl font-bold tracking-tight leading-none tabular-nums shrink-0 pt-0.5" style={{ color: 'var(--ns-primary)' }}>
                  ${numero(srv.precio)}
                </span>
              </div>

              <div className="flex items-center gap-2.5 mt-5">
                <button onClick={() => { haptic(); abrirModalEditar(srv) }} className="ui-btn flex-1">Editar</button>
                <button
                  onClick={() => eliminarServicio(srv)}
                  aria-label={`Eliminar ${srv.nombre}`}
                  title="Eliminar"
                  className="ui-icon-btn shrink-0"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Hoja de alta / edición */}
      {modalAbierto && (
        <div
          className="ui-scrim flex items-end sm:items-center justify-center"
          onClick={() => setModalAbierto(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain ns-hoja"
            style={{
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={modoEdicion ? vocab.editarServicio : vocab.nuevoServicio}
          >
            <div className="ui-sheet__handle sm:hidden" />

            <div className="px-5 sm:px-8 pt-3 sm:pt-7">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="ui-head__title text-2xl md:text-3xl">
                    {modoEdicion ? vocab.editarServicio : vocab.nuevoServicio}
                  </h2>
                  <p className="ui-eyebrow mt-1.5">Catálogo de {vocab.servicios}</p>
                </div>
                <button onClick={() => setModalAbierto(false)} className="ui-icon-btn" aria-label="Cerrar">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>

              <form onSubmit={guardarServicio} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="ui-eyebrow">Nombre del {vocab.servicio}</span>
                  <input
                    required
                    className="ui-field"
                    placeholder={vocab.placeholderServicio}
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="ui-eyebrow">Duración (min)</span>
                    <input
                      required
                      type="number"
                      min="1"
                      inputMode="numeric"
                      className="ui-field"
                      placeholder="30"
                      value={form.duracion}
                      onChange={e => setForm({ ...form, duracion: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="ui-eyebrow">Precio ($)</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="ui-field"
                      placeholder="5000"
                      value={form.precio}
                      onChange={e => setForm({ ...form, precio: e.target.value })}
                    />
                  </label>
                </div>

                <p className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--ns-text-muted)' }}>
                  La duración define los horarios que tus clientes van a ver disponibles, así que conviene que sea realista.
                </p>

                <button disabled={guardando} type="submit" className="ui-btn ui-btn--primary ui-btn--block mt-1">
                  {guardando
                    ? <span className="ui-spinner ui-spinner--sm" style={{ borderTopColor: 'var(--ns-paper)' }} />
                    : (modoEdicion ? `Actualizar ${vocab.servicio}` : `Guardar ${vocab.servicio}`)}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
