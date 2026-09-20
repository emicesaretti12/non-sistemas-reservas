import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from './Toast'

const PROFESSIONAL_TEMPLATES = [
  {
    id: 'premium-dark',
    name: 'Premium Oscuro',
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
    accent: 'linear-gradient(135deg, #5B3DF5 0%, #8B7CF6 100%)',
    textColor: '#ffffff',
    secondaryText: '#e8deff',
  },
  {
    id: 'premium-violet',
    name: 'Violeta Premium',
    bg: 'linear-gradient(135deg, #5B3DF5 0%, #7C5CF8 50%, #9B7EFF 100%)',
    accent: 'linear-gradient(135deg, #ffffff 0%, #f3eeff 100%)',
    textColor: '#ffffff',
    secondaryText: '#e8deff',
  },
  {
    id: 'modern-light',
    name: 'Moderno Claro',
    bg: 'linear-gradient(135deg, #f5f3ff 0%, #e8deff 100%)',
    accent: 'linear-gradient(135deg, #5B3DF5 0%, #8B7CF6 100%)',
    textColor: '#1e1b4b',
    secondaryText: '#5b5580',
  },
  {
    id: 'luxury-gold',
    name: 'Lujo Dorado',
    bg: 'linear-gradient(135deg, #1a1410 0%, #2d2015 50%, #3d2f1f 100%)',
    accent: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    textColor: '#ffffff',
    secondaryText: '#f4d03f',
  },
  {
    id: 'vibrant-neon',
    name: 'Vibrante Neón',
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    accent: 'linear-gradient(135deg, #00d9ff 0%, #ff006e 100%)',
    textColor: '#ffffff',
    secondaryText: '#00d9ff',
  },
  {
    id: 'elegant-rose',
    name: 'Elegante Rosé',
    bg: 'linear-gradient(135deg, #3d1f2d 0%, #5a2e42 50%, #7a3d52 100%)',
    accent: 'linear-gradient(135deg, #ff6b9d 0%, #ffa6c1 100%)',
    textColor: '#ffffff',
    secondaryText: '#ffa6c1',
  },
]

const SIZES = [
  { id: 'story', label: 'Story Instagram', w: 1080, h: 1920, aspect: '9/16', previewH: 400, previewW: 225 },
  { id: 'post', label: 'Post Cuadrado', w: 1080, h: 1080, aspect: '1/1', previewH: 320, previewW: 320 },
  { id: 'landscape', label: 'Portada Facebook', w: 1200, h: 628, aspect: '1200/628', previewH: 240, previewW: 460 },
]

