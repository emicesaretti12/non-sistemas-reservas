import { supabase } from '../supabaseClient'

/**
 * Notification Service V2 — Real-time notifications for team
 * - Real-time subscription to new reservations
 * - Browser notifications with sound
 * - Persistent notification state
 * - Team notification broadcast
 */

const NOTIFICATION_KEY = 'ns_notifications_state'
const SOUND_URL = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YCIAAAAAAA=='

class NotificationService {
  constructor() {
    this.subscription = null
    this.listeners = []
    this.notifications = []
    this.soundEnabled = true
    this.browserNotificationsEnabled = false
    this.loadState()
  }

  /**
   * Initialize the notification service
   */
  async init(negocioId) {
    if (!negocioId) return

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      this.browserNotificationsEnabled = permission === 'granted'
    } else if ('Notification' in window) {
      this.browserNotificationsEnabled = Notification.permission === 'granted'
    }

    // Subscribe to new turnos (reservations)
    this.subscribeToReservations(negocioId)
  }

  /**
   * Subscribe to real-time reservation updates
   */
  subscribeToReservations(negocioId) {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }

    this.subscription = supabase
      .channel(`turnos:negocio_id=eq.${negocioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'turnos',
          filter: `negocio_id=eq.${negocioId}`,
        },
        (payload) => {
          this.handleNewReservation(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'turnos',
          filter: `negocio_id=eq.${negocioId}`,
        },
        (payload) => {
          this.handleReservationUpdate(payload.new)
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status)
      })
  }

  /**
   * Handle new reservation
   */
  async handleNewReservation(turno) {
    try {
      // Fetch client and service details
      const [clientRes, serviceRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', turno.cliente_id).single(),
        supabase.from('servicios').select('*').eq('id', turno.servicio_id).single(),
      ])

      const cliente = clientRes.data
      const servicio = serviceRes.data

      const notification = {
        id: turno.id,
        type: 'new_reservation',
        title: '¡Nueva reserva!',
        message: `${cliente?.nombre || 'Cliente'} reservó ${servicio?.nombre || 'un servicio'}`,
        timestamp: new Date().toISOString(),
        turno: turno,
        cliente: cliente,
        servicio: servicio,
        read: false,
      }

      this.addNotification(notification)
      this.playSound()
      this.showBrowserNotification(notification)
      this.broadcastToTeam(notification)
    } catch (error) {
      console.error('Error handling new reservation:', error)
    }
  }

  /**
   * Handle reservation updates (status changes)
   */
  async handleReservationUpdate(turno) {
    try {
      const [clientRes, serviceRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', turno.cliente_id).single(),
        supabase.from('servicios').select('*').eq('id', turno.servicio_id).single(),
      ])

      const cliente = clientRes.data
      const servicio = serviceRes.data

      let title = 'Actualización de reserva'
      let message = `Cambio en reserva de ${cliente?.nombre || 'Cliente'}`

      if (turno.estado === 'confirmado') {
        title = '✓ Reserva confirmada'
        message = `${cliente?.nombre || 'Cliente'} confirmó su reserva`
      } else if (turno.estado === 'cancelado') {
        title = '✗ Reserva cancelada'
        message = `${cliente?.nombre || 'Cliente'} canceló su reserva`
      } else if (turno.estado === 'completado') {
        title = '✓ Reserva completada'
        message = `Reserva de ${cliente?.nombre || 'Cliente'} finalizada`
      }

      const notification = {
        id: `${turno.id}_update_${Date.now()}`,
        type: 'reservation_update',
        title: title,
        message: message,
        timestamp: new Date().toISOString(),
        turno: turno,
        cliente: cliente,
        servicio: servicio,
        read: false,
      }

      this.addNotification(notification)
      this.showBrowserNotification(notification)
      this.broadcastToTeam(notification)
    } catch (error) {
      console.error('Error handling reservation update:', error)
    }
  }

  /**
   * Add notification to list
   */
  addNotification(notification) {
    this.notifications.unshift(notification)
    // Keep only last 50 notifications
    this.notifications = this.notifications.slice(0, 50)
    this.saveState()
    this.notifyListeners()
  }

  /**
   * Play notification sound
   */
  playSound() {
    if (!this.soundEnabled) return

    try {
      const audio = new Audio(SOUND_URL)
      audio.volume = 0.5
      audio.play().catch((e) => console.log('Could not play sound:', e))
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(notification) {
    if (!this.browserNotificationsEnabled || !('Notification' in window)) return

    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        tag: notification.id,
        requireInteraction: false,
      })
    } catch (error) {
      console.error('Error showing browser notification:', error)
    }
  }

  /**
   * Broadcast notification to all team members via localStorage
   */
  broadcastToTeam(notification) {
    try {
      const event = new CustomEvent('noni:notification', {
        detail: notification,
      })
      window.dispatchEvent(event)
    } catch (error) {
      console.error('Error broadcasting notification:', error)
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    const notification = this.notifications.find((n) => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.saveState()
      this.notifyListeners()
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true))
    this.saveState()
    this.notifyListeners()
  }

  /**
   * Get unread count
   */
  getUnreadCount() {
    return this.notifications.filter((n) => !n.read).length
  }

  /**
   * Get all notifications
   */
  getNotifications() {
    return this.notifications
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach((listener) => {
      listener({
        notifications: this.notifications,
        unreadCount: this.getUnreadCount(),
      })
    })
  }

  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      localStorage.setItem(
        NOTIFICATION_KEY,
        JSON.stringify({
          notifications: this.notifications,
          soundEnabled: this.soundEnabled,
        })
      )
    } catch (error) {
      console.error('Error saving notification state:', error)
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem(NOTIFICATION_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        this.notifications = parsed.notifications || []
        this.soundEnabled = parsed.soundEnabled !== false
      }
    } catch (error) {
      console.error('Error loading notification state:', error)
    }
  }

  /**
   * Clear all notifications
   */
  clear() {
    this.notifications = []
    this.saveState()
    this.notifyListeners()
  }

  /**
   * Destroy subscription
   */
  destroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
    this.listeners = []
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
