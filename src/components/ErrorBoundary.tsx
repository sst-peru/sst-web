import { Component, type ErrorInfo, type ReactNode } from "react";

import { reportarError } from "../api/errores";

interface Estado {
  fallo: boolean;
}

/**
 * Atrapa un error de renderizado: lo reporta al API y muestra un aviso en lugar de dejar la
 * pantalla en blanco.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (info.componentStack) error.stack = `${error.stack ?? ""}\n${info.componentStack}`;
    reportarError(error);
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="centered">
        <div>
          <h1>Algo salió mal</h1>
          <p className="muted">
            El error ya se envió al equipo. Vuelve a cargar la página para continuar.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Volver a cargar
          </button>
        </div>
      </div>
    );
  }
}
