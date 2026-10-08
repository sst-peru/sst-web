import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { auth } from "../../api/endpoints";
import { ErrorBox, Field } from "../../components/Form";
import MarcaAcceso from "./MarcaAcceso";
import { useAuth } from "./AuthContext";

/**
 * Registro de una empresa nueva y de la cuenta de su administrador.
 *
 * Es el primer eslabón: sin empresa registrada, sus trabajadores no tienen a qué RUC
 * sumarse desde /registro/trabajador. Quien completa este formulario queda como ADMIN,
 * porque es el único que puede crear las áreas y las cuentas de supervisor y de comité
 * antes de que exista cualquier otro usuario.
 */
export default function RegisterCompanyPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    ruc: "",
    address: "",
    worker_count: "",
    first_name: "",
    last_name: "",
    dni: "",
    phone: "",
    username: "",
    email: "",
    password: "",
    password_confirm: "",
  });

  const set = (campo: keyof typeof form) => (valor: string) =>
    setForm((previo) => ({ ...previo, [campo]: valor }));

  const trabajadores = Number(form.worker_count);
  // La ley pide comité paritario desde 20 trabajadores; por debajo basta un supervisor.
  const exigeComite = Number.isFinite(trabajadores) && trabajadores >= 20;

  const registrar = useMutation({
    mutationFn: () =>
      auth.registerCompany({ ...form, worker_count: Number(form.worker_count) }),
    onSuccess: async () => {
      // Entramos directo: la cuenta acaba de crearse con esta misma contraseña.
      await login(form.username, form.password);
      navigate("/");
    },
  });

  return (
    <div className="login-shell">
      <form
        className="card register-card"
        onSubmit={(e) => {
          e.preventDefault();
          registrar.mutate();
        }}
      >
        <MarcaAcceso subtitulo="Registro de empresa · Sistema de Gestión de SST" />

        <div className="form-grid">
          <h2>Datos de la empresa</h2>
          <Field label="Razón social" required>
            <input
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              maxLength={200}
              required
            />
          </Field>
          <Field label="RUC" required hint="11 dígitos.">
            <input
              value={form.ruc}
              onChange={(e) => set("ruc")(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={11}
              minLength={11}
              required
            />
          </Field>
          <Field label="Dirección">
            <input
              value={form.address}
              onChange={(e) => set("address")(e.target.value)}
              maxLength={255}
            />
          </Field>
          <Field
            label="Número de trabajadores"
            required
            hint={
              form.worker_count === ""
                ? "Sin contarte. Es el número de cuentas que podrán registrarse con tu RUC."
                : exigeComite
                  ? `${trabajadores} cuentas podrán registrarse con tu RUC. Con 20 o más, la ley exige comité paritario de SST.`
                  : `${trabajadores} cuenta${trabajadores === 1 ? "" : "s"} podrá${trabajadores === 1 ? "" : "n"} registrarse con tu RUC. Con menos de 20, la ley permite un supervisor de SST.`
            }
          >
            <input
              type="number"
              min={1}
              value={form.worker_count}
              onChange={(e) => set("worker_count")(e.target.value)}
              required
            />
          </Field>

          <h2>Tu cuenta de administrador</h2>
          <Field label="Nombres" required>
            <input
              value={form.first_name}
              onChange={(e) => set("first_name")(e.target.value)}
              required
            />
          </Field>
          <Field label="Apellidos" required>
            <input
              value={form.last_name}
              onChange={(e) => set("last_name")(e.target.value)}
              required
            />
          </Field>
          <Field label="DNI">
            <input
              value={form.dni}
              onChange={(e) => set("dni")(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={8}
            />
          </Field>
          <Field label="Teléfono">
            <input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
          </Field>
          <Field label="Usuario" required>
            <input
              value={form.username}
              onChange={(e) => set("username")(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Correo">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
            />
          </Field>
          <Field label="Contraseña" required>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password")(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Repetir contraseña" required>
            <input
              type="password"
              value={form.password_confirm}
              onChange={(e) => set("password_confirm")(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
        </div>

        <ErrorBox error={registrar.error} />

        <button type="submit" disabled={registrar.isPending}>
          {registrar.isPending ? "Registrando empresa…" : "Registrar empresa"}
        </button>

        <p className="muted small">
          Quedarás como <strong>administrador</strong> de la empresa y tu cuenta no ocupa
          ninguna de las plazas declaradas. Después podrás crear las áreas, dar de alta
          supervisores y miembros del comité, y cambiar el número de trabajadores cuando
          entre más gente.
        </p>
        <Link to="/registro" className="small">
          Volver
        </Link>

        <p className="login-legal">Ley N° 29783 · Reglamento D.S. N° 005-2012-TR</p>
      </form>
    </div>
  );
}
