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

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const message = this.props.fallbackMessage || 'Algo salió mal en esta sección';
      const detalle = this.state.error?.message;

      return (
        <div className="ui-card m-4 flex flex-col items-center justify-center text-center gap-4 p-8">
          {/* Icono de advertencia, hundido en el papel */}
          <div className="ui-pod ui-pod--lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
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
            <h3 className="ui-empty__title">{message}</h3>
            <p className="ui-empty__text max-w-sm">
              Ocurrió un error inesperado. Podés reintentar o escribirnos si vuelve a pasar.
            </p>
          </div>

          {/* Detalle técnico: ayuda muchísimo cuando el usuario reporta el error */}
          {detalle && (
            <p className="ui-inset-sm text-[11px] font-mono px-3.5 py-2.5 max-w-sm break-words" style={{ color: 'var(--ns-text-muted)' }}>
              {detalle}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5 justify-center mt-1">
            <button onClick={this.handleReset} className="ui-btn ui-btn--primary ui-btn--pill">
              Reintentar
            </button>
            <button onClick={this.handleReload} className="ui-btn ui-btn--pill">
              Recargar la página
            </button>
          </div>
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