export default function FlyerCreatorPro({ negocio, publicLink }) {
  const toast = useToast()

  const [selectedTemplate, setSelectedTemplate] = useState(PROFESSIONAL_TEMPLATES[0])
  const [selectedSize, setSelectedSize] = useState(SIZES[0])
  const [titulo, setTitulo] = useState(negocio?.nombre || 'Mi Negocio')
  const [subtitulo, setSubtitulo] = useState('Reservá tu turno online')
  const [cta, setCta] = useState('RESERVAR AHORA')
  const [showQR, setShowQR] = useState(true)
  const [generating, setGenerating] = useState(false)

  const generateFlyer = useCallback(async () => {
    setGenerating(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = selectedSize.w
      canvas.height = selectedSize.h
      const ctx = canvas.getContext('2d')

      // Fondo gradiente
      const gradBg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      const bgColors = selectedTemplate.bg.match(/#[0-9a-fA-F]{6}/g) || ['#0f172a', '#5B3DF5']
      bgColors.forEach((c, i) => gradBg.addColorStop(i / (bgColors.length - 1), c))
      ctx.fillStyle = gradBg
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Elementos decorativos (círculos borrosos)
      ctx.globalAlpha = 0.08
      const accentColors = selectedTemplate.accent.match(/#[0-9a-fA-F]{6}/g) || ['#5B3DF5']
      ctx.fillStyle = accentColors[0]
      ctx.beginPath()
      ctx.arc(canvas.width * 0.85, canvas.height * 0.15, canvas.width * 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(canvas.width * 0.1, canvas.height * 0.8, canvas.width * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Título principal
      ctx.fillStyle = selectedTemplate.textColor
      ctx.font = `bold ${Math.floor(canvas.width * 0.12)}px "Inter", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      
      const titleY = canvas.height * 0.15
      const words = titulo.split(' ')
      let currentY = titleY
      words.forEach((word) => {
        ctx.fillText(word, canvas.width / 2, currentY)
        currentY += canvas.width * 0.15
      })

      // Subtítulo
      ctx.fillStyle = selectedTemplate.secondaryText
      ctx.font = `600 ${Math.floor(canvas.width * 0.06)}px "Inter", sans-serif`
      ctx.fillText(subtitulo, canvas.width / 2, titleY + canvas.height * 0.35)

      // CTA Button
      const ctaY = canvas.height * 0.65
      const ctaWidth = canvas.width * 0.7
      const ctaHeight = canvas.height * 0.12
      const ctaX = (canvas.width - ctaWidth) / 2

      // Botón con gradiente
      const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX, ctaY + ctaHeight)
      const ctaColors = selectedTemplate.accent.match(/#[0-9a-fA-F]{6}/g) || ['#5B3DF5']
      ctaColors.forEach((c, i) => ctaGrad.addColorStop(i / (ctaColors.length - 1), c))
      ctx.fillStyle = ctaGrad
      ctx.beginPath()
      ctx.roundRect(ctaX, ctaY, ctaWidth, ctaHeight, canvas.width * 0.05)
      ctx.fill()

      // Texto del botón
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.floor(canvas.width * 0.07)}px "Inter", sans-serif`
      ctx.fillText(cta, canvas.width / 2, ctaY + ctaHeight / 2 - canvas.width * 0.025)

      // QR Code
      if (showQR && publicLink) {
        const qrSize = canvas.width * 0.2
        const qrX = canvas.width - qrSize - canvas.width * 0.05
        const qrY = canvas.height - qrSize - canvas.height * 0.05

        // Fondo blanco para QR
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(qrX - canvas.width * 0.02, qrY - canvas.width * 0.02, qrSize + canvas.width * 0.04, qrSize + canvas.width * 0.04, canvas.width * 0.02)
        ctx.fill()

        // Placeholder QR (en producción usar librería qrcode.js)
        ctx.fillStyle = '#000000'
        ctx.fillRect(qrX, qrY, qrSize, qrSize)
      }

      // Link en la parte inferior
      ctx.fillStyle = selectedTemplate.secondaryText
      ctx.font = `500 ${Math.floor(canvas.width * 0.04)}px "Inter", sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(publicLink?.split('/').pop() || 'reservas.com', canvas.width / 2, canvas.height * 0.95)

      // Descargar
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `flyer-${selectedSize.id}-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
        toast('¡Flyer descargado exitosamente!')
      })
    } catch (error) {
      console.error('Error generando flyer:', error)
      toast('Error al generar el flyer')
    } finally {
      setGenerating(false)
    }
  }, [selectedTemplate, selectedSize, titulo, subtitulo, cta, showQR, publicLink, toast])

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Header */}
      <div className="ns-stat-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--ns-text)' }}>
              Creador de Flyers Pro
            </h2>
            <p className="text-sm md:text-base font-medium" style={{ color: 'var(--ns-text-muted)' }}>
              Diseña flyers profesionales para promocionar tu negocio en redes sociales
            </p>
          </div>
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--ns-primary-bg)' }}>
            <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Panel de Edición */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tamaño */}
          <div className="ns-stat-card">
            <h3 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: 'var(--ns-primary)' }}>
              Tamaño
            </h3>
            <div className="space-y-2">
              {SIZES.map((size) => (
                <motion.button
                  key={size.id}
                  onClick={() => setSelectedSize(size)}
                  whileHover={{ x: 4 }}
                  className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all text-left ${
                    selectedSize.id === size.id
                      ? 'text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  style={
                    selectedSize.id === size.id
                      ? { background: 'var(--ns-primary)' }
                      : { background: 'var(--ns-surface)' }
                  }
                >
                  {size.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Plantilla */}
          <div className="ns-stat-card">
            <h3 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: 'var(--ns-primary)' }}>
              Plantilla
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {PROFESSIONAL_TEMPLATES.map((template) => (
                <motion.button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  whileHover={{ scale: 1.02 }}
                  className={`w-full p-3 rounded-xl transition-all border-2 ${
                    selectedTemplate.id === template.id
                      ? 'border-primary'
                      : 'border-transparent'
                  }`}
                  style={{
                    background: template.bg,
                    borderColor: selectedTemplate.id === template.id ? 'var(--ns-primary)' : 'transparent',
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: template.textColor }}>
                    {template.name}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Inputs de Contenido */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ns-stat-card">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: 'var(--ns-primary)' }}>
              Contenido
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--ns-text-muted)' }}>
                  Título
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength="30"
                  className="ns-input"
                  placeholder="Nombre de tu negocio"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--ns-text-muted)' }}>
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  maxLength="40"
                  className="ns-input"
                  placeholder="Descripción corta"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'var(--ns-text-muted)' }}>
                  Botón CTA
                </label>
                <input
                  type="text"
                  value={cta}
                  onChange={(e) => setCta(e.target.value.toUpperCase())}
                  maxLength="20"
                  className="ns-input"
                  placeholder="RESERVAR AHORA"
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: 'var(--ns-surface)' }}>
                <input
                  type="checkbox"
                  checked={showQR}
                  onChange={(e) => setShowQR(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-sm font-bold" style={{ color: 'var(--ns-text)' }}>
                  Mostrar código QR
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="ns-stat-card sticky top-4">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: 'var(--ns-primary)' }}>
              Vista Previa
            </h3>
            <div
              className="rounded-xl overflow-hidden mx-auto mb-4"
              style={{
                width: `${selectedSize.previewW}px`,
                height: `${selectedSize.previewH}px`,
                background: selectedTemplate.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: selectedTemplate.textColor,
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              <div className="p-4">
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>{titulo}</div>
                <div style={{ fontSize: '10px', color: selectedTemplate.secondaryText, marginBottom: '12px' }}>
                  {subtitulo}
                </div>
                <div
                  style={{
                    background: selectedTemplate.accent,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '9px',
                  }}
                >
                  {cta}
                </div>
              </div>
            </div>

            <motion.button
              onClick={generateFlyer}
              disabled={generating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="ns-btn-primary w-full"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Descargar Flyer
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
