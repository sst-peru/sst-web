import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { areas, company, users } from "../../api/endpoints";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";

const ROLES = [
  { value: "OPERARIO", label: "Operario / trabajador de campo" },
  { value: "SUPERVISOR", label: "Supervisor de SST" },
  { value: "COMITE", label: "Miembro del comité de SST" },
  { value: "ADMIN", label: "Administrador" },
];

/** Alta de usuarios y áreas. Es el único lugar donde se puede asignar un rol distinto de operario. */
export default function UsersPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"usuario" | "area" | "empresa" | null>(null);
  const [nuevo, setNuevo] = useState({
    username: "",
    first_name: "",
    last_name: "",
    dni: "",
    email: "",
    password: "",
    role: "OPERARIO",
    area: "",
  });
  const [nuevaArea, setNuevaArea] = useState({ name: "", description: "" });
  const [datosEmpresa, setDatosEmpresa] = useState({ name: "", address: "", worker_count: "" });

  const lista = useQuery({ queryKey: ["users"], queryFn: () => users.list() });
  const listaAreas = useQuery({ queryKey: ["areas"], queryFn: areas.list });
  const empresa = useQuery({ queryKey: ["company"], queryFn: company.get });

  // El numero de trabajadores que declaro la empresa es el cupo de cuentas de su RUC.
  const sinPlazas = empresa.data?.worker_slots_available === 0;

  const crear = useMutation({
    mutationFn: () =>
      users.create({ ...nuevo, area: nuevo.area ? Number(nuevo.area) : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
      setModal(null);
      setNuevo({
        username: "", first_name: "", last_name: "", dni: "", email: "",
        password: "", role: "OPERARIO", area: "",
      });
    },
  });

  const crearArea = useMutation({
    mutationFn: () => areas.create(nuevaArea),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setModal(null);
      setNuevaArea({ name: "", description: "" });
    },
  });

  const guardarEmpresa = useMutation({
    mutationFn: () =>
      company.update({
        name: datosEmpresa.name,
        address: datosEmpresa.address,
        worker_count: Number(datosEmpresa.worker_count),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      setModal(null);
    },
  });

  /** Abre el modal con los valores que ya tiene la empresa, para corregir y no reescribir. */
  const abrirEmpresa = () => {
    if (!empresa.data) return;
    setDatosEmpresa({
      name: empresa.data.name,
      address: empresa.data.address,
      worker_count: String(empresa.data.worker_count),
    });
    setModal("empresa");
  };

  const cambiarRol = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => users.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const set = (campo: keyof typeof nuevo) => (valor: string) =>
    setNuevo((previo) => ({ ...previo, [campo]: valor }));

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Usuarios y áreas</h1>
          <p className="muted">
            {lista.data?.length ?? 0} usuarios en la empresa
            {empresa.data &&
              ` · ${empresa.data.worker_accounts} de ${empresa.data.worker_count} plazas de trabajador usadas`}
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={abrirEmpresa}
            disabled={!empresa.data}
          >
            Datos de la empresa
          </button>
          <button type="button" className="secondary" onClick={() => setModal("area")}>
            Nueva área
          </button>
          <button
            type="button"
            onClick={() => setModal("usuario")}
            disabled={sinPlazas}
            title={
              sinPlazas
                ? "No quedan plazas libres: sube el número de trabajadores de la empresa."
                : undefined
            }
          >
            Nuevo usuario
          </button>
        </div>
      </header>

      {sinPlazas && (
        <p className="card aviso" role="status">
          La empresa declaró {empresa.data?.worker_count} trabajador
          {empresa.data?.worker_count === 1 ? "" : "es"} y ya tiene todas esas cuentas
          registradas, así que nadie más puede registrarse con el RUC. Para dar de alta a
          alguien más, sube el número de trabajadores en «Datos de la empresa».
        </p>
      )}

      <section className="card">
        <h2>Usuarios</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>DNI</th>
                <th>Área</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {lista.data?.map((u) => (
                <tr key={u.id}>
                  <td>{`${u.first_name} ${u.last_name}`.trim() || "—"}</td>
                  <td>{u.username}</td>
                  <td>{u.dni || "—"}</td>
                  <td>{u.area_name ?? "—"}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => cambiarRol.mutate({ id: u.id, role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ErrorBox error={cambiarRol.error} />
      </section>

      <section className="card">
        <h2>Áreas</h2>
        <table>
          <thead>
            <tr>
              <th>Área</th>
              <th>Descripción</th>
              <th>Trabajadores</th>
            </tr>
          </thead>
          <tbody>
            {listaAreas.data?.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.description || "—"}</td>
                <td>{(lista.data ?? []).filter((u) => u.area === a.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modal === "usuario" && (
        <Modal title="Nuevo usuario" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crear.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Nombres" required>
                <input value={nuevo.first_name} onChange={(e) => set("first_name")(e.target.value)} required />
              </Field>
              <Field label="Apellidos" required>
                <input value={nuevo.last_name} onChange={(e) => set("last_name")(e.target.value)} required />
              </Field>
              <Field label="Usuario" required>
                <input value={nuevo.username} onChange={(e) => set("username")(e.target.value)} required />
              </Field>
              <Field label="Contraseña" required>
                <input type="password" value={nuevo.password} onChange={(e) => set("password")(e.target.value)} required />
              </Field>
              <Field label="DNI">
                <input value={nuevo.dni} onChange={(e) => set("dni")(e.target.value)} maxLength={8} />
              </Field>
              <Field label="Correo">
                <input type="email" value={nuevo.email} onChange={(e) => set("email")(e.target.value)} />
              </Field>
              <Field label="Rol" required>
                <Select value={nuevo.role} onChange={set("role")} options={ROLES} required />
              </Field>
              <Field label="Área">
                <Select
                  value={nuevo.area}
                  onChange={set("area")}
                  options={(listaAreas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                />
              </Field>
            </div>
            <ErrorBox error={crear.error} />
            <div className="actions">
              <button type="submit" disabled={crear.isPending}>Crear usuario</button>
              <button type="button" className="link" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "area" && (
        <Modal title="Nueva área" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearArea.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Nombre" required>
                <input value={nuevaArea.name} onChange={(e) => setNuevaArea({ ...nuevaArea, name: e.target.value })} required />
              </Field>
              <Field label="Descripción">
                <input
                  value={nuevaArea.description}
                  onChange={(e) => setNuevaArea({ ...nuevaArea, description: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={crearArea.error} />
            <div className="actions">
              <button type="submit" disabled={crearArea.isPending}>Crear área</button>
              <button type="button" className="link" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "empresa" && (
        <Modal title="Datos de la empresa" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guardarEmpresa.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Razón social" required>
                <input
                  value={datosEmpresa.name}
                  onChange={(e) => setDatosEmpresa({ ...datosEmpresa, name: e.target.value })}
                  minLength={3}
                  required
                />
              </Field>
              <Field label="Dirección">
                <input
                  value={datosEmpresa.address}
                  onChange={(e) => setDatosEmpresa({ ...datosEmpresa, address: e.target.value })}
                />
              </Field>
              <Field label="RUC" hint="No se puede cambiar: es la llave con la que se registra la plantilla.">
                <input value={empresa.data?.ruc ?? ""} readOnly disabled />
              </Field>
              <Field
                label="Número de trabajadores"
                required
                hint={`Es el cupo de cuentas del RUC. Hoy hay ${empresa.data?.worker_accounts ?? 0} registradas, sin contar a los administradores.`}
              >
                <input
                  type="number"
                  min={empresa.data?.worker_accounts ?? 1}
                  value={datosEmpresa.worker_count}
                  onChange={(e) =>
                    setDatosEmpresa({ ...datosEmpresa, worker_count: e.target.value })
                  }
                  required
                />
              </Field>
            </div>
            <ErrorBox error={guardarEmpresa.error} />
            <div className="actions">
              <button type="submit" disabled={guardarEmpresa.isPending}>
                Guardar
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
