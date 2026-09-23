import { useEffect } from 'react'
import { haptic } from '../utils/haptics'

/**
 * Cerrar hojas deslizándolas hacia abajo, como en iOS.
 *
 * Delegado a todo el documento: cualquier diálogo modal (`role="dialog"`,
 * `aria-modal`) que esté dentro de un velo `.ui-scrim` se puede arrastrar
 * desde la manija o desde cualquier punto si su contenido ya está arriba de
 * todo. Al soltar, si bajó lo suficiente (o se lo tiró rápido) termina de
 * irse y se cierra con el mismo clic en el velo que ya usa cada pantalla; si
 * no, vuelve a su lugar con un resorte.
 *
 * Sólo en pantallas chicas y con dedo: en escritorio los diálogos son
 * ventanas centradas y se cierran con Esc o con la cruz.
 */

const CURVA = 'cubic-bezier(0.32, 0.72, 0, 1)'

function scrolleaAlgoArriba(desde, hasta) {
  for (let el = desde; el && el !== hasta.parentElement; el = el.parentElement) {
    if (el.scrollTop > 0) return true
    if (el === hasta) break
  }
  return false
}

export function useHojasArrastrables() {
  // Esc cierra la hoja de más arriba (en cualquier dispositivo con teclado),
  // con el mismo clic en el velo que usa cada pantalla. Antes algunas hojas
  // no escuchaban la tecla y había que ir a buscar la cruz.
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // Una confirmación abierta encima maneja su propio Esc.
      if (document.querySelector('[role="alertdialog"]')) return
      const velos = [...document.querySelectorAll('.ui-scrim')].filter((v) => v.querySelector('[role="dialog"]'))
      const arriba = velos[velos.length - 1]
      if (!arriba) return
      // Si el foco está en un campo con su propio Esc (un select abierto), no.
      if (document.activeElement?.tagName === 'SELECT') return
      e.preventDefault()
      arriba.click()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [])

  useEffect(() => {
    if (!window.matchMedia?.('(pointer: coarse)').matches) return undefined

    let g = null

    const inicio = (e) => {
      if (e.touches.length !== 1 || window.innerWidth >= 640) return
      const hoja = e.target?.closest?.('[role="dialog"][aria-modal="true"]')
      const velo = hoja?.parentElement?.closest?.('.ui-scrim')
      if (!hoja || !velo) return
      if (e.target.closest('input, textarea, select, [contenteditable], [data-no-drag], .overflow-x-auto')) return
      const t = e.touches[0]
      const enManija = t.clientY - hoja.getBoundingClientRect().top < 56
      if (!enManija && scrolleaAlgoArriba(e.target, hoja)) return
      const ahora = performance.now()
      g = { hoja, velo, enManija, x0: t.clientX, y0: t.clientY, dy: 0, activo: false, ultY: t.clientY, ultT: ahora, vel: 0 }
    }

    const mover = (e) => {
      if (!g) return
      const t = e.touches[0]
      const dy = t.clientY - g.y0
      if (!g.activo) {
        if (Math.abs(dy) < 6 && Math.abs(t.clientX - g.x0) < 6) return
        // Hacia arriba o de costado: es scroll del contenido, no de la hoja.
        if (dy <= 0 || Math.abs(t.clientX - g.x0) > Math.abs(dy)) { g = null; return }
        g.activo = true
        g.hoja.style.transition = 'none'
        g.velo.style.transition = 'none'
      }
      const ahora = performance.now()
      g.vel = (t.clientY - g.ultY) / Math.max(1, ahora - g.ultT)
      g.ultY = t.clientY
      g.ultT = ahora
      g.dy = Math.max(0, dy)
      g.hoja.style.translate = `0px ${g.dy}px`
      g.velo.style.opacity = String(1 - Math.min(g.dy / 520, 0.7))
    }

    const fin = () => {
      if (!g) return
      const { hoja, velo, dy, vel, activo } = g
      g = null
      if (!activo) return

      const cerrar = dy > 120 || (dy > 36 && vel > 0.55)
      hoja.style.transition = `translate 280ms ${CURVA}`
      velo.style.transition = 'opacity 260ms ease-out'

      if (cerrar) {
        haptic('tap')
        hoja.style.translate = `0px ${hoja.offsetHeight + 48}px`
        velo.style.opacity = '0'
        window.setTimeout(() => {
          velo.click()
          // Si la pantalla no cerró con el velo, la hoja vuelve a su lugar.
          window.setTimeout(() => {
            if (!hoja.isConnected) return
            hoja.style.translate = ''
            hoja.style.transition = ''
            velo.style.opacity = ''
            velo.style.transition = ''
          }, 60)
        }, 240)
        return
      }

      hoja.style.translate = '0px 0px'
      velo.style.opacity = ''
      window.setTimeout(() => {
        if (!hoja.isConnected) return
        hoja.style.translate = ''
        hoja.style.transition = ''
        velo.style.transition = ''
      }, 300)
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
  }, [])
}

export default useHojasArrastrables
