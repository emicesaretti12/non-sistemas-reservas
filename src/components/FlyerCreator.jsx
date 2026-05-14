import { useState, useRef, useCallback } from 'react'
import { useToast } from './Toast'

const TEMPLATES = [
  {
    id: 'modern-dark',
    name: 'Elegante Oscuro',
    bg: 'linear-gradient(145deg, #0c1929 0%, #1a2942 50%, #0e1f35 100%)',
    textColor: '#ffffff',
    accentColor: '#38bdf8',
    style: 'dark',
  },
  {
    id: 'sky-gradient',
    name: 'Celeste Cielo',
    bg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #7dd3fc 100%)',
    textColor: '#ffffff',
    accentColor: '#ffffff',
    style: 'light',
  },
  {
    id: 'minimal-white',
    name: 'Minimalista',
    bg: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
    textColor: '#0f172a',
    accentColor: '#0ea5e9',
    style: 'white',
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 40%, #7c3aed 100%)',
    textColor: '#ffffff',
    accentColor: '#c4b5fd',
    style: 'dark',
  },
  {
    id: 'emerald',
    name: 'Naturaleza',
    bg: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)',
    textColor: '#ffffff',
    accentColor: '#a7f3d0',
    style: 'dark',
  },
  {
    id: 'rose',
    name: 'Rosé',
    bg: 'linear-gradient(135deg, #4c0519 0%, #be123c 50%, #fb7185 100%)',
    textColor: '#ffffff',
    accentColor: '#fecdd3',
    style: 'dark',
  },
]

const SIZES = [
  { id: 'story', label: 'Story', w: 1080, h: 1920, aspect: '9/16', previewH: 520, previewW: 292 },
  { id: 'post', label: 'Post', w: 1080, h: 1080, aspect: '1/1', previewH: 380, previewW: 380 },
  { id: 'landscape', label: 'Portada', w: 1200, h: 628, aspect: '1200/628', previewH: 280, previewW: 534 },
]

