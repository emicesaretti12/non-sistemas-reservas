import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconCelebrate } from './NoniIcons'

// Pantalla final del alta: fondo de marca sólido con relieve invertido
// (las piezas se hunden en el bordó en vez de flotar sobre el papel).
export default function OnboardingComplete({ data, negocioId, onComplete, showToast }) {
  const [copiado, setCopiado] = useState(false)
  const slug = data.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const link = `${window.location.origin}/app/${slug}/${negocioId}`
  const color = data.color || 'var(--ns-primary)'

  const handleContinue = () => {
    // Nos aseguramos de que el tour, el asistente y la guía aparezcan en la
    // primera sesión de una cuenta nueva.
    localStorage.removeItem('ns_tour_completed_v2')
    localStorage.removeItem('ns_assistant_v2')
    localStorage.removeItem('ns_bubble_shown')
    onComplete()
  }

  // El portapapeles falla en http:// y en algunos navegadores embebidos, así
  // que dejamos el fallback clásico con un textarea oculto.
  const handleCopyLink = async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(link)
      ok = true
    } catch {
      try {
        const area = document.createElement('textarea')
        area.value = link
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        ok = document.execCommand('copy')
        document.body.removeChild(area)
      } catch {
        ok = false
      }
    }
    setCopiado(ok)
    showToast?.(ok ? 'Enlace copiado al portapapeles' : 'No pudimos copiarlo: mantené presionado el link')
    if (ok) setTimeout(() => setCopiado(false), 2200)
  }

  const pasos = ['Compartí el link por WhatsApp', 'Sumá el resto de tus servicios', 'Terminá de personalizar tu marca']

  return (
    <div
      className="ns-ambient-dark ns-fullscreen flex items-center justify-center p-6"
    >
      {/* Halos de fondo: dan profundidad sin romper la paleta */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute top-16 left-4 w-72 h-72 rounded-full blur-3xl"
          style={{ background: color }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="absolute bottom-16 right-4 w-72 h-72 rounded-full blur-3xl"
          style={{ background: 'rgba(255,255,255,0.5)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
        className="max-w-md w-full text-center space-y-7 relative z-10"
      >
        {/* Destellos de festejo */}
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none overflow-hidden">
          {[...Array(9)].map((_, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 1, y: 10, scale: 0.6 }}
              animate={{ opacity: 0, y: -110, scale: 1.1 }}
              transition={{ duration: 2.1, delay: i * 0.09, ease: 'easeOut' }}
              className="absolute text-2xl"
              style={{ left: `${8 + i * 10}%`, top: 0 }}
            >
              ✦
            </motion.span>
          ))}
        </div>

        {/* Isotipo: papel extruido sobre el bordó */}
        <motion.div
          initial={{ scale: 0, rotate: -160 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.2, stiffness: 420, damping: 34, mass: 0.85 }}
          className="w-28 h-28 mx-auto rounded-[2.2rem] flex items-center justify-center overflow-hidden"
          style={{
            background: 'var(--ns-paper)',
            boxShadow: '14px 16px 36px rgba(16,24,40,0.45), -10px -10px 26px rgba(255,255,255,0.14)'
          }}
        >
          {data.logo_url ? (
            <img src={data.logo_url} className="w-full h-full object-cover" alt="Logo" />
          ) : (
            <span className="text-5xl font-bold" style={{ color: 'var(--ns-primary)' }}>
              {data.nombre[0]?.toUpperCase()}
            </span>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <h1
            className="text-5xl font-bold tracking-tight flex items-center justify-center gap-3"
            style={{ color: 'var(--ns-paper)', fontFamily: 'var(--font-display)' }}
          >
            ¡Listo!
            <motion.span
              animate={{ y: [0, -7, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="inline-flex"
            >
              <IconCelebrate size={38} />
            </motion.span>
          </h1>
          <p className="text-lg mt-3 font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {data.nombre}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Tu plataforma ya está activa y lista para recibir clientes
          </p>
        </motion.div>

        {/* Link de reservas: bloque hundido, se copia al tocarlo */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopyLink}
          className="w-full text-left rounded-[26px] p-5 transition-all"
          style={{
            background: 'rgba(16,24,40,0.28)',
            boxShadow: 'inset 8px 8px 18px rgba(16,24,40,0.5), inset -6px -6px 16px rgba(255,255,255,0.09)'
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.08em] mb-2 font-bold"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            Tu link de reservas
          </p>
          <code className="text-sm block truncate font-mono" style={{ color: 'var(--ns-paper)' }}>
            {link}
          </code>
          <p className="text-[10px] mt-3 uppercase tracking-[0.07em] font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {copiado ? '✓ Copiado' : 'Tocá para copiar'}
          </p>
        </motion.button>

        {/* Próximos pasos */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68 }}
          className="rounded-[24px] p-5 text-left"
          style={{
            background: 'rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)'
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.08em] mb-3"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Próximos pasos
          </p>
          <ul className="space-y-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.82)' }}>
            {pasos.map((paso, i) => (
              <li key={paso} className="flex items-center gap-3">
                <span
                  className="grid place-items-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0"
                  style={{
                    background: 'var(--ns-paper)',
                    color: 'var(--ns-primary)',
                    boxShadow: '3px 3px 8px rgba(16,24,40,0.4)'
                  }}
                >
                  {i + 1}
                </span>
                {paso}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78 }}
          onClick={handleContinue}
          className="ui-onbrand-btn w-full py-5 text-base uppercase tracking-[0.06em]"
        >
          Ir al panel →
        </motion.button>
      </motion.div>
    </div>
  )
}
