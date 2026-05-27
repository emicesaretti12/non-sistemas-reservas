/**
 * Sparkline — micro SVG line chart with optional area fill
 * Usage: <Sparkline data={[12, 18, 9, 22, 30, 15, 28]} color="#FF4F00" />
 */
export default function Sparkline({ data = [], color = '#0EA5E9', height = 28, fill = true, strokeWidth = 1.5 }) {
  if (!data || data.length < 2) {
    return (
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full" style={{ height }}>
        <line x1="0" y1="20" x2="100" y2="20" stroke="#E7E5E4" strokeWidth="1" strokeDasharray="2 3" />
      </svg>
    )
  }

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 100
  const h = 30
  const pad = 2

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - pad * 2) + pad
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return [x, y]
  })

  const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ')
  const areaPath = `${path} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`

  const last = points[points.length - 1]
  const lastVal = data[data.length - 1]
  const firstVal = data[0]
  const delta = lastVal - firstVal
  const isUp = delta >= 0

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }} data-testid="sparkline">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {last && (
        <circle cx={last[0]} cy={last[1]} r="1.6" fill={color} stroke={isUp ? '#fff' : '#fff'} strokeWidth="0.8" />
      )}
    </svg>
  )
}
