import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { areas, training, users } from "../../api/endpoints";
import type { DrillKind, TrainingSession } from "../../api/types";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";
import { useAuth } from "../auth/AuthContext";

/** Fecha sin hora: con T00:00:00 se lee como medianoche local y no como UTC (un día menos en Lima). */
function dia(valor: string | null | undefined): string {
  if (!valor) return "—";
  return new Date(`${valor}T00:00:00`).toLocaleDateString("es-PE");
}

function duracion(segundos: number | null): string {
  if (segundos == null) return "—";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return m ? `${m} min ${s} s` : `${s} s`;
}

const TIPOS_SIMULACRO: { value: DrillKind; label: string }[] = [
  { value: "SISMO", label: "Sismo" },
  { value: "INCENDIO", label: "Incendio" },
  { value: "DERRAME", label: "Derrame de sustancias peligrosas" },
  { value: "PRIMEROS_AUXILIOS", label: "Primeros auxilios" },
  { value: "EVACUACION", label: "Evacuación general" },
  { value: "OTRO", label: "Otro" },
];

const ESTADO_PILL: Record<TrainingSession["status"], string> = {
  PROGRAMADA: "pill-mid",
  REALIZADA: "pill-low",
  CANCELADA: "pill-critical",
};

const hoy = () => new Date().toLocaleDateString("en-CA");

const SESION_VACIA = {
  topic: "",
  planned_date: "",
  responsible: "",
  trainer: "",
  audience: "",
  area: "",
  duration_hours: "1",
  validity_months: "12",
};

const SIMULACRO_VACIO = {
  kind: "",
  held_on: "",
  area: "",
  participants: "",
  minutos: "",
  segundos: "",
  observations: "",
};

/**
 * Capacitación, inducción y simulacros: los registros de formación de la Ley 29783.
 * El supervisor planifica y registra; el trabajador consulta lo suyo y el programa.
 */
