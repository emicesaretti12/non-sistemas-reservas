import { useEffect } from 'react'

/**
 * Tarjetas que asoman al scrollear.
 *
 * Observa el área de contenido: cada tarjeta que aparece fuera de la
 * pantalla queda escondida un poco más abajo (`.ns-asoma`) y, cuando el
 * scroll la trae por encima del dock, sube a su lugar (`.ns-asomando`). Si
 * entran varias juntas, se escalonan 45 ms.
 *
 * Se hace con IntersectionObserver y no con `animation-timeline: view()`
 * porque Chrome trata a un elemento con animación de desplazamiento como
 * bloque contenedor aunque la animación ya haya terminado, y eso descoloca
 * los `position: fixed` de adentro (modales, menús).
 */

const SELECTOR = '.ui-card, .ui-tile, .nh-card, .ns-glass-card, .ui-list > li'

export function useAsomar(areaRef, habilitado = true) {
  useEffect(() => {
    const area = areaRef.current
    if (!habilitado || !area || typeof IntersectionObserver === 'undefined') return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    if (window.matchMedia?.('(min-width: 1024px)').matches) return undefined

    const vistos = new WeakSet()

    const revelar = (el, demora) => {
      el.style.transitionDelay = `${demora}ms`
      el.classList.add('ns-asomando')
      el.classList.remove('ns-asoma')
      window.setTimeout(() => {
        el.classList.remove('ns-asomando')
        el.style.transitionDelay = ''
      }, 700 + demora)
    }

    const io = new IntersectionObserver((entradas) => {
      let orden = 0
      for (const e of entradas) {
        if (!e.isIntersecting) continue
        io.unobserve(e.target)
        revelar(e.target, Math.min(orden++, 5) * 45)
      }
    }, { rootMargin: '0px 0px -70px 0px', threshold: 0.01 })

    const preparar = (el) => {
      if (vistos.has(el)) return
      vistos.add(el)
      // Una tarjeta dentro de otra ya se mueve con su madre.
      const madre = el.parentElement?.closest(SELECTOR)
      if (madre && area.contains(madre)) return
      // Lo que ya está a la vista (o por encima) no se toca.
      if (el.getBoundingClientRect().top < window.innerHeight - 40) return
      el.classList.add('ns-asoma')
      io.observe(el)
    }

    const recorrer = (raiz) => {
      if (raiz.nodeType !== 1) return
      if (raiz.matches(SELECTOR)) preparar(raiz)
      raiz.querySelectorAll(SELECTOR).forEach(preparar)
    }

    recorrer(area)
    const mo = new MutationObserver((cambios) => {
      for (const c of cambios) c.addedNodes.forEach(recorrer)
    })
    mo.observe(area, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      io.disconnect()
      area.querySelectorAll('.ns-asoma, .ns-asomando').forEach((el) => {
        el.classList.remove('ns-asoma', 'ns-asomando')
        el.style.transitionDelay = ''
      })
    }
  }, [areaRef, habilitado])
}

export default useAsomar
