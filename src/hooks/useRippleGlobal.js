import { useEffect } from 'react'

/**
 * Respuesta al toque, delegada a todo el documento.
 *
 * Se monta una sola vez en lugar de envolver cada botón: cualquier elemento
 * con `.ui-btn`, `.ui-icon-btn`, `.ui-tile`, `.nh-action` o `data-ripple`
 * responde al dedo con dos cosas, como el vidrio de iOS:
 *
 *   · una luz que nace donde apoyaste y te sigue mientras arrastrás;
 *   · una onda que sale de ese punto al presionar.
 *
 * Todo vive dentro de un `<span class="ui-ripple__clip">` que recorta con el
 * mismo radio del botón. Antes se le ponía `overflow: hidden` al botón
 * mientras duraba la onda, y eso cortaba los globitos de notificación que
 * sobresalen de la esquina.
 */

// Tarjetas y chips sólo cuando son tocables: una etiqueta de estado que se
// ilumina al tocarla promete una acción que no existe.
const SELECTOR = [
  '.ui-btn', '.ui-icon-btn', '.ns-tab', '.nh-action', '.nh-slot', '.ns-bottom-nav-item', '.noni-rail__item', '[data-ripple]',
  'button.ui-tile', 'a.ui-tile', 'button.ui-chip', 'a.ui-chip', 'button.ui-card', 'a.ui-card',
].join(', ')

function ubicar(clip, r, x, y) {
  clip.style.setProperty('--luz-x', `${x - r.left}px`)
  clip.style.setProperty('--luz-y', `${y - r.top}px`)
}

export function useRippleGlobal() {
  useEffect(() => {
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let activo = null

    const soltar = () => {
      if (!activo) return
      const { clip, desde } = activo
      activo = null
      // La luz se apaga al soltar; la onda termina su recorrido.
      clip.classList.add('is-out')
      const resta = Math.max(0, 560 - (performance.now() - desde))
      window.setTimeout(() => clip.remove(), Math.max(resta, 380))
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

      if (!sinMovimiento) {
        const size = Math.max(r.width, r.height) * 2.1
        const onda = document.createElement('span')
        onda.className = 'ui-ripple__wave'
        onda.style.width = `${size}px`
        onda.style.height = `${size}px`
        onda.style.left = `${x - r.left - size / 2}px`
        onda.style.top = `${y - r.top - size / 2}px`
        clip.appendChild(onda)
      }

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
