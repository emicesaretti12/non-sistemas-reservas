import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Información del componente:', errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const message = this.props.fallbackMessage || 'Algo salió mal en esta sección';

      return (
        <div className="animate-in fade-in bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center gap-4">
          {/* Icono de advertencia */}
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          {/* Texto */}
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-slate-900">{message}</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Ocurrió un error inesperado. Podés intentar nuevamente o contactar soporte si el problema persiste.
            </p>
          </div>

          {/* Botón reintentar */}
          <button
            onClick={this.handleReset}
            className="mt-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-slate-800 active:scale-[0.97] transition-all cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper funcional para usar ErrorBoundary de forma más sencilla.
 * Uso: <ErrorGuard fallbackMessage="Mensaje personalizado">...</ErrorGuard>
 */
export function ErrorGuard({ children, fallbackMessage }) {
  return (
    <ErrorBoundary fallbackMessage={fallbackMessage}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
