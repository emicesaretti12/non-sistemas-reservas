import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

function Counter({ end, suffix = '', prefix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef()
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let s = 0; const d = Math.max(1, Math.floor(1500 / end))
        const t = setInterval(() => { s += Math.ceil(end / 40); if (s >= end) { setVal(end); clearInterval(t) } else setVal(s) }, d)
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [end])
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>
}

const FEATURES = [
  { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', t: 'Agenda Inteligente', d: 'Reservas 24/7. Sin llamadas, sin WhatsApp manual. Todo automático.' },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', t: 'CRM Automático', d: 'Base de clientes con frecuencia, ingresos e historial completo.' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', t: 'Business Intelligence', d: 'Reportes en tiempo real: ingresos, ocupación, tendencias.' },
  { icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', t: 'App con Tu Marca', d: 'Logo, colores, dominio propio. 100% white-label profesional.' },
  { icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', t: 'Control de Stock', d: 'Inventario, costos, alertas de stock bajo. Todo integrado.' },
  { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', t: 'Seguridad Enterprise', d: 'SSL, backups automáticos, auth multi-factor, RLS.' },
]

const TESTIMONIALS = [
  { name: 'Martín G.', biz: 'BarberKing', text: 'Pasé de anotar en un cuaderno a tener todo automatizado. Mis clientes reservan solos y yo me enfoco en cortar.', stars: 5 },
  { name: 'Lucía R.', biz: 'Estética Lux', text: 'En la primera semana ya recuperé la inversión. El CRM de clientes es increíble, sé exactamente quién vuelve.', stars: 5 },
  { name: 'Carlos M.', biz: 'La Parrilla de Carlos', text: 'Antes perdía reservas por WhatsApp. Ahora todo queda registrado y organizado. Muy profesional.', stars: 5 },
]

const FAQS = [
  { q: '¿Necesito saber programar?', a: 'No. Un asistente visual te guía paso a paso. En 5 minutos tenés tu sistema listo.' },
  { q: '¿Mis clientes necesitan descargar una app?', a: 'No. Acceden desde cualquier navegador con un link. Funciona en todos los celulares.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Sin contratos, sin permanencia mínima. Cancelás cuando quieras.' },
  { q: '¿Qué rubros soporta?', a: 'Barberías, restaurantes, estéticas, veterinarias, clínicas y cualquier negocio con turnos.' },
  { q: '¿Incluye soporte técnico?', a: 'Sí. Soporte por WhatsApp directo con nuestro equipo, incluido en el plan.' },
]

export default function LandingPage() {
  const nav = useNavigate()
  const [faq, setFaq] = useState(null)

  const Ic = ({ d, cls = 'w-5 h-5' }) => <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={d} strokeLinecap="round" strokeLinejoin="round"/></svg>

  return (
    <div className="min-h-screen bg-[#FAFAFE] text-slate-900 font-sans antialiased overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}><span className="text-white font-black text-[10px] italic">NS</span></div>
            <span className="text-sm font-black tracking-tight">Non Sistemas</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[['#features','Funciones'],['#como','Cómo Funciona'],['#precio','Precio'],['#faq','FAQ']].map(([h,l])=><a key={h} href={h} className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">{l}</a>)}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>nav('/login')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 px-3 py-2 transition-colors hidden sm:block">Iniciar Sesión</button>
            <button onClick={()=>nav('/login')} className="text-[10px] font-black uppercase tracking-[0.15em] text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95" style={{background:'linear-gradient(135deg,#6c5ce7,#a29bfe)'}}>Empezar Gratis</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[700px] h-[700px] rounded-full bg-purple-200/25 -top-[300px] -left-[200px] blur-[140px]"/>
          <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-200/15 top-[20%] -right-[200px] blur-[120px]"/>
          <div className="absolute inset-0 opacity-[0.015]" style={{backgroundImage:'radial-gradient(circle,#6c5ce7 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>
        </div>
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-16 md:pb-24 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 mb-6 ns-fade-up">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-purple-400 opacity-75"/><span className="relative rounded-full h-2 w-2 bg-purple-500"/></span>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">+200 negocios activos</span>
            </div>
            <h1 className="text-[2.5rem] md:text-7xl font-black tracking-[-0.04em] leading-[0.92] mb-5 ns-fade-up" style={{animationDelay:'0.1s'}}>
              El sistema de reservas que <span className="ns-hero-gradient">tu negocio merece</span>
            </h1>
            <p className="text-base md:text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto mb-8 ns-fade-up" style={{animationDelay:'0.2s'}}>
              Automatizá turnos, conocé a tus clientes y hacé crecer tu negocio. Todo desde una plataforma que se configura en 5 minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center ns-fade-up" style={{animationDelay:'0.3s'}}>
              <button onClick={()=>nav('/login')} className="ns-shimmer-btn px-8 py-4 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#6c5ce7,#a29bfe)'}}>
                Probar 7 Días Gratis
              </button>
              <a href="#como" className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-[0.15em] rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 active:scale-95 transition-all text-center">
                Ver Demo
              </a>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-5 ns-fade-up" style={{animationDelay:'0.4s'}}>Sin tarjeta de crédito • Configuración en 5 min • Cancelá cuando quieras</p>
          </div>
        </div>

        {/* SOCIAL PROOF STATS */}
        <div className="max-w-4xl mx-auto px-5 md:px-8 pb-16 md:pb-24">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
            {[{n:200,s:'+',l:'Negocios Activos'},{n:15000,s:'+',l:'Reservas/mes'},{n:98,s:'%',l:'Uptime'},{n:4.9,s:'★',l:'Satisfacción',dec:true}].map((s,i)=>(
              <div key={i} className="ns-stat-landing py-6 md:py-8">
                <p className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900">{s.dec?s.n:<Counter end={s.n}/>}{s.s}</p>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-16 md:py-28 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-20">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">Plataforma Completa</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Todo lo que necesitás. Nada que sobre.</h2>
            <p className="text-sm text-slate-500 font-medium mt-3 max-w-lg mx-auto">Reemplazá WhatsApp, Excel y cuadernos con una sola herramienta profesional.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {FEATURES.map((f,i)=>(
              <div key={i} className="ns-feature-pro group">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-5 group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-500">
                  <Ic d={f.icon} cls="w-5 h-5 text-purple-500 group-hover:text-white transition-colors"/>
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-2">{f.t}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" className="py-16 md:py-28">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-20">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">3 Pasos</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Empezá en minutos, no en semanas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{n:'01',t:'Creá tu cuenta',d:'Registrate con email o Google. Sin tarjeta.'},{n:'02',t:'Configurá todo',d:'Un wizard te guía: nombre, horarios, servicios, equipo.'},{n:'03',t:'Recibí reservas',d:'Compartí tu link único y empezá a recibir clientes.'}].map((p,i)=>(
              <div key={i} className="relative group">
                <div className="bg-white border border-slate-100 rounded-[2rem] p-8 hover:border-purple-200 hover:shadow-xl transition-all duration-500 h-full">
                  <span className="text-6xl font-black tracking-tighter text-purple-100 group-hover:text-purple-200 transition-colors">{p.n}</span>
                  <h3 className="text-xl font-bold tracking-tight mt-4 mb-2">{p.t}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{p.d}</p>
                </div>
                {i<2&&<div className="hidden md:block absolute top-1/2 -right-3 w-6 text-slate-200"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 md:py-28 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">Casos de Éxito</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} className="ns-testimonial">
                <div className="flex gap-0.5 mb-4">{Array(t.stars).fill(0).map((_,j)=><svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}</div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-600 text-sm">{t.name[0]}</div>
                  <div><p className="text-sm font-bold text-slate-900">{t.name}</p><p className="text-[10px] text-slate-400 font-bold">{t.biz}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="precio" className="py-16 md:py-28 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">Precio Transparente</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Un plan. Todo incluido.</h2>
          </div>
          <div className="max-w-md mx-auto">
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white ns-pricing-glow overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px]"/>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-400/10 rounded-full blur-[60px]"/>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase tracking-widest border border-purple-500/30">Más Popular</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">7 Días Gratis</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-1">Plan Profesional</h3>
                <p className="text-sm text-white/40 font-medium mb-6">Todo para operar como un profesional.</p>
                <div className="flex items-end gap-1 mb-8">
                  <span className="text-5xl md:text-6xl font-black tracking-tighter">$9.990</span>
                  <span className="text-sm text-white/40 font-bold mb-2">/mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Reservas online ilimitadas','App personalizada con tu marca','CRM de clientes automático','Reportes e inteligencia','Control de inventario','Gestión de equipo','Soporte por WhatsApp','Updates incluidas'].map((x,i)=>(
                    <li key={i} className="flex items-center gap-3 text-sm text-white/80 font-medium">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Ic d="M5 13l4 4L19 7" cls="w-3 h-3 text-emerald-400"/>
                      </div>{x}
                    </li>
                  ))}
                </ul>
                <button onClick={()=>nav('/login')} className="ns-shimmer-btn w-full py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95" style={{background:'linear-gradient(135deg,#6c5ce7,#a29bfe)'}}>Empezar 7 Días Gratis</button>
                <p className="text-[10px] text-white/30 text-center mt-4">Sin tarjeta de crédito</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-28">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Preguntas Frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f,i)=>(
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 transition-colors">
                <button onClick={()=>setFaq(faq===i?null:i)} className="w-full text-left px-6 py-5 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-900">{f.q}</span>
                  <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${faq===i?'rotate-180':''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${faq===i?'max-h-40':'max-h-0'}`}>
                  <p className="px-6 pb-5 text-sm text-slate-500 font-medium leading-relaxed">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="relative rounded-[2.5rem] overflow-hidden p-10 md:p-16 text-center text-white" style={{background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)'}}>
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-500/30 rounded-full blur-[100px]"/>
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-cyan-400/20 rounded-full blur-[100px]"/>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">¿Listo para profesionalizar tu negocio?</h2>
              <p className="text-sm md:text-base text-white/50 font-medium mb-8 max-w-lg mx-auto">Unite a los negocios que ya automatizan sus reservas.</p>
              <button onClick={()=>nav('/login')} className="ns-shimmer-btn px-10 py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95" style={{background:'linear-gradient(135deg,#6c5ce7,#a29bfe)'}}>Crear Mi Cuenta Gratis</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#6c5ce7,#a29bfe)'}}><span className="text-white font-black text-[8px] italic">NS</span></div>
            <span className="text-xs font-bold text-slate-400">Non Sistemas © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            {['Términos','Privacidad','Contacto'].map(x=><a key={x} href="#" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">{x}</a>)}
          </div>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Salsipuedes, Córdoba, Argentina</p>
        </div>
      </footer>
    </div>
  )
}
