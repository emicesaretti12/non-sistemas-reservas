import { useCallback, useRef, useState } from 'react'

/**
 * Onda al presionar.
 *
 * Se usa como hook para no envolver los botones en un div extra (romper el
 * layout de flex/grid de las pantallas ya armadas sería peor que el beneficio).
 *
 *   const { ondas, alPresionar } = useRipple()
 *   <button className="ui-ripple" onPointerDown={alPresionar}>… {ondas}</button>
 */
export function useRipple() {
  const [ondas, setOndas] = useState([])
  const idRef = useRef(0)

  const alPresionar = useCallback((e) => {
    const el = e.currentTarget
    if (!el) return
    const r = el.getBoundingClientRect()
    const size = Math.max(r.width, r.height)
    const id = ++idRef.current
    const onda = {
      id,
      style: {
        width: size,
        height: size,
        left: (e.clientX ?? r.left + r.width / 2) - r.left - size / 2,
        top: (e.clientY ?? r.top + r.height / 2) - r.top - size / 2,
      },
    }
    setOndas((prev) => [...prev, onda])
    // La animación dura 550ms; limpiamos después para no acumular nodos.
    setTimeout(() => setOndas((prev) => prev.filter((o) => o.id !== id)), 600)
  }, [])

  const nodos = ondas.map((o) => (
    <span key={o.id} className="ui-ripple__wave" style={o.style} aria-hidden="true" />
  ))

  return { ondas: nodos, alPresionar }
}

export default useRipple
