/**
 * Dónde se scrollea.
 *
 * En el celular el panel funciona como una app: el documento queda quieto y
 * lo único que se desplaza es el contenido (`[data-scroller="principal"]`),
 * entre la barra superior y el dock, que no se mueven nunca. En escritorio
 * sigue scrolleando la ventana. Estas funciones esconden esa diferencia.
 */

const SELECTOR = '[data-scroller="principal"]'

/** El contenedor que scrollea, si está activo; si no, `null` (= la ventana). */
export function scrollerPrincipal() {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(SELECTOR)
  if (!el) return null
  const oy = getComputedStyle(el).overflowY
  return oy === 'auto' || oy === 'scroll' || oy === 'hidden' ? el : null
}

export function posicionScroll() {
  const s = scrollerPrincipal()
  return s ? s.scrollTop : window.scrollY
}

export function irArriba({ suave = false } = {}) {
  const s = scrollerPrincipal()
  const destino = s || window
  if (suave) destino.scrollTo({ top: 0, behavior: 'smooth' })
  else destino.scrollTo(0, 0)
}

/** ¿Este evento `scroll` es del contenido principal (o de la ventana)? */
export function esScrollPrincipal(e) {
  const t = e.target
  if (t === document || t === document.documentElement || t === document.body) return true
  return Boolean(t && t.matches?.(SELECTOR))
}

/** Posición del scroll que disparó el evento. */
export function posicionDe(e) {
  const t = e.target
  if (t === document || t === document.documentElement || t === document.body) return window.scrollY
  return t.scrollTop
}
