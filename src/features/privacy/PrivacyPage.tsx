import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { privacy } from "../../api/endpoints";
import { ErrorBox } from "../../components/Form";
import { useAuth } from "../auth/AuthContext";
import { POLITICA_SECCIONES, POLITICA_VERSION } from "./politica";

const FUENTE: Record<string, string> = { WEB: "Panel web", ANDROID: "Aplicación Android" };

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }) : "—";

/** Centro de privacidad: ubicación, consentimiento y su historial. */
export default function PrivacyPage() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  const estado = useQuery({ queryKey: ["privacy"], queryFn: privacy.state });

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: ["privacy"] });
    await refreshUser();
  };

  const ubicacion = useMutation({
    mutationFn: (valor: boolean) => privacy.setLocationSharing(valor),
    onSuccess: refrescar,
  });

  const revocar = useMutation({ mutationFn: privacy.revoke, onSuccess: refrescar });

  return (
    <>
      <header className="page-head">
        <h1>Privacidad y datos personales</h1>
        <p className="muted">
          Ley N° 29733 de Protección de Datos Personales · política versión {POLITICA_VERSION}
        </p>
      </header>

      <section className="card">
        <h2>Ubicación de los hallazgos</h2>
        <p className="muted small">
          Cuando está encendida, el reporte guarda dónde ocurrió el hallazgo, lo que permite
          ubicarlo en obra. Puedes apagarla y seguir reportando igual: desde ese momento el
          servidor deja de guardarla, aunque la aplicación la envíe.
        </p>
        <label className="field-inline">
          <input
            type="checkbox"
            checked={estado.data?.location_sharing ?? false}
            disabled={ubicacion.isPending || !estado.data}
            onChange={(e) => ubicacion.mutate(e.target.checked)}
          />
          <span>Compartir la ubicación al reportar un hallazgo</span>
        </label>
        <ErrorBox error={ubicacion.error} />
      </section>

      <section className="card">
        <h2>Tu consentimiento</h2>
        {estado.data?.accepted ? (
          <p className="small">
            Autorizado el {fecha(estado.data.granted_at)} para la versión{" "}
            {estado.data.policy_version} de la política.
          </p>
        ) : (
          <p className="small">No hay un consentimiento vigente.</p>
        )}
        <p className="muted small">
          Retirarlo es tan simple como darlo. Al retirarlo se apaga también la ubicación y
          la aplicación volverá a pedirte la autorización para poder seguir usándose. Los
          registros de seguridad que la Ley N° 29783 obliga a conservar no se eliminan, pero
          dejan de usarse para cualquier otro fin.
        </p>
        <ErrorBox error={revocar.error} />
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => revocar.mutate()}
            disabled={!estado.data?.accepted || revocar.isPending}
          >
            Retirar mi consentimiento
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Historial</h2>
        <p className="muted small">
          Queda registrado cuándo diste y cuándo retiraste la autorización: es lo que
          permite demostrarlo.
        </p>
        <table>
          <thead>
            <tr>
              <th>Versión</th>
              <th>Otorgado</th>
              <th>Retirado</th>
              <th>Desde</th>
            </tr>
          </thead>
          <tbody>
            {(estado.data?.history ?? []).map((registro) => (
              <tr key={registro.id}>
                <td>{registro.policy_version}</td>
                <td>{fecha(registro.granted_at)}</td>
                <td>{fecha(registro.revoked_at)}</td>
                <td>{FUENTE[registro.source] ?? registro.source}</td>
              </tr>
            ))}
            {estado.data?.history.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Sin registros todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Qué dice la política</h2>
        {POLITICA_SECCIONES.map((seccion) => (
          <div key={seccion.titulo}>
            <h3>{seccion.titulo}</h3>
            <p className="small">{seccion.cuerpo}</p>
          </div>
        ))}
      </section>
    </>
  );
}
