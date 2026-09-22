import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { RUBROS_DISPONIBLES, getVocabulario } from '../utils/vocabulario'
import { horariosPorDefecto } from '../utils/reservas'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCelebrate, IconCheckCircle } from './NoniIcons'
import { useToast } from './Toast'
import OnboardingComplete from './OnboardingComplete'
import { PALETA_MARCA, COLOR_MARCA, colorSeguro } from '../utils/paleta'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb', domingo:'Dom' }
const COLORES = PALETA_MARCA

// Sugerencias inteligentes por rubro
const SUGERENCIAS = {
  'Uñas / Manicuría': {
    servicios: ['Semipermanente', 'Kapping', 'Esculpidas', 'Retirada + Esmaltado'],
    precios: [6000, 9000, 13000, 4000],
    duraciones: [60, 90, 120, 45],
    staff: ['Sofía', 'Lucía'],
    especialidad: 'Manicura',
    descripcion: 'Uñas prolijas y duraderas, con la mejor atención.',
    color: '#C2456B',
  },
  'Tatuajes / Piercings': {
    servicios: ['Tattoo chico', 'Tattoo mediano', 'Retoque', 'Piercing'],
    precios: [25000, 60000, 0, 15000],
    duraciones: [60, 180, 45, 30],
    staff: ['Juan', 'Mica'],
    especialidad: 'Tatuador/a',
    descripcion: 'Diseños únicos, materiales de primera y todo esterilizado.',
    color: '#1D212A',
  },
  'Bar / Cervecería': {
    servicios: ['Mesa para 2', 'Mesa para 4', 'Mesa para 6', 'Barra'],
    precios: [0, 0, 0, 0],
    duraciones: [90, 120, 120, 60],
    staff: ['Salón', 'Patio'],
    especialidad: 'Sector',
    descripcion: 'Birra fría, buena música y mejor gente.',
    color: '#E09112',
  },
  'Gimnasio / Entrenamiento': {
    servicios: ['Funcional', 'Musculación', 'Entrenamiento personalizado'],
    precios: [0, 0, 12000],
    duraciones: [60, 60, 60],
    staff: ['Profe Nico', 'Profe Ana'],
    especialidad: 'Profesor/a',
    descripcion: 'Entrenamiento acompañado, para todos los niveles.',
    color: '#E06C2A',
  },
  'Taller / Servicio Técnico': {
    servicios: ['Diagnóstico', 'Cambio de aceite', 'Service completo'],
    precios: [8000, 25000, 70000],
    duraciones: [30, 60, 180],
    staff: ['Box 1', 'Box 2'],
    especialidad: 'Puesto de trabajo',
    descripcion: 'Trabajo prolijo, presupuesto claro y entrega a tiempo.',
    color: '#0A66C2',
  },
  'Barbería / Peluquería': {
    servicios: ['Corte Clásico', 'Corte + Barba', 'Afeitado Premium', 'Degradé', 'Coloración'],
    precios: [2500, 3500, 2800, 3000, 5000],
    duraciones: [30, 45, 30, 45, 90],
    staff: ['Carlos', 'Martín', 'Diego'],
    especialidad: 'Barbero',
    descripcion: 'Los mejores cortes de la ciudad. Estilo y tradición.',
    color: '#007AFF',
  },
  'Restaurante / Gastronomía': {
    servicios: ['Mesa para 2', 'Mesa para 4', 'Mesa Privada VIP', 'Brunch Especial'],
    precios: [0, 0, 5000, 2500],
    duraciones: [60, 90, 120, 90],
    staff: ['Salón Principal', 'Terraza'],
    especialidad: 'Interior',
    descripcion: 'Sabores únicos en un ambiente inigualable.',
    color: '#5E8C2A',
  },
  'Centro de Estética': {
    servicios: ['Limpieza Facial', 'Masaje Relajante', 'Depilación Laser', 'Manicura Premium'],
    precios: [4500, 5500, 8000, 2500],
    duraciones: [60, 60, 30, 45],
    staff: ['Valentina', 'Lucía', 'María'],
    especialidad: 'Esteticista',
    descripcion: 'Tu bienestar y belleza son nuestra prioridad.',
    color: '#8B5CF6',
  },
  'Veterinaria': {
    servicios: ['Consulta General', 'Vacunación', 'Baño y Peluquería', 'Cirugía'],
    precios: [3500, 2000, 4000, 15000],
    duraciones: [30, 20, 60, 120],
    staff: ['Dr. García', 'Dra. López'],
    especialidad: 'Veterinario/a',
    descripcion: 'Cuidamos a tu mascota como si fuera la nuestra.',
    color: '#0E9C9C',
  },
  'Salud / Clínica': {
    servicios: ['Consulta General', 'Revisión', 'Consulta Especializada'],
    precios: [5000, 3500, 8000],
    duraciones: [30, 20, 45],
    staff: ['Dr. Martínez', 'Dra. Pérez'],
    especialidad: 'Médico/a',
    descripcion: 'Tu salud, nuestra misión.',
    color: '#259C5B',
  },
}

