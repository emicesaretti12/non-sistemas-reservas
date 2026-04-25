/**
 * SISTEMA DE VOCABULARIO DINÁMICO POR RUBRO
 * 
 * Centraliza toda la terminología del sistema para que cada tipo de negocio
 * use etiquetas, iconos y textos adecuados a su rubro específico.
 */

const VOCABULARIOS = {
  // ===== RESTAURANTE / GASTRONOMÍA =====
  'Restaurante / Gastronomía': {
    // Entidades principales
    servicio: 'experiencia',
    servicios: 'experiencias',
    servicioPlural: 'Experiencias Gastronómicas',
    nuevoServicio: 'Nueva Experiencia',
    editarServicio: 'Modificar Experiencia',
    placeholderServicio: 'Ej: Mesa para 2, Cena VIP, Brunch Especial',

    empleado: 'zona',
    empleados: 'zonas',
    empleadoPlural: 'Zonas y Salones',
    nuevoEmpleado: 'Nueva Zona',
    editarEmpleado: 'Editar Zona',
    placeholderEmpleado: 'Ej: Salón Principal, Terraza, VIP',
    especialidad: 'Descripción',
    placeholderEspecialidad: 'Ej: Interior con aire, Al aire libre, Zona fumadores',

    turno: 'reserva',
    turnos: 'reservas',
    turnoPlural: 'Reservas de Mesa',
    nuevaCita: 'Nueva Reserva',
    proximaCita: 'Próxima Reserva',
    citasRegistradas: 'Reservas Registradas',
    citasAsignadas: 'Reservas del Día',
    confirmarCita: 'Confirmar Reserva',
    
    cliente: 'comensal',
    clientes: 'comensales',
    clientePlural: 'Base de Comensales',

    // Labels del flujo público
    paso1Titulo: 'Seleccione una experiencia',
    paso2Titulo: 'Zona del restaurante',
    paso2Volver: 'Experiencias',
    paso3Volver: 'Zona',
    paso4Titulo: 'Datos de la Reserva',
    paso4Volver: 'Horario',
    ticketTitulo: 'Reserva de Mesa',
    exitoTitulo: 'Reserva Confirmada',
    exitoMensaje: 'Tu reserva para el',
    exitoMensaje2: 'ha sido procesada.',
    nuevaReservaBtn: 'Nueva Reserva',
    avanzarBtn: 'Confirmar Horario',
    confirmarBtn: 'Confirmar Reserva',

    // Campo extra
    campoExtra: true,
    campoExtraLabel: 'Cantidad de Comensales',
    campoExtraPlaceholder: 'Ej: 4',
    campoExtraTipo: 'number',

    // Labels del Dashboard
    monitorTurnos: 'Reservas Próximas',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Reservada',
    accionNueva: 'Nueva Reserva',
    accionServicio: 'Agregar Experiencia',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link con tus clientes para que reserven mesa online.',
    shareWA: 'Reservá tu mesa en',

    // Icono del servicio (SVG path)
    servicioIconPath: 'M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h12v2H3v-2zm0 4h18v2H3v-2zm0 4h12v2H3v-2z',
    servicioIconViewBox: '0 0 24 24',
    usarIconoCustom: true,
    // Restaurante icon
    iconoServicio: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
  },

  // ===== BARBERÍA / PELUQUERÍA =====
  'Barbería / Peluquería': {
    servicio: 'servicio',
    servicios: 'servicios',
    servicioPlural: 'Catálogo de Servicios',
    nuevoServicio: 'Nuevo Servicio',
    editarServicio: 'Modificar Actividad',
    placeholderServicio: 'Ej: Corte Clásico, Barba Premium',

    empleado: 'especialista',
    empleados: 'especialistas',
    empleadoPlural: 'Especialistas',
    nuevoEmpleado: 'Nuevo Especialista',
    editarEmpleado: 'Editar Perfil',
    placeholderEmpleado: 'Ej: Carlos López',
    especialidad: 'Especialidad / Rol',
    placeholderEspecialidad: 'Ej: Barbero Senior, Colorista',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos',
    nuevaCita: 'Nueva Cita',
    proximaCita: 'Próxima Cita',
    citasRegistradas: 'Citas Registradas',
    citasAsignadas: 'Citas Asignadas',
    confirmarCita: 'Confirmar Cita',
    
    cliente: 'cliente',
    clientes: 'clientes',
    clientePlural: 'Base de Clientes',

    paso1Titulo: 'Seleccione un servicio',
    paso2Titulo: 'Especialista',
    paso2Volver: 'Servicios',
    paso3Volver: 'Personal',
    paso4Titulo: 'Tus Datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Ticket de Cita',
    exitoTitulo: 'Confirmado',
    exitoMensaje: 'Tu turno para el',
    exitoMensaje2: 'ha sido procesado.',
    nuevaReservaBtn: 'Nueva Reserva',
    avanzarBtn: 'Avanzar al cierre',
    confirmarBtn: 'Confirmar Reserva',

    campoExtra: false,

    monitorTurnos: 'Turnos Próximos',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Solicitado',
    accionNueva: 'Nueva Cita',
    accionServicio: 'Agregar Servicio',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link con tus clientes para que reserven online.',
    shareWA: 'Reservá tu turno en',

    usarIconoCustom: false,
    iconoServicio: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
  },

  // ===== CENTRO DE ESTÉTICA =====
  'Centro de Estética': {
    servicio: 'tratamiento',
    servicios: 'tratamientos',
    servicioPlural: 'Catálogo de Tratamientos',
    nuevoServicio: 'Nuevo Tratamiento',
    editarServicio: 'Modificar Tratamiento',
    placeholderServicio: 'Ej: Limpieza Facial, Masaje Relajante',

    empleado: 'profesional',
    empleados: 'profesionales',
    empleadoPlural: 'Profesionales',
    nuevoEmpleado: 'Nuevo Profesional',
    editarEmpleado: 'Editar Perfil',
    placeholderEmpleado: 'Ej: Dra. María García',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: Dermatología, Cosmetología',

    turno: 'cita',
    turnos: 'citas',
    turnoPlural: 'Citas',
    nuevaCita: 'Nueva Cita',
    proximaCita: 'Próxima Cita',
    citasRegistradas: 'Citas Registradas',
    citasAsignadas: 'Citas del Día',
    confirmarCita: 'Confirmar Cita',
    
    cliente: 'paciente',
    clientes: 'pacientes',
    clientePlural: 'Base de Pacientes',

    paso1Titulo: 'Seleccione un tratamiento',
    paso2Titulo: 'Profesional',
    paso2Volver: 'Tratamientos',
    paso3Volver: 'Profesional',
    paso4Titulo: 'Tus Datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Ticket de Cita',
    exitoTitulo: 'Confirmado',
    exitoMensaje: 'Tu cita para el',
    exitoMensaje2: 'ha sido procesada.',
    nuevaReservaBtn: 'Nueva Cita',
    avanzarBtn: 'Avanzar al cierre',
    confirmarBtn: 'Confirmar Cita',

    campoExtra: false,

    monitorTurnos: 'Citas Próximas',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Solicitado',
    accionNueva: 'Nueva Cita',
    accionServicio: 'Agregar Tratamiento',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link con tus pacientes para que agenden online.',
    shareWA: 'Agendá tu cita en',

    usarIconoCustom: false,
    iconoServicio: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
  },

  // ===== VETERINARIA =====
  'Veterinaria': {
    servicio: 'consulta',
    servicios: 'consultas',
    servicioPlural: 'Tipos de Consulta',
    nuevoServicio: 'Nueva Consulta',
    editarServicio: 'Modificar Consulta',
    placeholderServicio: 'Ej: Consulta General, Vacunación, Cirugía',

    empleado: 'veterinario',
    empleados: 'veterinarios',
    empleadoPlural: 'Veterinarios',
    nuevoEmpleado: 'Nuevo Veterinario',
    editarEmpleado: 'Editar Perfil',
    placeholderEmpleado: 'Ej: Dr. Alejandro Sanz',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: Animales exóticos, Cirugía',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos',
    nuevaCita: 'Nuevo Turno',
    proximaCita: 'Próximo Turno',
    citasRegistradas: 'Turnos Registrados',
    citasAsignadas: 'Turnos del Día',
    confirmarCita: 'Confirmar Turno',
    
    cliente: 'tutor',
    clientes: 'tutores',
    clientePlural: 'Base de Tutores',

    paso1Titulo: 'Seleccione tipo de consulta',
    paso2Titulo: 'Veterinario',
    paso2Volver: 'Consultas',
    paso3Volver: 'Veterinario',
    paso4Titulo: 'Tus Datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Ticket de Turno',
    exitoTitulo: 'Confirmado',
    exitoMensaje: 'Tu turno para el',
    exitoMensaje2: 'ha sido procesado.',
    nuevaReservaBtn: 'Nuevo Turno',
    avanzarBtn: 'Avanzar al cierre',
    confirmarBtn: 'Confirmar Turno',

    campoExtra: true,
    campoExtraLabel: 'Nombre de la Mascota',
    campoExtraPlaceholder: 'Ej: Rocky',
    campoExtraTipo: 'text',

    monitorTurnos: 'Turnos Próximos',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Consultado',
    accionNueva: 'Nuevo Turno',
    accionServicio: 'Agregar Consulta',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link con tus clientes para que saquen turno online.',
    shareWA: 'Sacá tu turno en',

    usarIconoCustom: false,
    iconoServicio: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
  },

  // ===== SALUD / CLÍNICA =====
  'Salud / Clínica': {
    servicio: 'consulta',
    servicios: 'consultas',
    servicioPlural: 'Tipos de Consulta',
    nuevoServicio: 'Nueva Consulta',
    editarServicio: 'Modificar Consulta',
    placeholderServicio: 'Ej: Consulta General, Revisión, Especializada',

    empleado: 'profesional',
    empleados: 'profesionales',
    empleadoPlural: 'Profesionales de Salud',
    nuevoEmpleado: 'Nuevo Profesional',
    editarEmpleado: 'Editar Perfil',
    placeholderEmpleado: 'Ej: Dr. Martínez',
    especialidad: 'Especialidad Médica',
    placeholderEspecialidad: 'Ej: Cardiología, Dermatología',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos Médicos',
    nuevaCita: 'Nuevo Turno',
    proximaCita: 'Próximo Turno',
    citasRegistradas: 'Turnos Registrados',
    citasAsignadas: 'Turnos del Día',
    confirmarCita: 'Confirmar Turno',
    
    cliente: 'paciente',
    clientes: 'pacientes',
    clientePlural: 'Base de Pacientes',

    paso1Titulo: 'Seleccione tipo de consulta',
    paso2Titulo: 'Profesional',
    paso2Volver: 'Consultas',
    paso3Volver: 'Profesional',
    paso4Titulo: 'Datos del Paciente',
    paso4Volver: 'Horario',
    ticketTitulo: 'Ticket de Turno',
    exitoTitulo: 'Turno Confirmado',
    exitoMensaje: 'Tu turno para el',
    exitoMensaje2: 'ha sido confirmado.',
    nuevaReservaBtn: 'Nuevo Turno',
    avanzarBtn: 'Avanzar al cierre',
    confirmarBtn: 'Confirmar Turno',

    campoExtra: false,

    monitorTurnos: 'Turnos Próximos',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Consultado',
    accionNueva: 'Nuevo Turno',
    accionServicio: 'Agregar Consulta',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link con tus pacientes para que saquen turno online.',
    shareWA: 'Sacá tu turno en',

    usarIconoCustom: false,
    iconoServicio: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
  },
}

