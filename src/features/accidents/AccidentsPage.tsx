import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { accidents, areas, diseases, measures, users } from "../../api/endpoints";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";
import { useAuth } from "../auth/AuthContext";
import type { Accident, CorrectiveMeasure } from "../../api/types";

const TIPOS = [
  { value: "ACCIDENTE", label: "Accidente de trabajo" },
  { value: "INCIDENTE_PELIGROSO", label: "Incidente peligroso" },
];

const GRAVEDADES = [
  { value: "LEVE", label: "Leve" },
  { value: "INCAPACITANTE", label: "Incapacitante" },
  { value: "MORTAL", label: "Mortal" },
];

const METODOS = [
  { value: "CINCO_POR_QUE", label: "Cinco por qué" },
  { value: "ARBOL_DE_CAUSAS", label: "Árbol de causas" },
  { value: "ISHIKAWA", label: "Diagrama de Ishikawa" },
  { value: "OTRA", label: "Otra" },
];

/** Jerarquía de controles del artículo 21 de la Ley N° 29783, de mayor a menor eficacia. */
const CONTROLES = [
  { value: "ELIMINACION", label: "1. Eliminación del peligro" },
  { value: "SUSTITUCION", label: "2. Sustitución" },
  { value: "INGENIERIA", label: "3. Control de ingeniería" },
  { value: "ADMINISTRATIVO", label: "4. Control administrativo o señalización" },
  { value: "EPP", label: "5. Equipo de protección personal" },
];

const ESTADOS_ENFERMEDAD = [
  { value: "SOSPECHA", label: "Sospecha" },
  { value: "CONFIRMADA", label: "Confirmada" },
  { value: "DESCARTADA", label: "Descartada" },
];

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }) : "—";

const soloFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-PE", { dateStyle: "medium" }) : "—";

/** Texto del plazo de 24 horas del artículo 82, que es lo que genera la sanción. */
function avisoPlazo(a: Accident): { texto: string; clase: string } | null {
  if (!a.requires_immediate_notice) return null;
  if (a.mtpe_notified_at) {
    return a.notified_late
      ? { texto: "Avisado al MTPE fuera del plazo de 24 horas", clase: "aviso" }
      : { texto: "Avisado al MTPE dentro del plazo", clase: "ok" };
  }
  if (a.notice_overdue) {
    return { texto: "Plazo de 24 horas vencido sin avisar al MTPE", clase: "grave" };
  }
  const horas = a.notice_hours_left ?? 0;
  return { texto: `Quedan ${horas} h para avisar al MTPE`, clase: "aviso" };
}

