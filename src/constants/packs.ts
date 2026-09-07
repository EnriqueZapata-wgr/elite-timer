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

/**
 * La senal que la persona VA A VER moverse por seguir este objetivo, y en
 * cuanto se empieza a notar. Regla dura de CASOS_DE_USO_DESTINOS (20-ago-2026):
 * un objetivo solo existe si la persona puede VER moverse algo por seguirlo.
 */
export interface PackSenal {
  /** Una linea, en el idioma de la persona. "Tu hora real de dormir contra tu hora objetivo". */
  que: string;
  /** Llave de APP_REGISTRY donde vive ese numero. La UI resuelve la ruta. */
  dondeApp: string;
  /** Honesto, del documento de destinos: "2 semanas", "1 a 3 meses", "Inmediato". */
  seNotaEn: string;
}

/**
 * Lo que este objetivo NO instala, y por que. Es la fila que define el pack
 * (CASOS_DE_USO_10_PERFILES): cualquiera hace una lista de lo que ayuda, lo
 * dificil es decidir que se queda fuera aunque tambien ayude.
 */
export interface PackFuera {
  /** Que se deja fuera, en el idioma de la persona. */
  que: string;
  /** Por que se deja fuera. Una linea. */
  porque: string;
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
   * Prácticas de Mi Protocolo que este objetivo enciende (llaves de
   * INTERVENTIONS_CATALOG). Es la pieza que faltaba: sin esto, elegir un
   * pack configuraba la app pero no ponía NADA en el día, y la única vía
   * era escoger a mano entre 88 (decisión del dueño, 20-ago-2026: el
   * usuario nunca ve la lista cruda). Reglas del registro, con candado en
   * packs-registry.test.ts: la llave existe en el catálogo, jamás una con
   * requiresClinicalValidation, y las modalidades entran por la puerta
   * suave de su familia (ayuno_14_10, no ayuno_20_4).
   * ⚠️ PEND-FIRMA (Enrique + Mariana): el set de cada pack.
   */
  prescribe?: readonly string[];
  /**
   * Objetivos que NO se combinan con este (llaves de PACK_BY_KEY).
   * Simétrico por candado: si A excluye a B, B excluye a A. Hoy ninguno
   * declara exclusiones; el mecanismo queda listo para el catálogo de 20.
   */
  excluye?: readonly string[];
  /** Avisos que el pack configura (restricción: pocos y con condición). */
  avisos: PackAviso[];
  /**
   * En qué se fija ARGOS para este pack. Se guarda desde ya; su consumo en
   * contexto es de MB-31, no de este run.
   */
  argosFoco: string;
  /**
   * OBLIGATORIO (pivote 7-sep-2026): la señal que la persona va a ver
   * moverse. Sale tal cual de la tabla de CASOS_DE_USO_DESTINOS para los 8
   * que ya existían; para los 12 nuevos el `seNotaEn` es propuesta y va
   * ⚠️ PEND-FIRMA Mariana (esa tabla no traía tiempos).
   */
  mide: PackSenal;
  /**
   * OBLIGATORIO (pivote 7-sep-2026): lo que se deja fuera A PROPÓSITO. Un
   * objetivo de quince cosas se abandona en una semana; la fila que lo
   * define es esta, no la de lo que instala. Solo cosas que de verdad
   * ayudarían: listar lo irrelevante no sirve de nada.
   * ⚠️ PEND-FIRMA (Enrique): el criterio de cada exclusión.
   */
  noInstala: readonly PackFuera[];
  /**
   * Solo se ofrece a quien puede ver el módulo de ciclo (7-sep-2026).
   *
   * Existe porque sin él la entrada de tres preguntas hacía `PACKS.map` sin
   * filtro y un hombre veía "Mi ciclo a mi favor" entre sus opciones. El
   * criterio es el MISMO que `visibleApps` usa para la app Ciclo: sexo
   * biológico femenino o modo de ciclo instalado. No se resuelve aquí porque
   * este módulo es de datos puros y no toca la base: lo resuelve la pantalla
   * que ofrece los objetivos, y el candado del test exige que el único que lo
   * declara sea el del ciclo.
   */
  soloConCiclo?: boolean;
}

export type PackIntensidad = 'suave' | 'con_todo';

/**
 * Techo de objetivos activos a la vez. No sube con el catálogo: 7-sep-2026,
 * pasar de 8 a 20 objetivos multiplica lo que se puede elegir, no lo que se
 * puede sostener en un día. Tres días distintos armados al
 * mismo tiempo ya no son un día: son una lista de pendientes. La entrada
 * de packs lo usa para frenar con explicación, no para bloquear en seco.
 */
export const MAX_CASOS_ACTIVOS = 3;

export const INTENSIDAD_LABELS: Record<PackIntensidad, string> = {
  suave: 'Suave',
  con_todo: 'Con todo',
};

/**
 * Los objetivos que ofrece la entrada de tres preguntas.
 *
 * 7-sep-2026 (pivote aprobado por el dueño): son DIECISÉIS, no cinco. Se sale
 * con los 20 del documento de destinos, repartidos entre este arreglo (16) y
 * PAQUETES_SALUD (4). La palabra que ve la persona es OBJETIVO: nunca "pack",
 * nunca "caso de uso". En código la llave sigue siendo `pack` donde ya existe,
 * porque renombrar símbolos que viven en user_packs y en deep links cuesta
 * migración y no cambia nada de lo que la persona lee.
 *
 * Criterio del copy (el de la ficha del Centro): honesto, del cuerpo, sin
 * jerga y sin promesas. Describe lo que la app HACE, verificable en su
 * código, nunca un beneficio inventado. Donde hay hueco se dice (la hora
 * de dormir es lo accionable sin wearable; el score de N-Back se registra,
 * no se promete que suba).
 *
 * ⚠️ PEND-FIRMA (Enrique + Mariana) antes de tiendas:
 *   · los veinte `nombre` (la regla de nombres: cero padecimientos),
 *   · `paraQuien` y `queEsperar` de cada pack,
 *   · `argosFoco` (se guarda hoy, lo consume MB-31),
 *   · horas relativas y valores de metas (propuesta con los defaults
 *     actuales de la app: proteína 150 g, agua 2500 ml).
 * Cambiar cualquier texto firmado = cambiar un string; la `key` no se toca.
 *
 * Longevidad: el hueco reportado en MB-25 (instalar `edad-atp`, que aún no
 * era app) se pagó en MB-29 P3: la app existe y el pack ya la instala.
 *
 * ⛔ NO VOLVER A METER `protocolos` EN NINGÚN `instala` (7-sep-2026).
 * Mi Protocolo dejó de ser pantalla por decisión del dueño: la persona ve su
 * OBJETIVO, no la lista cruda de prácticas. La entrada salió de APP_REGISTRY y
 * la ruta es un redirect a HOY, así que instalarla dejaría un mosaico que
 * lleva a ninguna parte. Las prácticas que un objetivo enciende siguen vivas:
 * viajan por `prescribe` y aterrizan en el día, que es justo el punto del
 * pivote. Si alguien la reescribe, el candado de APP_REGISTRY truena en CI.
 */
