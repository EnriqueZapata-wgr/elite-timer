/**
 * app-registry — la fuente ÚNICA de las apps internas de ATP.
 *
 * Una entrada por función. La sala ATP se dibuja de aquí, el buscador busca
 * aquí, y el día que lleguen los SVG de iconos se cambia UN objeto
 * (`ICON_MAP` en AppIcon.tsx) y los iconos cambian todos a la vez.
 *
 * La regla que hace barato ese cambio: **ninguna pantalla importa un icono
 * directo.** Todas pasan por `<AppIcon name="meditar" />`. Si ves un
 * `<Ionicons>` para representar una app, está mal.
 *
 * Las rutas de aquí también son puertas para `npm run censo`: agregar una app
 * es darle acceso a esa pantalla.
 */
import type { Href } from 'expo-router';

/** Las secciones de la sala ATP, en orden de render. */
export type AppSection = 'mente' | 'cuerpo' | 'diario' | 'salud' | 'sistema';

export const SECTION_LABELS: Record<AppSection, string> = {
  mente: 'Mente',
  cuerpo: 'Cuerpo',
  diario: 'Hábitos diarios',
  salud: 'Salud',
  sistema: 'Sistema',
};

export const SECTION_ORDER: AppSection[] = ['mente', 'cuerpo', 'diario', 'salud', 'sistema'];

export interface AppEntry {
  /** Identificador estable. Es la llave del icono y la del contador de uso. */
  key: string;
  /** Como se lee bajo el icono. Corto: la cuadrícula da poco ancho. */
  label: string;
  /** Nombre del icono en el registro (ver AppIcon.tsx). Hoy resuelve a relleno. */
  icon: string;
  section: AppSection;
  route: Href;
  /**
   * Si la función se puede activar como hábito del día. La mecánica de
   * instalar-igual-activar se construye en MB-20; aquí solo se declara cuáles
   * son candidatas, para no tener que revisitar las 25 entradas después.
   */
  installable: boolean;
  /** Solo para quien tenga el gate del ciclo abierto. */
  femaleOnly?: boolean;
  /** Palabras extra para el buscador: como la busca el usuario, no como la llamamos. */
  alias?: string[];
}

/**
 * Las 24 apps. El brief pedía 25 e incluía f.lux: no existe pantalla y no se
 * inventa una puerta a un lugar que no está construido (la nav honesta es
 * doctrina desde MB-12). Entra cuando exista, con su icono.
 */
