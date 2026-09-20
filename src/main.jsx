import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Service Worker (PWA) ────────────────────────────────────────────────────
// En desarrollo no lo registramos: dejaba cacheada la app vieja y los cambios
// no se veían hasta borrar los datos del sitio a mano.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Si no había controlador, esta es la primera instalación: `clients.claim()`
    // dispara `controllerchange` igual y recargaríamos sin necesidad.
    const habiaControlador = Boolean(navigator.serviceWorker.controller)

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('No se pudo registrar el Service Worker:', error)
    })

    // Al activarse una versión nueva recargamos una sola vez, para que el
    // usuario no quede con una mezcla de assets viejos y nuevos.
    let recargando = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!habiaControlador || recargando) return
      recargando = true
      window.location.reload()
    })
  })
}