export default function TrainingPage() {
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const anio = new Date().getFullYear();

  const [modal, setModal] = useState<"sesion" | "induccion" | "simulacro" | null>(null);
  const [asistenciaDe, setAsistenciaDe] = useState<TrainingSession | null>(null);
  const [marcados, setMarcados] = useState<number[]>([]);
  const [sesion, setSesion] = useState(SESION_VACIA);
  const [induccion, setInduccion] = useState({ worker: "", completed_on: "", topics: "" });
  const [simulacro, setSimulacro] = useState(SIMULACRO_VACIO);

  const sesiones = useQuery({
    queryKey: ["training-sessions", anio],
    queryFn: () => training.sessions({ year: anio }),
  });
  const resumen = useQuery({
    queryKey: ["training-summary", anio],
    queryFn: () => training.summary(anio),
  });
  const pendientes = useQuery({
    queryKey: ["training-pending"],
    queryFn: training.pending,
    enabled: canManage,
  });
  const sinInduccion = useQuery({
    queryKey: ["induction-pending"],
    queryFn: training.pendingInductions,
    enabled: canManage,
  });
  const inducciones = useQuery({
    queryKey: ["inductions"],
    queryFn: training.inductions,
    enabled: canManage,
  });
  const simulacros = useQuery({ queryKey: ["drills"], queryFn: training.drills });
  const mias = useQuery({ queryKey: ["training-mine"], queryFn: training.mine });
  const listaUsuarios = useQuery({
    queryKey: ["users"],
    queryFn: () => users.list(),
    enabled: canManage,
  });
  const listaAreas = useQuery({ queryKey: ["areas"], queryFn: areas.list, enabled: canManage });

  const invalidar = () => {
    for (const clave of [
      "training-sessions",
      "training-summary",
      "training-pending",
      "training-mine",
      "induction-pending",
      "inductions",
      "drills",
    ]) {
      queryClient.invalidateQueries({ queryKey: [clave] });
    }
  };

  const crearSesion = useMutation({
    mutationFn: () =>
      training.createSession({
        topic: sesion.topic,
        planned_date: sesion.planned_date,
        responsible: sesion.responsible ? Number(sesion.responsible) : null,
        trainer: sesion.trainer,
        audience: sesion.audience,
        area: sesion.area ? Number(sesion.area) : null,
        duration_hours: sesion.duration_hours,
        validity_months: Number(sesion.validity_months),
      }),
    onSuccess: () => {
      invalidar();
      setModal(null);
      setSesion(SESION_VACIA);
    },
  });

  const cancelar = useMutation({ mutationFn: training.cancelSession, onSuccess: invalidar });

  const registrarAsistencia = useMutation({
    mutationFn: () => training.registerAttendance(asistenciaDe!.id, marcados),
    onSuccess: () => {
      invalidar();
      setAsistenciaDe(null);
      setMarcados([]);
    },
  });

  const crearInduccion = useMutation({
    mutationFn: () =>
      training.createInduction({
        worker: Number(induccion.worker),
        completed_on: induccion.completed_on || hoy(),
        topics: induccion.topics,
      }),
    onSuccess: () => {
      invalidar();
      setModal(null);
      setInduccion({ worker: "", completed_on: "", topics: "" });
    },
  });

  const crearSimulacro = useMutation({
    mutationFn: () => {
      const tieneTiempo = simulacro.minutos !== "" || simulacro.segundos !== "";
      return training.createDrill({
        kind: simulacro.kind,
        held_on: simulacro.held_on,
        area: simulacro.area ? Number(simulacro.area) : null,
        participants: Number(simulacro.participants),
        evacuation_seconds: tieneTiempo
          ? Number(simulacro.minutos || 0) * 60 + Number(simulacro.segundos || 0)
          : null,
        observations: simulacro.observations,
      });
    },
    onSuccess: () => {
      invalidar();
      setModal(null);
      setSimulacro(SIMULACRO_VACIO);
    },
  });

  const opcionesUsuarios = (listaUsuarios.data ?? [])
    .filter((u) => u.role !== "ADMIN")
    .map((u) => ({
      value: u.id,
      label: `${u.first_name} ${u.last_name}`.trim() || u.username,
    }));
  const opcionesAreas = (listaAreas.data ?? []).map((a) => ({ value: a.id, label: a.name }));

  const abrirAsistencia = async (s: TrainingSession) => {
    setAsistenciaDe(s);
    const previas = await training.attendance(s.id);
    setMarcados(previas.map((a) => a.worker));
  };

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Capacitación y simulacros</h1>
          <p className="muted">
            Programa {anio}: {resumen.data?.held ?? 0} de {resumen.data?.minimum_required ?? 4}{" "}
            capacitaciones mínimas realizadas
          </p>
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setModal("simulacro")}>
              Registrar simulacro
            </button>
            <button type="button" className="secondary" onClick={() => setModal("induccion")}>
              Registrar inducción
            </button>
            <button type="button" onClick={() => setModal("sesion")}>
              Nueva capacitación
            </button>
          </div>
        )}
      </header>

      {canManage && (
        <section className="kpi-grid">
          <article className="card kpi">
            <span className="kpi-label">Capacitaciones realizadas</span>
            <strong className="kpi-value">
              {resumen.data?.held ?? "—"} / {resumen.data?.minimum_required ?? 4}
            </strong>
            <span className={`pill ${resumen.data?.meets_minimum ? "pill-low" : "pill-mid"}`}>
              {resumen.data?.meets_minimum ? "Cumple el mínimo anual" : "Debajo del mínimo anual"}
            </span>
          </article>
          <article className="card kpi">
            <span className="kpi-label">Programadas en el año</span>
            <strong className="kpi-value">{resumen.data?.planned ?? "—"}</strong>
          </article>
          <article className="card kpi">
            <span className="kpi-label">Trabajadores sin capacitación vigente</span>
            <strong className="kpi-value">{pendientes.data?.length ?? "—"}</strong>
          </article>
          <article className="card kpi">
            <span className="kpi-label">Sin inducción</span>
            <strong className="kpi-value">{sinInduccion.data?.length ?? "—"}</strong>
          </article>
        </section>
      )}

      {!canManage && (
        <section className="card">
          <h2>Mis capacitaciones</h2>
          <p className="muted">
            Inducción:{" "}
            {mias.data?.induction_on ? `realizada el ${dia(mias.data.induction_on)}` : "pendiente"}
          </p>
          <table>
            <thead>
              <tr>
                <th>Tema</th>
                <th>Realizada</th>
                <th>Vigente hasta</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {mias.data?.trainings.map((t) => (
                <tr key={t.session}>
                  <td>{t.topic}</td>
                  <td>{dia(t.held_on)}</td>
                  <td>{dia(t.expires_on)}</td>
                  <td>
                    <span className={`pill ${t.is_valid ? "pill-low" : "pill-critical"}`}>
                      {t.is_valid ? "Vigente" : "Vencida"}
                    </span>
                  </td>
                </tr>
              ))}
              {!mias.data?.trainings.length && (
                <tr>
                  <td colSpan={4} className="muted">
                    Todavía no tienes capacitaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h2>Programa anual de capacitación {anio}</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha prevista</th>
                <th>Tema</th>
                <th>Responsable</th>
                <th>Público objetivo</th>
                <th>Estado</th>
                <th>Asistentes</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {sesiones.data?.map((s) => (
                <tr key={s.id}>
                  <td>{dia(s.planned_date)}</td>
                  <td>
                    <strong>{s.topic}</strong>
                    {s.trainer && <div className="muted small">Dicta: {s.trainer}</div>}
                  </td>
                  <td>{s.responsible_name ?? "—"}</td>
                  <td>
                    {s.audience}
                    {s.area_name && <div className="muted small">{s.area_name}</div>}
                  </td>
                  <td>
                    <span className={`pill ${ESTADO_PILL[s.status]}`}>{s.status_display}</span>
                    {s.held_on && <div className="muted small">el {dia(s.held_on)}</div>}
                  </td>
                  <td>{s.attendance_count}</td>
                  {canManage && (
                    <td className="actions">
                      {s.status !== "CANCELADA" && (
                        <button type="button" className="link" onClick={() => abrirAsistencia(s)}>
                          Registrar asistencia
                        </button>
                      )}
                      {s.status === "PROGRAMADA" && (
                        <button
                          type="button"
                          className="link"
                          onClick={() => cancelar.mutate(s.id)}
                          disabled={cancelar.isPending}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!sesiones.data?.length && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="muted">
                    No hay capacitaciones programadas este año.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          El reglamento de la Ley 29783 exige al menos cuatro capacitaciones al año. Al registrar la
          asistencia, la capacitación queda como realizada.
        </p>
      </section>

      {canManage && (
        <section className="card">
          <h2>Capacitación vencida</h2>
          <p className="muted small">
            Trabajadores sin una capacitación vigente: hay que reprogramarlos antes de una
            fiscalización.
          </p>
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Última capacitación</th>
                <th>Venció el</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.data?.map((p) => (
                <tr key={p.worker} className="fila-alerta">
                  <td>{p.worker_name}</td>
                  <td>{p.last_training_on ? dia(p.last_training_on) : "Nunca capacitado"}</td>
                  <td>{dia(p.expired_on)}</td>
                </tr>
              ))}
              {!pendientes.data?.length && (
                <tr>
                  <td colSpan={3} className="muted">
                    Toda la plantilla tiene una capacitación vigente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {canManage && (
        <section className="card">
          <h2>Inducción del personal nuevo</h2>
          {!!sinInduccion.data?.length && (
            <p className="error">
              Sin inducción: {sinInduccion.data.map((p) => p.worker_name).join(", ")}. No deberían
              empezar a trabajar sin ella.
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Fecha</th>
                <th>Dictada por</th>
                <th>Temas</th>
              </tr>
            </thead>
            <tbody>
              {inducciones.data?.map((i) => (
                <tr key={i.id}>
                  <td>{i.worker_name}</td>
                  <td>{dia(i.completed_on)}</td>
                  <td>{i.given_by_name ?? "—"}</td>
                  <td>{i.topics || "—"}</td>
                </tr>
              ))}
              {!inducciones.data?.length && (
                <tr>
                  <td colSpan={4} className="muted">
                    No hay inducciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h2>Simulacros de emergencia</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Área</th>
                <th>Participantes</th>
                <th>Tiempo de evacuación</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {simulacros.data?.map((d) => (
                <tr key={d.id}>
                  <td>{dia(d.held_on)}</td>
                  <td>{d.kind_display}</td>
                  <td>{d.area_name ?? "Toda la sede"}</td>
                  <td>{d.participants}</td>
                  <td>{duracion(d.evacuation_seconds)}</td>
                  <td>{d.observations || "—"}</td>
                </tr>
              ))}
              {!simulacros.data?.length && (
                <tr>
                  <td colSpan={6} className="muted">
                    No hay simulacros registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal === "sesion" && (
        <Modal title="Nueva capacitación" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearSesion.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Tema" required>
                <input
                  value={sesion.topic}
                  onChange={(e) => setSesion({ ...sesion, topic: e.target.value })}
                  required
                />
              </Field>
              <Field label="Fecha prevista" required>
                <input
                  type="date"
                  value={sesion.planned_date}
                  onChange={(e) => setSesion({ ...sesion, planned_date: e.target.value })}
                  required
                />
              </Field>
              <Field label="Responsable">
                <Select
                  value={sesion.responsible}
                  onChange={(v) => setSesion({ ...sesion, responsible: v })}
                  options={opcionesUsuarios}
                />
              </Field>
              <Field label="Capacitador" hint="Puede ser externo: bomberos, clínica, consultora.">
                <input
                  value={sesion.trainer}
                  onChange={(e) => setSesion({ ...sesion, trainer: e.target.value })}
                />
              </Field>
              <Field label="Público objetivo" required>
                <input
                  value={sesion.audience}
                  onChange={(e) => setSesion({ ...sesion, audience: e.target.value })}
                  placeholder="Operarios de almacén"
                  required
                />
              </Field>
              <Field label="Área">
                <Select
                  value={sesion.area}
                  onChange={(v) => setSesion({ ...sesion, area: v })}
                  options={opcionesAreas}
                  placeholder="Toda la empresa"
                />
              </Field>
              <Field label="Duración (horas)">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={sesion.duration_hours}
                  onChange={(e) => setSesion({ ...sesion, duration_hours: e.target.value })}
                />
              </Field>
              <Field label="Vigencia (meses)" hint="Pasado este plazo, el trabajador sale como vencido.">
                <input
                  type="number"
                  min={1}
                  value={sesion.validity_months}
                  onChange={(e) => setSesion({ ...sesion, validity_months: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={crearSesion.error} />
            <div className="actions">
              <button type="submit" disabled={crearSesion.isPending}>
                Guardar
              </button>
              <button type="button" className="link" onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {asistenciaDe && (
        <Modal title={`Asistencia: ${asistenciaDe.topic}`} onClose={() => setAsistenciaDe(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              registrarAsistencia.mutate();
            }}
          >
            <ul className="checklist">
              {opcionesUsuarios.map((u) => (
                <li key={u.value}>
                  <label>
                    <input
                      type="checkbox"
                      checked={marcados.includes(u.value)}
                      onChange={(e) =>
                        setMarcados(
                          e.target.checked
                            ? [...marcados, u.value]
                            : marcados.filter((id) => id !== u.value),
                        )
                      }
                    />{" "}
                    {u.label}
                  </label>
                </li>
              ))}
            </ul>
            <p className="muted small">{marcados.length} asistentes marcados.</p>
            <ErrorBox error={registrarAsistencia.error} />
            <div className="actions">
              <button type="submit" disabled={!marcados.length || registrarAsistencia.isPending}>
                Registrar asistencia
              </button>
              <button type="button" className="link" onClick={() => setAsistenciaDe(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "induccion" && (
        <Modal title="Registrar inducción" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearInduccion.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Trabajador" required>
                <Select
                  value={induccion.worker}
                  onChange={(v) => setInduccion({ ...induccion, worker: v })}
                  options={(sinInduccion.data ?? []).map((p) => ({
                    value: p.worker,
                    label: p.worker_name,
                  }))}
                  required
                />
              </Field>
              <Field label="Fecha">
                <input
                  type="date"
                  value={induccion.completed_on}
                  onChange={(e) => setInduccion({ ...induccion, completed_on: e.target.value })}
                />
              </Field>
              <Field label="Temas tratados" hint="Peligros del puesto, uso de EPP, rutas de evacuación, RISST.">
                <textarea
                  rows={3}
                  value={induccion.topics}
                  onChange={(e) => setInduccion({ ...induccion, topics: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={crearInduccion.error} />
            <div className="actions">
              <button type="submit" disabled={crearInduccion.isPending}>
                Registrar
              </button>
              <button type="button" className="link" onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "simulacro" && (
        <Modal title="Registrar simulacro" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearSimulacro.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Tipo" required>
                <Select
                  value={simulacro.kind}
                  onChange={(v) => setSimulacro({ ...simulacro, kind: v })}
                  options={TIPOS_SIMULACRO}
                  required
                />
              </Field>
              <Field label="Fecha" required>
                <input
                  type="date"
                  value={simulacro.held_on}
                  onChange={(e) => setSimulacro({ ...simulacro, held_on: e.target.value })}
                  required
                />
              </Field>
              <Field label="Área">
                <Select
                  value={simulacro.area}
                  onChange={(v) => setSimulacro({ ...simulacro, area: v })}
                  options={opcionesAreas}
                  placeholder="Toda la sede"
                />
              </Field>
              <Field label="Participantes" required>
                <input
                  type="number"
                  min={1}
                  value={simulacro.participants}
                  onChange={(e) => setSimulacro({ ...simulacro, participants: e.target.value })}
                  required
                />
              </Field>
              <Field label="Evacuación: minutos">
                <input
                  type="number"
                  min={0}
                  value={simulacro.minutos}
                  onChange={(e) => setSimulacro({ ...simulacro, minutos: e.target.value })}
                />
              </Field>
              <Field label="Evacuación: segundos">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={simulacro.segundos}
                  onChange={(e) => setSimulacro({ ...simulacro, segundos: e.target.value })}
                />
              </Field>
              <Field label="Observaciones">
                <textarea
                  rows={3}
                  value={simulacro.observations}
                  onChange={(e) => setSimulacro({ ...simulacro, observations: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={crearSimulacro.error} />
            <div className="actions">
              <button type="submit" disabled={crearSimulacro.isPending}>
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
