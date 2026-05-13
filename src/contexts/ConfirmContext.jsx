import React, { createContext, useContext, useState, useCallback } from 'react';

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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 m-4 animate-in zoom-in-95 duration-300">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmState.isDestructive ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
              {confirmState.isDestructive ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              )}
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2">{confirmState.title}</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">{confirmState.message}</p>
            <div className="flex gap-3">
              <button onClick={hideConfirm} className="flex-1 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                {confirmState.cancelText}
              </button>
              <button onClick={handleConfirm} className={`flex-1 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest text-white transition-colors shadow-md ${confirmState.isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}`}>
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
