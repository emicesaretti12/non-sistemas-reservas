import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { getVocabulario } from '../utils/vocabulario'

/**
 * NOTIFICATION CENTER — Real-time notification bell for new bookings.
 * Shows unread count badge and a dropdown with recent activity.
 */
export default function NotificationCenter({ negocioId, rubro }) {
  const vocab = getVocabulario(rubro)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const ref = useRef(null)

  useEffect(() => {
    if (negocioId) fetchNotifications()
  }, [negocioId])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Subscribe to real-time new bookings
  useEffect(() => {
    if (!negocioId) return

    const channel = supabase
      .channel('turnos-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'turnos',
        filter: `negocio_id=eq.${negocioId}`
      }, (payload) => {
        const turno = payload.new
        const newNotif = {
          id: turno.id,
          type: 'new_booking',
          title: '🔔 Nueva Reserva',
          message: `${turno.cliente_nombre} reservó un turno`,
          time: new Date(turno.fecha_hora || Date.now()),
          read: false,
        }
        setNotifications(prev => [newNotif, ...prev].slice(0, 20))
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [negocioId])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('turnos')
        .select('id, cliente_nombre, fecha_hora, servicios(nombre)')
        .eq('negocio_id', negocioId)
        .order('fecha_hora', { ascending: false })
        .limit(15)

      if (data) {
        const now = new Date()
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        
        setNotifications(data.map(t => ({
          id: t.id,
          type: 'new_booking',
          title: 'Reserva',
          message: `${t.cliente_nombre} — ${t.servicios?.nombre || vocab.servicio}`,
          time: new Date(t.fecha_hora),
          read: new Date(t.fecha_hora) < twentyFourHoursAgo,
        })))

        const recentCount = data.filter(t => {
          const d = new Date(t.fecha_hora)
          return d >= twentyFourHoursAgo
        }).length
        setUnreadCount(Math.min(recentCount, 9))
      }
    } catch (e) {
      console.error('Notifications error:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date) => {
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Ahora'
    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const markAllRead = () => {
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead() }}
        className="relative w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-all active:scale-90"
        aria-label="Notificaciones"
      >
        <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Notificaciones</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Actividad reciente</p>
            </div>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-[9px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-700 transition-colors">
                Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"/>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!n.read ? 'bg-blue-100 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{n.message}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">{n.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400">{formatTimeAgo(n.time)}</span>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500"/>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
