import { useQuery } from "@tanstack/react-query";

import { api } from "../../api/client";

interface IpercEntry {
  id: number;
  area_name: string;
  job_position: string;
  hazard: string;
  risk: string;
  risk_score: number;
  risk_level: string;
  existing_controls: string;
  source_report: number | null;
}

const LEVEL_CLASS: Record<string, string> = {
  TRIVIAL: "pill pill-low",
  TOLERABLE: "pill pill-low",
  MODERADO: "pill pill-mid",
  IMPORTANTE: "pill pill-high",
  INTOLERABLE: "pill pill-critical",
};

export default function IpercPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["iperc-entries"],
    queryFn: () =>
      api
        .get<{ results: IpercEntry[] }>("/iperc/entries/")
        .then((response) => response.data.results),
  });

  return (
    <>
      <header className="page-head">
        <h1>Matriz IPERC</h1>
        <p className="muted">
          Identificación de peligros, evaluación de riesgos y controles. Las filas con origen en un
          reporte vienen del campo, no de una revisión de escritorio.
        </p>
      </header>

      <section className="card">
        {isLoading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Área</th>
                <th>Puesto / tarea</th>
                <th>Peligro</th>
                <th>Riesgo</th>
                <th>Nivel</th>
                <th>Controles</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.area_name}</td>
                  <td>{entry.job_position}</td>
                  <td>{entry.hazard}</td>
                  <td>{entry.risk}</td>
                  <td>
                    <span className={LEVEL_CLASS[entry.risk_level] ?? "pill"}>
                      {entry.risk_level} ({entry.risk_score})
                    </span>
                  </td>
                  <td>{entry.existing_controls || "—"}</td>
                  <td>{entry.source_report ? `Reporte #${entry.source_report}` : "Manual"}</td>
                </tr>
              ))}
              {!data?.length && (
                <tr>
                  <td colSpan={7} className="muted">
                    La matriz está vacía. Crea una versión y agrega entradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
