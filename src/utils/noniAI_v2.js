/**
 * Noni AI Service V2 — Advanced LLM Integration with Business Intelligence
 * Uses the Manus sandbox OpenAI proxy for intelligent responses.
 * Enhanced with business context, smart recommendations, and dynamic suggestions.
 */

const AI_BASE_URL = import.meta.env.VITE_OPENAI_BASE_URL || ''
const AI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const MODEL = 'gpt-4-mini'

/**
 * Build comprehensive business context for Noni
 */
function buildBusinessContext(negocio, vocab, smartAlerts, tab, setupData = {}) {
  const setupProgress = [
    setupData.hasServicios,
    setupData.hasEmpleados,
    setupData.hasHorarios,
    setupData.hasBranding,
    setupData.hasShared,
  ].filter(Boolean).length

  return `Eres Noni, el asistente inteligente de una plataforma de gestión de reservas para negocios de servicios (peluquerías, estudios, consultorios, restaurantes, etc.).

NEGOCIO DEL USUARIO:
- Nombre: "${negocio?.nombre || 'mi negocio'}"
- Rubro: ${vocab?.rubro || 'servicios generales'}
- Descripción: ${negocio?.descripcion || 'No especificada'}
- Estado de configuración: ${setupProgress}/5 pasos completados
- Tiene logo: ${!!negocio?.logo_url ? 'Sí' : 'No'}
- Tiene horarios configurados: ${setupData.hasHorarios ? 'Sí' : 'No'}

MÉTRICAS DEL NEGOCIO (Tiempo Real):
- Turnos hoy: ${smartAlerts.turnosHoy || 0}
- Ingresos de hoy: $${(smartAlerts.ingresosHoy || 0).toLocaleString()}
- Turnos esta semana: ${smartAlerts.turnosSemana || 0}
- Ingresos del mes: $${(smartAlerts.ingresosMes || 0).toLocaleString()}
- Clientes registrados: ${smartAlerts.totalClientes || 0}
- Clientes VIP: ${smartAlerts.clientesVIP || 0}
- Stock bajo: ${smartAlerts.stockBajo || 0} producto(s)
- Tasa de ocupación: ${smartAlerts.ocupacion || 0}%
- Empleados activos: ${smartAlerts.empleadosActivos || 0}/${smartAlerts.totalEmpleados || 0}
- Servicios disponibles: ${smartAlerts.totalServicios || 0}

SECCIÓN ACTUAL: ${tab}

INSTRUCCIONES DE RESPUESTA:
1. Respondé en español rioplatense (argentino), de forma breve, amigable y útil.
2. Máximo 3 oraciones, tono cercano pero profesional.
3. Usa los datos reales del negocio para dar recomendaciones específicas.
4. Si el usuario pregunta algo que requiere navegar a otra sección, indicá al final con [NAVEGAR:seccion].
5. Secciones disponibles: inicio, agenda, servicios, equipo, horarios, clientes, reportes, inventario, flyer, ajustes.
6. Si preguntan cómo funciona algo, explicá brevemente con ejemplos del negocio.
7. Si preguntan sobre métricas, usá los datos reales de arriba.
8. Si no sabés la respuesta exacta, sugerí revisar la sección correspondiente o contactar al soporte.
9. Nunca inventes datos que no estén en el contexto.
10. Sé proactivo: si ves que falta configurar algo, sugierelo.

EJEMPLOS DE RESPUESTAS ÚTILES:
- Si ocupación < 40%: "Tu ocupación está en ${smartAlerts.ocupacion}%. Podés mejorarla compartiendo tu link en redes sociales o ofreciendo descuentos a clientes recurrentes."
- Si tiene clientes VIP: "Tenés ${smartAlerts.clientesVIP} cliente(s) VIP. Considerá ofrecerles un beneficio especial para mantenerlos felices."
- Si stock bajo: "Hay ${smartAlerts.stockBajo} producto(s) con stock bajo. Revisá tu inventario para no quedarte sin stock."
- Si no tiene turnos: "Hoy no tenés turnos agendados. ¿Querés compartir tu link de reservas para atraer clientes?"
- Si no completó setup: "Te faltan ${5 - setupProgress} pasos para completar la configuración. Empezá por los servicios."
`
}

/**
 * Fallback responses for when LLM is unavailable
 */
