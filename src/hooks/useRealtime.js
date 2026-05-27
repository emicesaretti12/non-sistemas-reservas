import { useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Hook para suscribirse a cambios en tiempo real de Supabase.
 * @param {string} channelName - Nombre único del canal
 * @param {string} table - Nombre de la tabla
 * @param {string} event - 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {string} filter - Filtro (ej: 'negocio_id=eq.xxx')
 * @param {Function} callback - Función a ejecutar cuando llega un evento
 * @param {boolean} enabled - Si está habilitado (default: true)
 */
export function useRealtime(channelName, table, event, filter, callback, enabled = true) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled || !filter) return

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event,
        schema: 'public',
        table,
        filter
      }, (payload) => {
        callbackRef.current(payload)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, table, event, filter, enabled])
}
