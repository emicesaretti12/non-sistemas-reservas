import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { RUBROS_DISPONIBLES, getVocabulario } from '../utils/vocabulario'
import { motion, AnimatePresence } from 'framer-motion'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }

const COLORES = [
  '#0f172a', '#334155', '#ef4444', '#f97316', '#f59e0b', '#eab308', 
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
]

// Componente "Chasis" ultra realista para simular un iPhone
const PhoneChassis = ({ children, hideOnMobile = false }) => (
  <div className={`
    ${hideOnMobile ? 'hidden lg:flex' : 'flex'} 
    flex-col w-full h-[100dvh] lg:w-[400px] lg:h-[850px] 
    bg-white lg:bg-[#f3f4f6]/40 lg:backdrop-blur-3xl 
    lg:rounded-[3.5rem] lg:p-4 lg:shadow-[0_0_0_1px_rgba(255,255,255,0.8),0_30px_60px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(255,255,255,0.5)] 
    relative shrink-0 z-20
  `}>
    <div className="relative w-full h-full bg-[#f8fafc] lg:rounded-[2.5rem] overflow-hidden flex flex-col shadow-inner">
       {/* Notch Falso (Solo Desktop) */}
       <div className="hidden lg:flex absolute top-0 inset-x-0 h-7 justify-center z-[100] pointer-events-none">
          <div className="w-32 h-7 bg-black rounded-b-[1.2rem] flex items-center justify-between px-3">
             <div className="w-2 h-2 rounded-full bg-white/10"></div>
             <div className="w-2 h-2 rounded-full bg-white/10"></div>
          </div>
       </div>
       {children}
    </div>
  </div>
)

