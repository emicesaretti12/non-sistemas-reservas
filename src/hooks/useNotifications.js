import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '../utils/notificationService'

/**
 * Hook para usar notificaciones en tiempo real
 */
export function useNotifications(negocioId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Initialize service
    if (negocioId) {
      notificationService.init(negocioId)
    }

    // Subscribe to changes
    const unsubscribe = notificationService.subscribe(({ notifications, unreadCount }) => {
      setNotifications(notifications)
      setUnreadCount(unreadCount)
    })

    // Load initial state
    setNotifications(notificationService.getNotifications())
    setUnreadCount(notificationService.getUnreadCount())

    // Listen for custom events from other tabs
    const handleNotification = (event) => {
      setNotifications(notificationService.getNotifications())
      setUnreadCount(notificationService.getUnreadCount())
    }

    window.addEventListener('noni:notification', handleNotification)

    return () => {
      unsubscribe()
      window.removeEventListener('noni:notification', handleNotification)
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

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clear,
  }
}
