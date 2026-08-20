/**
 * ARGOS Navegador — resolución de destino, lógica pura (NOCHE-ARGOS Pieza 1).
 *
 * El problema que resuelve: la app tiene ~190 pantallas y hay funciones a las
 * que el usuario no sabe llegar. Filas de HOY que solo navegan con pulsación
 * larga, el arranque que siembra 2 de 36 apps, y Ajustes convertido en el
 * basurero de todo lo que no cupo en otro lado. ARGOS es el atajo.
 *
 * POR QUÉ ES LOCAL Y NO UN LLM: navegar es búsqueda sobre un catálogo cerrado
 * de 190 entradas que YA está en el bundle (app-routes.generated.ts, con 189
 * descripciones cosechadas de los docblocks). Mandar eso a un modelo por cada
 * "dónde veo mis análisis" es pagar tokens por un problema de índice invertido.
 * Este core resuelve la mayoría sin red y sin latencia. El modelo entra solo
 * cuando el puntaje local no alcanza (ver argos-nav-service).
 *
 * POR QUÉ TF-IDF Y NO `includes()`: la palabra "salud" aparece en decenas de
 * descripciones y no discrimina nada; "ayuno" aparece en dos y lo discrimina
 * todo. Sin ponderar por rareza, cualquier consulta con una palabra genérica
 * arrastra a la pantalla equivocada. El IDF hace ese trabajo solo.
 *
 * Las rutas están en inglés (`/fasting`, `/glucose-log`) y el usuario habla
 * español. Por eso el corpus real de búsqueda son las descripciones (que sí
 * están en español) más una tabla de alias curada para los intentos de alto
 * tráfico. El slug se usa, pero es el aporte más débil.
 */
import {
  APP_ROUTES,
  APP_ROUTES_DYNAMIC,
  APP_ROUTE_DESCRIPTIONS,
  APP_ROUTE_ALIASES,
} from '@/src/constants/app-routes.generated';
import { ARGOS_RESUELVE_RUTAS_DINAMICAS } from '@/src/constants/flags';
import {
  esPlantilla,
  expandirPlantilla,
  expandirTodas,
  SUPERFICIE_PLANTILLA,
  type RutaExpandida,
} from './argos-nav-dinamicas-core';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CandidatoNav {
  ruta: string;
  /** Título legible para el usuario. Nunca el docblock crudo. */
  titulo: string;
  puntaje: number;
}

export type ResultadoNav =
  /** Un ganador claro. ARGOS puede navegar sin preguntar. */
  | { tipo: 'resuelta'; ruta: string; titulo: string; puntaje: number }
  /** Varios plausibles y ninguno domina. ARGOS PREGUNTA, no adivina. */
  | { tipo: 'ambigua'; candidatos: CandidatoNav[] }
  /**
   * La ruta existe pero necesita un parámetro que ARGOS no tiene.
   *
   * NAV-2: ahora viaja con `opciones` cuando la plantilla SÍ se puede expandir.
   * Antes esto era un callejón sin salida: ARGOS decía "para abrir PackKey
   * necesito saber cuál en específico" y ahí se acababa el turno, sin ofrecer
   * nada y sin forma de dar el dato. Con las opciones puestas, el llamador
   * pregunta como en cualquier otra ambigüedad.
   */
  | { tipo: 'requiere_dato'; ruta: string; titulo: string; parametro: string; opciones?: CandidatoNav[] }
  /** Existe pero ARGOS no navega ahí por diseño (dev, auth, onboarding). */
  | { tipo: 'bloqueada'; ruta: string; motivo: string }
  /** Nada superó el piso. Se devuelven sugerencias para que el modelo decida. */
  | { tipo: 'sin_resultado'; sugerencias: CandidatoNav[] };

// ---------------------------------------------------------------------------
// Rutas que ARGOS NUNCA abre por petición en lenguaje natural
// ---------------------------------------------------------------------------

/**
 * Vetadas. No es seguridad (el gate real vive en cada pantalla), es criterio de
 * producto: un asistente que te manda al login, al onboarding o al paywall por
 * una frase ambigua rompe la sesión en vez de ayudarte. Y `/dev`, `/settings/dev`
 * y `/economy/admin` son superficies internas: si el usuario llega ahí por una
 * frase suelta, es un bug, no un atajo.
 */
export const RUTAS_VETADAS: ReadonlyMap<string, string> = new Map([
  ['/dev', 'pantalla interna de desarrollo'],
  ['/dev/goal-tree-smoke', 'pantalla interna de desarrollo'],
  ['/settings/dev', 'pantalla interna de desarrollo'],
  ['/economy/admin', 'panel interno de administración'],
  ['/feedback-dashboard', 'panel interno de administración'],
  ['/login', 'pantalla de sesión'],
  ['/register', 'pantalla de sesión'],
  ['/reset-password', 'pantalla de sesión'],
  ['/forgot-password', 'pantalla de sesión'],
  ['/paywall', 'pantalla de compra'],
  ['/argos/meet', 'presentación de ARGOS, corre una sola vez'],
]);

/** Prefijos vetados completos (todo el onboarding). */
const PREFIJOS_VETADOS: readonly string[] = ['/onboarding'];

