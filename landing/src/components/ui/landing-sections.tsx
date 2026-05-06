"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─── Shared fade-in animation ─── */
const fadeIn = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.15, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

/* ═══════════════════════════════════════════════════
   1. FEATURES SECTION
   ═══════════════════════════════════════════════════ */
const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Reservas automatizadas",
    desc: "Tus clientes reservan 24/7 desde su celular. Sin llamadas, sin WhatsApp, sin errores.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Gestión de clientes",
    desc: "Base de datos inteligente con historial, preferencias y métricas por cliente.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Analytics en tiempo real",
    desc: "Dashboard con métricas de reservas, ingresos y ocupación. Decidí con datos.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: "Vista pública mobile",
    desc: "Página de reservas optimizada para celular que podés compartir desde Instagram o WhatsApp.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "Inventario inteligente",
    desc: "Control de stock con costos, alertas y valuación automática de tu inventario.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Setup en 5 minutos",
    desc: "Onboarding guiado paso a paso. Configurá horarios, servicios y empezá a operar hoy.",
  },
];

export function FeaturesSection() {
  return (
    <section className="relative py-16 sm:py-24 md:py-32 bg-[#030303] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-transparent to-[#030303]" />
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <motion.div
          custom={0}
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-10 sm:mb-16 md:mb-20"
        >
          <span className="inline-block text-sm text-indigo-400 font-medium tracking-widest uppercase mb-4">
            Funcionalidades
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
            Todo lo que necesitás,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-rose-300">
              nada que no.
            </span>
          </h2>
          <p className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto font-light">
            Herramientas profesionales diseñadas para negocios que quieren crecer sin complicaciones.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="group relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:bg-white/[0.04] active:bg-white/[0.06]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{f.title}</h3>
              <p className="text-white/40 font-light leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   2. STATS / SOCIAL PROOF
   ═══════════════════════════════════════════════════ */
const stats = [
  { value: "200+", label: "Negocios activos" },
  { value: "50K+", label: "Reservas procesadas" },
  { value: "99.9%", label: "Uptime garantizado" },
  { value: "4.9★", label: "Satisfacción" },
];

export function StatsSection() {
  return (
    <section className="relative py-14 sm:py-20 bg-[#030303]">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.03] via-transparent to-rose-500/[0.03]" />
      <div className="relative z-10 container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 tracking-tight mb-1 sm:mb-2">
                {s.value}
              </div>
              <div className="text-white/40 text-sm md:text-base font-light tracking-wide">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   3. HOW IT WORKS
   ═══════════════════════════════════════════════════ */
const steps = [
  { num: "01", title: "Creá tu cuenta", desc: "Registrate gratis y configurá tu negocio en minutos con nuestro asistente guiado." },
  { num: "02", title: "Personalizá tu agenda", desc: "Definí horarios, servicios, duración y disponibilidad. Todo desde el panel admin." },
  { num: "03", title: "Compartí tu link", desc: "Publicá tu link de reservas en Instagram, WhatsApp o tu web. Tus clientes reservan solos." },
  { num: "04", title: "Crecé con datos", desc: "Usá analytics para entender tu negocio, optimizar horarios y fidelizar clientes." },
];

export function HowItWorksSection() {
  return (
    <section className="relative py-16 sm:py-24 md:py-32 bg-[#030303] overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <motion.div
          custom={0}
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-sm text-rose-400 font-medium tracking-widest uppercase mb-4">
            Cómo funciona
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            De cero a operativo{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-300 to-amber-300">
              en minutos.
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="relative"
            >
              <div className="text-7xl md:text-8xl font-black text-white/[0.03] absolute -top-4 -left-2 select-none pointer-events-none">
                {s.num}
              </div>
              <div className="relative pt-8">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-amber-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-sm font-bold mb-5">
                  {s.num}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{s.title}</h3>
                <p className="text-white/40 font-light leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   4. TESTIMONIALS
   ═══════════════════════════════════════════════════ */
const testimonials = [
  {
    quote: "Antes perdía 2 horas por día coordinando turnos por WhatsApp. Ahora mis clientes reservan solos y yo me enfoco en atender.",
    name: "Valentina R.",
    role: "Dueña de peluquería",
    initials: "VR",
  },
  {
    quote: "El dashboard de analytics me ayudó a entender qué horarios son los más rentables. Aumenté mis ingresos un 40% en 3 meses.",
    name: "Martín G.",
    role: "Restaurante & Bar",
    initials: "MG",
  },
  {
    quote: "La configuración fue increíblemente rápida. En 10 minutos tenía todo funcionando y ya recibía reservas esa misma noche.",
    name: "Lucía P.",
    role: "Estudio de yoga",
    initials: "LP",
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative py-16 sm:py-24 md:py-32 bg-[#030303] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.02] to-transparent" />
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <motion.div
          custom={0}
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="inline-block text-sm text-violet-400 font-medium tracking-widest uppercase mb-4">
            Testimonios
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            Lo que dicen{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-indigo-300">
              nuestros clientes.
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors duration-500"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-white/60 font-light leading-relaxed mb-8 text-[15px]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 border border-white/10 flex items-center justify-center text-white/80 text-xs font-bold">
                  {t.initials}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{t.name}</div>
                  <div className="text-white/30 text-xs">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   5. PRICING
   ═══════════════════════════════════════════════════ */
const plans = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    desc: "Para empezar a digitalizar tu negocio.",
    features: ["Hasta 50 reservas/mes", "1 servicio", "Vista pública mobile", "Soporte por email"],
    cta: "Empezar gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9.990",
    period: "/mes",
    desc: "Para negocios en crecimiento.",
    features: ["Reservas ilimitadas", "Servicios ilimitados", "Analytics avanzados", "Gestión de inventario", "Soporte prioritario", "Dominio personalizado"],
    cta: "Empezar prueba gratis",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$24.990",
    period: "/mes",
    desc: "Para operaciones multi-sede.",
    features: ["Todo de Pro", "Múltiples locaciones", "API access", "Reportes exportables", "Manager dedicado", "SLA 99.99%"],
    cta: "Contactar ventas",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section className="relative py-16 sm:py-24 md:py-32 bg-[#030303] overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <motion.div
          custom={0}
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-sm text-emerald-400 font-medium tracking-widest uppercase mb-4">
            Planes
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
            Simple, transparente,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-cyan-300">
              sin sorpresas.
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className={cn(
                "relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all duration-500",
                p.highlighted
                  ? "bg-gradient-to-b from-indigo-500/[0.08] to-transparent border-indigo-500/30 scale-[1.02]"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
              )}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold tracking-wider uppercase">
                  Popular
                </div>
              )}
              <h3 className="text-xl font-semibold text-white mb-2">{p.name}</h3>
              <p className="text-white/40 text-sm mb-6 font-light">{p.desc}</p>
              <div className="mb-8">
                <span className="text-4xl md:text-5xl font-bold text-white">{p.price}</span>
                <span className="text-white/40 text-sm ml-1">{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-white/50 text-sm">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={cn(
                  "w-full py-3.5 sm:py-3 rounded-2xl font-semibold text-sm transition-all duration-300 active:scale-[0.98]",
                  p.highlighted
                    ? "bg-white text-slate-900 hover:scale-[1.02] shadow-lg shadow-indigo-500/20"
                    : "bg-white/[0.05] text-white border border-white/[0.1] hover:bg-white/[0.08]"
                )}
              >
                {p.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   6. FOOTER
   ═══════════════════════════════════════════════════ */
export function Footer() {
  return (
    <footer className="relative py-12 sm:py-16 bg-[#030303] border-t border-white/[0.04]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <h3 className="text-xl font-bold text-white tracking-tight mb-3">Non Sistemas</h3>
            <p className="text-white/30 text-sm font-light leading-relaxed">
              Plataforma profesional de gestión de reservas para negocios modernos.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Producto</h4>
            <ul className="space-y-2">
              {["Funcionalidades", "Precios", "Integraciones", "Changelog"].map((l) => (
                <li key={l}><a href="#" className="text-white/30 text-sm hover:text-white/60 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Empresa</h4>
            <ul className="space-y-2">
              {["Nosotros", "Blog", "Contacto", "Carreras"].map((l) => (
                <li key={l}><a href="#" className="text-white/30 text-sm hover:text-white/60 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Legal</h4>
            <ul className="space-y-2">
              {["Términos", "Privacidad", "Cookies", "Licencias"].map((l) => (
                <li key={l}><a href="#" className="text-white/30 text-sm hover:text-white/60 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/20 text-sm">© 2026 Non Sistemas. Todos los derechos reservados.</p>
          <div className="flex gap-5">
            {["Instagram", "Twitter", "LinkedIn"].map((s) => (
              <a key={s} href="#" className="text-white/20 text-sm hover:text-white/50 transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
