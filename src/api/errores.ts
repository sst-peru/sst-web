/**
 * Reporte de errores no controlados al API (TS24).
 *
 * Se manda solo lo que sirve para diagnosticar: mensaje, traza, versión y la ruta de la
 * pantalla sin su cadena de consulta. Nunca el contenido de un formulario, porque un reporte
 * de acto inseguro puede nombrar a un compañero.
 */
import { version } from "../../package.json";
import { api } from "./client";

// Un error que se repite en bucle (un render que falla en cada actualización) no debe
// inundar el API: se manda cada mensaje una sola vez por sesión y como mucho diez en total.
const enviados = new Set<string>();
const MAXIMO_POR_SESION = 10;

export function reportarError(error: unknown) {
  const mensaje =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "Error");
  if (enviados.has(mensaje) || enviados.size >= MAXIMO_POR_SESION) return;
  enviados.add(mensaje);

  const traza = error instanceof Error ? (error.stack ?? "") : "";
  // Fallar al reportar no puede generar otro error que reportar.
  api
    .post("/client-errors/", {
      platform: "WEB",
      app_version: version,
      message: mensaje.slice(0, 500),
      stack: traza.slice(0, 8000),
      url: window.location.pathname,
    })
    .catch(() => undefined);
}

/** Engancha los errores que ningún componente atrapó. Se llama una vez al iniciar. */
export function instalarReporteDeErrores() {
  window.addEventListener("error", (evento) => reportarError(evento.error ?? evento.message));
  window.addEventListener("unhandledrejection", (evento) => reportarError(evento.reason));
}
