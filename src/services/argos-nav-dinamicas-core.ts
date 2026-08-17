/**
 * ARGOS Navegador — las plantillas dinámicas, resueltas (NAV-2).
 *
 * EL BUG QUE CIERRA. `APP_ROUTES_DYNAMIC` trae 10 plantillas con los corchetes
 * literales (`/reports/[dominio]`, `/tests/q/[id]`, `/packs/[packKey]`...) y el
 * resolvedor las metía al índice de búsqueda tal cual. De ahí salían como
 * candidatos tocables en la fila de desambiguación, y el chat hacía
 * `router.push('/reports/[dominio]')`: una ruta que no existe. El título que
 * veía el usuario era el slug prettificado del parámetro, o sea "PackKey".
 *
 * POR QUÉ RESOLVER Y NO SOLO FILTRAR. Filtrar es una línea y arregla el crash,
 * pero deja a ARGOS mudo sobre 14 reportes, 8 packs, 17 evaluaciones que corren
 * en el motor y 16 cuestionarios de historia clínica: 55 destinos REALES que hoy
 * no puede ofrecer aunque el usuario los pida por su nombre. "Llévame a mi
 * reporte de ayuno" tiene una respuesta correcta y es `/reports/ayuno`.
 *
 * DE DÓNDE SALEN LOS VALORES: DE NINGÚN LADO NUEVO. Cada expansor lee la misma
 * fuente de verdad que usa la pantalla para validar su parámetro. Si mañana
 * nace un dominio de reportes, aparece aquí sin que nadie toque este archivo.
 * No hay una sola lista escrita a mano, y eso es el punto: una lista a mano se
 * desincroniza y vuelve a prometer pantallas que no existen.
 *
 * QUÉ NO SE EXPANDE, Y POR QUÉ CADA UNA. Ver `PLANTILLAS_SIN_EXPANSION`. La
 * regla es que si el valor no es un concepto que el usuario nombra, la
 * expansión es ruido que compite con el destino de verdad.
 *
 * LAS EVALUACIONES NO ESTABAN MUERTAS, ESTABAN A MEDIO MUDAR. De las 33 rutas
 * de evaluaciones, 8 tienen `live: true` (su ruta del motor único ya recibe
 * gente) y 25 no. Las 25 NO son pantallas muertas: su pantalla original sigue
 * viva y es a donde el hub manda hoy. Así que este core no pregunta "¿está
 * viva?", pregunta `currentRoute()`, que es la misma función que usa el hub: la
 * del motor si ya prendió, la original si no. El día que una prenda su bandera,
 * ARGOS cambia de destino solo. Cero rutas muertas ofrecidas, cero copy nuevo.
 */
import { APP_ROUTES, APP_ROUTES_DYNAMIC } from '@/src/constants/app-routes.generated';
import { ASSESSMENTS, SECTION_META, currentRoute } from '@/src/constants/assessments';
import { PACK_BY_KEY } from '@/src/constants/packs';
import { REPORT_DOMAINS, REPORT_DOMAIN_KEYS } from '@/src/services/reports/report-domain-core';

/** Un destino de verdad, derivado de una plantilla. */
export interface RutaExpandida {
  /** Ruta navegable, sin corchetes. */
  ruta: string;
  /** Copy es-MX para el usuario. Sale de la fuente, no de aquí. */
  titulo: string;
  /** De qué plantilla nació. Para trazar y para los candados. */
  plantilla: string;
  /** Corpus extra para el índice invertido. Lo que el usuario podría decir. */
  descripcion?: string;
}

/** ¿Trae corchetes? Entonces no es una ruta, es un molde. */
export function esPlantilla(ruta: string): boolean {
  return ruta.includes('[');
}

/**
 * Las plantillas que a propósito NO se expanden, con el motivo escrito.
 *
 * Que estén aquí no es un pendiente olvidado: es una decisión. El candado del
 * test exige que toda plantilla esté en un lado o en el otro, así que una
 * plantilla nueva sin decisión rompe la suite en vez de colarse al índice.
 */
export const PLANTILLAS_SIN_EXPANSION: ReadonlyMap<string, string> = new Map([
  [
    '/comunidad/perfil/[userId]',
    'el parámetro es el identificador de una persona real: no hay lista en el código y no debe haberla',
  ],
  [
    '/centro/[appKey]',
    'cada una de las 35 apps YA tiene su pantalla propia en el índice. Expandir las fichas del Centro pondría 35 casi duplicados a competir con el destino de verdad: quien pide "llévame a meditar" quiere /meditation, no la ficha de instalación',
  ],
  [
    '/salud/intervenciones/[key]',
    'la pantalla abre lo que TÚ tienes activo, no el catálogo de 88. Ofrecer una intervención que el usuario no trae asignada lo manda a un estado vacío',
  ],
  [
    '/edad-atp/lab/[key]',
    'la ficha del biomarcador depende de que ese valor esté medido. Sin medición son 39 rutas al mismo estado vacío',
  ],
  [
    '/edad-atp/sub-edad/[key]',
    'las cinco áreas existen solo como tipo (SubEdadKey), no como lista en runtime. Expandirla hoy sería escribir la lista a mano en un segundo lugar, que es justo lo que este core evita. Se expande cuando el tipo tenga su constante',
  ],
  [
    '/historia-clinica/[category]',
    'ya se expande por el otro lado: son las rutas originales de los 16 cuestionarios clínicos y salen del expansor de evaluaciones vía currentRoute()',
  ],
]);

