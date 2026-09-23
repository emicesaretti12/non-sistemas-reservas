import { useEffect, useRef } from 'react'

/**
 * Cambiar de sección deslizando, como en una app nativa.
 *
 * Es deliberadamente exigente para no dispararse por accidente: el gesto tiene
 * que ser largo (>80px), claramente horizontal (más del doble que el vertical)
 * y no puede empezar sobre algo que ya scrollea de costado —el calendario, las
 * pestañas, una fila de chips— ni sobre un campo de texto.
 *
 * Si se pasa `areaRef`, el contenido acompaña al dedo mientras arrastrás (con
 * resistencia, y más dura en la primera y la última sección) y vuelve con un
 * resorte si soltás antes de tiempo. Un gesto que responde mientras ocurre se
 * siente físico; uno que sólo actúa al final se siente como un atajo.
 */
const UMBRAL = 80

export function useSwipeTabs({ tabs = [], actual, onCambiar, habilitado = true, areaRef }) {
  const gesto = useRef(null)
  const lista = tabs.join('|')

  useEffect(() => {
    const ids = lista ? lista.split('|') : []
    if (!habilitado || ids.length < 2) return undefined

    const area = () => areaRef?.current || null

    const soltarArea = (conResorte) => {
      const el = area()
      if (!el) return
      el.classList.remove('is-arrastrando')
      if (!conResorte) {
        el.style.translate = ''
        el.style.opacity = ''
        return
      }
      el.classList.add('is-volviendo')
      el.style.translate = '0px 0px'
      el.style.opacity = ''
      window.setTimeout(() => {
        el.classList.remove('is-volviendo')
        // `translate` distinto de `none` crea un bloque contenedor para los
        // `position: fixed` de adentro: se limpia apenas termina.
        el.style.translate = ''
      }, 420)
    }

    const inicio = (e) => {
      if (e.touches.length !== 1) { gesto.current = null; return }
      const t = e.touches[0]
      const bloqueado = e.target?.closest?.(
        'input, textarea, select, [data-no-swipe], .overflow-x-auto, .ui-segment, .ns-bottom-nav, [role="dialog"], .ui-scrim'
      )
      gesto.current = bloqueado ? null : { x: t.clientX, y: t.clientY, eje: null }
    }

    const mover = (e) => {
      const g = gesto.current
      if (!g || e.touches.length !== 1) return
      const t = e.touches[0]
      const dx = t.clientX - g.x
      const dy = t.clientY - g.y
      if (!g.eje) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        g.eje = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y'
        if (g.eje === 'x') area()?.classList.add('is-arrastrando')
      }
      if (g.eje !== 'x') return
      const el = area()
      if (!el) return
      const i = ids.indexOf(actual)
      const enBorde = (dx > 0 && i <= 0) || (dx < 0 && i >= ids.length - 1)
      const factor = enBorde ? 0.08 : 0.22
      const desplazamiento = Math.sign(dx) * Math.min(Math.abs(dx) * factor, enBorde ? 18 : 56)
      el.style.translate = `${desplazamiento}px 0px`
      el.style.opacity = String(1 - Math.min(Math.abs(desplazamiento) / 260, 0.16))
    }

    const fin = (e) => {
      const g = gesto.current
      gesto.current = null
      if (!g) return
      const t = e.changedTouches?.[0]
      if (!t || g.eje !== 'x') { soltarArea(false); return }
      const dx = t.clientX - g.x
      const dy = t.clientY - g.y
      const i = ids.indexOf(actual)
      const j = dx < 0 ? i + 1 : i - 1
      const vale = Math.abs(dx) >= UMBRAL && Math.abs(dx) >= Math.abs(dy) * 2.5 && i !== -1 && j >= 0 && j < ids.length
      if (!vale) { soltarArea(true); return }
      // La sección nueva entra con su propia animación desde el lado correcto.
      soltarArea(false)
      onCambiar?.(ids[j])
    }

    const cancelar = () => { gesto.current = null; soltarArea(true) }

    document.addEventListener('touchstart', inicio, { passive: true })
    document.addEventListener('touchmove', mover, { passive: true })
    document.addEventListener('touchend', fin, { passive: true })
    document.addEventListener('touchcancel', cancelar, { passive: true })
    return () => {
      document.removeEventListener('touchstart', inicio)
      document.removeEventListener('touchmove', mover)
      document.removeEventListener('touchend', fin)
      document.removeEventListener('touchcancel', cancelar)
    }
  }, [lista, actual, onCambiar, habilitado, areaRef])
}

export default useSwipeTabs
