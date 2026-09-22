import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications } from '../hooks/useNotifications'
import { IconCheckCircle, IconBolt, IconCalendar } from './NoniIcons'

// Íconos por tipo de aviso. Sin colores extra: el relieve y el fondo de marca
// alcanzan para distinguir "nueva reserva" de "cambio" y del resto.
function iconoDe(tipo) {
  switch (tipo) {
    case 'new_reservation':
      return <IconCalendar className="w-5 h-5" />
    case 'reservation_update':
      return <IconCheckCircle className="w-5 h-5" />
    default:
      return <IconBolt className="w-5 h-5" />
  }
}

function formatearHora(timestamp) {
  const fecha = new Date(timestamp)
  const ahora = new Date()
  const mins = Math.floor((ahora - fecha) / 60000)
  const horas = Math.floor((ahora - fecha) / 3600000)
  const dias = Math.floor((ahora - fecha) / 86400000)

  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  if (horas < 24) return `Hace ${horas} h`
  if (dias < 7) return `Hace ${dias} d`
  return fecha.toLocaleDateString('es-AR')
}

export default function NotificationCenterV2({ negocioId }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const botonRef = useRef(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead, clear, pedirPermiso } = useNotifications(negocioId)

  // Estado del permiso de notificaciones del navegador. Se pide desde un click
  // del usuario: al pedirlo automáticamente al entrar, Chrome lo descartaba de
  // plano y las alertas nunca llegaban.
  const [permiso, setPermiso] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  // Cierre por click afuera y por Escape.
  useEffect(() => {
    if (!open) return
    const afuera = (e) => {
      if (panelRef.current?.contains(e.target)) return
      if (botonRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const tecla = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        botonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', afuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', afuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [open])

  return (
    <>
      <motion.button
        ref={botonRef}
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        className="ns-notif-bell relative"
        title="Notificaciones"
        aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'}
        aria-expanded={open}
      >
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-black rounded-full flex items-center justify-center"
            style={{
              background: 'var(--ns-gradient-1)',
              color: 'var(--ns-paper)',
              boxShadow: '0 3px 10px rgba(153,0,17,0.45)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Centro de notificaciones"
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="ns-notif-panel"
          >
            <div className="ns-notif-panel__head">
              <div>
                <p className="ns-notif-panel__title">Notificaciones</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
                  {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="neo-onbrand-btn neo-onbrand-btn--ghost text-xs px-3 py-1.5">
                    Marcar todo
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="neo-onbrand-btn neo-onbrand-btn--ghost w-9 h-9 p-0"
                  aria-label="Cerrar notificaciones"
                >
                  ✕
                </button>
              </div>
            </div>

            {permiso === 'default' && (
              <button
                onClick={async () => setPermiso((await pedirPermiso()) ? 'granted' : 'denied')}
                className="ns-notif-ask"
              >
                <span className="ns-notif-ask__bell">
                  <IconBolt className="w-4 h-4" />
                </span>
                <span className="flex-1">
                  <span className="ns-notif-ask__title">Activá los avisos en este dispositivo</span>
                  <span className="ns-notif-ask__text">Te avisamos apenas entra una reserva nueva</span>
                </span>
                <span className="neo-chip neo-chip--solid text-[10px]">Activar</span>
              </button>
            )}

            {permiso === 'denied' && (
              <p className="ns-notif-denied">
                Bloqueaste los avisos para este sitio. Podés reactivarlos desde el candado de la barra de direcciones.
              </p>
            )}

            <div className="ns-notif-panel__body">
              {notifications.length === 0 ? (
                <div className="neo-empty">
                  <div className="neo-pod neo-pod--lg mx-auto mb-4">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                  <p className="neo-empty__title">Todavía no hay avisos</p>
                  <p className="neo-empty__text">Acá van a aparecer tus reservas nuevas y los cambios de la agenda.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n, idx) => (
                    <motion.button
                      key={n.id}
                      type="button"
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.24), type: 'spring', damping: 24, stiffness: 320 }}
                      onClick={() => markAsRead(n.id)}
                      className={`ns-notif-item${n.read ? ' is-read' : ''}`}
                    >
                      <span
                        className={`ns-notif-item__icon${
                          !n.read && n.type === 'new_reservation' ? ' ns-notif-item__icon--brand' : ''
                        }`}
                      >
                        {iconoDe(n.type)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="ns-notif-item__title flex-1 min-w-0 truncate">{n.title}</span>
                          {!n.read && <span className="ns-notif-dot" />}
                        </span>
                        <span className="ns-notif-item__text">{n.message}</span>
                        <span className="ns-notif-item__time">{formatearHora(n.timestamp)}</span>
                      </span>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="ns-notif-panel__foot">
                <button onClick={clear} className="neo-btn neo-btn--quiet neo-btn--pill text-xs">
                  Limpiar todo
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
