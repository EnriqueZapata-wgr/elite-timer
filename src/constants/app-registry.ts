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
import type { AppIconName } from '@/src/components/ui/app-icon-names';

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
  /** Nombre del icono en el registro (ver AppIcon.tsx). Hoy resuelve a relleno.
   * Tipado contra la lista real: un typo aquí ya no compila. */
  icon: AppIconName;
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
  /**
   * MB-22 Pieza 3: qué es y para qué sirve, para la ficha del Centro. Dos o
   * tres líneas honestas, del cuerpo, sin jerga y sin promesas médicas.
   * Describe lo que la pantalla HACE (verificable en su código), nunca un
   * beneficio inventado. Sin descripción es mejor que con una falsa.
   */
  description?: string;
}

/**
 * Las 25 apps. El brief pedía 25 e incluía f.lux: no existe pantalla y no se
 * inventa una puerta a un lugar que no está construido (la nav honesta es
 * doctrina desde MB-12). Entra cuando exista, con su icono.
 *
 * 19.1: el hub del pilar Mente se retiró (device test Enrique: "me manda al
 * módulo donde están las mismas apps que ya están en el menú" — un tap de más
 * para llegar a lo mismo). Sus seis cuartos ya son apps de esta sección; lo
 * único del hub que no vivía en otro lado, /mente/progreso (rachas y
 * medallas), entra como app propia: Rachas, al final de la sección.
 */
