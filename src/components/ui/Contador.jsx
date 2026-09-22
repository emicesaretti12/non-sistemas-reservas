import { useCountUp } from '../../hooks/useCountUp'

/**
 * Número que sube contando. `prefijo`/`sufijo` quedan fuera de la animación
 * para que el signo $ o el % no parpadeen.
 */
export default function Contador({ valor = 0, prefijo = '', sufijo = '', decimales = 0, duracion = 900 }) {
  const n = useCountUp(valor, { duracion, decimales })
  return (
    <span className="tabular-nums">
      {prefijo}
      {n.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
      {sufijo}
    </span>
  )
}
