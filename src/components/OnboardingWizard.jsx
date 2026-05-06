import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { RUBROS_DISPONIBLES, getVocabulario } from '../utils/vocabulario'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }

export default function OnboardingWizard({ session, onComplete }) {
  // State for all collected data
  const [data, setData] = useState({
    nombre: '',
    rubro: '',
    color: '#0f172a',
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
  
  // UI States
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const vocab = getVocabulario(data.rubro || RUBROS_DISPONIBLES[0])

  // Sequence of conversational steps
  const steps = [
    { id: 'welcome', bot: () => "¡Hola! 👋 Qué bueno tenerte por acá. Vamos a configurar tu sistema de reservas en un par de minutos. ¿Arrancamos?", type: 'button', btnText: '¡Dale, empecemos!' },
    { id: 'nombre', bot: () => "Primero lo primero... ¿Cómo se llama tu negocio?", type: 'text', placeholder: 'Ej: Barbería Central' },
    { id: 'rubro', bot: (d) => `¡Qué buen nombre "${d.nombre}"! 🚀 ¿En qué rubro se especializan?`, type: 'options', options: RUBROS_DISPONIBLES },
    { id: 'color', bot: () => "¡Genial! Vamos a darle identidad. ¿Qué color representa mejor a tu marca?", type: 'color' },
    { id: 'descripcion', bot: () => "¿Querés agregar una frase corta que describa tu negocio? (Opcional)", type: 'textarea' },
    { id: 'instagram', bot: () => "¡Casi terminamos con el perfil! ¿Tenés un usuario de Instagram para asociar? (Opcional)", type: 'instagram' },
    { id: 'horarios', bot: () => "Ahora lo importante: Tus horarios de atención 🕒. Podés agregar cortes o pausas para el almuerzo.", type: 'horarios' },
    { id: 'servicio', bot: () => `Para que empiecen a entrar clientes, necesitamos tu primer ${vocab.servicio || 'servicio'}. ¿Qué vas a ofrecer y qué precio tiene?`, type: 'servicio' },
    { id: 'staff', bot: () => `Por último, ¿cómo se llama el primer ${vocab.empleado || 'profesional'} de tu equipo? (Podés ser vos mismo)`, type: 'staff' },
    { id: 'saving', bot: () => "¡Todo listo! 🛠️ Estamos construyendo y desplegando tu plataforma...", type: 'loading' },
    { id: 'listo', bot: () => "🎉 ¡Felicitaciones! Tu sistema está activo y en línea.", type: 'success' },
  ]

  // Track chat history so we can display past messages
  const [history, setHistory] = useState([
    { role: 'bot', text: steps[0].bot(data), id: 'welcome_msg' }
  ])

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => { scrollToBottom() }, [history, isTyping, stepIndex])

  // Handle advancing to the next step
  const advance = async (userAnswerText, dataUpdates = {}) => {
    const newData = { ...data, ...dataUpdates }
    setData(newData)
    
    // Add user's answer to history
    const newHistory = [...history]
    if (userAnswerText) {
      newHistory.push({ role: 'user', text: userAnswerText, id: `user_${stepIndex}` })
    }
    
    setHistory(newHistory)
    setInputValue('')
    
    // Simulate bot typing
    setIsTyping(true)
    setTimeout(async () => {
      setIsTyping(false)
      const nextIdx = stepIndex + 1
      setStepIndex(nextIdx)
      
      const nextStep = steps[nextIdx]
      setHistory(h => [...h, { role: 'bot', text: nextStep.bot(newData), id: `bot_${nextIdx}` }])

      // If we reached saving, execute DB calls
      if (nextStep.id === 'saving') {
        await executeBackendCreation(newData)
      }
    }, 800) // 800ms typing delay for realism
  }

  const executeBackendCreation = async (finalData) => {
    try {
      // 1. Crear Negocio
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
      const nid = negData.id
      setNegocioId(nid)

      // 2. Crear Servicio (if exists)
      if (finalData.svcNombre) {
        await supabase.from('servicios').insert([{ 
          negocio_id: nid, 
          nombre: finalData.svcNombre, 
          precio: Number(finalData.svcPrecio) || 0, 
          duracion_minutos: Number(finalData.svcDuracion) || 30 
        }])
      }

      // 3. Crear Staff (if exists)
      if (finalData.staffNombre) {
        await supabase.from('empleados').insert([{ 
          negocio_id: nid, 
          nombre: finalData.staffNombre, 
          especialidad: finalData.staffEspecialidad, 
          estado: 'activo' 
        }])
      }

      // Automatically advance to success
      advance()
    } catch (e) {
      alert("Error al provisionar sistema: " + e.message)
    }
  }

  // --- RENDERING INPUTS ---
  const currentStep = steps[stepIndex]

  const renderInput = () => {
    if (isTyping) return null

    switch(currentStep.type) {
      case 'button':
        return (
          <button onClick={() => advance('¡Dale, empecemos!')} className="px-6 py-4 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-slate-800 transition-transform active:scale-95 shadow-lg flex items-center gap-2">
            {currentStep.btnText}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        )
      
      case 'text':
        return (
          <form onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) advance(inputValue, { nombre: inputValue }) }} className="flex w-full max-w-sm gap-2">
            <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={currentStep.placeholder} className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-slate-900 font-medium text-slate-900 shadow-sm" />
            <button type="submit" disabled={!inputValue.trim()} className="p-4 bg-slate-900 text-white rounded-2xl disabled:opacity-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>
        )

      case 'textarea':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `"${inputValue}"` : 'Omitido', { descripcion: inputValue }) }} className="w-full max-w-sm space-y-3">
            <textarea autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Agregá tu descripción aquí..." className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-slate-900 font-medium text-slate-900 shadow-sm h-24 resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => advance('Omitido', { descripcion: '' })} className="flex-1 p-3.5 bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200">Omitir</button>
              <button type="submit" disabled={!inputValue.trim()} className="flex-[2] p-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl disabled:opacity-50">Siguiente</button>
            </div>
          </form>
        )
      
      case 'instagram':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `@${inputValue}` : 'Omitido', { instagram: inputValue }) }} className="w-full max-w-sm space-y-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm focus-within:border-slate-900">
              <span className="pl-4 pr-2 text-slate-400 font-bold">@</span>
              <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="tu_cuenta" className="flex-1 py-4 pr-4 bg-transparent outline-none font-medium text-slate-900" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => advance('Omitido', { instagram: '' })} className="flex-1 p-3.5 bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200">Omitir</button>
              <button type="submit" disabled={!inputValue.trim()} className="flex-[2] p-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl disabled:opacity-50">Siguiente</button>
            </div>
          </form>
        )

      case 'options':
        return (
          <div className="flex flex-wrap gap-2 max-w-lg">
            {currentStep.options.map(opt => (
              <button key={opt} onClick={() => advance(opt, { rubro: opt })} className="px-5 py-3 bg-white border border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-colors text-slate-700 font-bold text-sm rounded-xl shadow-sm">
                {opt}
              </button>
            ))}
          </div>
        )

      case 'color':
        return (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm max-w-xs space-y-4">
            <div className="flex items-center gap-4">
              <input type="color" value={data.color} onChange={e => setData({...data, color: e.target.value})} className="w-14 h-14 rounded-xl cursor-pointer bg-transparent border-none p-0" />
              <span className="font-mono font-bold text-lg text-slate-800 uppercase">{data.color}</span>
            </div>
            <div className="flex gap-2">
             {['#0f172a', '#2563EB', '#16A34A', '#DC2626', '#9333EA'].map(c => (
               <button key={c} onClick={() => setData({...data, color: c})} className="w-8 h-8 rounded-full border-2 border-transparent focus:border-slate-400" style={{ backgroundColor: c }}></button>
             ))}
            </div>
            <button onClick={() => advance(`Color seleccionado: ${data.color}`)} className="w-full py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl">
              Confirmar Color
            </button>
          </div>
        )

      case 'horarios':
        return (
          <div className="w-full max-w-2xl bg-white p-2 md:p-4 rounded-[2rem] border border-slate-200 shadow-sm space-y-2">
            <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar space-y-2 p-2">
              {DIAS.map(d => (
                <div key={d} className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all ${data.horarios[d].abierto ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setData(prev => ({ ...prev, horarios: { ...prev.horarios, [d]: { ...prev.horarios[d], abierto: !prev.horarios[d].abierto } } }))} className={`w-12 h-7 rounded-full relative transition-colors ${data.horarios[d].abierto ? 'bg-slate-900' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${data.horarios[d].abierto ? 'left-[22px]' : 'left-1'}`}></div>
                      </button>
                      <span className="text-sm font-black text-slate-700 w-24 uppercase tracking-widest">{DIAS_LABEL[d]}</span>
                    </div>
                    {data.horarios[d].abierto && (
                      <div className="flex items-center gap-2">
                        <input type="time" value={data.horarios[d].inicio} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicio: e.target.value } } }))} className="bg-slate-100 rounded-lg px-2 py-1 md:px-3 md:py-2 text-xs font-bold outline-none" />
                        <span className="text-xs text-slate-400 font-bold">-</span>
                        <input type="time" value={data.horarios[d].fin} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], fin: e.target.value } } }))} className="bg-slate-100 rounded-lg px-2 py-1 md:px-3 md:py-2 text-xs font-bold outline-none" />
                      </div>
                    )}
                  </div>
                  {data.horarios[d].abierto && (
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 pl-14">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={data.horarios[d].pausa || false} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], pausa: e.target.checked } } }))} className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Corte / Pausa</span>
                      </label>
                      {data.horarios[d].pausa && (
                        <div className="flex items-center gap-2">
                          <input type="time" value={data.horarios[d].inicioPausa || '13:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicioPausa: e.target.value } } }))} className="bg-slate-100 rounded-lg px-2 py-1 text-xs font-bold outline-none" />
                          <span className="text-slate-300 font-bold text-xs">-</span>
                          <input type="time" value={data.horarios[d].finPausa || '17:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], finPausa: e.target.value } } }))} className="bg-slate-100 rounded-lg px-2 py-1 text-xs font-bold outline-none" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 pt-4">
              <button onClick={() => advance('Horarios guardados')} className="w-full py-4 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg">
                Guardar Horarios
              </button>
            </div>
          </div>
        )

      case 'servicio':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(`${data.svcNombre} a $${data.svcPrecio} (${data.svcDuracion} min)`) }} className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm max-w-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.svcNombre} onChange={e => setData({...data, svcNombre: e.target.value})} placeholder={`Ej: ${vocab.placeholderServicio || 'Corte Clásico'}`} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Precio ($)</label>
                <input required type="number" value={data.svcPrecio} onChange={e => setData({...data, svcPrecio: e.target.value})} placeholder="0" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Duración (min)</label>
                <select value={data.svcDuracion} onChange={e => setData({...data, svcDuracion: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm">
                  {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => advance('Omitir servicio', { svcNombre: '' })} className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">Omitir</button>
              <button type="submit" disabled={!data.svcNombre} className="flex-[2] py-3.5 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg disabled:opacity-50">Guardar</button>
            </div>
          </form>
        )

      case 'staff':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(`${data.staffNombre} (${data.staffEspecialidad || 'General'})`) }} className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm max-w-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
              <input required value={data.staffNombre} onChange={e => setData({...data, staffNombre: e.target.value})} placeholder="Ej: Juan Pérez" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Especialidad (Opcional)</label>
              <input value={data.staffEspecialidad} onChange={e => setData({...data, staffEspecialidad: e.target.value})} placeholder={vocab.placeholderEspecialidad || 'Ej: Estilista'} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => advance('Omitido', { staffNombre: '' })} className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">Omitir</button>
              <button type="submit" disabled={!data.staffNombre} className="flex-[2] py-3.5 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg disabled:opacity-50">Finalizar</button>
            </div>
          </form>
        )

      case 'success':
        const publicSlug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const publicLink = `${window.location.origin}/app/${publicSlug}/${negocioId || ''}`
        return (
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl max-w-sm w-full space-y-6 text-center animate-in zoom-in-95 duration-700">
            <div className="w-20 h-20 mx-auto rounded-[1.5rem] flex items-center justify-center border-4" style={{ backgroundColor: data.color, borderColor: `${data.color}40` }}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{data.nombre}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Tu aplicación ya está en internet.</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-slate-300 transition-colors" onClick={() => { navigator.clipboard.writeText(publicLink); alert('¡Enlace copiado!') }}>
              <code className="text-[10px] font-bold text-slate-700 block truncate">{publicLink}</code>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Copiar Link Público</p>
            </div>
            <button onClick={onComplete} className="w-full py-4 bg-slate-900 hover:bg-slate-800 transition-colors text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg">
              Entrar al Panel
            </button>
          </div>
        )

      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <nav className="h-14 border-b bg-white/90 backdrop-blur-md border-slate-200 flex items-center justify-center sticky top-0 z-50">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Asistente de Configuración</p>
      </nav>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-3xl mx-auto w-full pb-32">
        {history.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            {msg.role === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shrink-0 mr-3 shadow-md mt-1">NS</div>
            )}
            <div className={`max-w-[85%] md:max-w-[70%] p-4 md:p-5 text-sm md:text-base font-medium leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-3xl rounded-tr-sm' 
                : 'bg-white border border-slate-100 text-slate-700 rounded-3xl rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shrink-0 mr-3 shadow-md">NS</div>
             <div className="bg-white border border-slate-100 rounded-3xl rounded-tl-sm p-4 flex items-center gap-1 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent pt-10 pb-6 px-4 pointer-events-none">
        <div className="max-w-3xl mx-auto flex justify-start pl-11 md:pl-12 pointer-events-auto">
          {renderInput()}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  )
}
