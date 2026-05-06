import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { RUBROS_DISPONIBLES, getVocabulario } from '../utils/vocabulario'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }

export default function OnboardingWizard({ session, onComplete }) {
  const [data, setData] = useState({
    nombre: '',
    rubro: '',
    color: '#0EA5E9', // Default celeste
    descripcion: '',
    instagram: '',
    horarios: (() => {
      const h = {}
      DIAS.forEach(d => { 
        h[d] = { abierto: ['lunes','martes','miercoles','jueves','viernes'].includes(d), inicio: '09:00', fin: '18:00', pausa: false, inicioPausa: '13:00', finPausa: '17:00' } 
      })
      return h
    })(),
    svcNombre: '',
    svcPrecio: '',
    svcDuracion: '30',
    staffNombre: '',
    staffEspecialidad: ''
  })
  
  const [negocioId, setNegocioId] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const vocab = getVocabulario(data.rubro || RUBROS_DISPONIBLES[0])

  const steps = [
    { id: 'welcome', bot: () => "¡Hola! 👋 Qué bueno tenerte por acá. Vamos a configurar tu sistema de reservas en un par de minutos. ¿Arrancamos?", type: 'button', btnText: '¡Dale, empecemos!' },
    { id: 'nombre', bot: () => "Primero lo primero... ¿Cómo se llama tu negocio?", type: 'text', placeholder: 'Ej: Barbería Central' },
    { id: 'rubro', bot: (d) => `¡Me encanta "${d.nombre}"! 🚀 ¿En qué rubro se especializan?`, type: 'options', options: RUBROS_DISPONIBLES },
    { id: 'color', bot: () => "¡Perfecto! Ahora vamos a darle estilo. 🎨 Elegí el color de tu marca y mirá cómo va a quedar tu página en vivo.", type: 'color' },
    { id: 'descripcion', bot: () => "¡Queda genial! ¿Querés agregar una frase corta que describa tu negocio? (Opcional)", type: 'textarea' },
    { id: 'instagram', bot: () => "¡Casi terminamos con el perfil! 📸 ¿Tenés un usuario de Instagram para asociar? (Opcional)", type: 'instagram' },
    { id: 'horarios', bot: () => "Ahora lo importante: Tus horarios de atención 🕒. Podés agregar cortes o pausas para el almuerzo.", type: 'horarios' },
    { id: 'servicio', bot: () => `¡Excelente! Para que empiecen a entrar reservas, necesitamos tu primer ${vocab.servicio || 'servicio'}. ¿Qué vas a ofrecer y qué precio tiene?`, type: 'servicio' },
    { id: 'staff', bot: () => `Por último, ¿cómo se llama el primer ${vocab.empleado || 'profesional'} de tu equipo? (Podés ser vos mismo)`, type: 'staff' },
    { id: 'saving', bot: () => "¡Todo listo! ✨ Estamos construyendo y desplegando tu plataforma...", type: 'loading' },
    { id: 'listo', bot: () => "🎉 ¡Felicitaciones! Tu sistema está activo y en línea.", type: 'success' },
  ]

  const [history, setHistory] = useState([{ role: 'bot', text: steps[0].bot(data), id: 'welcome_msg' }])

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [history, isTyping, stepIndex])

  const advance = async (userAnswerText, dataUpdates = {}) => {
    const newData = { ...data, ...dataUpdates }
    setData(newData)
    
    const newHistory = [...history]
    if (userAnswerText) newHistory.push({ role: 'user', text: userAnswerText, id: `user_${stepIndex}` })
    
    setHistory(newHistory)
    setInputValue('')
    
    setIsTyping(true)
    setTimeout(async () => {
      setIsTyping(false)
      const nextIdx = stepIndex + 1
      setStepIndex(nextIdx)
      
      const nextStep = steps[nextIdx]
      setHistory(h => [...h, { role: 'bot', text: nextStep.bot(newData), id: `bot_${nextIdx}` }])

      if (nextStep.id === 'saving') await executeBackendCreation(newData)
    }, 800)
  }

  const executeBackendCreation = async (finalData) => {
    try {
      const { data: negData, error: negErr } = await supabase.from('negocios').insert([{
        owner_id: session.user.id, 
        nombre: finalData.nombre, 
        rubro: finalData.rubro, 
        color_primario: finalData.color,
        descripcion: finalData.descripcion, 
        instagram: finalData.instagram, 
        horarios: finalData.horarios,
        estado_suscripcion: 'activo',
        es_admin_plataforma: import.meta.env.VITE_SUPERADMIN_EMAIL ? (session.user.email === import.meta.env.VITE_SUPERADMIN_EMAIL) : false
      }]).select().single()
      
      if (negErr) throw negErr
      setNegocioId(negData.id)

      if (finalData.svcNombre) {
        await supabase.from('servicios').insert([{ 
          negocio_id: negData.id, 
          nombre: finalData.svcNombre, 
          precio: Number(finalData.svcPrecio) || 0, 
          duracion_minutos: Number(finalData.svcDuracion) || 30 
        }])
      }

      if (finalData.staffNombre) {
        await supabase.from('empleados').insert([{ 
          negocio_id: negData.id, 
          nombre: finalData.staffNombre, 
          especialidad: finalData.staffEspecialidad, 
          estado: 'activo' 
        }])
      }

      advance()
    } catch (e) { alert("Error al provisionar sistema: " + e.message) }
  }

  const renderInput = () => {
    if (isTyping) return null
    const currentStep = steps[stepIndex]

    switch(currentStep.type) {
      case 'button':
        return (
          <button onClick={() => advance('¡Empecemos!')} className="px-6 py-4 bg-sky-500 text-white font-black text-sm rounded-2xl hover:bg-sky-400 transition-transform active:scale-95 shadow-xl shadow-sky-500/30 flex items-center gap-2">
            {currentStep.btnText}
            <svg className="w-5 h-5 animate-bounce-x" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        )
      
      case 'text':
        return (
          <form onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) advance(inputValue, { nombre: inputValue }) }} className="flex w-full max-w-sm gap-2">
            <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={currentStep.placeholder} className="flex-1 p-4 bg-white border-2 border-sky-100 rounded-2xl outline-none focus:border-sky-400 font-bold text-slate-800 shadow-xl transition-all" />
            <button type="submit" disabled={!inputValue.trim()} className="p-4 bg-sky-500 text-white rounded-2xl disabled:opacity-50 transition-all hover:bg-sky-400 shadow-lg shadow-sky-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>
        )

      case 'textarea':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `"${inputValue}"` : 'Lo dejo para después', { descripcion: inputValue }) }} className="w-full max-w-sm space-y-3">
            <textarea autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Agregá tu descripción aquí..." className="w-full p-4 bg-white border-2 border-sky-100 rounded-2xl outline-none focus:border-sky-400 font-medium text-slate-800 shadow-xl transition-all h-28 resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => advance('Lo dejo para después', { descripcion: '' })} className="flex-1 p-3.5 bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200">Omitir</button>
              <button type="submit" disabled={!inputValue.trim()} className="flex-[2] p-3.5 bg-sky-500 text-white font-black text-xs uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-sky-400 shadow-lg shadow-sky-500/20">Siguiente</button>
            </div>
          </form>
        )
      
      case 'instagram':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `@${inputValue}` : 'No tengo por ahora', { instagram: inputValue }) }} className="w-full max-w-sm space-y-3">
            <div className="flex items-center bg-white border-2 border-sky-100 rounded-2xl overflow-hidden shadow-xl focus-within:border-sky-400 transition-all">
              <span className="pl-4 pr-2 text-sky-400 font-black text-lg">@</span>
              <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="tu_cuenta" className="flex-1 py-4 pr-4 bg-transparent outline-none font-bold text-slate-800" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => advance('No tengo por ahora', { instagram: '' })} className="flex-1 p-3.5 bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200">Omitir</button>
              <button type="submit" disabled={!inputValue.trim()} className="flex-[2] p-3.5 bg-sky-500 text-white font-black text-xs uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-sky-400 shadow-lg shadow-sky-500/20">Siguiente</button>
            </div>
          </form>
        )

      case 'options':
        return (
          <div className="flex flex-wrap gap-2 max-w-lg">
            {currentStep.options.map(opt => (
              <button key={opt} onClick={() => advance(opt, { rubro: opt })} className="px-5 py-3.5 bg-white border-2 border-sky-100 hover:border-sky-400 hover:bg-sky-50 transition-all text-slate-700 font-bold text-sm rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-0.5">
                {opt}
              </button>
            ))}
          </div>
        )

      case 'color':
        return (
          <div className="w-full max-w-3xl flex flex-col md:flex-row gap-6 items-end md:items-stretch">
            {/* Controles de Color */}
            <div className="bg-white p-5 md:p-6 rounded-[2rem] border-2 border-sky-100 shadow-2xl space-y-6 flex-1 w-full max-w-sm">
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="relative">
                  <input type="color" value={data.color} onChange={e => setData({...data, color: e.target.value})} className="w-12 h-12 rounded-xl cursor-pointer opacity-0 absolute inset-0 z-10" />
                  <div className="w-12 h-12 rounded-xl shadow-inner border-2 border-white pointer-events-none" style={{ backgroundColor: data.color }}></div>
                </div>
                <span className="font-mono font-black text-lg text-slate-700 uppercase tracking-widest">{data.color}</span>
              </div>
              <div className="flex gap-2">
               {['#0EA5E9', '#10B981', '#F43F5E', '#8B5CF6', '#F59E0B'].map(c => (
                 <button key={c} onClick={() => setData({...data, color: c})} className="flex-1 aspect-square rounded-xl border-4 transition-transform hover:scale-110 shadow-md" style={{ backgroundColor: c, borderColor: data.color === c ? '#1e293b' : 'transparent' }}></button>
               ))}
              </div>
              <button onClick={() => advance(`Color elegido: ${data.color}`)} className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
                Me encanta, sigamos
              </button>
            </div>
            
            {/* Live Preview */}
            <div className="hidden md:block bg-white p-4 rounded-[2.5rem] border-4 border-slate-100 shadow-2xl w-72 shrink-0 animate-in slide-in-from-right-8 duration-700 overflow-hidden relative">
              {/* Header decor */}
              <div className="h-24 -mx-4 -mt-4 bg-slate-100 relative">
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white flex items-center justify-center font-black text-white text-xl shadow-md transition-colors duration-500" style={{ backgroundColor: data.color }}>
                  {data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS'}
                </div>
              </div>
              <div className="mt-8 text-center px-2">
                <h4 className="font-black text-lg text-slate-900 truncate">{data.nombre || 'Tu Negocio'}</h4>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{data.rubro || 'Rubro'}</p>
              </div>
              <div className="mt-6 space-y-3">
                <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Servicio Básico</p>
                    <p className="text-[10px] text-slate-500">30 min</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-[10px] font-black text-white transition-colors duration-500 shadow-md" style={{ backgroundColor: data.color }}>
                    Reservar
                  </button>
                </div>
                <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Servicio Premium</p>
                    <p className="text-[10px] text-slate-500">60 min</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-[10px] font-black text-white transition-colors duration-500 shadow-md" style={{ backgroundColor: data.color }}>
                    Reservar
                  </button>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                 <div className="w-1.5 h-1.5 rounded-full transition-colors duration-500" style={{ backgroundColor: data.color }}></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
              </div>
            </div>
          </div>
        )

      case 'horarios':
        return (
          <div className="w-full max-w-2xl bg-white p-3 md:p-5 rounded-[2.5rem] border-2 border-sky-100 shadow-2xl space-y-3">
            <div className="max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar space-y-2.5 p-1">
              {DIAS.map(d => (
                <div key={d} className={`flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all ${data.horarios[d].abierto ? 'bg-sky-50/50 border-sky-100 shadow-sm' : 'bg-transparent border-slate-100 opacity-60'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setData(prev => ({ ...prev, horarios: { ...prev.horarios, [d]: { ...prev.horarios[d], abierto: !prev.horarios[d].abierto } } }))} className={`w-12 h-7 rounded-full relative transition-colors ${data.horarios[d].abierto ? 'bg-sky-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${data.horarios[d].abierto ? 'left-[22px]' : 'left-1'}`}></div>
                      </button>
                      <span className="text-sm font-black text-slate-700 w-24 uppercase tracking-widest">{DIAS_LABEL[d]}</span>
                    </div>
                    {data.horarios[d].abierto && (
                      <div className="flex items-center gap-2">
                        <input type="time" value={data.horarios[d].inicio} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicio: e.target.value } } }))} className="bg-white border-2 border-sky-100 rounded-xl px-2 py-1.5 md:px-3 md:py-2 text-xs font-bold outline-none text-slate-800 focus:border-sky-400 transition-colors" />
                        <span className="text-xs text-slate-400 font-bold">-</span>
                        <input type="time" value={data.horarios[d].fin} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], fin: e.target.value } } }))} className="bg-white border-2 border-sky-100 rounded-xl px-2 py-1.5 md:px-3 md:py-2 text-xs font-bold outline-none text-slate-800 focus:border-sky-400 transition-colors" />
                      </div>
                    )}
                  </div>
                  {data.horarios[d].abierto && (
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 pl-14">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={data.horarios[d].pausa || false} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], pausa: e.target.checked } } }))} className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Agregar Corte</span>
                      </label>
                      {data.horarios[d].pausa && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
                          <input type="time" value={data.horarios[d].inicioPausa || '13:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicioPausa: e.target.value } } }))} className="bg-white border-2 border-sky-100 rounded-xl px-2 py-1.5 text-xs font-bold outline-none text-slate-800 focus:border-sky-400" />
                          <span className="text-slate-400 font-bold text-xs">-</span>
                          <input type="time" value={data.horarios[d].finPausa || '17:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], finPausa: e.target.value } } }))} className="bg-white border-2 border-sky-100 rounded-xl px-2 py-1.5 text-xs font-bold outline-none text-slate-800 focus:border-sky-400" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 pt-4">
              <button onClick={() => advance('¡Horarios listos!')} className="w-full py-4 bg-sky-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-sky-500/30 hover:bg-sky-400 transition-all">
                Confirmar Agenda
              </button>
            </div>
          </div>
        )

      case 'servicio':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(`${data.svcNombre} a $${data.svcPrecio} (${data.svcDuracion} min)`) }} className="bg-white p-6 rounded-[2.5rem] border-2 border-sky-100 shadow-2xl max-w-sm space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.svcNombre} onChange={e => setData({...data, svcNombre: e.target.value})} placeholder={`Ej: ${vocab.placeholderServicio || 'Corte Clásico'}`} className="w-full p-4 bg-slate-50 border-2 border-sky-100 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:bg-white transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ($)</label>
                <input required type="number" value={data.svcPrecio} onChange={e => setData({...data, svcPrecio: e.target.value})} placeholder="0" className="w-full p-4 bg-slate-50 border-2 border-sky-100 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:bg-white transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiempo</label>
                <select value={data.svcDuracion} onChange={e => setData({...data, svcDuracion: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-sky-100 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:bg-white transition-all appearance-none cursor-pointer">
                  {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => advance('Lo omito por ahora', { svcNombre: '' })} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">Omitir</button>
              <button type="submit" disabled={!data.svcNombre} className="flex-[2] py-4 bg-sky-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-30 hover:bg-sky-400 transition-colors">Crear Servicio</button>
            </div>
          </form>
        )

      case 'staff':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(`${data.staffNombre} (${data.staffEspecialidad || 'General'})`) }} className="bg-white p-6 rounded-[2.5rem] border-2 border-sky-100 shadow-2xl max-w-sm space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.staffNombre} onChange={e => setData({...data, staffNombre: e.target.value})} placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border-2 border-sky-100 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:bg-white transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidad</label>
              <input value={data.staffEspecialidad} onChange={e => setData({...data, staffEspecialidad: e.target.value})} placeholder={vocab.placeholderEspecialidad || 'Ej: General'} className="w-full p-4 bg-slate-50 border-2 border-sky-100 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:bg-white transition-all" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => advance('Lo configuro luego', { staffNombre: '' })} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">Omitir</button>
              <button type="submit" disabled={!data.staffNombre} className="flex-[2] py-4 bg-sky-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-30 hover:bg-sky-400 transition-colors">¡Terminar!</button>
            </div>
          </form>
        )

      case 'success':
        const publicSlug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const publicLink = `${window.location.origin}/app/${publicSlug}/${negocioId || ''}`
        return (
          <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] max-w-sm w-full space-y-8 text-center animate-in zoom-in-95 duration-700">
            <div className="w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center shadow-xl shadow-current/20 transition-colors duration-500" style={{ backgroundColor: data.color }}>
              <svg className="w-12 h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{data.nombre}</h3>
              <p className="text-sm text-slate-500 font-bold mt-2">¡La magia está hecha! Tu app está lista.</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 cursor-pointer hover:border-sky-200 hover:bg-sky-50 transition-colors group" onClick={() => { navigator.clipboard.writeText(publicLink); alert('¡Enlace copiado al portapapeles!') }}>
              <code className="text-[12px] font-black text-slate-800 block truncate group-hover:text-sky-600 transition-colors">{publicLink}</code>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 group-hover:text-sky-500 transition-colors">Copiar tu Enlace</p>
            </div>
            <button onClick={onComplete} className="w-full py-5 bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5 transition-all font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl">
              Entrar al Panel de Control
            </button>
          </div>
        )

      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans antialiased selection:bg-sky-200">
      {/* Top Navbar */}
      <nav className="h-16 border-b bg-white/70 backdrop-blur-xl border-sky-100 flex items-center justify-center px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[0.6rem] bg-gradient-to-tr from-sky-500 to-sky-400 flex items-center justify-center shadow-md">
            <span className="text-white font-black text-[11px] italic">NS</span>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Non Sistemas</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-sky-500">Setup Interactivo</p>
          </div>
        </div>
      </nav>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full pb-48 scroll-smooth">
        {history.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            {msg.role === 'bot' && (
              <div className="w-10 h-10 rounded-[0.8rem] bg-white border border-sky-100 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                <span className="text-lg">🤖</span>
              </div>
            )}
            <div className={`max-w-[85%] md:max-w-[75%] p-5 md:p-6 text-sm md:text-base font-bold leading-relaxed shadow-lg ${
              msg.role === 'user' 
                ? 'bg-sky-500 text-white rounded-[2rem] rounded-tr-sm shadow-sky-500/20' 
                : 'bg-white border-2 border-sky-100 text-slate-700 rounded-[2rem] rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="w-10 h-10 rounded-[0.8rem] bg-white border border-sky-100 flex items-center justify-center shrink-0 mr-3 shadow-sm">
                <span className="text-lg">🤖</span>
             </div>
             <div className="bg-white border-2 border-sky-100 rounded-[2rem] rounded-tl-sm p-6 flex items-center gap-1.5 shadow-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 rounded-full bg-sky-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 rounded-full bg-sky-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[#F0F9FF] via-[#F0F9FF] to-transparent pt-16 pb-8 px-4 pointer-events-none">
        <div className="max-w-4xl mx-auto flex justify-end md:justify-start pl-0 md:pl-14 pointer-events-auto">
          {renderInput()}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #bae6fd; border-radius: 4px; }
        .animate-bounce-x { animation: bounce-x 1s infinite; }
        @keyframes bounce-x { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(25%); } }
      `}</style>
    </div>
  )
}
