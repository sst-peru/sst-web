/**
 * Encabezado común de las pantallas de acceso: marca, nombre y bajada.
 *
 * El escudo va en SVG inline y no como imagen: pesa unos cientos de bytes, se pinta con
 * el color del texto y no agrega una petición más a una pantalla que es lo primero que
 * ve el usuario.
 */
export default function MarcaAcceso({ subtitulo }: { subtitulo: string }) {
  return (
    <header className="marca-acceso">
      <svg
        className="marca-escudo"
        viewBox="0 0 48 56"
        width="40"
        height="47"
        role="img"
        aria-label="Resguardo"
      >
        <path
          d="M24 2 4 10v18c0 12 8 21 20 26 12-5 20-14 20-26V10L24 2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M15 27l6.5 6.5L33 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h1>Resguardo</h1>
      <p className="marca-bajada">{subtitulo}</p>
    </header>
  );
}
