import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type MouseEvent } from "react";

import { areas, riskMaps, signs } from "../../api/endpoints";
import type { RiskKind, RiskMarker, SafetySign, SignKind, SignStatus } from "../../api/types";
import { ErrorBox, Field, Modal, Select } from "../../components/Form";
import { useAuth } from "../auth/AuthContext";

const TIPOS_RIESGO: { value: RiskKind; label: string }[] = [
  { value: "MECANICO", label: "Mecánico" },
  { value: "ELECTRICO", label: "Eléctrico" },
  { value: "CAIDA", label: "Caída de altura o a nivel" },
  { value: "QUIMICO", label: "Químico" },
  { value: "FISICO", label: "Físico (ruido, temperatura, radiación)" },
  { value: "BIOLOGICO", label: "Biológico" },
  { value: "ERGONOMICO", label: "Ergonómico" },
  { value: "INCENDIO", label: "Incendio o explosión" },
  { value: "LOCATIVO", label: "Locativo" },
];

const TIPOS_SENAL: { value: SignKind; label: string }[] = [
  { value: "PROHIBICION", label: "Prohibición" },
  { value: "OBLIGACION", label: "Obligación" },
  { value: "ADVERTENCIA", label: "Advertencia" },
  { value: "EVACUACION", label: "Evacuación y emergencia" },
  { value: "CONTRA_INCENDIO", label: "Equipos contra incendio" },
];

const ESTADOS_SENAL: { value: SignStatus; label: string }[] = [
  { value: "BUENO", label: "En buen estado" },
  { value: "DETERIORADA", label: "Deteriorada" },
  { value: "FALTANTE", label: "Falta instalar" },
];

const PILL_SENAL: Record<SignStatus, string> = {
  BUENO: "pill-low",
  DETERIORADA: "pill-mid",
  FALTANTE: "pill-critical",
};

type Marca = Omit<RiskMarker, "id" | "kind_display">;

const nombreRiesgo = (kind: RiskKind) =>
  TIPOS_RIESGO.find((t) => t.value === kind)?.label ?? kind;

const SENAL_VACIA = { area: "", kind: "", description: "", location: "", status: "FALTANTE" };

/**
 * Mapa de riesgos por área y señalización. El supervisor publica el plano y ubica los riesgos
 * haciendo clic sobre él; todos pueden consultarlo y descargarlo.
 */
