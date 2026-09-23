import { useEffect } from 'react'

/**
 * Dirección del scroll como atributo del documento.
 *
 * Marca `<html data-scroll="abajo|arriba">` para que el CSS haga lo que
 * hacen las apps de iOS: al bajar leyendo, el dock se compacta y los botones
 * flotantes se apartan; al subir un poco, vuelven. Se resuelve con un solo
 * listener pasivo y un `requestAnimationFrame`, sin re-renderizar React.
 *
 * Se necesita una intención clara (24 px seguidos hacia abajo, 16 hacia
 * arriba) para cambiar de estado: si no, el dock temblaría con cada
 * micro-movimiento del dedo.
 */
export function useScrollNativo() {
  useEffect(() => {
    const raiz = document.documentElement
    let ultimo = Math.max(0, window.scrollY)
    let acumulado = 0
    let estado = ''
    let frame = 0

    const aplicar = (nuevo) => {
      if (nuevo === estado) return
      estado = nuevo
      raiz.dataset.scroll = nuevo
    }

    const medir = () => {
      frame = 0
      const y = Math.max(0, window.scrollY)
      const delta = y - ultimo
      ultimo = y
      const alFondo = window.innerHeight + y >= raiz.scrollHeight - 48
      if (y < 56 || alFondo) {
        acumulado = 0
        aplicar('arriba')
        return
      }
      if (delta === 0) return
      if ((delta > 0) !== (acumulado > 0)) acumulado = 0
      acumulado += delta
      if (acumulado > 24) aplicar('abajo')
      else if (acumulado < -16) aplicar('arriba')
    }

    const alScrollear = () => {
      if (!frame) frame = requestAnimationFrame(medir)
    }

    aplicar('arriba')
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => {
      window.removeEventListener('scroll', alScrollear)
      if (frame) cancelAnimationFrame(frame)
      delete raiz.dataset.scroll
    }
  }, [])
}

export default useScrollNativo
