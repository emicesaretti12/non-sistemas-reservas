import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { guardar, leer, suscribir } from '../utils/almacen'

/**
 * `useState` que sobrevive a recargas y se sincroniza entre pestañas.
 *
 *   const [vista, setVista] = usePersistentState('agenda:vista', 'dia')
 *
 * `validar` (opcional) filtra valores guardados que ya no sirven — una
 * pestaña que dejó de existir, un empleado dado de baja — y en ese caso se
 * usa el inicial. `ttl` en milisegundos para borradores que no deben volver
 * a aparecer una semana después.
 */
function leerValido(clave, inicial, validar) {
  const guardado = clave ? leer(clave) : null
  if (guardado === null) return inicial
  return !validar || validar(guardado) ? guardado : inicial
}

export function usePersistentState(clave, inicial, { validar, ttl } = {}) {
  const opciones = useRef({ validar, ttl, inicial })
  useLayoutEffect(() => {
    opciones.current = { validar, ttl, inicial }
  })

  const [valor, setValor] = useState(() => leerValido(clave, inicial, validar))

  // Si cambia la clave (otro negocio, otro producto), se relee lo guardado
  // para la clave nueva durante el render, sin un cuadro intermedio viejo.
  const [claveVista, setClaveVista] = useState(clave)
  if (clave !== claveVista) {
    setClaveVista(clave)
    setValor(leerValido(clave, inicial, validar))
  }

  // Otra pestaña (u otro componente) cambió la misma clave.
  useEffect(() => {
    if (!clave) return undefined
    return suscribir(clave, (nuevo) => {
      const { validar: v, inicial: ini } = opciones.current
      setValor(nuevo === null || (v && !v(nuevo)) ? ini : nuevo)
    })
  }, [clave])

  const actualizar = useCallback((siguiente) => {
    setValor((previo) => {
      const resuelto = typeof siguiente === 'function' ? siguiente(previo) : siguiente
      if (clave && !Object.is(resuelto, previo)) {
        // Fuera del render: `guardar` avisa a los suscriptores y eso dispara setState.
        queueMicrotask(() => guardar(clave, resuelto, { ttl: opciones.current.ttl }))
      }
      return resuelto
    })
  }, [clave])

  return [valor, actualizar]
}
