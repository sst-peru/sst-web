import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { reports, users } from "../../api/endpoints";
import { ErrorBox, Field, Select } from "../../components/Form";
import { FotoAmpliable } from "../../components/FotoAmpliable";
import { useAuth } from "../auth/AuthContext";

const ESTADOS: Record<string, string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  CERRADO: "Cerrado",
  DESCARTADO: "Descartado",
};

export default function ReportDetailPage() {
  const { id } = useParams();
  const reportId = Number(id);
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const [notaCierre, setNotaCierre] = useState("");
  const [responsable, setResponsable] = useState("");
  const [notaAsignacion, setNotaAsignacion] = useState("");

  const { data: reporte, isLoading } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => reports.detail(reportId),
  });

  const listaUsuarios = useQuery({
    queryKey: ["users"],
    queryFn: () => users.list(),
    enabled: canManage,
  });

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["report", reportId] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    queryClient.invalidateQueries({ queryKey: ["mttr"] });
  };

  const asignar = useMutation({
    mutationFn: () => reports.assign(reportId, Number(responsable), notaAsignacion),
    onSuccess: () => {
      setNotaAsignacion("");
      refrescar();
    },
  });

  const cerrar = useMutation({
    mutationFn: () => reports.close(reportId, notaCierre),
    onSuccess: () => {
      setNotaCierre("");
      refrescar();
    },
  });

  const descartar = useMutation({
    mutationFn: () => reports.changeStatus(reportId, "DESCARTADO", "No corresponde a un hallazgo de SST."),
    onSuccess: refrescar,
  });

  if (isLoading || !reporte) return <div className="centered">Cargando…</div>;

  const horas = reporte.resolution_hours;

  return (
    <>
      <header className="page-head">
        <Link to="/reportes" className="small">
          ← Volver a reportes
        </Link>
        <h1>
          Reporte #{reporte.id} —{" "}
          {reporte.kind === "ACTO" ? "Acto inseguro" : "Condición insegura"}
        </h1>
        <p className="muted">
          Reportado por {reporte.reported_by_name} el{" "}
          {new Date(reporte.created_at).toLocaleString("es-PE")}
          {reporte.synced_offline && " · llegó por sincronización offline"}
          {reporte.form_variant && ` · formulario ${reporte.form_variant}`}
        </p>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h2>Detalle</h2>
          <dl>
            <dt>Categoría</dt>
            <dd>{reporte.category_name ?? "—"}</dd>
            <dt>Área</dt>
            <dd>{reporte.area_name ?? "—"}</dd>
            <dt>Severidad</dt>
            <dd>{reporte.severity}</dd>
            <dt>Estado</dt>
            <dd>{ESTADOS[reporte.status] ?? reporte.status}</dd>
            <dt>Responsable</dt>
            <dd>{reporte.assigned_to_name ?? "Sin asignar"}</dd>
            <dt>Ocurrió</dt>
            <dd>{new Date(reporte.occurred_at).toLocaleString("es-PE")}</dd>
            <dt>Ubicación</dt>
            <dd>
              {reporte.latitude && reporte.longitude ? (
                <a
                  href={`https://www.google.com/maps?q=${reporte.latitude},${reporte.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver en el mapa
                </a>
              ) : (
                "Sin GPS"
              )}
            </dd>
            <dt>Tiempo de resolución</dt>
            <dd>
              {horas !== null
                ? horas < 24
                  ? `${horas.toFixed(1)} horas`
                  : `${(horas / 24).toFixed(1)} días`
                : "Sin cerrar"}
            </dd>
          </dl>
          {reporte.description && <p>{reporte.description}</p>}
          {reporte.closure_note && (
            <p>
              <strong>Acción correctiva:</strong> {reporte.closure_note}
            </p>
          )}
          {reporte.photo && (
            <FotoAmpliable
              className="report-photo"
              src={reporte.photo}
              alt="Evidencia del hallazgo"
            />
          )}
        </section>

        <section className="card">
          <h2>Bitácora</h2>
          <ol className="timeline">
            <li>
              <strong>{reporte.reported_by_name}</strong>
              <span className="muted small">
                {new Date(reporte.created_at).toLocaleString("es-PE")}
              </span>
              <p>Reportó el hallazgo.</p>
            </li>
            {reporte.actions.map((accion) => (
              <li key={accion.id}>
                <strong>{accion.author_name}</strong>
                <span className="muted small">
                  {new Date(accion.created_at).toLocaleString("es-PE")}
                </span>
                <p>{accion.note}</p>
              </li>
            ))}
          </ol>

          {canManage && reporte.status !== "CERRADO" && reporte.status !== "DESCARTADO" && (
            <>
              <hr />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  asignar.mutate();
                }}
              >
                <Field label="Asignar responsable" required>
                  <Select
                    value={responsable}
                    onChange={setResponsable}
                    options={(listaUsuarios.data ?? []).map((u) => ({
                      value: u.id,
                      label: `${u.first_name} ${u.last_name}`.trim() || u.username,
                    }))}
                    required
                  />
                </Field>
                <Field label="Comentario">
                  <input
                    value={notaAsignacion}
                    onChange={(e) => setNotaAsignacion(e.target.value)}
                    placeholder="Ej: lo ve hoy en el turno de la tarde"
                  />
                </Field>
                <ErrorBox error={asignar.error} />
                <button type="submit" disabled={asignar.isPending || !responsable}>
                  {asignar.isPending ? "Asignando…" : "Asignar"}
                </button>
              </form>

              <hr />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  cerrar.mutate();
                }}
              >
                <Field
                  label="Acción correctiva aplicada"
                  required
                  hint="Esto es lo que queda como evidencia ante una inspección."
                >
                  <textarea
                    value={notaCierre}
                    onChange={(e) => setNotaCierre(e.target.value)}
                    rows={3}
                    required
                  />
                </Field>
                <ErrorBox error={cerrar.error} />
                <div className="actions">
                  <button type="submit" disabled={cerrar.isPending}>
                    {cerrar.isPending ? "Cerrando…" : "Cerrar hallazgo"}
                  </button>
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => descartar.mutate()}
                    disabled={descartar.isPending}
                  >
                    Descartar
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
