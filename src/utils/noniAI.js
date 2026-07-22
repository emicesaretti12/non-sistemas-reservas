/**
 * Noni AI Service — Client-side LLM integration
 * Uses the Manus sandbox OpenAI proxy for intelligent responses.
 * Falls back gracefully if the API is unavailable.
 */

const AI_BASE_URL = import.meta.env.VITE_OPENAI_BASE_URL || ''
const AI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const MODEL = 'gpt-5-nano'

// Business context builder
function buildBusinessContext(negocio, vocab, smartAlerts, tab) {
  return `Eres Noni, el asistente inteligente de una plataforma de gestión de reservas para negocios de servicios (peluquerías, estudios, consultorios, etc.).

El negocio del usuario se llama "${negocio?.nombre || 'mi negocio'}".
Rubro: ${vocab?.rubro || 'servicios generales'}.

Datos actuales del negocio:
- Turnos hoy: ${smartAlerts.turnosHoy || 0}
- Ingresos de hoy: $${(smartAlerts.ingresosHoy || 0).toLocaleString()}
- Turnos esta semana: ${smartAlerts.turnosSemana || 0}
- Ingresos del mes: $${(smartAlerts.ingresosMes || 0).toLocaleString()}
- Clientes registrados: ${smartAlerts.totalClientes || 0}
- Clientes VIP: ${smartAlerts.clientesVIP || 0}
- Stock bajo: ${smartAlerts.stockBajo || 0}
- Tasa de ocupación: ${smartAlerts.ocupacion || 0}%
- Sección actual del panel: ${tab}

El usuario está en la sección "${tab}" del panel de gestión.

Reglas de respuesta:
1. Respondé en español rioplatense (argentino), de forma breve, amigable y útil.
2. Máximo 3 oraciones, tono cercano pero profesional.
3. Si el usuario pregunta algo que requiere navegar a otra sección, indicá al final con [NAVEGAR:seccion] donde "seccion" es una de: inicio, agenda, servicios, equipo, horarios, clientes, reportes, inventario, flyer, ajustes.
4. Si preguntan cómo funciona algo del panel, explicá brevemente.
5. Si preguntan sobre métricas, usá los datos reales de arriba.
6. Si no sabés la respuesta exacta, sugerí revisar la sección correspondiente o contactar al soporte.
7. Nunca inventes datos que no estén en el contexto.`
}

// Fallback responses for when LLM is unavailable
const FALLBACK_RESPONSES = {
  ocupacion: 'Para mejorar la ocupación te recomiendo: compartir tu link de reservas en redes sociales, ofrecer descuentos a clientes recurrentes, y configurar recordatorios automáticos por WhatsApp.',
  reservas: 'Los clientes pueden reservar desde tu link público, que se genera automáticamente. Podés compartirlo en Instagram, WhatsApp o cualquier red social.',
  servicio: 'Un servicio es lo que ofrecés a tus clientes. Podés agregar, editar o eliminar servicios desde la sección "Servicios" del panel.',
  empleado: 'Los empleados son los profesionales que atienden a tus clientes. Podés agregarlos desde "Equipo" y asignarles servicios y horarios.',
  horario: 'Los horarios definen qué turnos ven disponibles tus clientes. Configurá qué días abrís y en qué rango horario desde "Horarios".',
  cliente: 'Los clientes se agregan automáticamente cuando reservan. Podés ver su historial, frecuencia de visitas e ingresos generados desde "Clientes".',
  reporte: 'Los reportes te muestran ingresos, servicios más pedidos y rendimiento de tu equipo. Los datos se actualizan en tiempo real.',
  link: 'Tu link de reservas se genera automáticamente con el nombre de tu negocio. Podés copiarlo desde el botón "Compartir" en el inicio o desde "Ajustes".',
  default: '¡Hola! Soy Noni, tu asistente inteligente. Puedo ayudarte con tips para mejorar tu negocio, respuestas sobre cómo usar el panel, o análisis de tus métricas. ¿En qué puedo ayudarte?',
}

function getFallbackResponse(query) {
  const q = query.toLowerCase()
  if (q.includes('ocupación') || q.includes('ocupacion') || q.includes('más cliente') || q.includes('atraer')) return FALLBACK_RESPONSES.ocupacion
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
 * Call the LLM API
 * @param {string} userQuery - The user's message
 * @param {object} context - Business context (negocio, vocab, smartAlerts, tab)
 * @param {array} history - Previous chat messages
 * @returns {Promise<{content: string, navTab: string|null}>}
 */
export async function askNoni(userQuery, context = {}, history = []) {
  const { negocio, vocab, smartAlerts, tab } = context

  // Try LLM first
  if (AI_API_KEY && AI_BASE_URL) {
    try {
      const systemMessage = buildBusinessContext(negocio, vocab, smartAlerts, tab)

      const messages = [
        { role: 'system', content: systemMessage },
        ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userQuery },
      ]

      const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_completion_tokens: 300,
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
 * Generate a smart tip based on business data
 */
export function generateSmartTip(negocio, smartAlerts, vocab) {
  const tips = []

  if (smartAlerts.ocupacion > 0 && smartAlerts.ocupacion < 50) {
    tips.push(`Tu ocupación es del ${smartAlerts.ocupacion}%. Podrías mejorarla compartiendo tu link en redes sociales.`)
  }

  if (smartAlerts.clientesVIP > 0) {
    tips.push(`Tenés ${smartAlerts.clientesVIP} cliente${smartAlerts.clientesVIP > 1 ? 's' : ''} VIP. Considerá ofrecerles un beneficio especial.`)
  }

  if (smartAlerts.stockBajo > 0) {
    tips.push(`Hay ${smartAlerts.stockBajo} producto${smartAlerts.stockBajo > 1 ? 's' : ''} con stock bajo. Revisá tu inventario.`)
  }

  if (smartAlerts.turnosHoy === 0) {
    tips.push('Hoy no tenés turnos agendados. ¿Querés compartir tu link de reservas para atraer clientes?')
  }

  if (tips.length === 0) {
    tips.push('¡Tu negocio va bien! Seguí compartiendo tu link de reservas y manteniendo los recordatorios activos.')
  }

  return tips[Math.floor(Math.random() * tips.length)]
}
