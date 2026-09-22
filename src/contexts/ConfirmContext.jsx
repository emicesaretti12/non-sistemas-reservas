import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    isDestructive: false
  });

  const showConfirm = useCallback(({ title, message, onConfirm, onCancel = null, confirmText = 'Sí, Continuar', cancelText = 'Volver', isDestructive = false }) => {
    setConfirmState({
      show: true,
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      isDestructive
    });
  }, []);

  // Cerrar con Escape (accesibilidad + hábito de escritorio).
  useEffect(() => {
    if (!confirmState.show) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (confirmState.onCancel) confirmState.onCancel();
        setConfirmState(prev => ({ ...prev, show: false }));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmState.show, confirmState.onCancel]);

  const hideConfirm = () => {
    if (confirmState.onCancel) confirmState.onCancel();
    setConfirmState(prev => ({ ...prev, show: false }));
  };

  const handleConfirm = () => {
    if (confirmState.onConfirm) confirmState.onConfirm();
    setConfirmState(prev => ({ ...prev, show: false }));
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirmState.show && (
        <div
          className="neo-scrim flex items-center justify-center p-4"
          onClick={hideConfirm}
          role="presentation"
        >
          <div
            className="neo-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ns-confirm-title"
            aria-describedby="ns-confirm-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="neo-avatar w-14 h-14 mb-4"
              style={confirmState.isDestructive
                ? { background: 'var(--ns-primary)', color: 'var(--ns-paper)', boxShadow: 'var(--neo-brand)' }
                : { background: 'var(--ns-sunken)', boxShadow: 'var(--neo-inset-sm)' }}
            >
              {confirmState.isDestructive ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              )}
            </div>
            <h3
              id="ns-confirm-title"
              className="font-display text-xl font-black tracking-tight mb-2"
              style={{ color: 'var(--ns-text)' }}
            >
              {confirmState.title}
            </h3>
            <p
              id="ns-confirm-desc"
              className="text-[13.5px] font-medium leading-relaxed mb-6"
              style={{ color: 'var(--ns-text-secondary)' }}
            >
              {confirmState.message}
            </p>
            <div className="flex gap-3">
              <button onClick={hideConfirm} className="neo-btn flex-1">
                {confirmState.cancelText}
              </button>
              <button onClick={handleConfirm} autoFocus className="neo-btn neo-btn--primary flex-1">
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Hook de confirmación. Si por alguna razón no hay provider (tests, islas de
 * render), devolvemos un no-op en vez de romper la pantalla entera.
 */
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  return ctx || { showConfirm: ({ onConfirm }) => onConfirm && onConfirm() };
};
