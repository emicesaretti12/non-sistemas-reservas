import { useEffect } from 'react'

/**
 * Onda al presionar, delegada a todo el documento.
 *
 * Se monta una sola vez en lugar de envolver cada botón: cualquier elemento
 * con `.ui-btn`, `.ui-icon-btn`, `.ui-tile`, `.nh-action` o `data-ripple`
 * responde al toque con una onda que sale del punto exacto donde apoyaste el
 * dedo. Es la diferencia entre un botón que "se apaga y prende" y uno que se
 * siente material.
 */

const SELECTOR = '.ui-btn, .ui-icon-btn, .ui-tile, .nh-action, .nh-slot, .ns-bottom-nav-item, [data-ripple]'

export function useRippleGlobal() {
  useEffect(() => {
    // Quien pidió menos movimiento no necesita la onda.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    const alPresionar = (e) => {
      const el = e.target?.closest?.(SELECTOR)
      if (!el || el.disabled) return

      const r = el.getBoundingClientRect()
      if (!r.width) return

      const size = Math.max(r.width, r.height) * 1.1
      const onda = document.createElement('span')
      onda.className = 'ui-ripple__wave'
      onda.style.width = `${size}px`
      onda.style.height = `${size}px`
      onda.style.left = `${(e.clientX ?? r.left + r.width / 2) - r.left - size / 2}px`
      onda.style.top = `${(e.clientY ?? r.top + r.height / 2) - r.top - size / 2}px`

      // El contenedor tiene que recortar la onda; si el elemento no lo hace
      // por sí mismo, se lo agregamos mientras dura la animación.
      const estilo = getComputedStyle(el)
      const recortaba = estilo.overflow !== 'visible'
      const posicionado = estilo.position !== 'static'
      if (!recortaba) el.style.overflow = 'hidden'
      if (!posicionado) el.style.position = 'relative'

      el.appendChild(onda)
      window.setTimeout(() => {
        onda.remove()
        if (!recortaba) el.style.overflow = ''
        if (!posicionado) el.style.position = ''
      }, 600)
    }

    document.addEventListener('pointerdown', alPresionar, { passive: true })
    return () => document.removeEventListener('pointerdown', alPresionar)
  }, [])
}

export default useRippleGlobal
