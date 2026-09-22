import { useEffect, useState } from 'react'

const ATAJOS = [
  { teclas: ['⌘', 'K'], desc: 'Buscar en todo el panel' },
  { teclas: ['?'], desc: 'Ver esta ayuda' },
  { teclas: ['Esc'], desc: 'Cerrar lo que esté abierto' },
  { teclas: ['←', '→'], desc: 'Moverte en el tour guiado' },
]

/**
 * Ayuda de atajos, con "?".
 *
 * Sólo tiene sentido en escritorio, así que no se muestra en pantallas chicas
 * ni se engancha al teclado cuando el foco está en un campo de texto.
 */
export default function Atajos() {
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    const alTeclear = (e) => {
      const editando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)
        || e.target?.isContentEditable
      if (editando) return
      if (e.key === '?') { e.preventDefault(); setAbierto((v) => !v) }
      else if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [])

  if (!abierto) return null

  return (
    <div
      className="neo-scrim flex items-center justify-center p-4"
      onClick={() => setAbierto(false)}
      role="presentation"
    >
      <div
        className="neo-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Atajos de teclado"
      >
        <h3 className="neo-head__title text-xl mb-1">Atajos</h3>
        <p className="text-[12px] font-medium mb-5" style={{ color: 'var(--ns-text-muted)' }}>
          Para moverte sin soltar el teclado.
        </p>

        <div className="flex flex-col gap-2.5">
          {ATAJOS.map((a) => (
            <div key={a.desc} className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--ns-text-secondary)' }}>{a.desc}</span>
              <span className="flex gap-1.5 shrink-0">
                {a.teclas.map((t) => (
                  <kbd
                    key={t}
                    className="min-w-[30px] text-center text-[11px] font-black px-2 py-1.5 rounded-lg"
                    style={{ background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset-sm)', color: 'var(--ns-text)' }}
                  >
                    {t}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>

        <button onClick={() => setAbierto(false)} className="neo-btn neo-btn--block mt-6">Cerrar</button>
      </div>
    </div>
  )
}
