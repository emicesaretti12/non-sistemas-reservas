import { useEffect, useRef } from 'react'

/**
 * Cambiar de sección deslizando, como en una app nativa.
 *
 * Es deliberadamente exigente para no dispararse por accidente: el gesto tiene
 * que ser largo (>80px), claramente horizontal (más del doble que el vertical)
 * y no puede empezar sobre algo que ya scrollea de costado —el calendario, las
 * pestañas, una fila de chips— ni sobre un campo de texto.
 */
export function useSwipeTabs({ tabs = [], actual, onCambiar, habilitado = true }) {
  const ref = useRef({ x: null, y: null, valido: false })

  useEffect(() => {
    if (!habilitado || tabs.length < 2) return undefined

    const inicio = (e) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      const bloqueado = e.target?.closest?.(
        'input, textarea, select, [data-no-swipe], .overflow-x-auto, .ui-segment, .ns-bottom-nav, [role="dialog"]'
      )
      ref.current = { x: t.clientX, y: t.clientY, valido: !bloqueado }
    }

    const fin = (e) => {
      const { x, y, valido } = ref.current
      ref.current = { x: null, y: null, valido: false }
      if (x === null || !valido) return

      const t = e.changedTouches?.[0]
      if (!t) return
      const dx = t.clientX - x
      const dy = t.clientY - y
      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2.5) return

      const i = tabs.indexOf(actual)
      if (i === -1) return
      const j = dx < 0 ? i + 1 : i - 1
      if (j < 0 || j >= tabs.length) return
      onCambiar?.(tabs[j])
    }

    document.addEventListener('touchstart', inicio, { passive: true })
    document.addEventListener('touchend', fin, { passive: true })
    return () => {
      document.removeEventListener('touchstart', inicio)
      document.removeEventListener('touchend', fin)
    }
  }, [tabs, actual, onCambiar, habilitado])
}

export default useSwipeTabs
