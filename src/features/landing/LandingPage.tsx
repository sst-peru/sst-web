import { Link } from "react-router-dom";

import "../../styles/landing.css";

/**
 * Página pública. Es lo único del producto que ve alguien sin cuenta, así que dice
 * exactamente lo que el sistema hace hoy: nada de funcionalidades que estén en el backlog.
 */

// COMPLETAR: cifra de notificaciones de accidentes de trabajo del último boletín del MTPE,
// con su año. Mientras sea null, el bloque de la cifra no se muestra: es preferible no
// mostrar nada a mostrar un número sin fuente.
const CIFRA_MTPE: { valor: string; detalle: string; fuente: string } | null = null;

const CAPACIDADES = [
  {
    titulo: "Reporte en campo, en tres toques",
    texto:
      "El trabajador elige qué vio, dónde y adjunta una foto. El sistema guarda la hora real " +
      "y la ubicación. Si no hay señal, el reporte queda en el celular y se envía solo cuando " +
      "vuelve la cobertura, sin duplicarse.",
  },
  {
    titulo: "Seguimiento hasta el cierre",
    texto:
      "Cada hallazgo se asigna a un responsable y se cierra describiendo la acción correctiva " +
      "aplicada. Queda una bitácora de quién hizo qué y cuándo, que nadie redacta a mano.",
  },
  {
    titulo: "Evidencia en un clic",
    texto:
      "Los registros obligatorios se exportan a Excel con el formato que espera una " +
      "inspección. El expediente se arma con la operación diaria, no se reconstruye la " +
      "semana previa a la visita.",
  },
  {
    titulo: "Matriz IPERC versionada",
    texto:
      "Peligros, riesgos y controles por área y puesto, con nivel de riesgo calculado. Cada " +
      "versión queda archivada y una fila puede trazarse hasta el hallazgo de campo que la " +
      "originó.",
  },
  {
    titulo: "EPP e inspecciones",
    texto:
      "Catálogo, entregas con conformidad del trabajador y aviso de vencimiento por vida " +
      "útil. Programa de inspecciones con checklist, ejecución desde el celular y " +
      "cumplimiento por área.",
  },
  {
    titulo: "Comité de SST",
    texto:
      "Miembros, representación paritaria y periodo. Actas numeradas con agenda, asistencia, " +
      "control de quórum y acuerdos con responsable y plazo.",
  },
];

const CUMPLIMIENTO = [
  {
    obligacion: "Identificar peligros y evaluar riesgos",
    norma: "Ley N° 29783, art. 57",
    cobertura: "Matriz IPERC por área y puesto, versionada y con nivel de riesgo calculado",
  },
  {
    obligacion: "Entregar equipos de protección personal y dejar constancia",
    norma: "Ley N° 29783, art. 60",
    cobertura: "Registro de entrega con conformidad del trabajador y control de vencimiento",
  },
  {
    obligacion: "Realizar inspecciones internas de seguridad y salud",
    norma: "D.S. N° 005-2012-TR, art. 33",
    cobertura: "Programa por frecuencia, ejecución con checklist y tasa de cumplimiento",
  },
  {
    obligacion: "Constituir el comité de SST y levantar actas de sus reuniones",
    norma: "Ley N° 29783, art. 29",
    cobertura: "Comité paritario, verificación de quórum, actas numeradas y acuerdos con plazo",
  },
  {
    obligacion: "Exhibir los registros del sistema de gestión ante la autoridad",
    norma: "Ley N° 29783, art. 28",
    cobertura: "Exportación a Excel de cada registro, con su trazabilidad completa",
  },
];

