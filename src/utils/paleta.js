/**
 * Acentos de marca.
 *
 * El panel de Noni siempre se ve igual: gris azulado, blanco y el azul del
 * sistema. Lo único que cada negocio elige es el acento de su app pública de
 * reservas, y para que nunca se salga del sistema la oferta está acotada a
 * nueve tonos del mismo registro: saturación media, luminosidad pareja y
 * suficiente contraste contra el blanco para que el texto encima se lea.
 *
 * Nueve tonos más el selector libre entran justo en dos filas de cinco.
 */
export const PALETA_MARCA = [
  '#007AFF', // azul del sistema — el que viene por defecto
  '#0A66C2', // azul profundo
  '#0E9C9C', // verde azulado
  '#259C5B', // verde
  '#5E8C2A', // oliva
  '#E09112', // ámbar
  '#E06C2A', // naranja quemado
  '#C2456B', // frambuesa
  '#8B5CF6', // violeta
]

export const COLOR_MARCA = '#007AFF'
export const COLOR_PAPEL = '#FFFFFF'
export const COLOR_TINTA = '#1D212A'

/** Normaliza lo que venga de la base a un hex de 6 dígitos usable. */
export function colorSeguro(valor, porDefecto = COLOR_MARCA) {
  if (typeof valor !== 'string') return porDefecto
  const limpio = valor.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(limpio)) return limpio.toUpperCase()
  if (/^#[0-9a-fA-F]{3}$/.test(limpio)) {
    const [, r, g, b] = limpio
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return porDefecto
}

export default PALETA_MARCA
