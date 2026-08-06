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
  /** Avisos que el pack configura (restricción: pocos y con condición). */
  avisos: PackAviso[];
  /**
   * En qué se fija ARGOS para este pack. Se guarda desde ya; su consumo en
   * contexto es de MB-31, no de este run.
   */
  argosFoco: string;
}

export type PackIntensidad = 'suave' | 'con_todo';

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
 * Longevidad: el brief pedía instalar `edad-atp`, que aún no es app
 * instalable (eso es de MB-28). El pack instala lo que SÍ existe y el hueco
 * queda reportado — no se adelanta trabajo de MB-28.
 */
export const PACKS: PackDef[] = [
  {
    key: 'bajar-revoluciones',
    nombre: 'Bajar revoluciones',
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
  },
  {
    key: 'dormir-mejor',
    nombre: 'Dormir mejor',
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
  },
  {
    key: 'longevidad',
    nombre: 'Cumplir años sin envejecer',
    paraQuien: 'Para quien ya está bien y quiere saber si va ganando o perdiendo.',
    queEsperar:
      'Tus estudios y evaluaciones en un solo lugar, sol de mañana, fuerza y sueño. Con laboratorios subidos, tus números se siguen en el tiempo.',
    icon: 'labs',
    instala: ['labs', 'protocolos', 'sol', 'ayuno', 'cetonas', 'entrenar', 'sueno'],
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
  },
];

/** Lookup por llave. */
export const PACK_BY_KEY: Record<string, PackDef> = Object.fromEntries(
  PACKS.map((p) => [p.key, p])
);

/** Los hábitos que la intensidad enciende: suave = solo los core. */
export function habitosPorIntensidad(pack: PackDef, intensidad: PackIntensidad): PackHabito[] {
  return intensidad === 'suave' ? pack.enciende.filter((h) => h.core) : pack.enciende;
}