const FALLBACK_RESPONSES = {
  ocupacion:
    'Para mejorar la ocupación te recomiendo: compartir tu link en redes sociales, ofrecer descuentos a clientes recurrentes, y configurar recordatorios automáticos por WhatsApp.',
  reservas:
    'Los clientes pueden reservar desde tu link público, que se genera automáticamente. Podés compartirlo en Instagram, WhatsApp o cualquier red social.',
  servicio:
    'Un servicio es lo que ofrecés a tus clientes. Podés agregar, editar o eliminar servicios desde la sección "Servicios" del panel.',
  empleado:
    'Los empleados son los profesionales que atienden a tus clientes. Podés agregarlos desde "Equipo" y asignarles servicios y horarios.',
  horario:
    'Los horarios definen qué turnos ven disponibles tus clientes. Configurá qué días abrís y en qué rango horario desde "Horarios".',
  cliente:
    'Los clientes se agregan automáticamente cuando reservan. Podés ver su historial, frecuencia de visitas e ingresos generados desde "Clientes".',
  reporte:
    'Los reportes te muestran ingresos, servicios más pedidos y rendimiento de tu equipo. Los datos se actualizan en tiempo real.',
  link: 'Tu link de reservas se genera automáticamente con el nombre de tu negocio. Podés copiarlo desde el botón "Compartir" en el inicio o desde "Ajustes".',
  default:
    '¡Hola! Soy Noni, tu asistente inteligente. Puedo ayudarte con tips para mejorar tu negocio, respuestas sobre cómo usar el panel, o análisis de tus métricas. ¿En qué puedo ayudarte?',
}

function getFallbackResponse(query) {
  const q = query.toLowerCase()
  if (q.includes('ocupación') || q.includes('ocupacion') || q.includes('más cliente') || q.includes('atraer'))
    return FALLBACK_RESPONSES.ocupacion
  if (q.includes('reserva') || q.includes('link') || q.includes('compartir')) return FALLBACK_RESPONSES.reservas
  if (q.includes('servicio')) return FALLBACK_RESPONSES.servicio
  if (q.includes('empleado') || q.includes('equipo') || q.includes('staff')) return FALLBACK_RESPONSES.empleado
  if (q.includes('horario') || q.includes('hora')) return FALLBACK_RESPONSES.horario
  if (q.includes('cliente') || q.includes('vip')) return FALLBACK_RESPONSES.cliente
  if (q.includes('reporte') || q.includes('ingreso') || q.includes('estadística')) return FALLBACK_RESPONSES.reporte
  if (q.includes('link') || q.includes('url') || q.includes('página')) return FALLBACK_RESPONSES.link
  return FALLBACK_RESPONSES.default
}

/**
 * Call the LLM API with advanced business context
 * @param {string} userQuery - The user's message
 * @param {object} context - Business context (negocio, vocab, smartAlerts, tab, setupData)
 * @param {array} history - Previous chat messages
 * @returns {Promise<{content: string, navTab: string|null}>}
 */
export async function askNoni(userQuery, context = {}, history = []) {
  const { negocio, vocab, smartAlerts, tab, setupData } = context

  // Try LLM first
  if (AI_API_KEY && AI_BASE_URL) {
    try {
      const systemMessage = buildBusinessContext(negocio, vocab, smartAlerts, tab, setupData)

      const messages = [
        { role: 'system', content: systemMessage },
        ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userQuery },
      ]

      const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_completion_tokens: 400,
          temperature: 0.7,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''

      if (content) {
        // Parse navigation intent
        const navMatch = content.match(/\[NAVEGAR:(\w+)\]/)
        let cleanContent = content.replace(/\[NAVEGAR:\w+\]/g, '').trim()
        return {
          content: cleanContent,
          navTab: navMatch ? navMatch[1] : null,
        }
      }
    } catch (e) {
      console.warn('Noni AI LLM error:', e.message)
    }
  }

  // Fallback to deterministic responses
  return {
    content: getFallbackResponse(userQuery),
    navTab: null,
  }
}

/**
 * Generate smart contextual tips based on business data
 */
