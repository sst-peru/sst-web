import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { auth } from "../../api/endpoints";
import { ErrorBox, Field } from "../../components/Form";
import { useAuth } from "./AuthContext";

/**
 * Registro de trabajadores. Mismo endpoint que usa la app móvil.
 *
 * Se pide el RUC de la empresa porque es el dato que el trabajador sí conoce (está en su
 * boleta y en el cartel de obra) y porque evita que alguien se registre en una empresa
 * ajena eligiéndola de una lista.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    username: "",
    email: "",
    phone: "",
    company_ruc: "",
    password: "",
    password_confirm: "",
  });

  const set = (campo: keyof typeof form) => (valor: string) =>
    setForm((previo) => ({ ...previo, [campo]: valor }));

  const registrar = useMutation({
    mutationFn: () => auth.register(form),
    onSuccess: async () => {
      // Entramos directo: pedirle al trabajador que vuelva a escribir su clave sobra.
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
        <h1>Crear cuenta</h1>
        <p className="muted">Sistema de Gestión de Seguridad y Salud en el Trabajo</p>

        <div className="form-grid">
          <Field label="Nombres" required>
            <input value={form.first_name} onChange={(e) => set("first_name")(e.target.value)} required />
          </Field>
          <Field label="Apellidos" required>
            <input value={form.last_name} onChange={(e) => set("last_name")(e.target.value)} required />
          </Field>
          <Field label="DNI">
            <input value={form.dni} onChange={(e) => set("dni")(e.target.value)} maxLength={8} />
          </Field>
          <Field label="Teléfono">
            <input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
          </Field>
          <Field label="RUC de la empresa" required hint="11 dígitos. Te lo da tu supervisor de SST.">
            <input
              value={form.company_ruc}
              onChange={(e) => set("company_ruc")(e.target.value)}
              maxLength={11}
              required
            />
          </Field>
          <Field label="Usuario" required>
            <input value={form.username} onChange={(e) => set("username")(e.target.value)} required />
          </Field>
          <Field label="Correo">
            <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
          </Field>
          <Field label="Contraseña" required>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password")(e.target.value)}
              required
            />
          </Field>
          <Field label="Repetir contraseña" required>
            <input
              type="password"
              value={form.password_confirm}
              onChange={(e) => set("password_confirm")(e.target.value)}
              required
            />
          </Field>
        </div>

        <ErrorBox error={registrar.error} />

        <button type="submit" disabled={registrar.isPending}>
          {registrar.isPending ? "Creando cuenta…" : "Crear cuenta"}
        </button>

        <p className="muted small">
          Las cuentas nuevas entran como <strong>operario</strong>. Si eres supervisor o miembro
          del comité, pide que te creen la cuenta desde el panel.
        </p>
        <Link to="/login" className="small">
          Ya tengo cuenta
        </Link>
      </form>
    </div>
  );
}
