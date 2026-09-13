import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { areas, categories, experiments, reports } from "../../api/endpoints";
import { ErrorBox, Field, Select } from "../../components/Form";
import type { ReportKind, Severity } from "../../api/types";

const SEVERIDADES: { value: Severity; label: string }[] = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

interface Borrador {
  kind: ReportKind;
  category: string;
  area: string;
  description: string;
  severity: Severity;
  photo: File | null;
  latitude: number | null;
  longitude: number | null;
}

const BORRADOR_VACIO: Borrador = {
  kind: "CONDICION",
  category: "",
  area: "",
  description: "",
  severity: "MEDIA",
  photo: null,
  latitude: null,
  longitude: null,
};

/**
 * Reportar desde la web. Misma funcionalidad que en el celular, mismo endpoint.
 *
 * El experimento A/B también aplica acá: si el usuario cayó en la variante "largo" ve el
 * formulario tradicional. Si solo se midiera en el móvil, los reportes hechos desde la web
 * entrarían sin variante y ensuciarían la comparación.
 */
export default function NewReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [paso, setPaso] = useState(1);

  const variante = useQuery({
    queryKey: ["my-variant"],
    queryFn: () => experiments.myVariant(),
    retry: false,
  });
  const listaAreas = useQuery({ queryKey: ["areas"], queryFn: areas.list });
  const listaCategorias = useQuery({ queryKey: ["categories"], queryFn: categories.list });

  const set = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) =>
    setBorrador((previo) => ({ ...previo, [campo]: valor }));

  const crear = useMutation({
    mutationFn: () => {
      // FormData porque va una foto: el API acepta multipart igual que desde el celular.
      const datos = new FormData();
      datos.append("kind", borrador.kind);
      datos.append("severity", borrador.severity);
      datos.append("description", borrador.description);
      datos.append("form_variant", variante.data?.variant ?? "");
      datos.append("occurred_at", new Date().toISOString());
      if (borrador.area) datos.append("area", borrador.area);
      if (borrador.category) datos.append("category", borrador.category);
      if (borrador.photo) datos.append("photo", borrador.photo);
      if (borrador.latitude !== null) datos.append("latitude", String(borrador.latitude));
      if (borrador.longitude !== null) datos.append("longitude", String(borrador.longitude));
      return reports.create(datos);
    },
    onSuccess: (reporte) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      navigate(`/reportes/${reporte.id}`);
    },
  });

  function ubicar() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        set("latitude", posicion.coords.latitude);
        set("longitude", posicion.coords.longitude);
      },
      // Si el navegador la niega, el reporte se manda igual sin coordenadas.
      () => undefined,
      { timeout: 8000 },
    );
  }

  const opcionesAreas = (listaAreas.data ?? []).map((a) => ({ value: a.id, label: a.name }));
  const opcionesCategorias = (listaCategorias.data ?? [])
    .filter((c) => c.kind === borrador.kind)
    .map((c) => ({ value: c.id, label: c.name }));

  const esLargo = variante.data?.variant === "largo";

  return (
    <>
      <header className="page-head">
        <h1>Reportar acto o condición insegura</h1>
        <p className="muted">
          {esLargo
            ? "Complete todos los campos del formulario."
            : "Tres pasos: qué viste, de qué tipo, y evidencia."}
        </p>
      </header>

      <form
        className="card form-card"
        onSubmit={(e) => {
          e.preventDefault();
          crear.mutate();
        }}
      >
        {esLargo ? (
          // ----- Variante de control: formulario largo tradicional -----
          <div className="form-grid">
            <Field label="Tipo de reporte" required>
              <Select
                value={borrador.kind}
                onChange={(v) => {
                  set("kind", v as ReportKind);
                  set("category", "");
                }}
                options={[
                  { value: "CONDICION", label: "Condición insegura" },
                  { value: "ACTO", label: "Acto inseguro" },
                ]}
                placeholder="Seleccionar tipo"
                required
              />
            </Field>
            <Field label="Área" required>
              <Select value={borrador.area} onChange={(v) => set("area", v)} options={opcionesAreas} required />
            </Field>
            <Field label="Categoría del peligro" required>
              <Select
                value={borrador.category}
                onChange={(v) => set("category", v)}
                options={opcionesCategorias}
                required
              />
            </Field>
            <Field label="Severidad" required>
              <Select
                value={borrador.severity}
                onChange={(v) => set("severity", v as Severity)}
                options={SEVERIDADES.map((s) => ({ value: s.value, label: s.label }))}
                required
              />
            </Field>
            <Field label="Descripción detallada del hallazgo" required>
              <textarea
                rows={5}
                value={borrador.description}
                onChange={(e) => set("description", e.target.value)}
                required
              />
            </Field>
            <Field label="Evidencia fotográfica">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => set("photo", e.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="Ubicación">
              <button type="button" className="secondary" onClick={ubicar}>
                {borrador.latitude ? "Ubicación capturada" : "Capturar mi ubicación"}
              </button>
            </Field>
          </div>
        ) : (
          // ----- Variante rápida: un paso a la vez, nada obligatorio salvo el tipo -----
          <div className="wizard">
            <p className="muted small">Paso {paso} de 3</p>

            {paso === 1 && (
              <div className="choices">
                <h2>¿Qué viste?</h2>
                <button
                  type="button"
                  className="choice"
                  onClick={() => {
                    set("kind", "CONDICION");
                    set("category", "");
                    setPaso(2);
                  }}
                >
                  <strong>Una condición insegura</strong>
                  <span className="muted small">
                    Algo del ambiente: piso mojado, cable pelado, andamio roto
                  </span>
                </button>
                <button
                  type="button"
                  className="choice"
                  onClick={() => {
                    set("kind", "ACTO");
                    set("category", "");
                    setPaso(2);
                  }}
                >
                  <strong>Un acto inseguro</strong>
                  <span className="muted small">
                    Algo que alguien está haciendo mal: sin casco, sin arnés
                  </span>
                </button>
              </div>
            )}

            {paso === 2 && (
              <div className="choices">
                <h2>¿De qué tipo?</h2>
                {opcionesCategorias.map((opcion) => (
                  <button
                    key={opcion.value}
                    type="button"
                    className="choice"
                    onClick={() => {
                      set("category", String(opcion.value));
                      setPaso(3);
                    }}
                  >
                    <strong>{opcion.label}</strong>
                  </button>
                ))}
                <button type="button" className="link" onClick={() => setPaso(3)}>
                  No estoy seguro, continuar
                </button>
              </div>
            )}

            {paso === 3 && (
              <div className="form-grid">
                <h2>Evidencia y gravedad</h2>
                <Field label="Foto" hint="Es lo que permite al comité entender el peligro sin ir al lugar.">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      set("photo", e.target.files?.[0] ?? null);
                      ubicar();
                    }}
                  />
                </Field>
                <Field label="Área">
                  <Select value={borrador.area} onChange={(v) => set("area", v)} options={opcionesAreas} />
                </Field>
                <Field label="¿Qué tan grave es?">
                  <div className="pill-row">
                    {SEVERIDADES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className={borrador.severity === s.value ? "pill-button active" : "pill-button"}
                        onClick={() => set("severity", s.value)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Comentario" hint="Opcional.">
                  <textarea
                    rows={2}
                    value={borrador.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        <ErrorBox error={crear.error} />

        <div className="actions">
          {!esLargo && paso > 1 && (
            <button type="button" className="secondary" onClick={() => setPaso(paso - 1)}>
              Atrás
            </button>
          )}
          {(esLargo || paso === 3) && (
            <button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Enviando…" : "Enviar reporte"}
            </button>
          )}
          <button type="button" className="link" onClick={() => navigate("/reportes")}>
            Cancelar
          </button>
        </div>

        {variante.data && (
          <p className="muted small">
            Variante del experimento asignada a tu usuario: <strong>{variante.data.variant}</strong>
          </p>
        )}
      </form>
    </>
  );
}
