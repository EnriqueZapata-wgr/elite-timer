/**
 * salud-puertas — SALUD organizada por la pregunta que contesta, no por módulo.
 *
 * El hub viejo era un menú de catorce cards: Apple Health en miniatura, que es
 * el ejemplo más caro de este error. Aquí se agrupa por el horizonte de tiempo
 * que le importa al usuario:
 *
 *   HOY EN TU CUERPO   ¿cómo estoy ahora?
 *   MIS DATOS          ¿qué dicen mis números?
 *   TU EVOLUCIÓN       ¿hacia dónde voy?
 *   MI EXPEDIENTE      ¿qué hay en mi historia?
 *
 * Reglas duras:
 *   · El hub muestra el hero y CUATRO puertas. Nada más. Presupuesto de
 *     espacio, como Garmin.
 *   · CICLO es quinta puerta solo con el gate abierto.
 *   · Un dato = un lugar. Si otra pantalla necesita glucosa, la muestra pero
 *     enlaza a Mis Datos.
 *   · Nada se elimina: toda ruta que vivía en los hubs de salud sigue
 *     alcanzable desde una de las cuatro puertas. Hay test que lo verifica, y
 *     `npm run censo` lo confirma desde el otro lado.
 */
import type { Href } from 'expo-router';

export type PuertaKey = 'hoy' | 'datos' | 'evolucion' | 'expediente' | 'ciclo';

export interface Puerta {
  key: PuertaKey;
  /** Nombre del icono en el registro de AppIcon. */
  icon: string;
  title: string;
  /** La pregunta que contesta, en el lenguaje del usuario. */
  subtitle: string;
  route: Href;
  gradient: [string, string];
  femaleOnly?: boolean;
}

/** Las cuatro puertas del hub, en orden de render. La quinta lleva su gate. */
export const PUERTAS: Puerta[] = [
  {
    key: 'hoy',
    icon: 'salud-hoy',
    title: 'HOY EN TU CUERPO',
    subtitle: 'Glucosa, cetonas, sol y lo que sientes hoy',
    route: '/salud/hoy',
    gradient: ['#1D9E75', '#0EA5E9'],
  },
  {
    key: 'datos',
    icon: 'salud-datos',
    title: 'MIS DATOS',
    subtitle: 'Labs, biomarcadores, composición y mediciones',
    route: '/salud/mis-datos',
    gradient: ['#22C55E', '#16A34A'],
  },
  {
    key: 'evolucion',
    icon: 'salud-evolucion',
    title: 'TU EVOLUCIÓN',
    subtitle: 'Tu mapa funcional, tu protocolo y hacia dónde vas',
    route: '/salud/evolucion',
    gradient: ['#A8E02A', '#1D9E75'],
  },
  {
    key: 'expediente',
    icon: 'salud-expediente',
    title: 'MI EXPEDIENTE',
    subtitle: 'Historia clínica, cuestionarios y evaluaciones',
    route: '/salud/expediente',
    gradient: ['#38BDF8', '#3B82F6'],
  },
  {
    key: 'ciclo',
    icon: 'salud-ciclo',
    title: 'CICLO',
    subtitle: 'Tu calendario, tus fases y tus síntomas',
    route: '/cycle',
    gradient: ['#D4537E', '#9B59B6'],
    femaleOnly: true,
  },
];

