/**
 * Tutorial por pantalla: el guion (requisito de lanzamiento, 21-ago-2026).
 *
 * POR QUÉ ASÍ
 * El tour viejo eran 12 pasos seguidos antes de dejar usar la app, y la
 * verdad medida es que casi nadie los termina. Aquí el mismo contenido se
 * parte en piezas chicas que llegan CUANDO la pantalla importa: entras a HOY
 * y HOY se explica; entras a Kit y Kit se explica. Una pieza dura entre uno y
 * cuatro pasos, se marca como vista y no vuelve sola nunca más.
 *
 * TRES PUERTAS AL MISMO CONTENIDO
 *  1. Sola, la primera vez que pisas la pantalla.
 *  2. El centro de ayuda, donde se puede relanzar cualquiera cuando quieras.
 *  3. ARGOS, que puede abrir el de la pantalla donde estás.
 *
 * REGLAS DEL COPY (blindadas en el test, no en esta nota)
 *  · Cero guion largo. Cero jerga. Frases de una o dos líneas.
 *  · Nada de promesas de salud ni lenguaje de consulta médica.
 *  · Se dice lo que la app HACE, nunca lo que la persona va a sentir.
 *
 * Datos puros: sin React, sin storage, testeable en el harness de node.
 */

/** Un paso: un concepto, una frase. */
export interface PasoTour {
  id: string;
  /** Etiqueta corta de arriba, en mayúsculas. */
  kicker: string;
  copy: string;
}

export interface TourDePantalla {
  /** Llave estable: se guarda en disco cuando se ve. Nunca se renombra. */
  id: string;
  /** Ruta exacta donde vive. El candado verifica que exista de verdad. */
  ruta: string;
  /** Cómo se llama en el centro de ayuda. */
  titulo: string;
  /** Una línea que responde "y esto para qué me sirve". */
  resumen: string;
  pasos: readonly PasoTour[];
}

export const TOURS_POR_PANTALLA: readonly TourDePantalla[] = [
  {
    id: 'hoy',
    ruta: '/',
    titulo: 'Tu día',
    resumen: 'Cómo se lee y se palomea la lista de cada día.',
    pasos: [
      {
        id: 'lista',
        kicker: 'TU DÍA',
        copy: 'Todo lo que te toca hoy vive en una sola lista, agrupada por momento del día.',
      },
      {
        // MB-20.5: quedan DOS tipos de card y este paso enseña esa regla.
        // Si cambia el gesto, cambia aquí: es el paso más leído de la app.
        id: 'gestos',
        kicker: 'LOS DOS GESTOS',
        copy: 'Un toque palomea los hábitos y abre las funciones. Deja presionado un hábito para entrar a su pantalla, si la tiene.',
      },
      {
        id: 'inline',
        kicker: 'SIN SALIR',
        copy: 'Lo simple se captura aquí mismo: el agua suma 250 ml con un toque.',
      },
      {
        id: 'electrones',
        kicker: 'ELECTRONES',
        copy: 'Cada hábito cumplido carga electrones. Son el marcador de tu constancia y mueven tu lugar en el ranking.',
      },
    ],
  },
  {
    id: 'kit',
    ruta: '/kit',
    titulo: 'Tus herramientas',
    resumen: 'Qué hay en tu cuadrícula y qué significa instalar.',
    pasos: [
      {
        id: 'sala',
        kicker: 'TUS HERRAMIENTAS',
        copy: 'Aquí vive lo que ya tienes instalado. Búscalo por nombre o acomódalo como quieras.',
      },
      {
        id: 'instalar',
        kicker: 'INSTALAR ES ACTIVAR',
        copy: 'Instalar desde el Centro enciende el hábito y suma su fila a tu día. Desinstalar nunca borra tu historial.',
      },
    ],
  },
  {
    id: 'salud',
    ruta: '/salud',
    titulo: 'Tu salud funcional',
    resumen: 'Las secciones del tab y de dónde sale tu Edad ATP.',
    pasos: [
      {
        id: 'secciones',
        kicker: 'LAS SECCIONES',
        copy: 'Hoy en tu cuerpo, tus datos, tu evolución y tu expediente. Cada una se abre con un toque.',
      },
      {
        // Candado de tienda: la Edad ATP se presenta como ventana educativa.
        // Nunca como evaluación médica. Ver medical-disclaimers.
        id: 'edad',
        kicker: 'EDAD ATP',
        copy: 'Resume tus datos en un número y lo compara con tu edad real. No es una evaluación médica.',
      },
    ],
  },
  {
    id: 'protocolo',
    ruta: '/salud/intervenciones',
    titulo: 'Mi protocolo',
    resumen: 'Qué prácticas tienes activas y cómo se llenan solas.',
    pasos: [
      {
        id: 'activas',
        kicker: 'MI PROTOCOLO',
        copy: 'Son las prácticas que tienes encendidas. De aquí sale lo que aparece en tu día.',
      },
      {
        id: 'objetivo',
        kicker: 'POR OBJETIVO',
        copy: 'Toca "Arma tu día por objetivo": dices qué quieres lograr y las prácticas entran solas, con su hora.',
      },
    ],
  },
  {
    id: 'agenda',
    ruta: '/agenda',
    titulo: 'Tu agenda',
    resumen: 'La misma lista, ordenada por hora.',
    pasos: [
      {
        id: 'lente',
        kicker: 'LA OTRA LENTE',
        copy: 'Es tu misma lista, ordenada por hora. Lo que palomeas aquí ya queda palomeado en tu día.',
      },
    ],
  },
  {
    id: 'tribu',
    ruta: '/tribu',
    titulo: 'Tu tribu',
    resumen: 'Quién entrena contigo y qué decides mostrar.',
    pasos: [
      {
        id: 'gente',
        kicker: 'TU GENTE',
        copy: 'Ranking, amigos y tu perfil público. En Mi perfil público decides qué ve tu gente de ti.',
      },
    ],
  },
  {
    id: 'argos',
    ruta: '/argos',
    titulo: 'ARGOS',
    resumen: 'Qué le puedes preguntar y cómo te avisa.',
    pasos: [
      {
        id: 'orbe',
        kicker: 'SOY ARGOS',
        copy: 'Pregúntame lo que sea de la app o de tus datos. Si cambio de color, tengo algo que decirte.',
      },
    ],
  },
  {
    id: 'ajustes',
    ruta: '/settings',
    titulo: 'Tu configuración',
    resumen: 'Dónde están tus avisos, el tema y el tutorial.',
    pasos: [
      {
        id: 'donde',
        kicker: 'TU CONFIGURACIÓN',
        copy: 'Todo se ajusta por grupos: Notificaciones, Experiencia, Privacidad y más. El tutorial vive en Experiencia.',
      },
    ],
  },
];

