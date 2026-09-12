import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { committee, exportar, users } from "../../api/endpoints";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";
import type { Meeting } from "../../api/types";
import { useAuth } from "../auth/AuthContext";

const CARGOS = [
  { value: "PRESIDENTE", label: "Presidente" },
  { value: "SECRETARIO", label: "Secretario" },
  { value: "TITULAR", label: "Miembro titular" },
  { value: "SUPLENTE", label: "Miembro suplente" },
  { value: "SUPERVISOR", label: "Supervisor de SST" },
];

const REPRESENTA = [
  { value: "EMPLEADOR", label: "Representante del empleador" },
  { value: "TRABAJADORES", label: "Representante de los trabajadores" },
];

const ESTADOS_ACUERDO = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "CUMPLIDO", label: "Cumplido" },
  { value: "NO_CUMPLIDO", label: "No cumplido" },
];

export default function CommitteePage() {
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"comite" | "miembro" | "acta" | null>(null);
  const [acuerdoEn, setAcuerdoEn] = useState<Meeting | null>(null);

  const hoy = new Date().toISOString().slice(0, 10);
  const [datosComite, setDatosComite] = useState({ period_start: hoy, period_end: "" });
  const [miembro, setMiembro] = useState({ user: "", role: "TITULAR", represents: "TRABAJADORES" });
  const [acta, setActa] = useState({ date: hoy, place: "", agenda: "", minutes: "", is_extraordinary: false });
  const [acuerdo, setAcuerdo] = useState({ description: "", responsible: "", due_date: "" });

  const comite = useQuery({ queryKey: ["committee"], queryFn: committee.get });
  const actas = useQuery({ queryKey: ["meetings"], queryFn: committee.meetings });
  const cumplimiento = useQuery({ queryKey: ["committee-compliance"], queryFn: committee.compliance });
  const listaUsuarios = useQuery({
    queryKey: ["users"],
    queryFn: () => users.list(),
    enabled: canManage,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["committee"] });
    queryClient.invalidateQueries({ queryKey: ["meetings"] });
    queryClient.invalidateQueries({ queryKey: ["committee-compliance"] });
  };

  const crearComite = useMutation({
    mutationFn: () => committee.create(datosComite),
    onSuccess: () => {
      invalidar();
      setModal(null);
    },
  });

  const agregarMiembro = useMutation({
    mutationFn: () =>
      committee.addMember({
        committee: comite.data?.id,
        user: Number(miembro.user),
        role: miembro.role,
        represents: miembro.represents,
      }),
    onSuccess: () => {
      invalidar();
      setModal(null);
      setMiembro({ user: "", role: "TITULAR", represents: "TRABAJADORES" });
    },
  });

  const crearActa = useMutation({
    mutationFn: () =>
      committee.createMeeting({
        ...acta,
        // Por defecto asisten todos los miembros activos; se corrige luego si faltó alguien.
        attendees: (comite.data?.members ?? []).filter((m) => m.is_active).map((m) => m.id),
      }),
    onSuccess: () => {
      invalidar();
      setModal(null);
      setActa({ date: hoy, place: "", agenda: "", minutes: "", is_extraordinary: false });
    },
  });

  const agregarAcuerdo = useMutation({
    mutationFn: () =>
      committee.addAgreement({
        meeting: acuerdoEn!.id,
        description: acuerdo.description,
        responsible: acuerdo.responsible ? Number(acuerdo.responsible) : null,
        due_date: acuerdo.due_date || null,
      }),
    onSuccess: () => {
      invalidar();
      setAcuerdoEn(null);
      setAcuerdo({ description: "", responsible: "", due_date: "" });
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      committee.updateAgreement(id, { status }),
    onSuccess: invalidar,
  });

  const opcionesUsuarios = (listaUsuarios.data ?? []).map((u) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`.trim() || u.username,
  }));

  if (comite.isLoading) return <div className="centered">Cargando…</div>;

  if (!comite.data) {
    return (
      <>
        <header className="page-head">
          <h1>Comité de SST</h1>
        </header>
        <section className="card">
          <p>
            La empresa todavía no tiene comité registrado. La Ley 29783 exige un comité paritario
            desde 20 trabajadores; por debajo de eso basta un supervisor de SST elegido por los
            trabajadores.
          </p>
          {canManage && (
            <button type="button" onClick={() => setModal("comite")}>
              Registrar comité
            </button>
          )}
        </section>
        {modal === "comite" && (
          <Modal title="Registrar comité de SST" onClose={() => setModal(null)}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                crearComite.mutate();
              }}
            >
              <div className="form-grid">
                <Field label="Inicio del periodo" required>
                  <input
                    type="date"
                    value={datosComite.period_start}
                    onChange={(e) => setDatosComite({ ...datosComite, period_start: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fin del periodo" required hint="El mandato suele ser de 1 a 2 años.">
                  <input
                    type="date"
                    value={datosComite.period_end}
                    onChange={(e) => setDatosComite({ ...datosComite, period_end: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <ErrorBox error={crearComite.error} />
              <div className="actions">
                <button type="submit" disabled={crearComite.isPending}>Registrar</button>
                <button type="button" className="link" onClick={() => setModal(null)}>Cancelar</button>
              </div>
            </form>
          </Modal>
        )}
      </>
    );
  }

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Comité de SST</h1>
          <p className="muted">
            Periodo {comite.data.period_start} a {comite.data.period_end} ·{" "}
            {comite.data.member_count} miembros · quórum {comite.data.quorum_required}
          </p>
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" className="secondary" onClick={() => exportar("committee")}>
              Exportar actas
            </button>
            <button type="button" className="secondary" onClick={() => setModal("miembro")}>
              Agregar miembro
            </button>
            <button type="button" onClick={() => setModal("acta")}>
              Nueva acta
            </button>
          </div>
        )}
      </header>

      <section className="kpi-grid">
        <article className="card kpi">
          <span className="kpi-label">Actas registradas</span>
          <strong className="kpi-value">{cumplimiento.data?.meetings_total ?? 0}</strong>
          <span className="muted small">
            {cumplimiento.data?.meetings_with_quorum ?? 0} con quórum válido
          </span>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Acuerdos cumplidos</span>
          <strong className="kpi-value">
            {cumplimiento.data?.agreements_compliance_pct != null
              ? `${cumplimiento.data.agreements_compliance_pct}%`
              : "—"}
          </strong>
          <span className="muted small">
            {cumplimiento.data?.agreements_done ?? 0} de {cumplimiento.data?.agreements_total ?? 0}
          </span>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Acuerdos pendientes</span>
          <strong className="kpi-value alert">{cumplimiento.data?.agreements_pending ?? 0}</strong>
        </article>
        <article className="card kpi">
          <span className="kpi-label">Comité paritario</span>
          <strong className="kpi-value">{comite.data.is_paritario ? "Sí" : "No"}</strong>
          <span className="muted small">Igual número de ambas representaciones</span>
        </article>
      </section>

      {!comite.data.is_paritario && !comite.data.is_supervisor_mode && (
        <section className="card aviso">
          El comité no está paritario: la ley exige el mismo número de representantes del
          empleador y de los trabajadores. Agrega o desactiva miembros hasta igualarlos.
        </section>
      )}

      <section className="card">
        <h2>Miembros</h2>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cargo</th>
              <th>Representa a</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {comite.data.members.map((m) => (
              <tr key={m.id}>
                <td>{m.user_name}</td>
                <td>{CARGOS.find((c) => c.value === m.role)?.label ?? m.role}</td>
                <td>{REPRESENTA.find((r) => r.value === m.represents)?.label ?? m.represents}</td>
                <td>{m.is_active ? "Activo" : "Inactivo"}</td>
              </tr>
            ))}
            {!comite.data.members.length && (
              <tr>
                <td colSpan={4} className="muted">Sin miembros registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Actas de reunión</h2>
        {actas.data?.map((a) => (
          <article key={a.id} className="acta">
            <header className="row">
              <div>
                <strong>
                  Acta N° {a.number} · {new Date(`${a.date}T00:00:00`).toLocaleDateString("es-PE")}
                </strong>
                <span className="muted small">
                  {" "}
                  {a.is_extraordinary ? "Extraordinaria" : "Ordinaria"} · {a.attendee_count} asistentes
                </span>
              </div>
              {a.quorum_reached ? (
                <span className="pill pill-low">Con quórum</span>
              ) : (
                <span className="pill pill-critical">Sin quórum</span>
              )}
            </header>
            {a.agenda && <p className="muted small">Agenda: {a.agenda}</p>}
            <ul className="acuerdos">
              {a.agreements.map((ac) => (
                <li key={ac.id}>
                  <span>{ac.description}</span>
                  <span className="muted small">
                    {ac.responsible_name ?? "sin responsable"}
                    {ac.due_date && ` · plazo ${ac.due_date}`}
                  </span>
                  {canManage ? (
                    <select
                      value={ac.status}
                      onChange={(e) => cambiarEstado.mutate({ id: ac.id, status: e.target.value })}
                    >
                      {ESTADOS_ACUERDO.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="pill">{ac.status}</span>
                  )}
                </li>
              ))}
              {!a.agreements.length && <li className="muted">Sin acuerdos registrados.</li>}
            </ul>
            {canManage && (
              <button type="button" className="link" onClick={() => setAcuerdoEn(a)}>
                Agregar acuerdo
              </button>
            )}
          </article>
        ))}
        {!actas.data?.length && (
          <p className="muted">
            Sin actas. La ley pide reunión mensual del comité, y el acta es el documento que
            SUNAFIL revisa en una inspección.
          </p>
        )}
      </section>

      {modal === "miembro" && (
        <Modal title="Agregar miembro al comité" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              agregarMiembro.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Usuario" required>
                <Select
                  value={miembro.user}
                  onChange={(v) => setMiembro({ ...miembro, user: v })}
                  options={opcionesUsuarios}
                  required
                />
              </Field>
              <Field label="Cargo" required>
                <Select
                  value={miembro.role}
                  onChange={(v) => setMiembro({ ...miembro, role: v })}
                  options={CARGOS}
                  required
                />
              </Field>
              <Field label="Representa a" required>
                <Select
                  value={miembro.represents}
                  onChange={(v) => setMiembro({ ...miembro, represents: v })}
                  options={REPRESENTA}
                  required
                />
              </Field>
            </div>
            <ErrorBox error={agregarMiembro.error} />
            <div className="actions">
              <button type="submit" disabled={agregarMiembro.isPending}>Agregar</button>
              <button type="button" className="link" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "acta" && (
        <Modal title="Nueva acta de reunión" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearActa.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Fecha" required>
                <input
                  type="date"
                  value={acta.date}
                  onChange={(e) => setActa({ ...acta, date: e.target.value })}
                  required
                />
              </Field>
              <Field label="Lugar">
                <input value={acta.place} onChange={(e) => setActa({ ...acta, place: e.target.value })} />
              </Field>
              <Field label="Tipo">
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={acta.is_extraordinary}
                    onChange={(e) => setActa({ ...acta, is_extraordinary: e.target.checked })}
                  />
                  Extraordinaria
                </label>
              </Field>
              <Field label="Agenda">
                <textarea rows={2} value={acta.agenda} onChange={(e) => setActa({ ...acta, agenda: e.target.value })} />
              </Field>
              <Field label="Desarrollo">
                <textarea rows={4} value={acta.minutes} onChange={(e) => setActa({ ...acta, minutes: e.target.value })} />
              </Field>
            </div>
            <p className="muted small">
              El número de acta lo asigna el sistema de forma consecutiva.
            </p>
            <ErrorBox error={crearActa.error} />
            <div className="actions">
              <button type="submit" disabled={crearActa.isPending}>Crear acta</button>
              <button type="button" className="link" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {acuerdoEn && (
        <Modal title={`Acuerdo del acta N° ${acuerdoEn.number}`} onClose={() => setAcuerdoEn(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              agregarAcuerdo.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Acuerdo" required>
                <textarea
                  rows={3}
                  value={acuerdo.description}
                  onChange={(e) => setAcuerdo({ ...acuerdo, description: e.target.value })}
                  required
                />
              </Field>
              <Field label="Responsable">
                <Select
                  value={acuerdo.responsible}
                  onChange={(v) => setAcuerdo({ ...acuerdo, responsible: v })}
                  options={opcionesUsuarios}
                />
              </Field>
              <Field label="Plazo">
                <input
                  type="date"
                  value={acuerdo.due_date}
                  onChange={(e) => setAcuerdo({ ...acuerdo, due_date: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={agregarAcuerdo.error} />
            <div className="actions">
              <button type="submit" disabled={agregarAcuerdo.isPending}>Guardar acuerdo</button>
              <button type="button" className="link" onClick={() => setAcuerdoEn(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
