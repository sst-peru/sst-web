import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { areas, users } from "../../api/endpoints";
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
  const [modal, setModal] = useState<"usuario" | "area" | null>(null);
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

  const lista = useQuery({ queryKey: ["users"], queryFn: () => users.list() });
  const listaAreas = useQuery({ queryKey: ["areas"], queryFn: areas.list });

  const crear = useMutation({
    mutationFn: () =>
      users.create({ ...nuevo, area: nuevo.area ? Number(nuevo.area) : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
          <p className="muted">{lista.data?.length ?? 0} usuarios en la empresa</p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setModal("area")}>
            Nueva área
          </button>
          <button type="button" onClick={() => setModal("usuario")}>
            Nuevo usuario
          </button>
        </div>
      </header>

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
    </>
  );
}
