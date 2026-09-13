import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Imagen que se abre en grande al tocarla.
 *
 * La miniatura sirve para confirmar que la foto es la correcta, pero el comité necesita
 * ver el detalle —si el andamio tiene o no arriostre, si el cable está pelado— y eso en
 * 84 píxeles no se distingue. Se cierra tocando fuera, con el botón o con Escape.
 */
export function FotoAmpliable({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!abierta) return;

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierta(false);
    };
    window.addEventListener("keydown", alPresionar);

    // Evita que la página de atrás siga desplazándose mientras se ve la foto.
    const desbordeOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = desbordeOriginal;
    };
  }, [abierta]);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className ? `${className} ampliable` : "ampliable"}
        onClick={(evento) => {
          // Si la imagen está dentro de un <label>, el clic se reenviaría al input
          // asociado y abriría el explorador de archivos en vez de ampliar.
          evento.preventDefault();
          setAbierta(true);
        }}
        onKeyDown={(evento) => {
          if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            setAbierta(true);
          }
        }}
        role="button"
        tabIndex={0}
        title="Tocar para ampliar"
      />

      {/*
        El visor se monta en <body> con un portal, no aquí dentro.

        Si se dibuja donde está la miniatura, hereda los estilos del contenedor —la regla
        que fija la miniatura en 84 px le ganaba a la del visor y la foto "grande" salía
        diminuta— y además queda atrapado en el contexto de apilamiento del formulario.
      */}
      {abierta &&
        createPortal(
          <div className="visor-foto" onClick={() => setAbierta(false)}>
            <button
              type="button"
              className="visor-cerrar"
              onClick={() => setAbierta(false)}
              aria-label="Cerrar la vista ampliada"
            >
              Cerrar
            </button>
            <img src={src} alt={alt} onClick={(evento) => evento.stopPropagation()} />
            <p className="visor-pie">Toca fuera de la imagen o presiona Escape para cerrar</p>
          </div>,
          document.body,
        )}
    </>
  );
}
