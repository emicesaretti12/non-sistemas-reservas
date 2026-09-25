/**
 * El fondo que marca la opción activa de un control segmentado.
 *
 * Se dibuja dentro de la opción elegida (`inset: 0`) y ahí se queda: cambia
 * de lugar en el mismo cuadro en que cambia la selección, como en iOS al
 * tocar un segmento con muchas opciones. Antes viajaba de una opción a otra
 * midiendo las dos con `getBoundingClientRect`, y cada medición obligaba al
 * navegador a recalcular el layout de la pantalla entera justo en el toque:
 * era buena parte de lo que se sentía trabado.
 *
 * El dock y el riel ya no la usan: el dock desliza una sola pieza por CSS
 * (sin medir nada) y el riel pinta la fila elegida.
 */
export default function Lente({ className = '' }) {
  return <span className={`ui-lens ${className}`} aria-hidden="true" />
}
