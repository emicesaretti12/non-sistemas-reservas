import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { RUBROS_DISPONIBLES, getVocabulario } from '../utils/vocabulario'

const STEPS = [
  { id: 'welcome', title: 'Bienvenido a Non Sistemas', sub: 'Tu plataforma de reservas profesional' },
  { id: 'negocio', title: 'Tu Negocio', sub: 'Contanos sobre tu emprendimiento' },
  { id: 'branding', title: 'Personalización', sub: 'Dale identidad visual a tu app' },
  { id: 'horarios', title: 'Horarios', sub: 'Configurá tus días y horarios de trabajo' },
  { id: 'servicio', title: 'Primer Servicio', sub: 'Creá tu primera oferta para clientes' },
  { id: 'staff', title: 'Tu Equipo', sub: 'Agregá a tu primer colaborador' },
  { id: 'listo', title: '¡Todo Listo!', sub: 'Tu sistema está activo' },
]

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }

export default function OnboardingWizard({ session, onComplete }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 2: Negocio
  const [nombre, setNombre] = useState('')
  const [rubro, setRubro] = useState(RUBROS_DISPONIBLES[0])

  // Step 3: Branding
  const [color, setColor] = useState('#6c5ce7')
  const [descripcion, setDescripcion] = useState('')
  const [instagram, setInstagram] = useState('')

  // Step 4: Horarios
  const [horarios, setHorarios] = useState(() => {
    const h = {}
    DIAS.forEach(d => { h[d] = { abierto: ['lunes','martes','miercoles','jueves','viernes'].includes(d), inicio: '09:00', fin: '18:00' } })
    return h
  })

  // Step 5: Servicio
  const [svcNombre, setSvcNombre] = useState('')
  const [svcPrecio, setSvcPrecio] = useState('')
  const [svcDuracion, setSvcDuracion] = useState('30')

  // Step 6: Staff
  const [staffNombre, setStaffNombre] = useState('')
  const [staffEspecialidad, setStaffEspecialidad] = useState('')

  // Created refs
  const [negocioId, setNegocioId] = useState(null)

  const vocab = getVocabulario(rubro)

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const crearNegocio = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase.from('negocios').insert([{
        owner_id: session.user.id, nombre, rubro, color_primario: color,
        descripcion, instagram, horarios,
        estado_suscripcion: 'activo',
        es_admin_plataforma: import.meta.env.VITE_SUPERADMIN_EMAIL ? (session.user.email === import.meta.env.VITE_SUPERADMIN_EMAIL) : false
      }]).select().single()
      if (error) throw error
      setNegocioId(data.id)
      next()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const crearServicio = async () => {
    if (!svcNombre) { next(); return }
    setSaving(true)
    try {
      await supabase.from('servicios').insert([{ negocio_id: negocioId, nombre: svcNombre, precio: Number(svcPrecio) || 0, duracion_minutos: Number(svcDuracion) || 30 }])
      next()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const crearStaff = async () => {
    if (!staffNombre) { next(); return }
    setSaving(true)
    try {
      await supabase.from('empleados').insert([{ negocio_id: negocioId, nombre: staffNombre, especialidad: staffEspecialidad, estado: 'activo' }])
      next()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const publicSlug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const publicLink = `${window.location.origin}/app/${publicSlug}/${negocioId || ''}`

  const toggleDia = (dia) => setHorarios(h => ({ ...h, [dia]: { ...h[dia], abierto: !h[dia].abierto } }))
  const setHora = (dia, campo, val) => setHorarios(h => ({ ...h, [dia]: { ...h[dia], [campo]: val } }))

  const renderStep = () => {
    switch(STEPS[step].id) {
      case 'welcome': return (
        <div className="text-center space-y-6 py-4">
          <div className="w-20 h-20 mx-auto rounded-[1.5rem] flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
            <span className="text-white font-black text-3xl italic">NS</span>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-slate-900">¡Bienvenido!</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 max-w-sm mx-auto leading-relaxed">
              Vamos a configurar tu sistema de reservas profesional en solo 5 minutos. 
              Te guiaremos paso a paso.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto text-left">
            {['Configurar tu negocio y marca','Definir horarios de atención','Crear tu primer servicio','Agregar a tu equipo'].map((t,i) => (
              <div key={i} className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3">
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-[10px]">{i+1}</span>
                </div>
                <span className="text-xs font-bold text-purple-700">{t}</span>
              </div>
            ))}
          </div>
          <button onClick={next} className="ns-shimmer-btn w-full max-w-sm mx-auto py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
            Comenzar Configuración
          </button>
        </div>
      )

      case 'negocio': return (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Negocio</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Barbería Central" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-purple-400 transition-all font-bold text-sm" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rubro / Industria</label>
            <div className="grid grid-cols-2 gap-2">
              {RUBROS_DISPONIBLES.map(r => (
                <button key={r} type="button" onClick={() => setRubro(r)} className={`p-3.5 rounded-xl text-xs font-bold text-left transition-all border ${rubro === r ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={prev} className="flex-1 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Atrás</button>
            <button onClick={next} disabled={!nombre.trim()} className="flex-[2] py-3.5 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest disabled:opacity-40 shadow-lg" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>Siguiente</button>
          </div>
        </div>
      )

      case 'branding': return (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Color de tu Marca</label>
            <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent" />
              <span className="font-mono text-xs font-bold text-slate-500 uppercase">{color}</span>
              <div className="flex-1 h-8 rounded-lg shadow-inner" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}></div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descripción (opcional)</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Frase corta que describe tu negocio..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-purple-400 transition-all font-medium text-sm h-24 resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Instagram (opcional)</label>
            <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
              <span className="px-3 text-slate-400 text-xs font-bold">@</span>
              <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="tu_negocio" className="flex-1 p-3 bg-transparent outline-none text-xs font-bold" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={prev} className="flex-1 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Atrás</button>
            <button onClick={next} className="flex-[2] py-3.5 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest shadow-lg" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>Siguiente</button>
          </div>
        </div>
      )

      case 'horarios': return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-medium">Marcá los días que trabajás y definí tu rango horario.</p>
          <div className="space-y-2">
            {DIAS.map(d => (
              <div key={d} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${horarios[d].abierto ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                <button type="button" onClick={() => toggleDia(d)} className={`w-10 h-6 rounded-full relative transition-colors ${horarios[d].abierto ? 'bg-purple-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${horarios[d].abierto ? 'left-[18px]' : 'left-0.5'}`}></div>
                </button>
                <span className="text-xs font-bold text-slate-700 w-20">{DIAS_LABEL[d]}</span>
                {horarios[d].abierto && (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={horarios[d].inicio} onChange={e => setHora(d,'inicio',e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none" />
                    <span className="text-[10px] text-slate-400 font-bold">a</span>
                    <input type="time" value={horarios[d].fin} onChange={e => setHora(d,'fin',e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={prev} className="flex-1 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Atrás</button>
            <button onClick={crearNegocio} disabled={saving} className="flex-[2] py-3.5 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Crear Negocio'}
            </button>
          </div>
        </div>
      )

      case 'servicio': return (
        <div className="space-y-5">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div>
              <p className="text-xs font-bold text-emerald-700">¡Negocio creado!</p>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Ahora creá tu primer {vocab.servicio} para que tus clientes puedan reservar.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del {vocab.servicio}</label>
            <input value={svcNombre} onChange={e => setSvcNombre(e.target.value)} placeholder={vocab.placeholderServicio} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-purple-400 transition-all font-bold text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Precio ($)</label>
              <input type="number" value={svcPrecio} onChange={e => setSvcPrecio(e.target.value)} placeholder="0" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-purple-400 transition-all font-bold text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Duración (min)</label>
              <select value={svcDuracion} onChange={e => setSvcDuracion(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm cursor-pointer appearance-none">
                {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={crearServicio} disabled={saving} className="w-full py-3.5 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (svcNombre ? 'Guardar y Continuar' : 'Omitir por ahora')}
            </button>
          </div>
        </div>
      )

      case 'staff': return (
        <div className="space-y-5">
          <p className="text-xs text-slate-500 font-medium">Agregá a tu primer {vocab.empleado}. Podés agregar más después.</p>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del {vocab.empleado}</label>
            <input value={staffNombre} onChange={e => setStaffNombre(e.target.value)} placeholder={vocab.placeholderEmpleado} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-purple-400 transition-all font-bold text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{vocab.especialidad} (opcional)</label>
            <input value={staffEspecialidad} onChange={e => setStaffEspecialidad(e.target.value)} placeholder={vocab.placeholderEspecialidad} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-purple-400 transition-all font-bold text-sm" />
          </div>
          <button onClick={crearStaff} disabled={saving} className="w-full py-3.5 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (staffNombre ? 'Guardar y Finalizar' : 'Omitir y Finalizar')}
          </button>
        </div>
      )

      case 'listo': return (
        <div className="text-center space-y-6 py-4">
          <div className="w-20 h-20 mx-auto rounded-[1.5rem] flex items-center justify-center shadow-2xl" style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-slate-900">¡{nombre} está listo!</h3>
            <p className="text-sm text-slate-500 font-medium mt-2">Tu sistema de reservas profesional ya está activo y operativo.</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-3 text-left">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tu link de reservas</p>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-all group" onClick={() => { navigator.clipboard.writeText(publicLink); alert('¡Link copiado!') }}>
              <code className="text-[10px] text-purple-600 font-mono truncate flex-1">{publicLink}</code>
              <svg className="w-4 h-4 text-slate-400 shrink-0 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => window.open(publicLink, '_blank')} className="py-3.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:border-slate-400 transition-all active:scale-95">
              Ver Mi App
            </button>
            <button onClick={() => { const msg = encodeURIComponent(`Reservá en ${nombre}: ${publicLink}`); window.open(`https://wa.me/?text=${msg}`, '_blank') }} className="py-3.5 rounded-xl bg-green-50 border border-green-200 text-green-600 font-bold text-[10px] uppercase tracking-widest hover:bg-green-500 hover:text-white hover:border-green-500 transition-all active:scale-95">
              Compartir WA
            </button>
          </div>

          <button onClick={onComplete} className="w-full py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
            Ir al Panel de Gestión
          </button>
        </div>
      )
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFE] flex items-start md:items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[9px] font-black text-purple-500 uppercase tracking-[0.2em]">{STEPS[step].title}</span>
            <span className="text-[10px] font-bold text-slate-400">{step + 1} / {STEPS.length}</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-100">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: step >= i ? '100%' : '0%', background: step >= i ? 'linear-gradient(135deg, #6c5ce7, #a29bfe)' : 'transparent' }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100 p-6 md:p-8 animate-in fade-in zoom-in-[0.98] duration-500">
          <div className="mb-5">
            <h2 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900">{STEPS[step].title}</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">{STEPS[step].sub}</p>
          </div>
          {renderStep()}
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] mt-6">
          Non Sistemas • Salsipuedes, CBA
        </p>
      </div>
    </div>
  )
}
