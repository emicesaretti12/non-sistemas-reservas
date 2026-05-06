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
    { id: 'color', bot: () => "¡Perfecto! Ahora vamos a darle tu estilo. 🎨 Elegí el color de tu marca y mirá cómo queda tu app en vivo.", type: 'color' },
    { id: 'descripcion', bot: () => "¡Queda genial! ✨ ¿Querés agregar una frase corta que describa tu negocio? (Opcional)", type: 'textarea' },
    { id: 'instagram', bot: () => "¡Casi terminamos con el perfil! 📸 ¿Tenés un usuario de Instagram para asociar? (Opcional)", type: 'instagram' },
    { id: 'horarios', bot: () => "Ahora lo importante: Tus horarios de atención 🕒. Podés agregar cortes o pausas para el almuerzo.", type: 'horarios' },
    { id: 'servicio', bot: () => `¡Excelente! Para que empiecen a entrar clientes, necesitamos tu primer ${vocab.servicio || 'servicio'}. ¿Qué vas a ofrecer y qué precio tiene?`, type: 'servicio' },
    { id: 'staff', bot: () => `Por último, ¿cómo se llama el primer ${vocab.empleado || 'profesional'} de tu equipo? (Podés ser vos mismo)`, type: 'staff' },
    { id: 'saving', bot: () => "¡Todo listo! 🪄 Estamos construyendo y desplegando tu plataforma...", type: 'loading' },
    { id: 'listo', bot: () => "🎉 ¡Felicitaciones! Tu app está instalada, activa y lista para usar.", type: 'success' },
  ]

  const [history, setHistory] = useState([{ role: 'bot', text: steps[0].bot(data), id: 'welcome_msg' }])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }
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
    }, 1200) // Un poquito más de tiempo para que se sienta que está "escribiendo"
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

  const springConfig = { type: "spring", stiffness: 400, damping: 25 }

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
            className="w-full md:w-auto px-8 py-4 bg-sky-500 text-white font-black text-sm md:text-base rounded-[1.5rem] shadow-xl shadow-sky-500/30 flex items-center justify-center gap-2"
          >
            {currentStep.btnText}
            <motion.svg animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></motion.svg>
          </motion.button>
        )
      
      case 'text':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) advance(inputValue, { nombre: inputValue }) }} className="flex w-full max-w-sm gap-2">
            <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={currentStep.placeholder} className="flex-1 p-4 bg-white border-2 border-sky-100/50 rounded-2xl outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 font-bold text-slate-800 shadow-lg transition-all" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="p-4 bg-sky-500 text-white rounded-2xl disabled:opacity-50 disabled:scale-100 shadow-lg shadow-sky-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </motion.button>
          </motion.form>
        )

      case 'textarea':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `"${inputValue}"` : 'Lo dejo para después', { descripcion: inputValue }) }} className="w-full max-w-sm space-y-3">
            <textarea autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Agregá tu descripción aquí..." className="w-full p-4 bg-white border-2 border-sky-100/50 rounded-3xl outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 font-medium text-slate-800 shadow-lg transition-all h-28 resize-none" />
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo dejo para después', { descripcion: '' })} className="flex-1 p-4 bg-white text-slate-500 font-bold text-xs uppercase tracking-widest rounded-2xl shadow-sm border border-slate-100">Omitir</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="flex-[2] p-4 bg-sky-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 shadow-lg shadow-sky-500/20">Siguiente</motion.button>
            </div>
          </motion.form>
        )
      
      case 'instagram':
        return (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(inputValue ? `@${inputValue}` : 'No tengo por ahora', { instagram: inputValue }) }} className="w-full max-w-sm space-y-3">
            <div className="flex items-center bg-white border-2 border-sky-100/50 rounded-2xl overflow-hidden shadow-lg focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100 transition-all">
              <span className="pl-4 pr-2 text-sky-400 font-black text-lg">@</span>
              <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="tu_cuenta" className="flex-1 py-4 pr-4 bg-transparent outline-none font-bold text-slate-800" />
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('No tengo por ahora', { instagram: '' })} className="flex-1 p-4 bg-white text-slate-500 font-bold text-xs uppercase tracking-widest rounded-2xl shadow-sm border border-slate-100">Omitir</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!inputValue.trim()} className="flex-[2] p-4 bg-sky-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 shadow-lg shadow-sky-500/20">Siguiente</motion.button>
            </div>
          </motion.form>
        )

      case 'options':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="flex flex-wrap gap-2 max-w-lg">
            {currentStep.options.map((opt, i) => (
              <motion.button 
                key={opt} onClick={() => advance(opt, { rubro: opt })} 
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, ...springConfig }}
                whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                className="px-5 py-3.5 bg-white border-2 border-sky-100/50 text-slate-700 font-bold text-sm rounded-2xl shadow-sm hover:border-sky-400 hover:text-sky-600 transition-colors"
              >
                {opt}
              </motion.button>
            ))}
          </motion.div>
        )

      case 'color':
        return (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-center md:items-stretch">
            {/* Controles de Color */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-sky-100/50 shadow-2xl shadow-sky-900/5 space-y-8 flex-1 w-full max-w-md">
              <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <div className="relative group cursor-pointer">
                  <input type="color" value={data.color} onChange={e => setData({...data, color: e.target.value})} className="w-16 h-16 rounded-2xl cursor-pointer opacity-0 absolute inset-0 z-10" />
                  <motion.div layout className="w-16 h-16 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border-4 border-white pointer-events-none" style={{ backgroundColor: data.color }}></motion.div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Color Principal</p>
                  <span className="font-mono font-black text-xl text-slate-700 uppercase tracking-widest">{data.color}</span>
                </div>
              </div>
              <div className="flex gap-3 justify-between px-1">
               {['#0EA5E9', '#10B981', '#F43F5E', '#8B5CF6', '#F59E0B'].map(c => (
                 <motion.button key={c} onClick={() => setData({...data, color: c})} whileHover={{ scale: 1.15, y: -4 }} whileTap={{ scale: 0.9 }} className="flex-1 aspect-square rounded-2xl border-4 shadow-sm" style={{ backgroundColor: c, borderColor: data.color === c ? '#0f172a' : 'transparent' }}></motion.button>
               ))}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => advance(`Color elegido: ${data.color}`)} className="w-full py-5 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-slate-900/20">
                Me encanta, sigamos
              </motion.button>
            </div>
            
            {/* Live Preview - iPhone Mockup */}
            <div className="hidden md:block bg-white rounded-[3rem] border-[8px] border-slate-200/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] w-[300px] shrink-0 overflow-hidden relative origin-bottom">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-200/80 rounded-full z-20 backdrop-blur-md"></div>
              
              <div className="h-full w-full bg-slate-50 relative flex flex-col">
                <motion.div layout className="h-32 relative rounded-b-[2rem]" style={{ backgroundColor: `${data.color}15` }}>
                  <motion.div layout className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-[1.5rem] border-4 border-white flex items-center justify-center shadow-lg overflow-hidden" style={{ backgroundColor: data.color }}>
                     <span className="font-black text-white text-2xl drop-shadow-md">
                       {data.nombre ? data.nombre.substring(0,1).toUpperCase() : 'NS'}
                     </span>
                  </motion.div>
                </motion.div>
                
                <div className="mt-10 text-center px-4">
                  <h4 className="font-black text-xl text-slate-900 truncate tracking-tight">{data.nombre || 'Tu Negocio'}</h4>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{data.rubro || 'Rubro'}</p>
                </div>
                
                <div className="mt-8 px-5 space-y-4 flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Servicios</p>
                  
                  <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-3xl bg-white shadow-sm flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-800">Servicio Básico</p>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">30 min</p>
                    </div>
                    <motion.button layout className="w-full py-3 rounded-2xl text-xs font-black text-white shadow-md" style={{ backgroundColor: data.color }}>
                      Reservar
                    </motion.button>
                  </motion.div>

                  <div className="p-4 rounded-3xl bg-white shadow-sm flex flex-col gap-3 opacity-60">
                    <div>
                      <p className="text-sm font-black text-slate-800">Premium</p>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">60 min</p>
                    </div>
                    <motion.button layout className="w-full py-3 rounded-2xl text-xs font-black text-white shadow-md" style={{ backgroundColor: data.color }}>
                      Reservar
                    </motion.button>
                  </div>
                </div>
                
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-300 rounded-full"></div>
              </div>
            </div>
          </motion.div>
        )

      case 'horarios':
        return (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} className="w-full max-w-2xl bg-white p-4 md:p-6 rounded-[2.5rem] border-2 border-sky-100/50 shadow-2xl shadow-sky-900/5 space-y-4">
            <div className="max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar space-y-3 p-1">
              <AnimatePresence>
                {DIAS.map(d => (
                  <motion.div layout key={d} className={`flex flex-col gap-3 p-4 rounded-3xl border-2 transition-colors ${data.horarios[d].abierto ? 'bg-sky-50/30 border-sky-100 shadow-sm' : 'bg-transparent border-slate-100 opacity-60'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setData(prev => ({ ...prev, horarios: { ...prev.horarios, [d]: { ...prev.horarios[d], abierto: !prev.horarios[d].abierto } } }))} className={`w-12 h-7 rounded-full relative transition-colors ${data.horarios[d].abierto ? 'bg-sky-500' : 'bg-slate-300'}`}>
                          <motion.div layout className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md ${data.horarios[d].abierto ? 'left-[22px]' : 'left-1'}`}></motion.div>
                        </button>
                        <span className="text-sm font-black text-slate-700 w-24 uppercase tracking-widest">{DIAS_LABEL[d]}</span>
                      </div>
                      <AnimatePresence>
                        {data.horarios[d].abierto && (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2">
                            <input type="time" value={data.horarios[d].inicio} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicio: e.target.value } } }))} className="bg-white border-2 border-sky-100/50 rounded-xl px-2 py-1.5 md:px-3 md:py-2 text-xs font-bold outline-none text-slate-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                            <span className="text-xs text-slate-400 font-bold">-</span>
                            <input type="time" value={data.horarios[d].fin} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], fin: e.target.value } } }))} className="bg-white border-2 border-sky-100/50 rounded-xl px-2 py-1.5 md:px-3 md:py-2 text-xs font-bold outline-none text-slate-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence>
                      {data.horarios[d].abierto && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col md:flex-row items-start md:items-center gap-3 pl-14 overflow-hidden">
                          <label className="flex items-center gap-2 cursor-pointer group py-2">
                            <input type="checkbox" checked={data.horarios[d].pausa || false} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], pausa: e.target.checked } } }))} className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Agregar Corte</span>
                          </label>
                          <AnimatePresence>
                            {data.horarios[d].pausa && (
                              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2 pb-2">
                                <input type="time" value={data.horarios[d].inicioPausa || '13:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], inicioPausa: e.target.value } } }))} className="bg-white border-2 border-sky-100/50 rounded-xl px-2 py-1.5 text-xs font-bold outline-none text-slate-800 focus:border-sky-400" />
                                <span className="text-slate-400 font-bold text-xs">-</span>
                                <input type="time" value={data.horarios[d].finPausa || '17:00'} onChange={e => setData(p => ({ ...p, horarios: { ...p.horarios, [d]: { ...p.horarios[d], finPausa: e.target.value } } }))} className="bg-white border-2 border-sky-100/50 rounded-xl px-2 py-1.5 text-xs font-bold outline-none text-slate-800 focus:border-sky-400" />
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
            <div className="p-2 pt-4">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => advance('¡Horarios listos!')} className="w-full py-5 bg-sky-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-sky-500/30">
                Confirmar Agenda
              </motion.button>
            </div>
          </motion.div>
        )

      case 'servicio':
        return (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(`${data.svcNombre} a $${data.svcPrecio} (${data.svcDuracion} min)`) }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-sky-100/50 shadow-2xl shadow-sky-900/5 max-w-sm space-y-6 w-full">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.svcNombre} onChange={e => setData({...data, svcNombre: e.target.value})} placeholder={`Ej: ${vocab.placeholderServicio || 'Corte Clásico'}`} className="w-full p-4 bg-slate-50 border-2 border-sky-100/50 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 focus:bg-white transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio ($)</label>
                <input required type="number" value={data.svcPrecio} onChange={e => setData({...data, svcPrecio: e.target.value})} placeholder="0" className="w-full p-4 bg-slate-50 border-2 border-sky-100/50 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 focus:bg-white transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiempo</label>
                <select value={data.svcDuracion} onChange={e => setData({...data, svcDuracion: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-sky-100/50 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 focus:bg-white transition-all appearance-none cursor-pointer">
                  {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo omito por ahora', { svcNombre: '' })} className="flex-1 py-4 bg-white border border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-sm">Omitir</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!data.svcNombre} className="flex-[2] py-4 bg-sky-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-sky-500/20 disabled:opacity-30">Crear Servicio</motion.button>
            </div>
          </motion.form>
        )

      case 'staff':
        return (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springConfig} onSubmit={(e) => { e.preventDefault(); advance(`${data.staffNombre} (${data.staffEspecialidad || 'General'})`) }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-sky-100/50 shadow-2xl shadow-sky-900/5 max-w-sm space-y-6 w-full">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
              <input required value={data.staffNombre} onChange={e => setData({...data, staffNombre: e.target.value})} placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border-2 border-sky-100/50 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 focus:bg-white transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialidad</label>
              <input value={data.staffEspecialidad} onChange={e => setData({...data, staffEspecialidad: e.target.value})} placeholder={vocab.placeholderEspecialidad || 'Ej: General'} className="w-full p-4 bg-slate-50 border-2 border-sky-100/50 rounded-2xl outline-none font-bold text-sm text-slate-800 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 focus:bg-white transition-all" />
            </div>
            <div className="flex gap-2 pt-2">
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => advance('Lo configuro luego', { staffNombre: '' })} className="flex-1 py-4 bg-white border border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-sm">Omitir</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={!data.staffNombre} className="flex-[2] py-4 bg-sky-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-sky-500/20 disabled:opacity-30">¡Terminar!</motion.button>
            </div>
          </motion.form>
        )

      case 'success':
        const publicSlug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const publicLink = `${window.location.origin}/app/${publicSlug}/${negocioId || ''}`
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="bg-white p-8 md:p-10 rounded-[3rem] border-4 border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] max-w-sm w-full space-y-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }} className="w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center shadow-2xl shadow-current/30" style={{ backgroundColor: data.color }}>
              <svg className="w-12 h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </motion.div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{data.nombre}</h3>
              <p className="text-sm text-slate-500 font-bold mt-2">¡La magia está hecha! Tu app está lista.</p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 cursor-pointer hover:border-sky-200 hover:bg-sky-50 transition-colors group shadow-sm" onClick={() => { navigator.clipboard.writeText(publicLink); alert('¡Enlace copiado al portapapeles!') }}>
              <code className="text-[12px] font-black text-slate-800 block truncate group-hover:text-sky-600 transition-colors">{publicLink}</code>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 group-hover:text-sky-500 transition-colors">Copiar tu Enlace</p>
            </motion.div>
            <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.95 }} onClick={onComplete} className="w-full py-5 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-slate-900/20">
              Entrar al Panel
            </motion.button>
          </motion.div>
        )

      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F9FF] flex flex-col font-sans antialiased selection:bg-sky-200">
      {/* Top Navbar */}
      <nav className="h-16 border-b bg-white/70 backdrop-blur-2xl border-sky-100/50 flex items-center justify-between px-6 md:px-8 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-300 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Non Sistemas</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-sky-500">Configuración Interactiva</p>
          </div>
        </div>
        <div className="hidden md:flex gap-1.5">
          {[...Array(steps.length)].map((_, i) => (
             <motion.div key={i} layout className={`h-1.5 rounded-full ${i < stepIndex ? 'w-4 bg-sky-500' : i === stepIndex ? 'w-6 bg-sky-400' : 'w-1.5 bg-sky-100'}`} />
          ))}
        </div>
      </nav>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full pb-56" style={{ scrollBehavior: 'smooth' }}>
        <AnimatePresence initial={false}>
          {history.map((msg, idx) => (
            <motion.div 
              layout
              key={msg.id} 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`flex mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'bot' && (
                <div className="w-10 h-10 rounded-2xl bg-white border border-sky-100 shadow-sm flex items-center justify-center shrink-0 mr-4 mt-1">
                  <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.478-8.035-1.387-1.717-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
                </div>
              )}
              <div className={`max-w-[85%] md:max-w-[75%] p-5 md:p-6 text-[15px] font-medium leading-relaxed shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-[2rem] rounded-tr-sm shadow-sky-500/20' 
                  : 'bg-white/90 backdrop-blur-md border border-white/40 text-slate-700 rounded-[2rem] rounded-tl-sm'
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
              className="flex justify-start mb-6"
            >
               <div className="w-10 h-10 rounded-2xl bg-white border border-sky-100 shadow-sm flex items-center justify-center shrink-0 mr-4 mt-1">
                  <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.478-8.035-1.387-1.717-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
               </div>
               <div className="bg-white/90 backdrop-blur-md border border-white/40 rounded-[2rem] rounded-tl-sm p-6 flex items-center gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-sky-400"></motion.div>
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-sky-400"></motion.div>
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-sky-400"></motion.div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[#F4F9FF] via-[#F4F9FF] to-transparent pt-20 pb-8 px-4 md:px-8 pointer-events-none z-40">
        <div className="max-w-4xl mx-auto flex justify-center md:justify-start pl-0 md:pl-[3.5rem] pointer-events-auto">
          <AnimatePresence mode="wait">
            {renderInput()}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #bae6fd; border-radius: 4px; }
      `}</style>
    </div>
  )
}