// Fallback genérico para rubros no registrados
const VOCABULARIO_DEFAULT = {
  servicio: 'servicio',
  servicios: 'servicios',
  servicioPlural: 'Catálogo de Servicios',
  nuevoServicio: 'Nuevo Servicio',
  editarServicio: 'Modificar Servicio',
  placeholderServicio: 'Ej: Servicio Premium',

  empleado: 'recurso',
  empleados: 'recursos',
  empleadoPlural: 'Recursos / Staff',
  nuevoEmpleado: 'Nuevo Recurso',
  editarEmpleado: 'Editar Recurso',
  placeholderEmpleado: 'Ej: Nombre del recurso',
  especialidad: 'Rol / Especialidad',
  placeholderEspecialidad: 'Ej: Descripción del rol',

  turno: 'turno',
  turnos: 'turnos',
  turnoPlural: 'Turnos',
  nuevaCita: 'Nuevo Turno',
  proximaCita: 'Próximo Turno',
  citasRegistradas: 'Turnos Registrados',
  citasAsignadas: 'Turnos del Día',
  confirmarCita: 'Confirmar Turno',
  
  cliente: 'cliente',
  clientes: 'clientes',
  clientePlural: 'Base de Clientes',

  paso1Titulo: 'Seleccione un servicio',
  paso2Titulo: 'Seleccione un recurso',
  paso2Volver: 'Servicios',
  paso3Volver: 'Recurso',
  paso4Titulo: 'Tus Datos',
  paso4Volver: 'Horario',
  ticketTitulo: 'Ticket de Reserva',
  exitoTitulo: 'Confirmado',
  exitoMensaje: 'Tu reserva para el',
  exitoMensaje2: 'ha sido procesada.',
  nuevaReservaBtn: 'Nueva Reserva',
  avanzarBtn: 'Avanzar al cierre',
  confirmarBtn: 'Confirmar Reserva',

  campoExtra: false,

  monitorTurnos: 'Turnos Próximos',
  monitorIngresos: 'Ingresos Proyec.',
  monitorSemana: 'Esta Semana',
  monitorPopular: 'Más Popular',
  accionNueva: 'Nuevo Turno',
  accionServicio: 'Agregar Servicio',
  actividadReciente: 'Actividad Reciente',
  linkDescripcion: 'Compartí este link con tus clientes para que reserven online.',
  shareWA: 'Reservá en',

  usarIconoCustom: false,
  iconoServicio: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
}

/**
 * Obtiene el vocabulario del negocio según su rubro.
 * @param {string} rubro - El rubro del negocio (ej: "Restaurante / Gastronomía")
 * @returns {Object} Objeto con toda la terminología adaptada
 */
export function getVocabulario(rubro) {
  return VOCABULARIOS[rubro] || VOCABULARIO_DEFAULT
}

/**
 * Lista de rubros disponibles para el onboarding
 */
export const RUBROS_DISPONIBLES = [
  'Barbería / Peluquería',
  'Restaurante / Gastronomía',
  'Centro de Estética',
  'Veterinaria',
  'Salud / Clínica',
  'Otros Servicios',
]

/**
 * Detecta si un rubro es de tipo gastronómico
 */
export function esGastronomia(rubro) {
  return rubro === 'Restaurante / Gastronomía'
}