// ── Vista previa en vivo (panel derecho) ───────────────────────────────────
function LivePreview({ data }) {
  const color = colorSeguro(data.color)
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--ns-bg)', fontFamily: '"Inter Tight", system-ui, sans-serif' }}>
      {/* Portada con el acento elegido */}
      <motion.div layout className="h-44 relative" style={{ background: `linear-gradient(135deg, ${COLOR_MARCA} 0%, ${color} 150%)` }}>
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle, #FFFFFF 1px, transparent 1px)', backgroundSize: '11px 11px' }} />
        <motion.div
          layout
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-[2rem] flex items-center justify-center overflow-hidden"
          style={{ background: 'var(--ns-paper)', boxShadow: '12px 14px 30px rgba(16,24,40,0.32), -6px -6px 16px rgba(255,255,255,0.8)' }}
        >
          {data.logo_url
            ? <img src={data.logo_url} className="w-full h-full object-cover" alt="Logo del negocio" />
            : <span className="font-bold text-[2rem]" style={{ color }}>{data.nombre ? data.nombre[0].toUpperCase() : 'N'}</span>
          }
        </motion.div>
      </motion.div>

      <div className="pt-16 pb-7 px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.h1
            key={data.nombre}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-bold text-2xl tracking-tight"
            style={{ color: 'var(--ns-text)', fontFamily: 'var(--font-display)' }}
          >
            {data.nombre || 'Tu marca'}
          </motion.h1>
        </AnimatePresence>
        <p className="ui-eyebrow mt-1.5">{data.rubro || 'Tu rubro'}</p>
        {data.descripcion && (
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--ns-text-secondary)' }}>«{data.descripcion}»</p>
        )}
        {data.instagram && (
          <div className="mt-4 flex justify-center">
            <span className="ui-chip">@{data.instagram}</span>
          </div>
        )}
      </div>

      <div className="px-5 space-y-3">
        <h3 className="ui-eyebrow">Servicios</h3>
        {data.svcNombre ? (
          <motion.div layout className="ui-card p-4">
            <div className="flex justify-between items-center gap-3">
              <div className="min-w-0">
                <p className="font-bold truncate" style={{ color: 'var(--ns-text)' }}>{data.svcNombre}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ns-text-muted)' }}>{data.svcDuracion} min</p>
              </div>
              <p className="font-bold text-lg shrink-0" style={{ color }}>${data.svcPrecio || 0}</p>
            </div>
            <div
              className="w-full mt-3.5 py-3 rounded-[16px] text-sm font-bold text-center uppercase tracking-[0.12em]"
              style={{ background: color, color: 'var(--ns-paper)', boxShadow: '0 8px 20px rgba(16,24,40,0.26)' }}
              aria-label="Vista previa del botón de reserva"
            >
              Reservar
            </div>
          </motion.div>
        ) : (
          <div className="ui-well p-4 opacity-60">
            <div className="w-32 h-4 rounded-full mb-2.5" style={{ background: 'var(--ns-mix-14)' }} />
            <div className="w-16 h-3 rounded-full" style={{ background: 'var(--ns-mix-10)' }} />
          </div>
        )}
      </div>

      {data.staffNombre && (
        <div className="px-5 mt-6 space-y-3">
          <h3 className="ui-eyebrow">Equipo</h3>
          <motion.div layout className="ui-card flex items-center gap-4 p-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0"
              style={{ background: color, color: 'var(--ns-paper)', boxShadow: '5px 6px 14px rgba(16,24,40,0.26)' }}
            >
              {data.staffNombre[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold truncate" style={{ color: 'var(--ns-text)' }}>{data.staffNombre}</p>
              <p className="text-xs truncate" style={{ color: 'var(--ns-text-muted)' }}>{data.staffEspecialidad || 'Profesional'}</p>
            </div>
          </motion.div>
        </div>
      )}
      <div className="h-20" />
    </div>
  )
}

