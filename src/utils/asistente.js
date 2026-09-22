/**
 * Motor de respuestas del asistente Noni.
 *
 * No hay modelo de lenguaje detrás: es un clasificador de intenciones por
 * palabras clave. Antes la clasificación era una cadena de `includes()` en
 * orden fijo, y eso hacía que preguntas normales cayeran en la respuesta
 * equivocada. Por ejemplo:
 *   · "¿cuántos clientes nuevos tengo?" → entraba por `includes('cliente')`
 *     dentro de la rama de OCUPACIÓN y contestaba sobre el % de ocupación.
 *   · "¿a qué hora abre mañana?" → `includes('hora')` lo mandaba a horarios
 *     antes de poder mirar nada más.
 *   · "cómo agrego un servicio" y "cuánto cobro por el servicio" daban
 *     exactamente la misma respuesta.
 *   · Cualquier pregunta con tilde escrita sin tilde ("ocupacion", "cuantos")
 *     dependía de que alguien hubiera listado las dos variantes a mano.
 *
 * Ahora cada intención declara sus términos y se elige la de mayor puntaje,
 * con el texto normalizado (sin tildes, sin signos). Si nada supera el
 * umbral, se responde con una guía en lugar de adivinar.
 */

/** Saca tildes, signos y mayúsculas para comparar de forma tolerante. */
export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const money = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`
const plural = (n, sing, plur) => (Number(n) === 1 ? sing : plur)

/**
 * Cada intención tiene:
 *  · terms: pesan 1 punto (2 si son de dos palabras, porque son más
 *    específicos que una palabra suelta).
 *  · must: si está, alguno de estos términos tiene que aparecer.
 *  · not: descarta la intención (evita cruces como "cliente nuevo" vs
 *    "ocupación").
 */
const INTENCIONES = [
  {
    id: 'saludo',
    terms: ['hola', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches', 'que onda', 'hey', 'holis'],
    responder: ({ negocio }) =>
      `¡Hola${negocio?.nombre ? `, ${negocio.nombre}` : ''}! Soy Noni.\n\nPuedo contarte cómo viene el día, ayudarte a configurar el sistema o explicarte cualquier sección del panel. ¿Por dónde arrancamos?`,
  },
  {
    id: 'agradecer',
    terms: ['gracias', 'genial', 'buenisimo', 'perfecto', 'de diez'],
    responder: () => '¡De nada! Cualquier cosa me tocás de nuevo. 👋',
  },
  {
    id: 'despedida',
    terms: ['chau', 'adios', 'nos vemos', 'hasta luego', 'bye'],
    responder: () => '¡Hasta luego! Acá voy a estar cuando me necesites.',
  },
  {
    id: 'ayuda',
    terms: ['ayuda', 'que podes hacer', 'que sabes', 'para que servis', 'opciones', 'que hago'],
    responder: () =>
      'Te puedo ayudar con:\n\n· Cómo viene tu día (turnos, ingresos, ocupación)\n· Qué te falta configurar\n· Cómo funciona cada sección del panel\n· Ideas para que te reserven más\n\nPreguntame con tus palabras, te entiendo igual.',
  },
  {
    id: 'turnos_hoy',
    terms: ['turnos hoy', 'citas hoy', 'reservas hoy', 'cuantos turnos', 'cuantas citas', 'agenda hoy', 'hoy'],
    must: ['turno', 'cita', 'reserva', 'hoy', 'agenda'],
    not: ['cancelar', 'crear', 'cargar', 'como agrego'],
    responder: ({ turnosHoy = 0, ingresosHoy = 0, proximaCita }) => {
      if (!turnosHoy) {
        return 'Hoy no tenés turnos agendados.\n\nUn empujón rápido: compartí tu link de reservas por WhatsApp o subilo a tu historia de Instagram. Es lo que más mueve la aguja los días flojos.'
      }
      const base = `Hoy tenés ${turnosHoy} ${plural(turnosHoy, 'turno', 'turnos')} y ${money(ingresosHoy)} estimados.`
      if (proximaCita?.cliente_nombre) {
        return `${base}\n\nEl próximo es con ${proximaCita.cliente_nombre}. Si querés, mandale el recordatorio desde el inicio del panel.`
      }
      return `${base}\n\nPodés ver el detalle completo en la agenda.`
    },
  },
  {
    id: 'ocupacion',
    terms: ['ocupacion', 'ocupado', 'ocupada', 'capacidad', 'lleno', 'cupo', 'cupos', 'lugares libres', 'disponibilidad', 'libre', 'libres'],
    not: ['servicio', 'empleado'],
    responder: ({ ocupacion = 0 }) => {
      if (ocupacion < 40) {
        return `Tu ocupación está en ${ocupacion}%. Hay lugar de sobra, así que conviene salir a buscar reservas:\n\n1. Compartí tu link en redes y en tu estado de WhatsApp\n2. Escribile a los clientes que hace más de un mes no vienen\n3. Armá una promo para los horarios más flojos`
      }
      if (ocupacion < 70) {
        return `Vas en ${ocupacion}% de ocupación: un buen número. Para subirlo, mirá en Reportes qué días te quedan flojos y empujá justo esos horarios.`
      }
      return `${ocupacion}% de ocupación. Estás casi a tope.\n\nCuando pasás el 80% seguido, suele ser momento de sumar a alguien al equipo o estirar un poco el horario: si no, empezás a rechazar gente.`
    },
  },
  {
    id: 'ingresos',
    terms: ['ingresos', 'facturacion', 'facture', 'cuanto gane', 'plata', 'dinero', 'recaudacion', 'cuanto hice'],
    responder: ({ ingresosHoy = 0, ingresosMes = 0, turnosSemana = 0 }) =>
      `Así viene la caja:\n\n· Hoy: ${money(ingresosHoy)}\n· Este mes: ${money(ingresosMes)}\n· Turnos de la semana: ${turnosSemana}\n\nEn Reportes tenés el detalle por servicio y por persona del equipo.`,
  },
  {
    id: 'clientes',
    terms: ['clientes', 'cuantos clientes', 'base de clientes', 'clientela', 'vip', 'clientes nuevos', 'recurrentes'],
    not: ['ocupacion'],
    responder: ({ totalClientes = 0, clientesVIP = 0 }) => {
      if (!totalClientes) {
        return 'Todavía no tenés clientes cargados. Se van agregando solos con cada reserva que entra por tu link: no hace falta cargarlos a mano.'
      }
      const vip = clientesVIP
        ? `\n\nDe esos, ${clientesVIP} ${plural(clientesVIP, 'es VIP', 'son VIP')} (vienen seguido). Un mensaje con una atención especial cada tanto los mantiene fieles.`
        : '\n\nCuando alguien reserve varias veces, lo vas a ver marcado como VIP automáticamente.'
      return `Tenés ${totalClientes} ${plural(totalClientes, 'cliente', 'clientes')} en tu base.${vip}`
    },
  },
  {
    id: 'stock',
    terms: ['stock', 'inventario', 'producto', 'productos', 'faltante', 'reponer', 'mercaderia'],
    responder: ({ stockBajo = 0 }) =>
      stockBajo > 0
        ? `Hay ${stockBajo} ${plural(stockBajo, 'producto', 'productos')} con stock bajo. Entrá a Inventario y reponé antes de quedarte sin nada para vender.`
        : 'Tu inventario está en orden: ningún producto por debajo del mínimo.',
  },
  {
    id: 'crear_servicio',
    terms: ['servicio', 'servicios', 'crear servicio', 'agregar servicio', 'cargar servicio', 'nuevo servicio', 'precio', 'duracion'],
    must: ['servicio'],
    responder: ({ vocab }) =>
      `Para cargar ${vocab?.servicio ? `un ${vocab.servicio}` : 'un servicio'}: entrá a la sección Servicios y tocá "Agregar".\n\nNecesitás tres datos:\n· Nombre — lo que ve el cliente\n· Precio\n· Duración en minutos — de esto salen los horarios disponibles, así que conviene que sea realista.`,
    accion: { tab: 'servicios', label: 'Ir a Servicios' },
  },
  {
    id: 'equipo',
    terms: ['empleado', 'empleados', 'equipo', 'staff', 'profesional', 'peluquero', 'barbero', 'agregar persona', 'sumar a alguien'],
    responder: ({ vocab }) =>
      `En la sección Equipo cargás a cada ${vocab?.empleado || 'profesional'} con su nombre, especialidad y foto.\n\nCada persona activa suma su propia agenda: si tenés dos, tus clientes pueden reservar dos turnos en el mismo horario.`,
    accion: { tab: 'equipo', label: 'Ir a Equipo' },
  },
  {
    id: 'horarios',
    terms: ['horario', 'horarios', 'a que hora', 'abro', 'abrir', 'cierro', 'cerrar', 'dias que trabajo', 'jornada', 'atencion'],
    responder: () =>
      'Los horarios son la base de todo: si un día está cerrado, tu link no ofrece ningún turno para ese día.\n\nEn Horarios activás los días que trabajás y ponés desde/hasta. Guardá y probá tu link para ver cómo le queda al cliente.',
    accion: { tab: 'horarios', label: 'Configurar horarios' },
  },
  {
    id: 'marca',
    terms: ['logo', 'marca', 'branding', 'personalizar', 'personalizo', 'color', 'colores', 'portada', 'descripcion', 'imagen'],
    responder: () =>
      'En Ajustes podés subir tu logo, una portada y escribir la descripción de tu negocio. Eso es lo que ven tus clientes cuando abren tu link, y es lo que hace que parezca tu app y no una plantilla.',
    accion: { tab: 'ajustes', label: 'Ir a Ajustes' },
  },
  {
    id: 'link',
    terms: ['link', 'enlace', 'compartir', 'comparto', 'promocionar', 'difundir', 'qr', 'mi app', 'pagina', 'url'],
    responder: () =>
      'Tu link de reservas es el corazón del sistema: el cliente entra, elige servicio, día y hora, y el turno te cae solo en la agenda.\n\nCompartilo en tu bio de Instagram, en tu estado de WhatsApp y en el cartel del local con el QR (lo generás desde Ajustes).',
    accion: { copiarLink: true, label: 'Copiar mi link' },
  },
  {
    id: 'mas_clientes',
    terms: ['mas clientes', 'atraer', 'vender mas', 'crecer', 'promocion', 'marketing', 'como consigo clientes'],
    responder: () =>
      'Cuatro cosas que funcionan, en orden de esfuerzo:\n\n1. Poné el link en la bio de Instagram y en tu estado de WhatsApp\n2. Mandá el recordatorio del turno: baja mucho el ausentismo\n3. Escribile a quien no viene hace más de 30 días con una excusa concreta\n4. Armá una promo sólo para tus horarios flojos (los ves en Reportes)',
  },
  {
    id: 'recordatorios',
    terms: ['recordatorio', 'avisar', 'confirmar turno', 'no vino', 'ausente', 'whatsapp al cliente'],
    responder: () =>
      'Desde el inicio y desde la agenda tenés el botón de WhatsApp al lado de cada turno: abre el chat con el mensaje ya escrito.\n\nMandarlo el día anterior es la forma más barata de bajar los ausentes.',
    accion: { tab: 'agenda', label: 'Ir a la agenda' },
  },
  {
    id: 'reportes',
    terms: ['reporte', 'reportes', 'estadistica', 'estadisticas', 'metrica', 'metricas', 'numeros', 'analisis', 'grafico'],
    responder: () =>
      'En Reportes vas a encontrar ingresos por período, servicios más pedidos, rendimiento por persona del equipo y tus horarios más fuertes. Todo se puede exportar a CSV o imprimir en PDF.',
    accion: { tab: 'reportes', label: 'Ver reportes' },
  },
  {
    id: 'cancelar',
    terms: ['cancelar', 'cancelo', 'borrar turno', 'eliminar reserva', 'reprogramar', 'mover turno', 'ausente', 'no show'],
    responder: () =>
      'En la agenda, tocá el turno y vas a ver las acciones: confirmar, marcar como atendido, marcar ausente o cancelar.\n\nLos cancelados liberan el horario al instante, así que ese lugar vuelve a estar disponible en tu link.',
    accion: { tab: 'agenda', label: 'Ir a la agenda' },
  },
  {
    id: 'empezar',
    terms: ['como empiezo', 'empezar', 'primeros pasos', 'arrancar', 'configurar todo', 'recien empiezo'],
    responder: () =>
      'El orden que menos dolores de cabeza da:\n\n1. Cargá tus servicios con precio y duración\n2. Sumá a tu equipo (aunque seas vos solo)\n3. Definí tus horarios\n4. Subí tu logo en Ajustes\n5. Compartí tu link\n\nCon esos cinco pasos ya podés recibir reservas.',
    accion: { tour: true, label: 'Hacer el tour guiado' },
  },
  {
    id: 'tour',
    terms: ['tour', 'guia', 'recorrido', 'mostrame el panel', 'como funciona esto'],
    responder: () => 'Te hago el recorrido guiado por el panel: son ocho pasos cortos y podés salir cuando quieras.',
    accion: { tour: true, label: 'Empezar el tour' },
  },
  {
    id: 'precio_plan',
    terms: ['plan', 'suscripcion', 'pagar', 'cuanto cuesta', 'precio del sistema', 'factura', 'vencimiento'],
    responder: () =>
      'Tu plan y los días que te quedan los ves en Ajustes, en la tarjeta de suscripción. Desde ahí sale el botón para activarlo o renovarlo por WhatsApp.',
    accion: { tab: 'ajustes', label: 'Ver mi plan' },
  },
]

const UMBRAL = 1

/**
 * Clasifica la consulta y arma la respuesta con los datos reales del panel.
 * Devuelve `{ id, texto, accion }`.
 */
export function responder(consulta, contexto = {}) {
  const q = normalizar(consulta)
  if (!q) return { id: 'vacio', texto: '¿Qué necesitás saber?', accion: null }

  let mejor = null
  let mejorPuntaje = 0

  for (const intencion of INTENCIONES) {
    if (intencion.not?.some((t) => q.includes(normalizar(t)))) continue
    if (intencion.must && !intencion.must.some((t) => q.includes(normalizar(t)))) continue

    let puntaje = 0
    for (const termino of intencion.terms) {
      const t = normalizar(termino)
      if (!q.includes(t)) continue
      // Una frase de varias palabras es una señal mucho más fuerte que una
      // palabra suelta que puede aparecer en cualquier pregunta.
      puntaje += t.includes(' ') ? 2.5 : 1
    }
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje
      mejor = intencion
    }
  }

  if (!mejor || mejorPuntaje < UMBRAL) {
    return {
      id: 'sin_match',
      texto:
        'Esa no la tengo. Probá preguntándome por:\n\n· Cómo viene el día o el mes\n· Ocupación, clientes o stock\n· Cómo cargar servicios, equipo u horarios\n· Cómo compartir tu link\n\nTambién puedo hacerte el tour del panel.',
      accion: { tour: true, label: 'Hacer el tour' },
    }
  }

  return {
    id: mejor.id,
    texto: mejor.responder(contexto),
    accion: mejor.accion || null,
  }
}

/** Preguntas sugeridas, elegidas según lo que le falta al negocio. */
export function sugerencias({ setupData = {}, smartAlerts = {} }) {
  const base = []
  if (!setupData.hasServicios) base.push('¿Cómo cargo mis servicios?')
  if (!setupData.hasHorarios) base.push('¿Cómo configuro mis horarios?')
  if (!setupData.hasEmpleados) base.push('¿Cómo agrego a mi equipo?')
  if (!setupData.hasShared) base.push('¿Cómo comparto mi link?')
  if (smartAlerts.stockBajo > 0) base.push('¿Cómo está mi stock?')

  const generales = [
    '¿Cuántos turnos tengo hoy?',
    '¿Cómo viene mi ocupación?',
    '¿Cuánto facturé este mes?',
    '¿Cómo consigo más clientes?',
  ]

  return [...base, ...generales].slice(0, 4)
}
