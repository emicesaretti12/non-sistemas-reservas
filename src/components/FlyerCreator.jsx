import { useState, useCallback } from 'react'
import { useToast } from './Toast'

const TEMPLATES = [
  {
    id: 'brand-dark',
    name: 'Marca Oscura',
    bg: 'linear-gradient(145deg, #1A1630 0%, #2D1F6E 50%, #1A1630 100%)',
    textColor: '#ffffff',
    accentColor: '#A78BFA',
    style: 'dark',
  },
  {
    id: 'brand-violet',
    name: 'Violeta Marca',
    bg: 'linear-gradient(135deg, #5B3DF5 0%, #7C5CF8 50%, #9B7EFF 100%)',
    textColor: '#ffffff',
    accentColor: '#E8DEFF',
    style: 'dark',
  },
  {
    id: 'brand-soft',
    name: 'Suave Marca',
    bg: 'linear-gradient(180deg, #F0EBFF 0%, #E8DEFF 100%)',
    textColor: '#1A1630',
    accentColor: '#5B3DF5',
    style: 'white',
  },
  {
    id: 'brand-gradient',
    name: 'Gradiente',
    bg: 'linear-gradient(135deg, #1A1630 0%, #5B3DF5 60%, #8B7CF6 100%)',
    textColor: '#ffffff',
    accentColor: '#E8DEFF',
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
  { id: 'story', label: 'Story', w: 1080, h: 1920, aspect: '9/16', previewH: 480, previewW: 270 },
  { id: 'post', label: 'Post', w: 1080, h: 1080, aspect: '1/1', previewH: 340, previewW: 340 },
  { id: 'landscape', label: 'Portada', w: 1200, h: 628, aspect: '1200/628', previewH: 240, previewW: 460 },
]

export default function FlyerCreator({ negocio, publicLink }) {
  const toast = useToast()

  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])
  const [selectedSize, setSelectedSize] = useState(SIZES[0])
  const [titulo, setTitulo] = useState(negocio?.nombre || 'Mi Negocio')
  const [subtitulo, setSubtitulo] = useState('Reservá tu turno online')
  const [promo, setPromo] = useState('')
  const [showLink, setShowLink] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const shortLink = publicLink?.replace(window.location.origin, '') || '/reservas/mi-negocio'

  const generateFlyer = useCallback(async () => {
    setGenerating(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = selectedSize.w
      canvas.height = selectedSize.h
      const ctx = canvas.getContext('2d')

      const colors = selectedTemplate.bg.match(/#[0-9a-fA-F]{6}/g) || ['#1A1630', '#5B3DF5']
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.globalAlpha = 0.08
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
      const scale = canvas.width / 1080

      const badgeSize = isStory ? 90 * scale : 70 * scale
      const badgeX = canvas.width / 2 - badgeSize / 2
      const badgeY = isStory ? 200 * scale : 100 * scale

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

      const titleY = badgeY + badgeSize + (isStory ? 80 : 60) * scale
      ctx.fillStyle = textColor
      ctx.textAlign = 'center'
      ctx.font = `900 ${(isStory ? 72 : 58) * scale}px Inter, system-ui, sans-serif`
      wrapText(ctx, titulo.toUpperCase(), canvas.width / 2, titleY, canvas.width * 0.8, (isStory ? 80 : 68) * scale)

      const lines = getWrappedLines(ctx, titulo.toUpperCase(), canvas.width * 0.8, `900 ${(isStory ? 72 : 58) * scale}px Inter`)
      const subY = titleY + lines.length * (isStory ? 80 : 68) * scale + 20 * scale
      ctx.fillStyle = accentColor
      ctx.font = `600 ${(isStory ? 36 : 30) * scale}px Inter, system-ui, sans-serif`
      ctx.fillText(subtitulo, canvas.width / 2, subY)

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

      if (showLink) {
        const linkY = canvas.height - (isStory ? 260 : 200) * scale
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

        const ctaY = linkY - 40 * scale
        ctx.fillStyle = textColor
        ctx.globalAlpha = 0.5
        ctx.font = `700 ${18 * scale}px Inter, system-ui, sans-serif`
        ctx.fillText('RESERVÁ ONLINE ↓', canvas.width / 2, ctaY)
        ctx.globalAlpha = 1
      }

      const footY = canvas.height - 50 * scale
      ctx.fillStyle = textColor
      ctx.globalAlpha = 0.3
      ctx.font = `700 ${14 * scale}px Inter, system-ui, sans-serif`
      ctx.fillText('Powered by Non Sistemas', canvas.width / 2, footY)
      ctx.globalAlpha = 1

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
  }, [selectedTemplate, selectedSize, titulo, subtitulo, promo, showLink, negocio, publicLink])

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink || '').catch(() => {})
    setCopied(true)
    toast.success('¡Link copiado al portapapeles!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4 ns-tab-content-enter pb-6">

      {/* ── HEADER BENTO PLASTILINA ── */}
      <header className="ns-section-header">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--ns-gradient-1)', boxShadow: 'var(--ns-plastilina-btn)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--ns-primary)' }}>Marketing</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-none" style={{ color: 'var(--ns-text)' }}>Crear Flyer</h2>
            <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--ns-text-muted)' }}>Diseñá un flyer para tus redes con tu link de reservas</p>
          </div>

          {/* Botón Descargar */}
          <button
            onClick={generateFlyer}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 relative overflow-hidden"
            style={{ background: 'var(--ns-primary)', boxShadow: 'var(--ns-plastilina-btn)' }}
          >
            <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 100%)' }} />
            {generating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="hidden sm:inline">Descargar</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── PANEL IZQUIERDO: Controles ── */}
        <div className="space-y-3">

          {/* Formato */}
          <div className="rounded-2xl p-4 ns-stagger-in ns-delay-1" style={{ background: 'white', border: '1px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-sm)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--ns-text-muted)' }}>Formato</p>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s)}
                  className="py-3 px-2 rounded-xl text-[10px] font-black transition-all active:scale-95 relative overflow-hidden"
                  style={{
                    background: selectedSize.id === s.id ? 'var(--ns-primary)' : 'var(--ns-accent-bg)',
                    color: selectedSize.id === s.id ? 'white' : 'var(--ns-text-secondary)',
                    border: selectedSize.id === s.id ? 'none' : '1px solid var(--ns-border)',
                    boxShadow: selectedSize.id === s.id ? 'var(--ns-plastilina-btn)' : 'var(--ns-shadow-sm)',
                  }}
                >
                  {selectedSize.id === s.id && (
                    <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-xl pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 100%)' }} />
                  )}
                  {s.label}
                  <span className="block text-[8px] opacity-60 mt-0.5">{s.w}×{s.h}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estilo / Template */}
          <div className="rounded-2xl p-4 ns-stagger-in ns-delay-2" style={{ background: 'white', border: '1px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-sm)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--ns-text-muted)' }}>Estilo</p>
            <div className="grid grid-cols-6 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className="relative aspect-square rounded-xl overflow-hidden transition-all active:scale-90"
                  style={{
                    background: t.bg,
                    boxShadow: selectedTemplate.id === t.id
                      ? '0 0 0 3px var(--ns-primary), 0 4px 12px rgba(91,61,245,0.3)'
                      : 'var(--ns-shadow-sm)',
                    transform: selectedTemplate.id === t.id ? 'scale(1.05)' : 'scale(1)',
                  }}
                  title={t.name}
                >
                  {selectedTemplate.id === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[9px] font-semibold mt-2" style={{ color: 'var(--ns-primary)' }}>{selectedTemplate.name}</p>
          </div>

          {/* Contenido */}
          <div className="rounded-2xl p-4 space-y-3 ns-stagger-in ns-delay-3" style={{ background: 'white', border: '1px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-sm)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--ns-text-muted)' }}>Contenido</p>

            {[
              { label: 'Título', value: titulo, setter: setTitulo, placeholder: 'Nombre del negocio' },
              { label: 'Subtítulo', value: subtitulo, setter: setSubtitulo, placeholder: 'Reservá tu turno online' },
              { label: 'Promoción', value: promo, setter: setPromo, placeholder: 'Ej: 20% OFF primera visita', optional: true },
            ].map(field => (
              <div key={field.label}>
                <label className="text-[9px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--ns-text-muted)' }}>
                  {field.label} {field.optional && <span style={{ color: 'var(--ns-border)' }}>(opcional)</span>}
                </label>
                <input
                  type="text"
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-sm font-semibold outline-none transition-all"
                  style={{ background: 'var(--ns-accent-bg)', border: '1.5px solid var(--ns-border)', color: 'var(--ns-text)', boxShadow: 'var(--ns-shadow-inner)' }}
                  placeholder={field.placeholder}
                  onFocus={e => { e.target.style.borderColor = 'var(--ns-primary)'; e.target.style.boxShadow = '0 0 0 4px rgba(91,61,245,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--ns-border)'; e.target.style.boxShadow = 'var(--ns-shadow-inner)'; }}
                />
              </div>
            ))}
          </div>

          {/* Opciones */}
          <div className="rounded-2xl p-4 ns-stagger-in ns-delay-4" style={{ background: 'white', border: '1px solid var(--ns-border)', boxShadow: 'var(--ns-shadow-sm)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--ns-text-muted)' }}>Opciones</p>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[12px] font-semibold" style={{ color: 'var(--ns-text)' }}>Mostrar link de reservas</span>
              <button
                onClick={() => setShowLink(!showLink)}
                className="relative transition-all duration-300 active:scale-90"
                style={{
                  width: '48px', height: '26px', borderRadius: '999px',
                  background: showLink ? 'var(--ns-primary)' : 'var(--ns-border)',
                  boxShadow: showLink ? 'var(--ns-plastilina-btn)' : 'var(--ns-shadow-inner)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <div className="absolute top-[3px] bg-white rounded-full transition-all duration-300"
                  style={{ width: '20px', height: '20px', left: showLink ? '25px' : '3px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
              </button>
            </label>
          </div>
        </div>

        {/* ── PANEL DERECHO: Preview ── */}
        <div className="flex flex-col items-center gap-4 ns-stagger-in ns-delay-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] self-start" style={{ color: 'var(--ns-text-muted)' }}>Vista previa</p>

          {/* Preview Card — Plastilina */}
          <div
            className="rounded-3xl overflow-hidden relative transition-all duration-500 w-full max-w-[340px]"
            style={{
              background: selectedTemplate.bg,
              boxShadow: '0 20px 60px rgba(91,61,245,0.2), 0 8px 24px rgba(0,0,0,0.12)',
              aspectRatio: selectedSize.id === 'story' ? '9/16' : selectedSize.id === 'post' ? '1/1' : '1200/628',
              maxHeight: selectedSize.id === 'story' ? '500px' : selectedSize.id === 'post' ? '340px' : '240px',
            }}
          >
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 rounded-full pointer-events-none"
              style={{ background: selectedTemplate.accentColor, opacity: 0.06, filter: 'blur(40px)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/3 rounded-full pointer-events-none"
              style={{ background: selectedTemplate.accentColor, opacity: 0.06, filter: 'blur(30px)', transform: 'translate(-20%, 20%)' }} />

            {/* Shine overlay */}
            <div className="absolute top-0 left-0 right-0 h-1/3 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)' }} />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center px-6 text-center gap-3">
              {/* Logo / Avatar */}
              {negocio?.logo_url ? (
                <img src={negocio.logo_url} className="w-12 h-12 rounded-2xl object-cover shadow-lg" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: selectedTemplate.accentColor + '25', border: `1px solid ${selectedTemplate.accentColor}30` }}>
                  <span className="font-black text-lg" style={{ color: selectedTemplate.accentColor }}>
                    {titulo?.[0] || 'N'}
                  </span>
                </div>
              )}

              {/* Title */}
              <h2 className="font-black text-base sm:text-lg leading-tight tracking-tight"
                style={{ color: selectedTemplate.textColor }}>
                {titulo || 'Tu Negocio'}
              </h2>

              {/* Subtitle */}
              <p className="text-[11px] font-semibold opacity-80"
                style={{ color: selectedTemplate.accentColor }}>
                {subtitulo}
              </p>

              {/* Promo */}
              {promo && (
                <div className="px-3 py-1.5 rounded-full text-[10px] font-bold"
                  style={{ background: selectedTemplate.accentColor + '20', color: selectedTemplate.accentColor }}>
                  {promo}
                </div>
              )}

              {/* Link */}
              {showLink && (
                <div className="mt-auto mb-4 space-y-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-widest opacity-40"
                    style={{ color: selectedTemplate.textColor }}>
                    Reservá online ↓
                  </p>
                  <div className="px-3 py-1.5 rounded-xl text-[9px] font-bold"
                    style={{ background: selectedTemplate.textColor + '10', color: selectedTemplate.accentColor }}>
                    {shortLink}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-[7px] font-bold uppercase tracking-widest opacity-20"
                style={{ color: selectedTemplate.textColor }}>
                Non Sistemas
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 w-full max-w-[340px]">
            <button
              onClick={generateFlyer}
              disabled={generating}
              className="w-full py-3.5 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 relative overflow-hidden"
              style={{ background: 'var(--ns-primary)', boxShadow: 'var(--ns-plastilina-btn)' }}
            >
              <span className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.15) 0%,transparent 100%)' }} />
              {generating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Descargar Flyer
                </>
              )}
            </button>

            <button
              onClick={copyLink}
              className="w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                background: copied ? 'rgba(16,185,129,0.1)' : 'var(--ns-accent-bg)',
                color: copied ? '#059669' : 'var(--ns-text-secondary)',
                border: '1px solid var(--ns-border)',
                boxShadow: 'var(--ns-shadow-sm)',
              }}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ¡Copiado!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copiar link de reservas
                </>
              )}
            </button>
          </div>
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
