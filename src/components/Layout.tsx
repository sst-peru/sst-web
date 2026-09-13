import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../features/auth/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  OPERARIO: "Operario",
  SUPERVISOR: "Supervisor de SST",
  COMITE: "Comité de SST",
  ADMIN: "Administrador",
};

/**
 * Menú por rol. El operario ve lo que puede hacer él; el supervisor y el comité ven todo.
 * La app móvil muestra exactamente las mismas opciones para el mismo rol: eso es la paridad.
 */
const NAV: { to: string; label: string; managerOnly?: boolean; end?: boolean }[] = [
  { to: "/", label: "Tablero", managerOnly: true, end: true },
  { to: "/reportes/nuevo", label: "Reportar" },
  { to: "/reportes", label: "Reportes", end: true },
  { to: "/iperc", label: "Matriz IPERC" },
  { to: "/inspecciones", label: "Inspecciones" },
  { to: "/epp", label: "Equipos de protección" },
  { to: "/comite", label: "Comité de SST" },
  { to: "/experimento", label: "Experimento A/B", managerOnly: true },
  { to: "/usuarios", label: "Usuarios y áreas", managerOnly: true },
];

const HOY = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function Layout() {
  const { user, logout, canManage } = useAuth();
  const visibles = NAV.filter((item) => !item.managerOnly || canManage);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">Resguardo</div>
          <div className="brand-tagline">
            Sistema de Gestión de
            <br />
            Seguridad y Salud en el Trabajo
          </div>
        </div>

        <nav>
          {visibles.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-name">{user?.first_name || user?.username}</div>
          <div className="muted">{ROLE_LABEL[user?.role ?? ""] ?? ""}</div>
          <button type="button" className="link" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="company">
            {user?.company_name ?? "—"} <span>· Unidad de Seguridad y Salud en el Trabajo</span>
          </div>
          <div className="meta">{HOY.format(new Date())}</div>
        </header>

        <div className="page">
          <Outlet />
        </div>

        <footer className="page-foot">
          <span>
            Resguardo · Sistema de Gestión de SST conforme a la Ley N° 29783 y su Reglamento
            (D.S. N° 005-2012-TR)
          </span>
          <span>{user?.company_name ?? ""}</span>
        </footer>
      </main>
    </div>
  );
}
