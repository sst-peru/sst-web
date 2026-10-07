import { useQuery } from "@tanstack/react-query";

import { experiments } from "../../api/endpoints";

const VARIANT_LABEL: Record<string, string> = {
  rapido: "Formulario rápido (3-4 taps)",
  largo: "Formulario largo (10+ campos)",
};

const etiqueta = (variante: string) => VARIANT_LABEL[variante] ?? variante;

export default function ExperimentPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["experiment", "report_form"],
    queryFn: () => experiments.results("report_form"),
  });

  if (isLoading) return <div className="centered">Cargando resultados…</div>;

  const comparacion = data?.comparison ?? null;

  return (
    <>
      <header className="page-head">
        <h1>{data?.experiment.name}</h1>
        <p className="muted">{data?.experiment.description}</p>
      </header>

      {/* US125: lo primero que se ve es de dónde vienen los números. */}
      {data?.demo_data && (
        <p className="card aviso" role="status">
          <strong>Datos de demostración.</strong> Esta empresa la carga el comando{" "}
          <code>seed_demo</code> con historia generada: los resultados sirven para ver cómo
          se presenta el experimento, no para concluir nada sobre el comportamiento real de
          trabajadores.
        </p>
      )}

      {data && !data.sample_sufficient && (
        <p className="card aviso" role="status">
          <strong>Muestra insuficiente.</strong> Alguna variante tiene menos de{" "}
          {data.min_users_per_variant} sujetos asignados. Por debajo de ese número el
          intervalo de confianza sale tan ancho que no permite concluir, y la aproximación
          normal que se usa para calcularlo deja de ser razonable.
        </p>
      )}

      {/* US126: el resultado es el intervalo, no el porcentaje. */}
      {comparacion && (
        <section className={comparacion.conclusive ? "card" : "card aviso"}>
          <h2>Diferencia en reportes por usuario</h2>
          <div className="kpi-grid">
            <div className="kpi">
              <span className="kpi-value">
                {comparacion.difference === null
                  ? "—"
                  : `${comparacion.difference > 0 ? "+" : ""}${comparacion.difference}`}
              </span>
              <span className="kpi-label">
                Diferencia observada
                <br />
                {etiqueta(comparacion.variants[0])} − {etiqueta(comparacion.variants[1])}
              </span>
            </div>
            <div className="kpi">
              <span className="kpi-value">
                {comparacion.ci_low === undefined
                  ? "—"
                  : `[${comparacion.ci_low} ; ${comparacion.ci_high}]`}
              </span>
              <span className="kpi-label">
                Intervalo de confianza al {comparacion.confidence_level_pct ?? 95} %
              </span>
            </div>
            <div className="kpi">
              <span className="kpi-value">
                {comparacion.conclusive ? "Sí" : "No"}
              </span>
              <span className="kpi-label">¿Se distingue del azar?</span>
            </div>
            {comparacion.lift_pct !== null && comparacion.lift_pct !== undefined && (
              <div className="kpi">
                <span className="kpi-value">
                  {comparacion.lift_pct > 0 ? "+" : ""}
                  {comparacion.lift_pct}%
                </span>
                <span className="kpi-label">
                  Variación relativa
                  <br />
                  la hipótesis espera cerca de +100 %
                </span>
              </div>
            )}
          </div>
          <p className="small">{comparacion.reading}</p>
          {comparacion.standard_error !== undefined && (
            <p className="muted small">
              Error estándar {comparacion.standard_error}. El intervalo se calcula sobre la
              diferencia de medias de reportes por usuario con la aproximación normal de
              Welch, contando como cero a los usuarios asignados que no reportaron.
            </p>
          )}
        </section>
      )}

      <section className="card">
        <h2>Resultados por variante</h2>
        <table>
          <thead>
            <tr>
              <th>Variante</th>
              <th>Usuarios</th>
              <th>Reportes</th>
              <th>Reportes por usuario</th>
              <th>Desviación estándar</th>
              <th>Con foto</th>
              <th>MTTR (h)</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((row) => (
              <tr key={row.variant}>
                <td>{etiqueta(row.variant)}</td>
                <td>{row.users}</td>
                <td>{row.reports}</td>
                <td>
                  <strong>{row.reports_per_user ?? "—"}</strong>
                </td>
                <td>{row.reports_per_user_sd}</td>
                <td>{row.reports_with_photo}</td>
                <td>{row.mttr_hours ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          La asignación es determinística por usuario, así que estos grupos no cambian entre
          corridas. Los reportes se cuentan por la variante que quedó grabada en cada
          reporte, no por la del autor: un reporte anterior al inicio del experimento no se
          atribuye a ninguna variante.
        </p>
      </section>
    </>
  );
}
