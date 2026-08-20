/**
 * packs — el registro declarativo del motor de packs (MB-25 Pieza 1).
 *
 * Un pack configura la app completa de un jalón: instala apps, enciende
 * hábitos con su hora, fija metas y configura avisos. Es un REGISTRO DE
 * DATOS, no código por pack: el mismo mecanismo lo reusan los paquetes de
 * salud (MB-28) y el futuro de protocolos.
 *
 * Reglas del modelo:
 *  · `key` es estable y JAMÁS cambia (vive en user_packs y en deep links).
 *  · `nombre` y todo el copy están PENDIENTES DE FIRMA (Enrique + Mariana):
 *    por eso key estable y nombre string — cambiar un nombre firmado es
 *    cambiar un string, nunca una llave.
 *  · `instala` referencia llaves de APP_REGISTRY; `enciende` referencia
 *    llaves de ELECTRON_WEIGHTS. El contrato vive en
 *    __tests__/packs-registry.test.ts: una llave rota truena en CI.
 *  · Las horas son RELATIVAS a la vida del usuario (despertar / dormir) y
 *    se vuelven absolutas en la entrada de tres preguntas (pack-core).
 *  · La regla de nombres es dura: cero padecimientos en llaves, copy y
 *    comentarios de este archivo (criterio MedicalDisclaimer, y hay un
 *    test que barre el archivo completo).
 *
 * Módulo de datos puros: los imports de tipos se borran en compilación.
 * Testeable en node sin montar nada.
 */
import type { ElectronSource } from '@/src/constants/electrons';
import type { AvisoAppKey } from '@/src/services/app-avisos-service';
import type { AppIconName } from '@/src/components/ui/app-icon-names';

/** Ancla de una hora relativa: la vida del usuario, no el reloj. */
export type PackAncla = 'despertar' | 'dormir';

export interface PackHora {
  ancla: PackAncla;
  /** Minutos desde el ancla. Negativo = antes (ej. dormir −90). */
  offsetMin: number;
}

export interface PackHabito {
  /** Llave de ELECTRON_WEIGHTS. */
  electron: ElectronSource;
  /**
   * Los core se encienden en intensidad "suave" (3 por pack); el resto solo
   * con "con todo". El contrato exige exactamente 3 core por pack.
   */
  core: boolean;
  /**
   * Hora relativa del hábito en el día del usuario. Los hábitos por evento
   * (registro de glucosa, subir labs, evaluación) no llevan hora: se hacen
   * cuando tocan, no a una hora fija — declararles una sería inventar.
   */
  hora?: PackHora;
}

/**
 * Metas que el pack fija, SIEMPRE por los servicios que ya existen:
 * proteína → protein-goal-service · agua → hydration-service ·
 * ayuno → fasting-service. Una meta sin writer no se declara aquí: se
 * reporta (ventana de sueño la fija el cronotipo; "cocina cerrada" y el
 * corte de cafeína no tienen writer hoy).
 */
export type PackMetaDef =
  | { tipo: 'proteina_g'; valor: number }
  | { tipo: 'agua_ml'; valor: number }
  | { tipo: 'ayuno_h'; valor: number };

/**
 * Avisos del pack sobre user_app_notification_prefs vía updateAppAviso.
 * Tipado contra AvisoAppKey: solo las apps con aviso V1 (meditar, respirar,
 * journal, sol) compilan. EL MAESTRO GENERAL SIGUE MANDANDO (planAppAviso).
 */
export interface PackAviso {
  app: AvisoAppKey;
  hora: PackHora;
}

