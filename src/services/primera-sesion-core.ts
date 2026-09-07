/**
 * primera-sesion-core — el nucleo PURO de la primera sesion (pivote limpio,
 * 7 de septiembre de 2026, seccion 6 del plan).
 *
 * POR QUE EXISTE
 * Una cuenta nueva pasaba por diez pantallas y del orden de 35 a 40 toques
 * antes de ver algo suyo: cuatro bloques de consentimiento, doce datos
 * personales y treinta segundos de cinematica. El unico momento en que la app
 * devolvia algo era el resultado de cronotipo, en la pantalla 8, y el premio
 * por terminar era otra tarea. Ahora son SEIS pantallas y la primera devuelve
 * valor en la tercera: el objetivo con su senal.
 *
 *   1. Correo y contrasena  → app/register.tsx (ya existia; aqui no se toca)
 *   2. Tres preguntas       → /primera-sesion/preguntas
 *   3. Tu objetivo          → /primera-sesion/objetivo
 *   4. La app se arma       → /primera-sesion/armado
 *   5. Tu punto de partida  → /primera-sesion/punto-de-partida
 *   6. Tu dia 1             → /primera-sesion/dia-1
 *
 * Este modulo es de datos y decisiones puras: cero react-native, cero
 * supabase. Todo lo que escribe vive en las pantallas y en los servicios que
 * ya existian (pack-service, capture-service).
 *
 * LA PALABRA. Lo que la persona lee es OBJETIVO, siempre. Nunca "pack", nunca
 * "caso de uso", nunca "intervencion". En codigo la llave sigue siendo `pack`
 * donde ya vive (user_packs, deep links): renombrar simbolos persistidos
 * cuesta migracion y no cambia una sola letra de lo que se lee.
 *
 * EL PASO PERSISTIDO. `profiles.onboarding_step` es TEXT sin CHECK (verificado
 * contra produccion el 7-sep-2026), asi que los valores 'ps_<paso>' no piden
 * migracion. Se guarda el paso PENDIENTE, igual que hacia el v2.
 *
 * Y SE GUARDA TARDE, A PROPOSITO. Las pantallas 2 y 3 no anotan nada: lo que
 * eligen viaja por la URL y todavia no existe en ninguna tabla. El paso solo
 * avanza cuando hay un hecho durable del cual reanudar (el objetivo aplicado
 * en user_packs, el perfil guardado), porque un paso anotado sin su dato
 * manda a la persona a una pantalla a la que le faltan sus parametros. Quien
 * cierre la app en la 2 o en la 3 vuelve a las tres preguntas, que son dos
 * toques; quien la cierre despues, reanuda de verdad.
 */
// Type-only: se borra en compilacion, el nucleo sigue siendo puro para los tests.
import type { Href } from 'expo-router';
import { PACKS, PAQUETES_SALUD, PACK_BY_KEY, type PackDef } from '@/src/constants/packs';
// Type-only, y de un módulo de datos sin imports: el núcleo sigue puro y la
// pantalla ya no tiene que forzar el tipo del icono.
import type { AppIconName } from '@/src/components/ui/app-icon-names';

/** Los cinco pasos que viven dentro de la app. El 1 es /register. */
export const PASOS_PRIMERA_SESION = [
  'preguntas',
  'objetivo',
  'armado',
  'punto-de-partida',
  'dia-1',
] as const;

export type PasoPrimeraSesion = (typeof PASOS_PRIMERA_SESION)[number];

/** Seis pantallas contando el registro: es el numero que ve la persona. */
export const TOTAL_PANTALLAS_PRIMERA_SESION = 6;

export function esPasoPrimeraSesion(s: string): s is PasoPrimeraSesion {
  return (PASOS_PRIMERA_SESION as readonly string[]).includes(s);
}

/** Ruta de la pantalla de un paso. */
export function rutaPrimeraSesion(paso: PasoPrimeraSesion): Href {
  return `/primera-sesion/${paso}`;
}

/** Numero 1-based para el shell (PASO n DE 6). El registro es el 1. */
export function numeroDePantalla(paso: PasoPrimeraSesion): number {
  return PASOS_PRIMERA_SESION.indexOf(paso) + 2;
}

/** El valor que se persiste en profiles.onboarding_step. */
export function pasoPersistido(paso: PasoPrimeraSesion): string {
  return `ps_${paso}`;
}

