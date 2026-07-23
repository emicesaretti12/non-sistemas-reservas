import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications } from '../hooks/useNotifications'
import { IconCheckCircle, IconBolt, IconCalendar } from './NoniIcons'

export default function NotificationCenterV2({ negocioId }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead, clear } = useNotifications(negocioId)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_reservation':
        return <IconCalendar className="w-5 h-5 text-sky-500" />
      case 'reservation_update':
        return <IconCheckCircle className="w-5 h-5 text-emerald-500" />
      default:
        return <IconBolt className="w-5 h-5 text-slate-500" />
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'new_reservation':
        return 'bg-sky-50 border-sky-200'
      case 'reservation_update':
        return 'bg-emerald-50 border-emerald-200'
      default:
        return 'bg-slate-50 border-slate-200'
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`
    return date.toLocaleDateString('es-AR')
  }

  return (
    <>
      {/* Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2.5 rounded-lg hover:bg-slate-100 transition-all"
        title="Notificaciones"
      >
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-slate-200"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-sky-500 to-sky-400 flex items-center justify-between">
              <h3 className="font-black text-white">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <motion.button
                    onClick={markAllAsRead}
                    whileHover={{ scale: 1.05 }}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Marcar todo
                  </motion.button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <p className="font-medium">No hay notificaciones</p>
                  <p className="text-xs mt-1">Aquí aparecerán tus nuevas reservas y actualizaciones</p>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map((notification, idx) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${
                        notification.read ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-sky-500" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-2">{formatTime(notification.timestamp)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-100 flex justify-center">
                <button
                  onClick={clear}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-all"
                >
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
