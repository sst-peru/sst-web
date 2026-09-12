import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { areas as areasApi, exportar, reports } from "../../api/endpoints";
import type { ReportStatus, Severity } from "../../api/types";
import { useAuth } from "../auth/AuthContext";

const STATUS_LABEL: Record<ReportStatus, string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  CERRADO: "Cerrado",
  DESCARTADO: "Descartado",
};

const SEVERITY_CLASS: Record<Severity, string> = {
  BAJA: "pill pill-low",
  MEDIA: "pill pill-mid",
  ALTA: "pill pill-high",
  CRITICA: "pill pill-critical",
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [area, setArea] = useState("");

  const areas = useQuery({ queryKey: ["areas"], queryFn: areasApi.list });
  const { data, isLoading } = useQuery({
    queryKey: ["reports", { status, kind, area }],
    queryFn: () =>
      reports.list({
        status: status || undefined,
        kind: kind || undefined,
        area: area || undefined,
      }),
  });

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Reportes de actos y condiciones inseguras</h1>
          <p className="muted">{data?.count ?? 0} reportes</p>
        </div>
        <div className="actions">
          {canManage && (
            <button type="button" className="secondary" onClick={() => exportar("reports")}>
              Exportar a Excel
            </button>
          )}
          <button type="button" onClick={() => navigate("/reportes/nuevo")}>
            Reportar
          </button>
        </div>
      </header>

      <section className="filters card">
        <label>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Todos</option>
            <option value="ACTO">Acto inseguro</option>
            <option value="CONDICION">Condición insegura</option>
          </select>
        </label>
        <label>
          Área
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todas</option>
            {areas.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        {isLoading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Área</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th>Reportó</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((report) => (
                <tr key={report.id}>
                  <td>
                    <Link to={`/reportes/${report.id}`}>#{report.id}</Link>
                  </td>
                  <td>{report.kind === "ACTO" ? "Acto" : "Condición"}</td>
                  <td>{report.category_name ?? "—"}</td>
                  <td>{report.area_name ?? "—"}</td>
                  <td>
                    <span className={SEVERITY_CLASS[report.severity]}>{report.severity}</span>
                  </td>
                  <td>{STATUS_LABEL[report.status]}</td>
                  <td>{report.reported_by_name}</td>
                  <td>{new Date(report.created_at).toLocaleDateString("es-PE")}</td>
                </tr>
              ))}
              {!data?.results.length && (
                <tr>
                  <td colSpan={8} className="muted">
                    No hay reportes con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