export interface PackDef {
  /** Estable para siempre. */
  key: string;
  /** ⚠️ PEND-FIRMA Mariana. Cambiarlo = cambiar este string. */
  nombre: string;
  /** ⚠️ PEND-FIRMA. Una línea: para quién es este pack. */
  paraQuien: string;
  /** ⚠️ PEND-FIRMA. Qué esperar, honesto y del cuerpo: solo lo que la app hace. */
  queEsperar: string;
  /**
   * Nombre lógico del set de iconos (<AppIcon>). Los packs no tienen dibujo
   * propio: cada uno se presenta con el icono de su función más
   * representativa — la regla de MB-19.2 (ningún Ionicon a mano) aplica
   * también aquí, y el censo de iconos la vigila.
   */
  icon: AppIconName;
  /** Llaves de APP_REGISTRY que se instalan en la sala ATP. */
  instala: string[];
  /** Hábitos del pack, con su intensidad y su hora relativa. */
  enciende: PackHabito[];
  /** Metas que el pack fija por los servicios existentes. */
  metas: PackMetaDef[];
  /**
   * Practicas de Mi Protocolo que este caso de uso enciende (llaves de
   * INTERVENTIONS_CATALOG). Es la pieza que faltaba: sin esto, elegir un
   * pack configuraba la app pero no ponia NADA en el dia, y la unica via
   * era escoger a mano entre 88 (decision del dueno, 20-ago-2026: el
   * usuario nunca ve la lista cruda). Reglas del registro, con candado en
   * packs-registry.test.ts: la llave existe en el catalogo, jamas una con
   * requiresClinicalValidation, y las modalidades entran por la puerta
   * suave de su familia (ayuno_14_10, no ayuno_20_4).
   * ⚠️ PEND-FIRMA (Enrique + Mariana): el set de cada pack.
   */
  prescribe?: readonly string[];
  /**
   * Casos de uso que NO se combinan con este (llaves de PACK_BY_KEY).
   * Simetrico por candado: si A excluye a B, B excluye a A. Hoy ninguno
   * declara exclusiones; el mecanismo queda listo para el catalogo de 20.
   */
  excluye?: readonly string[];
  /** Avisos que el pack configura (restricción: pocos y con condición). */
  avisos: PackAviso[];
  /**
   * En qué se fija ARGOS para este pack. Se guarda desde ya; su consumo en
   * contexto es de MB-31, no de este run.
   */
  argosFoco: string;
}

export type PackIntensidad = 'suave' | 'con_todo';

/**
 * Techo de casos de uso activos a la vez. Tres dias distintos armados al
 * mismo tiempo ya no son un dia: son una lista de pendientes. La entrada
 * de packs lo usa para frenar con explicacion, no para bloquear en seco.
 */
export const MAX_CASOS_ACTIVOS = 3;

export const INTENSIDAD_LABELS: Record<PackIntensidad, string> = {
  suave: 'Suave',
  con_todo: 'Con todo',
};

/**
 * Los cinco packs sin bloqueo estructural (CASOS_DE_USO_10_PERFILES).
 *
 * Criterio del copy (el de la ficha del Centro): honesto, del cuerpo, sin
 * jerga y sin promesas. Describe lo que la app HACE, verificable en su
 * código, nunca un beneficio inventado. Donde hay hueco se dice (la hora
 * de dormir es lo accionable sin wearable; el score de N-Back se registra,
 * no se promete que suba).
 *
 * ⚠️ PEND-FIRMA (Enrique + Mariana) antes de tiendas:
 *   · los cinco `nombre` (la regla de nombres: cero padecimientos),
 *   · `paraQuien` y `queEsperar` de cada pack,
 *   · `argosFoco` (se guarda hoy, lo consume MB-31),
 *   · horas relativas y valores de metas (propuesta con los defaults
 *     actuales de la app: proteína 150 g, agua 2500 ml).
 * Cambiar cualquier texto firmado = cambiar un string; la `key` no se toca.
 *
 * Longevidad: el hueco reportado en MB-25 (instalar `edad-atp`, que aún no
 * era app) se pagó en MB-29 P3: la app existe y el pack ya la instala.
 */
