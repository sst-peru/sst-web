import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { epp, exportar, users } from "../../api/endpoints";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";
import { useAuth } from "../auth/AuthContext";

/**
 * Control de EPP. El operario ve solo lo suyo y puede firmar su conformidad;
 * el supervisor administra el catálogo y registra entregas.
 */
export default function EppPage() {
  const { canManage, user } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"item" | "entrega" | null>(null);
  const [item, setItem] = useState({ name: "", description: "", lifespan_days: "180", stock: "0" });
  const [entrega, setEntrega] = useState({ item: "", worker: "", quantity: "1", notes: "" });

  const items = useQuery({ queryKey: ["epp-items"], queryFn: epp.items });
  const entregas = useQuery({ queryKey: ["epp-deliveries"], queryFn: () => epp.deliveries() });
  const listaUsuarios = useQuery({
    queryKey: ["users"],
    queryFn: () => users.list(),
    enabled: canManage,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["epp-items"] });
    queryClient.invalidateQueries({ queryKey: ["epp-deliveries"] });
  };

  const crearItem = useMutation({
    mutationFn: () =>
      epp.createItem({
        name: item.name,
        description: item.description,
        lifespan_days: Number(item.lifespan_days),
        stock: Number(item.stock),
      }),
    onSuccess: () => {
      invalidar();
      setModal(null);
      setItem({ name: "", description: "", lifespan_days: "180", stock: "0" });
    },
  });

  const crearEntrega = useMutation({
    mutationFn: () =>
      epp.createDelivery({
        item: Number(entrega.item),
        worker: Number(entrega.worker),
        quantity: Number(entrega.quantity),
        notes: entrega.notes,
      }),
    onSuccess: () => {
      invalidar();
      setModal(null);
      setEntrega({ item: "", worker: "", quantity: "1", notes: "" });
    },
  });

  const confirmar = useMutation({
    mutationFn: (id: number) => epp.acknowledge(id),
    onSuccess: invalidar,
  });

  const vencidos = (entregas.data ?? []).filter((d) => d.is_expired).length;

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Equipos de protección personal</h1>
          <p className="muted">
            {entregas.data?.length ?? 0} entregas registradas
            {vencidos > 0 && ` · ${vencidos} con vida útil vencida`}
          </p>
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" className="secondary" onClick={() => exportar("epp")}>
              Exportar a Excel
            </button>
            <button type="button" className="secondary" onClick={() => setModal("item")}>
              Nuevo EPP
            </button>
            <button type="button" onClick={() => setModal("entrega")}>
              Registrar entrega
            </button>
          </div>
        )}
      </header>

      {canManage && (
        <section className="card">
          <h2>Catálogo</h2>
          <table>
            <thead>
              <tr>
                <th>EPP</th>
                <th>Vida útil</th>
                <th>Stock</th>
                <th>Entregas</th>
              </tr>
            </thead>
            <tbody>
              {items.data?.map((epi) => (
                <tr key={epi.id}>
                  <td>
                    <strong>{epi.name}</strong>
                    {epi.description && <div className="muted small">{epi.description}</div>}
                  </td>
                  <td>{epi.lifespan_days} días</td>
                  <td>{epi.stock}</td>
                  <td>{(entregas.data ?? []).filter((d) => d.item === epi.id).length}</td>
                </tr>
              ))}
              {!items.data?.length && (
                <tr>
                  <td colSpan={4} className="muted">
                    Sin EPP en el catálogo todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h2>{canManage ? "Entregas" : "Mis EPP"}</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {canManage && <th>Trabajador</th>}
                <th>EPP</th>
                <th>Cantidad</th>
                <th>Entregado</th>
                <th>Vence</th>
                <th>Conformidad</th>
              </tr>
            </thead>
            <tbody>
              {entregas.data?.map((d) => (
                <tr key={d.id} className={d.is_expired ? "fila-alerta" : undefined}>
                  {canManage && <td>{d.worker_name}</td>}
                  <td>{d.item_name}</td>
                  <td>{d.quantity}</td>
                  <td>{new Date(d.delivered_at).toLocaleDateString("es-PE")}</td>
                  <td>
                    {d.expires_at ? new Date(d.expires_at).toLocaleDateString("es-PE") : "—"}
                    {d.is_expired && <span className="pill pill-critical">Vencido</span>}
                  </td>
                  <td>
                    {d.acknowledged ? (
                      <span className="pill pill-low">Firmada</span>
                    ) : d.worker === user?.id ? (
                      <button
                        type="button"
                        className="link"
                        onClick={() => confirmar.mutate(d.id)}
                        disabled={confirmar.isPending}
                      >
                        Dar conformidad
                      </button>
                    ) : (
                      <span className="muted">Pendiente</span>
                    )}
                  </td>
                </tr>
              ))}
              {!entregas.data?.length && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="muted">
                    No hay entregas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          La fecha de vencimiento se calcula sola a partir de la vida útil del EPP. La conformidad
          del trabajador es parte del registro que exige la Ley 29783.
        </p>
      </section>

      {modal === "item" && (
        <Modal title="Nuevo EPP en el catálogo" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearItem.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Nombre" required>
                <input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} required />
              </Field>
              <Field label="Descripción">
                <input value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
              </Field>
              <Field label="Vida útil (días)" required hint="Con esto el sistema avisa cuándo toca reponer.">
                <input
                  type="number"
                  min={1}
                  value={item.lifespan_days}
                  onChange={(e) => setItem({ ...item, lifespan_days: e.target.value })}
                  required
                />
              </Field>
              <Field label="Stock">
                <input
                  type="number"
                  min={0}
                  value={item.stock}
                  onChange={(e) => setItem({ ...item, stock: e.target.value })}
                />
              </Field>
            </div>
            <ErrorBox error={crearItem.error} />
            <div className="actions">
              <button type="submit" disabled={crearItem.isPending}>Guardar</button>
              <button type="button" className="link" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "entrega" && (
        <Modal title="Registrar entrega de EPP" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearEntrega.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="EPP" required>
                <Select
                  value={entrega.item}
                  onChange={(v) => setEntrega({ ...entrega, item: v })}
                  options={(items.data ?? []).map((i) => ({ value: i.id, label: i.name }))}
                  required
                />
              </Field>
              <Field label="Trabajador" required>
                <Select
                  value={entrega.worker}
                  onChange={(v) => setEntrega({ ...entrega, worker: v })}
                  options={(listaUsuarios.data ?? []).map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name}`.trim() || u.username,
                  }))}
                  required
                />
              </Field>
              <Field label="Cantidad" required>
                <input
                  type="number"
                  min={1}
                  value={entrega.quantity}
                  onChange={(e) => setEntrega({ ...entrega, quantity: e.target.value })}
                  required
                />
              </Field>
              <Field label="Observaciones">
                <input value={entrega.notes} onChange={(e) => setEntrega({ ...entrega, notes: e.target.value })} />
              </Field>
            </div>
            <ErrorBox error={crearEntrega.error} />
            <div className="actions">
              <button type="submit" disabled={crearEntrega.isPending}>Registrar</button>
              <button type="button" className="link" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
