import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";

import { reports } from "../../api/endpoints";
import { useAuth } from "../auth/AuthContext";

export default function ReportDetailPage() {
  const { id } = useParams();
  const reportId = Number(id);
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => reports.detail(reportId),
  });

  const close = useMutation({
    mutationFn: () => reports.close(reportId, note),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["report", reportId] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["mttr"] });
    },
  });

  if (isLoading || !report) return <div className="centered">Cargando…</div>;

  return (
    <>
      <header className="page-head">
        <h1>
          Reporte #{report.id} — {report.kind === "ACTO" ? "Acto inseguro" : "Condición insegura"}
        </h1>
        <p className="muted">
          Reportado por {report.reported_by_name} el{" "}
          {new Date(report.created_at).toLocaleString("es-PE")}
          {report.synced_offline && " · llegó por sincronización offline"}
        </p>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h2>Detalle</h2>
          <dl>
            <dt>Categoría</dt>
            <dd>{report.category_name ?? "—"}</dd>
            <dt>Área</dt>
            <dd>{report.area_name ?? "—"}</dd>
            <dt>Severidad</dt>
            <dd>{report.severity}</dd>
            <dt>Estado</dt>
            <dd>{report.status}</dd>
            <dt>Ocurrió</dt>
            <dd>{new Date(report.occurred_at).toLocaleString("es-PE")}</dd>
            <dt>Ubicación</dt>
            <dd>
              {report.latitude && report.longitude ? (
                <a
                  href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {report.latitude}, {report.longitude}
                </a>
              ) : (
                "Sin GPS"
              )}
            </dd>
            <dt>Tiempo de resolución</dt>
            <dd>
              {report.resolution_hours !== null
                ? `${report.resolution_hours.toFixed(1)} h`
                : "Sin cerrar"}
            </dd>
          </dl>
          {report.description && <p>{report.description}</p>}
          {report.photo && <img className="report-photo" src={report.photo} alt="Evidencia" />}
        </section>

        <section className="card">
          <h2>Bitácora</h2>
          <ol className="timeline">
            {report.actions.map((action) => (
              <li key={action.id}>
                <strong>{action.author_name}</strong>
                <span className="muted small">
                  {new Date(action.created_at).toLocaleString("es-PE")}
                </span>
                <p>{action.note}</p>
              </li>
            ))}
            {!report.actions.length && <li className="muted">Sin acciones registradas.</li>}
          </ol>

          {canManage && report.status !== "CERRADO" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                close.mutate();
              }}
            >
              <label htmlFor="note">Acción correctiva aplicada</label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                rows={3}
              />
              <button type="submit" disabled={close.isPending}>
                {close.isPending ? "Cerrando…" : "Cerrar hallazgo"}
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