export const PACKS: PackDef[] = [
  {
    key: 'bajar-revoluciones',
    // ⚠️ PEND-FIRMA: renombrado de "Bajar revoluciones" (veto directo del
    // dueno, 20-ago-2026: nombres reales, del resultado).
    nombre: 'Controlar el estrés',
    paraQuien: 'Para quien no puede apagar la cabeza al final del día.',
    queEsperar:
      'Tu día gana tres momentos de pausa: respirar, un check-in de cómo vienes y unos minutos de meditación. En la noche, escribir y soltar pantallas antes de dormir.',
    icon: 'respirar',
    instala: ['respirar', 'meditar', 'emociones', 'journal', 'sueno'],
    enciende: [
      { electron: 'breathwork', core: true, hora: { ancla: 'dormir', offsetMin: -90 } },
      { electron: 'checkin', core: true, hora: { ancla: 'despertar', offsetMin: 120 } },
      { electron: 'meditation', core: true, hora: { ancla: 'despertar', offsetMin: 15 } },
      { electron: 'journal', core: false, hora: { ancla: 'dormir', offsetMin: -75 } },
      { electron: 'screen_time_cutoff', core: false, hora: { ancla: 'dormir', offsetMin: -60 } },
    ],
    metas: [],
    avisos: [
      { app: 'respirar', hora: { ancla: 'dormir', offsetMin: -90 } },
      { app: 'meditar', hora: { ancla: 'despertar', offsetMin: 15 } },
    ],
    argosFoco: 'Qué días se dispara la coordenada del check-in y qué los precede.',
    // ⚠️ PEND-FIRMA (set propuesto): bajar el ritmo se practica, no se desea.
    prescribe: ['respiracion_478', 'coherencia_cardiaca_5_5', 'journal_pm', 'nsdr_10min', 'green_time_30min'],
  },
  {
    key: 'dormir-mejor',
    // ⚠️ PEND-FIRMA: renombrado de "Dormir mejor": el resultado que la
    // persona quiere es profundidad, no un adverbio.
    nombre: 'Dormir profundo',
    paraQuien: 'Para quien duerme sus horas y aun así amanece cansado.',
    queEsperar:
      'Luz de mañana temprano, corte de pantallas en la noche y una rutina para bajar el ritmo antes de acostarte. La app registra tu hora real de dormir, que es lo accionable sin wearable.',
    icon: 'sueno',
    instala: ['sueno', 'meditar', 'respirar', 'sol', 'suplementos'],
    enciende: [
      { electron: 'sleep', core: true, hora: { ancla: 'dormir', offsetMin: -30 } },
      { electron: 'sunlight', core: true, hora: { ancla: 'despertar', offsetMin: 30 } },
      { electron: 'screen_time_cutoff', core: true, hora: { ancla: 'dormir', offsetMin: -60 } },
      { electron: 'red_glasses', core: false, hora: { ancla: 'dormir', offsetMin: -120 } },
      { electron: 'breathwork', core: false, hora: { ancla: 'dormir', offsetMin: -90 } },
    ],
    metas: [],
    avisos: [
      { app: 'sol', hora: { ancla: 'despertar', offsetMin: 30 } },
      { app: 'respirar', hora: { ancla: 'dormir', offsetMin: -90 } },
    ],
    argosFoco: 'La distancia entre tu hora objetivo de dormir y la real, y qué la mueve.',
    // ⚠️ PEND-FIRMA (set propuesto): palancas de higiene circadiana, puerta suave.
    prescribe: ['exposicion_solar_matutina', 'pantallas_off_60min', 'cerrar_comida_3h_antes_dormir', 'blackout_total_cuarto', 'respiracion_478'],
  },
  {
    key: 'energia-estable',
    nombre: 'Energía estable',
    paraQuien: 'Para quien arranca fuerte y a media tarde se apaga.',
    queEsperar:
      'Proteína y agua con meta clara, registro de glucosa con contexto y luz de mañana. Al registrar comida y glucosa, tus tardes empiezan a explicarse con datos tuyos.',
    icon: 'glucosa',
    instala: ['comida', 'glucosa', 'ayuno', 'sueno', 'sol', 'labs'],
    enciende: [
      { electron: 'protein', core: true, hora: { ancla: 'despertar', offsetMin: 420 } },
      { electron: 'water', core: true, hora: { ancla: 'despertar', offsetMin: 90 } },
      { electron: 'glucose_log', core: true },
      { electron: 'sunlight', core: false, hora: { ancla: 'despertar', offsetMin: 30 } },
      { electron: 'sleep', core: false, hora: { ancla: 'dormir', offsetMin: -30 } },
    ],
    metas: [
      { tipo: 'proteina_g', valor: 150 },
      { tipo: 'agua_ml', valor: 2500 },
    ],
    avisos: [],
    argosFoco: 'Qué comidas preceden la caída de energía de la tarde.',
    // ⚠️ PEND-FIRMA (set propuesto): la tarde se arregla en la mañana y en la mesa.
    prescribe: ['hidratacion_matutina', 'exposicion_solar_matutina', 'caminata_postprandial', 'ayuno_14_10', 'ducha_fria_nivel1'],
  },
  {
    key: 'foco-claridad',
    nombre: 'Foco y claridad',
    paraQuien: 'Para quien trabaja con la cabeza y siente que perdió filo.',
    queEsperar:
      'Una sesión corta de memoria de trabajo al día, meditación y sueño con hora protegida. Tu score de N-Back queda registrado en el tiempo para ver si se mueve.',
    icon: 'nback',
    instala: ['nback', 'meditar', 'sueno', 'ayuno', 'comida', 'emociones'],
    enciende: [
      { electron: 'nback', core: true, hora: { ancla: 'despertar', offsetMin: 120 } },
      { electron: 'meditation', core: true, hora: { ancla: 'despertar', offsetMin: 15 } },
      { electron: 'sleep', core: true, hora: { ancla: 'dormir', offsetMin: -30 } },
      { electron: 'screen_time_cutoff', core: false, hora: { ancla: 'dormir', offsetMin: -60 } },
      { electron: 'protein', core: false, hora: { ancla: 'despertar', offsetMin: 420 } },
    ],
    metas: [],
    avisos: [{ app: 'meditar', hora: { ancla: 'despertar', offsetMin: 15 } }],
    argosFoco: 'El score de N-Back contra las noches que durmió bien.',
    // ⚠️ PEND-FIRMA (set propuesto): entrenar el foco y protegerlo del ruido.
    prescribe: ['n_back_challenge', 'physiological_sigh', 'pausas_activas_90min', 'binaurales_beta'],
  },
  {
    key: 'longevidad',
    nombre: 'Cumplir años sin envejecer',
    paraQuien: 'Para quien ya está bien y quiere saber si va ganando o perdiendo.',
    queEsperar:
      'Tus estudios y evaluaciones en un solo lugar, sol de mañana, fuerza y sueño. Con laboratorios subidos, tus números se siguen en el tiempo.',
    icon: 'labs',
    // MB-29 P3: edad-atp ya es app instalable — el pack del perfil 10 queda
    // completo (era su hueco reportado desde MB-25).
    instala: ['edad-atp', 'labs', 'protocolos', 'sol', 'ayuno', 'cetonas', 'entrenar', 'sueno'],
    enciende: [
      { electron: 'lab_upload', core: true },
      { electron: 'functional_quiz', core: true },
      { electron: 'sunlight', core: true, hora: { ancla: 'despertar', offsetMin: 30 } },
      { electron: 'strength', core: false, hora: { ancla: 'despertar', offsetMin: 180 } },
      { electron: 'sleep', core: false, hora: { ancla: 'dormir', offsetMin: -30 } },
      { electron: 'intervention', core: false },
    ],
    metas: [],
    avisos: [{ app: 'sol', hora: { ancla: 'despertar', offsetMin: 30 } }],
    argosFoco: 'Qué mueve su Edad ATP y qué no.',
    // ⚠️ PEND-FIRMA (set propuesto): musculo, zona 2 y plato antiinflamatorio.
    prescribe: ['zona_2_aerobica', 'levantamiento_compuesto', 'sardinas_pescados_grasos', 'eliminar_aceites_vegetales', 'meta_pasos_8k'],
  },
];

