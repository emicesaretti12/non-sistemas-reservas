import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from './Toast'

/**
 * Plantillas del flyer.
 *
 * Los colores viajan como listas de hex y no como cadenas CSS: el lienzo
 * (`canvas`) no entiende `var(--token)`, y antes se sacaban los colores del
 * string del degradado con una expresión regular. Si la plantilla traía un
 * solo color, el cálculo del stop quedaba en `0/0` y la descarga fallaba con
 * "Error al generar el flyer".
 */
const PROFESSIONAL_TEMPLATES = [
  {
    id: 'marca-solida',
    name: 'Marca sólida',
    bgColors: ['#007AFF', '#0062D6'],
    accentColors: ['#FFFFFF', '#E4EAF2'],
    textColor: '#FFFFFF',
    secondaryText: '#EACACC',
  },
  {
    id: 'degrade-profundo',
    name: 'Degradé profundo',
    bgColors: ['#1A88FF', '#007AFF', '#0050AF'],
    accentColors: ['#FFFFFF'],
    textColor: '#FFFFFF',
    secondaryText: '#D6DEE9',
  },
  {
    id: 'papel-claro',
    name: 'Papel claro',
    bgColors: ['#FFFFFF', '#E4EAF2'],
    accentColors: ['#007AFF', '#1A88FF'],
    textColor: '#007AFF',
    secondaryText: '#1A88FF',
  },
  {
    id: 'papel-tinta',
    name: 'Papel y tinta',
    bgColors: ['#F1F4F9', '#D6DEE9'],
    accentColors: ['#007AFF'],
    textColor: '#007AFF',
    secondaryText: '#0062D6',
  },
  {
    id: 'contraste',
    name: 'Alto contraste',
    bgColors: ['#007AFF'],
    accentColors: ['#FFFFFF'],
    textColor: '#FFFFFF',
    secondaryText: '#E4EAF2',
  },
  {
    id: 'humo',
    name: 'Humo',
    bgColors: ['#93C5FD', '#007AFF'],
    accentColors: ['#FFFFFF', '#E0E6EF'],
    textColor: '#FFFFFF',
    secondaryText: '#E4EAF2',
  },
]

/** Degradado CSS a partir de la lista de colores de la plantilla. */
function degradadoCss(colores) {
  const lista = colores?.length ? colores : ['#007AFF']
  return lista.length === 1
    ? lista[0]
    : `linear-gradient(135deg, ${lista.join(', ')})`
}

/** Pinta una lista de colores como degradado, tolerando un solo color. */
function degradado(ctx, colores, x0, y0, x1, y1) {
  const lista = colores?.length ? colores : ['#007AFF']
  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  if (lista.length === 1) {
    grad.addColorStop(0, lista[0])
    grad.addColorStop(1, lista[0])
  } else {
    lista.forEach((c, i) => grad.addColorStop(i / (lista.length - 1), c))
  }
  return grad
}

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
      ctx.fillStyle = degradado(ctx, selectedTemplate.bgColors, 0, 0, canvas.width, canvas.height)
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Elementos decorativos (círculos borrosos)
      ctx.globalAlpha = 0.08
      ctx.fillStyle = selectedTemplate.accentColors[0]
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
      ctx.fillStyle = degradado(ctx, selectedTemplate.accentColors, ctaX, ctaY, ctaX, ctaY + ctaHeight)
      ctx.beginPath()
      ctx.roundRect(ctaX, ctaY, ctaWidth, ctaHeight, canvas.width * 0.05)
      ctx.fill()

      // Texto del botón: contrasta contra el acento de la plantilla.
      ctx.fillStyle = selectedTemplate.accentColors[0] === '#FFFFFF' ? '#007AFF' : '#FFFFFF'
      ctx.font = `bold ${Math.floor(canvas.width * 0.07)}px "Inter", sans-serif`
      ctx.fillText(cta, canvas.width / 2, ctaY + ctaHeight / 2 - canvas.width * 0.025)

      // QR Code
      if (showQR && publicLink) {
        const qrSize = canvas.width * 0.2
        const qrX = canvas.width - qrSize - canvas.width * 0.05
        const qrY = canvas.height - qrSize - canvas.height * 0.05

        // Fondo blanco para QR
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.roundRect(qrX - canvas.width * 0.02, qrY - canvas.width * 0.02, qrSize + canvas.width * 0.04, qrSize + canvas.width * 0.04, canvas.width * 0.02)
        ctx.fill()

        // Placeholder QR (en producción usar librería qrcode.js)
        ctx.fillStyle = '#007AFF'
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
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--ns-text)' }}>
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
            <h3 className="text-sm font-bold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--ns-primary)' }}>
              Tamaño
            </h3>
            <div className="space-y-2">
              {SIZES.map((size) => (
                <motion.button
                  key={size.id}
                  onClick={() => setSelectedSize(size)}
                  whileHover={{ x: 4 }}
                  className="w-full px-4 py-3 rounded-[16px] font-bold text-sm transition-all text-left"
                  style={
                    selectedSize.id === size.id
                      ? { background: 'var(--ns-gradient-1)', color: 'var(--ns-paper)', boxShadow: 'var(--ui-brand)' }
                      : { background: 'var(--ns-surface)', color: 'var(--ns-text-secondary)', boxShadow: 'var(--ui-shadow-sm)' }
                  }
                >
                  {size.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Plantilla */}
          <div className="ns-stat-card">
            <h3 className="text-sm font-bold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--ns-primary)' }}>
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
                    background: degradadoCss(template.bgColors),
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
            <h3 className="text-sm font-bold uppercase tracking-[0.06em] mb-4" style={{ color: 'var(--ns-primary)' }}>
              Contenido
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--ns-text-muted)' }}>
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
                <label className="text-xs font-bold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--ns-text-muted)' }}>
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
                <label className="text-xs font-bold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--ns-text-muted)' }}>
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
            <h3 className="text-sm font-bold uppercase tracking-[0.06em] mb-4" style={{ color: 'var(--ns-primary)' }}>
              Vista Previa
            </h3>
            <div
              className="rounded-xl overflow-hidden mx-auto mb-4"
              style={{
                width: `${selectedSize.previewW}px`,
                height: `${selectedSize.previewH}px`,
                background: degradadoCss(selectedTemplate.bgColors),
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
                    background: degradadoCss(selectedTemplate.accentColors),
                    color: selectedTemplate.accentColors[0] === '#FFFFFF' ? '#007AFF' : '#FFFFFF',
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
