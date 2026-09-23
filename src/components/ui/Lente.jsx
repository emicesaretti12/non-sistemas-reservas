import { useLayoutEffect, useRef } from 'react'
import { animate } from 'framer-motion'

/**
 * La lente de vidrio que marca la opción activa.
 *
 * Se renderiza DENTRO de la opción elegida (`inset: 0`), así en reposo
 * siempre calza exacto con su botón: no importa si la página scrolleó, si el
 * dock cambió de tamaño o si la barra lateral es `sticky`.
 *
 * El viaje entre opciones es un FLIP hecho a mano. La lente que se va anota
 * dónde estaba justo antes de desmontarse, y la que llega —en el mismo
 * commit de React— arranca desde ahí y se desliza a su lugar, animando
 * posición y tamaño (no escala: el borde redondeado no se deforma).
 *
 * Antes esto era un `layoutId` de framer-motion, que compara posiciones de
 * renders distintos en coordenadas de la página. Con el dock fijo y la
 * página scrolleada, la lente "venía" de 400 px más abajo y cruzaba la
 * pantalla volando hasta el dock cada vez que tocabas una pestaña.
 *
 * `grupo` separa lentes independientes (el riel, el dock, cada segmentado).
 */
const RESORTE_LENTE = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }

// Última posición de la lente saliente de cada grupo.
const salientes = new Map()

function restaurar(el) {
  el.style.transform = ''
  el.style.width = ''
  el.style.height = ''
  el.style.right = ''
  el.style.bottom = ''
}

export default function Lente({ grupo, className = '' }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const previa = salientes.get(grupo)
    salientes.delete(grupo)
    let control = null

    // Sólo cuenta si la otra lente se fue en este mismo instante: una
    // posición vieja (de otra pantalla, de otra sesión) no sirve de origen.
    const reciente = previa && performance.now() - previa.t < 200
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reciente && !sinMovimiento) {
      const r = el.getBoundingClientRect()
      const dx = previa.left - r.left
      const dy = previa.top - r.top
      const cambio = Math.abs(dx) + Math.abs(dy) + Math.abs(previa.width - r.width) + Math.abs(previa.height - r.height)
      if (cambio > 1 && r.width > 0) {
        // Durante el viaje la lente tiene tamaño propio en lugar de estirarse
        // con el botón; al llegar vuelve a `inset: 0`.
        // Se fija el punto de partida antes del primer cuadro: si no, entre
        // soltar el `inset` y que arranque la animación la lente mide 0 y
        // parpadea.
        // Si las dos opciones miden lo mismo (el dock, el riel) sólo viaja la
        // posición: todo en el compositor, sin recalcular el layout del vidrio
        // que la contiene en cada cuadro.
        const mismoTamano = Math.abs(previa.width - r.width) < 0.5 && Math.abs(previa.height - r.height) < 0.5
        const destino = { x: [dx, 0], y: [dy, 0] }
        if (!mismoTamano) {
          el.style.right = 'auto'
          el.style.bottom = 'auto'
          el.style.width = `${previa.width}px`
          el.style.height = `${previa.height}px`
          destino.width = [previa.width, r.width]
          destino.height = [previa.height, r.height]
        }
        el.style.transform = `translateX(${dx}px) translateY(${dy}px)`
        control = animate(el, destino, RESORTE_LENTE)
        control.then(() => restaurar(el), () => restaurar(el))
      }
    }

    return () => {
      // Se mide antes de soltar la animación: si la lente estaba viajando,
      // la próxima arranca desde donde se la estaba viendo.
      if (el.isConnected) {
        const r = el.getBoundingClientRect()
        salientes.set(grupo, { left: r.left, top: r.top, width: r.width, height: r.height, t: performance.now() })
      }
      control?.stop()
      restaurar(el)
    }
  }, [grupo])

  return <span ref={ref} className={`ui-lens ${className}`} aria-hidden="true" />
}
