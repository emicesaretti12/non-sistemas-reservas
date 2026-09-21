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

    // Tabs y Navegación
    tabServicios: 'Experiencias',
    tabStaff: 'Zonas',
    tabClientes: 'Comensales',
    filtroTodos: 'Todas las Zonas',
    seleccionarServicio: 'Seleccionar Experiencia',
    seleccionarEmpleado: 'Seleccionar Zona',
    labelServicioRequerido: 'Experiencia',
    labelEmpleado: 'Zona / Salón',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu reserva${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmada. ¡Te esperamos!`,

    // Icono del servicio (SVG path)
    servicioIconPath: 'M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h12v2H3v-2zm0 4h18v2H3v-2zm0 4h12v2H3v-2z',
    servicioIconViewBox: '0 0 24 24',
    usarIconoCustom: true,
    // Restaurante icon
    iconoServicio: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
  },

  // ===== BAR / CERVECERÍA =====
  'Bar / Cervecería': {
    servicio: 'mesa',
    servicios: 'mesas',
    servicioPlural: 'Mesas y Espacios',
    nuevoServicio: 'Nuevo Tipo de Mesa',
    editarServicio: 'Modificar Mesa',
    placeholderServicio: 'Ej: Mesa alta para 4, Barra, Reservado',

    empleado: 'sector',
    empleados: 'sectores',
    empleadoPlural: 'Sectores del Bar',
    nuevoEmpleado: 'Nuevo Sector',
    editarEmpleado: 'Editar Sector',
    placeholderEmpleado: 'Ej: Barra, Patio, Planta alta',
    especialidad: 'Descripción',
    placeholderEspecialidad: 'Ej: Al aire libre, con pantalla, techado',

    turno: 'reserva',
    turnos: 'reservas',
    turnoPlural: 'Reservas',
    nuevaCita: 'Nueva Reserva',
    proximaCita: 'Próxima Reserva',
    citasRegistradas: 'Reservas Registradas',
    citasAsignadas: 'Reservas de la Noche',
    confirmarCita: 'Confirmar Reserva',

    cliente: 'cliente',
    clientes: 'clientes',
    clientePlural: 'Base de Clientes',

    paso1Titulo: '¿Qué mesa querés reservar?',
    paso2Titulo: 'Elegí el sector',
    paso2Volver: 'Mesas',
    paso3Volver: 'Sector',
    paso4Titulo: 'Datos de la Reserva',
    paso4Volver: 'Horario',
    ticketTitulo: 'Reserva',
    exitoTitulo: '¡Mesa Reservada!',
    exitoMensaje: 'Tu reserva para el',
    exitoMensaje2: 'quedó confirmada.',
    nuevaReservaBtn: 'Nueva Reserva',
    avanzarBtn: 'Confirmar Horario',
    confirmarBtn: 'Reservar Mesa',

    campoExtra: true,
    campoExtraLabel: 'Cantidad de Personas',
    campoExtraPlaceholder: 'Ej: 6',
    campoExtraTipo: 'number',

    monitorTurnos: 'Reservas Próximas',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Reservada',
    accionNueva: 'Nueva Reserva',
    accionServicio: 'Agregar Mesa',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link para que reserven mesa sin llamarte.',
    shareWA: 'Reservá tu mesa en',

    tabServicios: 'Mesas',
    tabStaff: 'Sectores',
    tabClientes: 'Clientes',
    filtroTodos: 'Todos los Sectores',
    seleccionarServicio: 'Seleccionar Mesa',
    seleccionarEmpleado: 'Seleccionar Sector',
    labelServicioRequerido: 'Tipo de Mesa',
    labelEmpleado: 'Sector',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu reserva${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmada. ¡Te esperamos!`,

    usarIconoCustom: true,
    iconoServicio: 'M3 2l1.5 11h15L21 2H3zm2.7 9l-.8-6h14.2l-.8 6H5.7zM12 14v6H8v2h8v-2h-4v-6z',
  },

  // ===== UÑAS / MANICURÍA =====
  'Uñas / Manicuría': {
    servicio: 'servicio',
    servicios: 'servicios',
    servicioPlural: 'Servicios de Uñas',
    nuevoServicio: 'Nuevo Servicio',
    editarServicio: 'Modificar Servicio',
    placeholderServicio: 'Ej: Kapping, Esculpidas, Semipermanente',

    empleado: 'manicura',
    empleados: 'manicuras',
    empleadoPlural: 'Equipo',
    nuevoEmpleado: 'Nueva Manicura',
    editarEmpleado: 'Editar Perfil',
    placeholderEmpleado: 'Ej: Sofía',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: Nail art, Esculpidas',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos',
    nuevaCita: 'Nuevo Turno',
    proximaCita: 'Próximo Turno',
    citasRegistradas: 'Turnos Registrados',
    citasAsignadas: 'Turnos del Día',
    confirmarCita: 'Confirmar Turno',

    cliente: 'clienta',
    clientes: 'clientas',
    clientePlural: 'Base de Clientas',

    paso1Titulo: 'Elegí tu servicio',
    paso2Titulo: '¿Con quién querés atenderte?',
    paso2Volver: 'Servicios',
    paso3Volver: 'Profesional',
    paso4Titulo: 'Tus Datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Turno',
    exitoTitulo: '¡Turno Confirmado!',
    exitoMensaje: 'Tu turno para el',
    exitoMensaje2: 'quedó reservado.',
    nuevaReservaBtn: 'Nuevo Turno',
    avanzarBtn: 'Confirmar Horario',
    confirmarBtn: 'Confirmar Turno',

    campoExtra: false,

    monitorTurnos: 'Turnos Próximos',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Pedido',
    accionNueva: 'Nuevo Turno',
    accionServicio: 'Agregar Servicio',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link para que saquen turno solas.',
    shareWA: 'Sacá tu turno en',

    tabServicios: 'Servicios',
    tabStaff: 'Equipo',
    tabClientes: 'Clientas',
    filtroTodos: 'Todas',
    seleccionarServicio: 'Seleccionar Servicio',
    seleccionarEmpleado: 'Seleccionar Profesional',
    labelServicioRequerido: 'Servicio',
    labelEmpleado: 'Profesional',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu turno${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmado. ¡Te esperamos!`,

    usarIconoCustom: false,
    iconoServicio: 'M9.5 3A1.5 1.5 0 008 4.5v9a4 4 0 008 0v-9A1.5 1.5 0 0014.5 3h-5z',
  },

  // ===== GIMNASIO / ENTRENAMIENTO =====
  'Gimnasio / Entrenamiento': {
    servicio: 'clase',
    servicios: 'clases',
    servicioPlural: 'Clases y Entrenamientos',
    nuevoServicio: 'Nueva Clase',
    editarServicio: 'Modificar Clase',
    placeholderServicio: 'Ej: Funcional, Spinning, Personalizado',

    empleado: 'profesor',
    empleados: 'profesores',
    empleadoPlural: 'Profesores',
    nuevoEmpleado: 'Nuevo Profesor',
    editarEmpleado: 'Editar Profesor',
    placeholderEmpleado: 'Ej: Nicolás',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: Musculación, Crossfit',

    turno: 'clase',
    turnos: 'clases',
    turnoPlural: 'Clases Agendadas',
    nuevaCita: 'Nueva Clase',
    proximaCita: 'Próxima Clase',
    citasRegistradas: 'Clases Registradas',
    citasAsignadas: 'Clases del Día',
    confirmarCita: 'Confirmar Clase',

    cliente: 'alumno',
    clientes: 'alumnos',
    clientePlural: 'Base de Alumnos',

    paso1Titulo: 'Elegí tu clase',
    paso2Titulo: '¿Con qué profesor?',
    paso2Volver: 'Clases',
    paso3Volver: 'Profesor',
    paso4Titulo: 'Tus Datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Clase Reservada',
    exitoTitulo: '¡Lugar Reservado!',
    exitoMensaje: 'Tu clase del',
    exitoMensaje2: 'quedó confirmada.',
    nuevaReservaBtn: 'Reservar Otra',
    avanzarBtn: 'Confirmar Horario',
    confirmarBtn: 'Reservar Lugar',

    campoExtra: false,

    monitorTurnos: 'Clases Próximas',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Elegida',
    accionNueva: 'Nueva Clase',
    accionServicio: 'Agregar Clase',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link para que reserven su lugar en las clases.',
    shareWA: 'Reservá tu lugar en',

    tabServicios: 'Clases',
    tabStaff: 'Profesores',
    tabClientes: 'Alumnos',
    filtroTodos: 'Todos',
    seleccionarServicio: 'Seleccionar Clase',
    seleccionarEmpleado: 'Seleccionar Profesor',
    labelServicioRequerido: 'Clase',
    labelEmpleado: 'Profesor',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu lugar${servicio ? ` en ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmado. ¡Te esperamos!`,

    usarIconoCustom: true,
    iconoServicio: 'M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z',
  },

  // ===== TATUAJES / PIERCINGS =====
  'Tatuajes / Piercings': {
    servicio: 'sesión',
    servicios: 'sesiones',
    servicioPlural: 'Tipos de Sesión',
    nuevoServicio: 'Nuevo Tipo de Sesión',
    editarServicio: 'Modificar Sesión',
    placeholderServicio: 'Ej: Tattoo chico, Retoque, Piercing',

    empleado: 'artista',
    empleados: 'artistas',
    empleadoPlural: 'Artistas',
    nuevoEmpleado: 'Nuevo Artista',
    editarEmpleado: 'Editar Artista',
    placeholderEmpleado: 'Ej: Juan',
    especialidad: 'Estilo',
    placeholderEspecialidad: 'Ej: Blackwork, Realismo, Fineline',

    turno: 'sesión',
    turnos: 'sesiones',
    turnoPlural: 'Sesiones',
    nuevaCita: 'Nueva Sesión',
    proximaCita: 'Próxima Sesión',
    citasRegistradas: 'Sesiones Registradas',
    citasAsignadas: 'Sesiones del Día',
    confirmarCita: 'Confirmar Sesión',

    cliente: 'cliente',
    clientes: 'clientes',
    clientePlural: 'Base de Clientes',

    paso1Titulo: '¿Qué te querés hacer?',
    paso2Titulo: 'Elegí tu artista',
    paso2Volver: 'Sesiones',
    paso3Volver: 'Artista',
    paso4Titulo: 'Tus Datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Sesión',
    exitoTitulo: '¡Sesión Reservada!',
    exitoMensaje: 'Tu sesión del',
    exitoMensaje2: 'quedó confirmada.',
    nuevaReservaBtn: 'Nueva Sesión',
    avanzarBtn: 'Confirmar Horario',
    confirmarBtn: 'Reservar Sesión',

    campoExtra: true,
    campoExtraLabel: 'Idea / Zona del cuerpo',
    campoExtraPlaceholder: 'Ej: Antebrazo, línea fina',
    campoExtraTipo: 'text',

    monitorTurnos: 'Sesiones Próximas',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Pedido',
    accionNueva: 'Nueva Sesión',
    accionServicio: 'Agregar Sesión',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link para que reserven su sesión.',
    shareWA: 'Reservá tu sesión en',

    tabServicios: 'Sesiones',
    tabStaff: 'Artistas',
    tabClientes: 'Clientes',
    filtroTodos: 'Todos',
    seleccionarServicio: 'Seleccionar Sesión',
    seleccionarEmpleado: 'Seleccionar Artista',
    labelServicioRequerido: 'Tipo de Sesión',
    labelEmpleado: 'Artista',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu sesión${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmada. ¡Te esperamos!`,

    usarIconoCustom: false,
    iconoServicio: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },

  // ===== TALLER / SERVICIO TÉCNICO =====
  'Taller / Servicio Técnico': {
    servicio: 'servicio',
    servicios: 'servicios',
    servicioPlural: 'Servicios del Taller',
    nuevoServicio: 'Nuevo Servicio',
    editarServicio: 'Modificar Servicio',
    placeholderServicio: 'Ej: Cambio de aceite, Diagnóstico',

    empleado: 'puesto',
    empleados: 'puestos',
    empleadoPlural: 'Puestos / Técnicos',
    nuevoEmpleado: 'Nuevo Puesto',
    editarEmpleado: 'Editar Puesto',
    placeholderEmpleado: 'Ej: Box 1, Técnico Martín',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: Mecánica general, Electricidad',

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

    paso1Titulo: '¿Qué necesitás?',
    paso2Titulo: 'Elegí el puesto',
    paso2Volver: 'Servicios',
    paso3Volver: 'Puesto',
    paso4Titulo: 'Tus Datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Turno',
    exitoTitulo: '¡Turno Confirmado!',
    exitoMensaje: 'Tu turno del',
    exitoMensaje2: 'quedó reservado.',
    nuevaReservaBtn: 'Nuevo Turno',
    avanzarBtn: 'Confirmar Horario',
    confirmarBtn: 'Confirmar Turno',

    campoExtra: true,
    campoExtraLabel: 'Marca y modelo',
    campoExtraPlaceholder: 'Ej: Gol Trend 2015',
    campoExtraTipo: 'text',

    monitorTurnos: 'Turnos Próximos',
    monitorIngresos: 'Ingresos Proyec.',
    monitorSemana: 'Esta Semana',
    monitorPopular: 'Más Pedido',
    accionNueva: 'Nuevo Turno',
    accionServicio: 'Agregar Servicio',
    actividadReciente: 'Actividad Reciente',
    linkDescripcion: 'Compartí este link para que saquen turno sin llamarte.',
    shareWA: 'Sacá tu turno en',

    tabServicios: 'Servicios',
    tabStaff: 'Puestos',
    tabClientes: 'Clientes',
    filtroTodos: 'Todos',
    seleccionarServicio: 'Seleccionar Servicio',
    seleccionarEmpleado: 'Seleccionar Puesto',
    labelServicioRequerido: 'Servicio',
    labelEmpleado: 'Puesto',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu turno${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmado. ¡Te esperamos!`,

    usarIconoCustom: false,
    iconoServicio: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z',
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

    tabServicios: 'Servicios',
    tabStaff: 'Staff',
    tabClientes: 'Clientes',
    filtroTodos: 'Staff Completo',
    seleccionarServicio: 'Seleccionar Servicio',
    seleccionarEmpleado: 'Seleccionar Profesional',
    labelServicioRequerido: 'Servicio Requerido',
    labelEmpleado: 'Especialista',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu cita${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmada. ¡Te esperamos!`,

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

    tabServicios: 'Tratamientos',
    tabStaff: 'Profesionales',
    tabClientes: 'Pacientes',
    filtroTodos: 'Todo el Equipo',
    seleccionarServicio: 'Seleccionar Tratamiento',
    seleccionarEmpleado: 'Seleccionar Profesional',
    labelServicioRequerido: 'Tratamiento',
    labelEmpleado: 'Profesional',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu cita${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmada. ¡Te esperamos!`,

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

    tabServicios: 'Consultas',
    tabStaff: 'Veterinarios',
    tabClientes: 'Tutores',
    filtroTodos: 'Todos',
    seleccionarServicio: 'Seleccionar Consulta',
    seleccionarEmpleado: 'Seleccionar Veterinario',
    labelServicioRequerido: 'Tipo de Consulta',
    labelEmpleado: 'Veterinario',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu turno${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmado. ¡Te esperamos!`,

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

    tabServicios: 'Consultas',
    tabStaff: 'Profesionales',
    tabClientes: 'Pacientes',
    filtroTodos: 'Todo el Equipo',
    seleccionarServicio: 'Seleccionar Consulta',
    seleccionarEmpleado: 'Seleccionar Profesional',
    labelServicioRequerido: 'Tipo de Consulta',
    labelEmpleado: 'Profesional',
    fallbackStaff: 'Sin asignar',
    waConfirmacion: (nombre, servicio, fecha, hora) =>
      `Hola ${nombre}, tu turno${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmado. ¡Te esperamos!`,

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

  tabServicios: 'Servicios',
  tabStaff: 'Staff',
  tabClientes: 'Clientes',
  filtroTodos: 'Todos',
  seleccionarServicio: 'Seleccionar Servicio',
  seleccionarEmpleado: 'Seleccionar Recurso',
  labelServicioRequerido: 'Servicio Requerido',
  labelEmpleado: 'Recurso',
  fallbackStaff: 'Sin asignar',
  waConfirmacion: (nombre, servicio, fecha, hora) =>
    `Hola ${nombre}, tu reserva${servicio ? ` de ${servicio}` : ''} el ${fecha} a las ${hora} hs está confirmada. ¡Te esperamos!`,

  usarIconoCustom: false,
  iconoServicio: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
}

/**
 * Normaliza un rubro para poder compararlo: sin acentos, en minúsculas y sin
 * espacios de más alrededor de la barra.
 *
 * La búsqueda era `VOCABULARIOS[rubro]`, una coincidencia exacta. Alcanzaba
 * con que el rubro guardado en la base tuviera otra tilde, otra mayúscula o un
 * espacio distinto ("Barberia / Peluqueria") para que TODO el vocabulario
 * cayera al genérico: el cliente veía "Seleccione un recurso" en vez de
 * "Seleccione un especialista".
 */
function normalizarRubro(rubro) {
  return String(rubro || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // saca acentos
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')         // "A / B" -> "a/b"
    .replace(/\s+/g, ' ')
    .trim()
}

// Índice normalizado -> vocabulario, construido una sola vez.
const INDICE_VOCABULARIOS = Object.fromEntries(
  Object.entries(VOCABULARIOS).map(([clave, valor]) => [normalizarRubro(clave), valor])
)

/**
 * Rubros escritos de otra forma (versiones viejas de la app, o cargados a
 * mano) que apuntan a un vocabulario existente.
 */
const ALIAS_RUBROS = {
  'barberia': 'Barbería / Peluquería',
  'peluqueria': 'Barbería / Peluquería',
  'barberia/peluqueria': 'Barbería / Peluquería',
  'restaurante': 'Restaurante / Gastronomía',
  'gastronomia': 'Restaurante / Gastronomía',
  'bar': 'Bar / Cervecería',
  'cerveceria': 'Bar / Cervecería',
  'estetica': 'Centro de Estética',
  'centro de estetica': 'Centro de Estética',
  'spa': 'Centro de Estética',
  'unas': 'Uñas / Manicuría',
  'manicuria': 'Uñas / Manicuría',
  'nails': 'Uñas / Manicuría',
  'tatuajes': 'Tatuajes / Piercings',
  'tattoo': 'Tatuajes / Piercings',
  'gimnasio': 'Gimnasio / Entrenamiento',
  'gym': 'Gimnasio / Entrenamiento',
  'veterinaria': 'Veterinaria',
  'salud': 'Salud / Clínica',
  'clinica': 'Salud / Clínica',
  'consultorio': 'Salud / Clínica',
  'taller': 'Taller / Servicio Técnico',
  'servicio tecnico': 'Taller / Servicio Técnico',
}

/**
 * Obtiene el vocabulario del negocio según su rubro.
 * Tolera diferencias de acentos, mayúsculas y espaciado.
 * @param {string} rubro - El rubro del negocio (ej: "Restaurante / Gastronomía")
 * @returns {Object} Objeto con toda la terminología adaptada
 */
export function getVocabulario(rubro) {
  const clave = normalizarRubro(rubro)
  if (!clave) return VOCABULARIO_DEFAULT

  const exacto = INDICE_VOCABULARIOS[clave]
  if (exacto) return exacto

  const porAlias = ALIAS_RUBROS[clave]
  if (porAlias) return VOCABULARIOS[porAlias]

  // Último intento: que el rubro guardado contenga (o esté contenido en) uno
  // conocido. Cubre casos como "Barbería Premium" o "Bar".
  const parcial = Object.keys(INDICE_VOCABULARIOS).find(
    (k) => k.includes(clave) || clave.includes(k.split('/')[0])
  )
  return parcial ? INDICE_VOCABULARIOS[parcial] : VOCABULARIO_DEFAULT
}

/**
 * Lista de rubros disponibles para el onboarding
 */
export const RUBROS_DISPONIBLES = [
  'Barbería / Peluquería',
  'Uñas / Manicuría',
  'Centro de Estética',
  'Tatuajes / Piercings',
  'Restaurante / Gastronomía',
  'Bar / Cervecería',
  'Gimnasio / Entrenamiento',
  'Veterinaria',
  'Salud / Clínica',
  'Taller / Servicio Técnico',
  'Otros Servicios',
]

/**
 * Detecta si un rubro es de tipo gastronómico (pide cantidad de comensales).
 */
export function esGastronomia(rubro) {
  const v = getVocabulario(rubro)
  return v === VOCABULARIOS['Restaurante / Gastronomía'] || v === VOCABULARIOS['Bar / Cervecería']
}

/**
 * ¿El rubro pide un dato extra en el formulario público?
 * (comensales, modelo del auto, idea del tatuaje...)
 */
export function tieneCampoExtra(rubro) {
  return Boolean(getVocabulario(rubro).campoExtra)
}