export function generateSmartTip(negocio, smartAlerts, vocab, setupData = {}) {
  const tips = []

  // Setup progress tips
  const setupProgress = [
    setupData.hasServicios,
    setupData.hasEmpleados,
    setupData.hasHorarios,
    setupData.hasBranding,
    setupData.hasShared,
  ].filter(Boolean).length

  if (setupProgress < 3) {
    tips.push(`Te faltan ${5 - setupProgress} pasos para completar la configuración. ¡Vamos, casi listo!`)
  }

  // Occupancy tips
  if (smartAlerts.ocupacion > 0 && smartAlerts.ocupacion < 50) {
    tips.push(`Tu ocupación es del ${smartAlerts.ocupacion}%. Podrías mejorarla compartiendo tu link en redes sociales.`)
  }

  if (smartAlerts.ocupacion > 80) {
    tips.push(`¡Excelente ocupación! Estás al ${smartAlerts.ocupacion}%. Mantené el ritmo.`)
  }

  // VIP client tips
  if (smartAlerts.clientesVIP > 0) {
    tips.push(
      `Tenés ${smartAlerts.clientesVIP} cliente${smartAlerts.clientesVIP > 1 ? 's' : ''} VIP. Considerá ofrecerles un beneficio especial.`
    )
  }

  // Stock tips
  if (smartAlerts.stockBajo > 0) {
    tips.push(`Hay ${smartAlerts.stockBajo} producto${smartAlerts.stockBajo > 1 ? 's' : ''} con stock bajo. Revisá tu inventario.`)
  }

  // Daily activity tips
  if (smartAlerts.turnosHoy === 0) {
    tips.push('Hoy no tenés turnos agendados. ¿Querés compartir tu link de reservas para atraer clientes?')
  }

  if (smartAlerts.turnosHoy > 5) {
    tips.push(`¡Excelente! Tenés ${smartAlerts.turnosHoy} turnos hoy. Esperados ingresos: $${smartAlerts.ingresosHoy?.toLocaleString()}.`)
  }

  // Weekly activity tips
  if (smartAlerts.turnosSemana > 20) {
    tips.push(`¡Muy bien! Esta semana tenés ${smartAlerts.turnosSemana} turnos confirmados.`)
  }

  // Staff tips
  if (smartAlerts.empleadosActivos < smartAlerts.totalEmpleados) {
    const inactivos = smartAlerts.totalEmpleados - smartAlerts.empleadosActivos
    tips.push(`Tenés ${inactivos} empleado${inactivos > 1 ? 's' : ''} inactivo${inactivos > 1 ? 's' : ''}. Activá${inactivos > 1 ? 'los' : 'lo'} si es necesario.`)
  }

  // Branding tips
  if (!setupData.hasBranding) {
    tips.push('Personalizá tu marca: subí tu logo y elegí tu color. ¡Le da identidad a tu negocio!')
  }

  // Default tip
  if (tips.length === 0) {
    tips.push('¡Tu negocio va bien! Seguí compartiendo tu link de reservas y manteniendo los recordatorios activos.')
  }

  return tips[Math.floor(Math.random() * tips.length)]
}

/**
 * Get contextual suggestions based on current tab and setup state
 */
export function getContextualSuggestions(tab, setupData = {}, smartAlerts = {}) {
  const suggestions = []

  // Setup-based suggestions
  if (!setupData.hasServicios) {
    suggestions.push({
      priority: 1,
      title: 'Crear servicios',
      description: 'Define qué servicios ofrecés para que tus clientes puedan reservar.',
      action: 'servicios',
    })
  }

  if (!setupData.hasEmpleados && setupData.hasServicios) {
    suggestions.push({
      priority: 2,
      title: 'Agregar equipo',
      description: 'Agrega los profesionales que atienden a tus clientes.',
      action: 'equipo',
    })
  }

  if (!setupData.hasHorarios && setupData.hasServicios && setupData.hasEmpleados) {
    suggestions.push({
      priority: 3,
      title: 'Configurar horarios',
      description: 'Define tus horarios de atención para que los clientes vean disponibilidad.',
      action: 'horarios',
    })
  }

  if (!setupData.hasShared && setupData.hasServicios && setupData.hasEmpleados && setupData.hasHorarios) {
    suggestions.push({
      priority: 4,
      title: 'Compartir link',
      description: 'Comparte tu link de reservas en WhatsApp, Instagram o redes sociales.',
      action: 'copy-link',
    })
  }

  // Performance-based suggestions
  if (smartAlerts.ocupacion < 40 && tab === 'inicio') {
    suggestions.push({
      priority: 5,
      title: 'Mejorar ocupación',
      description: `Tu ocupación es baja (${smartAlerts.ocupacion}%). Compartí tu link en redes sociales.`,
      action: 'inicio',
    })
  }

  if (smartAlerts.stockBajo > 0) {
    suggestions.push({
      priority: 6,
      title: 'Revisar inventario',
      description: `Hay ${smartAlerts.stockBajo} producto(s) con stock bajo.`,
      action: 'inventario',
    })
  }

  return suggestions.sort((a, b) => a.priority - b.priority)
}
