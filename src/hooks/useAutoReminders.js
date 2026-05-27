import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Hook para gestión automática de recordatorios.
 * Carga turnos del día actual y del siguiente que no tienen recordatorio enviado.
 */
export function useAutoReminders(negocioId, vocab) {
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cargarPendientes = useCallback(async () => {
    if (!negocioId) return
    setLoading(true)
    try {
      const ahora = new Date()
      // Get today and tomorrow's start/end
      const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
      const mananaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 2)
      
      const { data, error } = await supabase
        .from('turnos')
        .select('*, servicios(nombre, precio, duracion_minutos), empleados(nombre)')
        .eq('negocio_id', negocioId)
        .eq('estado', 'confirmado')
        .eq('recordatorio_enviado', false)
        .gte('fecha_hora', hoyInicio.toISOString())
        .lt('fecha_hora', mananaFin.toISOString())
        .order('fecha_hora', { ascending: true })

      if (!error && data) {
        // Only future appointments
        const futuros = data.filter(t => new Date(t.fecha_hora) > ahora)
        setPendientes(futuros)
      }
    } catch (e) {
      console.error('Error cargando recordatorios:', e.message)
    } finally {
      setLoading(false)
    }
  }, [negocioId])

  useEffect(() => {
    cargarPendientes()
    // Refresh every 5 minutes
    const interval = setInterval(cargarPendientes, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [cargarPendientes])

  const enviarRecordatorio = useCallback(async (turno) => {
    const num = turno.cliente_telefono?.replace(/[^0-9]/g, '') || ''
    const nombreCorto = turno.cliente_nombre?.split(' ')[0] || ''
    const servNombre = turno.servicios?.nombre?.toLowerCase() || vocab?.servicio || 'turno'
    const hora = new Date(turno.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    const fecha = new Date(turno.fecha_hora)
    const esHoy = fecha.toDateString() === new Date().toDateString()
    const diaStr = esHoy ? 'hoy' : 'mañana'
    
    const mje = `Hola ${nombreCorto}, te recuerdo tu ${servNombre} ${diaStr} a las ${hora} hs. ¡Te esperamos!`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(mje)}`, '_blank')

    const { error } = await supabase
      .from('turnos')
      .update({ recordatorio_enviado: true })
      .eq('id', turno.id)

    if (!error) {
      setPendientes(prev => prev.filter(t => t.id !== turno.id))
    }
    return !error
  }, [vocab])

  const enviarTodos = useCallback(async () => {
    setEnviando(true)
    for (const turno of pendientes) {
      await enviarRecordatorio(turno)
      // Small delay between opens to not overwhelm the browser
      await new Promise(r => setTimeout(r, 800))
    }
    setEnviando(false)
  }, [pendientes, enviarRecordatorio])

  return {
    pendientes,
    loading,
    enviando,
    enviarRecordatorio,
    enviarTodos,
    refetch: cargarPendientes,
    count: pendientes.length
  }
}
