import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { documents, sstPlans, users } from "../../api/endpoints";
import type { ActivityStatus, DocumentKind, SgsstDocument } from "../../api/types";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";
import { useAuth } from "../auth/AuthContext";

const TIPOS: { value: DocumentKind; label: string }[] = [
  { value: "POLITICA", label: "Política de SST" },
  { value: "RISST", label: "Reglamento Interno de SST" },
  { value: "PROCEDIMIENTO", label: "Procedimiento" },
  { value: "PROGRAMA", label: "Programa" },
  { value: "OTRO", label: "Otro documento" },
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const PILL_ACTIVIDAD: Record<ActivityStatus, string> = {
  PENDIENTE: "pill-mid",
  EJECUTADA: "pill-low",
  REPROGRAMADA: "pill-high",
};

const dia = (valor: string | null | undefined) =>
  valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("es-PE") : "—";

const DOC_VACIO = { kind: "", title: "", code: "", requires_receipt: false };
const VERSION_VACIA = {
  content: "",
  approved_by: "",
  approved_on: "",
  change_summary: "",
  file: null as File | null,
};
const ACTIVIDAD_VACIA = { objective: "", description: "", responsible: "", planned_month: "" };

/**
 * Documentos del SGSST (política, RISST y demás, con su control de versiones) y plan anual.
 * El trabajador consulta lo vigente y confirma la recepción del RISST.
 */
export default function DocumentsPage() {
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const anio = new Date().getFullYear();

  const [nuevoDoc, setNuevoDoc] = useState(false);
  const [doc, setDoc] = useState(DOC_VACIO);
  const [abierto, setAbierto] = useState<SgsstDocument | null>(null);
  const [nuevaVersion, setNuevaVersion] = useState(false);
  const [version, setVersion] = useState(VERSION_VACIA);
  const [planForm, setPlanForm] = useState({ objectives: "", approved_on: "" });
  const [nuevaActividad, setNuevaActividad] = useState(false);
  const [actividad, setActividad] = useState(ACTIVIDAD_VACIA);

  const lista = useQuery({ queryKey: ["documents"], queryFn: documents.list });
  const versiones = useQuery({
    queryKey: ["document-versions", abierto?.id],
    queryFn: () => documents.versions(abierto!.id),
    enabled: !!abierto,
  });
  const constancias = useQuery({
    queryKey: ["document-receipts", abierto?.id],
    queryFn: () => documents.receipts(abierto!.id),
    enabled: !!abierto && canManage && abierto.requires_receipt,
  });
  const plan = useQuery({ queryKey: ["sst-plan", anio], queryFn: () => sstPlans.byYear(anio) });
  const avance = useQuery({
    queryKey: ["sst-plan-progress", plan.data?.id],
    queryFn: () => sstPlans.progress(plan.data!.id),
    enabled: !!plan.data,
  });
  const listaUsuarios = useQuery({
    queryKey: ["users"],
    queryFn: () => users.list(),
    enabled: canManage,
  });

  const invalidar = () => {
    for (const clave of [
      "documents",
      "document-versions",
      "document-receipts",
      "sst-plan",
      "sst-plan-progress",
    ]) {
      queryClient.invalidateQueries({ queryKey: [clave] });
    }
  };

  const crearDoc = useMutation({
    mutationFn: () => documents.create(doc),
    onSuccess: (creado) => {
      invalidar();
      setNuevoDoc(false);
      setDoc(DOC_VACIO);
      setAbierto(creado);
      setNuevaVersion(true);
    },
  });

  const crearVersion = useMutation({
    mutationFn: () => {
      const datos = new FormData();
      datos.append("document", String(abierto!.id));
      datos.append("content", version.content);
      datos.append("approved_by", version.approved_by);
      if (version.approved_on) datos.append("approved_on", version.approved_on);
      datos.append("change_summary", version.change_summary);
      if (version.file) datos.append("file", version.file);
      return documents.createVersion(datos);
    },
    onSuccess: () => {
      invalidar();
      setNuevaVersion(false);
      setVersion(VERSION_VACIA);
    },
  });

  const publicar = useMutation({
    mutationFn: documents.publishVersion,
    onSuccess: async () => {
      invalidar();
      const actualizados = await queryClient.fetchQuery({
        queryKey: ["documents"],
        queryFn: documents.list,
      });
      setAbierto(actualizados.find((d) => d.id === abierto?.id) ?? null);
    },
  });
  const eliminarBorrador = useMutation({ mutationFn: documents.deleteVersion, onSuccess: invalidar });

  const confirmar = useMutation({
    mutationFn: documents.acknowledge,
    onSuccess: (actualizado) => {
      invalidar();
      if (abierto) setAbierto(actualizado);
    },
  });

  const crearPlan = useMutation({
    mutationFn: () =>
      sstPlans.create({
        year: anio,
        objectives: planForm.objectives,
        approved_on: planForm.approved_on || null,
      }),
    onSuccess: invalidar,
  });

  const agregarActividad = useMutation({
    mutationFn: () =>
      sstPlans.addActivity({
        plan: plan.data!.id,
        objective: actividad.objective,
        description: actividad.description,
        responsible: actividad.responsible ? Number(actividad.responsible) : null,
        planned_month: Number(actividad.planned_month),
      }),
    onSuccess: () => {
      invalidar();
      setNuevaActividad(false);
      setActividad(ACTIVIDAD_VACIA);
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActivityStatus }) =>
      sstPlans.updateActivity(id, { status }),
    onSuccess: invalidar,
  });

  const vigente = abierto?.current_version ?? null;
  const borradores = (versiones.data ?? []).filter((v) => v.status === "BORRADOR");
  const historial = (versiones.data ?? []).filter((v) => v.status !== "BORRADOR");
  const pendientesRecepcion = (lista.data ?? []).filter((d) => d.received_by_me === false);

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Documentos del SGSST</h1>
          <p className="muted">
            Política, Reglamento Interno y plan anual de Seguridad y Salud en el Trabajo
          </p>
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" onClick={() => setNuevoDoc(true)}>
              Nuevo documento
            </button>
          </div>
        )}
      </header>

      {pendientesRecepcion.length > 0 && (
        <p className="error">
          Tienes que confirmar que recibiste:{" "}
          {pendientesRecepcion.map((d) => d.title).join(", ")}.
        </p>
      )}

      <section className="card">
        <h2>Documentos</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Versión vigente</th>
                <th>Vigente desde</th>
                <th>Aprobado por</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.data?.map((d) => (
                <tr key={d.id}>
                  <td>{d.kind_display}</td>
                  <td>
                    <strong>{d.title}</strong>
                    {d.code && <div className="muted small">{d.code}</div>}
                  </td>
                  <td>{d.current_version ? `v${d.current_version.number}` : "Sin publicar"}</td>
                  <td>{dia(d.current_version?.valid_from)}</td>
                  <td>{d.current_version?.approved_by || "—"}</td>
                  <td className="actions">
                    <button type="button" className="link" onClick={() => setAbierto(d)}>
                      Ver
                    </button>
                    {d.received_by_me === false && (
                      <button
                        type="button"
                        className="link"
                        onClick={() => confirmar.mutate(d.id)}
                        disabled={confirmar.isPending}
                      >
                        Confirmar recepción
                      </button>
                    )}
                    {d.received_by_me && <span className="pill pill-low">Recibido</span>}
                  </td>
                </tr>
              ))}
              {!lista.data?.length && (
                <tr>
                  <td colSpan={6} className="muted">
                    No hay documentos publicados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Plan anual de SST {anio}</h2>
        {plan.isSuccess && !plan.data && !canManage && (
          <p className="muted">El plan anual de este año todavía no se ha registrado.</p>
        )}
        {plan.isSuccess && !plan.data && canManage && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearPlan.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Objetivos del año" required>
                <textarea
                  rows={3}
                  value={planForm.objectives}
                  onChange={(e) => setPlanForm({ ...planForm, objectives: e.target.value })}
                  placeholder="Reducir en 20 % los accidentes incapacitantes; cumplir el 100 % de las inspecciones."
                  required
                />
              </Field>
              <Field label="Aprobado el">
                <input
                  type="date"
                  value={planForm.approved_on}
                  onChange={(e) => setPlanForm({ ...planForm, approved_on: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={crearPlan.error} />
            <div className="actions">
              <button type="submit" disabled={crearPlan.isPending}>
                Registrar plan anual
              </button>
            </div>
          </form>
        )}
        {plan.data && (
          <>
            <p className="politica-texto">{plan.data.objectives}</p>
            <p className="muted small">
              {plan.data.approved_on ? `Aprobado el ${dia(plan.data.approved_on)}. ` : ""}
              Avance a {MESES[(avance.data?.cutoff_month || 1) - 1].toLowerCase()}:{" "}
              <strong>
                {avance.data?.progress_pct != null ? `${avance.data.progress_pct} %` : "—"}
              </strong>{" "}
              de lo programado a la fecha ({avance.data?.executed ?? 0} de {avance.data?.total ?? 0}{" "}
              actividades del año ejecutadas).
            </p>
            {canManage && (
              <div className="actions">
                <button type="button" className="secondary" onClick={() => setNuevaActividad(true)}>
                  Agregar actividad
                </button>
              </div>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Actividad</th>
                    <th>Objetivo</th>
                    <th>Responsable</th>
                    <th>Estado</th>
                    {canManage && <th />}
                  </tr>
                </thead>
                <tbody>
                  {plan.data.activities.map((a) => (
                    <tr key={a.id}>
                      <td>{MESES[a.planned_month - 1]}</td>
                      <td>{a.description}</td>
                      <td>{a.objective || "—"}</td>
                      <td>{a.responsible_name ?? "—"}</td>
                      <td>
                        <span className={`pill ${PILL_ACTIVIDAD[a.status]}`}>{a.status_display}</span>
                        {a.executed_on && <div className="muted small">el {dia(a.executed_on)}</div>}
                      </td>
                      {canManage && (
                        <td className="actions">
                          {a.status !== "EJECUTADA" && (
                            <button
                              type="button"
                              className="link"
                              onClick={() => cambiarEstado.mutate({ id: a.id, status: "EJECUTADA" })}
                            >
                              Marcar ejecutada
                            </button>
                          )}
                          {a.status === "PENDIENTE" && (
                            <button
                              type="button"
                              className="link"
                              onClick={() =>
                                cambiarEstado.mutate({ id: a.id, status: "REPROGRAMADA" })
                              }
                            >
                              Reprogramar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {!plan.data.activities.length && (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="muted">
                        El plan todavía no tiene actividades.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {nuevoDoc && (
        <Modal title="Nuevo documento" onClose={() => setNuevoDoc(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearDoc.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Tipo" required>
                <Select
                  value={doc.kind}
                  onChange={(v) =>
                    setDoc({ ...doc, kind: v, requires_receipt: v === "RISST" || doc.requires_receipt })
                  }
                  options={TIPOS}
                  required
                />
              </Field>
              <Field label="Título" required>
                <input
                  value={doc.title}
                  onChange={(e) => setDoc({ ...doc, title: e.target.value })}
                  required
                />
              </Field>
              <Field label="Código">
                <input
                  value={doc.code}
                  onChange={(e) => setDoc({ ...doc, code: e.target.value })}
                  placeholder="SST-POL-01"
                />
              </Field>
            </div>
            <label className="field-inline">
              <input
                type="checkbox"
                checked={doc.requires_receipt}
                onChange={(e) => setDoc({ ...doc, requires_receipt: e.target.checked })}
              />{" "}
              Cada trabajador debe confirmar que lo recibió (obligatorio para el RISST)
            </label>
            <ErrorBox error={crearDoc.error} />
            <div className="actions">
              <button type="submit" disabled={crearDoc.isPending}>
                Crear y redactar la primera versión
              </button>
              <button type="button" className="link" onClick={() => setNuevoDoc(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {abierto && !nuevaVersion && (
        <Modal title={abierto.title} onClose={() => setAbierto(null)}>
          {vigente ? (
            <>
              <p className="muted small">
                Versión {vigente.number} vigente desde {dia(vigente.valid_from)}
                {vigente.approved_by && ` · aprobada por ${vigente.approved_by}`}
                {vigente.approved_on && ` el ${dia(vigente.approved_on)}`}
              </p>
              {vigente.content && <div className="politica-texto">{vigente.content}</div>}
              {vigente.file && (
                <p>
                  <a href={vigente.file} target="_blank" rel="noreferrer">
                    Ver documento firmado
                  </a>
                </p>
              )}
              {abierto.received_by_me === false && (
                <button
                  type="button"
                  onClick={() => confirmar.mutate(abierto.id)}
                  disabled={confirmar.isPending}
                >
                  Confirmo que recibí y leí este documento
                </button>
              )}
            </>
          ) : (
            <p className="muted">Este documento todavía no tiene una versión vigente.</p>
          )}

          {canManage && (
            <>
              <div className="actions">
                <button type="button" className="secondary" onClick={() => setNuevaVersion(true)}>
                  Nueva versión
                </button>
              </div>
              {borradores.map((b) => (
                <div key={b.id} className="acta">
                  <strong>Borrador v{b.number}</strong>
                  {b.change_summary && <div className="muted small">{b.change_summary}</div>}
                  <div className="actions">
                    <button
                      type="button"
                      onClick={() => publicar.mutate(b.id)}
                      disabled={publicar.isPending}
                    >
                      Poner vigente
                    </button>
                    <button
                      type="button"
                      className="link"
                      onClick={() => eliminarBorrador.mutate(b.id)}
                    >
                      Eliminar borrador
                    </button>
                  </div>
                </div>
              ))}
              <ErrorBox error={publicar.error} />
              {abierto.requires_receipt && constancias.data && (
                <>
                  <h3>Constancias de recepción (v{constancias.data.version ?? "—"})</h3>
                  <p className="muted small">
                    {constancias.data.received.length} recibidas · {constancias.data.pending.length}{" "}
                    pendientes
                    {constancias.data.pending.length > 0 &&
                      `: ${constancias.data.pending.map((p) => p.worker_name).join(", ")}`}
                  </p>
                </>
              )}
            </>
          )}

          <h3>Historial de versiones</h3>
          <table>
            <thead>
              <tr>
                <th>Versión</th>
                <th>Estado</th>
                <th>Vigente desde</th>
                <th>Hasta</th>
                <th>Cambios</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.file ? (
                      <a href={v.file} target="_blank" rel="noreferrer">
                        v{v.number}
                      </a>
                    ) : (
                      `v${v.number}`
                    )}
                  </td>
                  <td>{v.status_display}</td>
                  <td>{dia(v.valid_from)}</td>
                  <td>{dia(v.valid_until)}</td>
                  <td>{v.change_summary || "—"}</td>
                </tr>
              ))}
              {!historial.length && (
                <tr>
                  <td colSpan={5} className="muted">
                    Sin versiones publicadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Modal>
      )}

      {abierto && nuevaVersion && (
        <Modal title={`Nueva versión: ${abierto.title}`} onClose={() => setNuevaVersion(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearVersion.mutate();
            }}
          >
            <Field label="Texto del documento" hint="Puedes pegar el texto, adjuntar el PDF firmado o ambos.">
              <textarea
                rows={8}
                value={version.content}
                onChange={(e) => setVersion({ ...version, content: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Archivo firmado">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setVersion({ ...version, file: e.target.files?.[0] ?? null })}
                />
              </Field>
              <Field label="Aprobado por" hint="Cargo y nombre. La política la firma la alta dirección.">
                <input
                  value={version.approved_by}
                  onChange={(e) => setVersion({ ...version, approved_by: e.target.value })}
                  placeholder="Gerente General, Luis Pérez"
                />
              </Field>
              <Field label="Fecha de aprobación">
                <input
                  type="date"
                  value={version.approved_on}
                  onChange={(e) => setVersion({ ...version, approved_on: e.target.value })}
                />
              </Field>
              <Field label="Cambios respecto a la anterior">
                <input
                  value={version.change_summary}
                  onChange={(e) => setVersion({ ...version, change_summary: e.target.value })}
                />
              </Field>
            </div>
            <p className="muted small">
              Se guarda como borrador. Al ponerlo vigente, la versión anterior pasa a histórica.
            </p>
            <ErrorBox error={crearVersion.error} />
            <div className="actions">
              <button type="submit" disabled={crearVersion.isPending}>
                Guardar borrador
              </button>
              <button type="button" className="link" onClick={() => setNuevaVersion(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {nuevaActividad && (
        <Modal title="Agregar actividad al plan" onClose={() => setNuevaActividad(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              agregarActividad.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Actividad" required>
                <input
                  value={actividad.description}
                  onChange={(e) => setActividad({ ...actividad, description: e.target.value })}
                  required
                />
              </Field>
              <Field label="Objetivo al que aporta">
                <input
                  value={actividad.objective}
                  onChange={(e) => setActividad({ ...actividad, objective: e.target.value })}
                />
              </Field>
              <Field label="Mes programado" required>
                <Select
                  value={actividad.planned_month}
                  onChange={(v) => setActividad({ ...actividad, planned_month: v })}
                  options={MESES.map((m, i) => ({ value: i + 1, label: m }))}
                  required
                />
              </Field>
              <Field label="Responsable">
                <Select
                  value={actividad.responsible}
                  onChange={(v) => setActividad({ ...actividad, responsible: v })}
                  options={(listaUsuarios.data ?? []).map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`.trim() || u.username,
                  }))}
                />
              </Field>
            </div>
            <ErrorBox error={agregarActividad.error} />
            <div className="actions">
              <button type="submit" disabled={agregarActividad.isPending}>
                Agregar
              </button>
              <button type="button" className="link" onClick={() => setNuevaActividad(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