/** Paso siguiente, o null si es el ultimo (→ 'completed'). */
export function siguientePaso(paso: PasoPrimeraSesion): PasoPrimeraSesion | null {
  const i = PASOS_PRIMERA_SESION.indexOf(paso);
  return i >= 0 && i < PASOS_PRIMERA_SESION.length - 1 ? PASOS_PRIMERA_SESION[i + 1] : null;
}

/**
 * 'ps_<paso>' → su ruta. null si el valor no es de esta primera sesion, para
 * que quien resuelva la ruta general siga con sus otras reglas.
 */
export function resolvePrimeraSesion(step: string | null | undefined): Href | null {
  if (!step || !step.startsWith('ps_')) return null;
  const s = step.slice(3);
  return esPasoPrimeraSesion(s) ? rutaPrimeraSesion(s) : null;
}

// ═══ Pregunta 1: que quieres cambiar primero ═══

/**
 * Las intenciones que se le ofrecen a la persona en la pantalla 2.
 *
 * POR QUE NO SE LE ENSENAN LOS 20 OBJETIVOS AQUI. Veinte tarjetas no son una
 * pregunta, son un catalogo, y quien acaba de crear su cuenta todavia no
 * conoce el vocabulario para elegir entre "Menos inflamado" y "Digestion
 * ligera". Se pregunta por el sintoma en su idioma, la app PROPONE un
 * objetivo en la pantalla 3 con su senal, y ahi si se puede cambiar por
 * cualquiera de los 20. La lista completa nunca se esconde: se ofrece cuando
 * ya hay contexto para leerla.
 *
 * Regla dura del catalogo, con candado en el test: cada uno de los objetivos
 * tiene que ser alcanzable desde alguna intencion, como propuesta o como
 * alternativa. Un objetivo que no se puede elegir es un objetivo que no
 * existe.
 */
export interface IntencionInicial {
  id: string;
  /** Lo que la persona lee, en su idioma y sin jerga. */
  texto: string;
  /** Nombre logico del set de iconos (AppIcon). */
  icon: AppIconName;
  /** El objetivo que la app propone para esta intencion. */
  propone: string;
  /** Los otros que caben en la misma intencion, en orden de cercania. */
  alternativas: readonly string[];
  /** Solo se ofrece a quien puede ver el modulo de ciclo. */
  soloConCiclo?: boolean;
}

export const INTENCIONES_INICIALES: readonly IntencionInicial[] = [
  {
    id: 'dormir',
    texto: 'Duermo mal o amanezco cansado',
    icon: 'sueno',
    propone: 'dormir-mejor',
    alternativas: ['mananas-con-pila', 'cabeza-en-silencio'],
  },
  {
    id: 'estres',
    texto: 'No puedo apagar la cabeza',
    icon: 'respirar',
    propone: 'bajar-revoluciones',
    alternativas: ['cabeza-en-silencio', 'menos-pantalla-mas-vida'],
  },
  {
    id: 'energia',
    texto: 'Me apago a media tarde',
    icon: 'glucosa',
    propone: 'energia-estable',
    alternativas: ['sin-sueno-despues-de-comer', 'mananas-con-pila'],
  },
  {
    id: 'foco',
    texto: 'Trabajo con la cabeza y siento que perdí filo',
    icon: 'nback',
    propone: 'foco-claridad',
    alternativas: ['cabeza-en-silencio', 'menos-pantalla-mas-vida'],
  },
  {
    id: 'moverme',
    texto: 'Quiero moverme y estar más fuerte',
    icon: 'pasos',
    propone: 'volver-a-moverme',
    alternativas: ['fuerza-que-se-nota', 'aguante-de-verdad'],
  },
  {
    id: 'cuerpo-pesado',
    texto: 'Traigo el cuerpo pesado o hinchado',
    icon: 'sintomas',
    propone: 'menos-inflamado',
    alternativas: ['digestion-ligera', 'piel-que-se-ve-viva'],
  },
  {
    id: 'entender',
    texto: 'Quiero entender mis estudios y lo que siento',
    icon: 'labs',
    propone: 'entender-sintomas',
    alternativas: ['salud-en-orden', 'preparar-mi-consulta', 'cuidar-glucosa'],
  },
  {
    id: 'seguir-bien',
    texto: 'Estoy bien y quiero seguir así muchos años',
    icon: 'edad-atp',
    propone: 'longevidad',
    alternativas: ['salud-en-orden', 'aguante-de-verdad'],
  },
  {
    id: 'ciclo',
    texto: 'Quiero que mi ciclo juegue a mi favor',
    icon: 'ciclo',
    propone: 'mi-ciclo-a-mi-favor',
    alternativas: ['mananas-con-pila'],
    soloConCiclo: true,
  },
];