export default function RiskMapPage() {
  const { canManage } = useAuth();
  const queryClient = useQueryClient();

  const [areaId, setAreaId] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [nuevo, setNuevo] = useState<{ area: string; title: string; plan: File | null }>({
    area: "",
    title: "",
    plan: null,
  });
  const [editando, setEditando] = useState(false);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [pendiente, setPendiente] = useState<{ x: string; y: string } | null>(null);
  const [marca, setMarca] = useState({ kind: "", label: "" });
  const [senalModal, setSenalModal] = useState<SafetySign | "nueva" | null>(null);
  const [senal, setSenal] = useState(SENAL_VACIA);

  const listaAreas = useQuery({ queryKey: ["areas"], queryFn: areas.list });
  const vigentes = useQuery({
    queryKey: ["risk-maps", "current"],
    queryFn: () => riskMaps.list({ current: true }),
  });
  const historicos = useQuery({
    queryKey: ["risk-maps", "area", areaId],
    queryFn: () => riskMaps.list({ area: areaId }),
    enabled: !!areaId,
  });
  const inventario = useQuery({
    queryKey: ["signs"],
    queryFn: () => signs.list(),
    enabled: canManage,
  });
  const resumen = useQuery({ queryKey: ["signs-summary"], queryFn: signs.summary, enabled: canManage });

  const mapas = useMemo(() => vigentes.data ?? [], [vigentes.data]);
  const mapa = mapas.find((m) => String(m.area) === areaId) ?? null;

  // Al abrir la pantalla se muestra el primer mapa publicado, para no dejarla en blanco.
  useEffect(() => {
    if (!areaId && mapas.length) setAreaId(String(mapas[0].area));
  }, [areaId, mapas]);

  useEffect(() => {
    setEditando(false);
    setPendiente(null);
    setMarcas(
      (mapa?.markers ?? []).map(({ kind, label, x, y }) => ({ kind, label, x, y })),
    );
  }, [mapa]);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["risk-maps"] });
    queryClient.invalidateQueries({ queryKey: ["signs"] });
    queryClient.invalidateQueries({ queryKey: ["signs-summary"] });
  };

  const publicar = useMutation({
    mutationFn: () => {
      const datos = new FormData();
      datos.append("area", nuevo.area);
      datos.append("title", nuevo.title);
      if (nuevo.plan) datos.append("plan", nuevo.plan);
      return riskMaps.publish(datos);
    },
    onSuccess: (publicado) => {
      invalidar();
      setPublicando(false);
      setAreaId(String(publicado.area));
      setNuevo({ area: "", title: "", plan: null });
    },
  });

  const guardarMarcas = useMutation({
    mutationFn: () => riskMaps.saveMarkers(mapa!.id, marcas),
    onSuccess: () => {
      invalidar();
      setEditando(false);
    },
  });

  const guardarSenal = useMutation({
    mutationFn: () => {
      const datos = {
        area: Number(senal.area),
        kind: senal.kind,
        description: senal.description,
        location: senal.location,
        status: senal.status,
        last_checked_on: new Date().toLocaleDateString("en-CA"),
      };
      return senalModal && senalModal !== "nueva"
        ? signs.update(senalModal.id, datos)
        : signs.create(datos);
    },
    onSuccess: () => {
      invalidar();
      setSenalModal(null);
      setSenal(SENAL_VACIA);
    },
  });

  const quitarSenal = useMutation({ mutationFn: signs.remove, onSuccess: invalidar });

  const ubicar = (e: MouseEvent<HTMLDivElement>) => {
    if (!editando) return;
    const caja = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - caja.left) / caja.width) * 100).toFixed(2);
    const y = (((e.clientY - caja.top) / caja.height) * 100).toFixed(2);
    setPendiente({ x, y });
    setMarca({ kind: "", label: "" });
  };

  const opcionesAreas = (listaAreas.data ?? []).map((a) => ({ value: a.id, label: a.name }));
  const anteriores = (historicos.data ?? []).filter((m) => !m.is_current);

  return (
    <>
      <header className="page-head row">
        <div>
          <h1>Mapa de riesgos</h1>
          <p className="muted">
            {mapas.length} de {listaAreas.data?.length ?? 0} áreas con mapa publicado
          </p>
        </div>
        {canManage && (
          <div className="actions">
            <button type="button" onClick={() => setPublicando(true)}>
              Publicar mapa
            </button>
          </div>
        )}
      </header>

      <section className="card">
        <div className="filters">
          <Field label="Área">
            <Select
              value={areaId}
              onChange={setAreaId}
              options={opcionesAreas}
              placeholder="Elegir área…"
            />
          </Field>
          {mapa && (
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => window.open(mapa.plan, "_blank", "noopener")}
              >
                Descargar plano
              </button>
              {canManage && !editando && (
                <button type="button" className="secondary" onClick={() => setEditando(true)}>
                  Ubicar riesgos
                </button>
              )}
              {editando && (
                <>
                  <button
                    type="button"
                    onClick={() => guardarMarcas.mutate()}
                    disabled={guardarMarcas.isPending}
                  >
                    Guardar riesgos
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setEditando(false);
                      setPendiente(null);
                      setMarcas(
                        mapa.markers.map(({ kind, label, x, y }) => ({ kind, label, x, y })),
                      );
                    }}
                  >
                    Descartar cambios
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {areaId && !mapa && (
          <p className="muted">Esta área todavía no tiene un mapa de riesgos publicado.</p>
        )}

        {mapa && (
          <>
            <h2>
              {mapa.title} <span className="muted small">· publicado el{" "}
              {new Date(mapa.published_at).toLocaleDateString("es-PE")}
              {mapa.published_by_name && ` por ${mapa.published_by_name}`}</span>
            </h2>
            {editando && (
              <p className="muted small">
                Haz clic sobre el plano donde está el peligro para señalarlo.
              </p>
            )}
            <div className="mapa-riesgos">
              <div
                className={`mapa-lienzo${editando ? " editando" : ""}`}
                onClick={ubicar}
                role="presentation"
              >
                <img src={mapa.plan} alt={`Plano de ${mapa.area_name}`} />
                {marcas.map((m, i) => (
                  <span
                    key={`${m.x}-${m.y}-${i}`}
                    className="mapa-marca"
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                    title={`${nombreRiesgo(m.kind)}: ${m.label}`}
                  >
                    {i + 1}
                  </span>
                ))}
                {pendiente && (
                  <span
                    className="mapa-marca pendiente"
                    style={{ left: `${pendiente.x}%`, top: `${pendiente.y}%` }}
                  >
                    ?
                  </span>
                )}
              </div>
              <ol className="mapa-leyenda">
                {marcas.map((m, i) => (
                  <li key={`${m.x}-${m.y}-${i}`}>
                    <strong>{nombreRiesgo(m.kind)}</strong>: {m.label}
                    {editando && (
                      <button
                        type="button"
                        className="link"
                        onClick={() => setMarcas(marcas.filter((_, j) => j !== i))}
                      >
                        Quitar
                      </button>
                    )}
                  </li>
                ))}
                {!marcas.length && <li className="muted">Sin riesgos señalados.</li>}
              </ol>
            </div>
            <ErrorBox error={guardarMarcas.error} />
            {canManage && anteriores.length > 0 && (
              <p className="muted small">
                Versiones anteriores:{" "}
                {anteriores.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && ", "}
                    <a href={m.plan} target="_blank" rel="noreferrer">
                      {m.title} ({new Date(m.published_at).toLocaleDateString("es-PE")})
                    </a>
                  </span>
                ))}
              </p>
            )}
          </>
        )}
      </section>

      {canManage && (
        <section className="card">
          <header className="card-head">
            <h2>Señalización de seguridad</h2>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSenal({ ...SENAL_VACIA, area: areaId });
                setSenalModal("nueva");
              }}
            >
              Agregar señal
            </button>
          </header>
          <table>
            <thead>
              <tr>
                <th>Área</th>
                <th>Debería haber</th>
                <th>Instaladas</th>
                <th>Observadas</th>
              </tr>
            </thead>
            <tbody>
              {resumen.data?.map((r) => (
                <tr key={r.area} className={r.observed ? "fila-alerta" : undefined}>
                  <td>{r.area_name}</td>
                  <td>{r.expected}</td>
                  <td>{r.installed}</td>
                  <td>{r.observed}</td>
                </tr>
              ))}
              {!resumen.data?.length && (
                <tr>
                  <td colSpan={4} className="muted">
                    Todavía no hay señales en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Tipo</th>
                  <th>Señal</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Revisada</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inventario.data?.map((s) => (
                  <tr key={s.id}>
                    <td>{s.area_name}</td>
                    <td>{s.kind_display}</td>
                    <td>{s.description}</td>
                    <td>{s.location || "—"}</td>
                    <td>
                      <span className={`pill ${PILL_SENAL[s.status]}`}>{s.status_display}</span>
                    </td>
                    <td>
                      {s.last_checked_on
                        ? new Date(`${s.last_checked_on}T00:00:00`).toLocaleDateString("es-PE")
                        : "—"}
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="link"
                        onClick={() => {
                          setSenal({
                            area: String(s.area),
                            kind: s.kind,
                            description: s.description,
                            location: s.location,
                            status: s.status,
                          });
                          setSenalModal(s);
                        }}
                      >
                        Revisar
                      </button>
                      <button
                        type="button"
                        className="link"
                        onClick={() => quitarSenal.mutate(s.id)}
                        disabled={quitarSenal.isPending}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {publicando && (
        <Modal title="Publicar mapa de riesgos" onClose={() => setPublicando(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              publicar.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Área" required>
                <Select
                  value={nuevo.area}
                  onChange={(v) => setNuevo({ ...nuevo, area: v })}
                  options={opcionesAreas}
                  required
                />
              </Field>
              <Field label="Título" required>
                <input
                  value={nuevo.title}
                  onChange={(e) => setNuevo({ ...nuevo, title: e.target.value })}
                  placeholder="Mapa de riesgos del almacén, rev. 2026"
                  required
                />
              </Field>
              <Field label="Plano" required hint="Imagen del plano del área (PNG o JPG).">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNuevo({ ...nuevo, plan: e.target.files?.[0] ?? null })}
                  required
                />
              </Field>
            </div>
            <p className="muted small">
              Si el área ya tenía un mapa, el nuevo queda vigente y el anterior se conserva como
              histórico.
            </p>
            <ErrorBox error={publicar.error} />
            <div className="actions">
              <button type="submit" disabled={publicar.isPending}>
                Publicar
              </button>
              <button type="button" className="link" onClick={() => setPublicando(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendiente && (
        <Modal title="Señalar riesgo" onClose={() => setPendiente(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMarcas([...marcas, { kind: marca.kind as RiskKind, label: marca.label, ...pendiente }]);
              setPendiente(null);
            }}
          >
            <div className="form-grid">
              <Field label="Tipo de riesgo" required>
                <Select
                  value={marca.kind}
                  onChange={(v) => setMarca({ ...marca, kind: v })}
                  options={TIPOS_RIESGO}
                  required
                />
              </Field>
              <Field label="Descripción" required>
                <input
                  value={marca.label}
                  onChange={(e) => setMarca({ ...marca, label: e.target.value })}
                  placeholder="Tablero eléctrico sin tapa"
                  maxLength={200}
                  required
                />
              </Field>
            </div>
            <div className="actions">
              <button type="submit">Agregar</button>
              <button type="button" className="link" onClick={() => setPendiente(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {senalModal && (
        <Modal
          title={senalModal === "nueva" ? "Agregar señal al inventario" : "Revisar señal"}
          onClose={() => setSenalModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guardarSenal.mutate();
            }}
          >
            <div className="form-grid">
              <Field label="Área" required>
                <Select
                  value={senal.area}
                  onChange={(v) => setSenal({ ...senal, area: v })}
                  options={opcionesAreas}
                  required
                />
              </Field>
              <Field label="Tipo" required>
                <Select
                  value={senal.kind}
                  onChange={(v) => setSenal({ ...senal, kind: v })}
                  options={TIPOS_SENAL}
                  required
                />
              </Field>
              <Field label="Señal" required>
                <input
                  value={senal.description}
                  onChange={(e) => setSenal({ ...senal, description: e.target.value })}
                  placeholder="Uso obligatorio de casco"
                  required
                />
              </Field>
              <Field label="Ubicación">
                <input
                  value={senal.location}
                  onChange={(e) => setSenal({ ...senal, location: e.target.value })}
                  placeholder="Puerta de ingreso"
                />
              </Field>
              <Field label="Estado" required>
                <Select
                  value={senal.status}
                  onChange={(v) => setSenal({ ...senal, status: v })}
                  options={ESTADOS_SENAL}
                  required
                />
              </Field>
            </div>
            <p className="muted small">Al guardar, la fecha de revisión queda como hoy.</p>
            <ErrorBox error={guardarSenal.error} />
            <div className="actions">
              <button type="submit" disabled={guardarSenal.isPending}>
                Guardar
              </button>
              <button type="button" className="link" onClick={() => setSenalModal(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