export function visiblePuertas(isFemale: boolean): Puerta[] {
  return PUERTAS.filter((p) => !p.femaleOnly || isFemale);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lo que hay detrás de cada puerta
// ─────────────────────────────────────────────────────────────────────────────

export interface Destino {
  key: string;
  title: string;
  subtitle: string;
  /** Ionicon de chrome: estos son elementos de lista, no apps del lanzador. */
  icon: string;
  color: string;
  route: Href;
  femaleOnly?: boolean;
}

/** HOY EN TU CUERPO — lo que está pasando ahora mismo. */
export const DESTINOS_HOY: Destino[] = [
  { key: 'glucosa', title: 'Glucosa', subtitle: 'Registra y revisa tus mediciones', icon: 'analytics-outline', color: '#22C55E', route: '/glucose-log' },
  { key: 'cetonas', title: 'Cetonas', subtitle: 'Tu estado de cetosis', icon: 'flame-outline', color: '#EF9F27', route: '/ketones-log' },
  { key: 'sol', title: 'Sol y UV', subtitle: 'Tu ventana de luz de hoy', icon: 'sunny-outline', color: '#FBBF24', route: '/solar' },
  { key: 'sintomas', title: 'Mis síntomas', subtitle: 'Qué sientes, desde cuándo y cuánto', icon: 'medkit-outline', color: '#1D9E75', route: '/salud/mis-sintomas' },
  { key: 'ciclo_hoy', title: 'Tu ciclo hoy', subtitle: 'En qué fase estás', icon: 'ellipse-outline', color: '#D4537E', route: '/cycle', femaleOnly: true },
];

/** TU EVOLUCIÓN — a dónde vas y por qué. */
export const DESTINOS_EVOLUCION: Destino[] = [
  { key: 'diagnostico', title: 'Mi mapa funcional', subtitle: 'Raíces detectadas y su nivel', icon: 'git-network-outline', color: '#1D9E75', route: '/salud/diagnostico' },
  { key: 'protocolo', title: 'Mi protocolo', subtitle: 'Tus intervenciones activas', icon: 'clipboard-outline', color: '#A8E02A', route: '/salud/intervenciones' },
  { key: 'edad_atp', title: 'Tu Edad ATP a detalle', subtitle: 'De dónde sale el número y cómo mejorarlo', icon: 'hourglass-outline', color: '#0EA5E9', route: '/edad-atp/result-preview' },
  { key: 'reportes', title: 'Reportes', subtitle: 'Tu semana y tu mes en números', icon: 'bar-chart-outline', color: '#5B9BD5', route: '/reports' },
  { key: 'cronotipo', title: 'Mi cronotipo', subtitle: 'A qué hora rinde tu cuerpo', icon: 'moon-outline', color: '#7F77DD', route: '/my-chronotype' },
];

/** MI EXPEDIENTE — lo archivístico: se llena una vez, se consulta poco. */
export const DESTINOS_EXPEDIENTE: Destino[] = [
  { key: 'timeline', title: 'Mi expediente', subtitle: 'Tu línea de tiempo: síntomas, labs, hitos', icon: 'folder-open-outline', color: '#38BDF8', route: '/salud/mi-expediente' },
  { key: 'historia', title: 'Historia clínica', subtitle: 'Antecedentes por categoría', icon: 'document-text-outline', color: '#3B82F6', route: '/historia-clinica' },
  { key: 'cuestionario', title: 'Cuestionario maestro', subtitle: 'La evaluación que alimenta tu mapa', icon: 'list-outline', color: '#C084FC', route: '/salud/cuestionario-maestro' },
  { key: 'evaluaciones', title: 'Mis evaluaciones', subtitle: 'Tus cuestionarios y pruebas', icon: 'checkbox-outline', color: '#8B5CF6', route: '/salud/mis-evaluaciones' },
  { key: 'padecimientos', title: 'Mis padecimientos', subtitle: 'Condiciones diagnosticadas y episodios', icon: 'bandage-outline', color: '#F59E0B', route: '/salud/padecimientos' },
  { key: 'labs_guide', title: 'Guía de labs', subtitle: 'Qué estudios hacerte y cuánto cuestan', icon: 'book-outline', color: '#60A5FA', route: '/labs-guide' },
];

export const DESTINOS_POR_PUERTA: Record<'hoy' | 'evolucion' | 'expediente', Destino[]> = {
  hoy: DESTINOS_HOY,
  evolucion: DESTINOS_EVOLUCION,
  expediente: DESTINOS_EXPEDIENTE,
};

/**
 * MODO DENSO — la válvula de escape.
 *
 * Garmin curó su app y sus veteranos la rechazaron: la versión ordenada les
 * costaba más clics. La lección es que la curaduría necesita una salida para
 * el usuario avanzado, no un debate. Con el modo denso encendido, el hub lista
 * TODO en un scroll y se saltan las puertas.
 *
 * MIS DATOS no aparece desglosado aquí: sus pantallas hijas (labs, biomarcadores,
 * composición, vitals) viven dentro de esa pantalla, que ya es una lista densa.
 */
export const DESTINOS_TODOS: Destino[] = [
  ...DESTINOS_HOY,
  { key: 'mis_datos', title: 'Mis datos', subtitle: 'Labs, biomarcadores, composición, vitals', icon: 'stats-chart-outline', color: '#22C55E', route: '/salud/mis-datos' },
  ...DESTINOS_EVOLUCION,
  ...DESTINOS_EXPEDIENTE,
];

export function visibleDestinos(destinos: Destino[], isFemale: boolean): Destino[] {
  return destinos.filter((d) => !d.femaleOnly || isFemale);
}
