import { motion } from 'framer-motion'
import { IconCelebrate } from './NoniIcons'

export default function OnboardingComplete({ data, negocioId, onComplete, showToast }) {
  const slug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const link = `${window.location.origin}/app/${slug}/${negocioId}`

  const handleContinue = () => {
    // Ensure tour, assistant & guided setup show for new accounts
    localStorage.removeItem('ns_tour_completed_v2')
    localStorage.removeItem('ns_assistant_v2')
    localStorage.removeItem('ns_bubble_shown')
    onComplete()
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link)
    showToast('Enlace copiado al portapapeles')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#1a0f3f] to-[#020617] flex items-center justify-center p-6 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl"
          style={{ background: data.color }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-20 right-10 w-72 h-72 rounded-full blur-3xl"
          style={{ background: data.color }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="max-w-md w-full text-center space-y-8 relative z-10"
      >
        {/* Confetti animation */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -100 }}
              transition={{ duration: 2, delay: i * 0.1 }}
              className="absolute text-3xl"
              style={{ left: `${20 + i * 10}%`, top: 0 }}
            >
              ✨
            </motion.div>
          ))}
        </div>

        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.3, damping: 15, stiffness: 200 }}
          className="w-28 h-28 mx-auto rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden border-4 border-white/20"
          style={{ background: `linear-gradient(135deg, ${data.color} 0%, ${data.color}dd 100%)` }}
        >
          {data.logo_url ? (
            <img src={data.logo_url} className="w-full h-full object-cover" alt="Logo" />
          ) : (
            <span className="text-white text-5xl font-black">{data.nombre[0]?.toUpperCase()}</span>
          )}
        </motion.div>

        {/* Celebration text */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h1 className="text-5xl font-black text-white tracking-tight flex items-center justify-center gap-3 mb-2">
            ¡Listo! <IconCelebrate size={40} className="text-amber-400 animate-bounce" />
          </h1>
          <p className="text-lg text-slate-300 mt-3">{data.nombre}</p>
          <p className="text-sm text-slate-400 mt-1">Tu plataforma está activa y lista para recibir clientes</p>
        </motion.div>

        {/* Link box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={handleCopyLink}
          className="bg-white/10 border border-white/20 rounded-2xl p-5 cursor-pointer hover:bg-white/15 hover:border-white/40 transition-all backdrop-blur-sm"
        >
          <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-bold">Tu link de reservas</p>
          <code className="text-sm text-sky-300 block truncate font-mono">{link}</code>
          <p className="text-[10px] text-white/30 mt-3 uppercase tracking-widest">👆 Tocar para copiar</p>
        </motion.div>

        {/* Next steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 text-left"
        >
          <p className="text-xs font-black text-white/70 uppercase tracking-widest mb-3">Próximos pasos</p>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex items-center gap-2">
              <span className="text-sky-400">✓</span> Compartir link en WhatsApp
            </li>
            <li className="flex items-center gap-2">
              <span className="text-sky-400">✓</span> Agregar más servicios
            </li>
            <li className="flex items-center gap-2">
              <span className="text-sky-400">✓</span> Personalizar tu marca
            </li>
          </ul>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          onClick={handleContinue}
          className="w-full py-5 rounded-2xl text-white font-black text-base uppercase tracking-widest shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 active:scale-95"
          style={{ background: `linear-gradient(135deg, ${data.color} 0%, ${data.color}dd 100%)` }}
        >
          Ir al Dashboard →
        </motion.button>
      </motion.div>
    </div>
  )
}
