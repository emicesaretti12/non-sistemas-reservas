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
  const [stepIndex, setStepIndex] = useState(-1)
  
  const [data, setData] = useState({
    nombre: '',
    rubro: '',
    color: '#0ea5e9', // celeste por defecto
    logo_url: '',
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
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const vocab = getVocabulario(data.rubro || RUBROS_DISPONIBLES[0])

  const steps = [
    { id: 'welcome', bot: () => "¡Hola! 👋 Soy tu Asistente Virtual y vamos a armar tu app de reservas en un par de minutos. En la vista previa vas a ver cómo se va creando en vivo. ¿Arrancamos?", type: 'button', btnText: '¡Dale, empecemos!' },
    { id: 'nombre', bot: () => "Primero lo primero... 📝 ¿Cómo se llama tu negocio?", type: 'text', placeholder: 'Ej: Barbería Central' },
    { id: 'rubro', bot: (d) => `¡Me encanta "${d.nombre}"! 🚀 ¿A qué rubro se dedican?`, type: 'options', options: RUBROS_DISPONIBLES },
    { id: 'color', bot: () => "¡Perfecto! 🎨 Ahora elegí un color para tu marca. Vas a ver cómo toda la app cambia al instante.", type: 'color' },
    { id: 'logo', bot: () => "Tu marca necesita una cara 🖼️. ¿Querés subir el logo de tu negocio? (Es opcional, podés hacerlo después).", type: 'logo' },
    { id: 'descripcion', bot: () => "¡Genial! ✨ ¿Querés agregar una frase corta que describa tu negocio? (Va a aparecer debajo del título)", type: 'textarea' },
    { id: 'instagram', bot: () => "Casi terminamos el perfil 📸. ¿Tenés Instagram? Agregalo y aparecerá el botón en tu app.", type: 'instagram' },
    { id: 'horarios', bot: () => "Ahora lo más importante: Tus horarios de atención 🕒.", type: 'horarios' },
    { id: 'servicio', bot: () => `¡Excelente! Para que puedan reservar, necesitamos configurar un ${vocab.servicio || 'servicio'}. ¿Qué vas a ofrecer y a qué precio?`, type: 'servicio' },
    { id: 'staff', bot: () => `Por último, ¿cómo se llama el primer ${vocab.empleado || 'profesional'} de tu equipo?`, type: 'staff' },
    { id: 'saving', bot: () => "¡Todo listo! 🪄 Creando tu base de datos y levantando tu aplicación en la nube...", type: 'loading' },
    { id: 'listo', bot: () => "🎉 ¡Felicitaciones! Tu app está activa y lista para recibir clientes.", type: 'success' },
  ]

  const [history, setHistory] = useState([])

  useEffect(() => {
    if (stepIndex === 0 && history.length === 0) {
      setHistory([{ role: 'bot', text: steps[0].bot(data), id: 'welcome_msg', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }])
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
  useEffect(() => { scrollToBottom() }, [history, isTyping, stepIndex, data.color, isUploading])

  const advance = (userAnswerText, dataUpdates = {}) => {
    const { stepIndex: currStep, data: currData, history: currHistory } = stateRef.current
    
    const newData = { ...currData, ...dataUpdates }
    setData(newData)
    
    const newHistory = [...currHistory]
    if (userAnswerText) {
      newHistory.push({ 
        role: 'user', 
        text: userAnswerText, 
        id: `user_${currStep}_${Date.now()}`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      })
    }
    
    setHistory(newHistory)
    setInputValue('')
    
    setIsTyping(true)
    setTimeout(async () => {
      setIsTyping(false)
      const nextIdx = currStep + 1
      setStepIndex(nextIdx)
      
      const nextStep = steps[nextIdx]
      setHistory(h => [...h, { 
        role: 'bot', 
        text: nextStep.bot(newData), 
        id: `bot_${nextIdx}_${Date.now()}`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }])

      if (nextStep.id === 'saving') {
        await executeBackendCreation(newData, nextIdx)
      }
    }, 1500) // Un poco más de tiempo para que se lea "escribiendo..."
  }

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'non_sistemas') 
    formData.append('cloud_name', 'ddp4r9dlu') 

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/ddp4r9dlu/image/upload', { method: 'POST', body: formData })
      const json = await res.json()
      
      if (json.secure_url) {
        const urlOptimizada = json.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_400/')
        advance('¡Logo subido!', { logo_url: urlOptimizada })
      } else {
         throw new Error("No secure url")
      }
    } catch (error) {
      alert("Error al subir imagen. Intente de nuevo o ponga Omitir.")
    } finally {
      setIsUploading(false)
    }
  }

  const executeBackendCreation = async (finalData, savingIdx) => {
    try {
      setIsTyping(true)

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

      await supabase.from('negocios').update({
        descripcion: finalData.descripcion, 
        instagram: finalData.instagram, 
        horarios: finalData.horarios,
        logo_url: finalData.logo_url
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
      setIsTyping(false) 
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
            className="w-full px-6 py-4 bg-[#0ea5e9] text-white font-black text-sm rounded-[1.2rem] shadow-xl shadow-[#0ea5e9]/30 flex items-center justify-center gap-2"
          >
            {currentStep.btnText}
            <motion.svg animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></motion.svg>
          </motion.button>
        )
      
      case 'text':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) advance(inputValue, { nombre: inputValue }) }} className="flex w-full gap-2 items-center bg-transparent">
            <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={currentStep.placeholder} className="flex-1 px-5 py-4 bg-white rounded-[2rem] outline-none font-medium text-slate-800 shadow-sm border border-slate-100 placeholder:text-slate-400 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20 transition-all" />
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="submit" disabled={!inputValue.trim()} className="w-12 h-12 flex items-center justify-center bg-[#0ea5e9] text-white rounded-full disabled:opacity-50 shadow-md">
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </motion.button>
          </motion.form>
        )

      case 'textarea':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `"${inputValue}"` : 'Lo omito', { descripcion: inputValue }) }} className="w-full space-y-2">
            <textarea autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Ej: Especialistas en..." className="w-full px-5 py-4 bg-white rounded-[1.5rem] outline-none font-medium text-slate-800 shadow-sm border border-slate-100 placeholder:text-slate-400 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20 transition-all h-24 resize-none" />
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo omito', { descripcion: '' })} className="flex-1 p-3 bg-white/50 text-slate-500 font-bold text-xs rounded-full shadow-sm">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="flex-[2] p-3 bg-[#0ea5e9] text-white font-bold text-xs rounded-full disabled:opacity-50 shadow-md">Enviar</motion.button>
            </div>
          </motion.form>
        )
      
      case 'instagram':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `@${inputValue}` : 'Lo omito', { instagram: inputValue }) }} className="w-full space-y-2">
            <div className="flex items-center bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 focus-within:border-[#0ea5e9] focus-within:ring-2 focus-within:ring-[#0ea5e9]/20 transition-all">
              <span className="pl-5 pr-1 text-[#0ea5e9] font-black text-lg">@</span>
              <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="tu_cuenta" className="flex-1 py-4 pr-5 bg-transparent outline-none font-medium text-slate-800" />
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo omito', { instagram: '' })} className="flex-1 p-3 bg-white/50 text-slate-500 font-bold text-xs rounded-full shadow-sm">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="flex-[2] p-3 bg-[#0ea5e9] text-white font-bold text-xs rounded-full disabled:opacity-50 shadow-md">Enviar</motion.button>
            </div>
          </motion.form>
        )

      case 'logo':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="w-full space-y-2">
            {isUploading ? (
              <div className="w-full py-8 bg-white rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center gap-3">
                 <div className="w-8 h-8 border-4 border-[#0ea5e9]/30 border-t-[#0ea5e9] rounded-full animate-spin"></div>
                 <p className="text-xs font-bold text-slate-500">Subiendo imagen...</p>
              </div>
            ) : (
              <>
                <label className="w-full py-6 bg-white rounded-[1.5rem] shadow-sm border border-dashed border-slate-300 hover:bg-slate-50 hover:border-[#0ea5e9] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#0ea5e9]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700">Tocar para subir logo</span>
                  <span className="text-[10px] text-slate-400">Formatos JPG, PNG</span>
                </label>
                <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo configuro después')} className="w-full p-3 bg-white/50 text-slate-500 font-bold text-xs rounded-full shadow-sm">
                  Saltar este paso
                </motion.button>
              </>
            )}
          </motion.div>
        )

      case 'options':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="flex flex-wrap gap-2 justify-end w-full">
            {currentStep.options.map((opt, i) => (
              <motion.button 
                key={opt} onClick={() => advance(opt, { rubro: opt })} 
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03, ...springConfig }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-2.5 bg-white border border-slate-100 text-[#0ea5e9] font-bold text-sm rounded-full shadow-sm hover:bg-sky-50 transition-colors"
              >
                {opt}
              </motion.button>
            ))}
          </motion.div>
        )

      case 'color':
        return (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="w-full bg-white p-4 rounded-[2rem] shadow-sm space-y-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center pt-2">Elegí el color principal</p>
              <div className="grid grid-cols-5 gap-3 px-2">
               {COLORES.slice(0,14).map((c, i) => (
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
               
               <label className="aspect-square rounded-full shadow-sm border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                 <input type="color" value={data.color} onChange={e => setData({...data, color: e.target.value})} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                 <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
               </label>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => advance(`Color elegido: ${data.color}`)} className="w-full py-4 bg-[#0ea5e9] text-white font-bold text-sm rounded-[1.2rem] shadow-md mt-2">
                Confirmar Color
              </motion.button>
          </motion.div>
        )

      case 'horarios':
        return (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="w-full bg-white p-3 rounded-[2rem] shadow-sm space-y-3">
            <div className="max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar space-y-2">
              <AnimatePresence>
                {DIAS.map(d => (
                  <motion.div layout key={d} className={`flex flex-col gap-2 p-3 rounded-2xl border-2 transition-colors ${data.horarios[d].abierto ? 'bg-sky-50/50 border-sky-100' : 'bg-transparent border-slate-50 opacity-60'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setData(prev => ({ ...prev, horarios: { ...prev.horarios, [d]: { ...prev.horarios[d], abierto: !prev.horarios[d].abierto } } }))} className={`w-10 h-6 rounded-full relative transition-colors ${data.horarios[d].abierto ? 'bg-[#0ea5e9]' : 'bg-slate-200'}`}>
                          <motion.div layout className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm ${data.horarios[d].abierto ? 'left-[22px]' : 'left-1'}`}></motion.div>
                        </button>
                        <span className="text-xs font-bold text-slate-700 w-16 capitalize">{DIAS_LABEL[d].substring(0,3)}</span>
                      </div>
                      <AnimatePresence>
                        {data.horarios[d].abierto && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                            <input type="time" value={data.horarios[d].inicio} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicio: e.target.value } } }))} className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-xs font-bold outline-none text-slate-800 w-[70px]" />
                            <span className="text-xs text-slate-400 font-bold">-</span>
                            <input type="time" value={data.horarios[d].fin} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], fin: e.target.value } } }))} className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-xs font-bold outline-none text-slate-800 w-[70px]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence>
                      {data.horarios[d].abierto && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 pl-12 overflow-hidden">
                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input type="checkbox" checked={data.horarios[d].pausa || false} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], pausa: e.target.checked } } }))} className="w-3 h-3 rounded border-slate-300 text-[#0ea5e9]" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pausa Almuerzo</span>
                          </label>
                          <AnimatePresence>
                            {data.horarios[d].pausa && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 pb-1">
                                <input type="time" value={data.horarios[d].inicioPausa || '13:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicioPausa: e.target.value } } }))} className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-xs font-bold outline-none text-slate-800 w-[70px]" />
                                <span className="text-[10px] text-slate-400 font-bold">-</span>
                                <input type="time" value={data.horarios[d].finPausa || '17:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], finPausa: e.target.value } } }))} className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-xs font-bold outline-none text-slate-800 w-[70px]" />
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
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => advance('¡Horarios listos!')} className="w-full py-4 bg-[#0ea5e9] text-white font-bold text-sm rounded-[1.2rem] shadow-md">
                Confirmar Horarios
              </motion.button>
            </div>
          </motion.div>
        )

      case 'servicio':
        return (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(`${data.svcNombre} a $${data.svcPrecio} (${data.svcDuracion} min)`) }} className="bg-white p-5 rounded-[2rem] shadow-sm max-w-sm space-y-4 w-full">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.svcNombre} onChange={e => setData({...data, svcNombre: e.target.value})} placeholder={`Ej: ${vocab.placeholderServicio || 'Corte Clásico'}`} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-[#0ea5e9] transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ($)</label>
                <input required type="number" value={data.svcPrecio} onChange={e => setData({...data, svcPrecio: e.target.value})} placeholder="0" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-[#0ea5e9] transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiempo</label>
                <select value={data.svcDuracion} onChange={e => setData({...data, svcDuracion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-[#0ea5e9] transition-all appearance-none">
                  {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo omito por ahora', { svcNombre: '' })} className="flex-1 py-4 bg-white/50 text-slate-500 font-bold text-xs rounded-[1.2rem] shadow-sm">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!data.svcNombre} className="flex-[2] py-4 bg-[#0ea5e9] text-white font-bold text-sm rounded-[1.2rem] shadow-md disabled:opacity-50">Siguiente</motion.button>
            </div>
          </motion.form>
        )

      case 'staff':
        return (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(`${data.staffNombre} (${data.staffEspecialidad || 'General'})`) }} className="bg-white p-5 rounded-[2rem] shadow-sm max-w-sm space-y-4 w-full">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.staffNombre} onChange={e => setData({...data, staffNombre: e.target.value})} placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-[#0ea5e9] transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidad</label>
              <input value={data.staffEspecialidad} onChange={e => setData({...data, staffEspecialidad: e.target.value})} placeholder={vocab.placeholderEspecialidad || 'Ej: General'} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm text-slate-800 focus:border-[#0ea5e9] transition-all" />
            </div>
            <div className="flex gap-2 pt-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo configuro luego', { staffNombre: '' })} className="flex-1 py-4 bg-white/50 text-slate-500 font-bold text-xs rounded-[1.2rem] shadow-sm">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!data.staffNombre} className="flex-[2] py-4 bg-[#0ea5e9] text-white font-bold text-sm rounded-[1.2rem] shadow-md disabled:opacity-50">¡Terminar!</motion.button>
            </div>
          </motion.form>
        )

      case 'success':
        const publicSlug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const publicLink = `${window.location.origin}/app/${publicSlug}/${negocioId || ''}`
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm w-full space-y-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }} className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: data.color }}>
              <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </motion.div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{data.nombre}</h3>
              <p className="text-sm text-slate-500 font-bold mt-1">¡La magia está hecha! Tu app está lista.</p>
            </div>
            <motion.div whileTap={{ scale: 0.95 }} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer active:bg-sky-50" onClick={() => { navigator.clipboard.writeText(publicLink); alert('¡Enlace copiado al portapapeles!') }}>
              <code className="text-xs font-black text-slate-800 block truncate">{publicLink}</code>
              <p className="text-[10px] font-black text-[#0ea5e9] uppercase tracking-widest mt-2">Tocar para copiar</p>
            </motion.div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onComplete} className="w-full py-4 bg-[#0ea5e9] text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-md">
              Entrar al Panel
            </motion.button>
          </motion.div>
        )

      default: return null
    }
  }

  // PANTALLA DE BIENVENIDA
  if (stepIndex === -1) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Fondo WhatsApp Pattern Celeste (opcionalmente opaco) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M54.627 0l.83.83-5.263 5.262-.83-.83L54.627 0zM22.022 17.595l1.66-1.66-1.66-1.66-1.66 1.66 1.66 1.66zM15 0l5 5-5 5-5-5 5-5zM0 15l5 5-5 5-5-5 5-5z\' fill=\'%230ea5e9\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}></div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring", bounce: 0.4 }} className="max-w-md w-full space-y-8 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-tr from-[#0ea5e9] to-[#38bdf8] rounded-[2rem] mx-auto shadow-xl shadow-sky-500/20 flex items-center justify-center">
             <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Creá tu plataforma</h1>
            <p className="text-slate-500 mt-3 font-medium text-sm md:text-base">Te guiamos como si fuera un chat para armar tu sistema en 2 minutos.</p>
          </div>
          <div className="pt-4">
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setStepIndex(0)}
              className="w-full py-5 bg-[#0ea5e9] text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-[#0ea5e9]/20"
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
      
      {/* TELÉFONO 1: EL CHAT WHATSAPP STYLE (Celeste) */}
      <div className="w-full h-[100dvh] lg:w-[400px] lg:h-[850px] lg:rounded-[3rem] lg:border-[10px] lg:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative flex flex-col overflow-hidden shrink-0 z-20 bg-[#efeae2]">
        
        {/* Notch Falso para Desktop */}
        <div className="hidden lg:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-[1.2rem] z-50"></div>

        {/* Fondo Doodle estilo WA Tinted Celeste */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%230ea5e9\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

        {/* Top Navbar WA Style Celeste */}
        <nav className="h-16 bg-[#0ea5e9] flex items-center justify-between px-3 sticky top-0 z-40 shrink-0 shadow-sm pt-2 lg:pt-0">
          <div className="flex items-center gap-3">
            <button className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md relative shrink-0">
              <svg className="w-6 h-6 text-[#0ea5e9]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.478-8.035-1.387-1.717-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
            </div>
            <div className="-mt-1">
              <p className="text-base font-medium text-white leading-tight">Asistente Virtual</p>
              <p className="text-[11px] font-medium text-white/80">{isTyping ? 'escribiendo...' : 'en línea'}</p>
            </div>
          </div>
          <div className="flex gap-4 text-white/90">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
          </div>
        </nav>

        {/* Vista Previa Sticky SÓLO MÓVIL (cuando el panel derecho no existe) */}
        <div className="lg:hidden w-full bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm sticky top-16 z-30">
           <div className="flex items-center gap-3 w-full">
             <motion.div layout className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black text-xs shadow-inner overflow-hidden" style={{ backgroundColor: data.color }}>
               {data.logo_url ? <img src={data.logo_url} className="w-full h-full object-cover" /> : (data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS')}
             </motion.div>
             <div className="min-w-0 flex-1">
               <p className="text-[11px] font-black text-slate-900 truncate">{data.nombre || 'Tu App'}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{data.rubro || 'Rubro'}</p>
             </div>
             <motion.div layout className="px-3 py-1.5 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: data.color }}>
                <span className="text-[9px] font-bold text-white uppercase">Reservar</span>
             </motion.div>
           </div>
        </div>

        {/* Chat History Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 pt-6 pb-48 w-full z-10" style={{ scrollBehavior: 'smooth' }}>
          
          {/* Fecha WA Style */}
          <div className="flex justify-center mb-6">
             <span className="bg-[#e1f0fa] text-[#0ea5e9] text-[11px] font-medium px-3 py-1 rounded-lg uppercase shadow-sm">Hoy</span>
          </div>

          <AnimatePresence initial={false}>
            {history.map((msg, idx) => (
              <motion.div 
                layout
                key={msg.id} 
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex mb-3 relative ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`relative max-w-[85%] px-3 py-2 text-[14.5px] font-normal leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#d0eefd] text-slate-800 rounded-lg rounded-tr-none' 
                    : 'bg-white text-slate-800 rounded-lg rounded-tl-none'
                }`}>
                  {/* WhatsApp Tail Bot */}
                  {msg.role === 'bot' && (
                    <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-[8px] text-white">
                      <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                      <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                    </svg>
                  )}
                  {/* WhatsApp Tail User */}
                  {msg.role === 'user' && (
                    <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -right-[8px] text-[#d0eefd]">
                      <path opacity=".13" fill="#0000000" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                      <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" transform="scale(-1, 1) translate(-8, 0)"></path>
                    </svg>
                  )}

                  <span className="pr-12">{msg.text}</span>
                  
                  {/* Timestamp & Ticks */}
                  <span className={`text-[10px] absolute bottom-1 right-2 flex items-center gap-1 ${msg.role === 'user' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {msg.time}
                    {msg.role === 'user' && (
                      <svg className="w-4 h-4 text-[#0ea5e9]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71,7.21a1,1,0,0,0-1.42,0L9.84,14.67,6.71,11.53A1,1,0,1,0,5.29,13l3.84,3.84a1,1,0,0,0,1.42,0l8.16-8.16A1,1,0,0,0,18.71,7.21Z"/><path d="M22.71,7.21a1,1,0,0,0-1.42,0l-8.16,8.16a1,1,0,0,1-1.42,0L10.29,14A1,1,0,0,0,8.88,15.46l2.83,2.83a1,1,0,0,0,1.42,0l8.16-8.16A1,1,0,0,0,22.71,7.21Z"/></svg>
                    )}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className="flex justify-start mb-3"
              >
                 <div className="relative bg-white text-slate-800 rounded-lg rounded-tl-none p-3 px-4 shadow-sm h-10 flex items-center gap-1.5">
                    <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-[8px] text-white">
                      <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                    </svg>
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-slate-400"></motion.div>
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-slate-400"></motion.div>
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-slate-400"></motion.div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-6" />
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 inset-x-0 pt-12 pb-4 px-2 z-40 pointer-events-none">
          <div className="w-full flex justify-center pointer-events-auto drop-shadow-md">
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
            <motion.div layout className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 border-[#F8FAFC] flex items-center justify-center shadow-lg transition-colors duration-500 overflow-hidden" style={{ backgroundColor: data.color }}>
                {data.logo_url ? (
                  <img src={data.logo_url} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <span className="font-black text-white text-3xl drop-shadow-sm">{data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS'}</span>
                )}
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
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-[1.5rem] bg-white shadow-sm border border-slate-100 flex flex-col gap-4">
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-base font-black text-slate-800">{data.svcNombre}</p>
                    <p className="text-sm font-black text-slate-600">${data.svcPrecio}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-1">{data.svcDuracion} minutos</p>
                </div>
                <motion.button layout className="w-full py-3 rounded-full text-xs font-black text-white shadow-md transition-colors duration-500" style={{ backgroundColor: data.color }}>
                  Reservar Turno
                </motion.button>
              </motion.div>
            ) : (
              <div className="p-4 rounded-[1.5rem] bg-white/50 shadow-sm border border-slate-100 border-dashed flex flex-col gap-4 opacity-50">
                 <div>
                  <div className="w-32 h-4 bg-slate-200 rounded-full mb-2"></div>
                  <div className="w-16 h-3 bg-slate-200 rounded-full"></div>
                 </div>
                 <div className="w-full py-3 rounded-full bg-slate-200"></div>
              </div>
            )}
          </div>

          {/* Staff */}
          {data.staffNombre && (
            <div className="mt-8 px-6 space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Profesionales</h3>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100">
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
