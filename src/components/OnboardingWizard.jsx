import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { RUBROS_DISPONIBLES, getVocabulario } from '../utils/vocabulario'
import { motion, AnimatePresence } from 'framer-motion'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }

export default function OnboardingWizard({ session, onComplete }) {
  const [data, setData] = useState({
    nombre: '',
    rubro: '',
    color: '#0EA5E9',
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
    { id: 'welcome', bot: () => "¡Hola! 👋 Qué bueno tenerte por acá. Vamos a armar tu app de reservas en un par de minutos. ¿Arrancamos?", type: 'button', btnText: '¡Dale, empecemos!' },
    { id: 'nombre', bot: () => "Primero lo primero... 📝 ¿Cómo se llama tu negocio?", type: 'text', placeholder: 'Ej: Barbería Central' },
    { id: 'rubro', bot: (d) => `¡Me encanta "${d.nombre}"! 🚀 ¿A qué rubro se dedican?`, type: 'options', options: RUBROS_DISPONIBLES },
    { id: 'color', bot: () => "¡Perfecto! Ahora vamos a darle tu estilo. 🎨 Elegí el color de tu marca para tu app en vivo.", type: 'color' },
    { id: 'descripcion', bot: () => "¡Queda genial! ✨ ¿Querés agregar una frase corta que describa tu negocio? (Opcional)", type: 'textarea' },
    { id: 'instagram', bot: () => "¡Casi terminamos con el perfil! 📸 ¿Tenés un usuario de Instagram para asociar? (Opcional)", type: 'instagram' },
    { id: 'horarios', bot: () => "Ahora lo importante: Tus horarios de atención 🕒. Podés agregar pausas.", type: 'horarios' },
    { id: 'servicio', bot: () => `¡Excelente! Necesitamos tu primer ${vocab.servicio || 'servicio'}. ¿Qué vas a ofrecer y a qué precio?`, type: 'servicio' },
    { id: 'staff', bot: () => `Por último, ¿cómo se llama el primer ${vocab.empleado || 'profesional'} de tu equipo? (Podés ser vos mismo)`, type: 'staff' },
    { id: 'saving', bot: () => "¡Todo listo! 🪄 Estoy construyendo y desplegando tu plataforma...", type: 'loading' },
    { id: 'listo', bot: () => "🎉 ¡Felicitaciones! Tu app está activa.", type: 'success' },
  ]

  const [history, setHistory] = useState([{ role: 'bot', text: steps[0].bot(data), id: 'welcome_msg' }])

  const stateRef = useRef({ stepIndex, data, history })
  useEffect(() => { stateRef.current = { stepIndex, data, history } }, [stepIndex, data, history])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
    }
  }
  useEffect(() => { scrollToBottom() }, [history, isTyping, stepIndex, data.color])

  const advance = (userAnswerText, dataUpdates = {}) => {
    const { stepIndex: currStep, data: currData, history: currHistory } = stateRef.current
    
    const newData = { ...currData, ...dataUpdates }
    setData(newData)
    
    const newHistory = [...currHistory]
    if (userAnswerText) newHistory.push({ role: 'user', text: userAnswerText, id: `user_${currStep}_${Date.now()}` })
    
    setHistory(newHistory)
    setInputValue('')
    
    setIsTyping(true)
    setTimeout(async () => {
      setIsTyping(false)
      const nextIdx = currStep + 1
      setStepIndex(nextIdx)
      
      const nextStep = steps[nextIdx]
      setHistory(h => [...h, { role: 'bot', text: nextStep.bot(newData), id: `bot_${nextIdx}_${Date.now()}` }])

      if (nextStep.id === 'saving') {
        await executeBackendCreation(newData, nextIdx)
      }
    }, 1000)
  }

  const executeBackendCreation = async (finalData, savingIdx) => {
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

      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const nextIdx = savingIdx + 1
        setStepIndex(nextIdx)
        const nextStep = steps[nextIdx]
        setHistory(h => [...h, { role: 'bot', text: nextStep.bot(finalData), id: `bot_${nextIdx}_${Date.now()}` }])
      }, 1500)

    } catch (e) { alert("Error al provisionar sistema: " + e.message) }
  }

  const springConfig = { type: "spring", stiffness: 350, damping: 25 }

  const renderInput = () => {
    if (isTyping) return null
    const currentStep = steps[stepIndex]

    switch(currentStep.type) {
      case 'button':
        return (
          <motion.button 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={springConfig}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => advance('¡Empecemos!')} 
            className="w-full px-8 py-4 bg-sky-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-sky-500/30 flex items-center justify-center gap-2"
          >
            {currentStep.btnText}
            <motion.svg animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></motion.svg>
          </motion.button>
        )
      
      case 'text':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) advance(inputValue, { nombre: inputValue }) }} className="flex w-full gap-2">
            <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={currentStep.placeholder} className="flex-1 p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-sky-400 font-bold text-slate-800 shadow-sm transition-all" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="p-4 bg-sky-500 text-white rounded-2xl disabled:opacity-50 shadow-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </motion.button>
          </motion.form>
        )

      case 'textarea':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `"${inputValue}"` : 'Lo dejo para después', { descripcion: inputValue }) }} className="w-full space-y-3">
            <textarea autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Agregá tu descripción aquí..." className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-sky-400 font-medium text-slate-800 shadow-sm transition-all h-24 resize-none" />
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo dejo para después', { descripcion: '' })} className="flex-1 p-4 bg-white text-slate-500 font-bold text-xs uppercase tracking-widest rounded-2xl shadow-sm border border-slate-100">Omitir</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="flex-[2] p-4 bg-sky-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 shadow-md">Siguiente</motion.button>
            </div>
          </motion.form>
        )
      
      case 'instagram':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `@${inputValue}` : 'No tengo por ahora', { instagram: inputValue }) }} className="w-full space-y-3">
            <div className="flex items-center bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm focus-within:border-sky-400 transition-all">
              <span className="pl-4 pr-2 text-sky-400 font-black text-lg">@</span>
              <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="tu_cuenta" className="flex-1 py-4 pr-4 bg-transparent outline-none font-bold text-slate-800" />
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('No tengo por ahora', { instagram: '' })} className="flex-1 p-4 bg-white text-slate-500 font-bold text-xs uppercase tracking-widest rounded-2xl shadow-sm border border-slate-100">Omitir</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="flex-[2] p-4 bg-sky-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 shadow-md">Siguiente</motion.button>
            </div>
          </motion.form>
        )

      case 'options':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="flex flex-wrap gap-2 justify-end w-full">
            {currentStep.options.map((opt, i) => (
              <motion.button 
                key={opt} onClick={() => advance(opt, { rubro: opt })} 
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, ...springConfig }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-3 bg-white border-2 border-slate-100 text-slate-700 font-bold text-sm rounded-2xl shadow-sm hover:border-sky-400 hover:text-sky-600 transition-colors"
              >
                {opt}
              </motion.button>
            ))}
          </motion.div>
        )

      case 'color':
        return (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="w-full flex flex-col gap-4">
            {/* Live Preview IN THE CHAT */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-md w-full overflow-hidden relative">
              <div className="h-full w-full bg-slate-50 relative flex flex-col pb-6">
                <motion.div layout className="h-24 relative rounded-b-[1.5rem]" style={{ backgroundColor: `${data.color}15` }}>
                  <motion.div layout className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl border-4 border-white flex items-center justify-center shadow-md overflow-hidden" style={{ backgroundColor: data.color }}>
                     <span className="font-black text-white text-xl drop-shadow-sm">{data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS'}</span>
                  </motion.div>
                </motion.div>
                <div className="mt-8 text-center px-4">
                  <h4 className="font-black text-lg text-slate-900 truncate">{data.nombre || 'Tu Negocio'}</h4>
                </div>
                <div className="mt-4 px-4 space-y-3">
                  <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-slate-800">Corte Clásico</p>
                      <p className="text-[10px] font-medium text-slate-400">30 min</p>
                    </div>
                    <motion.button layout className="px-4 py-2 rounded-xl text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: data.color }}>
                      Reservar
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* Controles de Color */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 w-full">
              <div className="flex gap-2 justify-between">
               {['#0EA5E9', '#10B981', '#F43F5E', '#8B5CF6', '#F59E0B'].map(c => (
                 <motion.button key={c} onClick={() => setData({...data, color: c})} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="flex-1 aspect-square rounded-2xl border-4 shadow-sm" style={{ backgroundColor: c, borderColor: data.color === c ? '#0f172a' : 'transparent' }}></motion.button>
               ))}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => advance(`Color elegido: ${data.color}`)} className="w-full py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-md">
                Confirmar Estilo
              </motion.button>
            </div>
          </motion.div>
        )

      case 'horarios':
        return (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="w-full bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm space-y-3">
            <div className="max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar space-y-2">
              <AnimatePresence>
                {DIAS.map(d => (
                  <motion.div layout key={d} className={`flex flex-col gap-2 p-3 rounded-2xl border-2 transition-colors ${data.horarios[d].abierto ? 'bg-sky-50/50 border-sky-100' : 'bg-transparent border-slate-100 opacity-60'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setData(prev => ({ ...prev, horarios: { ...prev.horarios, [d]: { ...prev.horarios[d], abierto: !prev.horarios[d].abierto } } }))} className={`w-10 h-6 rounded-full relative transition-colors ${data.horarios[d].abierto ? 'bg-sky-500' : 'bg-slate-300'}`}>
                          <motion.div layout className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm ${data.horarios[d].abierto ? 'left-[22px]' : 'left-1'}`}></motion.div>
                        </button>
                        <span className="text-[11px] font-black text-slate-700 w-16 uppercase tracking-wider">{DIAS_LABEL[d].substring(0,3)}</span>
                      </div>
                      <AnimatePresence>
                        {data.horarios[d].abierto && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                            <input type="time" value={data.horarios[d].inicio} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicio: e.target.value } } }))} className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-[10px] font-bold outline-none text-slate-800 w-[60px]" />
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                            <input type="time" value={data.horarios[d].fin} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], fin: e.target.value } } }))} className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-[10px] font-bold outline-none text-slate-800 w-[60px]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence>
                      {data.horarios[d].abierto && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 pl-12 overflow-hidden">
                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input type="checkbox" checked={data.horarios[d].pausa || false} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], pausa: e.target.checked } } }))} className="w-3 h-3 rounded border-slate-300 text-sky-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Corte de descanso</span>
                          </label>
                          <AnimatePresence>
                            {data.horarios[d].pausa && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 pb-1">
                                <input type="time" value={data.horarios[d].inicioPausa || '13:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicioPausa: e.target.value } } }))} className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-[10px] font-bold outline-none text-slate-800 w-[60px]" />
                                <span className="text-[10px] text-slate-400 font-bold">-</span>
                                <input type="time" value={data.horarios[d].finPausa || '17:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], finPausa: e.target.value } } }))} className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-[10px] font-bold outline-none text-slate-800 w-[60px]" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="pt-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => advance('¡Horarios listos!')} className="w-full py-4 bg-sky-500 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-md">
                Confirmar
              </motion.button>
            </div>
          </motion.div>
        )

      case 'servicio':
        return (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(`${data.svcNombre} a $${data.svcPrecio} (${data.svcDuracion} min)`) }} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm max-w-sm space-y-4 w-full">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.svcNombre} onChange={e => setData({...data, svcNombre: e.target.value})} placeholder={`Ej: ${vocab.placeholderServicio || 'Corte Clásico'}`} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ($)</label>
                <input required type="number" value={data.svcPrecio} onChange={e => setData({...data, svcPrecio: e.target.value})} placeholder="0" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiempo</label>
                <select value={data.svcDuracion} onChange={e => setData({...data, svcDuracion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 transition-all appearance-none">
                  {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo omito por ahora', { svcNombre: '' })} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!data.svcNombre} className="flex-[2] py-4 bg-sky-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md disabled:opacity-50">Siguiente</motion.button>
            </div>
          </motion.form>
        )

      case 'staff':
        return (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(`${data.staffNombre} (${data.staffEspecialidad || 'General'})`) }} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm max-w-sm space-y-4 w-full">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.staffNombre} onChange={e => setData({...data, staffNombre: e.target.value})} placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidad</label>
              <input value={data.staffEspecialidad} onChange={e => setData({...data, staffEspecialidad: e.target.value})} placeholder={vocab.placeholderEspecialidad || 'Ej: General'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 transition-all" />
            </div>
            <div className="flex gap-2 pt-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo configuro luego', { staffNombre: '' })} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!data.staffNombre} className="flex-[2] py-4 bg-sky-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md disabled:opacity-50">¡Terminar!</motion.button>
            </div>
          </motion.form>
        )

      case 'success':
        const publicSlug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const publicLink = `${window.location.origin}/app/${publicSlug}/${negocioId || ''}`
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm w-full space-y-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }} className="w-20 h-20 mx-auto rounded-[1.5rem] flex items-center justify-center shadow-lg" style={{ backgroundColor: data.color }}>
              <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </motion.div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{data.nombre}</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">¡La magia está hecha! Tu app está lista.</p>
            </div>
            <motion.div whileTap={{ scale: 0.95 }} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 cursor-pointer active:bg-sky-50" onClick={() => { navigator.clipboard.writeText(publicLink); alert('¡Enlace copiado al portapapeles!') }}>
              <code className="text-[11px] font-black text-slate-800 block truncate">{publicLink}</code>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Copiar Enlace</p>
            </motion.div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onComplete} className="w-full py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-md">
              Entrar al Panel
            </motion.button>
          </motion.div>
        )

      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#E2E8F0] flex items-center justify-center p-0 md:p-8 selection:bg-sky-200 font-sans">
      
      {/* Contenedor tipo "Teléfono Celular" */}
      <div className="w-full h-full md:w-[400px] md:h-[850px] bg-[#F4F9FF] md:rounded-[3rem] md:border-[10px] md:border-slate-800 md:shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative flex flex-col overflow-hidden">
        
        {/* Notch / Dynamic Island Falso para Desktop */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-[1.2rem] z-50"></div>

        {/* Top Navbar */}
        <nav className="h-16 bg-white/80 backdrop-blur-md border-b border-sky-100 flex items-center justify-between px-5 sticky top-0 z-40">
          <div className="flex items-center gap-3 mt-2 md:mt-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-300 flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 leading-tight">Configuración</p>
              <p className="text-[9px] font-bold text-sky-500">Asistente Virtual</p>
            </div>
          </div>
          <div className="flex gap-1 mt-2 md:mt-0">
            <div className="text-[10px] font-black text-slate-400">{stepIndex + 1}/{steps.length}</div>
          </div>
        </nav>

        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto p-4 w-full pb-48" style={{ scrollBehavior: 'smooth' }}>
          <AnimatePresence initial={false}>
            {history.map((msg, idx) => (
              <motion.div 
                layout
                key={msg.id} 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'bot' && (
                  <div className="w-8 h-8 rounded-xl bg-white border border-sky-100 shadow-sm flex items-center justify-center shrink-0 mr-2 mt-auto mb-1">
                    <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.478-8.035-1.387-1.717-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
                  </div>
                )}
                <div className={`max-w-[85%] p-4 text-[14px] font-medium leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-sky-500 text-white rounded-[1.5rem] rounded-br-sm' 
                    : 'bg-white border border-slate-100 text-slate-700 rounded-[1.5rem] rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className="flex justify-start mb-4"
              >
                 <div className="w-8 h-8 rounded-xl bg-white border border-sky-100 shadow-sm flex items-center justify-center shrink-0 mr-2 mt-auto mb-1">
                    <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.478-8.035-1.387-1.717-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
                 </div>
                 <div className="bg-white border border-slate-100 rounded-[1.5rem] rounded-bl-sm p-4 flex items-center gap-1.5 shadow-sm">
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-sky-400"></motion.div>
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-sky-400"></motion.div>
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-sky-400"></motion.div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Input Area (Bottom sheet style) */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#F4F9FF] via-[#F4F9FF] to-transparent pt-12 pb-6 px-4 z-40 pointer-events-none">
          <div className="w-full flex justify-center pointer-events-auto">
            <AnimatePresence mode="wait">
              {renderInput()}
            </AnimatePresence>
          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #bae6fd; border-radius: 4px; }
      `}</style>
    </div>
  )
}
