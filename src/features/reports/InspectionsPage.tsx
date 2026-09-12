import { useQuery } from "@tanstack/react-query";

import { metrics } from "../../api/endpoints";

export default function InspectionsPage() {
  const { data } = useQuery({ queryKey: ["compliance"], queryFn: () => metrics.compliance(90) });

  return (
    <>
      <header className="page-head">
        <h1>Inspecciones periódicas</h1>
        <p className="muted">Cumplimiento de los últimos 90 días</p>
      </header>

      <section className="kpi-grid">
        <article className="card kpi">
          <span className="kpi-label">Programadas</span>
          <strong className="kpi-value">{data?.scheduled ?? "—"}</strong>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Realizadas</span>
          <strong className="kpi-value">{data?.performed ?? "—"}</strong>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Cumplimiento</span>
          <strong className="kpi-value">
            {data?.compliance_rate_pct !== null && data?.compliance_rate_pct !== undefined
              ? `${data.compliance_rate_pct}%`
              : "—"}
          </strong>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Vencidas</span>
          <strong className="kpi-value alert">{data?.overdue ?? "—"}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Por área</h2>
        <table>
          <thead>
            <tr>
              <th>Área</th>
              <th>Programadas</th>
              <th>Realizadas</th>
            </tr>
          </thead>
          <tbody>
            {data?.by_area.map((row) => (
              <tr key={row.area ?? "sin-area"}>
                <td>{row.area ?? "Sin área"}</td>
                <td>{row.scheduled}</td>
                <td>{row.performed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
