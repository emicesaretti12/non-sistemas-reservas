/**
 * Curvas de movimiento.
 *
 * Un solo lugar para los resortes y las transiciones, así todo lo que se
 * mueve en la app se mueve igual. Los valores están elegidos para que el
 * resorte llegue casi sin rebote: un sobrepaso mínimo se lee como algo
 * físico, uno grande se lee como una animación.
 *
 * La regla práctica: cuanto más chica es la pieza, más rígido el resorte.
 * Un chip tiene que llegar antes que una hoja de media pantalla.
 */

/** Panel, hoja o modal: recorre mucho, llega firme. */
export const RESORTE_PANEL = { type: 'spring', stiffness: 320, damping: 36, mass: 0.9 }

/** Tarjeta, fila o bloque de contenido. */
export const RESORTE = { type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }

/** Chip, insignia, ícono: entra y frena enseguida. */
export const RESORTE_CORTO = { type: 'spring', stiffness: 560, damping: 30, mass: 0.7 }

/** Para opacidad y color, donde un resorte no aporta nada. */
export const SUAVE = { duration: 0.22, ease: [0.32, 0.72, 0, 1] }
export const SUAVE_LENTO = { duration: 0.34, ease: [0.32, 0.72, 0, 1] }

/** Entrada estándar de una pieza: sube 8px y aparece. */
export const ENTRADA = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: RESORTE,
}

/** Escalón entre hermanos, en segundos. Más de diez piezas no escalonan. */
export const escalon = (i, paso = 0.04) => Math.min(i, 9) * paso

export default { RESORTE, RESORTE_PANEL, RESORTE_CORTO, SUAVE, SUAVE_LENTO, ENTRADA, escalon }
