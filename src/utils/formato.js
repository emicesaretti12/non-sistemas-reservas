/**
 * Formateadores de fechas, horas y precios, creados una sola vez.
 *
 * `toLocaleDateString(…)`, `toLocaleTimeString(…)` y `toLocaleString(…)` con
 * idioma u opciones arman un formateador de Intl nuevo en cada llamada, y eso
 * es caro: en la agenda se llamaban una vez por día del calendario y dos por
 * cada turno de la lista, y cambiar de sección pasaba más de 100 ms sólo
 * armando formateadores. Acá se arma cada uno la primera vez que se pide y
 * después se reutiliza.
 */

const cache = new Map()

function formateador(idioma, opciones) {
  const clave = idioma + JSON.stringify(opciones)
  let f = cache.get(clave)
  if (!f) {
    f = new Intl.DateTimeFormat(idioma, opciones)
    cache.set(clave, f)
  }
  return f
}

const aFecha = (valor) => (valor instanceof Date ? valor : new Date(valor))

/** Fecha con las opciones de `Intl.DateTimeFormat`, en español. */
export function fecha(valor, opciones, idioma = 'es-ES') {
  return formateador(idioma, opciones).format(aFecha(valor))
}

/** "09:30", en 24 horas. */
export function hora(valor) {
  return formateador('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(aFecha(valor))
}

const numeros = new Map()

/** Número con separador de miles argentino: 12.500 */
export function numero(valor, decimales = 0) {
  let f = numeros.get(decimales)
  if (!f) {
    f = new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    numeros.set(decimales, f)
  }
  return f.format(Number(valor) || 0)
}

/** Precio: $12.500 */
export const pesos = (valor) => `$${numero(valor)}`
