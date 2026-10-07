/**
 * Texto de la politica de privacidad que se muestra antes de pedir el consentimiento.
 *
 * La version tiene que coincidir con POLITICA_PRIVACIDAD_VERSION del API: si no coincide,
 * el API rechaza la aceptacion, porque lo que el usuario leyo no seria lo que acepta.
 */
export const POLITICA_VERSION = "2026-10";

export const POLITICA_SECCIONES: { titulo: string; cuerpo: string }[] = [
  {
    titulo: "Qué datos recogemos",
    cuerpo:
      "Tu nombre, apellidos, documento de identidad, correo y teléfono, el área en la que " +
      "trabajas, y los datos de cada hallazgo que reportas: descripción, fotografía, fecha " +
      "de ocurrencia y, si lo autorizas, la ubicación del lugar.",
  },
  {
    titulo: "Para qué los usamos",
    cuerpo:
      "Únicamente para operar el Sistema de Gestión de Seguridad y Salud en el Trabajo de " +
      "tu empresa: dar seguimiento a los hallazgos, mantener la matriz IPERC, controlar la " +
      "entrega de equipos de protección, y producir los registros que la Ley N° 29783 " +
      "obliga a exhibir ante una fiscalización de SUNAFIL.",
  },
  {
    titulo: "Quién puede verlos",
    cuerpo:
      "Solo el personal de tu propia empresa con rol de supervisor, comité de SST o " +
      "administrador. Ninguna otra empresa de la plataforma puede ver tus datos. Si eliges " +
      "reportar de forma anónima, tu identidad no se muestra a nadie de tu empresa, ni " +
      "siquiera a tu supervisor.",
  },
  {
    titulo: "La ubicación es opcional",
    cuerpo:
      "Puedes reportar sin compartir tu ubicación, y puedes desactivarla cuando quieras " +
      "desde esta misma pantalla. Al desactivarla dejamos de guardarla de inmediato; los " +
      "reportes anteriores conservan la que ya tenían.",
  },
  {
    titulo: "Tus derechos",
    cuerpo:
      "Puedes retirar este consentimiento en cualquier momento, con la misma facilidad con " +
      "que lo das. Conservamos el registro de cuándo lo diste y cuándo lo retiraste, porque " +
      "la Ley N° 29733 de Protección de Datos Personales exige poder demostrarlo. Los " +
      "registros de seguridad que la Ley N° 29783 obliga a conservar no se eliminan al " +
      "retirar el consentimiento, pero dejan de usarse para cualquier otro fin.",
  },
];
