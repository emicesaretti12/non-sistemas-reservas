import { motion } from 'framer-motion'

/**
 * La lente de vidrio que marca la opción activa.
 *
 * Se renderiza DENTRO de la opción elegida. Cuando la elección cambia, la
 * lente se desmonta de una opción y se monta en otra con el mismo `layoutId`,
 * y framer-motion la hace viajar entre las dos posiciones estirándose en el
 * camino, como una gota: es el gesto que define a Liquid Glass.
 *
 * `grupo` separa lentes independientes (el riel, el dock, cada segmentado):
 * dos lentes con el mismo grupo en pantalla se pelearían por la posición.
 */
const RESORTE_LENTE = { type: 'spring', stiffness: 460, damping: 36, mass: 0.9 }

export default function Lente({ grupo, className = '' }) {
  return (
    <motion.span
      layoutId={`lente-${grupo}`}
      className={`ui-lens ${className}`}
      transition={RESORTE_LENTE}
      aria-hidden="true"
    />
  )
}
