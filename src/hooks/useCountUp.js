import { useEffect, useRef, useState } from 'react'

/**
 * Anima un número desde su valor anterior hasta el nuevo.
 *
 * Un número que salta de golpe no se lee; uno que sube contando sí, y de paso
 * avisa que algo cambió. Respeta "reducir movimiento": ahí devuelve el valor
 * final sin animar.
 */
export function useCountUp(valor, { duracion = 900, decimales = 0 } = {}) {
  const objetivo = Number.isFinite(Number(valor)) ? Number(valor) : 0
  const [actual, setActual] = useState(objetivo)
  const desdeRef = useRef(objetivo)
  const frameRef = useRef(0)

  useEffect(() => {
    const desde = desdeRef.current
    if (desde === objetivo) return undefined

    const reducido = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducido || duracion <= 0) {
      // Diferido a un frame: actualizar el estado dentro del cuerpo del
      // efecto encadena renders.
      frameRef.current = requestAnimationFrame(() => {
        desdeRef.current = objetivo
        setActual(objetivo)
      })
      return () => cancelAnimationFrame(frameRef.current)
    }

    const inicio = performance.now()
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion)
      // Salida suave: arranca rápido y frena, como un contador mecánico.
      const eased = 1 - Math.pow(1 - t, 3)
      const valorPaso = desde + (objetivo - desde) * eased
      setActual(decimales > 0 ? Number(valorPaso.toFixed(decimales)) : Math.round(valorPaso))
      if (t < 1) frameRef.current = requestAnimationFrame(paso)
      else desdeRef.current = objetivo
    }

    frameRef.current = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(frameRef.current)
  }, [objetivo, duracion, decimales])

  return actual
}

export default useCountUp