const PLANES = [
  {
    nombre: "Esencial",
    para: "Empresas de menos de 20 trabajadores",
    incluye: [
      "Modo supervisor de SST, sin comité paritario",
      "Reportes, IPERC, EPP e inspecciones",
      "Exportación de registros a Excel",
    ],
  },
  {
    nombre: "Empresarial",
    para: "Empresas de 20 trabajadores a más",
    destacado: true,
    incluye: [
      "Todo lo del plan Esencial",
      "Comité paritario, actas y acuerdos",
      "Tablero de indicadores y MTTR por severidad",
    ],
  },
  {
    nombre: "Corporativo",
    para: "Operaciones con varias sedes o frentes",
    incluye: [
      "Todo lo del plan Empresarial",
      "Áreas y frentes de trabajo ilimitados",
      "Acompañamiento en la implementación",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="landing-brand-name">Resguardo</span>
            <span className="landing-brand-tag">Gestión de SST</span>
          </div>
          <nav className="landing-links">
            <a href="#problema">El problema</a>
            <a href="#producto">El sistema</a>
            <a href="#cumplimiento">Cumplimiento</a>
            <a href="#planes">Planes</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <Link to="/login" className="landing-btn landing-btn-ghost">
            Ingresar
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-wrap landing-hero-grid">
            <div>
              <p className="landing-eyebrow">Ley N° 29783 · D.S. N° 005-2012-TR</p>
              <h1>
                La gestión de seguridad y salud que se sostiene ante una inspección
              </h1>
              <p className="landing-lead">
                El trabajador reporta un acto o una condición insegura en tres toques desde el
                celular, con foto y ubicación, funcione o no la señal. El supervisor lo asigna,
                lo cierra y lo documenta. La evidencia queda hecha.
              </p>
              <div className="landing-cta">
                <a href="#contacto" className="landing-btn landing-btn-primary">
                  Solicitar una demostración
                </a>
                <Link to="/login" className="landing-btn landing-btn-outline">
                  Ya tengo cuenta
                </Link>
              </div>
              <p className="landing-note">
                Aplicación web para el supervisor y el comité, aplicación Android para el
                trabajador de campo. Las mismas capacidades en ambas.
              </p>
            </div>

            <aside className="landing-panel" aria-label="Recorrido del hallazgo">
              <p className="landing-panel-title">Recorrido de un hallazgo</p>
              <ol className="landing-steps">
                <li>
                  <span>1</span>
                  <div>
                    <strong>Se detecta</strong>
                    <p>El operario abre la app y elige acto o condición insegura.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Se registra</strong>
                    <p>Foto, área y ubicación. Sin señal, queda guardado en el equipo.</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Se asigna</strong>
                    <p>El supervisor lo prioriza por severidad y le pone responsable.</p>
                  </div>
                </li>
                <li>
                  <span>4</span>
                  <div>
                    <strong>Se cierra</strong>
                    <p>Con la acción correctiva aplicada y su fecha. El MTTR se calcula solo.</p>
                  </div>
                </li>
                <li>
                  <span>5</span>
                  <div>
                    <strong>Se documenta</strong>
                    <p>El registro se exporta a Excel con toda su trazabilidad.</p>
                  </div>
                </li>
              </ol>
            </aside>
          </div>
        </section>

        <section id="problema" className="landing-section landing-section-alt">
          <div className="landing-wrap">
            <h2>Lo que hoy se pierde entre el cuaderno y el correo</h2>
            <p className="landing-section-lead">
              La obligación legal existe desde 2011. Lo que falla no es la norma: es que el
              hallazgo viaja en papel, en un grupo de WhatsApp o en la memoria de quien lo vio.
            </p>

            {CIFRA_MTPE && (
              <div className="landing-figure">
                <strong>{CIFRA_MTPE.valor}</strong>
                <span>{CIFRA_MTPE.detalle}</span>
                <small>{CIFRA_MTPE.fuente}</small>
              </div>
            )}

            <div className="landing-cards landing-cards-3">
              <article className="landing-card">
                <h3>El reporte no llega</h3>
                <p>
                  Reportar exige un formato en papel, una oficina y tiempo que el operario no
                  tiene a media jornada. Lo que cuesta reportar no se reporta.
                </p>
              </article>
              <article className="landing-card">
                <h3>El peligro sigue ahí</h3>
                <p>
                  Sin responsable ni plazo explícitos, la corrección depende de quién insista
                  más, no de qué tan grave es. Nadie sabe cuánto tardó en cerrarse.
                </p>
              </article>
              <article className="landing-card">
                <h3>No hay cómo demostrarlo</h3>
                <p>
                  Cuando llega la inspección, el expediente se arma a las apuradas con fechas
                  que nadie puede sustentar. La gestión existió; la evidencia, no.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="producto" className="landing-section">
          <div className="landing-wrap">
            <h2>Lo que hace el sistema</h2>
            <p className="landing-section-lead">
              Seis capacidades, disponibles tanto en la aplicación web como en la aplicación
              Android para el rol que corresponda.
            </p>
            <div className="landing-cards landing-cards-3">
              {CAPACIDADES.map((c) => (
                <article className="landing-card" key={c.titulo}>
                  <h3>{c.titulo}</h3>
                  <p>{c.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cumplimiento" className="landing-section landing-section-alt">
          <div className="landing-wrap">
            <h2>Qué obligación cubre cada parte</h2>
            <p className="landing-section-lead">
              No es una lista de funcionalidades: es el mapa entre lo que la norma exige y
              dónde queda registrado.
            </p>
            <div className="landing-table-wrap">
              <table className="landing-table">
                <thead>
                  <tr>
                    <th>Obligación</th>
                    <th>Base normativa</th>
                    <th>Dónde queda en Resguardo</th>
                  </tr>
                </thead>
                <tbody>
                  {CUMPLIMIENTO.map((fila) => (
                    <tr key={fila.obligacion}>
                      <td>{fila.obligacion}</td>
                      <td className="landing-norm">{fila.norma}</td>
                      <td>{fila.cobertura}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="planes" className="landing-section">
          <div className="landing-wrap">
            <h2>Planes</h2>
            <p className="landing-section-lead">
              El plan se elige por el número de trabajadores, porque eso es lo que determina si
              la empresa necesita comité paritario o supervisor de SST.
            </p>
            <div className="landing-cards landing-cards-3">
              {PLANES.map((plan) => (
                <article
                  className={plan.destacado ? "landing-card landing-plan destacado" : "landing-card landing-plan"}
                  key={plan.nombre}
                >
                  <h3>{plan.nombre}</h3>
                  <p className="landing-plan-para">{plan.para}</p>
                  <ul>
                    {plan.incluye.map((linea) => (
                      <li key={linea}>{linea}</li>
                    ))}
                  </ul>
                  <a href="#contacto" className="landing-btn landing-btn-outline">
                    Consultar
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="landing-section landing-section-dark">
          <div className="landing-wrap landing-contact">
            <div>
              <h2>Conversemos sobre su operación</h2>
              <p>
                Cuéntenos cuántos trabajadores tiene, en cuántos frentes opera y qué registros
                le exige hoy la autoridad. Respondemos con una demostración sobre datos de
                ejemplo, no con un catálogo.
              </p>
            </div>
            <div className="landing-contact-box">
              <p className="landing-contact-label">Escríbanos</p>
              <a className="landing-contact-mail" href="mailto:contacto@resguardo.pe">
                contacto@resguardo.pe
              </a>
              <a
                className="landing-btn landing-btn-primary"
                href="mailto:contacto@resguardo.pe?subject=Solicitud%20de%20demostraci%C3%B3n%20de%20Resguardo&body=Empresa%3A%20%0AN%C3%BAmero%20de%20trabajadores%3A%20%0ASedes%20o%20frentes%3A%20%0AContacto%3A%20"
              >
                Solicitar una demostración
              </a>
              <p className="landing-contact-note">
                También puede <Link to="/registro">registrar su cuenta</Link> si su empresa ya
                está dada de alta en el sistema.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <div className="landing-wrap landing-foot-inner">
          <span>
            Resguardo · Sistema de Gestión de Seguridad y Salud en el Trabajo conforme a la Ley
            N° 29783 y su Reglamento (D.S. N° 005-2012-TR)
          </span>
          <span>Lima, Perú</span>
        </div>
      </footer>
    </div>
  );
}
