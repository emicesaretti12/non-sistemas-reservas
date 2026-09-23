import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RESORTE_PANEL } from '../../utils/motion'

/**
 * Cápsula de estado de conexión.
 *
 * Baja desde arriba (como las notificaciones de la isla de iOS) cuando:
 *   · el teléfono perdió la señal,
 *   · la red está tan lenta que se está mostrando la última copia guardada,
 *   · la señal volvió (en verde, y se va sola).
 *
 * Escucha los eventos `online`/`offline` del navegador y `noni:red`, que
 * emite la caché de red cada vez que sirve una copia (ver cacheRed.js).
 */

function hace(t) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return 'recién'
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

export default function EstadoConexion() {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  const [copiaDe, setCopiaDe] = useState(null)
  const [volvio, setVolvio] = useState(false)

  useEffect(() => {
    let reloj = null
    const alVolver = () => {
      setEnLinea(true)
      // Las pantallas vuelven a pedir sus datos al reconectar (ver el panel);
      // si todavía fallan, la caché vuelve a avisar.
      setCopiaDe(null)
      setVolvio(true)
      clearTimeout(reloj)
      reloj = setTimeout(() => setVolvio(false), 2600)
    }
    const alCortarse = () => {
      setEnLinea(false)
      setVolvio(false)
    }
    const alResponder = (e) => {
      const d = e.detail || {}
      if (d.estado === 'copia') setCopiaDe((previo) => previo ?? d.guardadoEn ?? Date.now())
      else if (d.estado === 'ok') setCopiaDe(null)
    }
    window.addEventListener('online', alVolver)
    window.addEventListener('offline', alCortarse)
    window.addEventListener('noni:red', alResponder)
    return () => {
      clearTimeout(reloj)
      window.removeEventListener('online', alVolver)
      window.removeEventListener('offline', alCortarse)
      window.removeEventListener('noni:red', alResponder)
    }
  }, [])

  let aviso = null
  if (!enLinea) {
    aviso = {
      tono: 'offline',
      titulo: 'Sin conexión',
      detalle: copiaDe ? `Mostrando lo guardado ${hace(copiaDe)}` : 'Revisá el wifi o los datos',
    }
  } else if (copiaDe) {
    aviso = { tono: 'lento', titulo: 'Señal débil', detalle: `Mostrando lo guardado ${hace(copiaDe)}` }
  } else if (volvio) {
    aviso = { tono: 'ok', titulo: 'Conectado otra vez', detalle: null }
  }

  // A los pocos segundos la cápsula se achica a lo esencial (el punto y el
  // título) para no tapar la pantalla mientras dura el corte.
  const tono = aviso?.tono || null
  const [tonoVisto, setTonoVisto] = useState(tono)
  const [compacta, setCompacta] = useState(false)
  if (tono !== tonoVisto) {
    setTonoVisto(tono)
    setCompacta(false)
  }
  useEffect(() => {
    if (!tono || tono === 'ok') return undefined
    const t = setTimeout(() => setCompacta(true), 4200)
    return () => clearTimeout(t)
  }, [tono])

  return (
    <AnimatePresence>
      {aviso && (
        <motion.div
          key={aviso.tono}
          layout
          className={`ns-conexion ns-conexion--${aviso.tono}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -28, scale: 0.86 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={RESORTE_PANEL}
        >
          <span className="ns-conexion__punto" aria-hidden="true" />
          <motion.span layout="position" className="ns-conexion__titulo">{aviso.titulo}</motion.span>
          <AnimatePresence initial={false}>
            {aviso.detalle && !compacta && (
              <motion.span
                key="detalle"
                className="ns-conexion__detalle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                {aviso.detalle}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
