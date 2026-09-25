import { numero } from '../../utils/formato'

/**
 * Un número del panel, con separador de miles y cifras de ancho fijo.
 *
 * Antes subía contando desde cero cada vez que aparecía: eran 50 renders
 * seguidos al entrar al Monitor o a Reportes, justo mientras la pantalla
 * cambiaba, y la app de un banco o la de Salud no lo hacen. Ahora el número
 * está desde el primer cuadro. `prefijo`/`sufijo` van aparte ($, %).
 */
export default function Contador({ valor = 0, prefijo = '', sufijo = '', decimales = 0 }) {
  return (
    <span className="tabular-nums">
      {prefijo}
      {numero(valor, decimales)}
      {sufijo}
    </span>
  )
}
