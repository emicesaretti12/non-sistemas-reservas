/**
 * SmartInsights — analiza datos del negocio y muestra 3 sugerencias accionables.
 * Sin AI: sólo lógica determinística sobre los datos reales.
 */
export default function SmartInsights({ stats, crmStats, clientes, actividadReciente, distribucionSemanal, proximaCita, onNavigate, publicLink, vocab }) {
  const insights = []

  // INSIGHT 1: Stock crítico
  if (crmStats?.stockBajo > 0) {
    insights.push({
      severity: 'high',
      icon: 'alert',
      titulo: `${crmStats.stockBajo} ${crmStats.stockBajo === 1 ? 'producto' : 'productos'} en nivel bajo`,
      texto: 'Reponé antes de quedarte sin stock en horas pico.',
      cta: 'Ver inventario',
      action: () => onNavigate?.('inventario'),
    })
  }

  // INSIGHT 2: Próxima cita en breve
  if (proximaCita) {
    const ahora = new Date()
    const cita = new Date(proximaCita.fecha_hora)
    const diffMin = Math.round((cita - ahora) / 60000)
    if (diffMin > 0 && diffMin <= 90 && !proximaCita.recordatorio_enviado) {
      insights.push({
        severity: 'medium',
        icon: 'clock',
        titulo: `${proximaCita.cliente_nombre} llega en ${diffMin < 60 ? diffMin + ' min' : Math.floor(diffMin / 60) + 'h ' + (diffMin % 60) + 'm'}`,
        texto: `${proximaCita.servicios?.nombre || vocab?.servicio || 'Servicio'} · enviá el recordatorio.`,
        cta: 'Ir a agenda',
        action: () => onNavigate?.('agenda'),
      })
    }
  }

  // INSIGHT 3: Día más fuerte
  if (distribucionSemanal && distribucionSemanal.length === 7) {
    const max = Math.max(...distribucionSemanal)
    if (max > 0) {
      const idx = distribucionSemanal.indexOf(max)
      const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      insights.push({
        severity: 'info',
        icon: 'trend',
        titulo: `${dias[idx]} es tu día más fuerte`,
        texto: `${max} ${(vocab?.turnos || 'turnos')} en promedio. Cargá empleados de refuerzo.`,
        cta: 'Ver equipo',
        action: () => onNavigate?.('equipo'),
      })
    }
  }

  // INSIGHT 4: Pocos clientes — incentivar share del link público
  if ((clientes?.length || 0) < 5) {
    insights.push({
      severity: 'info',
      icon: 'share',
      titulo: 'Compartí tu link público',
      texto: 'Tu agenda online recibe reservas 24/7. Empezá a moverla en WhatsApp e Instagram.',
      cta: 'Copiar link',
      action: () => {
        if (publicLink) navigator.clipboard.writeText(publicLink).catch(() => {})
      },
    })
  }

  // INSIGHT 5: Ocupación baja
  if (stats?.tasaOcupacion !== undefined && stats.tasaOcupacion < 30 && (clientes?.length || 0) >= 3) {
    insights.push({
      severity: 'medium',
      icon: 'spark',
      titulo: `Tu ocupación está al ${stats.tasaOcupacion}%`,
      texto: 'Lanzá una promo flash o ajustá horarios para mover semana.',
      cta: 'Ver horarios',
      action: () => onNavigate?.('horarios'),
    })
  }

  // INSIGHT 6: Sin servicios cargados
  if (crmStats?.totalServicios === 0) {
    insights.unshift({
      severity: 'high',
      icon: 'spark',
      titulo: 'Cargá tu primer servicio',
      texto: 'Sin servicios tus clientes no pueden reservar online.',
      cta: 'Crear servicio',
      action: () => onNavigate?.('servicios'),
    })
  }

  if (insights.length === 0) {
    insights.push({
      severity: 'success',
      icon: 'check',
      titulo: 'Todo bajo control.',
      texto: 'Sin alertas urgentes. Tu operación está en verde.',
      cta: null,
      action: null,
    })
  }

  const top = insights.slice(0, 3)

  const iconMap = {
    alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    trend: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    share: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
    spark: 'M13 10V3L4 14h7v7l9-11h-7z',
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  }

  const severityClasses = {
    high: { bar: 'bg-[#FF4F00]', icon: 'text-[#FF4F00] bg-[#FFF1EA] border-[#FF4F00]/20', dot: 'bg-[#FF4F00]' },
    medium: { bar: 'bg-amber-500', icon: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
    info: { bar: 'bg-stone-400', icon: 'text-stone-700 bg-stone-100 border-stone-300', dot: 'bg-stone-400' },
    success: { bar: 'bg-emerald-500', icon: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  }

  return (
    <div className="bg-white rounded-xl border border-stone-300/70 shadow-sm overflow-hidden" data-testid="smart-insights">
      <div className="px-5 py-4 border-b border-stone-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#1A1814] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#FF4F00]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#1A1814] tracking-tight leading-none">Smart Insights</h3>
            <p className="text-[9px] font-medium text-stone-500 uppercase tracking-[0.22em] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {top.length} {top.length === 1 ? 'recomendación' : 'recomendaciones'}
            </p>
          </div>
        </div>
        <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-stone-400" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          Auto · Tiempo real
        </span>
      </div>

      <div className="divide-y divide-stone-200/70">
        {top.map((insight, idx) => {
          const cls = severityClasses[insight.severity] || severityClasses.info
          return (
            <div key={idx} className="px-5 py-4 flex items-start gap-3.5 group hover:bg-stone-50/50 transition-colors" data-testid={`insight-${idx}`}>
              <div className={`w-9 h-9 rounded-md border flex items-center justify-center shrink-0 ${cls.icon}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconMap[insight.icon] || iconMap.check} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#1A1814] tracking-tight leading-snug">{insight.titulo}</p>
                <p className="text-[12px] text-stone-600 mt-0.5 leading-snug">{insight.texto}</p>
              </div>
              {insight.cta && insight.action && (
                <button
                  onClick={insight.action}
                  data-testid={`insight-action-${idx}`}
                  className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1A1814] hover:text-[#FF4F00] transition-colors py-1.5 px-3 border border-stone-300 rounded-md hover:border-[#FF4F00] hover:bg-[#FFF1EA]"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {insight.cta}
                  <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