/**
 * LA SUPERFICIE de cada plantilla: cómo nombra el usuario el TIPO de destino,
 * no el valor.
 *
 * ESTO NO ES DECORACIÓN, ES LO QUE EVITA UNA REGRESIÓN MEDIDA. Al meter
 * /reports/ayuno al índice con el peso normal de slug y título, "llévame a donde
 * registro el ayuno" dejó de resolver a /fasting y se volvió ambigua entre las
 * dos: el token "ayuno" pesaba casi igual en la pantalla del ayuno que en su
 * reporte. La regla que sale de ahí: en una ruta expandida el valor NO
 * discrimina (ya pertenece a una pantalla principal), lo que discrimina es la
 * superficie. Quien dice "ayuno" quiere el ayuno; quien dice "reporte de ayuno"
 * quiere el reporte. Por eso la superficie entra con peso de alias y el valor
 * con peso de descripción.
 *
 * Copy es-MX, como lo dice la gente, no como lo llamamos nosotros.
 */
export const SUPERFICIE_PLANTILLA: Readonly<Record<string, readonly string[]>> = {
  '/reports/[dominio]': ['reporte', 'reportes', 'informe', 'resumen del periodo'],
  '/packs/[packKey]': ['pack', 'packs', 'paquete', 'paquetes', 'protocolo'],
  '/tests/q/[id]': ['evaluacion', 'evaluaciones', 'cuestionario', 'cuestionarios', 'test'],
  '/tests/run/[id]': ['prueba', 'pruebas', 'test', 'medicion fisica'],
};

/** Los 14 dominios de reportes. Fuente: REPORT_DOMAINS. */
function expansionReportes(): RutaExpandida[] {
  return REPORT_DOMAIN_KEYS.map((key) => {
    const meta = REPORT_DOMAINS[key];
    return {
      ruta: `/reports/${key}`,
      titulo: `Reporte de ${meta.title}`,
      plantilla: '/reports/[dominio]',
      descripcion: meta.subtitle,
    };
  });
}

/** Los packs de estilo de vida y los paquetes de salud. Fuente: PACK_BY_KEY. */
function expansionPacks(): RutaExpandida[] {
  return Object.values(PACK_BY_KEY).map((p) => ({
    ruta: `/packs/${p.key}`,
    titulo: p.nombre,
    plantilla: '/packs/[packKey]',
    // `paraQuien` es la línea de "para quién es este pack": el mejor corpus que
    // hay para que el buscador entienda a qué pack se refiere el usuario.
    descripcion: p.paraQuien,
  }));
}

/**
 * Las evaluaciones, cada una a la pantalla que funciona HOY.
 *
 * `currentRoute()` es la misma puerta que usa el hub: ruta del motor si la
 * evaluación ya prendió su bandera `live`, ruta original si todavía no. Por eso
 * este expansor no puede ofrecer una pantalla que truene, y por eso se arregla
 * solo cuando la migración avanza.
 *
 * El calificativo de la sección ("Funcional", "Clínico", "Edad ATP", "Físico")
 * sale de SECTION_META, no de aquí: sin él, un chip que dice solo "Sueño" se
 * confunde con la app de Sueño.
 */
function expansionEvaluaciones(): RutaExpandida[] {
  const seccion = (id: string) => SECTION_META.find((s) => s.id === id)?.title ?? '';
  return ASSESSMENTS.map((a) => {
    const ruta = currentRoute(a);
    const etiqueta = seccion(a.section);
    return {
      ruta,
      titulo: etiqueta ? `${a.title} (${etiqueta})` : a.title,
      // La plantilla real de la que cuelga, para que el candado cuadre.
      plantilla: a.kind === 'physical' ? '/tests/run/[id]' : '/tests/q/[id]',
      descripcion: a.subtitle,
    };
  });
}

const EXPANSORES: readonly (() => RutaExpandida[])[] = [
  expansionReportes,
  expansionPacks,
  expansionEvaluaciones,
];

let _cache: RutaExpandida[] | null = null;

/**
 * Todas las expansiones navegables, ya limpias.
 *
 * Se cae fuera lo que ya es una ruta estática del catálogo (Braverman tiene
 * pantalla propia; los 9 cuestionarios de Edad ATP tienen sus wrappers), porque
 * duplicar una entrada del índice ensucia el IDF y parte el puntaje del destino
 * en dos filas idénticas.
 */
export function expandirTodas(): RutaExpandida[] {
  if (_cache) return _cache;
  const vistas = new Set<string>(APP_ROUTES);
  const salida: RutaExpandida[] = [];
  for (const expansor of EXPANSORES) {
    for (const e of expansor()) {
      if (esPlantilla(e.ruta)) continue; // paranoia: una expansión con corchetes no sale
      const base = e.ruta.split('?')[0];
      if (vistas.has(base)) continue;
      vistas.add(base);
      salida.push(e);
    }
  }
  _cache = salida;
  return salida;
}

/** Las expansiones de UNA plantilla. Para el camino del modelo. */
export function expandirPlantilla(plantilla: string): RutaExpandida[] {
  return expandirTodas().filter((e) => e.plantilla === plantilla);
}

/** ¿Esta ruta concreta nació de una plantilla? Devuelve la expansión o null. */
export function expansionDe(ruta: string): RutaExpandida | null {
  return expandirTodas().find((e) => e.ruta === ruta) ?? null;
}

/**
 * Plantillas sin decisión: ni se expanden ni están declaradas como excluidas.
 * El test lo exige vacío. Es el candado que impide que una plantilla nueva
 * vuelva a colarse al índice con los corchetes puestos.
 */
export function plantillasHuerfanas(): string[] {
  const conExpansion = new Set(expandirTodas().map((e) => e.plantilla));
  return APP_ROUTES_DYNAMIC.filter(
    (p) => !conExpansion.has(p) && !PLANTILLAS_SIN_EXPANSION.has(p),
  );
}

/** Solo para tests: tira la memoización. */
export function _resetExpansiones(): void {
  _cache = null;
}
