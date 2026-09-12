import { useQuery } from "@tanstack/react-query";

import { experiments } from "../../api/endpoints";

const VARIANT_LABEL: Record<string, string> = {
  rapido: "Formulario rápido (3-4 taps)",
  largo: "Formulario largo (10+ campos)",
};

export default function ExperimentPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["experiment", "report_form"],
    queryFn: () => experiments.results("report_form"),
  });

  if (isLoading) return <div className="centered">Cargando resultados…</div>;

  return (
    <>
      <header className="page-head">
        <h1>{data?.experiment.name}</h1>
        <p className="muted">{data?.experiment.description}</p>
      </header>

      {data?.lift_pct_first_vs_second !== null && (
        <section className="card kpi">
          <span className="kpi-label">Diferencia en reportes por usuario</span>
          <strong className="kpi-value">
            {data?.lift_pct_first_vs_second !== undefined &&
            data?.lift_pct_first_vs_second !== null
              ? `${data.lift_pct_first_vs_second > 0 ? "+" : ""}${data.lift_pct_first_vs_second}%`
              : "—"}
          </strong>
          <span className="muted small">
            Formulario rápido frente al largo. La hipótesis espera cerca de +100%.
          </span>
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
              <th>Con foto</th>
              <th>MTTR (h)</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((row) => (
              <tr key={row.variant}>
                <td>{VARIANT_LABEL[row.variant] ?? row.variant}</td>
                <td>{row.users}</td>
                <td>{row.reports}</td>
                <td>
                  <strong>{row.reports_per_user ?? "—"}</strong>
                </td>
                <td>{row.reports_with_photo}</td>
                <td>{row.mttr_hours ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          La asignación es determinística por usuario, así que estos grupos no cambian entre
          corridas. Para la sustentación conviene reportar también el tamaño de cada grupo: con
          pocos usuarios la diferencia puede no ser significativa.
        </p>
      </section>
    </>
  );
}
