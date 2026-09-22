import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'
import { useToast } from './Toast'
import { haptic } from '../utils/haptics'
import { useConfirm } from '../contexts/ConfirmContext'
import { IconRobot, IconCelebrate } from './NoniIcons'

export default function Empleados({ negocioId, rubro }) {
  const vocab = getVocabulario(rubro)
  const toast = useToast()
  const { showConfirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [especialistas, setEspecialistas] = useState([])

  // --- ESTADOS DEL MODAL Y FORMULARIO ---
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)

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
    } catch {
      toast.error('No pudimos subir la imagen. Revisá tu conexión y reintentá.')
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
      const nombreLimpio = form.nombre.trim()
      if (!nombreLimpio) throw new Error('El nombre no puede quedar vacío.')
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        throw new Error('El email no tiene un formato válido.')
      }
      const comision = parseFloat(form.comision_porcentaje)
      if (form.comision_porcentaje !== '' && (!Number.isFinite(comision) || comision < 0 || comision > 100)) {
        throw new Error('La comisión tiene que estar entre 0 y 100.')
      }

      const payload = {
        negocio_id: negocioId,
        nombre: nombreLimpio,
        especialidad: form.especialidad.trim(),
        foto_url: form.foto_url,
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        comision_porcentaje: Number.isFinite(comision) ? comision : 0,
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

  function eliminarEspecialista(esp) {
    showConfirm({
      title: `¿Dar de baja a ${esp.nombre}?`,
      message: `Va a dejar de aparecer en tu app de reservas. Si tiene turnos agendados no se puede borrar: en ese caso marcalo como "inactivo" desde Editar.`,
      confirmText: 'Dar de baja',
      isDestructive: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from('empleados')
          .delete()
          .eq('id', esp.id)
          .eq('negocio_id', negocioId)

        if (!error) {
          toast.success(`${esp.nombre} fue dado de baja`)
          setEspecialistas(prev => prev.filter(e => e.id !== esp.id))
          return
        }

        // Tiene turnos asociados: lo pasamos a inactivo para no perder historial.
        const { error: errInactivo } = await supabase
          .from('empleados')
          .update({ estado: 'inactivo' })
          .eq('id', esp.id)
          .eq('negocio_id', negocioId)

        if (errInactivo) {
          toast.error('No se pudo dar de baja. Reintentá en unos segundos.')
        } else {
          toast.warning(`${esp.nombre} tiene turnos agendados: quedó como inactivo y ya no recibe reservas nuevas.`)
          setEspecialistas(prev => prev.map(e => e.id === esp.id ? { ...e, estado: 'inactivo' } : e))
        }
      }
    })
  }

  const ETIQUETA_ESTADO = {
    activo: { texto: 'Activo', clase: 'neo-chip--solid' },
    vacaciones: { texto: 'De licencia', clase: 'neo-chip--outline' },
    inactivo: { texto: 'Inactivo', clase: 'neo-chip--cancelled' },
  }

  return (
    <div className="flex flex-col gap-5 ns-tab-content-enter">

      {showCelebration && (
        <div className="ns-copy-toast" role="status" style={{ top: 'calc(80px + env(safe-area-inset-top, 0px))', bottom: 'auto' }}>
          <span className="neo-pod neo-pod--brand neo-pod--sm"><IconCelebrate size={18} /></span>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--ns-text)' }}>¡{vocab.empleado} agregado!</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--ns-text-muted)' }}>Ahora configurá tus horarios</p>
          </div>
        </div>
      )}

      <header className="neo-card p-5 md:p-7 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="neo-head__title text-3xl md:text-[42px]">{vocab.empleadoPlural}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="ns-live-dot" style={{ width: 7, height: 7 }} />
            <p className="neo-eyebrow">
              {especialistas.filter(e => (e.estado || 'activo') === 'activo').length} de {especialistas.length} activos
            </p>
          </div>
        </div>
        <button onClick={() => { haptic(); abrirModalCrear() }} className="neo-btn neo-btn--primary shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
          <span className="hidden sm:inline">{vocab.nuevoEmpleado}</span>
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          <div className="ns-skeleton" style={{ height: 120 }} />
          <div className="ns-skeleton" style={{ height: 120 }} />
          <div className="ns-skeleton" style={{ height: 120 }} />
        </div>
      ) : especialistas.length === 0 ? (
        <section className="neo-card">
          <div className="neo-empty">
            <span className="neo-pod neo-pod--lg"><IconRobot size={26} /></span>
            <p className="neo-empty__title text-base">Sumá a tu equipo</p>
            <p className="neo-empty__text">
              Cargá a quienes atienden. Si trabajás solo, ponete a vos: cada persona activa suma su propia
              agenda, y tus clientes eligen con quién reservar.
            </p>

            <div className="neo-well w-full max-w-[320px] mt-2 text-left">
              <p className="neo-eyebrow mb-2.5">Así se ve</p>
              <div className="neo-tile !p-3.5 !flex-row items-center gap-3">
                <span className="neo-pod neo-pod--sm">A</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black" style={{ color: 'var(--ns-text)' }}>Ana García</p>
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--ns-text-muted)' }}>{vocab.especialidad || 'Especialista'}</p>
                </div>
                <span className="neo-chip neo-chip--solid ml-auto">Activo</span>
              </div>
            </div>

            <button onClick={() => { haptic(); abrirModalCrear() }} className="neo-btn neo-btn--primary mt-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
              Agregar {vocab.empleado}
            </button>
            <p className="text-[10px] font-medium" style={{ color: 'var(--ns-text-faint)' }}>Necesitás al menos uno para recibir reservas</p>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ns-stagger">
          {especialistas.map((esp) => {
            const estado = ETIQUETA_ESTADO[esp.estado] || ETIQUETA_ESTADO.activo
            const inactivo = esp.estado === 'inactivo'
            return (
              <article
                key={esp.id}
                className="neo-tile !flex-row items-center gap-4"
                style={inactivo ? { background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset-sm)' } : undefined}
              >
                <span className="neo-pod neo-pod--lg overflow-hidden p-0">
                  {esp.foto_url
                    ? <img src={esp.foto_url} className="w-full h-full object-cover" alt="" />
                    : <span className="font-display text-2xl font-black">{esp.nombre.charAt(0)}</span>}
                </span>

                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-base truncate leading-tight" style={{ color: inactivo ? 'var(--ns-text-muted)' : 'var(--ns-text)' }}>
                    {esp.nombre}
                  </h4>
                  <p className="text-[11px] font-semibold truncate mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>
                    {esp.especialidad || 'General'}
                    {esp.telefono ? ` · ${esp.telefono}` : ''}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className={`neo-chip ${estado.clase}`}>{estado.texto}</span>
                    {esp.comision_porcentaje > 0 && (
                      <span className="neo-chip neo-chip--quiet">{esp.comision_porcentaje}% comisión</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => { haptic(); abrirModalEditar(esp) }} className="neo-icon-btn w-9 h-9" aria-label={`Editar ${esp.nombre}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button onClick={() => eliminarEspecialista(esp)} className="neo-icon-btn w-9 h-9" aria-label={`Dar de baja a ${esp.nombre}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Hoja de alta / edición */}
      {modalAbierto && (
        <div
          className="neo-scrim flex items-end sm:items-center justify-center"
          onClick={() => setModalAbierto(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain"
            style={{
              background: 'var(--ns-surface)',
              boxShadow: 'var(--neo-float)',
              borderRadius: 'var(--ns-radius-2xl) var(--ns-radius-2xl) 0 0',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={modoEdicion ? vocab.editarEmpleado : vocab.nuevoEmpleado}
          >
            <div className="neo-sheet__handle sm:hidden" />

            <div className="px-5 sm:px-8 pt-3 sm:pt-7">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="neo-head__title text-2xl md:text-3xl">{modoEdicion ? vocab.editarEmpleado : vocab.nuevoEmpleado}</h2>
                  <p className="neo-eyebrow mt-1.5">Gestión de {vocab.empleados}</p>
                </div>
                <button onClick={() => setModalAbierto(false)} className="neo-icon-btn" aria-label="Cerrar">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>

              <form onSubmit={guardarEspecialista} className="flex flex-col gap-4">
                {/* Foto */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[26px] overflow-hidden flex items-center justify-center" style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset)' }}>
                      {form.foto_url
                        ? <img src={form.foto_url} className="w-full h-full object-cover" alt="" />
                        : <svg className="w-9 h-9" style={{ color: 'var(--ns-text-faint)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      {subiendoFoto && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(252,246,245,0.7)' }}>
                          <span className="neo-spinner neo-spinner--sm" />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-1.5 -right-1.5 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)', boxShadow: 'var(--neo-brand)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <input type="file" accept="image/*" className="hidden" onChange={manejarSubidaFoto} />
                      <span className="ns-sr-only">Subir foto</span>
                    </label>
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="neo-eyebrow">Nombre</span>
                  <input required className="neo-field" placeholder={vocab.placeholderEmpleado} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="neo-eyebrow">{vocab.especialidad}</span>
                  <input required className="neo-field" placeholder={vocab.placeholderEspecialidad} value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value })} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="neo-eyebrow">Email</span>
                    <input type="email" className="neo-field" placeholder="email@ejemplo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="neo-eyebrow">Teléfono</span>
                    <input type="tel" inputMode="tel" className="neo-field" placeholder="351..." value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="neo-eyebrow">Comisión %</span>
                    <input type="number" min="0" max="100" step="0.5" inputMode="decimal" className="neo-field" value={form.comision_porcentaje} onChange={e => setForm({ ...form, comision_porcentaje: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="neo-eyebrow">Estado</span>
                    <select className="neo-field cursor-pointer" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="vacaciones">De licencia</option>
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="neo-eyebrow">Notas internas</span>
                  <textarea className="neo-field" style={{ minHeight: 84 }} placeholder="Sólo las ves vos." value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
                </label>

                <button disabled={guardando || subiendoFoto} type="submit" className="neo-btn neo-btn--primary neo-btn--block mt-1">
                  {guardando
                    ? <span className="neo-spinner neo-spinner--sm" style={{ borderTopColor: 'var(--ns-paper)' }} />
                    : (modoEdicion ? `Actualizar ${vocab.empleado}` : `Guardar ${vocab.empleado}`)}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
