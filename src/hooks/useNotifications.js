import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '../utils/notificationService'

/**
 * Hook para usar notificaciones en tiempo real
 */
export function useNotifications(negocioId) {
  // El estado arranca leyendo el servicio: así no hace falta un setState
  // sincrónico dentro del efecto (que provoca un render en cascada).
  const [notifications, setNotifications] = useState(() => notificationService.getNotifications())
  const [unreadCount, setUnreadCount] = useState(() => notificationService.getUnreadCount())

  useEffect(() => {
    const sincronizar = () => {
      setNotifications([...notificationService.getNotifications()])
      setUnreadCount(notificationService.getUnreadCount())
    }

    // Suscripción a cambios del servicio
    const unsubscribe = notificationService.subscribe(({ notifications, unreadCount }) => {
      setNotifications([...notifications])
      setUnreadCount(unreadCount)
    })

    // Inicialización (dispara la sincronización por el propio subscribe)
    if (negocioId) notificationService.init(negocioId)

    window.addEventListener('noni:notification', sincronizar)

    return () => {
      unsubscribe()
      window.removeEventListener('noni:notification', sincronizar)
    }
  }, [negocioId])

  const markAsRead = useCallback((notificationId) => {
    notificationService.markAsRead(notificationId)
  }, [])

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead()
  }, [])

  const clear = useCallback(() => {
    notificationService.clear()
  }, [])

  /** Pide permiso de notificaciones del navegador (llamar desde un click). */
  const pedirPermiso = useCallback(() => notificationService.pedirPermiso(), [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clear,
    pedirPermiso,
  }
}