export function rutaVetada(ruta: string): string | null {
  const directa = RUTAS_VETADAS.get(ruta);
  if (directa) return directa;
  for (const p of PREFIJOS_VETADOS) {
    if (ruta === p || ruta.startsWith(p + '/')) return 'flujo de bienvenida';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Títulos legibles
// ---------------------------------------------------------------------------

/**
 * Títulos de usuario. Las descripciones cosechadas traen ruido de tickets
 * ("MB-20 Pieza 1", "OLA3 · Anexo D") y no sirven como etiqueta. Estos son los
 * destinos de alto tráfico escritos a mano; el resto cae al prettify del slug.
 * Copy es-MX, sin em dash, sin nombres propios, sin nombres de padecimientos.
 */
export const TITULOS_RUTA: Readonly<Record<string, string>> = {
  '/': 'HOY, tu checklist del día',
  '/agenda': 'Agenda del día',
  '/argos-chat': 'Chat con ARGOS',
  '/argos/conversations': 'Historial de conversaciones',
  '/atp-orden': 'Mi orden de la sala ATP',
  '/braverman': 'Test de Braverman',
  '/braverman-premium': 'Reporte premium de Braverman',
  '/breathing': 'Respiración guiada',
  '/centro': 'El Centro ATP, instalar funciones',
  '/checkin': 'Check-in emocional',
  '/cocina': 'Cocina, recetas y lista de compra',
  '/comunidad/amigos': 'Amigos',
  '/comunidad/ranking': 'Ranking de la comunidad',
  '/cycle': 'Calendario del ciclo',
  '/cycle-charts': 'Gráficas del ciclo',
  '/cycle-history': 'Historial del ciclo',
  '/cycle-settings': 'Ajustes del ciclo',
  // PREMIUM (16-ago-2026): salieron /economy/convert, /economy/shop y
  // /economy/how-to-earn. Sus pantallas ya no existen y ARGOS mandaba a la
  // nada. Historial se queda, ahora de electrones.
  '/economy/history': 'Historial de electrones',
  '/edad-atp': 'Mi Edad ATP',
  '/edad-atp/biomarkers': 'Biomarcadores',
  '/edad-atp/labs': 'Mis análisis de laboratorio',
  '/edad-atp/tests': 'Pruebas físicas de Edad ATP',
  '/emotions': 'Emociones',
  '/emotion-history': 'Historial emocional',
  '/exercise-library': 'Biblioteca de ejercicios',
  '/fasting': 'Ayuno',
  '/ficha-emergencia': 'Ficha de emergencia',
  '/fitness-hub': 'Fitness',
  '/fitness-train': 'Entrenar ahora',
  '/food-log': 'Registrar comida',
  '/food-preferences': 'Preferencias de alimentación',
  '/glucose-log': 'Registrar glucosa',
  '/historia-clinica': 'Historia clínica',
  '/hoy-habitos': 'Mis hábitos del día',
  '/hydration': 'Hidratación',
  '/journal': 'Journal',
  '/journal-history': 'Historial del journal',
  '/ketones-log': 'Registrar cetonas',
  '/kit': 'Sala ATP',
  '/labs-guide': 'Guía de laboratorios',
  '/lista-compra': 'Lista de compra',
  '/medidas': 'Peso y medidas',
  '/meditation': 'Meditación',
  '/mente/nback': 'Entrenamiento N-Back',
  '/mente/progreso': 'Progreso de Mente',
  '/my-chronotype': 'Mi cronotipo',
  '/my-recipes': 'Mis recetas',
  '/my-routines': 'Mis rutinas',
  '/night-filter': 'Filtro nocturno',
  '/notifications': 'Notificaciones',
  '/nutrition': 'Nutrición',
  '/ordenar-dia': 'Ordenar mi día',
  '/plan-entrenamiento': 'Plan de entrenamiento',
  '/profile': 'Mi perfil',
  '/quizzes': 'Cuestionarios funcionales',
  '/redeem-code': 'Canjear código',
  '/reports': 'Reportes',
  '/salud': 'Salud',
  '/salud/diagnostico': 'Mi diagnóstico funcional',
  '/salud/evolucion': 'Mi evolución',
  '/salud/intervenciones': 'Mis intervenciones',
  '/salud/mi-expediente': 'Mi expediente',
  '/salud/mis-datos': 'Mis datos de salud',
  '/salud/mis-sintomas': 'Mis síntomas',
  '/salud/padecimientos': 'Mis padecimientos',
  '/settings': 'Ajustes',
  // SIMPLE (17-ago-2026): /settings/comunidad y /settings/cuenta son redirects.
  // Se sacan del mapa de títulos para que ARGOS mande al destino real y no
  // anuncie una pantalla que ya no existe. Los deep links viejos siguen
  // resolviendo por el stub.
  '/comunidad/ajustes': 'Mi perfil público de la Tribu',
  '/settings/conexiones': 'Conexiones y coach',
  '/settings/experiencia': 'Ajustes de experiencia',
  '/settings/legal': 'Avisos legales',
  '/settings/notifications': 'Ajustes de notificaciones',
  '/settings/privacy': 'Privacidad y datos',
  '/settings/salud': 'Ajustes de salud',
  '/settings/salud-conexion': 'Conectar con Salud del teléfono',
  '/settings/subscription': 'Mi suscripción',
  '/sleep': 'Sueño',
  '/solar': 'ATP SOL, exposición solar',
  '/supplements': 'Suplementos',
  '/tests': 'Tests',
  '/tribu': 'Tribu',
};

const PALABRAS_CORTAS_VALIDAS = new Set(['uv', 'sol', 'hr', 'iv', 'n']);

/** Prettify de slug para las rutas sin título curado. */
export function tituloDesdeRuta(ruta: string): string {
  if (ruta === '/') return 'HOY';
  const ultimo = ruta.split('/').filter(Boolean).pop() ?? ruta;
  const limpio = ultimo.replace(/\[|\]/g, '').replace(/[-_]+/g, ' ').trim();
  if (!limpio) return ruta;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export function tituloDe(ruta: string): string {
  return TITULOS_RUTA[ruta] ?? tituloDesdeRuta(ruta);
}

// ---------------------------------------------------------------------------
// Alias es-MX
// ---------------------------------------------------------------------------

/**
 * Cómo pide la gente las cosas, contra cómo se llaman los archivos. Sin esta
 * tabla, "dónde registro el ayuno" no encuentra `/fasting` jamás: no comparten
 * una sola letra. Es la pieza que traduce intención a ruta.
 *
 * Regla al agregar: alias en singular y en la forma en que se DICE, no en la
 * que se escribe en el código. Sin acentos (se normalizan igual, pero deja el
 * archivo legible).
 */
export const ALIAS_RUTA: Readonly<Record<string, readonly string[]>> = {
  '/': ['hoy', 'inicio', 'checklist', 'pendientes', 'tareas', 'home'],
  '/agenda': ['agenda', 'calendario', 'horario', 'itinerario'],
  '/fasting': ['ayuno', 'ayunar', 'ayunas', 'fasting', 'ventana'],
  '/hydration': ['agua', 'hidratacion', 'hidratarme', 'tomar agua', 'vasos'],
  '/food-log': ['comida', 'comer', 'registrar comida', 'desayuno', 'almuerzo', 'cena', 'alimento', 'macros', 'calorias'],
  '/nutrition': ['nutricion', 'alimentacion', 'dieta'],
  '/cocina': ['cocina', 'recetas', 'receta', 'despensa'],
  '/lista-compra': ['lista de compra', 'super', 'mandado', 'compras'],
  '/supplements': ['suplementos', 'suplemento', 'vitaminas', 'pastillas'],
  '/glucose-log': ['glucosa', 'azucar', 'glucometro', 'mg dl'],
  '/ketones-log': ['cetonas', 'cetosis', 'ketonas', 'gki'],
  '/medidas': ['peso', 'medidas', 'bascula', 'cintura', 'grasa corporal', 'pesarme'],
  '/sleep': ['sueno', 'dormir', 'descanso', 'insomnio', 'noche'],
  '/solar': ['sol', 'solar', 'uv', 'asolearme', 'exposicion solar', 'vitamina d'],
  '/breathing': ['respiracion', 'respirar', 'respiratorio', 'ejercicio de respiracion', 'coherencia cardiaca'],
  '/meditation': ['meditacion', 'meditar', 'nsdr', 'audios'],
  '/journal': ['journal', 'diario', 'escribir', 'gratitud', 'bitacora'],
  '/checkin': ['check in', 'checkin', 'como me siento', 'estado de animo'],
  '/emotions': ['emociones', 'emocion', 'animo', 'sentimientos'],
  '/mente/nback': ['nback', 'n back', 'memoria de trabajo', 'juego mental'],
  '/edad-atp': ['edad atp', 'mi edad', 'edad biologica', 'que edad tengo'],
  '/edad-atp/labs': ['analisis', 'laboratorio', 'laboratorios', 'labs', 'estudios', 'sangre', 'resultados de sangre'],
  '/edad-atp/biomarkers': ['biomarcadores', 'marcadores'],
  '/labs-guide': ['guia de laboratorio', 'que estudios pido'],
  '/salud/mis-datos': ['mis datos', 'datos de salud', 'signos', 'presion', 'temperatura'],
  '/salud/mi-expediente': ['expediente', 'mi expediente', 'historial de salud', 'timeline'],
  '/salud/mis-sintomas': ['sintomas', 'sintoma', 'me siento mal'],
  '/salud/padecimientos': ['padecimientos', 'diagnosticos previos', 'antecedentes'],
  '/salud/intervenciones': ['intervenciones', 'intervencion', 'que estoy haciendo'],
  '/salud/diagnostico': ['diagnostico funcional', 'mi diagnostico'],
  '/salud/evolucion': ['evolucion', 'como voy', 'tendencia'],
  '/historia-clinica': ['historia clinica', 'antecedentes familiares'],
  // '/protocol-explorer' salió (A-1): el concepto de catálogo de protocolos
  // se retiró con el pivote. "Mi protocolo" vive en /salud/intervenciones.
  '/ficha-emergencia': ['emergencia', 'ficha de emergencia', 'contacto de emergencia'],
  '/fitness-hub': ['fitness', 'ejercicio', 'entrenar', 'gimnasio', 'gym'],
  '/fitness-train': ['entrenar ahora', 'empezar entrenamiento', 'rutina de hoy'],
  '/my-routines': ['mis rutinas', 'rutinas', 'rutina'],
  '/exercise-library': ['biblioteca de ejercicios', 'como se hace', 'tecnica'],
  '/plan-entrenamiento': ['plan de entrenamiento', 'mi plan'],
  '/fitness-cardio': ['cardio', 'correr', 'caminar', 'trote'],
  '/fitness-strength': ['fuerza', 'pesas', 'levantamiento'],
  '/fitness-hiit': ['hiit', 'intervalos'],
  '/cycle': ['ciclo', 'menstruacion', 'regla', 'periodo', 'ciclo menstrual'],
  '/cycle-settings': ['ajustes del ciclo', 'configurar ciclo'],
  '/braverman': ['braverman', 'neurotransmisores', 'test de braverman'],
  '/quizzes': ['cuestionarios', 'quiz', 'quizzes', 'evaluaciones'],
  '/tests': ['tests', 'pruebas'],
  '/my-chronotype': ['cronotipo', 'mi cronotipo', 'soy leon o lobo'],
  '/reports': ['reportes', 'reporte', 'graficas', 'estadisticas', 'resumen'],
  '/hoy-habitos': ['habitos', 'habito', 'electrones', 'que trackeo', 'agregar habito'],
  '/ordenar-dia': ['ordenar mi dia', 'reordenar', 'limpiar el dia', 'reposo'],
  '/centro': ['centro', 'instalar', 'activar funcion', 'agregar app', 'que tiene la app'],
  '/kit': ['sala atp', 'kit', 'mis apps', 'ecosistema'],
  '/atp-orden': ['ordenar apps', 'mi orden', 'acomodar la sala'],
  '/tribu': ['tribu', 'comunidad'],
  '/comunidad/ranking': ['ranking', 'tabla de posiciones', 'leaderboard'],
  '/comunidad/amigos': ['amigos', 'seguir'],
  // PREMIUM (16-ago-2026): se fueron los sinónimos de tienda, conversión y
  // "cómo gano protones". Reconocerlos sin destino que ofrecer era peor que no
  // reconocerlos: ARGOS entendía y luego no podía llevarte a ningún lado.
  '/economy/history': ['historial de electrones', 'que he ganado'],
  '/settings/notifications': ['notificaciones', 'avisos', 'recordatorios', 'alertas', 'configurar notificaciones', 'silenciar'],
  '/settings/privacy': ['privacidad', 'mis datos personales', 'consentimiento', 'borrar cuenta', 'exportar datos'],
  '/settings/experiencia': ['tema', 'modo oscuro', 'modo claro', 'apariencia', 'sonidos', 'vibracion'],
  // "cuenta" y "cerrar sesion" ahora son el hub: las tres filas de la pantalla
  // /settings/cuenta viven ahí desde el 17-ago-2026.
  '/settings': ['ajustes', 'configuracion', 'opciones', 'preferencias', 'cuenta', 'mi cuenta', 'cerrar sesion'],
  '/settings/subscription': ['suscripcion', 'plan', 'pago', 'facturacion', 'membresia', 'mi membresia'],
  '/settings/conexiones': ['coach', 'entrenador', 'conectar coach', 'clinico'],
  '/settings/salud-conexion': ['health connect', 'healthkit', 'reloj', 'apple salud', 'sincronizar salud', 'conectar reloj', 'conectar health', 'pasos'],
  '/settings/salud': ['ajustes de salud', 'modo completo', 'modo completo de salud', 'modo completo de nutricion'],
  '/comunidad/ajustes': ['perfil publico', 'quien me ve', 'visibilidad', 'nombre de usuario', 'ajustes de comunidad'],
  '/night-filter': ['filtro nocturno', 'luz azul', 'pantalla naranja'],
  '/notifications': ['bandeja de notificaciones', 'novedades'],
  '/profile': ['perfil', 'mi perfil', 'mis datos personales'],
  '/redeem-code': ['canjear', 'codigo', 'codigo de activacion'],
  '/argos-chat': ['argos', 'chat', 'hablar con argos', 'preguntar'],
  '/argos/conversations': ['conversaciones', 'historial de chat'],
  '/afiliados/mi-codigo': ['mi codigo de afiliado', 'referidos'],
  '/afiliados/dashboard': ['afiliados', 'comisiones'],
};

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

/** minúsculas, sin acentos, sin puntuación, espacios colapsados. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Muletillas de navegación y gramática. Se van porque no discriminan: "llévame
 * a donde veo mis análisis" y "análisis" deben resolver igual.
 */
export const PALABRAS_VACIAS: ReadonlySet<string> = new Set([
  'llevame', 'lleva', 'llevar', 'donde', 'quiero', 'ir', 'vamos', 'vete',
  'a', 'al', 'la', 'el', 'los', 'las', 'de', 'del', 'en', 'mi', 'mis', 'me', 'te',
  'que', 'como', 'cual', 'cuales', 'puedo', 'puedes', 'veo', 'ver', 'vea', 'viendo',
  'abre', 'abrir', 'abreme', 'muestra', 'muestrame', 'ensename', 'enseno',
  'pantalla', 'seccion', 'apartado', 'app', 'aplicacion', 'esta', 'este', 'esto',
  'eso', 'esa', 'ese', 'esos', 'esas', 'aquello', 'algo', 'cosa',
  'es', 'esta', 'para', 'con', 'sin', 'y', 'o', 'un', 'una', 'unos', 'unas', 'por',
  'se', 'lo', 'le', 'tengo', 'hay', 'busco', 'buscar', 'necesito', 'favor', 'porfa',
  'hacer', 'haz', 'poner', 'pon', 'quiere', 'dime', 'sobre', 'aqui', 'ahi', 'alli',
  'sirve', 'funciona', 'parte', 'lugar', 'sitio', 'boton', 'opcion',
  'atp', 'the', 'of',
]);

/**
 * Singularizador conservador de español. "hábito" y "hábitos" son la misma
 * intención y sin esto son dos tokens que nunca se cruzan.
 *
 * Se aplica IGUAL al índice y a la consulta, así que aunque el stem sea feo
 * ("reportes" -> "report") ambos lados caen en el mismo cubo y el match ocurre.
 * Por eso no importa que no sea lingüísticamente correcto, importa que sea
 * determinista. Las palabras invariables en -is (análisis, crisis) se dejan
 * intactas: cortarles la s las rompe.
 */
export function singularizar(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith('is')) return token;
  if (token.endsWith('es') && token.length > 5) return token.slice(0, -2);
  if (token.endsWith('s')) return token.slice(0, -1);
  return token;
}

export function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((t) => t.length > 0 && !PALABRAS_VACIAS.has(t))
    .filter((t) => t.length >= 3 || PALABRAS_CORTAS_VALIDAS.has(t))
    .map(singularizar);
}

/**
 * Limpia el ruido interno de una descripción cosechada antes de indexarla:
 * códigos de ticket, siglas de sprint y referencias de archivo. Si no se
 * quitan, "MB" y "OLA" se vuelven tokens con IDF altísimo y una consulta que
 * los mencione por accidente arrastra pantallas al azar.
 */
export function limpiarDescripcion(desc: string): string {
  return desc
    .replace(/\b(MB|CC|FIX|QW|OLA|CB|DX|T)-?\d+[a-zA-Z]?\b/g, ' ')
    .replace(/#v?\d+[a-zA-Z]?\b/g, ' ')
    .replace(/\bPieza\s+\d+(\.\d+)?\b/gi, ' ')
    .replace(/\bAnexo\s+[A-Z]\b/gi, ' ')
    .replace(/\bSprint\b/gi, ' ')
    .replace(/\bfase\s+\d+\b/gi, ' ')
    .replace(/\b[a-zA-Z-]+\.tsx?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Índice
// ---------------------------------------------------------------------------

const PESO_ALIAS = 6;
const PESO_SLUG = 4;
const PESO_TITULO = 3;
const PESO_DESC = 1;

export interface EntradaIndice {
  ruta: string;
  titulo: string;
  dinamica: boolean;
  parametro?: string;
  pesos: ReadonlyMap<string, number>;
}

function sumar(mapa: Map<string, number>, tokens: string[], peso: number): void {
  for (const t of tokens) {
    mapa.set(t, (mapa.get(t) ?? 0) + peso);
  }
}

function construirEntrada(
  ruta: string,
  dinamica: boolean,
  /** NAV-2: las rutas expandidas traen su propio título y su propio corpus, que
   *  vienen de la fuente de verdad y no del docblock de una pantalla. */
  override?: { titulo?: string; descripcion?: string },
): EntradaIndice {
  const titulo = override?.titulo ?? tituloDe(ruta);
  const pesos = new Map<string, number>();

  sumar(pesos, tokenizar(ruta.replace(/\//g, ' ').replace(/[-_]/g, ' ')), PESO_SLUG);
  sumar(pesos, tokenizar(titulo), PESO_TITULO);

  for (const alias of ALIAS_RUTA[ruta] ?? []) {
    sumar(pesos, tokenizar(alias), PESO_ALIAS);
  }

  const desc = override?.descripcion ?? APP_ROUTE_DESCRIPTIONS[ruta];
  if (desc) sumar(pesos, tokenizar(limpiarDescripcion(desc)), PESO_DESC);

  const param = dinamica ? (ruta.match(/\[([^\]]+)\]/)?.[1] ?? 'dato') : undefined;
  return { ruta, titulo, dinamica, parametro: param, pesos };
}

/**
 * Entrada de una ruta EXPANDIDA. No usa los pesos normales a propósito.
 *
 * La superficie ("reporte", "pack", "evaluación") entra con peso de alias porque
 * es lo único que discrimina: es la palabra que separa "el ayuno" de "el reporte
 * del ayuno". El valor y el título entran con peso de descripción, el más bajo,
 * porque el valor ya le pertenece a una pantalla principal que casi siempre es
 * el destino correcto. Sin esta asimetría, "llévame a donde registro el ayuno"
 * se vuelve ambigua entre /fasting y /reports/ayuno: medido, no supuesto.
 */
function construirEntradaExpandida(e: RutaExpandida): EntradaIndice {
  const pesos = new Map<string, number>();
  for (const s of SUPERFICIE_PLANTILLA[e.plantilla] ?? []) {
    sumar(pesos, tokenizar(s), PESO_ALIAS);
  }
  sumar(pesos, tokenizar(e.ruta.replace(/\//g, ' ').replace(/[-_]/g, ' ')), PESO_DESC);
  sumar(pesos, tokenizar(e.titulo), PESO_DESC);
  if (e.descripcion) sumar(pesos, tokenizar(limpiarDescripcion(e.descripcion)), PESO_DESC);
  for (const alias of ALIAS_RUTA[e.ruta] ?? []) sumar(pesos, tokenizar(alias), PESO_ALIAS);
  return { ruta: e.ruta, titulo: e.titulo, dinamica: false, pesos };
}

let _indice: EntradaIndice[] | null = null;
let _df: Map<string, number> | null = null;

/**
 * Índice memoizado. Se construye una vez por proceso.
 *
 * NAV-2: LAS PLANTILLAS YA NO ENTRAN. Antes se metían los 10 moldes con los
 * corchetes puestos (`/reports/[dominio]`), y de ahí salían como candidatos
 * tocables que terminaban en un `router.push` a una ruta inexistente. Un molde
 * no es un destino y no tiene nada que hacer en un catálogo de destinos.
 *
 * Lo que entra en su lugar son las rutas RESUELTAS
 * (`argos-nav-dinamicas-core`): `/reports/ayuno`, `/packs/dormir-mejor`,
 * `/tests/run/plank`. Existen de verdad, tienen título de verdad y las ofrece
 * el mismo ranking que a todas las demás. Con la bandera apagada simplemente no
 * hay expansiones: ARGOS pierde esos destinos, pero nunca ofrece uno roto.
 */
/**
 * ALIAS-1: ¿esta ruta es un alias 1:1 limpio (excluible del indice)?
 * Exportada para que el candado de cobertura del test espejee LA MISMA regla
 * en vez de reimplementarla y desincronizarse.
 */
export function esAliasPuro(ruta: string): boolean {
  const d = APP_ROUTE_ALIASES[ruta];
  return !!d && !d.includes('?');
}

export function obtenerIndice(): EntradaIndice[] {
  if (_indice) return _indice;
  const entradas: EntradaIndice[] = [];
  for (const r of APP_ROUTES) {
    if (rutaVetada(r)) continue;
    // ALIAS-1 (20-ago-2026): un alias no es un destino. Una cuarta parte de
    // las rutas del mapa son stubs que redirigen a otra (APP_ROUTE_ALIASES,
    // detectados por el generador). Antes competían en el ranking como
    // pantallas: seis rutas distintas llevaban a /tests repartiéndose el
    // puntaje.
    //
    // La regla exacta, y las dos excepciones salieron de la suite, no de la
    // teoría: se excluye SOLO el alias 1:1 limpio (destino leído y SIN query).
    //  - destino null (runtime): SE QUEDA, o su vocabulario se tira.
    //  - destino con '?' (/lista-compra -> /cocina?tab=lista): SE QUEDA,
    //    porque el alias carga un parámetro que el destino pelón no tiene;
    //    mandar a /cocina sin tab NO es lo que el usuario pidió.
    if (esAliasPuro(r)) continue;
    entradas.push(construirEntrada(r, false));
  }
  if (ARGOS_RESUELVE_RUTAS_DINAMICAS) {
    for (const e of expandirTodas()) {
      if (rutaVetada(e.ruta)) continue;
      entradas.push(construirEntradaExpandida(e));
    }
  }
  // ALIAS-1: el nombre del alias es como la gente CONOCE ese lugar
  // ("biblioteca", "perfil", "progreso"). Ese vocabulario no se tira: se le
  // suma al destino real con peso de alias, para que "llevame a biblioteca"
  // llegue a /my-routines en vez de a ningun lado.
  const porRuta = new Map(entradas.map((e) => [e.ruta, e]));
  for (const [alias, destino] of Object.entries(APP_ROUTE_ALIASES)) {
    if (!esAliasPuro(alias)) continue; // sigue en el índice: donar duplicaría
    const dueno = porRuta.get((destino as string).split('?')[0]);
    if (!dueno) continue; // el destino no está en el índice (vetado o dinámico)
    sumar(dueno.pesos as Map<string, number>, tokenizar(alias.replace(/\//g, ' ').replace(/[-_]/g, ' ')), PESO_ALIAS);
    // CUATRO-OJOS (20-ago): el vocabulario A MANO del alias también se dona.
    // Sin esto, "entrenar ahora", "correr" o "cuestionarios" (ALIAS_RUTA de
    // rutas ahora excluidas) morían en silencio y la suite no lo veía.
    for (const palabra of ALIAS_RUTA[alias] ?? []) {
      sumar(dueno.pesos as Map<string, number>, tokenizar(palabra), PESO_ALIAS);
    }
  }
  _indice = entradas;
  return entradas;
}

function obtenerDf(): Map<string, number> {
  if (_df) return _df;
  const df = new Map<string, number>();
  for (const e of obtenerIndice()) {
    for (const t of e.pesos.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  _df = df;
  return df;
}

/** Solo para tests: tira la memoización. */
export function _resetIndice(): void {
  _indice = null;
  _df = null;
}

/**
 * ¿Esta palabra suelta nombra algo que existe en la app? (VOZ-1)
 *
 * La usa el detector de intención para saber DÓNDE cae el destino dentro de la
 * frase, que es lo que separa "muéstrame el ayuno" (petición) de "el ayuno me
 * lleva a dormir mal" (consulta). El vocabulario ya está construido: son las
 * llaves del df, o sea todo lo que el índice de rutas conoce. No hay una
 * segunda lista que se pueda desincronizar de la primera.
 *
 * Devuelve false para muletillas y palabras cortas, porque `tokenizar` ya las
 * tira: preguntar por "de" o "mi" no dice nada sobre la posición del destino.
 */
export function esTokenDeDestino(palabra: string): boolean {
  const t = tokenizar(palabra);
  if (t.length !== 1) return false;
  return (obtenerDf().get(t[0]) ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Resolución
// ---------------------------------------------------------------------------

/** Piso para considerar que una consulta encontró algo. */
export const UMBRAL_MINIMO = 3;
/** Cuánto debe superar el primero al segundo para navegar sin preguntar. */
export const FACTOR_DOMINANCIA = 1.45;
/** Cuántos candidatos se ofrecen cuando hay que preguntar. */
export const MAX_CANDIDATOS = 3;
/**
 * Fracción mínima de la consulta que el ganador debe explicar para navegar.
 *
 * Sin esto, "quiero pedir una pizza hawaiana" navegaba a la guía de
 * laboratorios: de tres palabras, una sola ("pedir") pegaba con un alias, y
 * como el puntaje se promedia entre los tokens, un acierto raro alcanzaba para
 * cruzar el umbral. Pedir la mitad de cobertura mata esa clase entera de falso
 * positivo sin tocar las consultas legítimas.
 *
 * OJO CON EL DENOMINADOR: la cobertura se mide contra los tokens CONOCIDOS (los
 * que existen en algún lado del índice), no contra todas las palabras que dijo
 * el usuario. Medirla contra todas castigaba frases perfectamente claras: en
 * "dónde apunto el agua que tomé", "apunto" y "tome" no existen en la app, y
 * arrastraban la cobertura a 1/3 aunque "agua" señalara Hidratación sin ninguna
 * duda. Las palabras que la app no conoce son ruido del hablante, no evidencia
 * de que le hayamos entendido mal. Si NINGÚN token es conocido, no hay match y
 * se corta antes de puntuar.
 */
export const COBERTURA_MINIMA = 0.5;

export interface Puntuacion {
  puntaje: number;
  /** Cuántos tokens de la consulta explicó esta entrada. */
  aciertos: number;
  /** Peso de la señal más fuerte que pegó (alias > slug > título > descripción). */
  pesoMaximo: number;
}

export function puntuar(entrada: EntradaIndice, tokens: string[], df: Map<string, number>, total: number): Puntuacion {
  if (tokens.length === 0) return { puntaje: 0, aciertos: 0, pesoMaximo: 0 };
  let suma = 0;
  let aciertos = 0;
  let pesoMaximo = 0;
  for (const t of tokens) {
    const peso = entrada.pesos.get(t);
    if (!peso) continue;
    aciertos++;
    if (peso > pesoMaximo) pesoMaximo = peso;
    const idf = Math.log(1 + total / (1 + (df.get(t) ?? 0)));
    suma += peso * idf;
  }
  return { puntaje: suma / tokens.length, aciertos, pesoMaximo };
}

/**
 * Resuelve una petición en lenguaje natural contra el catálogo de rutas.
 *
 * Nunca adivina: si el primero no le saca FACTOR_DOMINANCIA al segundo,
 * devuelve `ambigua` y el llamador tiene que preguntar. Ese es el contrato.
 */
export function resolverDestino(consulta: string): ResultadoNav {
  const tokens = tokenizar(consulta ?? '');
  if (tokens.length === 0) return { tipo: 'sin_resultado', sugerencias: [] };

  const indice = obtenerIndice();
  const df = obtenerDf();
  const total = indice.length;

  // Solo los tokens que la app reconoce cuentan para la cobertura (ver
  // COBERTURA_MINIMA). Si no queda ninguno, el usuario habló de algo que no
  // existe aquí y no hay nada que resolver.
  const conocidos = tokens.filter((t) => (df.get(t) ?? 0) > 0);
  if (conocidos.length === 0) return { tipo: 'sin_resultado', sugerencias: [] };

  const puntuados: (CandidatoNav & { cobertura: number })[] = [];
  for (const e of indice) {
    const p = puntuar(e, tokens, df, total);
    if (p.puntaje > 0) {
      puntuados.push({
        ruta: e.ruta,
        titulo: e.titulo,
        puntaje: p.puntaje,
        cobertura: p.aciertos / conocidos.length,
      });
    }
  }
  // NAV-2: EL ORDEN PONDERA LA COBERTURA, no solo el puntaje.
  //
  // La cobertura ya existía, pero solo como PISO. Faltaba usarla para ordenar, y
  // sin eso "llévame a mi reporte de ayuno" quedaba ambigua entre /reports/ayuno
  // (explica las dos palabras) y /fasting (explica una, pero esa una es rara y
  // pesada). Explicar toda la frase es evidencia de haber entendido; explicar la
  // mitad con un acierto caro es la definición del falso positivo que
  // COBERTURA_MINIMA ya trataba de matar. Ponderar aquí es la misma doctrina,
  // aplicada al ranking y no solo al umbral.
  //
  // Va bajo la misma bandera que las expansiones: apagarla devuelve el orden
  // exacto de antes. El puntaje que se reporta sigue siendo el crudo, para que
  // el umbral y los logs signifiquen lo mismo que siempre.
  const orden = (c: { puntaje: number; cobertura: number }) =>
    ARGOS_RESUELVE_RUTAS_DINAMICAS ? c.puntaje * c.cobertura : c.puntaje;
  // Desempate por ruta para que el resultado sea estable entre corridas.
  puntuados.sort((a, b) => (orden(b) - orden(a)) || a.ruta.localeCompare(b.ruta));

  // NAV-2, puerta de salida: nada con corchetes sale de aquí como opción.
  // Las plantillas ya no entran al índice, así que este filtro no debería quitar
  // nunca nada. Está porque el precio de equivocarse es un `router.push` a una
  // ruta que no existe, y ese es el bug que estamos cerrando: si mañana alguien
  // vuelve a meter moldes al índice, se queda en el índice y no llega al usuario.
  const desnudos = (n: number) =>
    puntuados
      .filter((c) => !esPlantilla(c.ruta))
      .slice(0, n)
      .map(({ ruta, titulo, puntaje }) => ({ ruta, titulo, puntaje }));

  const mejor = puntuados[0];
  if (!mejor || mejor.puntaje < UMBRAL_MINIMO || mejor.cobertura < COBERTURA_MINIMA) {
    return { tipo: 'sin_resultado', sugerencias: desnudos(MAX_CANDIDATOS) };
  }

  const segundo = puntuados[1];
  const domina = !segundo || orden(mejor) >= orden(segundo) * FACTOR_DOMINANCIA;
  if (!domina) {
    return { tipo: 'ambigua', candidatos: desnudos(MAX_CANDIDATOS) };
  }

  const entrada = indice.find((e) => e.ruta === mejor.ruta)!;
  if (entrada.dinamica) {
    return {
      tipo: 'requiere_dato',
      ruta: entrada.ruta,
      titulo: entrada.titulo,
      parametro: entrada.parametro ?? 'dato',
    };
  }

  return { tipo: 'resuelta', ruta: mejor.ruta, titulo: mejor.titulo, puntaje: mejor.puntaje };
}

/**
 * Las expansiones de UNA plantilla, ordenadas por qué tanto explican la
 * consulta original. Reusa el índice y el mismo `puntuar` que el camino local:
 * las expansiones ya viven en el índice, así que no hay un segundo ranking que
 * se pueda desincronizar del primero.
 */
function opcionesDePlantilla(plantilla: string, consulta?: string): CandidatoNav[] {
  if (!ARGOS_RESUELVE_RUTAS_DINAMICAS) return [];
  const expansiones: RutaExpandida[] = expandirPlantilla(plantilla);
  if (expansiones.length === 0) return [];
  const rutas = new Set(expansiones.map((e) => e.ruta));

  const tokens = tokenizar(consulta ?? '');
  if (tokens.length > 0) {
    const indice = obtenerIndice();
    const df = obtenerDf();
    const puntuados = indice
      .filter((e) => rutas.has(e.ruta))
      .map((e) => ({ ruta: e.ruta, titulo: e.titulo, puntaje: puntuar(e, tokens, df, indice.length).puntaje }))
      .filter((c) => c.puntaje > 0)
      .sort((a, b) => (b.puntaje - a.puntaje) || a.ruta.localeCompare(b.ruta));
    if (puntuados.length > 0) return puntuados.slice(0, MAX_CANDIDATOS);
  }

  // Sin consulta con la que rankear: se ofrecen las primeras, en orden estable.
  return expansiones.slice(0, MAX_CANDIDATOS).map((e) => ({ ruta: e.ruta, titulo: e.titulo, puntaje: 0 }));
}

/**
 * Valida que una ruta propuesta por el MODELO exista de verdad y sea navegable.
 * El modelo alucina rutas plausibles (`/mis-analisis`) que no existen; sin este
 * filtro ARGOS navegaría a 404 con toda confianza.
 *
 * NAV-2, dos cosas nuevas:
 *  · Una ruta CONCRETA de las que nacen de una plantilla (`/reports/ayuno`) ya
 *    se acepta. Antes caía en `sin_resultado`: el modelo contestaba bien y
 *    nosotros le decíamos que no existía.
 *  · Una PLANTILLA (`/reports/[dominio]`) ya no es un callejón. Si la consulta
 *    original alcanza para elegir una expansión con claridad, se navega ahí; si
 *    no, se devuelven las opciones para preguntar.
 */
export function validarRutaPropuesta(
  ruta: string | null | undefined,
  /** El texto del usuario, para poder resolver el parámetro de una plantilla. */
  consulta?: string,
): ResultadoNav {
  if (!ruta || typeof ruta !== 'string') return { tipo: 'sin_resultado', sugerencias: [] };
  const limpia = ruta.trim().split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  const motivo = rutaVetada(limpia);
  if (motivo) return { tipo: 'bloqueada', ruta: limpia, motivo };

  if (APP_ROUTES.includes(limpia)) {
    return { tipo: 'resuelta', ruta: limpia, titulo: tituloDe(limpia), puntaje: UMBRAL_MINIMO };
  }

  const dinamica = APP_ROUTES_DYNAMIC.find((d) => d === limpia);
  if (dinamica) {
    const opciones = opcionesDePlantilla(dinamica, consulta);
    const mejor = opciones[0];
    const segundo = opciones[1];
    if (mejor && mejor.puntaje > 0 && (!segundo || mejor.puntaje >= segundo.puntaje * FACTOR_DOMINANCIA)) {
      return { tipo: 'resuelta', ruta: mejor.ruta, titulo: mejor.titulo, puntaje: mejor.puntaje };
    }
    return {
      tipo: 'requiere_dato',
      ruta: dinamica,
      titulo: tituloDe(dinamica),
      parametro: dinamica.match(/\[([^\]]+)\]/)?.[1] ?? 'dato',
      opciones,
    };
  }

  // NAV-2: una ruta concreta que salió de una plantilla es un destino legítimo.
  if (ARGOS_RESUELVE_RUTAS_DINAMICAS) {
    const expandida = expandirTodas().find((e) => e.ruta === limpia || e.ruta.split('?')[0] === limpia);
    if (expandida) {
      return { tipo: 'resuelta', ruta: expandida.ruta, titulo: expandida.titulo, puntaje: UMBRAL_MINIMO };
    }
  }

  return { tipo: 'sin_resultado', sugerencias: [] };
}