/** Prefijo de la marca en disco. Una llave por tour, nunca una lista. */
export const TOUR_VISTO_PREFIJO = '@atp/tour_pantalla/';

export function llaveTour(id: string): string {
  return `${TOUR_VISTO_PREFIJO}${id}`;
}

/** Evento para abrir un tour a mano (centro de ayuda, ARGOS). */
export const TOUR_PANTALLA_ABRIR_EVENT = 'tour_pantalla_abrir';

const POR_RUTA: ReadonlyMap<string, TourDePantalla> = new Map(
  TOURS_POR_PANTALLA.map((t) => [t.ruta, t])
);

const POR_ID: ReadonlyMap<string, TourDePantalla> = new Map(
  TOURS_POR_PANTALLA.map((t) => [t.id, t])
);

export function tourDeRuta(ruta: string): TourDePantalla | null {
  return POR_RUTA.get(ruta) ?? null;
}

export function tourPorId(id: string): TourDePantalla | null {
  return POR_ID.get(id) ?? null;
}

/**
 * El único lugar que decide si una pieza se lanza sola.
 *
 * Se lanza cuando: la ruta tiene tour, no se ha visto, y el usuario no pidió
 * silencio. Nunca reaparece por su cuenta: eso lo garantiza `vistos`, que la
 * capa de arriba lee de disco.
 */
export function tourPendiente(
  ruta: string,
  vistos: ReadonlySet<string>,
  silenciados = false
): TourDePantalla | null {
  if (silenciados) return null;
  const t = tourDeRuta(ruta);
  if (!t) return null;
  return vistos.has(t.id) ? null : t;
}

/** Cuántas piezas quedan por ver: alimenta el avance del centro de ayuda. */
export function avanceTutorial(vistos: ReadonlySet<string>): {
  vistos: number;
  total: number;
} {
  const total = TOURS_POR_PANTALLA.length;
  const n = TOURS_POR_PANTALLA.filter((t) => vistos.has(t.id)).length;
  return { vistos: n, total };
}
