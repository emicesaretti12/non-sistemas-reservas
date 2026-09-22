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
    servicioPlural: 'Experiencias gastronómicas',
    nuevoServicio: 'Nueva experiencia',
    editarServicio: 'Modificar experiencia',
    placeholderServicio: 'Ej: mesa para 2, cena VIP, brunch especial',

    empleado: 'zona',
    empleados: 'zonas',
    empleadoPlural: 'Zonas y salones',
    nuevoEmpleado: 'Nueva zona',
    editarEmpleado: 'Editar zona',
    placeholderEmpleado: 'Ej: salón principal, terraza, VIP',
    especialidad: 'Descripción',
    placeholderEspecialidad: 'Ej: interior con aire, al aire libre, zona fumadores',

    turno: 'reserva',
    turnos: 'reservas',
    turnoPlural: 'Reservas de mesa',
    nuevaCita: 'Nueva reserva',
    proximaCita: 'Próxima reserva',
    citasRegistradas: 'Reservas registradas',
    citasAsignadas: 'Reservas del día',
    confirmarCita: 'Confirmar reserva',
    
    cliente: 'comensal',
    clientes: 'comensales',
    clientePlural: 'Base de comensales',

    // Labels del flujo público
    paso1Titulo: 'Elegí una experiencia',
    paso2Titulo: 'Zona del restaurante',
    paso2Volver: 'Experiencias',
    paso3Volver: 'Zona',
    paso4Titulo: 'Datos de la reserva',
    paso4Volver: 'Horario',
    ticketTitulo: 'Reserva de mesa',
    exitoTitulo: 'Reserva confirmada',
    exitoMensaje: 'Tu reserva para el',
    exitoMensaje2: 'ha sido procesada.',
    nuevaReservaBtn: 'Nueva reserva',
    avanzarBtn: 'Confirmar horario',
    confirmarBtn: 'Confirmar reserva',

    // Campo extra
    campoExtra: true,
    campoExtraLabel: 'Cantidad de comensales',
    campoExtraPlaceholder: 'Ej: 4',
    campoExtraTipo: 'number',

    // Labels del Dashboard
    monitorTurnos: 'Reservas próximas',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más reservada',
    accionNueva: 'Nueva reserva',
    accionServicio: 'Agregar experiencia',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link con tus clientes para que reserven mesa online.',
    shareWA: 'Reservá tu mesa en',

    // Tabs y Navegación
    tabServicios: 'Experiencias',
    tabStaff: 'Zonas',
    tabClientes: 'Comensales',
    filtroTodos: 'Todas las zonas',
    seleccionarServicio: 'Seleccionar experiencia',
    seleccionarEmpleado: 'Seleccionar zona',
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
    servicioPlural: 'Mesas y espacios',
    nuevoServicio: 'Nuevo tipo de mesa',
    editarServicio: 'Modificar mesa',
    placeholderServicio: 'Ej: mesa alta para 4, barra, reservado',

    empleado: 'sector',
    empleados: 'sectores',
    empleadoPlural: 'Sectores del bar',
    nuevoEmpleado: 'Nuevo sector',
    editarEmpleado: 'Editar sector',
    placeholderEmpleado: 'Ej: barra, patio, planta alta',
    especialidad: 'Descripción',
    placeholderEspecialidad: 'Ej: al aire libre, con pantalla, techado',

    turno: 'reserva',
    turnos: 'reservas',
    turnoPlural: 'Reservas',
    nuevaCita: 'Nueva reserva',
    proximaCita: 'Próxima reserva',
    citasRegistradas: 'Reservas registradas',
    citasAsignadas: 'Reservas de la noche',
    confirmarCita: 'Confirmar reserva',

    cliente: 'cliente',
    clientes: 'clientes',
    clientePlural: 'Base de clientes',

    paso1Titulo: '¿Qué mesa querés reservar?',
    paso2Titulo: 'Elegí el sector',
    paso2Volver: 'Mesas',
    paso3Volver: 'Sector',
    paso4Titulo: 'Datos de la reserva',
    paso4Volver: 'Horario',
    ticketTitulo: 'Reserva',
    exitoTitulo: '¡Mesa reservada!',
    exitoMensaje: 'Tu reserva para el',
    exitoMensaje2: 'quedó confirmada.',
    nuevaReservaBtn: 'Nueva reserva',
    avanzarBtn: 'Confirmar horario',
    confirmarBtn: 'Reservar mesa',

    campoExtra: true,
    campoExtraLabel: 'Cantidad de personas',
    campoExtraPlaceholder: 'Ej: 6',
    campoExtraTipo: 'number',

    monitorTurnos: 'Reservas próximas',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más reservada',
    accionNueva: 'Nueva reserva',
    accionServicio: 'Agregar mesa',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link para que reserven mesa sin llamarte.',
    shareWA: 'Reservá tu mesa en',

    tabServicios: 'Mesas',
    tabStaff: 'Sectores',
    tabClientes: 'Clientes',
    filtroTodos: 'Todos los sectores',
    seleccionarServicio: 'Seleccionar mesa',
    seleccionarEmpleado: 'Seleccionar sector',
    labelServicioRequerido: 'Tipo de mesa',
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
    servicioPlural: 'Servicios de uñas',
    nuevoServicio: 'Nuevo servicio',
    editarServicio: 'Modificar servicio',
    placeholderServicio: 'Ej: kapping, esculpidas, semipermanente',

    empleado: 'manicura',
    empleados: 'manicuras',
    empleadoPlural: 'Equipo',
    nuevoEmpleado: 'Nueva manicura',
    editarEmpleado: 'Editar perfil',
    placeholderEmpleado: 'Ej: sofía',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: nail art, esculpidas',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos',
    nuevaCita: 'Nuevo turno',
    proximaCita: 'Próximo turno',
    citasRegistradas: 'Turnos registrados',
    citasAsignadas: 'Turnos del día',
    confirmarCita: 'Confirmar turno',

    cliente: 'clienta',
    clientes: 'clientas',
    clientePlural: 'Base de clientas',

    paso1Titulo: 'Elegí tu servicio',
    paso2Titulo: '¿Con quién querés atenderte?',
    paso2Volver: 'Servicios',
    paso3Volver: 'Profesional',
    paso4Titulo: 'Tus datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Turno',
    exitoTitulo: '¡Turno confirmado!',
    exitoMensaje: 'Tu turno para el',
    exitoMensaje2: 'quedó reservado.',
    nuevaReservaBtn: 'Nuevo turno',
    avanzarBtn: 'Confirmar horario',
    confirmarBtn: 'Confirmar turno',

    campoExtra: false,

    monitorTurnos: 'Turnos próximos',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más pedido',
    accionNueva: 'Nuevo turno',
    accionServicio: 'Agregar servicio',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link para que saquen turno solas.',
    shareWA: 'Sacá tu turno en',

    tabServicios: 'Servicios',
    tabStaff: 'Equipo',
    tabClientes: 'Clientas',
    filtroTodos: 'Todas',
    seleccionarServicio: 'Seleccionar servicio',
    seleccionarEmpleado: 'Seleccionar profesional',
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
    servicioPlural: 'Clases y entrenamientos',
    nuevoServicio: 'Nueva clase',
    editarServicio: 'Modificar clase',
    placeholderServicio: 'Ej: funcional, spinning, personalizado',

    empleado: 'profesor',
    empleados: 'profesores',
    empleadoPlural: 'Profesores',
    nuevoEmpleado: 'Nuevo profesor',
    editarEmpleado: 'Editar profesor',
    placeholderEmpleado: 'Ej: nicolás',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: musculación, crossfit',

    turno: 'clase',
    turnos: 'clases',
    turnoPlural: 'Clases agendadas',
    nuevaCita: 'Nueva clase',
    proximaCita: 'Próxima clase',
    citasRegistradas: 'Clases registradas',
    citasAsignadas: 'Clases del día',
    confirmarCita: 'Confirmar clase',

    cliente: 'alumno',
    clientes: 'alumnos',
    clientePlural: 'Base de alumnos',

    paso1Titulo: 'Elegí tu clase',
    paso2Titulo: '¿Con qué profesor?',
    paso2Volver: 'Clases',
    paso3Volver: 'Profesor',
    paso4Titulo: 'Tus datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Clase reservada',
    exitoTitulo: '¡Lugar reservado!',
    exitoMensaje: 'Tu clase del',
    exitoMensaje2: 'quedó confirmada.',
    nuevaReservaBtn: 'Reservar otra',
    avanzarBtn: 'Confirmar horario',
    confirmarBtn: 'Reservar lugar',

    campoExtra: false,

    monitorTurnos: 'Clases próximas',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más elegida',
    accionNueva: 'Nueva clase',
    accionServicio: 'Agregar clase',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link para que reserven su lugar en las clases.',
    shareWA: 'Reservá tu lugar en',

    tabServicios: 'Clases',
    tabStaff: 'Profesores',
    tabClientes: 'Alumnos',
    filtroTodos: 'Todos',
    seleccionarServicio: 'Seleccionar clase',
    seleccionarEmpleado: 'Seleccionar profesor',
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
    servicioPlural: 'Tipos de sesión',
    nuevoServicio: 'Nuevo tipo de sesión',
    editarServicio: 'Modificar sesión',
    placeholderServicio: 'Ej: tattoo chico, retoque, piercing',

    empleado: 'artista',
    empleados: 'artistas',
    empleadoPlural: 'Artistas',
    nuevoEmpleado: 'Nuevo artista',
    editarEmpleado: 'Editar artista',
    placeholderEmpleado: 'Ej: juan',
    especialidad: 'Estilo',
    placeholderEspecialidad: 'Ej: blackwork, realismo, fineline',

    turno: 'sesión',
    turnos: 'sesiones',
    turnoPlural: 'Sesiones',
    nuevaCita: 'Nueva sesión',
    proximaCita: 'Próxima sesión',
    citasRegistradas: 'Sesiones registradas',
    citasAsignadas: 'Sesiones del día',
    confirmarCita: 'Confirmar sesión',

    cliente: 'cliente',
    clientes: 'clientes',
    clientePlural: 'Base de clientes',

    paso1Titulo: '¿Qué te querés hacer?',
    paso2Titulo: 'Elegí tu artista',
    paso2Volver: 'Sesiones',
    paso3Volver: 'Artista',
    paso4Titulo: 'Tus datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Sesión',
    exitoTitulo: '¡Sesión reservada!',
    exitoMensaje: 'Tu sesión del',
    exitoMensaje2: 'quedó confirmada.',
    nuevaReservaBtn: 'Nueva sesión',
    avanzarBtn: 'Confirmar horario',
    confirmarBtn: 'Reservar sesión',

    campoExtra: true,
    campoExtraLabel: 'Idea / Zona del cuerpo',
    campoExtraPlaceholder: 'Ej: antebrazo, línea fina',
    campoExtraTipo: 'text',

    monitorTurnos: 'Sesiones próximas',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más pedido',
    accionNueva: 'Nueva sesión',
    accionServicio: 'Agregar sesión',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link para que reserven su sesión.',
    shareWA: 'Reservá tu sesión en',

    tabServicios: 'Sesiones',
    tabStaff: 'Artistas',
    tabClientes: 'Clientes',
    filtroTodos: 'Todos',
    seleccionarServicio: 'Seleccionar sesión',
    seleccionarEmpleado: 'Seleccionar artista',
    labelServicioRequerido: 'Tipo de sesión',
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
    servicioPlural: 'Servicios del taller',
    nuevoServicio: 'Nuevo servicio',
    editarServicio: 'Modificar servicio',
    placeholderServicio: 'Ej: cambio de aceite, diagnóstico',

    empleado: 'puesto',
    empleados: 'puestos',
    empleadoPlural: 'Puestos / Técnicos',
    nuevoEmpleado: 'Nuevo puesto',
    editarEmpleado: 'Editar puesto',
    placeholderEmpleado: 'Ej: box 1, técnico martín',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: mecánica general, electricidad',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos',
    nuevaCita: 'Nuevo turno',
    proximaCita: 'Próximo turno',
    citasRegistradas: 'Turnos registrados',
    citasAsignadas: 'Turnos del día',
    confirmarCita: 'Confirmar turno',

    cliente: 'cliente',
    clientes: 'clientes',
    clientePlural: 'Base de clientes',

    paso1Titulo: '¿Qué necesitás?',
    paso2Titulo: 'Elegí el puesto',
    paso2Volver: 'Servicios',
    paso3Volver: 'Puesto',
    paso4Titulo: 'Tus datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Turno',
    exitoTitulo: '¡Turno confirmado!',
    exitoMensaje: 'Tu turno del',
    exitoMensaje2: 'quedó reservado.',
    nuevaReservaBtn: 'Nuevo turno',
    avanzarBtn: 'Confirmar horario',
    confirmarBtn: 'Confirmar turno',

    campoExtra: true,
    campoExtraLabel: 'Marca y modelo',
    campoExtraPlaceholder: 'Ej: gol trend 2015',
    campoExtraTipo: 'text',

    monitorTurnos: 'Turnos próximos',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más pedido',
    accionNueva: 'Nuevo turno',
    accionServicio: 'Agregar servicio',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link para que saquen turno sin llamarte.',
    shareWA: 'Sacá tu turno en',

    tabServicios: 'Servicios',
    tabStaff: 'Puestos',
    tabClientes: 'Clientes',
    filtroTodos: 'Todos',
    seleccionarServicio: 'Seleccionar servicio',
    seleccionarEmpleado: 'Seleccionar puesto',
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
    servicioPlural: 'Catálogo de servicios',
    nuevoServicio: 'Nuevo servicio',
    editarServicio: 'Modificar actividad',
    placeholderServicio: 'Ej: corte clásico, barba premium',

    empleado: 'especialista',
    empleados: 'especialistas',
    empleadoPlural: 'Especialistas',
    nuevoEmpleado: 'Nuevo especialista',
    editarEmpleado: 'Editar perfil',
    placeholderEmpleado: 'Ej: carlos lópez',
    especialidad: 'Especialidad / Rol',
    placeholderEspecialidad: 'Ej: barbero senior, colorista',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos',
    nuevaCita: 'Nueva cita',
    proximaCita: 'Próxima cita',
    citasRegistradas: 'Citas registradas',
    citasAsignadas: 'Citas asignadas',
    confirmarCita: 'Confirmar cita',
    
    cliente: 'cliente',
    clientes: 'clientes',
    clientePlural: 'Base de clientes',

    paso1Titulo: 'Elegí un servicio',
    paso2Titulo: 'Especialista',
    paso2Volver: 'Servicios',
    paso3Volver: 'Personal',
    paso4Titulo: 'Tus datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Ticket de cita',
    exitoTitulo: 'Confirmado',
    exitoMensaje: 'Tu turno para el',
    exitoMensaje2: 'ha sido procesado.',
    nuevaReservaBtn: 'Nueva reserva',
    avanzarBtn: 'Avanzar al cierre',
    confirmarBtn: 'Confirmar reserva',

    campoExtra: false,

    monitorTurnos: 'Turnos próximos',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más solicitado',
    accionNueva: 'Nueva cita',
    accionServicio: 'Agregar servicio',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link con tus clientes para que reserven online.',
    shareWA: 'Reservá tu turno en',

    tabServicios: 'Servicios',
    tabStaff: 'Staff',
    tabClientes: 'Clientes',
    filtroTodos: 'Staff completo',
    seleccionarServicio: 'Seleccionar servicio',
    seleccionarEmpleado: 'Seleccionar profesional',
    labelServicioRequerido: 'Servicio requerido',
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
    servicioPlural: 'Catálogo de tratamientos',
    nuevoServicio: 'Nuevo tratamiento',
    editarServicio: 'Modificar tratamiento',
    placeholderServicio: 'Ej: limpieza facial, masaje relajante',

    empleado: 'profesional',
    empleados: 'profesionales',
    empleadoPlural: 'Profesionales',
    nuevoEmpleado: 'Nuevo profesional',
    editarEmpleado: 'Editar perfil',
    placeholderEmpleado: 'Ej: dra. maría garcía',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: dermatología, cosmetología',

    turno: 'cita',
    turnos: 'citas',
    turnoPlural: 'Citas',
    nuevaCita: 'Nueva cita',
    proximaCita: 'Próxima cita',
    citasRegistradas: 'Citas registradas',
    citasAsignadas: 'Citas del día',
    confirmarCita: 'Confirmar cita',
    
    cliente: 'paciente',
    clientes: 'pacientes',
    clientePlural: 'Base de pacientes',

    paso1Titulo: 'Elegí un tratamiento',
    paso2Titulo: 'Profesional',
    paso2Volver: 'Tratamientos',
    paso3Volver: 'Profesional',
    paso4Titulo: 'Tus datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Ticket de cita',
    exitoTitulo: 'Confirmado',
    exitoMensaje: 'Tu cita para el',
    exitoMensaje2: 'ha sido procesada.',
    nuevaReservaBtn: 'Nueva cita',
    avanzarBtn: 'Avanzar al cierre',
    confirmarBtn: 'Confirmar cita',

    campoExtra: false,

    monitorTurnos: 'Citas próximas',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más solicitado',
    accionNueva: 'Nueva cita',
    accionServicio: 'Agregar tratamiento',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link con tus pacientes para que agenden online.',
    shareWA: 'Agendá tu cita en',

    tabServicios: 'Tratamientos',
    tabStaff: 'Profesionales',
    tabClientes: 'Pacientes',
    filtroTodos: 'Todo el equipo',
    seleccionarServicio: 'Seleccionar tratamiento',
    seleccionarEmpleado: 'Seleccionar profesional',
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
    servicioPlural: 'Tipos de consulta',
    nuevoServicio: 'Nueva consulta',
    editarServicio: 'Modificar consulta',
    placeholderServicio: 'Ej: consulta general, vacunación, cirugía',

    empleado: 'veterinario',
    empleados: 'veterinarios',
    empleadoPlural: 'Veterinarios',
    nuevoEmpleado: 'Nuevo veterinario',
    editarEmpleado: 'Editar perfil',
    placeholderEmpleado: 'Ej: dr. alejandro sanz',
    especialidad: 'Especialidad',
    placeholderEspecialidad: 'Ej: animales exóticos, cirugía',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos',
    nuevaCita: 'Nuevo turno',
    proximaCita: 'Próximo turno',
    citasRegistradas: 'Turnos registrados',
    citasAsignadas: 'Turnos del día',
    confirmarCita: 'Confirmar turno',
    
    cliente: 'tutor',
    clientes: 'tutores',
    clientePlural: 'Base de tutores',

    paso1Titulo: 'Elegí el tipo de consulta',
    paso2Titulo: 'Veterinario',
    paso2Volver: 'Consultas',
    paso3Volver: 'Veterinario',
    paso4Titulo: 'Tus datos',
    paso4Volver: 'Horario',
    ticketTitulo: 'Ticket de turno',
    exitoTitulo: 'Confirmado',
    exitoMensaje: 'Tu turno para el',
    exitoMensaje2: 'ha sido procesado.',
    nuevaReservaBtn: 'Nuevo turno',
    avanzarBtn: 'Avanzar al cierre',
    confirmarBtn: 'Confirmar turno',

    campoExtra: true,
    campoExtraLabel: 'Nombre de la mascota',
    campoExtraPlaceholder: 'Ej: rocky',
    campoExtraTipo: 'text',

    monitorTurnos: 'Turnos próximos',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más consultado',
    accionNueva: 'Nuevo turno',
    accionServicio: 'Agregar consulta',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link con tus clientes para que saquen turno online.',
    shareWA: 'Sacá tu turno en',

    tabServicios: 'Consultas',
    tabStaff: 'Veterinarios',
    tabClientes: 'Tutores',
    filtroTodos: 'Todos',
    seleccionarServicio: 'Seleccionar consulta',
    seleccionarEmpleado: 'Seleccionar veterinario',
    labelServicioRequerido: 'Tipo de consulta',
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
    servicioPlural: 'Tipos de consulta',
    nuevoServicio: 'Nueva consulta',
    editarServicio: 'Modificar consulta',
    placeholderServicio: 'Ej: consulta general, revisión, especializada',

    empleado: 'profesional',
    empleados: 'profesionales',
    empleadoPlural: 'Profesionales de salud',
    nuevoEmpleado: 'Nuevo profesional',
    editarEmpleado: 'Editar perfil',
    placeholderEmpleado: 'Ej: dr. martínez',
    especialidad: 'Especialidad médica',
    placeholderEspecialidad: 'Ej: cardiología, dermatología',

    turno: 'turno',
    turnos: 'turnos',
    turnoPlural: 'Turnos médicos',
    nuevaCita: 'Nuevo turno',
    proximaCita: 'Próximo turno',
    citasRegistradas: 'Turnos registrados',
    citasAsignadas: 'Turnos del día',
    confirmarCita: 'Confirmar turno',
    
    cliente: 'paciente',
    clientes: 'pacientes',
    clientePlural: 'Base de pacientes',

    paso1Titulo: 'Elegí el tipo de consulta',
    paso2Titulo: 'Profesional',
    paso2Volver: 'Consultas',
    paso3Volver: 'Profesional',
    paso4Titulo: 'Datos del paciente',
    paso4Volver: 'Horario',
    ticketTitulo: 'Ticket de turno',
    exitoTitulo: 'Turno confirmado',
    exitoMensaje: 'Tu turno para el',
    exitoMensaje2: 'ha sido confirmado.',
    nuevaReservaBtn: 'Nuevo turno',
    avanzarBtn: 'Avanzar al cierre',
    confirmarBtn: 'Confirmar turno',

    campoExtra: false,

    monitorTurnos: 'Turnos próximos',
    monitorIngresos: 'Ingresos proyec.',
    monitorSemana: 'Esta semana',
    monitorPopular: 'Más consultado',
    accionNueva: 'Nuevo turno',
    accionServicio: 'Agregar consulta',
    actividadReciente: 'Actividad reciente',
    linkDescripcion: 'Compartí este link con tus pacientes para que saquen turno online.',
    shareWA: 'Sacá tu turno en',

    tabServicios: 'Consultas',
    tabStaff: 'Profesionales',
    tabClientes: 'Pacientes',
    filtroTodos: 'Todo el equipo',
    seleccionarServicio: 'Seleccionar consulta',
    seleccionarEmpleado: 'Seleccionar profesional',
    labelServicioRequerido: 'Tipo de consulta',
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
  servicioPlural: 'Catálogo de servicios',
  nuevoServicio: 'Nuevo servicio',
  editarServicio: 'Modificar servicio',
  placeholderServicio: 'Ej: servicio premium',

  empleado: 'recurso',
  empleados: 'recursos',
  empleadoPlural: 'Recursos / Staff',
  nuevoEmpleado: 'Nuevo recurso',
  editarEmpleado: 'Editar recurso',
  placeholderEmpleado: 'Ej: nombre del recurso',
  especialidad: 'Rol / Especialidad',
  placeholderEspecialidad: 'Ej: descripción del rol',

  turno: 'turno',
  turnos: 'turnos',
  turnoPlural: 'Turnos',
  nuevaCita: 'Nuevo turno',
  proximaCita: 'Próximo turno',
  citasRegistradas: 'Turnos registrados',
  citasAsignadas: 'Turnos del día',
  confirmarCita: 'Confirmar turno',
  
  cliente: 'cliente',
  clientes: 'clientes',
  clientePlural: 'Base de clientes',

  paso1Titulo: 'Elegí un servicio',
  paso2Titulo: 'Elegí un recurso',
  paso2Volver: 'Servicios',
  paso3Volver: 'Recurso',
  paso4Titulo: 'Tus datos',
  paso4Volver: 'Horario',
  ticketTitulo: 'Ticket de reserva',
  exitoTitulo: 'Confirmado',
  exitoMensaje: 'Tu reserva para el',
  exitoMensaje2: 'ha sido procesada.',
  nuevaReservaBtn: 'Nueva reserva',
  avanzarBtn: 'Avanzar al cierre',
  confirmarBtn: 'Confirmar reserva',

  campoExtra: false,

  monitorTurnos: 'Turnos próximos',
  monitorIngresos: 'Ingresos proyec.',
  monitorSemana: 'Esta semana',
  monitorPopular: 'Más popular',
  accionNueva: 'Nuevo turno',
  accionServicio: 'Agregar servicio',
  actividadReciente: 'Actividad reciente',
  linkDescripcion: 'Compartí este link con tus clientes para que reserven online.',
  shareWA: 'Reservá en',

  tabServicios: 'Servicios',
  tabStaff: 'Staff',
  tabClientes: 'Clientes',
  filtroTodos: 'Todos',
  seleccionarServicio: 'Seleccionar servicio',
  seleccionarEmpleado: 'Seleccionar recurso',
  labelServicioRequerido: 'Servicio requerido',
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
  // conocido. Cubre casos como "Barbería premium" o "Bar".
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

/**
 * Pone en mayúscula sólo la primera letra.
 *
 * `text-transform: capitalize` de CSS sube TODAS las palabras, y con las
 * fechas en español eso escribe "Martes, 22 De Septiembre". En español sólo
 * va en mayúscula la primera.
 */
export function mayusculaInicial(texto) {
  if (typeof texto !== 'string' || !texto) return texto
  return texto[0].toUpperCase() + texto.slice(1)
}
