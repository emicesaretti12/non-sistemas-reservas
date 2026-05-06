import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { RUBROS_DISPONIBLES, getVocabulario } from '../utils/vocabulario'
import { motion, AnimatePresence } from 'framer-motion'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }

// Paleta de colores extendida
const COLORES = [
  '#0f172a', '#334155', '#ef4444', '#f97316', '#f59e0b', '#eab308', 
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
]

export default function OnboardingWizard({ session, onComplete }) {
  // Estado inicial: -1 es la pantalla de bienvenida. 0 es el inicio del chat.
  const [stepIndex, setStepIndex] = useState(-1)
  
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
  
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const vocab = getVocabulario(data.rubro || RUBROS_DISPONIBLES[0])

  const steps = [
    { id: 'welcome', bot: () => "¡Hola! 👋 Vamos a armar tu app de reservas en un par de minutos. Fijate en la vista previa, ¡ahí vas a ver cómo se va creando en vivo! ¿Arrancamos?", type: 'button', btnText: '¡Dale, empecemos!' },
    { id: 'nombre', bot: () => "Primero lo primero... 📝 ¿Cómo se llama tu negocio?", type: 'text', placeholder: 'Ej: Barbería Central' },
    { id: 'rubro', bot: (d) => `¡Me encanta "${d.nombre}"! Mirá cómo ya aparece en tu app. 🚀 ¿A qué rubro se dedican?`, type: 'options', options: RUBROS_DISPONIBLES },
    { id: 'color', bot: () => "¡Perfecto! 🎨 Ahora elegí un color para tu marca. Vas a ver cómo toda la app cambia instantáneamente.", type: 'color' },
    { id: 'descripcion', bot: () => "¡Qué buen color! ✨ ¿Querés agregar una frase corta que describa tu negocio? (Va a aparecer debajo del título)", type: 'textarea' },
    { id: 'instagram', bot: () => "¡Casi terminamos el perfil! 📸 ¿Tenés Instagram? Agregalo y aparecerá el botón en tu app.", type: 'instagram' },
    { id: 'horarios', bot: () => "Ahora lo importante: Tus horarios de atención 🕒.", type: 'horarios' },
    { id: 'servicio', bot: () => `¡Excelente! Para que puedan reservar, necesitamos un ${vocab.servicio || 'servicio'}. ¿Qué vas a ofrecer y a qué precio?`, type: 'servicio' },
    { id: 'staff', bot: () => `Por último, ¿cómo se llama el primer ${vocab.empleado || 'profesional'} de tu equipo?`, type: 'staff' },
    { id: 'saving', bot: () => "¡Todo listo! 🪄 Instalando tu aplicación en la nube...", type: 'loading' },
    { id: 'listo', bot: () => "🎉 ¡Felicitaciones! Tu app está activa y lista para recibir clientes.", type: 'success' },
  ]

  const [history, setHistory] = useState([])

  // Inicializar chat cuando se pasa del welcome screen
  useEffect(() => {
    if (stepIndex === 0 && history.length === 0) {
      setHistory([{ role: 'bot', text: steps[0].bot(data), id: 'welcome_msg' }])
    }
  }, [stepIndex])

  const stateRef = useRef({ stepIndex, data, history })
  useEffect(() => { stateRef.current = { stepIndex, data, history } }, [stepIndex, data, history])

  const scrollToBottom = () => {
    if (messagesEndRef.current && scrollContainerRef.current) {
      setTimeout(() => { 
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 150)
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
    }, 1200)
  }

  const executeBackendCreation = async (finalData, savingIdx) => {
    try {
      setIsTyping(true)

      // INSERCIÓN BÁSICA SEGURA (Evita errores de columnas faltantes)
      const { data: negData, error: negErr } = await supabase.from('negocios').insert([{
        owner_id: session.user.id, 
        nombre: finalData.nombre, 
        rubro: finalData.rubro, 
        color_primario: finalData.color,
        estado_suscripcion: 'activo',
        es_admin_plataforma: import.meta.env.VITE_SUPERADMIN_EMAIL ? (session.user.email === import.meta.env.VITE_SUPERADMIN_EMAIL) : false
      }]).select().single()
      
      if (negErr) throw negErr
      setNegocioId(negData.id)

      // Actualizar campos adicionales sin fallar si la DB no está sincronizada
      await supabase.from('negocios').update({
        descripcion: finalData.descripcion, 
        instagram: finalData.instagram, 
        horarios: finalData.horarios
      }).eq('id', negData.id).catch(e => console.warn('Campos adicionales omitidos', e))

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

      setTimeout(() => {
        setIsTyping(false)
        const nextIdx = savingIdx + 1
        setStepIndex(nextIdx)
        const nextStep = steps[nextIdx]
        setHistory(h => [...h, { role: 'bot', text: nextStep.bot(finalData), id: `bot_${nextIdx}_${Date.now()}` }])
      }, 1500)

    } catch (e) { 
      console.error(e)
      alert("Error al crear el sistema: " + e.message)
      setIsTyping(false) // Desbloquear si hay error
    }
  }

  const springConfig = { type: "spring", stiffness: 350, damping: 25 }

  const renderInput = () => {
    if (isTyping || stepIndex < 0) return null
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
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) advance(inputValue, { nombre: inputValue }) }} className="flex w-full gap-2 relative">
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
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03, ...springConfig }}
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
            <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 w-full">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center pt-2">Elegí el color principal</p>
              
              {/* Grilla extendida de colores */}
              <div className="grid grid-cols-5 md:grid-cols-6 gap-2 px-2">
               {COLORES.map((c, i) => (
                 <motion.button 
                   key={c} onClick={() => setData({...data, color: c})} 
                   initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                   whileHover={{ scale: 1.2, zIndex: 10 }} whileTap={{ scale: 0.9 }} 
                   className="aspect-square rounded-full shadow-sm border-2 transition-colors relative" 
                   style={{ backgroundColor: c, borderColor: data.color === c ? '#0f172a' : 'transparent' }}
                 >
                    {data.color === c && <div className="absolute inset-0 rounded-full border-2 border-white pointer-events-none scale-75"></div>}
                 </motion.button>
               ))}
               
               {/* Color Picker Nativo Oculto + Botón visible */}
               <label className="aspect-square rounded-full shadow-sm border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                 <input type="color" value={data.color} onChange={e => setData({...data, color: e.target.value})} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                 <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
               </label>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => advance(`Color elegido: ${data.color}`)} className="w-full py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-md mt-2">
                Confirmar Color
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
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pausa (Almuerzo)</span>
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

  // PANTALLA DE BIENVENIDA (Paso -1)
  if (stepIndex === -1) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring", bounce: 0.4 }} className="max-w-md w-full space-y-8">
          <div className="w-24 h-24 bg-gradient-to-tr from-sky-500 to-sky-400 rounded-[2rem] mx-auto shadow-xl shadow-sky-500/20 flex items-center justify-center">
             <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Creá tu plataforma</h1>
            <p className="text-slate-500 mt-3 font-medium text-sm md:text-base">Te guiamos paso a paso para armar tu sistema de reservas y página pública en menos de 2 minutos.</p>
          </div>
          <div className="pt-4">
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setStepIndex(0)}
              className="w-full py-5 bg-slate-900 text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/20"
            >
              Iniciar Configuración
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#E2E8F0] flex flex-col lg:flex-row items-center justify-center gap-0 lg:gap-12 p-0 lg:p-8 selection:bg-sky-200 font-sans">
      
      {/* TELÉFONO 1: EL CHAT (Asistente) */}
      <div className="w-full h-[100dvh] lg:w-[400px] lg:h-[850px] bg-[#F4F9FF] lg:rounded-[3rem] lg:border-[10px] lg:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative flex flex-col overflow-hidden shrink-0 z-20">
        
        {/* Notch Falso para Desktop */}
        <div className="hidden lg:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-[1.2rem] z-50"></div>

        {/* Top Navbar */}
        <nav className="h-16 bg-white/80 backdrop-blur-md border-b border-sky-100 flex items-center justify-between px-5 sticky top-0 z-40 shrink-0 shadow-sm">
          <div className="flex items-center gap-3 mt-1 lg:mt-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-300 flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 leading-tight">Configuración</p>
              <p className="text-[9px] font-bold text-sky-500">Asistente Virtual</p>
            </div>
          </div>
          <div className="flex gap-1 mt-1 lg:mt-0">
            <div className="text-[10px] font-black text-slate-400">{stepIndex + 1}/{steps.length}</div>
          </div>
        </nav>

        {/* Vista Previa Sticky SÓLO MÓVIL (cuando el panel derecho no existe) */}
        <div className="lg:hidden w-full bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm sticky top-16 z-30">
           <div className="flex items-center gap-3 w-full">
             <motion.div layout className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-black text-xs shadow-inner" style={{ backgroundColor: data.color }}>
               {data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS'}
             </motion.div>
             <div className="min-w-0 flex-1">
               <p className="text-[11px] font-black text-slate-900 truncate">{data.nombre || 'Tu App'}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{data.rubro || 'Rubro'}</p>
             </div>
             <motion.div layout className="w-12 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: data.color }}>
                <span className="text-[8px] font-black text-white">RESERVAR</span>
             </motion.div>
           </div>
        </div>

        {/* Chat History Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 w-full pb-56" style={{ scrollBehavior: 'smooth' }}>
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
          <div ref={messagesEndRef} className="h-10" />
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#F4F9FF] via-[#F4F9FF] to-transparent pt-12 pb-6 px-4 z-40 pointer-events-none">
          <div className="w-full flex justify-center pointer-events-auto">
            <AnimatePresence mode="wait">
              {renderInput()}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* TELÉFONO 2: LIVE PREVIEW (La vista al público) - Oculto en móviles */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.3 }}
        className="hidden lg:flex w-[400px] h-[850px] bg-[#F8FAFC] rounded-[3rem] border-[10px] border-slate-200 shadow-[0_30px_60px_rgba(0,0,0,0.1)] relative flex-col overflow-hidden shrink-0 z-10"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-200 rounded-b-[1.2rem] z-50"></div>
        
        <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
          {/* Header */}
          <motion.div layout className="h-40 relative rounded-b-[2rem] transition-colors duration-500" style={{ backgroundColor: `${data.color}15` }}>
            <motion.div layout className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-[1.5rem] border-4 border-[#F8FAFC] flex items-center justify-center shadow-lg transition-colors duration-500 overflow-hidden" style={{ backgroundColor: data.color }}>
                <span className="font-black text-white text-3xl drop-shadow-sm">{data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS'}</span>
            </motion.div>
          </motion.div>

          {/* Info Principal */}
          <div className="mt-14 text-center px-6">
            <h1 className="font-black text-2xl text-slate-900 tracking-tight">{data.nombre || 'Nombre de tu Negocio'}</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{data.rubro || 'Tu Rubro'}</p>
            {data.descripcion && (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-slate-600 mt-4 leading-relaxed">
                "{data.descripcion}"
              </motion.p>
            )}
            {data.instagram && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 flex justify-center">
                <span className="px-4 py-1.5 bg-pink-50 text-pink-500 text-xs font-black rounded-full border border-pink-100 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  {data.instagram}
                </span>
              </motion.div>
            )}
          </div>

          {/* Servicios */}
          <div className="mt-8 px-6 space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Servicios Disponibles</h3>
            
            {data.svcNombre ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-3xl bg-white shadow-sm border border-slate-100 flex flex-col gap-4">
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-base font-black text-slate-800">{data.svcNombre}</p>
                    <p className="text-sm font-black text-slate-600">${data.svcPrecio}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-1">{data.svcDuracion} minutos</p>
                </div>
                <motion.button layout className="w-full py-3 rounded-2xl text-xs font-black text-white shadow-md transition-colors duration-500" style={{ backgroundColor: data.color }}>
                  Reservar Turno
                </motion.button>
              </motion.div>
            ) : (
              <div className="p-4 rounded-3xl bg-white/50 shadow-sm border border-slate-100 border-dashed flex flex-col gap-4 opacity-50">
                 <div>
                  <div className="w-32 h-4 bg-slate-200 rounded-full mb-2"></div>
                  <div className="w-16 h-3 bg-slate-200 rounded-full"></div>
                 </div>
                 <div className="w-full py-3 rounded-2xl bg-slate-200"></div>
              </div>
            )}
          </div>

          {/* Staff */}
          {data.staffNombre && (
            <div className="mt-8 px-6 space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Profesionales</h3>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-lg">
                  {data.staffNombre.substring(0,1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{data.staffNombre}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{data.staffEspecialidad || 'General'}</p>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-300 rounded-full"></div>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #bae6fd; border-radius: 4px; }
      `}</style>
    </div>
  )
}
