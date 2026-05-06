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
    { id: 'welcome', bot: () => "Iniciando asistente de configuración. Este proceso estructurará la arquitectura base de su plataforma de reservas. ¿Desea comenzar?", type: 'button', btnText: 'Comenzar Configuración' },
    { id: 'nombre', bot: () => "Excelente. Para comenzar, por favor ingrese el nombre comercial principal de su negocio.", type: 'text', placeholder: 'Ej: Barbería Central' },
    { id: 'rubro', bot: (d) => `Registrado: "${d.nombre}". ¿A qué industria o sector comercial pertenece su sistema?`, type: 'options', options: RUBROS_DISPONIBLES },
    { id: 'color', bot: () => "Identidad confirmada. Seleccione o ingrese el código hexadecimal del color corporativo que dominará su interfaz pública.", type: 'color' },
    { id: 'descripcion', bot: () => "Opcional: Ingrese una descripción breve de su empresa. Esto mejorará la presentación pública ante sus clientes.", type: 'textarea' },
    { id: 'instagram', bot: () => "Opcional: Indique el perfil público de Instagram asociado a su marca para la integración de red social.", type: 'instagram' },
    { id: 'horarios', bot: () => "Configuración de Agenda: Defina sus días y horarios operativos. El motor automatizará su disponibilidad basándose en estos parámetros. Active 'Corte / Pausa' si maneja turnos divididos.", type: 'horarios' },
    { id: 'servicio', bot: () => `Módulo Operativo: Para procesar reservas, es necesario crear su primer ${vocab.servicio || 'servicio'}. Indique nombre, valor y duración.`, type: 'servicio' },
    { id: 'staff', bot: () => `Recursos Humanos: Asigne al primer ${vocab.empleado || 'profesional'} responsable de gestionar este calendario.`, type: 'staff' },
    { id: 'saving', bot: () => "Procesando parámetros... Aprovisionando su entorno en la nube y compilando la interfaz pública.", type: 'loading' },
    { id: 'listo', bot: () => "Despliegue finalizado exitosamente. Su infraestructura está operativa y en línea.", type: 'success' },
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
          <button onClick={() => advance('Iniciar Proceso')} className="px-6 py-4 bg-white/10 text-white font-bold text-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all active:scale-95 shadow-2xl flex items-center gap-3">
            {currentStep.btnText}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        )
      
      case 'text':
        return (
          <form onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) advance(inputValue, { nombre: inputValue }) }} className="flex w-full max-w-md gap-2">
            <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={currentStep.placeholder} className="flex-1 p-4 bg-[#0A0A0B] border-2 border-white/10 rounded-xl outline-none focus:border-white/30 font-medium text-white shadow-2xl transition-all" />
            <button type="submit" disabled={!inputValue.trim()} className="p-4 bg-white/10 border border-white/10 text-white rounded-xl disabled:opacity-30 transition-all hover:bg-white/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>
        )

      case 'textarea':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `"${inputValue}"` : 'Omitido', { descripcion: inputValue }) }} className="w-full max-w-md space-y-3">
            <textarea autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Agregue su descripción aquí..." className="w-full p-4 bg-[#0A0A0B] border-2 border-white/10 rounded-xl outline-none focus:border-white/30 font-medium text-white shadow-2xl transition-all h-24 resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => advance('Omitido', { descripcion: '' })} className="flex-1 p-4 bg-white/5 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors">Omitir</button>
              <button type="submit" disabled={!inputValue.trim()} className="flex-[2] p-4 bg-white/10 border border-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-xl disabled:opacity-30 hover:bg-white/20 transition-colors">Confirmar</button>
            </div>
          </form>
        )
      
      case 'instagram':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `@${inputValue}` : 'Omitido', { instagram: inputValue }) }} className="w-full max-w-md space-y-3">
            <div className="flex items-center bg-[#0A0A0B] border-2 border-white/10 rounded-xl overflow-hidden shadow-2xl focus-within:border-white/30 transition-all">
              <span className="pl-4 pr-2 text-slate-500 font-bold">@</span>
              <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="usuario" className="flex-1 py-4 pr-4 bg-transparent outline-none font-medium text-white" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => advance('Omitido', { instagram: '' })} className="flex-1 p-4 bg-white/5 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors">Omitir</button>
              <button type="submit" disabled={!inputValue.trim()} className="flex-[2] p-4 bg-white/10 border border-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-xl disabled:opacity-30 hover:bg-white/20 transition-colors">Confirmar</button>
            </div>
          </form>
        )

      case 'options':
        return (
          <div className="flex flex-wrap gap-2 max-w-xl">
            {currentStep.options.map(opt => (
              <button key={opt} onClick={() => advance(opt, { rubro: opt })} className="px-5 py-3 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all text-slate-300 font-bold text-sm rounded-xl shadow-lg">
                {opt}
              </button>
            ))}
          </div>
        )

      case 'color':
        return (
          <div className="bg-[#0A0A0B] p-5 md:p-6 rounded-2xl border-2 border-white/10 shadow-2xl max-w-sm space-y-5">
            <div className="flex items-center gap-4">
              <input type="color" value={data.color} onChange={e => setData({...data, color: e.target.value})} className="w-14 h-14 rounded-xl cursor-pointer bg-transparent border-none p-0" />
              <span className="font-mono font-black text-lg text-white uppercase tracking-widest">{data.color}</span>
            </div>
            <div className="flex gap-3">
             {['#0f172a', '#2563EB', '#16A34A', '#DC2626', '#9333EA'].map(c => (
               <button key={c} onClick={() => setData({...data, color: c})} className="w-10 h-10 rounded-full border-2 border-transparent focus:border-white/50 hover:scale-110 transition-transform shadow-lg" style={{ backgroundColor: c }}></button>
             ))}
            </div>
            <button onClick={() => advance(`Código asignado: ${data.color}`)} className="w-full py-4 bg-white/10 border border-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all">
              Confirmar Parámetro
            </button>
          </div>
        )

      case 'horarios':
        return (
          <div className="w-full max-w-2xl bg-[#0A0A0B] p-3 md:p-5 rounded-[2rem] border border-white/10 shadow-2xl space-y-3">
            <div className="max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar space-y-2 p-1">
              {DIAS.map(d => (
                <div key={d} className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${data.horarios[d].abierto ? 'bg-white/5 border-white/10 shadow-sm' : 'bg-transparent border-white/5 opacity-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => setData(prev => ({ ...prev, horarios: { ...prev.horarios, [d]: { ...prev.horarios[d], abierto: !prev.horarios[d].abierto } } }))} className={`w-12 h-7 rounded-full relative transition-colors border border-white/10 ${data.horarios[d].abierto ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                        <div className={`absolute top-1 w-5 h-5 rounded-full shadow-lg transition-transform ${data.horarios[d].abierto ? 'left-[22px] bg-emerald-400' : 'left-1 bg-slate-500'}`}></div>
                      </button>
                      <span className="text-sm font-black text-white w-24 uppercase tracking-widest">{DIAS_LABEL[d]}</span>
                    </div>
                    {data.horarios[d].abierto && (
                      <div className="flex items-center gap-2">
                        <input type="time" value={data.horarios[d].inicio} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicio: e.target.value } } }))} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 md:px-3 md:py-2 text-xs font-bold outline-none text-white focus:border-white/30 transition-colors" />
                        <span className="text-xs text-slate-500 font-bold">-</span>
                        <input type="time" value={data.horarios[d].fin} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], fin: e.target.value } } }))} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 md:px-3 md:py-2 text-xs font-bold outline-none text-white focus:border-white/30 transition-colors" />
                      </div>
                    )}
                  </div>
                  {data.horarios[d].abierto && (
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 pl-16">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={data.horarios[d].pausa || false} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], pausa: e.target.checked } } }))} className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-[#0A0A0B]" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Corte / Pausa</span>
                      </label>
                      {data.horarios[d].pausa && (
                        <div className="flex items-center gap-2">
                          <input type="time" value={data.horarios[d].inicioPausa || '13:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicioPausa: e.target.value } } }))} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-white focus:border-white/30" />
                          <span className="text-slate-500 font-bold text-xs">-</span>
                          <input type="time" value={data.horarios[d].finPausa || '17:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], finPausa: e.target.value } } }))} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-white focus:border-white/30" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 pt-4">
              <button onClick={() => advance('Agenda configurada')} className="w-full py-4 bg-white/10 border border-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-2xl hover:bg-white/20 transition-all">
                Compilar Agenda
              </button>
            </div>
          </div>
        )

      case 'servicio':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(`${data.svcNombre} a $${data.svcPrecio} (${data.svcDuracion} min)`) }} className="bg-[#0A0A0B] p-6 rounded-2xl border-2 border-white/10 shadow-2xl max-w-sm space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identificador de Servicio</label>
              <input required value={data.svcNombre} onChange={e => setData({...data, svcNombre: e.target.value})} placeholder={`Ej: ${vocab.placeholderServicio || 'Corte Clásico'}`} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-sm text-white focus:border-white/30 transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor ($)</label>
                <input required type="number" value={data.svcPrecio} onChange={e => setData({...data, svcPrecio: e.target.value})} placeholder="0" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-sm text-white focus:border-white/30 transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Duración</label>
                <select value={data.svcDuracion} onChange={e => setData({...data, svcDuracion: e.target.value})} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-sm text-white focus:border-white/30 transition-colors appearance-none cursor-pointer">
                  {[15,30,45,60,90,120].map(m => <option key={m} value={m} className="bg-slate-900">{m} min</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => advance('Servicio omitido', { svcNombre: '' })} className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors">Omitir</button>
              <button type="submit" disabled={!data.svcNombre} className="flex-[2] py-4 bg-white/10 border border-white/20 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg disabled:opacity-30 hover:bg-white/20 transition-colors">Integrar</button>
            </div>
          </form>
        )

      case 'staff':
        return (
          <form onSubmit={(e) => { e.preventDefault(); advance(`${data.staffNombre} (${data.staffEspecialidad || 'General'})`) }} className="bg-[#0A0A0B] p-6 rounded-2xl border-2 border-white/10 shadow-2xl max-w-sm space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Operador</label>
              <input required value={data.staffNombre} onChange={e => setData({...data, staffNombre: e.target.value})} placeholder="Ej: Operador 1" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-sm text-white focus:border-white/30 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rol / Especialidad</label>
              <input value={data.staffEspecialidad} onChange={e => setData({...data, staffEspecialidad: e.target.value})} placeholder={vocab.placeholderEspecialidad || 'Ej: General'} className="w-full p-4 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-sm text-white focus:border-white/30 transition-colors" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => advance('Operador omitido', { staffNombre: '' })} className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors">Omitir</button>
              <button type="submit" disabled={!data.staffNombre} className="flex-[2] py-4 bg-white/10 border border-white/20 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg disabled:opacity-30 hover:bg-white/20 transition-colors">Autorizar</button>
            </div>
          </form>
        )

      case 'success':
        const publicSlug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const publicLink = `${window.location.origin}/app/${publicSlug}/${negocioId || ''}`
        return (
          <div className="bg-[#0A0A0B] p-8 rounded-[2rem] border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)] max-w-sm w-full space-y-8 text-center animate-in zoom-in-95 duration-700">
            <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center border-2" style={{ backgroundColor: `${data.color}20`, borderColor: data.color }}>
              <svg className="w-10 h-10" style={{ color: data.color }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">{data.nombre}</h3>
              <p className="text-xs text-slate-400 font-medium mt-2">Plataforma operativa al 100%.</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 cursor-pointer hover:border-white/30 transition-colors" onClick={() => { navigator.clipboard.writeText(publicLink); alert('Enlace copiado al portapapeles.') }}>
              <code className="text-[11px] font-bold text-emerald-400 block truncate">{publicLink}</code>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Copiar URL de Producción</p>
            </div>
            <button onClick={onComplete} className="w-full py-4 bg-white text-black hover:bg-slate-200 transition-colors font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg">
              Acceder al Panel Maestro
            </button>
          </div>
        )

      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col font-sans antialiased text-slate-200">
      {/* Top Navbar - Premium AI Style */}
      <nav className="h-16 border-b bg-[#0A0A0B]/80 backdrop-blur-xl border-white/10 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <span className="text-black font-black text-[11px] italic">NS</span>
          </div>
          <div className="h-4 w-px bg-white/20"></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Nucleus System</p>
            <div className="flex items-center gap-1.5 mt-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
               <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-400">Asistente Operativo</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full pb-40 scroll-smooth">
        {history.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            {msg.role === 'bot' && (
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mr-4 mt-1">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M4 15V9a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2z"/></svg>
              </div>
            )}
            <div className={`max-w-[85%] md:max-w-[75%] p-5 md:p-6 text-sm md:text-base font-medium leading-relaxed shadow-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-2xl rounded-tr-sm' 
                : 'bg-white/5 border border-white/10 text-slate-300 rounded-2xl rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mr-4">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M4 15V9a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2z"/></svg>
             </div>
             <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-5 flex items-center gap-1.5 shadow-2xl">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B] to-transparent pt-12 pb-8 px-4 pointer-events-none">
        <div className="max-w-4xl mx-auto flex justify-end md:justify-start pl-0 md:pl-14 pointer-events-auto">
          {renderInput()}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
      `}</style>
    </div>
  )
}
