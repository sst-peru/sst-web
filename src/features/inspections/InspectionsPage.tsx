import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { areas, exportar, inspections, metrics, users } from "../../api/endpoints";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";
import type { Inspection } from "../../api/types";
import { useAuth } from "../auth/AuthContext";

const SEVERIDADES = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

const FRECUENCIAS = [
  { value: "SEMANAL", label: "Semanal" },
  { value: "QUINCENAL", label: "Quincenal" },
  { value: "MENSUAL", label: "Mensual" },
  { value: "TRIMESTRAL", label: "Trimestral" },
];

export default function InspectionsPage() {
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"programa" | null>(null);
  const [ejecutando, setEjecutando] = useState<Inspection | null>(null);
  const [programa, setPrograma] = useState({
    title: "",
    area: "",
    frequency: "MENSUAL",
    responsible: "",
    checklist: "",
  });
  const [hallazgos, setHallazgos] = useState("");
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [origen, setOrigen] = useState<Inspection | null>(null);
  const [observacion, setObservacion] = useState({ item: "", description: "", severity: "MEDIA" });

  const cumplimiento = useQuery({
    queryKey: ["compliance"],
    queryFn: () => metrics.compliance(90),
  });
  const programas = useQuery({ queryKey: ["inspection-schedules"], queryFn: inspections.schedules });
  const lista = useQuery({ queryKey: ["inspections"], queryFn: () => inspections.list() });
  const listaAreas = useQuery({ queryKey: ["areas"], queryFn: areas.list });
  const listaUsuarios = useQuery({
    queryKey: ["users"],
    queryFn: () => users.list(),
    enabled: canManage,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["inspections"] });
    queryClient.invalidateQueries({ queryKey: ["inspection-schedules"] });
    queryClient.invalidateQueries({ queryKey: ["compliance"] });
  };

  const crearPrograma = useMutation({
    mutationFn: () =>
      inspections.createSchedule({
        title: programa.title,
        area: Number(programa.area),
        frequency: programa.frequency,
        responsible: programa.responsible ? Number(programa.responsible) : null,
        // Una línea por ítem: es la forma más rápida de escribir un checklist.
        checklist: programa.checklist
          .split("\n")
          .map((linea) => linea.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      invalidar();
      setModal(null);
      setPrograma({ title: "", area: "", frequency: "MENSUAL", responsible: "", checklist: "" });
    },
  });

  const generar = useMutation({
    mutationFn: (scheduleId: number) => inspections.generateNext(scheduleId),
    onSuccess: invalidar,
  });

  const completar = useMutation({
    mutationFn: () => inspections.complete(ejecutando!.id, hallazgos, marcados),
    onSuccess: () => {
      invalidar();
      setEjecutando(null);
      setHallazgos("");
      setMarcados({});
    },
  });

  const generarHallazgo = useMutation({
    mutationFn: () => inspections.generateReport(origen!.id, observacion),
    onSuccess: () => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setOrigen(null);
      setObservacion({ item: "", description: "", severity: "MEDIA" });
    },
  });

  function abrirObservacion(inspeccion: Inspection) {
    // Propone el primer ítem que quedó sin marcar: es la observación más probable.
    const noCumplidos = Object.entries(inspeccion.results ?? {})
      .filter(([, ok]) => !ok)
      .map(([item]) => item);
    setOrigen(inspeccion);
    setObservacion({ item: noCumplidos[0] ?? "", description: "", severity: "MEDIA" });
  }

  function abrirEjecucion(inspeccion: Inspection) {
    const items = programas.data?.find((p) => p.id === inspeccion.schedule)?.checklist ?? [];
    setEjecutando(inspeccion);
    setHallazgos(inspeccion.findings ?? "");
    setMarcados(Object.fromEntries(items.map((item) => [item, false])));
  }

  const checklistActual =
    programas.data?.find((p) => p.id === ejecutando?.schedule)?.checklist ?? [];

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Inspecciones periódicas</h1>
          <p className="muted">Cumplimiento de los últimos 90 días</p>
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" className="secondary" onClick={() => exportar("inspections")}>
              Exportar a Excel
            </button>
            <button type="button" onClick={() => setModal("programa")}>
              Nuevo programa
            </button>
          </div>
        )}
      </header>

      <section className="kpi-grid">
        <article className="card kpi">
          <span className="kpi-label">Programadas</span>
          <strong className="kpi-value">{cumplimiento.data?.scheduled ?? "—"}</strong>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Realizadas</span>
          <strong className="kpi-value">{cumplimiento.data?.performed ?? "—"}</strong>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Cumplimiento</span>
          <strong className="kpi-value">
            {cumplimiento.data?.compliance_rate_pct != null
              ? `${cumplimiento.data.compliance_rate_pct}%`
              : "—"}
          </strong>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Vencidas</span>
          <strong className="kpi-value alert">{cumplimiento.data?.overdue ?? "—"}</strong>
          <span className="muted small">Pasaron su fecha sin realizarse</span>
        </article>
      </section>

      {canManage && (
        <section className="card">
          <h2>Programas</h2>
          <table>
            <thead>
              <tr>
                <th>Inspección</th>
                <th>Área</th>
                <th>Frecuencia</th>
                <th>Ítems del checklist</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {programas.data?.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.area_name}</td>
                  <td>{FRECUENCIAS.find((f) => f.value === p.frequency)?.label ?? p.frequency}</td>
                  <td>{p.checklist.length}</td>
                  <td>
                    <button
                      type="button"
                      className="link"
                      onClick={() => generar.mutate(p.id)}
                      disabled={generar.isPending}
                    >
                      Programar la siguiente
                    </button>
                  </td>
                </tr>
              ))}
              {!programas.data?.length && (
                <tr>
                  <td colSpan={5} className="muted">
                    Sin programas. Un programa define qué se inspecciona y cada cuánto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h2>Ocurrencias</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Inspección</th>
                <th>Área</th>
                <th>Fecha programada</th>
                <th>Estado</th>
                <th>Realizada</th>
                <th>Hallazgos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.data?.map((i) => (
                <tr key={i.id} className={i.is_overdue ? "fila-alerta" : undefined}>
                  <td>{i.title}</td>
                  <td>{i.area_name}</td>
                  <td>{new Date(`${i.due_date}T00:00:00`).toLocaleDateString("es-PE")}</td>
                  <td>
                    {i.status === "REALIZADA" ? (
                      <span className="pill pill-low">Realizada</span>
                    ) : i.is_overdue ? (
                      <span className="pill pill-critical">Vencida</span>
                    ) : (
                      <span className="pill pill-mid">Pendiente</span>
                    )}
                  </td>
                  <td>
                    {i.performed_at ? new Date(i.performed_at).toLocaleDateString("es-PE") : "—"}
                  </td>
                  <td>
                    {i.findings || "—"}
                    {i.generated_reports.length > 0 && (
                      <div className="small">
                        Hallazgos generados:{" "}
                        {i.generated_reports.map((id, n) => (
                          <span key={id}>
                            {n > 0 && ", "}
                            <Link to={`/reportes/${id}`}>#{id}</Link>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {i.status !== "REALIZADA" && (
                      <button type="button" className="link" onClick={() => abrirEjecucion(i)}>
                        Realizar
                      </button>
                    )}
                    {i.status === "REALIZADA" && (
                      <button type="button" className="link" onClick={() => abrirObservacion(i)}>
                        Generar hallazgo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!lista.data?.length && (
                <tr>
                  <td colSpan={7} className="muted">
                    No hay inspecciones generadas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Cumplimiento por área</h2>
        <table>
          <thead>
            <tr>
              <th>Área</th>
              <th>Programadas</th>
              <th>Realizadas</th>
              <th>Cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            {cumplimiento.data?.by_area.map((fila) => (
              <tr key={fila.area ?? "sin-area"}>
                <td>{fila.area ?? "Sin área"}</td>
                <td>{fila.scheduled}</td>
                <td>{fila.performed}</td>
                <td>
                  {fila.scheduled
                    ? `${Math.round((fila.performed / fila.scheduled) * 100)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          El promedio general esconde áreas: lo normal es que una cumpla al 90% y otra al 20%.
        </p>
      </section>

      {modal === "programa" && (
        <Modal title="Nuevo programa de inspección" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearPrograma.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Título" required>
                <input
                  value={programa.title}
                  onChange={(e) => setPrograma({ ...programa, title: e.target.value })}
                  required
                />
              </Field>
              <Field label="Área" required>
                <Select
                  value={programa.area}
                  onChange={(v) => setPrograma({ ...programa, area: v })}
                  options={(listaAreas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                  required
                />
              </Field>
              <Field label="Frecuencia" required>
                <Select
                  value={programa.frequency}
                  onChange={(v) => setPrograma({ ...programa, frequency: v })}
                  options={FRECUENCIAS}
                  required
                />
              </Field>
              <Field label="Responsable">
                <Select
                  value={programa.responsible}
                  onChange={(v) => setPrograma({ ...programa, responsible: v })}
                  options={(listaUsuarios.data ?? []).map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`.trim() || u.username,
                  }))}
                />
              </Field>
              <Field label="Checklist" hint="Un ítem por línea.">
                <textarea
                  rows={5}
                  value={programa.checklist}
                  onChange={(e) => setPrograma({ ...programa, checklist: e.target.value })}
                  placeholder={"Andamios con arriostre completo\nLíneas de vida ancladas\nAccesos libres"}
                />
              </Field>
            </div>
            <ErrorBox error={crearPrograma.error} />
            <div className="actions">
              <button type="submit" disabled={crearPrograma.isPending}>Crear programa</button>
              <button type="button" className="link" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {origen && (
        <Modal title={`Generar hallazgo: ${origen.title}`} onClose={() => setOrigen(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generarHallazgo.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Ítem observado">
                <Select
                  value={observacion.item}
                  onChange={(v) => setObservacion({ ...observacion, item: v })}
                  options={Object.keys(origen.results ?? {}).map((item) => ({
                    value: item,
                    label: origen.results[item] ? item : `${item} (no cumple)`,
                  }))}
                  placeholder="Sin ítem del checklist"
                />
              </Field>
              <Field label="Severidad" required>
                <Select
                  value={observacion.severity}
                  onChange={(v) => setObservacion({ ...observacion, severity: v })}
                  options={SEVERIDADES}
                  required
                />
              </Field>
            </div>
            <Field label="Qué se observó" required>
              <textarea
                rows={3}
                value={observacion.description}
                onChange={(e) => setObservacion({ ...observacion, description: e.target.value })}
                placeholder="El extintor del pasillo 2 está tapado por cajas."
                required
              />
            </Field>
            <p className="muted small">
              El hallazgo entra a Reportes como condición insegura del área, enlazado a esta
              inspección, para asignarle responsable y cerrarlo.
            </p>
            <ErrorBox error={generarHallazgo.error} />
            <div className="actions">
              <button type="submit" disabled={generarHallazgo.isPending}>
                Generar hallazgo
              </button>
              <button type="button" className="link" onClick={() => setOrigen(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {ejecutando && (
        <Modal title={`Realizar: ${ejecutando.title}`} onClose={() => setEjecutando(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              completar.mutate();
            }}
          >
            {checklistActual.length > 0 ? (
              <ul className="checklist">
                {checklistActual.map((item) => (
                  <li key={item}>
                    <label>
                      <input
                        type="checkbox"
                        checked={marcados[item] ?? false}
                        onChange={(e) => setMarcados({ ...marcados, [item]: e.target.checked })}
                      />
                      {item}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Este programa no tiene checklist definido.</p>
            )}

            <Field label="Hallazgos">
              <textarea rows={3} value={hallazgos} onChange={(e) => setHallazgos(e.target.value)} />
            </Field>

            <ErrorBox error={completar.error} />
            <div className="actions">
              <button type="submit" disabled={completar.isPending}>
                {completar.isPending ? "Guardando…" : "Marcar como realizada"}
              </button>
              <button type="button" className="link" onClick={() => setEjecutando(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