export default function OnboardingWizard({ session, onComplete }) {
  const [stepIndex, setStepIndex] = useState(-1)
  
  const [data, setData] = useState({
    nombre: '',
    rubro: '',
    color: '#0ea5e9',
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
    { id: 'welcome', bot: () => "¡Hola! 👋 Soy tu Asistente Virtual. Te voy a guiar para construir tu plataforma en un par de minutos. En la pantalla derecha vas a ver cómo queda en tiempo real. ¿Listo?", type: 'button', btnText: '¡Comencemos!' },
    { id: 'nombre', bot: () => "Primero lo primero... 📝 ¿Cómo se llama tu negocio?", type: 'text', placeholder: 'Ej: Barbería Central' },
    { id: 'rubro', bot: (d) => `¡Me encanta "${d.nombre}"! 🚀 ¿A qué rubro se dedican?`, type: 'options', options: RUBROS_DISPONIBLES },
    { id: 'color', bot: () => "¡Perfecto! 🎨 Ahora elegí el color principal que va a tener tu app.", type: 'color' },
    { id: 'logo', bot: () => "Toda marca necesita una cara 🖼️. Subí el logo de tu negocio (podés hacerlo más tarde si no lo tenés a mano).", type: 'logo' },
    { id: 'descripcion', bot: () => "¡Qué buen estilo! ✨ ¿Querés agregar una frase corta que describa tu negocio? (Aparecerá en el encabezado)", type: 'textarea' },
    { id: 'instagram', bot: () => "📸 ¿Tenés cuenta de Instagram? Escribila así los clientes pueden seguirte.", type: 'instagram' },
    { id: 'horarios', bot: () => "Ahora definamos tus horarios de atención 🕒. Esto habilitará la agenda.", type: 'horarios' },
    { id: 'servicio', bot: () => `¡Excelente! Vamos a agregar tu primer ${vocab.servicio || 'servicio'} para que la gente empiece a reservar.`, type: 'servicio' },
    { id: 'staff', bot: () => `Por último, ¿cómo se llama el principal ${vocab.empleado || 'profesional'} de tu equipo?`, type: 'staff' },
    { id: 'saving', bot: () => "¡Todo listo! 🪄 Creando tu base de datos y levantando tu aplicación en la nube...", type: 'loading' },
    { id: 'listo', bot: () => "🎉 ¡Misión cumplida! Tu app está 100% activa. Copiá tu link y entremos al panel.", type: 'success' },
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

  // Guard principal: bloquea avances duplicados (doble click, StrictMode, etc)
  const isProcessingRef = useRef(false)
  // Guard de idempotencia: garantiza que el insert a Supabase ocurra UNA SOLA VEZ
  const hasCreatedNegocioRef = useRef(false)

  const advance = (userAnswerText, dataUpdates = {}) => {
    // Si hay un avance en curso, ignorar completamente
    if (isProcessingRef.current) return
    isProcessingRef.current = true

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
        // El backend creation maneja su propio lock; esperamos su resultado
        await executeBackendCreation(newData, nextIdx)
      }
      // Solo liberar el lock cuando el paso (incluyendo backend) terminó
      isProcessingRef.current = false
    }, 1200)
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
        advance('¡Logo subido!', { logo_url: json.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_400/') })
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
    // Guarda de idempotencia: si ya se creó el negocio (por StrictMode u otro re-render), no volver a intentarlo
    if (hasCreatedNegocioRef.current) {
      console.warn('Onboarding: executeBackendCreation ignorada (ya ejecutada una vez).')
      return
    }
    hasCreatedNegocioRef.current = true

    try {
      setIsTyping(true)

      // Verificar primero si el usuario YA tiene un negocio (defensa extra contra duplicados en BD)
      const { data: existente } = await supabase
        .from('negocios')
        .select('id')
        .eq('owner_id', session.user.id)
        .maybeSingle()

      let negocioIdFinal

      if (existente?.id) {
        // El negocio ya existe (creado por un render previo), usar el existente
        console.warn('Onboarding: negocio ya existente encontrado, usando ID existente:', existente.id)
        negocioIdFinal = existente.id
      } else {
        // Crear el negocio por primera vez
        const { data: negData, error: negErr } = await supabase.from('negocios').insert([{
          owner_id: session.user.id, nombre: finalData.nombre, rubro: finalData.rubro, color_primario: finalData.color,
          estado_suscripcion: 'activo', es_admin_plataforma: import.meta.env.VITE_SUPERADMIN_EMAIL ? (session.user.email === import.meta.env.VITE_SUPERADMIN_EMAIL) : false
        }]).select().single()
        if (negErr) throw negErr
        negocioIdFinal = negData.id
      }

      setNegocioId(negocioIdFinal)

      await supabase.from('negocios').update({
        descripcion: finalData.descripcion, instagram: finalData.instagram, horarios: finalData.horarios, logo_url: finalData.logo_url
      }).eq('id', negocioIdFinal).catch(e => console.warn('Campos adicionales omitidos'))

      if (finalData.svcNombre) {
        await supabase.from('servicios').insert([{ negocio_id: negocioIdFinal, nombre: finalData.svcNombre, precio: Number(finalData.svcPrecio) || 0, duracion_minutos: Number(finalData.svcDuracion) || 30 }])
          .catch(e => console.warn('Servicio omitido:', e.message))
      }
      if (finalData.staffNombre) {
        await supabase.from('empleados').insert([{ negocio_id: negocioIdFinal, nombre: finalData.staffNombre, especialidad: finalData.staffEspecialidad, estado: 'activo' }])
          .catch(e => console.warn('Staff omitido:', e.message))
      }

      setTimeout(() => {
        setIsTyping(false)
        setStepIndex(savingIdx + 1)
        setHistory(h => [...h, { role: 'bot', text: steps[savingIdx + 1].bot(finalData), id: `bot_${savingIdx + 1}_${Date.now()}` }])
      }, 1500)
    } catch (e) { 
      alert("Error al crear el sistema: " + e.message)
      setIsTyping(false) 
    }
  }

  const springConfig = { type: "spring", stiffness: 400, damping: 30 }

  const renderInput = () => {
    if (isTyping || stepIndex < 0) return null
    const currentStep = steps[stepIndex]

    const cardClass = "w-full bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-white/50 space-y-4"

    switch(currentStep.type) {
      case 'button':
        return (
          <motion.button 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={springConfig}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => advance('¡Comencemos!')} 
            className="w-full px-6 py-4 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-black text-[15px] rounded-[1.5rem] shadow-[0_8px_30px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2"
          >
            {currentStep.btnText}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </motion.button>
        )
      
      case 'text':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) advance(inputValue, { nombre: inputValue }) }} className="flex w-full gap-3 items-center bg-white/80 backdrop-blur-xl p-2 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-white/50">
            <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={currentStep.placeholder} className="flex-1 px-4 py-3 bg-transparent outline-none font-semibold text-slate-800 placeholder:text-slate-400" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="w-12 h-12 flex items-center justify-center bg-gradient-to-tr from-sky-400 to-sky-500 text-white rounded-full disabled:opacity-50 shadow-md shrink-0">
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </motion.button>
          </motion.form>
        )

      case 'textarea':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `"${inputValue}"` : 'Lo omito', { descripcion: inputValue }) }} className={cardClass}>
            <textarea autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Ej: Los mejores cortes de la ciudad..." className="w-full px-4 py-3 bg-[#f8fafc] rounded-[1rem] outline-none font-medium text-slate-800 border border-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white transition-all h-24 resize-none" />
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo omito', { descripcion: '' })} className="flex-1 p-3.5 bg-slate-100 text-slate-500 font-bold text-[13px] rounded-[1.2rem]">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="flex-[2] p-3.5 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-bold text-[13px] rounded-[1.2rem] shadow-md disabled:opacity-50">Confirmar</motion.button>
            </div>
          </motion.form>
        )
      
      case 'instagram':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `@${inputValue}` : 'Lo omito', { instagram: inputValue }) }} className={cardClass}>
            <div className="flex items-center bg-[#f8fafc] rounded-[1rem] overflow-hidden border border-slate-100 focus-within:border-sky-400 focus-within:bg-white transition-all px-4">
              <span className="text-sky-500 font-black text-lg">@</span>
              <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="tu_cuenta" className="flex-1 py-4 px-2 bg-transparent outline-none font-semibold text-slate-800" />
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo omito', { instagram: '' })} className="flex-1 p-3.5 bg-slate-100 text-slate-500 font-bold text-[13px] rounded-[1.2rem]">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="flex-[2] p-3.5 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-bold text-[13px] rounded-[1.2rem] shadow-md disabled:opacity-50">Confirmar</motion.button>
            </div>
          </motion.form>
        )

      case 'logo':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className={cardClass}>
            {isUploading ? (
              <div className="w-full py-8 bg-[#f8fafc] rounded-[1.5rem] flex flex-col items-center justify-center gap-3">
                 <div className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></div>
                 <p className="text-[13px] font-bold text-slate-500">Procesando imagen...</p>
              </div>
            ) : (
              <>
                <label className="w-full py-8 bg-[#f8fafc] rounded-[1.5rem] border-2 border-dashed border-slate-200 hover:border-sky-400 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group">
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <div className="text-center">
                    <span className="text-[14px] font-bold text-slate-800 block">Tocar para subir foto</span>
                    <span className="text-[11px] font-medium text-slate-400">Archivos JPG o PNG</span>
                  </div>
                </label>
                <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo configuro después')} className="w-full p-4 bg-slate-100 text-slate-600 font-bold text-[13px] rounded-[1.2rem]">
                  Omitir paso
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
                className="px-5 py-3 bg-white/90 backdrop-blur-md border border-white/50 text-slate-700 font-bold text-[14px] rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:bg-sky-50 hover:text-sky-600 transition-all"
              >
                {opt}
              </motion.button>
            ))}
          </motion.div>
        )

      case 'color':
        return (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className={cardClass}>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">Elegí tu color</p>
              <div className="grid grid-cols-5 gap-3 px-1">
               {COLORES.slice(0,14).map((c, i) => (
                 <motion.button 
                   key={c} onClick={() => setData({...data, color: c})} 
                   initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                   whileHover={{ scale: 1.15, zIndex: 10 }} whileTap={{ scale: 0.9 }} 
                   className="aspect-square rounded-full shadow-md border-[3px] transition-colors relative flex items-center justify-center" 
                   style={{ backgroundColor: c, borderColor: data.color === c ? '#fff' : 'transparent', boxShadow: data.color === c ? `0 0 0 2px ${c}` : '' }}
                 >
                 </motion.button>
               ))}
               
               <label className="aspect-square rounded-full shadow-inner border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors relative">
                 <input type="color" value={data.color} onChange={e => setData({...data, color: e.target.value})} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                 <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
               </label>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => advance(`Color elegido: ${data.color}`)} className="w-full py-4 bg-slate-900 text-white font-bold text-[14px] rounded-[1.2rem] shadow-xl mt-2">
                Confirmar Diseño
              </motion.button>
          </motion.div>
        )

      case 'horarios':
        return (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className={cardClass}>
            <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar space-y-2.5">
              <AnimatePresence>
                {DIAS.map(d => (
                  <motion.div layout key={d} className={`flex flex-col gap-3 p-3.5 rounded-[1.2rem] transition-all duration-300 ${data.horarios[d].abierto ? 'bg-[#f8fafc] border border-sky-100/50 shadow-sm' : 'bg-transparent border border-transparent opacity-50 grayscale'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setData(prev => ({ ...prev, horarios: { ...prev.horarios, [d]: { ...prev.horarios[d], abierto: !prev.horarios[d].abierto } } }))} className={`w-11 h-6 rounded-full relative transition-colors ${data.horarios[d].abierto ? 'bg-sky-500' : 'bg-slate-300'}`}>
                          <motion.div layout className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm ${data.horarios[d].abierto ? 'left-[24px]' : 'left-1'}`}></motion.div>
                        </button>
                        <span className="text-[14px] font-bold text-slate-800 w-16 capitalize">{DIAS_LABEL[d].substring(0,3)}</span>
                      </div>
                      <AnimatePresence>
                        {data.horarios[d].abierto && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-lg shadow-sm border border-slate-100">
                            <input type="time" value={data.horarios[d].inicio} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicio: e.target.value } } }))} className="bg-transparent text-[12px] font-bold outline-none text-slate-800 w-[60px] text-center" />
                            <span className="text-[12px] text-slate-300 font-bold">-</span>
                            <input type="time" value={data.horarios[d].fin} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], fin: e.target.value } } }))} className="bg-transparent text-[12px] font-bold outline-none text-slate-800 w-[60px] text-center" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence>
                      {data.horarios[d].abierto && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 pl-14 overflow-hidden">
                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${data.horarios[d].pausa ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-300'}`}>
                               {data.horarios[d].pausa && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={data.horarios[d].pausa || false} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], pausa: e.target.checked } } }))} />
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Corte / Siesta</span>
                          </label>
                          <AnimatePresence>
                            {data.horarios[d].pausa && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 pb-1">
                                <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg shadow-sm border border-slate-100">
                                  <input type="time" value={data.horarios[d].inicioPausa || '13:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicioPausa: e.target.value } } }))} className="bg-transparent text-[12px] font-bold outline-none text-slate-800 w-[60px] text-center" />
                                  <span className="text-[12px] text-slate-300 font-bold">-</span>
                                  <input type="time" value={data.horarios[d].finPausa || '17:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], finPausa: e.target.value } } }))} className="bg-transparent text-[12px] font-bold outline-none text-slate-800 w-[60px] text-center" />
                                </div>
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
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => advance('¡Horarios listos!')} className="w-full py-4 bg-slate-900 text-white font-bold text-[14px] rounded-[1.2rem] shadow-xl">
                Guardar Horarios
              </motion.button>
            </div>
          </motion.div>
        )

      case 'servicio':
        return (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(`${data.svcNombre} a $${data.svcPrecio} (${data.svcDuracion} min)`) }} className={cardClass}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Servicio</label>
              <input required value={data.svcNombre} onChange={e => setData({...data, svcNombre: e.target.value})} placeholder={`Ej: ${vocab.placeholderServicio || 'Corte Clásico'}`} className="w-full p-4 bg-[#f8fafc] border border-slate-100 rounded-[1.2rem] outline-none font-semibold text-[14px] text-slate-800 focus:bg-white focus:border-sky-400 transition-all shadow-inner" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Precio ($)</label>
                <input required type="number" value={data.svcPrecio} onChange={e => setData({...data, svcPrecio: e.target.value})} placeholder="0" className="w-full p-4 bg-[#f8fafc] border border-slate-100 rounded-[1.2rem] outline-none font-semibold text-[14px] text-slate-800 focus:bg-white focus:border-sky-400 transition-all shadow-inner" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Duración</label>
                <div className="relative">
                  <select value={data.svcDuracion} onChange={e => setData({...data, svcDuracion: e.target.value})} className="w-full p-4 bg-[#f8fafc] border border-slate-100 rounded-[1.2rem] outline-none font-semibold text-[14px] text-slate-800 focus:bg-white focus:border-sky-400 transition-all shadow-inner appearance-none">
                    {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} minutos</option>)}
                  </select>
                  <svg className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo omito por ahora', { svcNombre: '' })} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold text-[13px] rounded-[1.2rem]">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!data.svcNombre} className="flex-[2] py-4 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-bold text-[14px] rounded-[1.2rem] shadow-lg disabled:opacity-50">Siguiente</motion.button>
            </div>
          </motion.form>
        )

      case 'staff':
        return (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(`${data.staffNombre} (${data.staffEspecialidad || 'General'})`) }} className={cardClass}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del {vocab.empleado || 'Profesional'}</label>
              <input required value={data.staffNombre} onChange={e => setData({...data, staffNombre: e.target.value})} placeholder="Ej: Juan Pérez" className="w-full p-4 bg-[#f8fafc] border border-slate-100 rounded-[1.2rem] outline-none font-semibold text-[14px] text-slate-800 focus:bg-white focus:border-sky-400 transition-all shadow-inner" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol / Especialidad</label>
              <input value={data.staffEspecialidad} onChange={e => setData({...data, staffEspecialidad: e.target.value})} placeholder={vocab.placeholderEspecialidad || 'Ej: General'} className="w-full p-4 bg-[#f8fafc] border border-slate-100 rounded-[1.2rem] outline-none font-semibold text-[14px] text-slate-800 focus:bg-white focus:border-sky-400 transition-all shadow-inner" />
            </div>
            <div className="flex gap-2 pt-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo configuro luego', { staffNombre: '' })} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold text-[13px] rounded-[1.2rem]">Omitir</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!data.staffNombre} className="flex-[2] py-4 bg-slate-900 text-white font-bold text-[14px] rounded-[1.2rem] shadow-xl disabled:opacity-50">Terminar Configuración</motion.button>
            </div>
          </motion.form>
        )

      case 'success':
        const publicSlug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const publicLink = `${window.location.origin}/app/${publicSlug}/${negocioId || ''}`
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={cardClass + " text-center p-8"}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }} className="w-24 h-24 mx-auto rounded-[1.8rem] flex items-center justify-center shadow-2xl relative overflow-hidden" style={{ backgroundColor: data.color }}>
               {data.logo_url ? <img src={data.logo_url} className="w-full h-full object-cover" /> : <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            </motion.div>
            <div className="py-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{data.nombre}</h3>
              <p className="text-[14px] text-slate-500 font-medium mt-1">Tu plataforma está lista para brillar.</p>
            </div>
            <motion.div whileTap={{ scale: 0.95 }} className="bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 cursor-pointer hover:border-sky-300 transition-colors" onClick={() => { navigator.clipboard.writeText(publicLink); alert('¡Enlace copiado al portapapeles!') }}>
              <code className="text-[13px] font-bold text-slate-700 block truncate">{publicLink}</code>
              <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                Tocar para copiar link
              </p>
            </motion.div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onComplete} className="w-full py-5 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-black text-[14px] uppercase tracking-[0.2em] rounded-[1.2rem] shadow-xl shadow-sky-500/30 mt-2">
              Ingresar al Dashboard
            </motion.button>
          </motion.div>
        )

      default: return null
    }
  }

  // PANTALLA DE BIENVENIDA ÉPICA
  if (stepIndex === -1) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans">
        {/* Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-sky-500 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, type: "spring", bounce: 0.3 }} className="max-w-md w-full relative z-10 p-10 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-tr from-sky-400 to-blue-500 rounded-[2rem] mx-auto shadow-[0_0_50px_rgba(56,189,248,0.4)] flex items-center justify-center mb-8 relative">
             <div className="absolute inset-0 rounded-[2rem] bg-white opacity-20 filter blur-md"></div>
             <svg className="w-12 h-12 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">Configuración<br/>Virtual</h1>
            <p className="text-slate-400 mt-4 font-medium text-sm md:text-base leading-relaxed">Olvidate de los formularios aburridos. Te voy a guiar por un chat paso a paso para armar tu plataforma entera.</p>
          </div>
          <div className="pt-10">
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setStepIndex(0)}
              className="w-full py-5 bg-white text-slate-900 font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
            >
              Comenzar Ahora
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#E2E8F0] relative overflow-hidden flex flex-col lg:flex-row items-center justify-center gap-0 lg:gap-12 p-0 lg:p-8 font-sans">
      
      {/* Background Épico para Desktop */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-50"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[40%] bg-indigo-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[100px]"></div>
      </div>

      {/* TELÉFONO 1: EL CHAT iMESSAGE/WA PREMIUM STYLE */}
      <PhoneChassis>
        {/* Fondo Doodle ultra sutil */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M54.627 0l.83.83-5.263 5.262-.83-.83L54.627 0zM22.022 17.595l1.66-1.66-1.66-1.66-1.66 1.66 1.66 1.66zM15 0l5 5-5 5-5-5 5-5zM0 15l5 5-5 5-5-5 5-5z\' fill=\'%23000000\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}></div>

        {/* Top Navbar Glassmorphism */}
        <nav className="h-20 lg:h-24 bg-white/80 backdrop-blur-xl border-b border-black/5 flex items-end justify-between px-4 pb-3 sticky top-0 z-40 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 w-full">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-400 to-sky-500 flex items-center justify-center shadow-[0_4px_15px_rgba(56,189,248,0.4)] relative shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-black text-slate-800 leading-tight">Asistente Nucleus</h2>
              <p className="text-[12px] font-medium text-sky-500">{isTyping ? 'escribiendo...' : 'En línea'}</p>
            </div>
            <div className="flex gap-3 text-sky-500">
               <div className="w-9 h-9 rounded-full bg-sky-50 flex items-center justify-center cursor-pointer hover:bg-sky-100 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.95 21a2 2 0 0 1-1.42-.58L16.2 18.09a2 2 0 0 1-.58-1.42v-2.34a2 2 0 0 1 2-2h2.34a2 2 0 0 1 1.42.58l2.33 2.33a2 2 0 0 1 .58 1.42V19A2 2 0 0 1 19.95 21ZM4 19a2 2 0 0 1-2-2v-2.34a2 2 0 0 1 .58-1.42L4.91 10.9a2 2 0 0 1 1.42-.58h2.34a2 2 0 0 1 2 2v2.34a2 2 0 0 1-.58 1.42L7.76 18.42A2 2 0 0 1 6.34 19Z" transform="translate(0, 0)"></path></svg>
               </div>
            </div>
          </div>
        </nav>

        {/* Vista Previa Sticky (Mobile) */}
        <div className="lg:hidden w-full bg-white/60 backdrop-blur-md border-b border-slate-200/50 px-4 py-2.5 flex items-center justify-between sticky top-20 z-30 shadow-sm">
           <div className="flex items-center gap-3 w-full">
             <motion.div layout className="w-9 h-9 rounded-[0.8rem] flex items-center justify-center shrink-0 text-white font-black text-sm shadow-md overflow-hidden" style={{ backgroundColor: data.color }}>
               {data.logo_url ? <img src={data.logo_url} className="w-full h-full object-cover" /> : (data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS')}
             </motion.div>
             <div className="min-w-0 flex-1">
               <p className="text-[12px] font-black text-slate-800 truncate leading-tight">{data.nombre || 'Tu App'}</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{data.rubro || 'Vista Previa'}</p>
             </div>
             <motion.div layout className="px-3 py-1.5 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: data.color }}>
                <span className="text-[9px] font-bold text-white uppercase tracking-wider">Reservar</span>
             </motion.div>
           </div>
        </div>

        {/* Chat History Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pt-6 pb-48 w-full z-10" style={{ scrollBehavior: 'smooth' }}>
          
          <div className="flex justify-center mb-6">
             <span className="bg-black/5 text-slate-500 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Hoy</span>
          </div>

          <AnimatePresence initial={false}>
            {history.map((msg, idx) => (
              <motion.div 
                layout
                key={msg.id} 
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex mb-4 relative ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`relative max-w-[85%] px-4 py-3 text-[15px] font-medium leading-relaxed shadow-sm border border-black/5 ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-sky-400 to-sky-500 text-white rounded-[1.5rem] rounded-tr-[0.4rem]' 
                    : 'bg-white text-slate-800 rounded-[1.5rem] rounded-tl-[0.4rem]'
                }`}>
                  <span className={msg.role === 'user' ? 'pr-12 block' : 'pr-1 block'}>{msg.text}</span>
                  
                  {msg.role === 'user' && (
                    <span className="text-[10px] absolute bottom-1.5 right-3 flex items-center gap-1 text-white/80 font-medium">
                      {msg.time}
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </span>
                  )}
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
                 <div className="bg-white border border-black/5 text-slate-800 rounded-[1.5rem] rounded-tl-[0.4rem] p-3 px-4 shadow-sm h-11 flex items-center gap-1.5">
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-slate-400"></motion.div>
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-slate-400"></motion.div>
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-slate-400"></motion.div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-6" />
        </div>

        {/* Input Area (Floating Cards) */}
        <div className="absolute bottom-0 inset-x-0 pt-20 pb-6 px-4 z-40 pointer-events-none bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/90 to-transparent">
          <div className="w-full flex justify-center pointer-events-auto">
            <AnimatePresence mode="wait">
              {renderInput()}
            </AnimatePresence>
          </div>
        </div>

      </PhoneChassis>

      {/* TELÉFONO 2: LIVE PREVIEW (La vista al público) - Oculto en móviles */}
      <PhoneChassis hideOnMobile={true}>
        
        <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar relative z-10 bg-white">
          {/* Header Curved */}
          <motion.div layout className="h-44 relative rounded-b-[3rem] transition-colors duration-500 shadow-sm" style={{ backgroundColor: data.color }}>
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
            
            <motion.div layout className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-[2rem] border-[6px] border-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-colors duration-500 overflow-hidden bg-white">
                {data.logo_url ? (
                  <img src={data.logo_url} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <span className="font-black text-[2rem] drop-shadow-sm" style={{ color: data.color }}>{data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS'}</span>
                )}
            </motion.div>
          </motion.div>

          {/* Info Principal */}
          <div className="mt-16 text-center px-6">
            <h1 className="font-black text-3xl text-slate-900 tracking-tight leading-none">{data.nombre || 'Tu Marca'}</h1>
            <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">{data.rubro || 'Tu Rubro'}</p>
            {data.descripcion && (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[14px] font-medium text-slate-600 mt-4 leading-relaxed max-w-[85%] mx-auto">
                "{data.descripcion}"
              </motion.p>
            )}
            {data.instagram && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 flex justify-center">
                <span className="px-5 py-2.5 bg-slate-50 text-slate-700 text-xs font-black rounded-full border border-slate-200 flex items-center gap-2 shadow-sm">
                  <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  {data.instagram}
                </span>
              </motion.div>
            )}
          </div>

          {/* Servicios - Glass Cards */}
          <div className="mt-10 px-6 space-y-4">
            <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-100 pb-2">Servicios Disponibles</h3>
            
            {data.svcNombre ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 rounded-[1.8rem] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -mr-10 -mt-10 transition-colors" style={{ backgroundColor: data.color }}></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <p className="text-[16px] font-black text-slate-800 leading-tight pr-4">{data.svcNombre}</p>
                    <p className="text-[16px] font-black text-slate-900">${data.svcPrecio}</p>
                  </div>
                  <p className="text-[12px] font-bold text-slate-400 mt-1">{data.svcDuracion} minutos</p>
                </div>
                <motion.button layout className="w-full py-4 rounded-[1rem] text-[13px] font-black text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 relative z-10" style={{ backgroundColor: data.color }}>
                  Reservar Turno
                </motion.button>
              </motion.div>
            ) : (
              <div className="p-5 rounded-[1.8rem] bg-slate-50 shadow-inner border border-slate-100 border-dashed flex flex-col gap-4 opacity-50">
                 <div>
                  <div className="w-40 h-5 bg-slate-200 rounded-full mb-3"></div>
                  <div className="w-20 h-3 bg-slate-200 rounded-full"></div>
                 </div>
                 <div className="w-full h-12 rounded-[1rem] bg-slate-200"></div>
              </div>
            )}
          </div>

          {/* Staff */}
          {data.staffNombre && (
            <div className="mt-10 px-6 space-y-4">
              <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-100 pb-2">Profesionales</h3>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 bg-white p-4 rounded-[1.8rem] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-50">
                <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-white text-xl shadow-md" style={{ backgroundColor: data.color }}>
                  {data.staffNombre.substring(0,1).toUpperCase()}
                </div>
                <div>
                  <p className="text-[15px] font-black text-slate-800">{data.staffNombre}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{data.staffEspecialidad || 'General'}</p>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-300 rounded-full z-50"></div>
      </PhoneChassis>

    </div>
  )
}
