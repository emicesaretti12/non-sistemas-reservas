/**
 * Paleta de marca de Noni.
 *
 * Toda la app se pinta con dos colores: el papel (#FCF6F5) y la marca
 * (#990011). Lo único que cada negocio puede mover es el acento de su app
 * pública, y para que nunca se salga del sistema sólo ofrecemos mezclas de
 * esos dos colores.
 *
 * Son nueve tonos, del más profundo al más claro, más el selector libre: así
 * entran justo en dos filas de cinco.
 */
export const PALETA_MARCA = [
  '#8A000F',
  '#990011',
  '#A31928',
  '#AF3643',
  '#B3404C',
  '#B94F5A',
  '#C56C75',
  '#CC8088',
  '#D08A91',
]

export const COLOR_MARCA = '#990011'
export const COLOR_PAPEL = '#FCF6F5'

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
