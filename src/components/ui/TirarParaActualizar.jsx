import { useEffect, useRef, useState } from 'react'
import { haptic } from '../../utils/haptics'
import { posicionScroll } from '../../utils/scroll'

/**
 * Tirar para actualizar, con una gota de vidrio.
 *
 * Arriba de todo, arrastrar hacia abajo hace bajar una gota que se estira
 * con el dedo; la flecha gira a medida que te acercás al punto de disparo y
 * un toque háptico avisa cuando lo pasaste. Al soltar, la gota se asienta y
 * gira mientras `alActualizar()` trabaja.
 *
 * La posición se escribe directo en el estilo (variables CSS) en cada
 * `touchmove`: pasar por React sesenta veces por segundo sería tirar frames
 * en un celular de gama media.
 */

const DISPARO = 72
const MAXIMO = 132

// Resistencia tipo iOS: cuanto más tirás, menos avanza.
const resistir = (d) => MAXIMO * (1 - 1 / ((d * 0.55) / MAXIMO + 1))

export default function TirarParaActualizar({ alActualizar, habilitado = true }) {
  const gota = useRef(null)
  const [estado, setEstado] = useState('quieto') // quieto | tirando | cargando | listo

  // La acción más reciente, sin volver a registrar los listeners en cada render.
  const accion = useRef(alActualizar)
  useEffect(() => { accion.current = alActualizar }, [alActualizar])

  useEffect(() => {
    if (!habilitado) return undefined
    if (!window.matchMedia?.('(pointer: coarse)').matches) return undefined

    let fase = 'quieto'
    const cambiar = (nueva) => {
      if (fase === nueva) return
      fase = nueva
      setEstado(nueva)
    }

    let inicioY = null
    let inicioX = 0
    let ejeVertical = false
    let tirado = 0
    let armado = false

    const pintar = (px) => {
      const el = gota.current
      if (!el) return
      const progreso = Math.min(px / DISPARO, 1)
      el.style.setProperty('--ptr-y', `${px}px`)
      el.style.setProperty('--ptr-p', progreso.toFixed(3))
      // La gota se estira en vertical mientras baja y se redondea al llegar.
      el.style.setProperty('--ptr-estira', (1 + Math.min(px / 600, 0.14)).toFixed(3))
    }

    const hayAlgoAbierto = () => Boolean(document.querySelector('.ui-scrim, [role="dialog"]'))

    const inicio = (e) => {
      if (fase === 'cargando' || e.touches.length !== 1) return
      if (posicionScroll() > 0 || hayAlgoAbierto()) return
      if (e.target?.closest?.('input, textarea, select, [data-no-ptr], .overflow-y-auto')) return
      inicioY = e.touches[0].clientY
      inicioX = e.touches[0].clientX
      ejeVertical = false
      tirado = 0
      armado = false
    }

    const mover = (e) => {
      if (inicioY === null) return
      const d = e.touches[0].clientY - inicioY
      if (!ejeVertical) {
        const dx = Math.abs(e.touches[0].clientX - inicioX)
        if (dx < 8 && Math.abs(d) < 8) return
        // Un gesto de costado es para cambiar de sección, no para actualizar.
        if (dx > Math.abs(d)) { inicioY = null; return }
        ejeVertical = true
      }
      if (d <= 0 || posicionScroll() > 0) {
        if (tirado > 0) { tirado = 0; pintar(0) }
        return
      }
      cambiar('tirando')
      tirado = resistir(d)
      pintar(tirado)
      if (!armado && tirado >= DISPARO) {
        armado = true
        haptic('select')
      } else if (armado && tirado < DISPARO) {
        armado = false
      }
    }

    const fin = async () => {
      if (inicioY === null) return
      inicioY = null
      if (!armado) {
        tirado = 0
        pintar(0)
        cambiar('quieto')
        return
      }
      armado = false
      cambiar('cargando')
      pintar(DISPARO * 0.82)
      const desde = performance.now()
      try {
        await accion.current?.()
      } finally {
        // Un mínimo de tiempo visible: un giro de 80 ms se lee como un error.
        const resta = 650 - (performance.now() - desde)
        if (resta > 0) await new Promise((r) => setTimeout(r, resta))
        haptic('success')
        cambiar('listo')
        pintar(0)
        setTimeout(() => cambiar('quieto'), 420)
      }
    }

    document.addEventListener('touchstart', inicio, { passive: true })
    document.addEventListener('touchmove', mover, { passive: true })
    document.addEventListener('touchend', fin, { passive: true })
    document.addEventListener('touchcancel', fin, { passive: true })
    return () => {
      document.removeEventListener('touchstart', inicio)
      document.removeEventListener('touchmove', mover)
      document.removeEventListener('touchend', fin)
      document.removeEventListener('touchcancel', fin)
    }
  }, [habilitado])

  return (
    <div
      ref={gota}
      className={`ns-ptr is-${estado}`}
      role="status"
      aria-live="polite"
      aria-label={estado === 'cargando' ? 'Actualizando' : undefined}
    >
      <span className="ns-ptr__gota">
        {estado === 'cargando' ? (
          <span className="ui-spinner ui-spinner--sm" />
        ) : (
          <svg className="ns-ptr__flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
            <path d="M12 5v14m0 0l-6-6m6 6l6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </div>
  )
}
