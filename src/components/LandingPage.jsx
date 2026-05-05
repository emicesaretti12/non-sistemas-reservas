import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const FEATURES = [
  { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', title: 'Agenda Inteligente', desc: 'Tus clientes reservan 24/7 desde su celular. Sin llamadas, sin WhatsApp manual.' },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', title: 'CRM de Clientes', desc: 'Conocé a tus clientes: frecuencia, ingresos, historial completo automático.' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Reportes en Tiempo Real', desc: 'Ingresos, ocupación, servicios populares. Datos que impulsan decisiones.' },
  { icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', title: 'Control de Inventario', desc: 'Gestioná stock, costos y alertas. Todo integrado con tu operación.' },
  { icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', title: 'App Personalizada', desc: 'Tu negocio con marca propia: logo, colores, dominio. 100% profesional.' },
  { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', title: 'Seguridad Total', desc: 'Encriptación SSL, backups automáticos, infraestructura enterprise.' },
]

const RUBROS = ['Barberías', 'Restaurantes', 'Centros de Estética', 'Veterinarias', 'Clínicas', 'Y más...']

const PASOS = [
  { num: '01', title: 'Creá tu Cuenta', desc: 'Registrate en 30 segundos con tu email o Google. Sin tarjeta de crédito.' },
  { num: '02', title: 'Configurá tu Negocio', desc: 'Un asistente te guía paso a paso: nombre, rubro, horarios, servicios y equipo.' },
  { num: '03', title: 'Compartí y Recibí Reservas', desc: 'Obtenés un link único. Compartilo en Instagram, WhatsApp o donde quieras.' },
]

const FAQS = [
  { q: '¿Necesito saber programar?', a: 'Para nada. Todo se configura con un asistente visual paso a paso. En 5 minutos tenés tu sistema funcionando.' },
  { q: '¿Mis clientes necesitan descargar una app?', a: 'No. Tus clientes acceden desde cualquier navegador con un simple link. Funciona en cualquier celular.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. No hay contratos ni permanencia mínima. Cancelás cuando quieras sin penalidades.' },
  { q: '¿Qué rubros soporta la plataforma?', a: 'Barberías, restaurantes, centros de estética, veterinarias, clínicas, y cualquier negocio que trabaje con turnos o reservas.' },
  { q: '¿Incluye soporte técnico?', a: 'Sí. Soporte por WhatsApp directo con nuestro equipo técnico, incluido en todos los planes.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [faqOpen, setFaqOpen] = useState(null)

  return (
    <div className="min-h-screen bg-[#FAFAFE] text-slate-900 font-sans antialiased overflow-x-hidden">

      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
              <span className="text-white font-black text-[10px] italic">NS</span>
            </div>
            <span className="text-sm font-black tracking-tight text-slate-900">Non Sistemas</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors">Funciones</a>
            <a href="#como-funciona" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors">Cómo Funciona</a>
            <a href="#precio" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors">Precio</a>
            <a href="#faq" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors px-3 py-2">Iniciar Sesión</button>
            <button onClick={() => navigate('/login')} className="text-[10px] font-black uppercase tracking-[0.15em] text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
              Empezar Gratis
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-200/30 -top-[200px] -left-[200px] blur-[120px]"></div>
          <div className="absolute w-[400px] h-[400px] rounded-full bg-cyan-200/20 -bottom-[100px] -right-[100px] blur-[100px]"></div>
        </div>

        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-20 md:pb-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 mb-6 md:mb-8 ns-fade-up">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span></span>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Plataforma #1 en Reservas</span>
            </div>

            <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-5 md:mb-7 ns-fade-up" style={{ animationDelay: '0.1s' }}>
              Tu negocio con sistema de reservas
              <span className="block ns-gradient-text" style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
                profesional
              </span>
            </h1>

            <p className="text-base md:text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto mb-8 md:mb-10 ns-fade-up" style={{ animationDelay: '0.2s' }}>
              Automatizá la gestión de turnos, clientes e inventario. 
              Tus clientes reservan online y vos gestionás todo desde un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center ns-fade-up" style={{ animationDelay: '0.3s' }}>
              <button onClick={() => navigate('/login')} className="ns-shimmer-btn w-full sm:w-auto px-8 py-4 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
                Empezar Ahora — Es Gratis
              </button>
              <a href="#como-funciona" className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-[0.15em] rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-95 text-center">
                Ver cómo funciona
              </a>
            </div>

            <p className="text-[10px] text-slate-400 font-medium mt-5 ns-fade-up" style={{ animationDelay: '0.4s' }}>
              Sin tarjeta de crédito • Configuración en 5 minutos • Cancelá cuando quieras
            </p>
          </div>

          {/* RUBROS TICKER */}
          <div className="mt-16 md:mt-24 flex flex-wrap justify-center gap-2 md:gap-3 ns-fade-up" style={{ animationDelay: '0.5s' }}>
            {RUBROS.map((r, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-white border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm hover:border-purple-200 hover:text-purple-600 transition-all cursor-default">
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 md:py-32 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-20">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">Todo Incluido</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Todo lo que necesitás para gestionar tu negocio</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-3 max-w-lg mx-auto">Una plataforma completa que reemplaza WhatsApp, planillas de Excel y cuadernos de anotaciones.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="group bg-[#FAFAFE] border border-slate-100 rounded-[1.5rem] p-6 md:p-8 hover:border-purple-200 hover:shadow-lg transition-all duration-500">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-5 group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-500">
                  <svg className="w-5 h-5 text-purple-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={f.icon} strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section id="como-funciona" className="py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-20">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">3 Pasos Simples</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Arrancá en minutos, no en semanas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {PASOS.map((p, i) => (
              <div key={i} className="relative group">
                <div className="bg-white border border-slate-100 rounded-[2rem] p-7 md:p-9 hover:border-purple-200 hover:shadow-xl transition-all duration-500 h-full">
                  <span className="text-5xl md:text-6xl font-black tracking-tighter text-purple-100 group-hover:text-purple-200 transition-colors">{p.num}</span>
                  <h3 className="text-xl font-bold tracking-tight mt-4 mb-2">{p.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{p.desc}</p>
                </div>
                {i < 2 && <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-slate-200"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="precio" className="py-20 md:py-32 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">Precio Simple</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Un plan. Todo incluido.</h2>
            <p className="text-sm text-slate-500 font-medium mt-3">Sin costos ocultos, sin limitaciones artificiales.</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px]"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase tracking-widest border border-purple-500/30">Más Popular</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-1">Plan Profesional</h3>
                <p className="text-sm text-white/50 font-medium mb-6">Todo lo que necesitás para operar como un profesional.</p>

                <div className="flex items-end gap-1 mb-8">
                  <span className="text-5xl md:text-6xl font-black tracking-tighter">$9.990</span>
                  <span className="text-sm text-white/40 font-bold mb-2">/mes</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {['Reservas online ilimitadas', 'App personalizada con tu marca', 'CRM de clientes automático', 'Reportes e inteligencia de negocio', 'Control de inventario', 'Gestión de empleados/recursos', 'Soporte técnico por WhatsApp', 'Actualizaciones incluidas'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/80 font-medium">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <button onClick={() => navigate('/login')} className="ns-shimmer-btn w-full py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
                  Empezar 7 Días Gratis
                </button>
                <p className="text-[10px] text-white/30 font-medium text-center mt-4">Sin tarjeta de crédito para la prueba gratuita</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 md:py-32">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-3 block">Preguntas Frecuentes</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">¿Tenés dudas?</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 transition-colors">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full text-left px-6 py-5 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-900">{f.q}</span>
                  <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${faqOpen === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${faqOpen === i ? 'max-h-40' : 'max-h-0'}`}>
                  <p className="px-6 pb-5 text-sm text-slate-500 font-medium leading-relaxed">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="relative rounded-[2.5rem] overflow-hidden p-10 md:p-16 text-center text-white" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}>
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-500/30 rounded-full blur-[100px]"></div>
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-cyan-400/20 rounded-full blur-[100px]"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">¿Listo para profesionalizar tu negocio?</h2>
              <p className="text-sm md:text-base text-white/60 font-medium mb-8 max-w-lg mx-auto">Unite a los negocios que ya automatizan sus reservas con Non Sistemas.</p>
              <button onClick={() => navigate('/login')} className="ns-shimmer-btn px-10 py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
                Crear Mi Cuenta Gratis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-100 py-10 md:py-14 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
              <span className="text-white font-black text-[8px] italic">NS</span>
            </div>
            <span className="text-xs font-bold text-slate-400">Non Sistemas © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Términos</a>
            <a href="#" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Privacidad</a>
            <a href="mailto:soporte@nonsistemas.com" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Contacto</a>
          </div>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Salsipuedes, Córdoba, Argentina</p>
        </div>
      </footer>
    </div>
  )
}