/** Todos los objetivos del catalogo, en un solo arreglo. */
export function todosLosObjetivos(): PackDef[] {
  return [...PACKS, ...PAQUETES_SALUD];
}

/**
 * Las intenciones que ESTA persona puede ver.
 *
 * `cicloVisible` es de tres estados a proposito, igual que en /packs/armar:
 * `null` = todavia no se sabe, y mientras no se sepa no se ofrece el del ciclo
 * y tampoco se descarta. Ofrecerselo a un hombre fue un error real de esa
 * pantalla y aqui no se repite.
 */
export function intencionesVisibles(cicloVisible: boolean | null): IntencionInicial[] {
  return INTENCIONES_INICIALES.filter((i) => !i.soloConCiclo || cicloVisible === true);
}

/** Los objetivos que ESTA persona puede elegir. Mismo criterio de ciclo. */
export function objetivosVisibles(cicloVisible: boolean | null): PackDef[] {
  return todosLosObjetivos().filter((p) => !p.soloConCiclo || cicloVisible === true);
}

/**
 * El objetivo propuesto para una intencion, o null si la intencion no existe
 * o su objetivo no le toca a esta persona. Nunca truena: una URL con basura
 * cae en la lista completa, que es el peor caso aceptable.
 */
export function objetivoPropuesto(
  intencionId: string | null | undefined,
  cicloVisible: boolean | null,
): PackDef | null {
  const intencion = INTENCIONES_INICIALES.find((i) => i.id === intencionId);
  if (!intencion) return null;
  const pack = PACK_BY_KEY[intencion.propone];
  if (!pack) return null;
  if (pack.soloConCiclo && cicloVisible !== true) return null;
  return pack;
}

/**
 * Los objetivos cercanos a una intencion, para el "cambiar" de la pantalla 3.
 * Van primero las alternativas declaradas y luego el resto del catalogo, sin
 * repetir el propuesto: la lista completa siempre esta, solo que ordenada.
 */
export function objetivosCercanos(
  intencionId: string | null | undefined,
  cicloVisible: boolean | null,
): PackDef[] {
  const intencion = INTENCIONES_INICIALES.find((i) => i.id === intencionId);
  const visibles = objetivosVisibles(cicloVisible);
  if (!intencion) return visibles;
  const orden = new Map<string, number>();
  orden.set(intencion.propone, 0);
  intencion.alternativas.forEach((k, i) => orden.set(k, i + 1));
  return visibles
    .filter((p) => p.key !== intencion.propone)
    .sort((a, b) => (orden.get(a.key) ?? 99) - (orden.get(b.key) ?? 99));
}

/** Llaves alcanzables desde alguna intencion. Lo usa el candado del test. */
export function objetivosAlcanzables(): Set<string> {
  const s = new Set<string>();
  for (const i of INTENCIONES_INICIALES) {
    s.add(i.propone);
    for (const a of i.alternativas) s.add(a);
  }
  return s;
}

// ═══ Preguntas 2 y 3: a que hora despiertas y a que hora te duermes ═══

/** 'HH:MM' → minutos desde medianoche, o null si no es una hora. */
export function minutosDeHora(hora: string | null | undefined): number | null {
  if (typeof hora !== 'string') return null;
  const m = /^(\d{2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Horas de sueno declaradas entre dormirse y despertar. Cruza la medianoche,
 * que es el caso normal. null si alguna hora no sirve.
 *
 * Es una VENTANA declarada, no sueno medido: la pantalla que la usa lo dice
 * con esas palabras. No se confunde con el dato de un wearable, que la app no
 * tiene.
 */
export function horasDeVentanaDeSueno(
  despertar: string | null | undefined,
  dormir: string | null | undefined,
): number | null {
  const d = minutosDeHora(despertar);
  const s = minutosDeHora(dormir);
  if (d == null || s == null) return null;
  const bruto = d - s;
  const minutos = bruto <= 0 ? bruto + 24 * 60 : bruto;
  // Una ventana de 0 o de 24 horas no es un dato, es un error de captura.
  if (minutos <= 0 || minutos >= 24 * 60) return null;
  return Math.round((minutos / 60) * 100) / 100;
}
