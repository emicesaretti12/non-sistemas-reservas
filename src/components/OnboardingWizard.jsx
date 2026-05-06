import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { RUBROS_DISPONIBLES, getVocabulario } from '../utils/vocabulario'

const STEPS = [
  { id: 'welcome', title: 'Aprovisionamiento', sub: 'Inicializando entorno de sistema.' },
  { id: 'negocio', title: 'Identidad Central', sub: 'Nombre y sector de tu aplicación.' },
  { id: 'branding', title: 'Diseño de Interfaz', sub: 'Personalización visual del frontend.' },
  { id: 'horarios', title: 'Motor de Calendario', sub: 'Disponibilidad automatizada.' },
  { id: 'servicio', title: 'Módulo Operativo', sub: 'Tu primer servicio en línea.' },
  { id: 'listo', title: 'Despliegue Exitoso', sub: 'Sistema en producción.' },
]

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }

export default function OnboardingWizard({ session, onComplete }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Data
  const [nombre, setNombre] = useState('')
  const [rubro, setRubro] = useState(RUBROS_DISPONIBLES[0])
  const [color, setColor] = useState('#000000')
  const [horarios, setHorarios] = useState(() => {
    const h = {}
    DIAS.forEach(d => { h[d] = { abierto: ['lunes','martes','miercoles','jueves','viernes'].includes(d), inicio: '09:00', fin: '18:00' } })
    return h
  })
  const [svcNombre, setSvcNombre] = useState('')
  const [svcPrecio, setSvcPrecio] = useState('')
  const [svcDuracion, setSvcDuracion] = useState('30')
  const [negocioId, setNegocioId] = useState(null)

  const vocab = getVocabulario(rubro)

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const crearNegocio = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase.from('negocios').insert([{
        owner_id: session.user.id, nombre, rubro, color_primario: color,
        horarios, estado_suscripcion: 'activo',
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

  const toggleDia = (dia) => setHorarios(h => ({ ...h, [dia]: { ...h[dia], abierto: !h[dia].abierto } }))
  const setHora = (dia, campo, val) => setHorarios(h => ({ ...h, [dia]: { ...h[dia], [campo]: val } }))

  // --- MOCK PREVIEW COMPONENTS ---
  const renderPhonePreview = () => {
    return (
      <div className="hidden lg:flex w-[320px] h-[650px] bg-white rounded-[3rem] border-[8px] border-slate-900 shadow-2xl relative overflow-hidden flex-col transform transition-all duration-500 hover:scale-105">
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
          <div className="w-32 h-6 bg-slate-900 rounded-b-2xl"></div>
        </div>

        {/* App Header Preview */}
        <div className="pt-12 pb-6 px-6 text-white transition-colors duration-500 relative" style={{ backgroundColor: color }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-2xl font-black tracking-tighter truncate">{nombre || 'Tu App'}</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">{rubro}</p>
          </div>
        </div>

        {/* App Body Preview */}
        <div className="flex-1 bg-slate-50 p-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">{svcNombre || 'Servicio de Ejemplo'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{svcDuracion} min</p>
            </div>
            <p className="text-xs font-black" style={{ color }}>${svcPrecio || '0'}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Horarios Seleccionados</p>
            <div className="flex gap-2">
              {DIAS.filter(d => horarios[d].abierto).slice(0, 4).map(d => (
                <div key={d} className="flex-1 aspect-square rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-800">{DIAS_LABEL[d].slice(0,3)}</span>
                </div>
              ))}
              {DIAS.filter(d => horarios[d].abierto).length > 4 && (
                <div className="flex-1 aspect-square rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400">+{DIAS.filter(d => horarios[d].abierto).length - 4}</span>
                </div>
              )}
            </div>
          </div>
          
          {step === 5 && (
            <div className="absolute bottom-8 inset-x-6">
              <button className="w-full py-3.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg" style={{ backgroundColor: color }}>
                Reservar Turno
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch(STEPS[step].id) {
      case 'welcome': return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 fade-in">
          <div className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center shadow-2xl bg-slate-900 border border-slate-800">
            <span className="text-white font-black text-2xl italic tracking-tighter">NS</span>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight">Construyamos tu aplicación.</h3>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-3 max-w-md leading-relaxed">
              El motor de reservas ha sido asignado a tu cuenta. En los próximos pasos definiremos la arquitectura pública de tu negocio.
            </p>
          </div>
          <button onClick={next} className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 transition-colors text-white font-black text-[10px] md:text-xs uppercase tracking-[0.2em] rounded-xl md:rounded-2xl shadow-xl flex items-center justify-center gap-3">
            Iniciar Configuración
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>
      )

      case 'negocio': return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 fade-in">
          <div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 leading-tight">Identidad Principal</h3>
            <p className="text-sm text-slate-500 font-medium mt-2">Definí el nombre comercial bajo el cual tus clientes conocerán la app.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Nombre de la Aplicación</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Barbería Central" className="w-full p-4 md:p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-900 transition-colors font-bold text-base md:text-lg text-slate-900 shadow-sm" required autoFocus />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Industria / Sector</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
              {RUBROS_DISPONIBLES.map(r => (
                <button key={r} type="button" onClick={() => setRubro(r)} className={`p-4 rounded-xl text-[11px] md:text-xs font-bold transition-all border-2 ${rubro === r ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={prev} className="px-6 py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors">Atrás</button>
            <button onClick={next} disabled={!nombre.trim()} className="flex-1 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed shadow-xl">Siguiente Fase</button>
          </div>
        </div>
      )

      case 'branding': return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 fade-in">
          <div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 leading-tight">Diseño de Interfaz</h3>
            <p className="text-sm text-slate-500 font-medium mt-2">Seleccioná un color principal que represente tu marca. Este color dominará la experiencia de tus clientes.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Color Hexadecimal</label>
            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm focus-within:border-slate-900 transition-colors">
              <div className="w-12 h-12 rounded-xl shadow-inner relative overflow-hidden cursor-pointer">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute inset-[-10px] w-20 h-20 cursor-pointer" />
              </div>
              <span className="font-mono text-sm md:text-base font-black text-slate-900 uppercase tracking-widest">{color}</span>
            </div>
          </div>
          
          {/* Quick colors */}
          <div className="flex gap-2 flex-wrap">
             {['#000000', '#2563EB', '#16A34A', '#DC2626', '#9333EA', '#EA580C'].map(c => (
               <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-xl shadow-sm border-2 transition-transform hover:scale-110 ${color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }}></button>
             ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={prev} className="px-6 py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors">Atrás</button>
            <button onClick={next} className="flex-1 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-black text-[10px] uppercase tracking-widest shadow-xl">Confirmar Diseño</button>
          </div>
        </div>
      )

      case 'horarios': return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 fade-in">
           <div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 leading-tight">Motor de Calendario</h3>
            <p className="text-sm text-slate-500 font-medium mt-2">El motor de Non Sistemas automatizará tu disponibilidad. Definí qué días aceptás reservas.</p>
          </div>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {DIAS.map(d => (
              <div key={d} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${horarios[d].abierto ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                <button type="button" onClick={() => toggleDia(d)} className={`w-12 h-7 rounded-full relative transition-colors ${horarios[d].abierto ? 'bg-slate-900' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${horarios[d].abierto ? 'left-[22px]' : 'left-1'}`}></div>
                </button>
                <span className="text-sm font-black text-slate-700 w-24 uppercase tracking-widest">{DIAS_LABEL[d]}</span>
                {horarios[d].abierto && (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={horarios[d].inicio} onChange={e => setHora(d,'inicio',e.target.value)} className="bg-slate-100 border-none rounded-lg px-3 py-2 text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-shadow" />
                    <span className="text-xs text-slate-400 font-bold">a</span>
                    <input type="time" value={horarios[d].fin} onChange={e => setHora(d,'fin',e.target.value)} className="bg-slate-100 border-none rounded-lg px-3 py-2 text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-shadow" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={prev} className="px-6 py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors">Atrás</button>
            <button onClick={crearNegocio} disabled={saving} className="flex-1 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Construir Infraestructura'}
            </button>
          </div>
        </div>
      )

      case 'servicio': return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 fade-in">
           <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              Infraestructura Creada
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 leading-tight">Módulo Operativo</h3>
            <p className="text-sm text-slate-500 font-medium mt-2">Para que tu aplicación funcione, necesitamos crear el primer {vocab.servicio} que tus clientes podrán contratar.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Nombre del {vocab.servicio}</label>
            <input value={svcNombre} onChange={e => setSvcNombre(e.target.value)} placeholder={vocab.placeholderServicio} className="w-full p-4 md:p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-900 transition-colors font-bold text-base md:text-lg text-slate-900 shadow-sm" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Precio Base ($)</label>
              <input type="number" value={svcPrecio} onChange={e => setSvcPrecio(e.target.value)} placeholder="0" className="w-full p-4 md:p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-900 transition-colors font-bold text-base md:text-lg text-slate-900 shadow-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Duración</label>
              <select value={svcDuracion} onChange={e => setSvcDuracion(e.target.value)} className="w-full p-4 md:p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-900 transition-colors font-bold text-base md:text-lg text-slate-900 shadow-sm cursor-pointer appearance-none">
                {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} minutos</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button onClick={crearServicio} disabled={saving} className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-white font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (svcNombre ? 'Desplegar Servicio' : 'Omitir Paso')}
            </button>
          </div>
        </div>
      )

      case 'listo': return (
        <div className="text-center space-y-6 animate-in slide-in-from-bottom-8 duration-700 fade-in py-8">
          <div className="w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center shadow-2xl bg-green-500 border-4 border-green-400 transform transition-all hover:scale-105 hover:rotate-3">
            <svg className="w-12 h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <h3 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 leading-tight">Sistemas en Línea</h3>
            <p className="text-base text-slate-500 font-medium mt-3 max-w-sm mx-auto leading-relaxed">
              La infraestructura de <span className="font-bold text-slate-900">{nombre}</span> ha sido provisionada exitosamente. Tu panel de gestión administrativa está listo.
            </p>
          </div>
          <button onClick={onComplete} className="w-full max-w-xs mx-auto py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 transition-all text-white font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3">
            Entrar al Panel
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>
      )
      default: return null
    }
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Left Pane - Content */}
      <div className="flex-1 flex flex-col p-6 md:p-12 lg:p-16 justify-between bg-white relative z-10">
        
        {/* Header Steps Progress */}
        <div className="w-full max-w-xl mx-auto flex items-center gap-2 md:gap-3">
          {STEPS.map((s, i) => (
             <div key={i} className={`h-1.5 md:h-2 flex-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-slate-900' : 'bg-slate-100'}`} />
          ))}
        </div>

        {/* Dynamic Content */}
        <div className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-center py-10">
           {renderStep()}
        </div>

        {/* Footer */}
        <div className="w-full max-w-xl mx-auto text-left">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
             Non Sistemas • Infraestructura en la Nube
           </p>
        </div>
      </div>

      {/* Right Pane - Preview */}
      <div className="hidden lg:flex w-[45%] bg-slate-50 items-center justify-center p-12 border-l border-slate-100 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(15,23,42,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full top-1/4 left-1/4"></div>
        <div className="absolute w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full bottom-1/4 right-1/4"></div>
        
        {/* Phone Preview */}
        {renderPhonePreview()}
      </div>
    </div>
  )
}
