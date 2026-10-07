import { Link } from "react-router-dom";

/**
 * Bifurcación del registro: empresa o trabajador.
 *
 * Son dos altas distintas y conviene separarlas antes de pedir un solo dato. Quien
 * registra la empresa la crea y queda como administrador; el trabajador se suma a una
 * empresa que ya existe usando su RUC. Un formulario único obligaría a mostrar campos
 * que la mitad de los visitantes no debe llenar.
 */
export default function RegisterChoicePage() {
  return (
    <div className="login-shell">
      <main className="card choice-card">
        <h1>Resguardo</h1>
        <p className="muted small">Sistema de Gestión de Seguridad y Salud en el Trabajo</p>

        <h2 id="choice-title" className="choice-title">
          ¿Cómo quieres registrarte?
        </h2>

        <div className="choice-grid" role="group" aria-labelledby="choice-title">
          <Link to="/registro/empresa" className="choice-option" aria-describedby="choice-empresa">
            <span className="choice-tag">Empresa</span>
            <strong>Registrar mi empresa</strong>
            <span id="choice-empresa" className="muted small">
              Mi empresa todavía no está en Resguardo. La doy de alta con su RUC y quedo como
              administrador para crear las áreas y las cuentas de supervisor y de comité.
            </span>
          </Link>

          <Link
            to="/registro/trabajador"
            className="choice-option"
            aria-describedby="choice-trabajador"
          >
            <span className="choice-tag">Trabajador</span>
            <strong>Soy trabajador de una empresa</strong>
            <span id="choice-trabajador" className="muted small">
              Mi empresa ya usa Resguardo. Me sumo con el RUC que me da mi supervisor de SST y
              entro como operario para reportar actos y condiciones inseguras.
            </span>
          </Link>
        </div>

        <Link to="/login" className="small">
          Ya tengo cuenta
        </Link>

        <p className="login-legal">Ley N° 29783 · Reglamento D.S. N° 005-2012-TR</p>
      </main>
    </div>
  );
}
