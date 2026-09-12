import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../features/auth/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  OPERARIO: "Operario",
  SUPERVISOR: "Supervisor de SST",
  COMITE: "Comité de SST",
  ADMIN: "Administrador",
};

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">SST</div>
        <nav>
          <NavLink to="/" end>
            Tablero
          </NavLink>
          <NavLink to="/reportes">Reportes</NavLink>
          <NavLink to="/iperc">Matriz IPERC</NavLink>
          <NavLink to="/inspecciones">Inspecciones</NavLink>
          <NavLink to="/experimento">Experimento A/B</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-name">{user?.first_name || user?.username}</div>
          <div className="muted small">{ROLE_LABEL[user?.role ?? ""] ?? ""}</div>
          <button type="button" className="link" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
