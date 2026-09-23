import { useEffect } from 'react'

/**
 * Luz bajo el dedo, delegada a todo el documento.
 *
 * Se monta una sola vez en lugar de envolver cada botón: los botones, las
 * tarjetas tocables y los ítems de la hoja "Más" se iluminan donde apoyás el
 * dedo y la luz te sigue mientras arrastrás, como el vidrio de iOS 26. Al
 * soltar se apaga.
 *
 * Sin onda expansiva (eso es de Android y se leía como web) y sin tocar la
 * navegación: el dock, las pestañas y la barra lateral no se iluminan ni
 * cambian de tamaño al tocarlos.
 *
 * La luz vive dentro de un `<span class="ui-ripple__clip">` que recorta con
 * el mismo radio del botón, sin cortar los globitos que sobresalen.
 */

// Tarjetas y chips sólo cuando son tocables: una etiqueta de estado que se
// ilumina al tocarla promete una acción que no existe.
const SELECTOR = [
  '.ui-btn', '.ui-icon-btn', '.nh-action', '.nh-slot', '[data-ripple]', '.ns-mas__item', '.ns-mas__fila',
  'button.ui-tile', 'a.ui-tile', 'button.ui-chip', 'a.ui-chip', 'button.ui-card', 'a.ui-card',
].join(', ')

function ubicar(clip, r, x, y) {
  clip.style.setProperty('--luz-x', `${x - r.left}px`)
  clip.style.setProperty('--luz-y', `${y - r.top}px`)
}

export function useRippleGlobal() {
  useEffect(() => {
    let activo = null

    const soltar = () => {
      if (!activo) return
      const { clip, desde } = activo
      activo = null
      // La luz se apaga al soltar, con un fundido corto.
      clip.classList.add('is-out')
      const resta = Math.max(0, 200 - (performance.now() - desde))
      window.setTimeout(() => clip.remove(), resta + 380)
    }

    const alPresionar = (e) => {
      if (e.button > 0) return
      const el = e.target?.closest?.(SELECTOR)
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return

      const r = el.getBoundingClientRect()
      if (!r.width) return
      soltar()

      if (getComputedStyle(el).position === 'static') el.style.position = 'relative'

      const x = e.clientX ?? r.left + r.width / 2
      const y = e.clientY ?? r.top + r.height / 2

      const clip = document.createElement('span')
      clip.className = 'ui-ripple__clip'
      clip.setAttribute('aria-hidden', 'true')
      ubicar(clip, r, x, y)

      el.appendChild(clip)
      activo = { el, clip, r, desde: performance.now() }
    }

    const alMover = (e) => {
      if (!activo) return
      const { el, clip, r } = activo
      // Si el dedo se fue del botón (o empezó un scroll) la luz se apaga.
      if (e.clientX < r.left - 12 || e.clientX > r.right + 12 || e.clientY < r.top - 12 || e.clientY > r.bottom + 12) {
        soltar()
        return
      }
      if (el.isConnected) ubicar(clip, r, e.clientX, e.clientY)
    }

    document.addEventListener('pointerdown', alPresionar, { passive: true })
    document.addEventListener('pointermove', alMover, { passive: true })
    document.addEventListener('pointerup', soltar, { passive: true })
    document.addEventListener('pointercancel', soltar, { passive: true })
    window.addEventListener('blur', soltar)
    return () => {
      document.removeEventListener('pointerdown', alPresionar)
      document.removeEventListener('pointermove', alMover)
      document.removeEventListener('pointerup', soltar)
      document.removeEventListener('pointercancel', soltar)
      window.removeEventListener('blur', soltar)
    }
  }, [])
}

export default useRippleGlobal