/**
 * Los paquetes de salud (MB-29 Pieza 4). MISMO mecanismo, mismo motor:
 * pack, protocolo y paquete de salud son la misma cosa (decisión tomada).
 * Instalan el grupo de apps que se usan juntas: quien quiere seguir su
 * glucosa necesita Glucosa, Cetonas, Comida y Labs, no las nueve por
 * separado.
 *
 * Van en arreglo propio porque su puerta es distinta: la entrada de tres
 * preguntas (/packs/armar) ofrece los cinco de estilo de vida; estos se
 * descubren en el Centro. La ficha (/packs/[packKey]) y aplicarPack los
 * tratan igual: viven en el mismo PACK_BY_KEY.
 *
 * ⚠️ PEND-FIRMA (Enrique + Mariana): nombre, paraQuien, queEsperar y
 * argosFoco de los tres, ANTES de que el copy sea definitivo. Las llaves
 * son estables y no se tocan. Regla dura de nombres: cero padecimientos
 * (el barrido de este archivo también los cubre).
 */
export const PAQUETES_SALUD: PackDef[] = [
  {
    // Completa el perfil 7 (CASOS_DE_USO): su trabajo es el reporte de MB-29 P1.
    key: 'cuidar-glucosa',
    nombre: 'Cuidar mi glucosa',
    paraQuien: 'Para quien quiere ver su glucosa en datos y llegar a su consulta con todo registrado.',
    queEsperar:
      'Registras glucosa con contexto, comida y ayuno. Tus labs viven en un solo lugar y el PDF con tus registros sale listo para tu consulta. ATP registra y grafica: la lectura la hace tu médico.',
    icon: 'glucosa',
    instala: ['glucosa', 'comida', 'ayuno', 'cetonas', 'labs', 'entrenar', 'reportes'],
    enciende: [
      { electron: 'glucose_log', core: true },
      { electron: 'protein', core: true, hora: { ancla: 'despertar', offsetMin: 420 } },
      { electron: 'no_processed_foods', core: true },
      { electron: 'water', core: false, hora: { ancla: 'despertar', offsetMin: 90 } },
      { electron: 'strength', core: false, hora: { ancla: 'despertar', offsetMin: 180 } },
      { electron: 'lab_upload', core: false },
    ],
    metas: [
      { tipo: 'proteina_g', valor: 150 },
      { tipo: 'ayuno_h', valor: 12 },
    ],
    avisos: [],
    argosFoco: 'Qué comidas mueven la glucosa de esta persona en particular.',
    // ⚠️ PEND-FIRMA (set propuesto): lo que mas mueve glucosa sin tocar farmacos.
    prescribe: ['caminata_postprandial', 'ayuno_14_10', 'eliminar_aceites_vegetales', 'masticar_mas_20'],
  },
  {
    key: 'entender-sintomas',
    nombre: 'Entender lo que siento',
    paraQuien: 'Para quien trae molestias sueltas y quiere verlas juntas, con raíz y con plan.',
    queEsperar:
      'Registras lo que sientes, contestas la evaluación por sistemas y tu mapa funcional junta las piezas. De ahí salen prácticas concretas para correr en tu día.',
    icon: 'sintomas',
    instala: ['sintomas', 'mapa-funcional', 'cuestionario', 'padecimientos', 'protocolos'],
    enciende: [
      { electron: 'functional_quiz', core: true },
      { electron: 'intervention', core: true },
    ],
    metas: [],
    avisos: [],
    argosFoco: 'Qué síntomas se repiten y con qué registros coinciden.',
  },
  {
    key: 'salud-en-orden',
    nombre: 'Mi salud en orden',
    paraQuien: 'Para quien quiere su historia, sus labs y sus registros a la mano en la consulta.',
    queEsperar:
      'Tu historia, tus padecimientos y tus laboratorios quedan capturados en un solo lugar, y el PDF con tus registros del periodo sale listo para compartir.',
    icon: 'historia-clinica',
    instala: ['historia-clinica', 'padecimientos', 'labs', 'evaluaciones', 'reportes'],
    enciende: [{ electron: 'lab_upload', core: true }],
    metas: [],
    avisos: [],
    argosFoco: 'Qué partes del expediente siguen vacías y cuáles ya aportan datos.',
  },
];

/** Lookup por llave: los cinco de estilo de vida + los paquetes de salud. */
export const PACK_BY_KEY: Record<string, PackDef> = Object.fromEntries(
  [...PACKS, ...PAQUETES_SALUD].map((p) => [p.key, p])
);

/** Los hábitos que la intensidad enciende: suave = solo los core. */
export function habitosPorIntensidad(pack: PackDef, intensidad: PackIntensidad): PackHabito[] {
  return intensidad === 'suave' ? pack.enciende.filter((h) => h.core) : pack.enciende;
}
