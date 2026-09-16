import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { areas, exportar, iperc, users } from "../../api/endpoints";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";
import type { IpercEntry, RiskLevel } from "../../api/types";
import { useAuth } from "../auth/AuthContext";

const NIVEL_CLASE: Record<RiskLevel, string> = {
  TRIVIAL: "pill pill-low",
  TOLERABLE: "pill pill-low",
  MODERADO: "pill pill-mid",
  IMPORTANTE: "pill pill-high",
  INTOLERABLE: "pill pill-critical",
};

const PROBABILIDAD = [
  { value: 1, label: "1 - Baja" },
  { value: 2, label: "2 - Media" },
  { value: 3, label: "3 - Alta" },
];

const CONSECUENCIA = [
  { value: 1, label: "1 - Ligeramente dañino" },
  { value: 2, label: "2 - Dañino" },
  { value: 3, label: "3 - Extremadamente dañino" },
];

const FILA_VACIA = {
  area: "",
  job_position: "",
  hazard: "",
  risk: "",
  probability: "2",
  consequence: "2",
  existing_controls: "",
  proposed_controls: "",
  responsible: "",
};

export default function IpercPage() {
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<IpercEntry | null>(null);
  const [fila, setFila] = useState({ ...FILA_VACIA });
  const [versionElegida, setVersionElegida] = useState<string>("");

  const matrices = useQuery({ queryKey: ["iperc-matrices"], queryFn: iperc.matrices });
  const entradas = useQuery({
    queryKey: ["iperc-entries", versionElegida],
    queryFn: () => iperc.entries(versionElegida ? { matrix: versionElegida } : undefined),
  });
  const listaAreas = useQuery({ queryKey: ["areas"], queryFn: areas.list });
  const listaUsuarios = useQuery({
    queryKey: ["users"],
    queryFn: () => users.list(),
    enabled: canManage,
  });

  // La matriz sobre la que se trabaja: la elegida en el selector o, por defecto, la vigente.
  const vigente = matrices.data?.find((m) => m.status === "VIGENTE") ?? matrices.data?.[0] ?? null;
  const actual =
    matrices.data?.find((m) => String(m.id) === versionElegida) ?? vigente;
  const esHistorica = actual?.status === "HISTORICA";

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["iperc-entries"] });
    queryClient.invalidateQueries({ queryKey: ["iperc-matrices"] });
  };

  const crearMatriz = useMutation({
    mutationFn: () =>
      iperc.createMatrix({
        status: "VIGENTE",
        valid_from: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: invalidar,
  });

  /**
   * Crea una versión nueva de la matriz.
   *
   * Nace en BORRADOR: una matriz no debería regir la operación hasta que el comité la
   * apruebe. El número de versión lo asigna el servidor de forma correlativa.
   */
  const nuevaVersion = useMutation({
    mutationFn: () => iperc.createMatrix({ status: "BORRADOR" }),
    onSuccess: (matriz) => {
      invalidar();
      setVersionElegida(String(matriz.id));
    },
  });

  /**
   * Pone vigente la versión seleccionada y archiva la anterior.
   *
   * Solo puede haber una matriz vigente a la vez: si quedaran dos, no se sabría cuál
   * rige, que es justo lo que una auditoría pregunta.
   */
  const ponerVigente = useMutation({
    mutationFn: async () => {
      if (!actual) return;
      const anterior = matrices.data?.find(
        (m) => m.status === "VIGENTE" && m.id !== actual.id,
      );
      if (anterior) {
        await iperc.updateMatrix(anterior.id, { status: "HISTORICA" });
      }
      return iperc.updateMatrix(actual.id, {
        status: "VIGENTE",
        valid_from: new Date().toISOString().slice(0, 10),
      });
    },
    onSuccess: invalidar,
  });

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = {
        matrix: actual?.id,
        area: Number(fila.area),
        job_position: fila.job_position,
        hazard: fila.hazard,
        risk: fila.risk,
        probability: Number(fila.probability),
        consequence: Number(fila.consequence),
        existing_controls: fila.existing_controls,
        proposed_controls: fila.proposed_controls,
        responsible: fila.responsible ? Number(fila.responsible) : null,
      };
      return editando
        ? iperc.updateEntry(editando.id, cuerpo)
        : iperc.createEntry(cuerpo);
    },
    onSuccess: () => {
      invalidar();
      cerrar();
    },
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => iperc.deleteEntry(id),
    onSuccess: invalidar,
  });

  function abrirNueva() {
    setEditando(null);
    setFila({ ...FILA_VACIA });
    setAbierto(true);
  }

  function abrirEdicion(entrada: IpercEntry) {
    setEditando(entrada);
    setFila({
      area: String(entrada.area),
      job_position: entrada.job_position,
      hazard: entrada.hazard,
      risk: entrada.risk,
      probability: String(entrada.probability),
      consequence: String(entrada.consequence),
      existing_controls: entrada.existing_controls,
      proposed_controls: entrada.proposed_controls,
      responsible: entrada.responsible ? String(entrada.responsible) : "",
    });
    setAbierto(true);
  }

  const cerrar = () => {
    setAbierto(false);
    setEditando(null);
  };

  const set = (campo: keyof typeof fila) => (valor: string) =>
    setFila((previo) => ({ ...previo, [campo]: valor }));

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Matriz IPERC</h1>
          <p className="muted">
            {actual
              ? `Versión ${actual.version} · ${actual.status.toLowerCase()} · ${entradas.data?.length ?? 0} peligros identificados`
              : "Todavía no hay una matriz registrada."}
          </p>
        </div>
        {canManage && (
          <div className="actions">
            {(matrices.data?.length ?? 0) > 0 && (
              <label className="selector-version">
                <span className="field-label">Versión</span>
                <select
                  value={versionElegida || String(actual?.id ?? "")}
                  onChange={(e) => setVersionElegida(e.target.value)}
                >
                  {matrices.data?.map((m) => (
                    <option key={m.id} value={m.id}>
                      v{m.version} — {m.status.toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" className="secondary" onClick={() => exportar("iperc")}>
              Exportar a Excel
            </button>
            {actual ? (
              <>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => nuevaVersion.mutate()}
                  disabled={nuevaVersion.isPending}
                >
                  Nueva versión
                </button>
                {actual.status !== "VIGENTE" && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => ponerVigente.mutate()}
                    disabled={ponerVigente.isPending}
                  >
                    Poner vigente
                  </button>
                )}
                {!esHistorica && (
                  <button type="button" onClick={abrirNueva}>
                    Agregar peligro
                  </button>
                )}
              </>
            ) : (
              <button type="button" onClick={() => crearMatriz.mutate()}>
                Crear matriz v1
              </button>
            )}
          </div>
        )}
      </header>

      {esHistorica && (
        <section className="card aviso">
          Estás viendo una versión histórica de la matriz. Se conserva como evidencia para
          auditorías y no admite cambios; para editar, selecciona la versión vigente.
        </section>
      )}

      <ErrorBox error={crearMatriz.error ?? nuevaVersion.error ?? ponerVigente.error ?? eliminar.error} />

      <section className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Área</th>
                <th>Puesto / tarea</th>
                <th>Peligro</th>
                <th>Riesgo</th>
                <th>P</th>
                <th>C</th>
                <th>Nivel</th>
                <th>Controles existentes</th>
                <th>Origen</th>
                {canManage && !esHistorica && <th></th>}
              </tr>
            </thead>
            <tbody>
              {entradas.data?.map((entrada) => (
                <tr key={entrada.id}>
                  <td>{entrada.area_name}</td>
                  <td>{entrada.job_position}</td>
                  <td>{entrada.hazard}</td>
                  <td>{entrada.risk}</td>
                  <td>{entrada.probability}</td>
                  <td>{entrada.consequence}</td>
                  <td>
                    <span className={NIVEL_CLASE[entrada.risk_level] ?? "pill"}>
                      {entrada.risk_level} ({entrada.risk_score})
                    </span>
                  </td>
                  <td>{entrada.existing_controls || "—"}</td>
                  <td>
                    {entrada.source_report ? (
                      <a href={`/reportes/${entrada.source_report}`}>Reporte #{entrada.source_report}</a>
                    ) : (
                      <span className="muted">Revisión manual</span>
                    )}
                  </td>
                  {canManage && !esHistorica && (
                    <td className="nowrap">
                      <button type="button" className="link" onClick={() => abrirEdicion(entrada)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="link danger"
                        onClick={() => eliminar.mutate(entrada.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!entradas.data?.length && (
                <tr>
                  <td colSpan={canManage && !esHistorica ? 10 : 9} className="muted">
                    La matriz está vacía. Los peligros que más se repiten en los reportes son
                    buenos candidatos para la primera versión.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          El nivel de riesgo sale de probabilidad × consecuencia. Las filas con origen en un
          reporte vienen del campo, no de una revisión de escritorio: es lo que mantiene la matriz viva.
        </p>
      </section>

      {abierto && (
        <Modal title={editando ? "Editar peligro" : "Agregar peligro a la matriz"} onClose={cerrar}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guardar.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Área" required>
                <Select
                  value={fila.area}
                  onChange={set("area")}
                  options={(listaAreas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                  required
                />
              </Field>
              <Field label="Puesto o tarea" required>
                <input value={fila.job_position} onChange={(e) => set("job_position")(e.target.value)} required />
              </Field>
              <Field label="Peligro" required hint="La fuente: qué puede causar daño.">
                <input value={fila.hazard} onChange={(e) => set("hazard")(e.target.value)} required />
              </Field>
              <Field label="Riesgo" required hint="La consecuencia: qué daño puede ocurrir.">
                <input value={fila.risk} onChange={(e) => set("risk")(e.target.value)} required />
              </Field>
              <Field label="Probabilidad" required>
                <Select value={fila.probability} onChange={set("probability")} options={PROBABILIDAD} required />
              </Field>
              <Field label="Consecuencia" required>
                <Select value={fila.consequence} onChange={set("consequence")} options={CONSECUENCIA} required />
              </Field>
              <Field label="Controles existentes">
                <textarea rows={2} value={fila.existing_controls} onChange={(e) => set("existing_controls")(e.target.value)} />
              </Field>
              <Field label="Controles propuestos">
                <textarea rows={2} value={fila.proposed_controls} onChange={(e) => set("proposed_controls")(e.target.value)} />
              </Field>
              <Field label="Responsable">
                <Select
                  value={fila.responsible}
                  onChange={set("responsible")}
                  options={(listaUsuarios.data ?? []).map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`.trim() || u.username,
                  }))}
                />
              </Field>
            </div>
            <ErrorBox error={guardar.error} />
            <div className="actions">
              <button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? "Guardando…" : "Guardar"}
              </button>
              <button type="button" className="link" onClick={cerrar}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
