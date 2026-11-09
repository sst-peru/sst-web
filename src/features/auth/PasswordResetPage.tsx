import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { auth } from "../../api/endpoints";
import { extraerMensaje } from "../../components/Form";
import MarcaAcceso from "./MarcaAcceso";

/** Paso 1: pedir el enlace por correo. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await auth.requestPasswordReset(email);
      setEnviado(true);
    } catch (e) {
      setError(extraerMensaje(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={enviar}>
        <MarcaAcceso subtitulo="Recupera el acceso a tu cuenta" />
        {enviado ? (
          <p>
            Si hay una cuenta con ese correo, te enviamos un enlace para elegir una contraseña
            nueva. Revisa tu bandeja de entrada y la de spam; el enlace vale 24 horas.
          </p>
        ) : (
          <>
            <label htmlFor="email" className="field-label">
              Correo de tu cuenta
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviarme el enlace"}
            </button>
          </>
        )}
        <Link to="/login" className="small">
          Volver a iniciar sesión
        </Link>
      </form>
    </div>
  );
}

/** Paso 2: elegir la contraseña nueva desde el enlace del correo. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [clave, setClave] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (clave !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setGuardando(true);
    try {
      await auth.confirmPasswordReset(uid, token, clave);
      navigate("/login", { replace: true });
    } catch (e) {
      setError(extraerMensaje(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={guardar}>
        <MarcaAcceso subtitulo="Elige tu contraseña nueva" />
        {!uid || !token ? (
          <p className="error">El enlace está incompleto. Solicita uno nuevo.</p>
        ) : (
          <>
            <label htmlFor="clave" className="field-label">
              Contraseña nueva
            </label>
            <input
              id="clave"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <label htmlFor="confirmacion" className="field-label">
              Repite la contraseña
            </label>
            <input
              id="confirmacion"
              type="password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar contraseña"}
            </button>
          </>
        )}
        <Link to="/recuperar" className="small">
          Solicitar otro enlace
        </Link>
      </form>
    </div>
  );
}
