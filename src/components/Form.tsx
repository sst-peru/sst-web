/** Controles de formulario reutilizables, para no repetir label + input en cada pantalla. */
import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}

export function Field({ label, children, hint, required }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="required"> *</span>}
      </span>
      {children}
      {hint && <span className="muted small">{hint}</span>}
    </label>
  );
}

interface SelectProps {
  value: string | number | "";
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  required,
  disabled,
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const detalle = extraerMensaje(error);
  return <p className="error">{detalle}</p>;
}

/** Convierte el cuerpo de error de DRF en algo legible para el usuario. */
export function extraerMensaje(error: unknown): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data) return "Ocurrió un error. Revisa la conexión con el servidor.";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(" ");
  return Object.entries(data as Record<string, unknown>)
    .map(([campo, mensajes]) => {
      const texto = Array.isArray(mensajes) ? mensajes.join(" ") : String(mensajes);
      return campo === "detail" ? texto : `${campo}: ${texto}`;
    })
    .join(" · ");
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="link" onClick={onClose}>
            Cerrar
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