export const PACKS: PackDef[] = [
  {
    key: 'bajar-revoluciones',
    // ⚠️ PEND-FIRMA: renombrado de "Bajar revoluciones" (veto directo del
    // dueño, 20-ago-2026: nombres reales, del resultado).
    nombre: 'Controlar el estrés',
    paraQuien: 'Para quien no puede apagar la cabeza al final del día.',
    queEsperar:
      'Tu día gana tres momentos de pausa: respirar, un check-in de cómo vienes y unos minutos de meditación. En la noche, escribir y soltar pantallas antes de dormir.',
    icon: 'respirar',
    // 7-sep-2026: entra `rachas` (sale `sueno`, que este objetivo no enciende
    // ni mide). /emotions es captura y no guarda histórico: la constancia del
    // check-in y de la respiración solo se ve con historia en las rachas de
    // mente, cuyas categorías son justo journal, respiración, meditación y
    // check-in. Este renglón no venía en la lista de los nueve y es el mismo
    // error, así que se corrige parejo.
    instala: ['respirar', 'meditar', 'emociones', 'journal', 'rachas'],
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
    // Señal y tiempo: renglón 1 de CASOS_DE_USO_DESTINOS (20-ago-2026), tal cual.
    mide: {
      que: 'Tu racha de check-in y de respiración, día tras día.',
      dondeApp: 'rachas',
      seNotaEn: '1 a 2 semanas',
    },
    noInstala: [
      {
        que: 'Comida y Glucosa',
        porque:
          'Registrar cada comida ayuda a casi todo, pero aquí suma trabajo diario a alguien que ya trae la cabeza llena.',
      },
      {
        que: 'Entrenar y Cardio',
        porque:
          'Moverte baja el ritmo, y aun así se queda fuera: este objetivo se gana con tres pausas cortas al día, no con una hora más de agenda.',
      },
      {
        que: 'Labs',
        porque:
          'Un estudio no te dice cómo vienes hoy, y este objetivo se juega en el día de hoy.',
      },
    ],
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
      // 7-sep-2026: SALIÓ `red_glasses`. Su gemela en el catálogo,
      // `lentes_rojos`, tiene requiresClinicalValidation y sigue esperando la
      // firma de Mariana. El candado solo vigilaba `prescribe`, así que la
      // firma se estaba brincando por la puerta de `enciende`: encender el
      // hábito es pedirle a la persona que haga la práctica, igual que
      // prescribirla. Vuelve el día que Mariana firme `lentes_rojos`, y hasta
      // entonces el test lo impide (ver ELECTRON_GEMELO en el contrato).
      { electron: 'breathwork', core: false, hora: { ancla: 'dormir', offsetMin: -90 } },
    ],
    metas: [],
    avisos: [
      { app: 'sol', hora: { ancla: 'despertar', offsetMin: 30 } },
      { app: 'respirar', hora: { ancla: 'dormir', offsetMin: -90 } },
    ],
    argosFoco: 'La distancia entre tu hora objetivo de dormir y la real, y qué la mueve.',
    // Señal y tiempo: renglón 2 de CASOS_DE_USO_DESTINOS (20-ago-2026), tal cual.
    mide: {
      que: 'Tu hora real de dormir contra tu hora objetivo.',
      dondeApp: 'sueno',
      seNotaEn: '2 semanas',
    },
    noInstala: [
      {
        que: 'Journal',
        porque:
          'Escribir de noche calma, pero pide encender la pantalla justo en la hora que este objetivo quiere apagarla.',
      },
      {
        que: 'Comida y Glucosa',
        porque:
          'Lo que cenas mueve tu sueño, y aun así se queda fuera: dos registros nuevos en la noche compiten con el único cambio que importa aquí, acostarte a tu hora.',
      },
      {
        que: 'Entrenar, 1RM y Récords',
        porque:
          'Perseguir marcas mete al día una exigencia más, y este objetivo se trata de quitarlas al final de la tarde.',
      },
    ],
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
    // 7-sep-2026: la tarde se arregla en la mañana. El aviso V1 solo cubre
    // meditar, respirar, journal y sol; de esas, la única que este objetivo
    // enciende es la luz de la mañana, así que es la única que avisa.
    avisos: [{ app: 'sol', hora: { ancla: 'despertar', offsetMin: 30 } }],
    argosFoco: 'Qué comidas preceden la caída de energía de la tarde.',
    // Señal y tiempo: renglón 3 de CASOS_DE_USO_DESTINOS (20-ago-2026), tal cual.
    mide: {
      que: 'Tus tardes contra tus comidas y tu glucosa registradas.',
      dondeApp: 'glucosa',
      seNotaEn: '2 a 3 semanas',
    },
    noInstala: [
      {
        que: 'Entrenar, 1RM y Récords',
        porque:
          'La fuerza sostiene la energía, y aun así se queda fuera: quien ya se apaga a las cuatro necesita primero comer y dormir distinto, no una sesión más que cumplir.',
      },
      {
        que: 'N-Back',
        porque:
          'Mide la cabeza, no la tarde. La señal de este objetivo es cómo te sientes a las cuatro, y esa ya la registras en un toque.',
      },
      {
        que: 'Ciclo',
        porque:
          'Es un objetivo aparte y tiene su propia entrada; mezclarlo aquí escondería el patrón que este objetivo busca.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): la tarde se arregla en la mañana y en la mesa.
    prescribe: ['hidratacion_matutina', 'exposicion_solar_matutina', 'caminata_postprandial', 'ayuno_14_10', 'ducha_fria_nivel1'],
    // 7-sep-2026: primera exclusión declarada del catálogo, y es de coherencia
    // conmigo mismo. Los dos miden en glucosa, y este objetivo prescribe
    // `ayuno_14_10` mientras `sin-sueno-despues-de-comer` deja el ayuno fuera
    // justo porque esconde la señal que ese otro objetivo quiere leer.
    // Activarlos juntos sería pedirle a la persona que ayune y que no ayune.
    excluye: ['sin-sueno-despues-de-comer'],
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
    // Señal y tiempo: renglón 4 de CASOS_DE_USO_DESTINOS (20-ago-2026), tal cual.
    mide: {
      que: 'Tu score de N-Back en el tiempo.',
      dondeApp: 'nback',
      seNotaEn: '3 a 4 semanas',
    },
    noInstala: [
      {
        que: 'Entrenar, Cardio y Récords',
        porque:
          'Moverte le hace bien a la cabeza, y aun así se queda fuera: este objetivo ya pide una sesión cognitiva diaria y una hora de dormir protegida, y agregar el gimnasio encima es lo que hace que se abandone.',
      },
      {
        que: 'Glucosa y Labs',
        porque:
          'Explicarían por qué se te va el filo, pero tardan semanas en decirlo y aquí ya tienes un número tuyo que se mueve todos los días.',
      },
      {
        que: 'Journal',
        porque:
          'Escribir ordena las ideas, y este objetivo prefiere gastar ese rato en la única medición cognitiva que la app registra.',
      },
    ],
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
    // 7-sep-2026: salió `protocolos` (ver nota de arriba). Entra `evaluaciones`
    // en su lugar y no es relleno: este objetivo enciende `functional_quiz`
    // como core y hasta hoy no instalaba ninguna app donde ver esa evaluación
    // contestada en el tiempo. La deuda estaba, solo que tapada.
    instala: ['edad-atp', 'labs', 'evaluaciones', 'sol', 'ayuno', 'cetonas', 'entrenar', 'sueno'],
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
    // Señal y tiempo: renglón 5 de CASOS_DE_USO_DESTINOS (20-ago-2026), tal cual.
    mide: {
      que: 'Tu Edad ATP y sus sub-edades.',
      dondeApp: 'edad-atp',
      seNotaEn: '1 a 3 meses',
    },
    // 7-sep-2026: el perfil 10 es el único que "sí quiere todo"
    // (CASOS_DE_USO_10_PERFILES). Lo que se le niega no son apps: son atajos.
    noInstala: [
      {
        que: 'Las versiones agresivas de cada práctica',
        porque:
          'Ayuno largo, frío extremo y zona 5 dan más de lo mismo, y aquí el objetivo se juega en años: se entra por la puerta suave de cada familia y se sube después.',
      },
      {
        que: 'Metas de proteína y agua fijadas por nosotros',
        porque:
          'Quien lleva sus estudios ya tiene sus números; imponerle los nuestros le quitaría lo único que este objetivo respeta, su propio dato.',
      },
      {
        que: 'Prisa por un resultado semanal',
        porque:
          'La Edad ATP se mueve con laboratorios, y forzar una lectura semanal daría ruido en vez de tendencia.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): músculo, zona 2 y plato antiinflamatorio.
    prescribe: ['zona_2_aerobica', 'levantamiento_compuesto', 'sardinas_pescados_grasos', 'eliminar_aceites_vegetales', 'meta_pasos_8k'],
  },

  // ===========================================================================
  // Los objetivos 9 a 19 (pivote 7-sep-2026). Salen de la tabla de los 12
  // candidatos de CASOS_DE_USO_DESTINOS (20-ago-2026): nombre, lo que dice la
  // persona y la señal que se mueve son de esa tabla. Lo que NO traía esa
  // tabla y por lo tanto es propuesta:
  //   · `seNotaEn` de los doce (⚠️ PEND-FIRMA Mariana),
  //   · `noInstala` completo (⚠️ PEND-FIRMA Enrique),
  //   · el set de `prescribe` (⚠️ PEND-FIRMA Enrique + Mariana).
  // Regla que se respetó en todos: modalidad por la puerta suave de su
  // familia, y jamás una práctica con validación clínica pendiente.
  // El objetivo 20 vive en PAQUETES_SALUD: su puerta es el Centro, no la
  // entrada de tres preguntas.
  // ===========================================================================

  {
    key: 'fuerza-que-se-nota',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 9.
    nombre: 'Fuerza que se nota',
    paraQuien: 'Para quien entrena y quiere estar fuerte de verdad, no solo cansado.',
    queEsperar:
      'Registras tus levantamientos y tus récords por ejercicio, con la proteína y el sueño que los sostienen. Tu 1RM estimado queda en el tiempo para ver si sube.',
    icon: 'entrenar',
    instala: ['entrenar', 'rm', 'records', 'comida', 'suplementos', 'sueno'],
    enciende: [
      { electron: 'strength', core: true, hora: { ancla: 'despertar', offsetMin: 180 } },
      { electron: 'protein', core: true, hora: { ancla: 'despertar', offsetMin: 420 } },
      { electron: 'sleep', core: true, hora: { ancla: 'dormir', offsetMin: -30 } },
      { electron: 'supplements', core: false, hora: { ancla: 'despertar', offsetMin: 60 } },
      { electron: 'water', core: false, hora: { ancla: 'despertar', offsetMin: 90 } },
    ],
    metas: [{ tipo: 'proteina_g', valor: 150 }],
    // 7-sep-2026: VACÍO a propósito. El aviso V1 solo cubre meditar, respirar,
    // journal y sol (AvisoAppKey) y este objetivo no enciende ninguna. La hora
    // de entrenar es del calendario de la persona, no de un aviso nuestro.
    avisos: [],
    argosFoco: 'Si la carga sube y si la proteína la acompaña.',
    mide: {
      que: 'Tus récords por ejercicio y tu 1RM estimado.',
      dondeApp: 'records',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '6 a 8 semanas',
    },
    noInstala: [
      {
        que: 'Ayuno',
        porque:
          'Ayunar sirve para casi todo lo demás, y aquí se queda fuera: cerrar la ventana pelea con la proteína del día, que es la palanca de este objetivo.',
      },
      {
        que: 'Glucosa y Cetonas',
        porque:
          'Son buenos datos, y no dicen nada de si tu barra sube. Suman dos registros diarios sin mover la señal que sí importa aquí.',
      },
      {
        que: 'Cardio largo',
        porque:
          'El aguante se entrena aparte y tiene su propio objetivo; encimarlo aquí reparte la recuperación que tu fuerza necesita.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): la barra, el agarre y la carga que se camina.
    prescribe: ['levantamiento_compuesto', 'farmers_walk', 'death_hang'],
  },
  {
    key: 'aguante-de-verdad',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 10.
    nombre: 'Aguante de verdad',
    paraQuien: 'Para quien se queda sin aire subiendo escaleras y quiere condición otra vez.',
    queEsperar:
      'Sesiones de zona 2 y una meta de pasos que se puede sostener. La app acumula tus minutos de zona 2 por semana para que veas cuánto llevas.',
    icon: 'cardio',
    // 7-sep-2026: entra `reportes`. La app Cardio es la de REGISTRO
    // (/log-cardio); zonas, minutos por zona y VO2max viven en /fitness-cardio,
    // que no es entrada del registro. Quien sí acumula por rango es el dominio
    // entrenamiento de Reportes, que lee cardio_sessions con fecha.
    instala: ['cardio', 'entrenar', 'sueno', 'comida', 'hidratacion', 'reportes'],
    enciende: [
      { electron: 'cardio', core: true, hora: { ancla: 'despertar', offsetMin: 180 } },
      { electron: 'steps', core: true, hora: { ancla: 'despertar', offsetMin: 480 } },
      { electron: 'sleep', core: true, hora: { ancla: 'dormir', offsetMin: -30 } },
      { electron: 'water', core: false, hora: { ancla: 'despertar', offsetMin: 90 } },
      { electron: 'protein', core: false, hora: { ancla: 'despertar', offsetMin: 420 } },
    ],
    metas: [{ tipo: 'agua_ml', valor: 2500 }],
    // 7-sep-2026: VACÍO a propósito. Ninguna de las cuatro apps con aviso V1
    // es de este objetivo, y la meta de pasos se cumple caminando durante el
    // día: un aviso a hora fija llegaría cuando la persona ya iba caminando.
    avisos: [],
    argosFoco: 'Cuánta zona 2 junta por semana y qué semanas se le cae.',
    mide: {
      // 7-sep-2026: SEÑAL AJUSTADA. La tabla de destinos pedía "zona 2
      // acumulada por semana y FC en reposo". Se revisó: los minutos por zona
      // no viven en ninguna app del registro, y la FC en reposo es una caja
      // que se captura a mano, sin serie. Lo que la app SÍ acumula por rango
      // son las sesiones. Es más modesto y es verdad.
      que: 'Tus sesiones de cardio y de fuerza en el rango, contra tu meta de la semana.',
      dondeApp: 'reportes',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '4 a 6 semanas',
    },
    noInstala: [
      {
        que: 'Zona 5 y VO2max',
        porque:
          'Sube el aguante más rápido que nada, y se queda fuera a propósito: el catálogo la marca solo para gente ya entrenada, y quien dice que le falta condición no lo está todavía.',
      },
      {
        que: '1RM y Récords',
        porque:
          'La fuerza máxima se mide con otra vara. Aquí el número es lo que acumulas en la semana, no lo que levantaste un martes.',
      },
      {
        que: 'Glucosa y Labs',
        porque:
          'Explicarían tu fatiga, y aun así se quedan fuera: registrar comidas y subir estudios el mismo mes en que arrancas a moverte es la fricción que tira el hábito nuevo.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): base aeróbica, pasos y no estar sentado.
    prescribe: ['zona_2_aerobica', 'meta_pasos_8k', 'pausas_activas_90min'],
  },
  {
    key: 'sin-sueno-despues-de-comer',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 11.
    nombre: 'Sin sueño después de comer',
    paraQuien: 'Para quien come y a los veinte minutos ya no sirve para nada.',
    queEsperar:
      'Registras la comida, mides tu glucosa alrededor de ella y marcas cómo llegaste a la tarde. Con las dos cosas registradas, tu bajón deja de ser un misterio.',
    icon: 'comida',
    instala: ['comida', 'glucosa', 'emociones', 'hidratacion', 'sueno'],
    enciende: [
      { electron: 'glucose_log', core: true },
      { electron: 'protein', core: true, hora: { ancla: 'despertar', offsetMin: 420 } },
      { electron: 'checkin', core: true, hora: { ancla: 'despertar', offsetMin: 540 } },
      { electron: 'water', core: false, hora: { ancla: 'despertar', offsetMin: 90 } },
      { electron: 'no_processed_foods', core: false },
    ],
    metas: [{ tipo: 'proteina_g', valor: 150 }],
    // 7-sep-2026: VACÍO a propósito. Lo que habría que recordar es caminar
    // diez minutos DESPUÉS de comer, y eso depende de a qué hora comió: no
    // existe todavía el aviso por evento, y ponerlo a hora fija sería inventar.
    avisos: [],
    argosFoco: 'Qué comidas preceden el bajón y cuáles no.',
    mide: {
      que: 'Tu glucosa después de comer junto con tu energía de la tarde.',
      dondeApp: 'glucosa',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '1 a 2 semanas',
    },
    noInstala: [
      {
        que: 'Ayuno',
        porque:
          'Saltarte la comida quita el bajón de inmediato, y por eso se queda fuera: esconde el problema en vez de mostrarlo, y aquí queremos ver qué pasa cuando comes.',
      },
      {
        que: 'Entrenar y Cardio',
        porque:
          'Moverte ayuda mucho, y aun así se queda fuera: este objetivo se juega en la mesa y en los diez minutos siguientes, y meter el gimnasio diluye la única prueba que queremos correr.',
      },
      {
        que: 'Labs',
        porque:
          'El número que quieres ver moverse es de hoy en la tarde, no de tu próximo estudio.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): lo que la tabla de destinos pone en el renglón 11.
    prescribe: ['caminata_postprandial', 'masticar_mas_20', 'cerrar_comida_3h_antes_dormir'],
    // 7-sep-2026: el otro lado de la exclusión (el candado la exige simétrica).
    excluye: ['energia-estable'],
  },
  {
    key: 'digestion-ligera',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 12.
    nombre: 'Digestión ligera',
    paraQuien: 'Para quien trae la panza pesada casi todos los días y ya se acostumbró.',
    queEsperar:
      'Registras cómo te cae lo que comes y corres tres prácticas cortas alrededor de la mesa. Tus registros quedan en el tiempo para ver si la pesadez baja de frecuencia.',
    icon: 'sintomas',
    // 7-sep-2026: este objetivo es nuevo y nunca instaló `protocolos`; se
    // escribió sin app de lista de prácticas porque esa pantalla ya no existe.
    // Entra `reportes`: es el único lugar con serie por rango de lo que este
    // objetivo mueve (dominios hidratación y nutrición).
    instala: ['sintomas', 'comida', 'hidratacion', 'journal', 'reportes'],
    enciende: [
      { electron: 'no_processed_foods', core: true },
      { electron: 'water', core: true, hora: { ancla: 'despertar', offsetMin: 90 } },
      { electron: 'intervention', core: true },
      { electron: 'journal', core: false, hora: { ancla: 'dormir', offsetMin: -75 } },
      { electron: 'sleep', core: false, hora: { ancla: 'dormir', offsetMin: -30 } },
    ],
    metas: [{ tipo: 'agua_ml', valor: 2500 }],
    // 7-sep-2026: el único aviso V1 que este objetivo puede usar de verdad es
    // journal, y aquí sirve: anotar de noche cómo cayó el día es el registro
    // con el que se ve el patrón.
    avisos: [{ app: 'journal', hora: { ancla: 'dormir', offsetMin: -75 } }],
    argosFoco: 'Qué comidas y qué horarios coinciden con tus registros de pesadez.',
    mide: {
      // 7-sep-2026: SEÑAL AJUSTADA. /salud/mis-sintomas da de alta y lista por
      // estado; NO calcula "qué tan seguido aparecen" ni pinta serie. Se pasa a
      // lo que sí se ve con historia: el agua contra la meta y lo que
      // registraste en tus comidas, que son las dos cosas que este objetivo
      // cambia. ⚠️ PEND-FIRMA Enrique: si algún día Síntomas grafica su propia
      // frecuencia, la señal vuelve a ser la del renglón 12.
      que: 'Tus días con tu meta de agua cumplida y lo que registraste en tus comidas.',
      dondeApp: 'reportes',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '2 a 4 semanas',
    },
    noInstala: [
      {
        que: 'Agua fuera de las comidas',
        porque:
          'La tabla de destinos la propone y probablemente ayuda, y hoy espera la firma de Mariana en el catálogo: prescribirla desde aquí se brincaría esa firma por la puerta de atrás.',
      },
      {
        que: 'Ayuno',
        porque:
          'Dejar de comer calma la pesadez el mismo día, y por eso se queda fuera: apaga la señal que este objetivo necesita leer.',
      },
      {
        que: 'Glucosa',
        porque:
          'Es un dato bueno y no explica una panza pesada. Suma un pinchazo diario que este objetivo no lee.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): boca, mesa y baño. Nada que se compre.
    prescribe: ['masticar_mas_20', 'postura_cuclillas_defecar', 'caminata_postprandial'],
  },
  {
    key: 'piel-que-se-ve-viva',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 13.
    nombre: 'Piel que se ve viva',
    paraQuien: 'Para quien se ve al espejo y siente que su piel se apagó.',
    queEsperar:
      'Sol de mañana, agua con meta y grasas buenas en el plato. Lo que se ve al espejo lo juzgas tú; lo que la app te enseña es si sostuviste tu agua día con día.',
    // 7-sep-2026: el icono era `protocolos`, el dibujo de una pantalla que ya
    // no existe. Ahora es el de la señal que este objetivo sí mueve.
    icon: 'hidratacion',
    // 7-sep-2026: objetivo nuevo, nunca tuvo `protocolos`. Entra `reportes`
    // porque /hydration solo pinta la meta del DÍA y una barra, sin historial:
    // el "semana a semana" solo es verdad en el dominio hidratación de Reportes.
    instala: ['sol', 'hidratacion', 'comida', 'suplementos', 'reportes'],
    enciende: [
      { electron: 'sunlight', core: true, hora: { ancla: 'despertar', offsetMin: 30 } },
      { electron: 'water', core: true, hora: { ancla: 'despertar', offsetMin: 90 } },
      { electron: 'intervention', core: true },
      { electron: 'no_processed_foods', core: false },
      { electron: 'sleep', core: false, hora: { ancla: 'dormir', offsetMin: -30 } },
    ],
    metas: [{ tipo: 'agua_ml', valor: 2500 }],
    avisos: [{ app: 'sol', hora: { ancla: 'despertar', offsetMin: 30 } }],
    argosFoco: 'Qué prácticas sostuvo las semanas en que se ve distinta.',
    // 7-sep-2026: SEÑAL CAMBIADA, y a propósito. La tabla de destinos pedía
    // "foto de seguimiento y registro de prácticas". Se revisó el repo: la
    // foto de seguimiento NO EXISTE en ninguna pantalla, y el registro de
    // prácticas vivía en Mi Protocolo, que dejó de ser pantalla hoy. Prometer
    // cualquiera de las dos sería prometer algo que la persona no puede ver
    // moverse, que es exactamente lo que la regla dura de
    // CASOS_DE_USO_DESTINOS prohíbe. Se deja la señal honesta: el agua del día
    // contra la meta que este objetivo fija, que sí se registra y sí tiene
    // número. El resultado en la piel lo juzga la persona al espejo y el copy
    // lo dice así.
    // ⚠️ PEND-FIRMA Enrique: si la foto de seguimiento entra al roadmap, la
    // señal de este objetivo vuelve a ser la de la tabla de destinos.
    mide: {
      que: 'Cuánta agua tomaste y qué días llegaste a tu meta.',
      dondeApp: 'reportes',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '6 a 8 semanas',
    },
    noInstala: [
      {
        que: 'Panel de luz roja para cara',
        porque:
          'Es de las prácticas del catálogo con mejor fama para piel, y se queda fuera: pide comprar aparato, y este objetivo tiene que poder arrancar hoy sin gastar un peso.',
      },
      {
        que: 'Ayuno',
        porque:
          'Ayudaría a otras cosas, y aquí arriesga quitarte justo las grasas y la proteína que tu piel necesita todos los días.',
      },
      {
        que: 'Labs',
        porque:
          'Un estudio explicaría el fondo, y aun así se queda fuera: esperar resultados retrasa el único seguimiento que sí puedes hacer cada semana, verte.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): luz, agua y grasas del mar.
    // 7-sep-2026: salió `sauna_infrarrojo`. Este mismo objetivo deja fuera el
    // panel de luz roja porque "tiene que poder arrancar hoy sin gastar un
    // peso", y una sauna cuesta más que el panel: era una incoherencia contra
    // mi propio noInstala. Además su assignRule lista contraindicaciones
    // cardiacas, y este objetivo no pregunta nada de eso.
    prescribe: ['exposicion_solar_matutina', 'hidratacion_matutina', 'sardinas_pescados_grasos'],
  },
  {
    key: 'menos-inflamado',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 14.
    nombre: 'Menos inflamado',
    paraQuien: 'Para quien amanece hinchado y tieso y ya lo da por normal.',
    queEsperar:
      'Frío corto en la mañana, plato sin aceites industriales y pescados grasos dos o tres veces por semana. Registras tu rigidez y, si tienes estudios, viven junto a ese registro.',
    icon: 'bano-frio',
    // 7-sep-2026: objetivo nuevo, nunca tuvo `protocolos`. Entra `reportes`
    // porque /salud/mis-sintomas lista por estado y no pinta serie: el único
    // lugar donde un marcador se lee EN EL TIEMPO es el dominio labs de
    // Reportes.
    instala: ['sintomas', 'labs', 'comida', 'entrenar', 'reportes'],
    enciende: [
      { electron: 'cold_shower', core: true, hora: { ancla: 'despertar', offsetMin: 20 } },
      { electron: 'no_processed_foods', core: true },
      { electron: 'intervention', core: true },
      { electron: 'lab_upload', core: false },
      { electron: 'strength', core: false, hora: { ancla: 'despertar', offsetMin: 180 } },
    ],
    metas: [],
    // 7-sep-2026: VACÍO a propósito. El aviso V1 no cubre ninguna práctica de
    // este objetivo (la ducha fría no tiene app con aviso), y el hábito ya vive
    // en TAREAS a su hora. Un aviso más sería ruido sin destino.
    avisos: [],
    argosFoco: 'Qué días amanece tieso y qué hizo o comió la víspera.',
    mide: {
      // 7-sep-2026: SEÑAL AJUSTADA. La mitad de "registros de rigidez en el
      // tiempo" no existe: Síntomas no grafica frecuencia. La otra mitad sí, y
      // es la fuerte: cada marcador leído contra su ventana funcional, con
      // fecha. El tiempo sube a la cadencia real de un estudio, porque
      // prometer seis semanas para una señal que se mueve cuando subes labs
      // sería prometer una fecha que no depende de la persona.
      que: 'Cada marcador de tus estudios en el tiempo, leído contra tu ventana funcional.',
      dondeApp: 'reportes',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '1 a 3 meses',
    },
    noInstala: [
      {
        que: 'Baño de hielo y cold plunge',
        porque:
          'Dan más de lo mismo que la ducha fría, y se quedan fuera: piden tina y hielo, y la ducha de treinta segundos se puede empezar mañana.',
      },
      {
        que: 'Ayuno prolongado',
        porque:
          'Suele desinflamar de verdad, y por eso mismo se queda fuera: encimado a los otros tres cambios, ya no sabrías cuál te sirvió.',
      },
      {
        que: 'Glucosa',
        porque:
          'El pinchazo diario no es la señal que este objetivo mira, y sí es un registro más que sostener.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): frío por la puerta suave, plato y pescado.
    prescribe: ['ducha_fria_nivel1', 'eliminar_aceites_vegetales', 'sardinas_pescados_grasos'],
  },
  {
    key: 'mananas-con-pila',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 15.
    nombre: 'Mañanas con pila',
    paraQuien: 'Para quien arranca el día arrastrándose y lo resuelve con café.',
    queEsperar:
      'Agua y luz apenas te levantas, y un check-in de un toque para marcar cómo amaneciste. Tu energía de la mañana queda registrada día con día.',
    icon: 'sol',
    // 7-sep-2026: entra `reportes`. /emotions es la pantalla de captura y no
    // muestra el histórico; el dominio emociones de Reportes sí lista cada
    // check-in con su fecha, su hora y su nivel de energía.
    instala: ['sol', 'emociones', 'hidratacion', 'sueno', 'reportes'],
    enciende: [
      { electron: 'water', core: true, hora: { ancla: 'despertar', offsetMin: 15 } },
      { electron: 'sunlight', core: true, hora: { ancla: 'despertar', offsetMin: 30 } },
      { electron: 'checkin', core: true, hora: { ancla: 'despertar', offsetMin: 45 } },
      { electron: 'cold_shower', core: false, hora: { ancla: 'despertar', offsetMin: 20 } },
      { electron: 'sleep', core: false, hora: { ancla: 'dormir', offsetMin: -30 } },
    ],
    metas: [{ tipo: 'agua_ml', valor: 2500 }],
    avisos: [{ app: 'sol', hora: { ancla: 'despertar', offsetMin: 30 } }],
    argosFoco: 'Qué noches preceden sus mañanas buenas.',
    mide: {
      // 7-sep-2026: SEÑAL AJUSTADA. `energy_level` sí se guarda y sí se
      // muestra, pero como fila con fecha y hora: no está graficado y no hay
      // filtro de "mañana". Se promete lo que se ve, con su hora, y la persona
      // reconoce sus mañanas por la hora. ⚠️ PEND-FIRMA Enrique: si el reporte
      // de emociones grafica energía por hora del día, esto vuelve a ser
      // "tu energía de la mañana" tal cual el renglón 15.
      que: 'Tu energía en cada check-in, con su fecha y su hora.',
      dondeApp: 'reportes',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '1 a 2 semanas',
    },
    noInstala: [
      {
        que: 'Suplementos',
        porque:
          'Hay frascos que sí mueven la mañana, y se quedan fuera: si el primer recurso es un producto, nunca se arregla el horario, que es lo que de verdad la mueve.',
      },
      {
        que: 'Comida y Glucosa',
        porque:
          'Registrar cada comida explicaría mucho, y es más trabajo del que aguanta quien ya arranca arrastrándose. Entra después, con su propio objetivo.',
      },
      {
        que: 'N-Back',
        porque:
          'Medir tu cabeza a las ocho mide otra cosa. Aquí la señal es cómo te sientes, y ya la registras en un toque.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): lo que la tabla de destinos pone en el renglón 15.
    prescribe: ['hidratacion_matutina', 'exposicion_solar_matutina', 'ducha_fria_nivel1'],
  },
  {
    key: 'cabeza-en-silencio',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 16.
    nombre: 'Cabeza en silencio',
    paraQuien: 'Para quien trae el ruido mental encendido desde que abre los ojos.',
    queEsperar:
      'Un rato de silencio al día, meditación corta y un corte de pantallas en la noche. Tus minutos de silencio y tu check-in quedan registrados para ver si el ruido baja.',
    icon: 'meditar',
    // 7-sep-2026: entra `rachas`. Es la única pantalla que cuenta con historia
    // lo que este objetivo enciende: sus categorías son journal, respiración,
    // meditación y check-in (mente-streaks-core), justo las de aquí.
    instala: ['emociones', 'meditar', 'journal', 'respirar', 'rachas'],
    enciende: [
      { electron: 'meditation', core: true, hora: { ancla: 'despertar', offsetMin: 15 } },
      { electron: 'checkin', core: true, hora: { ancla: 'despertar', offsetMin: 120 } },
      { electron: 'screen_time_cutoff', core: true, hora: { ancla: 'dormir', offsetMin: -60 } },
      { electron: 'journal', core: false, hora: { ancla: 'dormir', offsetMin: -75 } },
      { electron: 'breathwork', core: false, hora: { ancla: 'dormir', offsetMin: -90 } },
    ],
    metas: [],
    // 7-sep-2026: se quitó el aviso de journal. Caía en dormir −75, quince
    // minutos ANTES del corte de pantallas que este mismo objetivo enciende en
    // dormir −60: el aviso prendía el teléfono justo para apagarlo. El hábito
    // se queda; lo que se va es la notificación. Mismo criterio con el que
    // dormir-mejor dejó journal fuera.
    avisos: [{ app: 'meditar', hora: { ancla: 'despertar', offsetMin: 15 } }],
    argosFoco: 'A qué horas y en qué días sube el ruido, y qué lo precede.',
    mide: {
      // 7-sep-2026: SEÑAL AJUSTADA. Los minutos de silencio y de NSDR NO
      // existen como dato agregado en ninguna pantalla: eran una promesa sin
      // comprobante. Lo que sí se cuenta, día tras día y con medalla, son las
      // rachas de meditación, journal y check-in, que es lo que este objetivo
      // enciende. ⚠️ PEND-FIRMA Enrique: el día que silencio y NSDR se sumen
      // como minutos, la señal vuelve a ser la del renglón 16.
      que: 'Tu racha de meditación, de journal y de check-in, día tras día.',
      dondeApp: 'rachas',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '2 a 4 semanas',
    },
    noInstala: [
      {
        que: 'N-Back',
        porque:
          'Entrenar la cabeza con un juego sirve, y aquí es lo contrario de lo que se busca: este objetivo se gana dándole silencio, no otro reto.',
      },
      {
        que: 'Comida, Glucosa y Entrenar',
        porque:
          'Los tres le hacen bien al ánimo, y aun así se quedan fuera: este objetivo pide quitar entradas del día, no agregar registros.',
      },
      {
        que: 'Suplementos',
        porque:
          'Tener el frasco a la mano invita a saltarse la práctica, que es justo lo único que aquí mueve la señal.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): lo que la tabla de destinos pone en el renglón 16.
    prescribe: ['silencio_30min', 'green_time_30min', 'nsdr_10min', 'digital_minimalism_1dia_semana'],
  },
  {
    key: 'mi-ciclo-a-mi-favor',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 17.
    // ⚠️ FLAG 7-sep-2026: este objetivo SOLO aplica a quien tiene el módulo de
    // ciclo activo. Hoy PackDef no tiene forma de condicionarse (el gating
    // femaleOnly vive en APP_REGISTRY y solo esconde la app, no el objetivo),
    // y NO se inventó un mecanismo. Queda declarado y la puerta que lo ofrece
    // tiene que filtrarlo hasta que exista el campo. Mariana firma el caso
    // completo antes de que se ofrezca (CASOS_DE_USO_DESTINOS, cierre).
    nombre: 'Mi ciclo a mi favor',
    paraQuien: 'Para quien lleva años peleándose con dos semanas de cada mes en vez de aprovecharlas.',
    queEsperar:
      'Registras tu ciclo y tu check-in, y la app predice tu fase y junta tus síntomas por fase. La doctrina es bidireccional: hay semanas para apretar y semanas para escuchar.',
    icon: 'ciclo',
    // 7-sep-2026: solo se ofrece a quien puede ver el módulo de ciclo. El
    // filtro vive en la pantalla que ofrece los objetivos (/packs/armar), que
    // usa el mismo criterio que `visibleApps` para la app Ciclo.
    soloConCiclo: true,
    // Entra `reportes`: /cycle predice la fase, pero los promedios del ciclo y
    // los registros diarios en el tiempo viven en su dominio de Reportes.
    instala: ['ciclo', 'emociones', 'entrenar', 'comida', 'reportes'],
    enciende: [
      { electron: 'period_log', core: true },
      { electron: 'checkin', core: true, hora: { ancla: 'despertar', offsetMin: 120 } },
      { electron: 'strength', core: true, hora: { ancla: 'despertar', offsetMin: 180 } },
      { electron: 'protein', core: false, hora: { ancla: 'despertar', offsetMin: 420 } },
      { electron: 'sleep', core: false, hora: { ancla: 'dormir', offsetMin: -30 } },
    ],
    metas: [{ tipo: 'proteina_g', valor: 150 }],
    // 7-sep-2026: VACÍO a propósito. Lo que habría que avisar es "vas entrando
    // a tu fase lútea", y eso depende de la predicción del ciclo, no de una
    // hora del día. El aviso V1 solo sabe de horas relativas: no existe todavía
    // el aviso por fase, y ponerlo a hora fija sería inventar.
    avisos: [],
    argosFoco: 'El patrón de energía por fase de esta persona, no el promedio.',
    mide: {
      // 7-sep-2026: SEÑAL AJUSTADA. La fase predicha sí se ve en /cycle, pero
      // los registros AGRUPADOS POR FASE no se calculan en ningún lado. El
      // dominio ciclo de Reportes sí da los promedios de tus ciclos y tus
      // registros diarios con fecha, que es lo mismo visto por día en vez de
      // por fase. ⚠️ PEND-FIRMA Mariana: agrupar por fase es lo que haría
      // valioso este objetivo, y hoy no existe.
      que: 'Tus ciclos, sus promedios, y tu energía y tus molestias día por día.',
      dondeApp: 'reportes',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '2 a 3 ciclos',
    },
    noInstala: [
      {
        que: 'Un set fijo de prácticas',
        porque:
          'Como en los objetivos 7 y 8, aquí no se prescribe: lo que sirve cambia con la fase, y un set igual todo el mes sería justo el objetivo de "baja el ritmo dos semanas" que la doctrina bidireccional rechaza.',
      },
      {
        que: '1RM y Récords',
        porque:
          'Marcar récord sí es parte de la fase folicular, y perseguirlo el mes entero pelea con la mitad del ciclo en la que este objetivo pide escuchar.',
      },
      {
        que: 'Ayuno',
        porque:
          'Funciona bien en otras semanas, y cerrar la ventana en fase lútea suele costar más de lo que da.',
      },
    ],
    // 7-sep-2026: SIN `prescribe` a propósito, igual que entender-sintomas y
    // salud-en-orden. Aquí la práctica depende de la fase y el calendario del
    // ciclo es quien la decide, no el objetivo.
  },
  {
    key: 'volver-a-moverme',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 18.
    nombre: 'Volver a moverme',
    paraQuien: 'Para quien lleva años sin ejercitarse y no quiere fallar el primer mes.',
    queEsperar:
      'Una caminata, tu meta de pasos y una pausa activa al día. Nada más. La app cuenta tus sesiones de la semana, que es el único número que aquí importa. La fuerza llega después, cuando ya no falles.',
    icon: 'pasos',
    // 7-sep-2026: entra `reportes` y sale `rachas`. Las rachas de mente solo
    // cuentan journal, respiración, meditación y check-in: NINGUNA es
    // movimiento, así que este objetivo estaba apuntando su señal a una
    // pantalla que no lo cuenta. Quien sí lo tiene es el calendario de
    // adherencia, donde `actividad` es una de sus cinco métricas por día.
    instala: ['reportes', 'movilidad', 'entrenar', 'cardio'],
    // 7-sep-2026: los tres core cambiaron. Antes eran pasos, cardio Y fuerza,
    // los tres diarios, para alguien que lleva años sin moverse: eso es lo que
    // hace que abandone en la primera semana, y contradecía el `noInstala` de
    // este mismo objetivo, que presume de ser el más chico a propósito. El
    // problema nunca fue que sean tres, sino cuáles. Ahora el núcleo es lo que
    // una persona parada sostiene desde el día uno: la meta de pasos (se
    // cumple caminando, sin registrar nada), la caminata registrada, y la
    // compleción de la práctica del día, que es por donde entran las pausas
    // activas y el escritorio elevado que este objetivo prescribe.
    // La fuerza NO desaparece: baja a no core, que es donde viven las cosas de
    // "con todo", y así este objetivo por fin tiene los dos niveles. La regla
    // de exactamente 3 core queda intacta.
    enciende: [
      { electron: 'steps', core: true, hora: { ancla: 'despertar', offsetMin: 480 } },
      { electron: 'cardio', core: true, hora: { ancla: 'despertar', offsetMin: 180 } },
      // Sin hora: la pausa activa se hace cuando toca, no a una hora fija.
      { electron: 'intervention', core: true },
      { electron: 'strength', core: false, hora: { ancla: 'despertar', offsetMin: 240 } },
    ],
    // 7-sep-2026: sin metas. La meta de pasos no tiene writer en PackMetaDef
    // (solo proteína, agua y ayuno lo tienen), así que se declara como hábito
    // y no se promete como meta. Declararla aquí sería declarar algo que
    // ningún servicio escribe.
    metas: [],
    // 7-sep-2026: VACÍO a propósito. Ninguna de las cuatro apps con aviso V1 es
    // de este objetivo, y a quien lleva años sin moverse un aviso diario le
    // suena a reclamo. La racha es el recordatorio, y la ve cuando abre la app.
    avisos: [],
    argosFoco: 'Las sesiones de la semana, y cuándo está por romperse la seguidilla.',
    mide: {
      // 7-sep-2026: se revisó a fondo. El punto `actividad` del calendario de
      // adherencia exige fila en `workout_sessions`, o sea una sesión de
      // fuerza: con la fuerza fuera del núcleo, ese punto se quedaría gris
      // para quien sí está cumpliendo. El dominio entrenamiento de Reportes sí
      // cuenta las sesiones del rango sumando fuerza Y cardio sin doble conteo
      // por día, así que una caminata registrada ya mueve el número.
      que: 'Tus sesiones de la semana, contando tus caminatas. Sin más.',
      dondeApp: 'reportes',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '1 semana',
    },
    noInstala: [
      {
        que: 'Casi todo',
        porque:
          'Es el objetivo más chico a propósito (CASOS_DE_USO_10_PERFILES, perfil 6): quien lleva años parado no necesita un programa, necesita un mes sin fallar.',
      },
      {
        que: 'Comida, Proteína y Ayuno',
        porque:
          'Cambiar cómo comes el mismo mes en que vuelves a moverte duplica lo que puede fallar. Primero el mes sin fallar, luego la mesa.',
      },
      {
        que: '1RM y Récords',
        porque:
          'Comparar tus números contra los de hace años es justo lo que te hizo no empezar.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): lo que la tabla de destinos pone en el renglón 18.
    prescribe: ['meta_pasos_8k', 'pausas_activas_90min', 'standing_desk'],
  },
  {
    key: 'menos-pantalla-mas-vida',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 19.
    nombre: 'Menos pantalla, más vida',
    paraQuien: 'Para quien levanta la vista y ya se le fue la noche en el teléfono.',
    queEsperar:
      'Un corte de pantallas en la noche, un rato afuera y un día a la semana sin teléfono. La app cuenta cuántos cortes cumpliste por semana.',
    icon: 'off-pantallas',
    instala: ['rachas', 'journal', 'sueno', 'emociones', 'meditar'],
    enciende: [
      { electron: 'screen_time_cutoff', core: true, hora: { ancla: 'dormir', offsetMin: -60 } },
      { electron: 'journal', core: true, hora: { ancla: 'dormir', offsetMin: -75 } },
      { electron: 'checkin', core: true, hora: { ancla: 'despertar', offsetMin: 120 } },
      { electron: 'meditation', core: false, hora: { ancla: 'despertar', offsetMin: 15 } },
      { electron: 'sleep', core: false, hora: { ancla: 'dormir', offsetMin: -30 } },
    ],
    metas: [],
    // 7-sep-2026: se quitó el aviso de journal, y aquí era todavía peor: el
    // objetivo se llama "menos pantalla" y su aviso encendía la pantalla
    // quince minutos antes de su propio corte. El hábito se queda.
    avisos: [{ app: 'meditar', hora: { ancla: 'despertar', offsetMin: 15 } }],
    argosFoco: 'Qué días cumple el corte de pantallas y qué cambia esos días.',
    mide: {
      // 7-sep-2026: SEÑAL AJUSTADA. `screen_time_cutoff` NO se cuenta en
      // ningún lado: ni en las rachas de mente (journal, respiración,
      // meditación y check-in) ni en el calendario de adherencia (ayuno,
      // proteína, agua, actividad y sueño). Prometer "cortes cumplidos por
      // semana" era prometer un número que no existe. Lo que sí se cuenta es
      // la racha de journal y de check-in, y en este objetivo son buena prueba:
      // escribir de noche es lo que haces en vez de seguir en el teléfono.
      // ⚠️ PEND-FIRMA Enrique: si el corte de pantallas entra a las rachas o al
      // calendario, la señal vuelve a ser la del renglón 19.
      que: 'Tu racha de journal y de check-in, día tras día.',
      dondeApp: 'rachas',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: '2 semanas',
    },
    noInstala: [
      {
        que: 'Contar tu tiempo de pantalla o bloquear apps',
        porque:
          'Es lo que más ayudaría, y ATP no lee lo que haces en otras apps: prometerlo sería prometer algo que la app no hace. Aquí se cuenta el corte que tú marcas.',
      },
      {
        que: 'Comida, Glucosa y Entrenar',
        porque:
          'Cada app nueva es una razón más para abrir el teléfono, y este objetivo se gana quitando, no sumando.',
      },
      {
        que: 'N-Back',
        porque:
          'Es una pantalla más, aunque sea la nuestra.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): lo que la tabla de destinos pone en el renglón 19.
    prescribe: ['pantallas_off_60min', 'digital_minimalism_1dia_semana', 'green_time_30min'],
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
 * argosFoco de los cuatro, ANTES de que el copy sea definitivo. Las llaves
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
    // 7-sep-2026: se queda VACÍO a propósito y con razón escrita. El aviso V1
    // solo existe para meditar, respirar, journal y sol (AvisoAppKey), y este
    // objetivo no enciende ninguna de las cuatro: lo que habría que recordar
    // es medir después de comer, y eso depende de a qué hora comió, no de una
    // hora fija. Inventar un aviso a las 3 de la tarde sería inventar. Cuando
    // el aviso por evento exista, aquí entra el recordatorio postprandial.
    avisos: [],
    argosFoco: 'Qué comidas mueven la glucosa de esta persona en particular.',
    // Señal y tiempo: renglón 6 de CASOS_DE_USO_DESTINOS (20-ago-2026), tal cual.
    mide: {
      que: 'Tu curva de glucosa con el contexto de lo que comiste.',
      dondeApp: 'glucosa',
      seNotaEn: '1 a 2 semanas',
    },
    noInstala: [
      {
        que: 'N-Back',
        porque:
          'Entrenar memoria de trabajo es bueno, y no tiene nada que ver con el número que esta persona lleva a su consulta.',
      },
      {
        que: '1RM y Récords',
        porque:
          'La fuerza mueve la glucosa de verdad, y aun así se queda fuera: perseguir marcas mete una segunda vara de éxito y este objetivo necesita una sola, la curva.',
      },
      {
        que: 'Journal',
        porque:
          'Escribir ayuda al ánimo de quien lleva un registro diario, y este objetivo ya pide varios registros al día: uno más lo vuelve tarea.',
      },
    ],
    // ⚠️ PEND-FIRMA (set propuesto): lo que más mueve glucosa sin tocar fármacos.
    prescribe: ['caminata_postprandial', 'ayuno_14_10', 'eliminar_aceites_vegetales', 'masticar_mas_20'],
  },
  {
    key: 'entender-sintomas',
    nombre: 'Entender lo que siento',
    paraQuien: 'Para quien trae molestias sueltas y quiere verlas juntas, con raíz y con plan.',
    queEsperar:
      'Registras lo que sientes, contestas la evaluación por sistemas y tu mapa funcional junta las piezas. De ahí salen prácticas concretas para correr en tu día.',
    icon: 'sintomas',
    // 7-sep-2026: salió `protocolos` (ver nota arriba de PACKS). Entra
    // `evaluaciones` y no es relleno: este objetivo enciende `functional_quiz`
    // como core, y Evaluaciones es donde la persona vuelve a ver lo que
    // contestó. Las prácticas que salen de su mapa ya no viven en una pantalla
    // aparte: llegan al día, que es lo que este objetivo promete.
    instala: ['sintomas', 'mapa-funcional', 'cuestionario', 'padecimientos', 'evaluaciones'],
    enciende: [
      { electron: 'functional_quiz', core: true },
      { electron: 'intervention', core: true },
    ],
    metas: [],
    // 7-sep-2026: VACÍO a propósito. Este objetivo se cumple contestando la
    // evaluación una vez, no repitiendo una práctica todos los días: no hay
    // nada diario que recordar. Además el aviso V1 solo cubre meditar,
    // respirar, journal y sol, y ninguna es de este objetivo. Los avisos
    // reales llegan después, desde las prácticas que el motor decida.
    avisos: [],
    argosFoco: 'Qué síntomas se repiten y con qué registros coinciden.',
    // Señal y tiempo: renglón 7 de CASOS_DE_USO_DESTINOS (20-ago-2026), tal cual.
    mide: {
      que: 'Tu mapa funcional: qué raíces se detectaron y en qué nivel.',
      dondeApp: 'mapa-funcional',
      seNotaEn: 'Al contestar la evaluación',
    },
    noInstala: [
      {
        que: 'Un set fijo de prácticas',
        porque:
          'Es la exclusión que define a este objetivo: aquí el motor decide con tus respuestas, y prescribir lo mismo para todos pelearía justo con lo que la persona vino a buscar.',
      },
      {
        que: 'Comida, Glucosa y Entrenar',
        porque:
          'Cada uno ayudaría, y aun así se quedan fuera hasta que el mapa exista: llenar el día antes de saber qué te pasa es adivinar.',
      },
      {
        que: 'Metas diarias',
        porque:
          'Una meta que no salió de tu evaluación es una meta prestada, y este objetivo se trata de que la tuya salga de tus datos.',
      },
    ],
  },
  {
    key: 'salud-en-orden',
    nombre: 'Mi salud en orden',
    paraQuien: 'Para quien quiere su historia, sus labs y sus registros a la mano en la consulta.',
    queEsperar:
      'Tu historia, tus padecimientos y tus laboratorios quedan capturados en un solo lugar, y el PDF con tus registros del periodo sale listo para compartir.',
    // 7-sep-2026: el icono era `historia-clinica`, el dibujo de una pantalla
    // que hoy es un redirect. Ahora es el del expediente, que es la señal.
    icon: 'salud-expediente',
    // 7-sep-2026: SALIÓ `historia-clinica`. La ruta /historia-clinica es un
    // redirect legacy a /tests: instalarla dejaba un mosaico que rebota, el
    // mismo error por el que salió `protocolos`. La captura de antecedentes
    // sigue existiendo, solo que ya no como app propia, y lo que la persona
    // viene a ver de verdad es cuánto le falta al expediente, que sí tiene
    // pantalla (dominio expediente de Reportes). No entra nada en su lugar.
    instala: ['padecimientos', 'labs', 'evaluaciones', 'reportes'],
    enciende: [{ electron: 'lab_upload', core: true }],
    metas: [],
    // 7-sep-2026: VACÍO a propósito. Este objetivo es captura de expediente,
    // no práctica diaria: no hay nada que recordar todos los días, y el aviso
    // V1 solo cubre meditar, respirar, journal y sol. Un aviso diario de
    // "sube tus estudios" molestaría a quien ya los subió.
    avisos: [],
    argosFoco: 'Qué partes del expediente siguen vacías y cuáles ya aportan datos.',
    // Señal y tiempo: renglón 8 de CASOS_DE_USO_DESTINOS (20-ago-2026), tal cual.
    mide: {
      // 7-sep-2026: SEÑAL MOVIDA. Apuntaba a `historia-clinica`, que es un
      // redirect legacy a /tests. El número existe y está bien construido, solo
      // que vive en el dominio expediente de Reportes: qué tan lleno está y
      // qué fuentes siguen vacías, sin adivinar por qué.
      que: 'Qué tan lleno está tu expediente y qué fuentes siguen vacías.',
      dondeApp: 'reportes',
      seNotaEn: 'Inmediato',
    },
    noInstala: [
      {
        que: 'Hábitos y metas diarias',
        porque:
          'Cambiar tu día ayuda siempre, y aun así se queda fuera: este objetivo se cumple en una tarde de captura y encender rutinas nuevas reparte esa atención.',
      },
      {
        que: 'Glucosa y Cetonas',
        porque:
          'Son registros de todos los días y este objetivo es de una sola vez; entran cuando la persona elige el objetivo que sí los mide.',
      },
      {
        que: 'La lectura de tus estudios',
        porque:
          'ATP los guarda, los ordena y los grafica. Interpretarlos es trabajo de quien te atiende, y decirlo así es parte del objetivo.',
      },
    ],
  },
  {
    // Objetivo 20 de la tabla de destinos (7-sep-2026). Va en PAQUETES_SALUD y
    // no en PACKS porque su puerta es el Centro, no la entrada de tres
    // preguntas: nadie llega a ATP con "quiero preparar mi consulta" como
    // primer deseo, llega cuando ya tiene fecha. Es pariente de salud-en-orden,
    // enfocado a UNA consulta con fecha.
    key: 'preparar-mi-consulta',
    // ⚠️ PEND-FIRMA: nombre de la tabla de destinos, renglón 20.
    nombre: 'Preparar mi consulta',
    paraQuien: 'Para quien ya tiene fecha con su doctor y le pidieron llevar datos.',
    queEsperar:
      'Juntas tus estudios, tus registros de glucosa, lo que has sentido y tu historia, y el reporte del periodo sale listo para compartir. ATP registra y grafica: la lectura la hace quien te atiende.',
    icon: 'reportes',
    // 7-sep-2026: SALIÓ `historia-clinica` por la misma razón que en
    // salud-en-orden: su ruta es un redirect legacy a /tests. No entra nada en
    // su lugar; Reportes ya es donde se arma lo que se lleva a la consulta.
    instala: ['reportes', 'labs', 'glucosa', 'sintomas', 'padecimientos'],
    enciende: [
      { electron: 'lab_upload', core: true },
      { electron: 'glucose_log', core: true },
      { electron: 'functional_quiz', core: false },
    ],
    metas: [],
    // 7-sep-2026: VACÍO a propósito. Este objetivo tiene una fecha, no una
    // hora del día, y el aviso V1 solo sabe de horas relativas al despertar o
    // al dormir. El recordatorio útil sería "tu consulta es en tres días" y ese
    // aviso todavía no existe. Inventarlo con una hora fija sería inventar.
    avisos: [],
    argosFoco: 'Qué le falta al expediente para que el reporte del periodo salga completo.',
    mide: {
      que: 'El reporte de tu periodo listo, y qué huecos le quedan a tu expediente.',
      dondeApp: 'reportes',
      // ⚠️ PEND-FIRMA Mariana: propuesta, la tabla de destinos no traía tiempo.
      seNotaEn: 'Inmediato',
    },
    noInstala: [
      {
        que: 'Hábitos y metas diarias',
        porque:
          'Cambiar tu día ayuda siempre, y aquí se queda fuera: este objetivo tiene fecha, y encender rutinas nuevas la semana previa reparte la atención que necesita la captura.',
      },
      {
        que: 'Entrenar, Comida y Ayuno',
        porque:
          'No cambian lo que llevas a la consulta y sí alargan la lista de cosas que sostener antes de esa fecha.',
      },
      {
        que: 'La lectura de tus estudios',
        porque:
          'Sería lo más cómodo para la persona, y es exactamente lo que ATP no hace: guarda, ordena y grafica, y quien te atiende interpreta.',
      },
    ],
    // 7-sep-2026: SIN `prescribe` a propósito, igual que entender-sintomas y
    // salud-en-orden. Es captura de expediente contra una fecha, no práctica
    // diaria: un set fijo aquí solo restaría tiempo a lo único que urge.
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
