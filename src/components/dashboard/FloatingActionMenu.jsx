/**
 * FloatingActionMenu — FAB con acciones rápidas. Visible en móvil principalmente.
 * Expand/collapse al tocar.
 */
import { useState, useEffect } from 'react'

export default function FloatingActionMenu({ actions = [], publicLink, onCopyLink, label = 'Acciones' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!actions || actions.length === 0) return null

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[85] bg-[#1A1814]/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
          data-testid="fab-backdrop"
        />
      )}

      {/* Action items (expanded) */}
      {open && (
        <div className="fixed bottom-[90px] md:bottom-6 right-4 md:right-6 z-[86] flex flex-col-reverse items-end gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200" data-testid="fab-actions">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => { action.onClick(); setOpen(false) }}
              data-testid={`fab-action-${action.id || idx}`}
              className="group flex items-center gap-3 pl-4 pr-2 py-1.5 bg-white border border-stone-300 rounded-full shadow-xl hover:border-[#FF4F00] hover:bg-[#FFF1EA] transition-all"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <span className="text-[12px] font-bold text-[#1A1814] group-hover:text-[#FF4F00] whitespace-nowrap" style={{ fontFamily: '"Inter Tight", sans-serif' }}>
                {action.label}
              </span>
              <span className="w-8 h-8 rounded-full bg-[#1A1814] text-[#F5F2EA] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                </svg>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* FAB toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar acciones' : label}
        data-testid="fab-toggle"
        className={`fixed bottom-[80px] md:bottom-5 right-4 md:right-6 z-[87] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-[#F5F2EA] text-[#1A1814] rotate-45 ring-2 ring-[#FF4F00]'
            : 'bg-[#1A1814] text-[#F5F2EA] hover:bg-[#FF4F00] active:scale-95'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FF4F00] ring-2 ring-[#F5F2EA]" />
      </button>
    </>
  )
}
