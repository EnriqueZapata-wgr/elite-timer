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
        kicker: 'TU DIA',
        copy: 'Todo lo que te toca hoy vive en una sola lista. No hay que buscarlo en otro lado.',
      },
      {
        // MB-20.5: quedan DOS tipos de card y este paso enseña esa regla.
        // Si cambia el gesto, cambia aquí: es el paso más leído de la app.
        id: 'gestos',
        kicker: 'LOS DOS GESTOS',
        copy: 'Un toque palomea el hábito y abre la función. Mantén presionado el que además tiene pantalla propia.',
      },
      {
        id: 'inline',
        kicker: 'SIN SALIR',
        copy: 'Lo simple se captura aquí mismo: el agua suma 250 ml con un toque.',
      },
      {
        id: 'electrones',
        kicker: 'ELECTRONES',
        copy: 'Cada hábito cumplido carga electrones. Se acumulan y te muestran qué tan constante has sido.',
      },
    ],
  },
  {
    id: 'kit',
    ruta: '/kit',
    titulo: 'Tus herramientas',
    resumen: 'Dónde están todas las funciones y qué significa instalar.',
    pasos: [
      {
        id: 'sala',
        kicker: 'TUS HERRAMIENTAS',
        copy: 'Todas tus funciones viven aquí. Búscalas por nombre o acomódalas como quieras.',
      },
      {
        id: 'instalar',
        kicker: 'INSTALAR ES ACTIVAR',
        copy: 'Instalar enciende el hábito y suma su fila a tu día. Desinstalar nunca borra tu historia.',
      },
    ],
  },
  {
    id: 'salud',
    ruta: '/salud',
    titulo: 'Tu salud funcional',
    resumen: 'Las cuatro secciones y de dónde sale tu Edad ATP.',
    pasos: [
      {
        id: 'secciones',
        kicker: 'CUATRO PUERTAS',
        copy: 'Cómo vienes hoy, tus datos, tu evolución y tu expediente. Cada sección se abre y se cierra.',
      },
      {
        // Candado de tienda: la Edad ATP se presenta como ventana educativa.
        // Nunca como evaluación médica. Ver medical-disclaimers.
        id: 'edad',
        kicker: 'EDAD ATP',
        copy: 'Es una ventana educativa a tu estado interno. No es una evaluación médica.',
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
        copy: 'Si no sabes por dónde empezar, elige un objetivo y él enciende las prácticas por ti.',
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
        copy: 'Es tu misma lista, ordenada por hora. Nada se captura dos veces.',
      },
    ],
  },
  {
    id: 'tribu',
    ruta: '/tribu',
    titulo: 'Tu tribu',
    resumen: 'Quién entrena contigo y qué ven de ti.',
    pasos: [
      {
        id: 'gente',
        kicker: 'TU GENTE',
        copy: 'Aquí ves quién entrena contigo. Tú decides qué parte de tu avance comparten.',
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
    resumen: 'Avisos, tema, y dónde repetir cualquier tutorial.',
    pasos: [
      {
        id: 'donde',
        kicker: 'TU CONFIGURACION',
        copy: 'Aquí cambias tus avisos y el tema. En Experiencia puedes repetir cualquier tutorial.',
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