// ── Carcasa del celular ────────────────────────────────────────────────────
function PhoneShell({ data }) {
  return (
    <div className="hidden lg:flex flex-col w-[360px] h-[720px] shrink-0 relative">
      {/* Marco de papel extruido sobre el fondo bordó del alta */}
      <div
        className="absolute inset-0 rounded-[3rem]"
        style={{ background: 'var(--ns-paper)', boxShadow: '26px 30px 70px rgba(16,24,40,0.45), -14px -14px 36px rgba(255,255,255,0.12)' }}
      />
      <div
        className="absolute inset-[9px] rounded-[2.6rem] overflow-hidden flex flex-col"
        style={{ background: 'var(--ns-bg)', boxShadow: 'var(--ui-field-deep)' }}
      >
        {/* Muesca */}
        <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-10 pointer-events-none">
          <div
            className="w-28 h-6 rounded-b-[18px] flex items-center justify-center gap-2"
            style={{ background: 'var(--ns-mix-20)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ns-mix-44)' }} />
            <span className="w-8 h-1.5 rounded-full" style={{ background: 'var(--ns-mix-28)' }} />
          </div>
        </div>
        <div className="flex-1 overflow-hidden mt-7">
          <LivePreview data={data} />
        </div>
        {/* Barra de inicio */}
        <div className="h-8 flex items-center justify-center" style={{ background: 'var(--ns-bg)' }}>
          <div className="w-28 h-1.5 rounded-full" style={{ background: 'var(--ns-mix-20)' }} />
        </div>
      </div>
    </div>
  )
}

// ── Steps definition ───────────────────────────────────────────────────────
const buildSteps = () => [
  { id: 'nombre',      label: 'Nombre',     q: '¿Cómo se llama tu negocio?',                                      type: 'text',     placeholder: 'Ej: Barbería Central' },
  { id: 'rubro',       label: 'Rubro',      q: '¿A qué rubro pertenece?',                                         type: 'options',  options: RUBROS_DISPONIBLES },
  { id: 'color',       label: 'Color',      q: '¿Cuál es tu color de marca?',                                     type: 'color' },
  { id: 'logo',        label: 'Logo',       q: 'Subí tu logo (podés hacerlo después)',                            type: 'logo' },
  { id: 'descripcion', label: 'Slogan',     q: '¿Una frase corta que describa tu negocio?',                       type: 'textarea', placeholder: 'Ej: Los mejores cortes de la ciudad' },
  { id: 'instagram',   label: 'Instagram',  q: '¿Tu cuenta de Instagram?',                                        type: 'instagram', placeholder: 'tu_cuenta' },
  { id: 'servicio',    label: 'Servicio',   q: 'Agregá tu primer servicio',                                       type: 'servicio' },
  { id: 'staff',       label: 'Equipo',     q: '¿Cómo se llama tu profesional principal?',                        type: 'staff' },
]