export const APP_REGISTRY: AppEntry[] = [
  // ── Mente ──
  { key: 'meditar', label: 'Meditar', icon: 'meditar', section: 'mente', route: '/meditation', installable: true, alias: ['meditación', 'nsdr', 'calma'] },
  { key: 'respirar', label: 'Respirar', icon: 'respirar', section: 'mente', route: '/breathing', installable: true, alias: ['respiración', 'breathwork', 'wim hof'] },
  { key: 'emociones', label: 'Emociones', icon: 'emociones', section: 'mente', route: '/emotions', installable: true, alias: ['check-in', 'ánimo', 'humor', 'sentir'] },
  { key: 'journal', label: 'Journal', icon: 'journal', section: 'mente', route: '/journal', installable: true, alias: ['diario', 'escribir', 'gratitud'] },
  { key: 'sueno', label: 'Sueño', icon: 'sueno', section: 'mente', route: '/sleep', installable: true, alias: ['dormir', 'descanso', 'noche'] },
  { key: 'nback', label: 'N-Back', icon: 'nback', section: 'mente', route: '/mente/nback', installable: true, alias: ['memoria', 'cognición', 'juego', 'atención'] },

  // ── Cuerpo ──
  { key: 'entrenar', label: 'Entrenar', icon: 'entrenar', section: 'cuerpo', route: '/fitness-hub', installable: true, alias: ['fitness', 'rutina', 'gym', 'fuerza', 'hiit'] },
  { key: 'cardio', label: 'Cardio', icon: 'cardio', section: 'cuerpo', route: '/fitness-cardio', installable: true, alias: ['correr', 'bici', 'caminar', 'zona 2'] },
  { key: 'movilidad', label: 'Movilidad', icon: 'movilidad', section: 'cuerpo', route: '/mobility-assessment', installable: true, alias: ['flexibilidad', 'estiramiento', 'evaluación'] },
  { key: 'rm', label: '1RM', icon: 'rm', section: 'cuerpo', route: '/log-exercise', installable: false, alias: ['levantamiento', 'registrar', 'series', 'peso'] },
  { key: 'records', label: 'Récords', icon: 'records', section: 'cuerpo', route: '/fitness-strength', installable: false, alias: ['pr', 'benchmarks', 'marcas'] },

  // ── Hábitos diarios ──
  { key: 'comida', label: 'Comida', icon: 'comida', section: 'diario', route: '/nutrition', installable: true, alias: ['nutrición', 'comer', 'calorías', 'macros', 'foto'] },
  { key: 'hidratacion', label: 'Hidratación', icon: 'hidratacion', section: 'diario', route: '/hydration', installable: true, alias: ['agua', 'tomar agua', 'electrolitos'] },
  { key: 'ayuno', label: 'Ayuno', icon: 'ayuno', section: 'diario', route: '/fasting', installable: true, alias: ['ayunar', 'ventana', 'autofagia'] },
  { key: 'suplementos', label: 'Suplementos', icon: 'suplementos', section: 'diario', route: '/supplements', installable: true, alias: ['pastillas', 'vitaminas', 'magnesio'] },
  { key: 'recetas', label: 'Recetas', icon: 'recetas', section: 'diario', route: '/my-recipes', installable: false, alias: ['cocinar', 'platillos', 'menú'] },
  { key: 'lista-compra', label: 'Lista', icon: 'lista-compra', section: 'diario', route: '/lista-compra', installable: false, alias: ['compras', 'súper', 'mandado', 'despensa'] },

  // ── Salud ──
  { key: 'sol', label: 'Sol', icon: 'sol', section: 'salud', route: '/solar', installable: true, alias: ['uv', 'vitamina d', 'luz', 'sunlight'] },
  { key: 'glucosa', label: 'Glucosa', icon: 'glucosa', section: 'salud', route: '/glucose-log', installable: true, alias: ['azúcar', 'cgm', 'glicemia'] },
  { key: 'cetonas', label: 'Cetonas', icon: 'cetonas', section: 'salud', route: '/ketones-log', installable: true, alias: ['keto', 'cetosis'] },
  { key: 'ciclo', label: 'Ciclo', icon: 'ciclo', section: 'salud', route: '/cycle', installable: true, femaleOnly: true, alias: ['menstrual', 'periodo', 'regla', 'fase'] },
  { key: 'labs', label: 'Labs', icon: 'labs', section: 'salud', route: '/labs-guide', installable: false, alias: ['laboratorios', 'estudios', 'análisis', 'sangre'] },
  { key: 'protocolos', label: 'Protocolos', icon: 'protocolos', section: 'salud', route: '/salud/intervenciones', installable: false, alias: ['intervenciones', 'plan', 'tratamiento'] },

  // ── Sistema ──
  { key: 'ajustes', label: 'Ajustes', icon: 'ajustes', section: 'sistema', route: '/settings', installable: false, alias: ['configuración', 'settings', 'preferencias', 'cuenta'] },
];

/** Lookup por llave. */
export const APP_BY_KEY: Record<string, AppEntry> = Object.fromEntries(
  APP_REGISTRY.map((a) => [a.key, a])
);

/** Las apps visibles para este usuario (respeta el gate del ciclo). */
export function visibleApps(isFemale: boolean): AppEntry[] {
  return APP_REGISTRY.filter((a) => !a.femaleOnly || isFemale);
}

/**
 * Filtro del buscador. Compara sin acentos ni mayúsculas contra el nombre y
 * los alias: "hidratacion", "HIDRATACIÓN" y "agua" llegan al mismo lugar.
 * Con dos letras ya debe encontrar cualquier app.
 */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function searchApps(apps: AppEntry[], query: string): AppEntry[] {
  const q = normalizeForSearch(query);
  if (!q) return apps;
  return apps.filter((a) => {
    const haystack = [a.label, a.key, ...(a.alias ?? [])].map(normalizeForSearch);
    return haystack.some((h) => h.includes(q));
  });
}