export const APP_REGISTRY: AppEntry[] = [
  // ── Mente ──
  { key: 'meditar', label: 'Meditar', icon: 'meditar', section: 'mente', route: '/meditation', installable: true, alias: ['meditación', 'nsdr', 'calma'],
    description: 'Sesiones guiadas, audios para descansar y un timer en silencio. Cada sesión queda registrada y suma a tu racha.' },
  // "Wim Hof" en copy visible: nombra la TÉCNICA (así se llama el protocolo
  // en /breathing), no promociona a la persona. Decisión escrita MB-22.1
  // §5.5 — la regla "nombres propios fuera del copy" tiene esta excepción,
  // igual que Braverman.
  { key: 'respirar', label: 'Respirar', icon: 'respirar', section: 'mente', route: '/breathing', installable: true, alias: ['respiración', 'breathwork', 'wim hof'],
    description: 'Ejercicios de respiración guiados con animación: inhala, retén, exhala. Del ritmo suave al Wim Hof.' },
  { key: 'emociones', label: 'Emociones', icon: 'emociones', section: 'mente', route: '/emotions', installable: true, alias: ['check-in', 'ánimo', 'humor', 'sentir'],
    description: 'Check-in de cómo te sientes sobre el mapa de emociones, exploración del territorio y tu historia con el tiempo.' },
  { key: 'journal', label: 'Journal', icon: 'journal', section: 'mente', route: '/journal', installable: true, alias: ['diario', 'escribir', 'gratitud'],
    description: 'Escritura con cuatro puertas: gratitud, visión, estoico y descarga. Con historial y recordatorio a tu hora.' },
  { key: 'sueno', label: 'Sueño', icon: 'sueno', section: 'mente', route: '/sleep', installable: true, alias: ['dormir', 'descanso', 'noche'],
    description: 'Tu ventana de sueño ideal según tu cronotipo, y el estado honesto de tus fuentes de descanso.' },
  { key: 'nback', label: 'N-Back', icon: 'nback', section: 'mente', route: '/mente/nback', installable: true, alias: ['memoria', 'cognición', 'juego', 'atención'],
    description: 'Dual N-Back: un juego corto de memoria de trabajo con posiciones y letras. El nivel sube y baja según tu sesión.' },
  // Al final a propósito: es consulta, no práctica. Rachas de journal,
  // respiración, meditación y check-in + medallas de 7/30/90/365 días —
  // nada de eso existe en ningún otro lado de la app.
  { key: 'rachas', label: 'Rachas', icon: 'rachas', section: 'mente', route: '/mente/progreso', installable: false, alias: ['progreso', 'medallas', 'constancia', 'racha'],
    description: 'Tus rachas de journal, respiración, meditación y check-in, con medallas de 7, 30, 90 y 365 días.' },

  // ── Cuerpo ──
  { key: 'entrenar', label: 'Entrenar', icon: 'entrenar', section: 'cuerpo', route: '/fitness-hub', installable: true, alias: ['fitness', 'rutina', 'gym', 'fuerza', 'hiit'],
    description: 'Tu sesión de hoy, tus rutinas y la biblioteca de ejercicios. Genera la sesión, ejecútala y regístrala.' },
  // MB-22.1 §5.1: las disciplinas son las CUATRO de fitness-cardio.tsx —
  // decir "caminar" (que no existe) y omitir natación era inventar.
  { key: 'cardio', label: 'Cardio', icon: 'cardio', section: 'cuerpo', route: '/fitness-cardio', installable: true, alias: ['correr', 'bici', 'caminar', 'zona 2'],
    description: 'Correr, ciclismo, natación y remo: registra tus sesiones y ve tus marcas por distancia.' },
  // Evaluación puntual, no hábito diario: no tiene electrón que activar.
  { key: 'movilidad', label: 'Movilidad', icon: 'movilidad', section: 'cuerpo', route: '/mobility-assessment', installable: false, alias: ['flexibilidad', 'estiramiento', 'evaluación'],
    description: 'Evaluación guiada de movilidad en siete tests, con lectura por test, asimetrías y comparación contra tu anterior.' },
  // MB-27 P1: el alias 'peso' se muda a Medidas — para el usuario "peso" es
  // su peso corporal, no el que levanta. 1RM conserva levantamiento/series.
  { key: 'rm', label: '1RM', icon: 'rm', section: 'cuerpo', route: '/log-exercise', installable: false, alias: ['levantamiento', 'registrar', 'series', 'barra'],
    description: 'Registra tus series de fuerza con peso y repeticiones, con cálculo de tu máximo (1RM) en vivo.' },
  { key: 'records', label: 'Récords', icon: 'records', section: 'cuerpo', route: '/fitness-strength', installable: false, alias: ['pr', 'benchmarks', 'marcas'],
    description: 'Tu fuerza en un solo lugar: nivel, récords personales y benchmarks por grupo muscular, con progresión.' },
  // Registro puntual, no hábito diario: sin electrón que activar (como 1RM).
  { key: 'medidas', label: 'Medidas', icon: 'medidas', section: 'cuerpo', route: '/medidas', installable: false, alias: ['peso', 'báscula', 'composición', 'grasa', 'cintura', 'cuerpo'],
    description: 'Tu peso y tus medidas en un solo lugar: registra en segundos y ve la tendencia con el tiempo.' },

  // ── Hábitos diarios ──
  { key: 'comida', label: 'Comida', icon: 'comida', section: 'diario', route: '/nutrition', installable: true, alias: ['nutrición', 'comer', 'calorías', 'macros', 'foto'],
    description: 'Registra lo que comes con texto o foto y ve tus macros del día en un solo lugar.' },
  { key: 'hidratacion', label: 'Hidratación', icon: 'hidratacion', section: 'diario', route: '/hydration', installable: true, alias: ['agua', 'tomar agua', 'electrolitos'],
    description: 'Tu agua del día con botones rápidos, barra de progreso y meta editable.' },
  { key: 'ayuno', label: 'Ayuno', icon: 'ayuno', section: 'diario', route: '/fasting', installable: true, alias: ['ayunar', 'ventana', 'autofagia'],
    description: 'Timer de ayuno con protocolos de 12 a 72 horas, meta editable e historial de tus ventanas.' },
  { key: 'suplementos', label: 'Suplementos', icon: 'suplementos', section: 'diario', route: '/supplements', installable: true, alias: ['pastillas', 'vitaminas', 'magnesio'],
    description: 'Tu registro personal: crea tus fichas, agrúpalas por momento del día y marca cada toma. ATP no te sugiere qué tomar.' },
  { key: 'recetas', label: 'Recetas', icon: 'recetas', section: 'diario', route: '/my-recipes', installable: false, alias: ['cocinar', 'platillos', 'menú'],
    description: 'Guarda tus comidas como recetas y reúsalas al registrar, sin volver a capturar nada.' },
  { key: 'lista-compra', label: 'Lista', icon: 'lista-compra', section: 'diario', route: '/lista-compra', installable: false, alias: ['compras', 'súper', 'mandado', 'despensa'],
    description: 'Elige recetas de tu semana y arma la lista del súper con sus ingredientes, lista para compartir.' },

  // ── Salud ──
  { key: 'sol', label: 'Sol', icon: 'sol', section: 'salud', route: '/solar', installable: true, alias: ['uv', 'vitamina d', 'luz', 'sunlight'],
    description: 'Exposición al sol con cabeza: el UV de tu zona, tus ventanas de luz y tu registro. Protección física primero.' },
  { key: 'glucosa', label: 'Glucosa', icon: 'glucosa', section: 'salud', route: '/glucose-log', installable: true, alias: ['azúcar', 'cgm', 'glicemia'],
    description: 'Registra tu glucosa con contexto (ayunas, antes o después de comer) y ve tu historial con rangos visuales.' },
  { key: 'cetonas', label: 'Cetonas', icon: 'cetonas', section: 'salud', route: '/ketones-log', installable: true, alias: ['keto', 'cetosis'],
    description: 'Registra cetonas de sangre, aliento u orina, con contexto y el historial de tu día.' },
  { key: 'ciclo', label: 'Ciclo', icon: 'ciclo', section: 'salud', route: '/cycle', installable: true, femaleOnly: true, alias: ['menstrual', 'periodo', 'regla', 'fase'],
    description: 'Calendario de tu ciclo: periodos, síntomas, fase del día y predicción.' },
  { key: 'labs', label: 'Labs', icon: 'labs', section: 'salud', route: '/labs-guide', installable: false, alias: ['laboratorios', 'estudios', 'análisis', 'sangre'],
    description: 'La guía de qué laboratorios pedir y cuándo, para leer en la app o llevar en PDF a tu consulta.' },
  { key: 'protocolos', label: 'Protocolos', icon: 'protocolos', section: 'salud', route: '/salud/intervenciones', installable: false, alias: ['intervenciones', 'plan', 'tratamiento'],
    description: 'Tu protocolo activo: las intervenciones que estás corriendo, qué completaste hoy y las sugeridas para ti.' },

  // ── Sistema ──
  { key: 'ajustes', label: 'Ajustes', icon: 'ajustes', section: 'sistema', route: '/settings', installable: false, alias: ['configuración', 'settings', 'preferencias', 'cuenta'],
    description: 'Tu cuenta, tus datos de salud, notificaciones, conexiones y lo legal: todo lo que configura la app.' },
];

/** Lookup por llave. */
export const APP_BY_KEY: Record<string, AppEntry> = Object.fromEntries(
  APP_REGISTRY.map((a) => [a.key, a])
);

/**
 * Las apps visibles para este usuario (respeta el gate del ciclo).
 *
 * MB-22 P4: el parámetro ya no es solo "es female" — es "puede ver Ciclo":
 * female (propio de siempre) O cualquiera con fila de modo heredada del
 * acompañante retirado (MB-23 P2: conserva su tile hasta que decida).
 * El Centro pasa `true`: ahí Ciclo se descubre; instalar exige modo propio.
 */
export function visibleApps(cycleVisible: boolean): AppEntry[] {
  return APP_REGISTRY.filter((a) => !a.femaleOnly || cycleVisible);
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
