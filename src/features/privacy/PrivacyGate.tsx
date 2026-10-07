import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

import { privacy } from "../../api/endpoints";
import { ErrorBox } from "../../components/Form";
import { useAuth } from "../auth/AuthContext";
import { POLITICA_SECCIONES, POLITICA_VERSION } from "./politica";

/**
 * Pide el consentimiento informado antes de dejar usar la aplicacion.
 *
 * La Ley N° 29733 exige que el consentimiento sea previo e informado. «Previo» es la razon
 * de que esto sea una puerta y no un aviso que se pueda ignorar: si se pudiera reportar
 * antes de aceptar, el dato ya estaria recogido. «Informado» es la razon de que el texto se
 * muestre completo en vez de un enlace, y de que la casilla arranque desmarcada.
 */
export default function PrivacyGate({ children }: { children: ReactNode }) {
  const { user, refreshUser, logout } = useAuth();
  const [marcada, setMarcada] = useState(false);

  const aceptar = useMutation({
    mutationFn: () => privacy.accept(POLITICA_VERSION),
    onSuccess: () => refreshUser(),
  });

  if (!user || user.has_accepted_privacy_policy) return <>{children}</>;

  return (
    <div className="login-shell">
      <main className="card politica-card">
        <h1>Resguardo</h1>
        <p className="muted small">
          Política de privacidad · versión {POLITICA_VERSION} · Ley N° 29733
        </p>

        <p>
          Antes de empezar necesitamos tu autorización para tratar tus datos personales.
          Léela: puedes retirarla después cuando quieras.
        </p>

        <div className="politica-texto">
          {POLITICA_SECCIONES.map((seccion) => (
            <section key={seccion.titulo}>
              <h2>{seccion.titulo}</h2>
              <p>{seccion.cuerpo}</p>
            </section>
          ))}
        </div>

        <label className="field-inline">
          <input
            type="checkbox"
            checked={marcada}
            onChange={(e) => setMarcada(e.target.checked)}
          />
          <span>
            He leído la política de privacidad y autorizo el tratamiento de mis datos
            personales para operar el Sistema de Gestión de SST de mi empresa.
          </span>
        </label>

        <ErrorBox error={aceptar.error} />

        <div className="actions">
          <button
            type="button"
            onClick={() => aceptar.mutate()}
            disabled={!marcada || aceptar.isPending}
          >
            {aceptar.isPending ? "Guardando…" : "Autorizo"}
          </button>
          <button type="button" className="link" onClick={logout}>
            No autorizo, cerrar sesión
          </button>
        </div>
      </main>
    </div>
  );
}
