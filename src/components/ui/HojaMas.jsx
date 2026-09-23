import { AnimatePresence, motion } from 'framer-motion'
import { haptic } from '../../utils/haptics'
import { RESORTE_PANEL } from '../../utils/motion'

/**
 * "Más": las secciones que no entran en el dock.
 *
 * Es la pestaña Más de iOS. Antes, en el celular, había dos navegaciones a
 * la vez —una tira de pestañas arriba que repetía las del dock— y la mitad
 * de las secciones sólo se alcanzaba deslizando esa tira. Ahora el dock
 * tiene cuatro destinos fijos y todo lo demás vive acá, a un toque, junto
 * con las acciones de la cuenta (cerrar sesión ya no está al lado de la
 * campana, donde se tocaba sin querer).
 *
 * Se cierra tocando afuera, con la cruz, con Esc o deslizándola hacia abajo
 * (useHojasArrastrables).
 */
export default function HojaMas({ abierta, onCerrar, secciones, actual, onElegir, onCopiarLink, onCerrarSesion }) {
  return (
    <AnimatePresence>
      {abierta && (
        <motion.div
          key="velo-mas"
          className="ui-scrim flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCerrar}
          role="presentation"
        >
          <motion.div
            className="ns-hoja ns-hoja--motion ns-mas w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            initial={{ y: '105%' }}
            animate={{ y: 0 }}
            exit={{ y: '105%' }}
            transition={RESORTE_PANEL}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ui-sheet__handle" />
            <div className="px-5 pt-1 pb-5">
              <div className="flex items-center justify-between">
                <h2 className="ui-head__title text-2xl">Más</h2>
                <button type="button" onClick={onCerrar} className="ui-icon-btn" aria-label="Cerrar">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-4">
                {secciones.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { haptic('select'); onElegir(s.id) }}
                    aria-current={actual === s.id ? 'page' : undefined}
                    className={`ns-mas__item ${actual === s.id ? 'is-active' : ''}`}
                  >
                    <span className="ns-mas__icono" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d={s.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span className="ns-mas__texto">{s.label}</span>
                  </button>
                ))}
              </div>

              <div className="ns-mas__lista mt-4">
                {onCopiarLink && (
                  <button type="button" className="ns-mas__fila" onClick={() => { haptic('success'); onCopiarLink() }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Copiar link de reservas
                  </button>
                )}
                <button type="button" className="ns-mas__fila ns-mas__fila--peligro" onClick={() => { haptic('warning'); onCerrarSesion() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
