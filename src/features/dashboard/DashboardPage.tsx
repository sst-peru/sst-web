import { useQuery } from "@tanstack/react-query";

import { committee, exportar, metrics } from "../../api/endpoints";

function formatHours(hours: number | null | undefined) {
  if (hours === null || hours === undefined) return "—";
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} días`;
}

export default function DashboardPage() {
  const mttr = useQuery({ queryKey: ["mttr"], queryFn: () => metrics.mttr(90) });
  const compliance = useQuery({
    queryKey: ["compliance"],
    queryFn: () => metrics.compliance(90),
  });
  const comite = useQuery({
    queryKey: ["committee-compliance"],
    queryFn: committee.compliance,
  });

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Tablero de SST</h1>
          <p className="muted">Últimos 90 días</p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => exportar("reports")}>
            Exportar reportes
          </button>
          <button type="button" className="secondary" onClick={() => exportar("inspections")}>
            Exportar inspecciones
          </button>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="card kpi">
          <span className="kpi-label">MTTR de hallazgos</span>
          <strong className="kpi-value">{formatHours(mttr.data?.mttr_hours)}</strong>
          <span className="muted small">Tiempo promedio entre reporte y cierre</span>
        </article>

        <article className="card kpi">
          <span className="kpi-label">Hallazgos abiertos</span>
          <strong className="kpi-value">{mttr.data?.open_reports ?? "—"}</strong>
          <span className="muted small">Pendientes de cierre</span>
        </article>

        <article className="card kpi">
          <span className="kpi-label">Cumplimiento de inspecciones</span>
          <strong className="kpi-value">
            {compliance.data?.compliance_rate_pct !== null &&
            compliance.data?.compliance_rate_pct !== undefined
              ? `${compliance.data.compliance_rate_pct}%`
              : "—"}
          </strong>
          <span className="muted small">
            {compliance.data
              ? `${compliance.data.performed} de ${compliance.data.scheduled} programadas`
              : ""}
          </span>
        </article>

        <article className="card kpi">
          <span className="kpi-label">Inspecciones vencidas</span>
          <strong className="kpi-value alert">{compliance.data?.overdue ?? "—"}</strong>
          <span className="muted small">Pasaron su fecha y no se hicieron</span>
        </article>

        <article className="card kpi">
          <span className="kpi-label">Acuerdos del comité</span>
          <strong className="kpi-value">
            {comite.data?.agreements_compliance_pct != null
              ? `${comite.data.agreements_compliance_pct}%`
              : "—"}
          </strong>
          <span className="muted small">
            {comite.data?.has_committee
              ? `${comite.data.agreements_done ?? 0} de ${comite.data.agreements_total ?? 0} cumplidos`
              : "Sin comité registrado"}
          </span>
        </article>

        <article className="card kpi">
          <span className="kpi-label">Actas registradas</span>
          <strong className="kpi-value">{comite.data?.meetings_total ?? 0}</strong>
          <span className="muted small">
            {comite.data?.meetings_with_quorum ?? 0} con quórum válido
          </span>
        </article>
      </section>

      <section className="card">
        <h2>MTTR por severidad</h2>
        <table>
          <thead>
            <tr>
              <th>Severidad</th>
              <th>Hallazgos cerrados</th>
              <th>MTTR</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(mttr.data?.by_severity ?? {}).map(([severity, row]) => (
              <tr key={severity}>
                <td>{severity}</td>
                <td>{row.closed}</td>
                <td>{formatHours(row.mttr_hours)}</td>
              </tr>
            ))}
            {!Object.keys(mttr.data?.by_severity ?? {}).length && (
              <tr>
                <td colSpan={3} className="muted">
                  Todavía no hay hallazgos cerrados en la ventana.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