export default function FlyerCreator({ negocio, publicLink }) {
  const toast = useToast()
  const canvasRef = useRef(null)

  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])
  const [selectedSize, setSelectedSize] = useState(SIZES[0])
  const [titulo, setTitulo] = useState(negocio?.nombre || 'Mi Negocio')
  const [subtitulo, setSubtitulo] = useState('Reservá tu turno online')
  const [promo, setPromo] = useState('')
  const [showQR, setShowQR] = useState(true)
  const [showLink, setShowLink] = useState(true)
  const [generating, setGenerating] = useState(false)

  const shortLink = publicLink?.replace(window.location.origin, '') || '/app/mi-negocio'

  // ─── Generate the flyer as a canvas and download ───
  const generateFlyer = useCallback(async () => {
    setGenerating(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = selectedSize.w
      canvas.height = selectedSize.h
      const ctx = canvas.getContext('2d')

      // Background gradient
      const colors = selectedTemplate.bg.match(/#[0-9a-fA-F]{6}/g) || ['#0c1929', '#1a2942']
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Decorative circles
      ctx.globalAlpha = 0.06
      ctx.fillStyle = selectedTemplate.accentColor
      ctx.beginPath()
      ctx.arc(canvas.width * 0.85, canvas.height * 0.15, canvas.width * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(canvas.width * 0.1, canvas.height * 0.85, canvas.width * 0.25, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      const textColor = selectedTemplate.textColor
      const accentColor = selectedTemplate.accentColor
      const isStory = selectedSize.id === 'story'
      const isPost = selectedSize.id === 'post'
      const scale = canvas.width / 1080

      // ─── Logo badge ───
      const badgeSize = isStory ? 90 * scale : 70 * scale
      const badgeX = canvas.width / 2 - badgeSize / 2
      const badgeY = isStory ? 200 * scale : 100 * scale

      // Badge background
      ctx.fillStyle = accentColor
      ctx.globalAlpha = 0.15
      roundRect(ctx, badgeX - 10, badgeY - 10, badgeSize + 20, badgeSize + 20, 24 * scale)
      ctx.fill()
      ctx.globalAlpha = 1

      if (negocio?.logo_url) {
        try {
          const img = await loadImage(negocio.logo_url)
          ctx.save()
          roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 18 * scale)
          ctx.clip()
          ctx.drawImage(img, badgeX, badgeY, badgeSize, badgeSize)
          ctx.restore()
        } catch {
          drawTextBadge(ctx, badgeX, badgeY, badgeSize, scale, accentColor, textColor, titulo)
        }
      } else {
        drawTextBadge(ctx, badgeX, badgeY, badgeSize, scale, accentColor, textColor, titulo)
      }

      // ─── Title ───
      const titleY = badgeY + badgeSize + (isStory ? 80 : 60) * scale
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.font = `900 ${(isStory ? 72 : 58) * scale}px Inter, system-ui, sans-serif`
      wrapText(ctx, titulo.toUpperCase(), canvas.width / 2, titleY, canvas.width * 0.8, (isStory ? 80 : 68) * scale)

      // ─── Subtitle ───
      const lines = getWrappedLines(ctx, titulo.toUpperCase(), canvas.width * 0.8, `900 ${(isStory ? 72 : 58) * scale}px Inter`)
      const subY = titleY + lines.length * (isStory ? 80 : 68) * scale + 20 * scale
      ctx.fillStyle = accentColor
      ctx.font = `600 ${(isStory ? 36 : 30) * scale}px Inter, system-ui, sans-serif`
      ctx.fillText(subtitulo, canvas.width / 2, subY)

      // ─── Promo badge ───
      if (promo) {
        const promoY = subY + (isStory ? 80 : 60) * scale
        const promoW = ctx.measureText(promo).width + 60 * scale
        ctx.fillStyle = accentColor
        ctx.globalAlpha = 0.2
        roundRect(ctx, canvas.width / 2 - promoW / 2, promoY - 28 * scale, promoW, 56 * scale, 28 * scale)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.fillStyle = accentColor
        ctx.font = `800 ${28 * scale}px Inter, system-ui, sans-serif`
        ctx.fillText(promo, canvas.width / 2, promoY + 8 * scale)
      }

      // ─── Bottom section: Link ───
      if (showLink) {
        const linkY = canvas.height - (isStory ? 260 : isPost ? 200 : 140) * scale
        // Link pill
        const linkText = publicLink || 'tu-link-de-reservas.com'
        const shortDisplay = linkText.replace('https://', '').replace('http://', '')
        ctx.font = `700 ${(isStory ? 26 : 22) * scale}px Inter, system-ui, sans-serif`
        const linkW = ctx.measureText(shortDisplay).width + 50 * scale

        ctx.fillStyle = textColor
        ctx.globalAlpha = 0.1
        roundRect(ctx, canvas.width / 2 - linkW / 2, linkY - 22 * scale, linkW, 48 * scale, 24 * scale)
        ctx.fill()
        ctx.globalAlpha = 1

        ctx.fillStyle = accentColor
        ctx.font = `700 ${(isStory ? 24 : 20) * scale}px Inter, system-ui, sans-serif`
        ctx.fillText(shortDisplay, canvas.width / 2, linkY + 4 * scale)

        // CTA label
        const ctaY = linkY - 40 * scale
        ctx.fillStyle = textColor
        ctx.globalAlpha = 0.5
        ctx.font = `700 ${18 * scale}px Inter, system-ui, sans-serif`
        ctx.fillText('RESERVÁ ONLINE ↓', canvas.width / 2, ctaY)
        ctx.globalAlpha = 1
      }

      // ─── Footer branding ───
      const footY = canvas.height - 50 * scale
      ctx.fillStyle = textColor
      ctx.globalAlpha = 0.3
      ctx.font = `700 ${14 * scale}px Inter, system-ui, sans-serif`
      ctx.fillText('Powered by Non Sistemas', canvas.width / 2, footY)
      ctx.globalAlpha = 1

      // ─── Download ───
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `flyer-${negocio?.nombre?.replace(/\s+/g, '-').toLowerCase() || 'negocio'}-${selectedSize.id}.png`
      a.click()

      toast.success('¡Flyer descargado! Subilo a tus redes 🚀')
    } catch (err) {
      console.error('Error generating flyer:', err)
      toast.error('Error al generar el flyer')
    } finally {
      setGenerating(false)
    }
  }, [selectedTemplate, selectedSize, titulo, subtitulo, promo, showQR, showLink, negocio, publicLink])

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">Crear Flyer</h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Diseñá un flyer para tus redes con tu link de reservas</p>
        </div>
        <button
          onClick={generateFlyer}
          disabled={generating}
          className="px-5 py-3 bg-sky-500 hover:bg-sky-400 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Descargar Flyer
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ─── Left: Controls ─── */}
        <div className="space-y-4">
          {/* Size selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Formato</p>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s)}
                  className={`py-2.5 px-3 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                    selectedSize.id === s.id
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {s.label}
                  <span className="block text-[9px] opacity-60 mt-0.5">{s.w}×{s.h}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Template selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Estilo</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`group relative aspect-square rounded-xl overflow-hidden transition-all active:scale-90 ${
                    selectedTemplate.id === t.id ? 'ring-2 ring-sky-500 ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ background: t.bg }}
                  title={t.name}
                >
                  {selectedTemplate.id === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Text inputs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contenido</p>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Título</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-sky-400 focus:bg-white outline-none transition-all"
                placeholder="Nombre del negocio"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Subtítulo</label>
              <input
                type="text"
                value={subtitulo}
                onChange={e => setSubtitulo(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-sky-400 focus:bg-white outline-none transition-all"
                placeholder="Reservá tu turno online"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Promoción <span className="text-slate-300">(opcional)</span></label>
              <input
                type="text"
                value={promo}
                onChange={e => setPromo(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:border-sky-400 focus:bg-white outline-none transition-all"
                placeholder="Ej: 20% OFF primera visita"
              />
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Opciones</p>
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs font-semibold text-slate-700">Mostrar link de reservas</span>
              <div
                onClick={() => setShowLink(!showLink)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${showLink ? 'bg-sky-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showLink ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
            </label>
          </div>
        </div>

        {/* ─── Right: Preview ─── */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest self-start">Vista previa</p>
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 relative transition-all duration-500"
            style={{
              width: Math.min(selectedSize.previewW, 360),
              height: Math.min(selectedSize.previewH, 560),
              background: selectedTemplate.bg,
            }}
          >
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 rounded-full opacity-[0.06]"
              style={{ background: selectedTemplate.accentColor, filter: 'blur(40px)', transform: 'translate(30%, -30%)' }}
            />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/3 rounded-full opacity-[0.06]"
              style={{ background: selectedTemplate.accentColor, filter: 'blur(30px)', transform: 'translate(-20%, 20%)' }}
            />

            {/* Preview content */}
            <div className="relative h-full flex flex-col items-center justify-center px-5 text-center">
              {/* Logo */}
              {negocio?.logo_url ? (
                <img src={negocio.logo_url} className="w-12 h-12 rounded-xl object-cover mb-4 shadow-lg" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg"
                  style={{ background: selectedTemplate.accentColor + '25' }}
                >
                  <span className="font-black text-base" style={{ color: selectedTemplate.accentColor }}>
                    {titulo?.[0] || 'N'}
                  </span>
                </div>
              )}

              {/* Title */}
              <h2 className="font-black text-base sm:text-lg leading-tight tracking-tight"
                style={{ color: selectedTemplate.textColor }}
              >
                {titulo || 'Tu Negocio'}
              </h2>

              {/* Subtitle */}
              <p className="text-[11px] font-semibold mt-1.5 opacity-80"
                style={{ color: selectedTemplate.accentColor }}
              >
                {subtitulo}
              </p>

              {/* Promo */}
              {promo && (
                <div className="mt-3 px-3 py-1.5 rounded-full text-[10px] font-bold"
                  style={{ background: selectedTemplate.accentColor + '20', color: selectedTemplate.accentColor }}
                >
                  {promo}
                </div>
              )}

              {/* Link */}
              {showLink && (
                <div className="mt-auto mb-6 space-y-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-widest opacity-40"
                    style={{ color: selectedTemplate.textColor }}
                  >
                    Reservá online ↓
                  </p>
                  <div className="px-3 py-1.5 rounded-lg text-[9px] font-bold"
                    style={{ background: selectedTemplate.textColor + '10', color: selectedTemplate.accentColor }}
                  >
                    {shortLink}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-[7px] font-bold uppercase tracking-widest opacity-20"
                style={{ color: selectedTemplate.textColor }}
              >
                Non Sistemas
              </span>
            </div>
          </div>

          {/* Copy link button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(publicLink || '').catch(() => {})
              toast.success('¡Link copiado al portapapeles!')
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[11px] font-bold text-slate-600 transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar link de reservas
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Canvas helpers ───
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawTextBadge(ctx, x, y, size, scale, accent, textColor, name) {
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.2
  roundRect(ctx, x, y, size, size, 18 * scale)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = textColor
  ctx.font = `900 ${size * 0.5}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText((name || 'N')[0].toUpperCase(), x + size / 2, y + size * 0.65)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let offsetY = 0
  for (const word of words) {
    const testLine = line + word + ' '
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, y + offsetY)
      line = word + ' '
      offsetY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, y + offsetY)
}

function getWrappedLines(ctx, text, maxWidth, font) {
  ctx.font = font
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const testLine = line + word + ' '
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      lines.push(line.trim())
      line = word + ' '
    } else {
      line = testLine
    }
  }
  lines.push(line.trim())
  return lines
}