// ── Main component ─────────────────────────────────────────────────────────
export default function OnboardingWizard({ session, onComplete }) {
  const showToast = useToast()
  const steps = buildSteps()
  const [stepIdx, setStepIdx] = useState(0)
  const [data, setData] = useState({
    nombre:'', rubro:'', color:'#4A9CFF', logo_url:'', descripcion:'', instagram:'',
    svcNombre:'', svcPrecio:'', svcDuracion:'30', staffNombre:'', staffEspecialidad:''
  })
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [negocioId, setNegocioId] = useState(null)
  const lockRef = useRef(false)
  const createdRef = useRef(false)
  const inputRef = useRef(null)
  const vocab = getVocabulario(data.rubro || RUBROS_DISPONIBLES[0])
  const step = steps[stepIdx]

  useEffect(() => { inputRef.current?.focus() }, [stepIdx])

  const next = (updates = {}) => {
    if (lockRef.current) return
    lockRef.current = true
    let newData = { ...data, ...updates }

    // Auto-sugerencias al elegir rubro
    if (updates.rubro) {
      const sug = SUGERENCIAS[updates.rubro]
      if (sug) {
        newData = {
          ...newData,
          color: sug.color,
          descripcion: newData.descripcion || sug.descripcion,
          svcNombre: newData.svcNombre || sug.servicios[0],
          svcPrecio: newData.svcPrecio || String(sug.precios[0]),
          svcDuracion: newData.svcDuracion || String(sug.duraciones[0]),
          staffNombre: newData.staffNombre || sug.staff[0],
          staffEspecialidad: newData.staffEspecialidad || sug.especialidad,
        }
      }
    }

    setData(newData)
    setInput('')
    if (stepIdx < steps.length - 1) {
      setStepIdx(i => i + 1)
      setTimeout(() => { lockRef.current = false }, 300)
    } else {
      save(newData)
    }
  }

  const save = async (finalData) => {
    if (createdRef.current) return
    createdRef.current = true
    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('negocios').select('id').eq('owner_id', session.user.id)
        .order('creado_en', { ascending: false }).limit(1).maybeSingle()

      let id = existing?.id
      if (!id) {
        // `es_admin_plataforma` NO se manda desde el cliente: era una vía de
        // escalada de privilegios (ver sql/2026-09-20_seguridad_y_reservas.sql,
        // que además lo bloquea a nivel base).
        const { data: neg, error } = await supabase.from('negocios').insert([{
          owner_id: session.user.id, nombre: finalData.nombre, rubro: finalData.rubro,
          color_primario: finalData.color, estado_suscripcion: 'trial',
        }]).select().single()
        if (error) throw error
        id = neg.id
      }
      setNegocioId(id)

      // Horarios por defecto (Lun a Vie de 9 a 18). Antes se guardaba `null` y
      // el link público del negocio nuevo mostraba TODOS los días cerrados:
      // no podía recibir una sola reserva hasta configurarlos a mano.
      await supabase.from('negocios').update({
        descripcion: finalData.descripcion, instagram: finalData.instagram,
        logo_url: finalData.logo_url, horarios: horariosPorDefecto()
      }).eq('id', id)
      
      if (finalData.svcNombre) {
        await supabase.from('servicios').insert([{
          negocio_id: id, nombre: finalData.svcNombre,
          precio: Number(finalData.svcPrecio) || 0, duracion_minutos: Number(finalData.svcDuracion) || 30
        }])
      }
      
      if (finalData.staffNombre) {
        await supabase.from('empleados').insert([{
          negocio_id: id, nombre: finalData.staffNombre,
          especialidad: finalData.staffEspecialidad, estado: 'activo'
        }])
      }
      setDone(true)
    } catch(e) {
      showToast('Error al crear: ' + e.message, 'error')
      createdRef.current = false
    } finally {
      setSaving(false)
      lockRef.current = false
    }
  }

  const uploadLogo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', 'non_sistemas')
    fd.append('cloud_name', 'ddp4r9dlu')
    try {
      const r = await fetch('https://api.cloudinary.com/v1_1/ddp4r9dlu/image/upload', { method:'POST', body: fd })
      const j = await r.json()
      if (j.secure_url) next({ logo_url: j.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_400/') })
      else throw new Error('Sin URL')
    } catch { showToast('Error al subir. Intentá de nuevo.', 'error') }
    finally { setUploading(false) }
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <OnboardingComplete
        data={data}
        negocioId={negocioId}
        onComplete={onComplete}
        showToast={showToast}
      />
    )
  }

  // ── Saving screen ────────────────────────────────────────────────────────
  if (saving) {
    return (
      <div className="min-h-screen bg-[#007AFF] flex items-center justify-center">
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="text-center space-y-6">
          <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:'linear'}}
            className="w-14 h-14 rounded-full mx-auto" style={{ border: '4px solid rgba(255,255,255,0.12)', borderTopColor: 'var(--ns-paper)' }} />
          <div>
            <p className="text-white font-bold text-lg">Creando tu plataforma...</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Esto toma unos segundos</p>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Input renderers ──────────────────────────────────────────────────────
  const renderInput = () => {
    const base = "ui-onbrand-field"
    switch (step.type) {
      case 'text':
        return (
          <form onSubmit={e => { e.preventDefault(); if(input.trim()) next({ [step.id]: input.trim() }) }} className="space-y-3">
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} placeholder={step.placeholder} className={base} />
            <button type="submit" disabled={!input.trim()} className="ui-onbrand-btn">Continuar →</button>
          </form>
        )
      case 'textarea': {
        const sug = SUGERENCIAS[data.rubro]
        return (
          <div className="space-y-3">
            {sug?.descripcion && (
              <button onClick={() => setInput(sug.descripcion)}
                className="ui-onbrand-field w-full text-left !py-3 text-sm hover:opacity-90">
                Sugerencia: "{sug.descripcion}"
              </button>
            )}
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} placeholder={step.placeholder} rows={3} className={base + " resize-none"} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => next({ [step.id]: '' })} className="ui-onbrand-btn ui-onbrand-btn--ghost">Omitir</button>
              <button onClick={() => next({ [step.id]: input || sug?.descripcion || '' })} className="ui-onbrand-btn">Continuar →</button>
            </div>
          </div>
        )
      }
      case 'instagram':
        return (
          <div className="space-y-3">
            <div className="ui-onbrand-field flex items-center gap-2 !py-0">
              <span className="font-bold text-lg" style={{ color: 'var(--ns-paper)', opacity: 0.7 }}>@</span>
              <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} placeholder="tu_cuenta" className="flex-1 py-4 bg-transparent text-white placeholder:text-white/30 outline-none font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => next({ instagram: '' })} className="ui-onbrand-btn ui-onbrand-btn--ghost">Omitir</button>
              <button onClick={() => next({ instagram: input })} className="ui-onbrand-btn">Continuar →</button>
            </div>
          </div>
        )
      case 'options':
        return (
          <div className="flex flex-wrap gap-2">
            {RUBROS_DISPONIBLES.map(opt => (
              <motion.button key={opt} whileTap={{scale:.95}}
                onClick={() => next({ rubro: opt })}
                className="ui-onbrand-chip">
                {opt}
              </motion.button>
            ))}
          </div>
        )
      case 'color':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              {COLORES.map(c => (
                <button key={c} onClick={() => setData(d=>({...d,color:c}))}
                  className="aspect-square rounded-full border-4 transition-all"
                  style={{backgroundColor:c, borderColor: data.color===c ? 'white' : 'transparent', boxShadow: data.color===c ? `0 0 0 2px ${c}` : 'none'}} />
              ))}
              <label className="aspect-square rounded-full border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:border-white/60">
                <input type="color" value={data.color} onChange={e=>setData(d=>({...d,color:e.target.value}))} className="opacity-0 absolute w-0 h-0" />
                <span className="text-white/50 text-lg">+</span>
              </label>
            </div>
            <button onClick={() => next()} className="ui-onbrand-btn">Confirmar color →</button>
          </div>
        )
      case 'logo':
        return (
          <div className="space-y-3">
            {uploading ? (
              <div className="py-10 flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '4px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--ns-paper)' }} />
                <p className="text-white/50 text-sm">Subiendo imagen...</p>
              </div>
            ) : (
              <>
                <label className="ui-onbrand-field w-full !py-10 flex flex-col items-center gap-3 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" style={{ color: 'var(--ns-paper)', opacity: 0.8 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <p className="text-white/60 text-sm font-medium">Tocar para subir logo</p>
                </label>
                <button onClick={() => next({ logo_url: '' })} className="ui-onbrand-btn ui-onbrand-btn--ghost">Omitir por ahora</button>
              </>
            )}
          </div>
        )
      case 'servicio': {
        const sug = SUGERENCIAS[data.rubro]
        return (
          <div className="space-y-3">
            {sug?.servicios && (
              <div className="flex flex-wrap gap-2">
                {sug.servicios.map((s, i) => (
                  <button key={s} onClick={() => setData(d => ({ ...d, svcNombre: s, svcPrecio: String(sug.precios[i] || 0), svcDuracion: String(sug.duraciones[i] || 30) }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                      data.svcNombre === s ? 'ui-onbrand-chip is-active' : 'ui-onbrand-chip'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <input value={data.svcNombre} onChange={e=>setData(d=>({...d,svcNombre:e.target.value}))} placeholder={vocab.placeholderServicio || 'Nombre del servicio'} className={base} ref={inputRef} />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={data.svcPrecio} onChange={e=>setData(d=>({...d,svcPrecio:e.target.value}))} placeholder="Precio $" className={base} />
              <select value={data.svcDuracion} onChange={e=>setData(d=>({...d,svcDuracion:e.target.value}))} className={base}>
                {[15,30,45,60,90,120].map(m=><option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => next({ svcNombre:'' })} className="ui-onbrand-btn ui-onbrand-btn--ghost">Omitir</button>
              <button disabled={!data.svcNombre} onClick={() => next()} className="ui-onbrand-btn">Continuar →</button>
            </div>
          </div>
        )
      }
      case 'staff': {
        const sug = SUGERENCIAS[data.rubro]
        return (
          <div className="space-y-3">
            {sug?.staff && (
              <div className="flex flex-wrap gap-2">
                {sug.staff.map(s => (
                  <button key={s} onClick={() => setData(d => ({ ...d, staffNombre: s, staffEspecialidad: d.staffEspecialidad || sug.especialidad }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                      data.staffNombre === s ? 'ui-onbrand-chip is-active' : 'ui-onbrand-chip'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <input ref={inputRef} value={data.staffNombre} onChange={e=>setData(d=>({...d,staffNombre:e.target.value}))} placeholder="Nombre del profesional" className={base} />
            <input value={data.staffEspecialidad} onChange={e=>setData(d=>({...d,staffEspecialidad:e.target.value}))} placeholder={vocab.placeholderEspecialidad || 'Especialidad'} className={base} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => next({ staffNombre:'' })} className="ui-onbrand-btn ui-onbrand-btn--ghost">Omitir</button>
              <button disabled={!data.staffNombre} onClick={() => next()} className="ui-onbrand-btn">Finalizar ✓</button>
            </div>
          </div>
        )
      }
      default: return null
    }
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex" style={{ background: 'var(--ns-gradient-1)' }}>
      {/* Left: Chat / Form panel */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto lg:mx-0 p-6 lg:p-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-[16px] flex items-center justify-center" style={{ background: 'var(--ns-paper)', color: 'var(--ns-primary)', boxShadow: '5px 5px 14px rgba(16,24,40,0.4)' }}>
            <span className="font-bold text-sm italic">NS</span>
          </div>
          <div>
            <p className="font-bold text-sm leading-none" style={{ color: 'var(--ns-paper)' }}>Non sistemas</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Configuración guiada</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-1.5">
              {steps.map((s, i) => (
                <motion.div key={s.id} animate={{ width: i === stepIdx ? 24 : 8, backgroundColor: i < stepIdx ? '#4A9CFF' : i === stepIdx ? '#FFFFFF' : 'rgba(255,255,255,0.15)' }}
                  className="h-2 rounded-full transition-all" />
              ))}
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>{stepIdx + 1} / {steps.length}</span>
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div key={step.id} initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} transition={{duration:.25}} className="flex-1">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight leading-tight" style={{ color: 'var(--ns-paper)', fontFamily: 'var(--font-display)' }}>{step.q}</h2>
            </div>
            {renderInput()}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <p className="text-xs mt-8 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Non Sistemas · Salsipuedes, Córdoba</p>
      </div>

      {/* Right: Live Preview Phone */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12" style={{ background: 'var(--ns-primary)', boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08)' }}>
        <div className="text-center space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(255,255,255,0.5)' }}>Vista en tiempo real</p>
            <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.72)' }}>Así van a ver tu app tus clientes</p>
          </div>
          <PhoneShell data={data} />
        </div>
      </div>
    </div>
  )
}
