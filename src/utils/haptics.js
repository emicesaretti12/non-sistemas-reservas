/**
 * Vibración corta al tocar. Es lo que separa un botón web de uno de app:
 * el dedo recibe una respuesta física además de la visual.
 *
 * `navigator.vibrate` no existe en iOS Safari ni en escritorio, así que la
 * función es deliberadamente silenciosa cuando no está disponible: nunca
 * debe romper un handler de click.
 */

const PATRONES = {
  tap: 8,
  select: 12,
  success: [10, 40, 18],
  warning: [14, 50, 14],
  error: [22, 60, 22],
}

let habilitado = true

/** Permite apagar la vibración (por ejemplo desde ajustes). */
export function setHapticsEnabled(valor) {
  habilitado = Boolean(valor)
}

export function haptic(tipo = 'tap') {
  if (!habilitado) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  // Quien pidió "reducir movimiento" suele agradecer también menos vibración.
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate(PATRONES[tipo] ?? PATRONES.tap)
  } catch {
    // Algunos navegadores tiran si el gesto no vino del usuario: se ignora.
  }
}

export default haptic