export default function AccidentsPage() {
  const queryClient = useQueryClient();
  const { canManage, user } = useAuth();
  const [modal, setModal] = useState<
    "accidente" | "investigacion" | "medida" | "enfermedad" | "aviso" | null
  >(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const lista = useQuery({ queryKey: ["accidents"], queryFn: () => accidents.list() });
  const indices = useQuery({
    queryKey: ["accident-rates"],
    queryFn: () => accidents.rates({ days: 90 }),
  });
  const listaAreas = useQuery({ queryKey: ["areas"], queryFn: areas.list });
  const listaEnfermedades = useQuery({
    queryKey: ["diseases"],
    queryFn: diseases.list,
    enabled: canManage,
  });
  const plantilla = useQuery({
    queryKey: ["users"],
    queryFn: () => users.list(),
    enabled: canManage,
  });

  const actual = lista.data?.find((a) => a.id === seleccionado) ?? null;

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["accidents"] });
    queryClient.invalidateQueries({ queryKey: ["accident-rates"] });
  };

  // --- Formularios ---

  const [nuevo, setNuevo] = useState({
    kind: "ACCIDENTE",
    severity: "LEVE",
    occurred_at: "",
    area: "",
    place: "",
    description: "",
    injured_name: "",
    injured_dni: "",
    injury_description: "",
    immediate_actions: "",
    lost_days: "0",
  });
  const [investigacion, setInvestigacion] = useState({
    method: "CINCO_POR_QUE",
    immediate_causes: "",
    basic_causes: "",
    root_cause: "",
    conclusions: "",
    participants: "",
  });
  const [medida, setMedida] = useState({
    description: "",
    control_kind: "ADMINISTRATIVO",
    responsible: "",
    due_date: "",
  });
  const [aviso, setAviso] = useState({ notice_code: "" });
  const [enfermedad, setEnfermedad] = useState({
    worker_name: "",
    area: "",
    diagnosis: "",
    cie10_code: "",
    causal_agent: "",
    exposure_months: "",
    diagnosed_on: "",
    status: "SOSPECHA",
    rest_days: "0",
    notes: "",
  });

  const crear = useMutation({
    mutationFn: () =>
      accidents.create({
        ...nuevo,
        area: nuevo.area ? Number(nuevo.area) : null,
        lost_days: Number(nuevo.lost_days),
        occurred_at: new Date(nuevo.occurred_at).toISOString(),
      }),
    onSuccess: (creado) => {
      refrescar();
      setSeleccionado(creado.id);
      setModal(null);
    },
  });

  const investigar = useMutation({
    mutationFn: () => accidents.investigate(actual!.id, investigacion),
    onSuccess: () => {
      refrescar();
      setModal(null);
    },
  });

  const agregarMedida = useMutation({
    mutationFn: () =>
      measures.create({
        ...medida,
        accident: actual!.id,
        responsible: Number(medida.responsible),
      }),
    onSuccess: () => {
      refrescar();
      setModal(null);
      setMedida({ description: "", control_kind: "ADMINISTRATIVO", responsible: "", due_date: "" });
    },
  });

  const avisar = useMutation({
    mutationFn: () => accidents.notifyMtpe(actual!.id, aviso),
    onSuccess: () => {
      refrescar();
      setModal(null);
      setAviso({ notice_code: "" });
    },
  });

  const cerrar = useMutation({
    mutationFn: () => accidents.close(actual!.id),
    onSuccess: refrescar,
  });

  const completar = useMutation({
    mutationFn: (id: number) => measures.complete(id),
    onSuccess: refrescar,
  });

  const verificar = useMutation({
    mutationFn: (id: number) => measures.verify(id),
    onSuccess: refrescar,
  });

  const crearEnfermedad = useMutation({
    mutationFn: () =>
      diseases.create({
        ...enfermedad,
        area: enfermedad.area ? Number(enfermedad.area) : null,
        exposure_months: enfermedad.exposure_months ? Number(enfermedad.exposure_months) : null,
        rest_days: Number(enfermedad.rest_days),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diseases"] });
      queryClient.invalidateQueries({ queryKey: ["accident-rates"] });
      setModal(null);
    },
  });

  const pendientes = (lista.data ?? []).filter(
    (a) => a.requires_immediate_notice && !a.mtpe_notified_at,
  );

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Accidentes e incidentes</h1>
          <p className="muted">
            Registro de accidentes de trabajo, incidentes peligrosos y enfermedades
            ocupacionales · Ley N° 29783, artículo 28
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => setModal("accidente")}>
            Registrar accidente
          </button>
        </div>
      </header>

      {pendientes.length > 0 && (
        <section className="card aviso" role="alert">
          <h2>Avisos al Ministerio de Trabajo pendientes</h2>
          <p className="small">
            El artículo 82 de la Ley N° 29783 da <strong>24 horas</strong> para avisar al MTPE
            de un accidente mortal o de un incidente peligroso.
          </p>
          <ul>
            {pendientes.map((a) => (
              <li key={a.id}>
                <button type="button" className="link" onClick={() => setSeleccionado(a.id)}>
                  {a.kind_display} del {soloFecha(a.occurred_at)}
                </button>{" "}
                — {a.notice_overdue
                  ? `plazo vencido hace ${Math.abs(a.notice_hours_left ?? 0)} h`
                  : `quedan ${a.notice_hours_left} h`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {indices.data && (
        <section className="card">
          <h2>Índices de accidentabilidad · últimos 90 días</h2>
          <div className="kpi-grid">
            <div className="kpi">
              <span className="kpi-value">{indices.data.frequency_index ?? "—"}</span>
              <span className="kpi-label">Índice de frecuencia</span>
            </div>
            <div className="kpi">
              <span className="kpi-value">{indices.data.severity_index ?? "—"}</span>
              <span className="kpi-label">Índice de gravedad</span>
            </div>
            <div className="kpi">
              <span className="kpi-value">{indices.data.accident_rate_index ?? "—"}</span>
              <span className="kpi-label">Índice de accidentabilidad</span>
            </div>
            <div className="kpi">
              <span className="kpi-value">{indices.data.lost_days}</span>
              <span className="kpi-label">Días perdidos</span>
            </div>
          </div>
          <p className="muted small">
            Cálculo de la R.M. N° 050-2013-TR sobre {indices.data.hours_worked.toLocaleString("es-PE")}{" "}
            horas-hombre
            {indices.data.hours_worked_estimated
              ? " estimadas con la plantilla declarada, 8 horas por jornada y 6 días por semana. Para una declaración oficial hay que informar las horas reales."
              : " informadas por la empresa."}{" "}
            {indices.data.accidents} accidentes en la ventana: {indices.data.minor} leves,{" "}
            {indices.data.disabling} incapacitantes y {indices.data.fatal} mortales.
          </p>
        </section>
      )}

      <section className="card">
        <h2>Accidentes e incidentes registrados</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ocurrió</th>
                <th>Tipo</th>
                <th>Gravedad</th>
                <th>Accidentado</th>
                <th>Área</th>
                <th>Días perdidos</th>
                <th>Estado</th>
                <th>Plazo legal</th>
              </tr>
            </thead>
            <tbody>
              {(lista.data ?? []).map((a) => {
                const plazo = avisoPlazo(a);
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSeleccionado(a.id)}
                    className={a.id === seleccionado ? "fila-activa" : undefined}
                  >
                    <td>{fecha(a.occurred_at)}</td>
                    <td>{a.kind_display}</td>
                    <td>{a.severity_display}</td>
                    <td>{a.injured_label || "—"}</td>
                    <td>{a.area_name ?? "—"}</td>
                    <td>{a.lost_days}</td>
                    <td>{a.status_display}</td>
                    <td>{plazo ? <span className={`pildora ${plazo.clase}`}>{plazo.texto}</span> : "—"}</td>
                  </tr>
                );
              })}
              {lista.data?.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    Sin accidentes registrados. Es el mejor resultado posible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {actual && (
        <section className="card" aria-live="polite">
          <header className="row">
            <h2>Expediente del {actual.kind_display.toLowerCase()} del {soloFecha(actual.occurred_at)}</h2>
            <button type="button" className="link" onClick={() => setSeleccionado(null)}>
              Cerrar vista
            </button>
          </header>

          <dl className="detail-grid">
            <div>
              <dt>Lugar</dt>
              <dd>{actual.place || actual.area_name || "—"}</dd>
            </div>
            <div>
              <dt>Accidentado</dt>
              <dd>{actual.injured_label || "—"}</dd>
            </div>
            <div>
              <dt>Reportado por</dt>
              <dd>{actual.reported_by_name}</dd>
            </div>
            <div>
              <dt>Lesión o daño</dt>
              <dd>{actual.injury_description || "—"}</dd>
            </div>
            <div>
              <dt>Acciones inmediatas</dt>
              <dd>{actual.immediate_actions || "—"}</dd>
            </div>
            <div>
              <dt>Descripción</dt>
              <dd>{actual.description}</dd>
            </div>
          </dl>

          {actual.requires_immediate_notice && (
            <div className="card aviso">
              <h3>Aviso al Ministerio de Trabajo</h3>
              <p className="small">
                Plazo: {fecha(actual.notice_deadline)}.{" "}
                {actual.mtpe_notified_at
                  ? `Avisado el ${fecha(actual.mtpe_notified_at)}${
                      actual.mtpe_notice_code ? ` · cargo ${actual.mtpe_notice_code}` : ""
                    }${actual.notified_late ? " (fuera de plazo)" : ""}.`
                  : actual.notice_overdue
                    ? "El plazo venció sin aviso."
                    : `Quedan ${actual.notice_hours_left} horas.`}
              </p>
              {canManage && !actual.mtpe_notified_at && (
                <button type="button" onClick={() => setModal("aviso")}>
                  Registrar aviso
                </button>
              )}
            </div>
          )}

          <h3>Investigación de causa raíz</h3>
          {actual.investigation ? (
            <dl className="detail-grid">
              <div>
                <dt>Metodología</dt>
                <dd>{actual.investigation.method_display}</dd>
              </div>
              <div>
                <dt>Investigado por</dt>
                <dd>
                  {actual.investigation.performed_by_name} ·{" "}
                  {fecha(actual.investigation.performed_at)}
                </dd>
              </div>
              <div>
                <dt>Causas inmediatas</dt>
                <dd>{actual.investigation.immediate_causes || "—"}</dd>
              </div>
              <div>
                <dt>Causas básicas</dt>
                <dd>{actual.investigation.basic_causes || "—"}</dd>
              </div>
              <div>
                <dt>Causa raíz</dt>
                <dd>{actual.investigation.root_cause}</dd>
              </div>
              <div>
                <dt>Conclusiones</dt>
                <dd>{actual.investigation.conclusions || "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted small">
              Sin investigación registrada. El expediente no se puede cerrar hasta que la tenga.
              {canManage && (
                <>
                  {" "}
                  <button type="button" className="link" onClick={() => setModal("investigacion")}>
                    Registrar investigación
                  </button>
                </>
              )}
            </p>
          )}

          <header className="row">
            <h3>Medidas correctivas</h3>
            {canManage && actual.status !== "CERRADO" && (
              <button type="button" className="secondary" onClick={() => setModal("medida")}>
                Agregar medida
              </button>
            )}
          </header>
          <MedidasTabla
            medidas={actual.measures}
            puedeGestionar={canManage}
            usuarioId={user?.id ?? 0}
            onCompletar={(id) => completar.mutate(id)}
            onVerificar={(id) => verificar.mutate(id)}
          />
          <ErrorBox error={completar.error || verificar.error} />

          {canManage && actual.status !== "CERRADO" && (
            <div className="actions">
              <button type="button" onClick={() => cerrar.mutate()} disabled={cerrar.isPending}>
                Cerrar expediente
              </button>
            </div>
          )}
          <ErrorBox error={cerrar.error} />
        </section>
      )}

      {canManage && (
        <section className="card">
          <header className="row">
            <h2>Enfermedades ocupacionales</h2>
            <button type="button" className="secondary" onClick={() => setModal("enfermedad")}>
              Registrar enfermedad
            </button>
          </header>
          <p className="muted small">
            Contiene datos de salud: solo lo consultan supervisor, comité de SST y
            administrador.
          </p>
          <table>
            <thead>
              <tr>
                <th>Diagnóstico</th>
                <th>CIE-10</th>
                <th>Trabajador</th>
                <th>Agente causal</th>
                <th>Diagnosticada</th>
                <th>Descanso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(listaEnfermedades.data ?? []).map((e) => (
                <tr key={e.id}>
                  <td>{e.diagnosis}</td>
                  <td>{e.cie10_code || "—"}</td>
                  <td>{e.worker_label || "—"}</td>
                  <td>{e.causal_agent || "—"}</td>
                  <td>{soloFecha(e.diagnosed_on)}</td>
                  <td>{e.rest_days} d</td>
                  <td>{e.status_display}</td>
                </tr>
              ))}
              {listaEnfermedades.data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Sin enfermedades ocupacionales registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {modal === "accidente" && (
        <Modal title="Registrar accidente o incidente" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crear.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Tipo" required>
                <Select
                  value={nuevo.kind}
                  onChange={(v) => setNuevo({ ...nuevo, kind: v })}
                  options={TIPOS}
                  required
                />
              </Field>
              <Field
                label="Gravedad"
                required
                hint={
                  nuevo.kind === "INCIDENTE_PELIGROSO"
                    ? "Un incidente peligroso no puede ser mortal: por definición no hubo lesionado."
                    : "Con días perdidos, es incapacitante o mortal."
                }
              >
                <Select
                  value={nuevo.severity}
                  onChange={(v) => setNuevo({ ...nuevo, severity: v })}
                  options={
                    nuevo.kind === "INCIDENTE_PELIGROSO"
                      ? GRAVEDADES.filter((g) => g.value !== "MORTAL")
                      : GRAVEDADES
                  }
                  required
                />
              </Field>
              <Field
                label="Ocurrió el"
                required
                hint="De esta fecha depende el plazo legal de aviso al MTPE."
              >
                <input
                  type="datetime-local"
                  value={nuevo.occurred_at}
                  max={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setNuevo({ ...nuevo, occurred_at: e.target.value })}
                  required
                />
              </Field>
              <Field label="Área">
                <Select
                  value={nuevo.area}
                  onChange={(v) => setNuevo({ ...nuevo, area: v })}
                  options={(listaAreas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                />
              </Field>
              <Field label="Lugar exacto">
                <input
                  value={nuevo.place}
                  onChange={(e) => setNuevo({ ...nuevo, place: e.target.value })}
                  maxLength={200}
                />
              </Field>
              <Field label="Días perdidos">
                <input
                  type="number"
                  min={0}
                  value={nuevo.lost_days}
                  onChange={(e) => setNuevo({ ...nuevo, lost_days: e.target.value })}
                />
              </Field>
              {nuevo.kind === "ACCIDENTE" && (
                <>
                  <Field label="Nombre del accidentado" required>
                    <input
                      value={nuevo.injured_name}
                      onChange={(e) => setNuevo({ ...nuevo, injured_name: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="DNI del accidentado" hint="8 dígitos, opcional.">
                    <input
                      value={nuevo.injured_dni}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, injured_dni: e.target.value.replace(/\D/g, "") })
                      }
                      inputMode="numeric"
                      maxLength={8}
                    />
                  </Field>
                  <Field label="Lesión o daño">
                    <input
                      value={nuevo.injury_description}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, injury_description: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}
              <Field label="Descripción del hecho" required>
                <textarea
                  rows={3}
                  value={nuevo.description}
                  onChange={(e) => setNuevo({ ...nuevo, description: e.target.value })}
                  required
                />
              </Field>
              <Field label="Acciones inmediatas tomadas">
                <textarea
                  rows={2}
                  value={nuevo.immediate_actions}
                  onChange={(e) => setNuevo({ ...nuevo, immediate_actions: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={crear.error} />
            <div className="actions">
              <button type="submit" disabled={crear.isPending}>
                Registrar
              </button>
              <button type="button" className="link" onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "investigacion" && actual && (
        <Modal title="Investigación de causa raíz" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              investigar.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Metodología" required>
                <Select
                  value={investigacion.method}
                  onChange={(v) => setInvestigacion({ ...investigacion, method: v })}
                  options={METODOS}
                  required
                />
              </Field>
              <Field label="Participantes" hint="Quiénes intervinieron en la investigación.">
                <input
                  value={investigacion.participants}
                  onChange={(e) =>
                    setInvestigacion({ ...investigacion, participants: e.target.value })
                  }
                  maxLength={255}
                />
              </Field>
              <Field label="Causas inmediatas" hint="Lo que se ve: el acto o la condición.">
                <textarea
                  rows={2}
                  value={investigacion.immediate_causes}
                  onChange={(e) =>
                    setInvestigacion({ ...investigacion, immediate_causes: e.target.value })
                  }
                />
              </Field>
              <Field label="Causas básicas" hint="Factores personales y del trabajo detrás.">
                <textarea
                  rows={2}
                  value={investigacion.basic_causes}
                  onChange={(e) =>
                    setInvestigacion({ ...investigacion, basic_causes: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Causa raíz"
                required
                hint="Obligatoria: quedarse en la causa inmediata es la observación más frecuente de una fiscalización."
              >
                <textarea
                  rows={3}
                  value={investigacion.root_cause}
                  onChange={(e) =>
                    setInvestigacion({ ...investigacion, root_cause: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Conclusiones">
                <textarea
                  rows={2}
                  value={investigacion.conclusions}
                  onChange={(e) =>
                    setInvestigacion({ ...investigacion, conclusions: e.target.value })
                  }
                />
              </Field>
            </div>
            <ErrorBox error={investigar.error} />
            <div className="actions">
              <button type="submit" disabled={investigar.isPending}>
                Guardar investigación
              </button>
              <button type="button" className="link" onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "medida" && actual && (
        <Modal title="Nueva medida correctiva" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              agregarMedida.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Medida" required>
                <textarea
                  rows={3}
                  value={medida.description}
                  onChange={(e) => setMedida({ ...medida, description: e.target.value })}
                  required
                />
              </Field>
              <Field
                label="Nivel de control"
                required
                hint="Jerarquía del artículo 21: el EPP es el último recurso, no el primero."
              >
                <Select
                  value={medida.control_kind}
                  onChange={(v) => setMedida({ ...medida, control_kind: v })}
                  options={CONTROLES}
                  required
                />
              </Field>
              <Field label="Responsable" required hint="Una medida sin dueño no se cumple.">
                <Select
                  value={medida.responsible}
                  onChange={(v) => setMedida({ ...medida, responsible: v })}
                  options={(plantilla.data ?? []).map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`.trim() || u.username,
                  }))}
                  required
                />
              </Field>
              <Field label="Plazo" required hint="Sin fecha no se puede verificar.">
                <input
                  type="date"
                  value={medida.due_date}
                  min={actual.occurred_at.slice(0, 10)}
                  onChange={(e) => setMedida({ ...medida, due_date: e.target.value })}
                  required
                />
              </Field>
            </div>
            <ErrorBox error={agregarMedida.error} />
            <div className="actions">
              <button type="submit" disabled={agregarMedida.isPending}>
                Agregar
              </button>
              <button type="button" className="link" onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "aviso" && actual && (
        <Modal title="Registrar aviso al Ministerio de Trabajo" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              avisar.mutate();
            }}
          >
            <p className="small">
              Plazo legal: {fecha(actual.notice_deadline)}.{" "}
              {actual.notice_overdue
                ? "Ya venció; el aviso quedará registrado como tardío."
                : `Quedan ${actual.notice_hours_left} horas.`}
            </p>
            <div className="form-grid">
              <Field label="Cargo o constancia" hint="Número que devuelve el MTPE, si ya lo tienes.">
                <input
                  value={aviso.notice_code}
                  onChange={(e) => setAviso({ notice_code: e.target.value })}
                  maxLength={80}
                />
              </Field>
            </div>
            <ErrorBox error={avisar.error} />
            <div className="actions">
              <button type="submit" disabled={avisar.isPending}>
                Registrar aviso
              </button>
              <button type="button" className="link" onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "enfermedad" && (
        <Modal title="Registrar enfermedad ocupacional" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearEnfermedad.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Trabajador" required>
                <input
                  value={enfermedad.worker_name}
                  onChange={(e) => setEnfermedad({ ...enfermedad, worker_name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Diagnóstico" required>
                <input
                  value={enfermedad.diagnosis}
                  onChange={(e) => setEnfermedad({ ...enfermedad, diagnosis: e.target.value })}
                  maxLength={200}
                  required
                />
              </Field>
              <Field label="Código CIE-10">
                <input
                  value={enfermedad.cie10_code}
                  onChange={(e) => setEnfermedad({ ...enfermedad, cie10_code: e.target.value })}
                  maxLength={10}
                />
              </Field>
              <Field label="Agente causal" hint="Ruido, sílice, plomo, carga postural…">
                <input
                  value={enfermedad.causal_agent}
                  onChange={(e) => setEnfermedad({ ...enfermedad, causal_agent: e.target.value })}
                  maxLength={150}
                />
              </Field>
              <Field label="Meses de exposición">
                <input
                  type="number"
                  min={0}
                  value={enfermedad.exposure_months}
                  onChange={(e) =>
                    setEnfermedad({ ...enfermedad, exposure_months: e.target.value })
                  }
                />
              </Field>
              <Field label="Diagnosticada el" required>
                <input
                  type="date"
                  value={enfermedad.diagnosed_on}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setEnfermedad({ ...enfermedad, diagnosed_on: e.target.value })}
                  required
                />
              </Field>
              <Field label="Área">
                <Select
                  value={enfermedad.area}
                  onChange={(v) => setEnfermedad({ ...enfermedad, area: v })}
                  options={(listaAreas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                />
              </Field>
              <Field label="Estado" required>
                <Select
                  value={enfermedad.status}
                  onChange={(v) => setEnfermedad({ ...enfermedad, status: v })}
                  options={ESTADOS_ENFERMEDAD}
                  required
                />
              </Field>
              <Field label="Días de descanso médico">
                <input
                  type="number"
                  min={0}
                  value={enfermedad.rest_days}
                  onChange={(e) => setEnfermedad({ ...enfermedad, rest_days: e.target.value })}
                />
              </Field>
              <Field label="Observaciones">
                <textarea
                  rows={2}
                  value={enfermedad.notes}
                  onChange={(e) => setEnfermedad({ ...enfermedad, notes: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={crearEnfermedad.error} />
            <div className="actions">
              <button type="submit" disabled={crearEnfermedad.isPending}>
                Registrar
              </button>
              <button type="button" className="link" onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function MedidasTabla({
  medidas,
  puedeGestionar,
  usuarioId,
  onCompletar,
  onVerificar,
}: {
  medidas: CorrectiveMeasure[];
  puedeGestionar: boolean;
  usuarioId: number;
  onCompletar: (id: number) => void;
  onVerificar: (id: number) => void;
}) {
  if (medidas.length === 0) {
    return <p className="muted small">Sin medidas correctivas registradas.</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Medida</th>
          <th>Nivel de control</th>
          <th>Responsable</th>
          <th>Plazo</th>
          <th>Estado</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {medidas.map((m) => (
          <tr key={m.id}>
            <td>{m.description}</td>
            <td>{m.control_kind_display}</td>
            <td>{m.responsible_name}</td>
            <td>
              {soloFecha(m.due_date)}
              {m.overdue && <span className="pildora grave"> vencida</span>}
            </td>
            <td>{m.status_display}</td>
            <td>
              {m.status === "PENDIENTE" && (m.responsible === usuarioId || puedeGestionar) && (
                <button type="button" className="link" onClick={() => onCompletar(m.id)}>
                  Marcar implementada
                </button>
              )}
              {m.status === "IMPLEMENTADA" && puedeGestionar && m.responsible !== usuarioId && (
                <button type="button" className="link" onClick={() => onVerificar(m.id)}>
                  Verificar
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
