import { useEffect } from 'react'

/**
 * Lo que el navegador hace por su cuenta y una app no.
 *
 *   · Zoom con dos dedos en iOS. Safari ignora `user-scalable=no` desde
 *     iOS 10; cancelar `gesturestart`/`gesturechange` es lo que lo frena.
 *     En Android alcanza con el meta viewport y `touch-action` (movil.css).
 *   · Teclado. `--teclado` es cuánto tapa el teclado la pantalla y
 *     `--alto-visible` cuánto queda a la vista, medidos con `visualViewport`;
 *     las hojas los usan para quedar apoyadas justo encima del teclado en
 *     lugar de quedar escondidas detrás.
 *   · Pantalla corrida. Al enfocar un campo iOS a veces desplaza el
 *     documento entero para mostrarlo, y al cerrar el teclado lo deja
 *     corrido: la barra superior queda cortada y el dock flotando en el
 *     medio. En la app (el documento no scrollea nunca) lo devolvemos a cero.
 */
export function usePantallaNativa() {
  useEffect(() => {
    const raiz = document.documentElement

    const cancelar = (e) => e.preventDefault()
    const opciones = { passive: false }
    document.addEventListener('gesturestart', cancelar, opciones)
    document.addEventListener('gesturechange', cancelar, opciones)
    document.addEventListener('gestureend', cancelar, opciones)

    const enModoApp = () => Boolean(document.querySelector('.noni-shell--app'))

    let reencuadre = 0
    const reencuadrar = () => {
      clearTimeout(reencuadre)
      reencuadre = window.setTimeout(() => {
        if (enModoApp() && (window.scrollY !== 0 || window.scrollX !== 0)) window.scrollTo(0, 0)
      }, 60)
    }

    const vv = window.visualViewport
    let frame = 0
    const medirTeclado = () => {
      frame = 0
      if (!vv) return
      const tapa = Math.max(0, Math.round(raiz.clientHeight - vv.height - vv.offsetTop))
      // Menos de 80 px es la barra del navegador que se esconde, no un teclado.
      const teclado = tapa > 80 ? tapa : 0
      raiz.style.setProperty('--teclado', `${teclado}px`)
      raiz.style.setProperty('--alto-visible', `${Math.round(vv.height)}px`)
      raiz.classList.toggle('ns-teclado-abierto', teclado > 0)
      if (!teclado) reencuadrar()
    }
    const alCambiarVista = () => {
      if (!frame) frame = requestAnimationFrame(medirTeclado)
    }

    vv?.addEventListener('resize', alCambiarVista)
    vv?.addEventListener('scroll', alCambiarVista)
    document.addEventListener('focusout', reencuadrar)
    medirTeclado()

    return () => {
      document.removeEventListener('gesturestart', cancelar, opciones)
      document.removeEventListener('gesturechange', cancelar, opciones)
      document.removeEventListener('gestureend', cancelar, opciones)
      vv?.removeEventListener('resize', alCambiarVista)
      vv?.removeEventListener('scroll', alCambiarVista)
      document.removeEventListener('focusout', reencuadrar)
      clearTimeout(reencuadre)
      if (frame) cancelAnimationFrame(frame)
      raiz.style.removeProperty('--teclado')
      raiz.style.removeProperty('--alto-visible')
      raiz.classList.remove('ns-teclado-abierto')
    }
  }, [])
}

export default usePantallaNativa
