/**
 * hoy-resumen-core (7-oct-2026, Hoy editorial). Lógica PURA de lo primero que
 * se ve en HOY: qué estado toca, y con qué título, qué línea, qué CTA y qué
 * LLAVE de imagen se arma la tarjeta. Cero React, cero supabase y cero
 * `require()` de assets (los binarios se resuelven en el componente); se
 * verifica con
 * `node scripts/run-tests-sin-vitest.js src/services/hoy/__tests__/hoy-resumen-core.test.ts`.
 *
 * Por qué existe (palabras del dueño, 7-oct-2026): "Abro mi pantalla principal
 * y en Hoy lo primero que sale es mi Edad ATP, muy bien, pero salen mis
 * laboratorios en rojo, los puntos rojos. No es necesario poner ese dato en
 * una primera instancia. Vamos a dejarlo como un resumen con una imagen
 * editorial bonita y ya si te quieres meter a ver los valores, te metes."
 *
 * Lo que cambia: arriba de HOY va UNA tarjeta editorial (imagen, una línea,
 * un CTA). Los tres marcadores con su punto de color y su etiqueta ("Pide
 * atención") salen de la primera vista y quedan a un toque, en la pantalla a
 * la que lleva el CTA. No se borra nada: top3Marcadores, ETIQUETA_ESTADO_HERO
 * y marcadoresEliteParaHero se quedan en sus cores con sus tests, aunque desde
 * hoy ninguna pantalla los monta (el semáforo de adentro lo pintan
 * /edad-atp/result-preview, /edad-atp/labs y /salud/evaluacion-elite con sus
 * propias piezas).
 *
 * Reglas que se hacen cumplir aquí (y que el test vigila):
 *  - El modelo de la tarjeta NO lleva marcadores, estados ni conteos de "piden
 *    acción". No hay campo donde ponerlos: el semáforo no puede volver por
 *    descuido.
 *  - "No se pudo leer" nunca es una tarjeta bonita: los estados que no son
 *    felices (cargando, fallo, evaluación en camino) salen como vistas planas
 *    y el componente las pinta igual que antes, con su Reintentar.
 *  - El sexo nunca se asume: retrato de él o de ella SOLO con el sexo del
 *    perfil conocido; sin él, la imagen neutra.
 *  - Nunca se inventa un dato: la línea sale de lo que hay (la Edad ATP y su
 *    delta, las palabras del coach, la semana del programa) o dice, sin
 *    número, qué sigue.
 */
import { classifyEdadDelta, edadDeltaYears } from '@/src/services/edad-atp/edad-delta-core';
import type { EliteV3 } from '@/src/services/elite/elite-v3-core';
import type { AvancePrograma } from '@/src/services/elite/programa-elite-core';
import {
  ACCION_COMPLETAR_PERFIL, AVISO_FALTA_SEXO_EDAD, RUTA_PERFIL, sexoDePerfil,
} from '@/src/services/salud/sexo-core';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import type { Sex } from '@/src/types/edad-atp-v2';
import { seededIndex, tuDiaImageGroup, type TuDiaGroup } from '@/src/utils/image-pick-core';
import { edadesDeEvaluacion, type EstadoHeroElite, type LecturaEliteHero } from './elite-hoy-core';
import {
  AVISO_FALTA_SEXO, edadIntegralTexto, textoDeltaEdad,
  type DatosHero, type EdadHero, type EstadoHero,
} from './hero-laboratorios-core';

// ---------------------------------------------------------------------------
// El modelo de la tarjeta
// ---------------------------------------------------------------------------

/**
 * La LLAVE de la imagen, no el asset: este archivo corre en node y un
 * `require()` de un .webp lo rompe (manual de marca 7.6). El componente
 * traduce la llave con los pickers que ya existen.
 *  - `edad_atp_el` / `edad_atp_ella`: el retrato de Edad ATP (pickEdadAtpImage).
 *  - `estudio_neutra`: assets/images/yo/lab-preview.webp, sin persona con sexo.
 *  - `programa_sin_persona`: la foto del momento del día para el programa,
 *    SOLO del banco sin persona (IMAGENES_PROGRAMA_SIN_PERSONA, abajo).
 */
export type ImagenResumenKey = 'edad_atp_el' | 'edad_atp_ella' | 'estudio_neutra' | 'programa_sin_persona';

/**
 * 8-oct-2026 (revisión en frío, bloqueante): la tarjeta del programa usaba
 * pickTuDiaImage, y en assets/images/hoy-extra/tu-dia hay fotos con una
 * persona de sexo legible (amanecer-01 un hombre sin camisa, amanecer-02 una
 * mujer en top deportivo, atardecer-02 un hombre con barba, medio-dia-03 una
 * mujer de espaldas). Una clienta podía abrir HOY y encontrarse al hombre sin
 * camisa: eso es ponerle sexo a quien no se le preguntó. Aquí van los
 * archivos de esa carpeta donde NO aparece ninguna persona, por franja; la
 * tarjeta del programa rota solo entre estos. Se queda fuera también
 * medio-dia-01, que la revisión daba por buena: abierto el archivo, trae un
 * senderista diminuto sentado en la cumbre. No se le lee el sexo a ese
 * tamaño, pero es una persona y lo que se pidió es un banco "sin persona";
 * la franja de medio día sigue rotando entre dos. Si el dueño lo quiere de
 * vuelta, es agregar su nombre aquí y su `require()` en HoyResumenCard.
 * La lista la vigila el test (nombres exactos, y que el componente no cargue
 * ningún otro); el `require()` de cada archivo vive en HoyResumenCard.
 * pickTuDiaImage y su banco completo no se tocan (image-rotation.ts).
 */
export const IMAGENES_PROGRAMA_SIN_PERSONA = {
  despertar: ['amanecer-03'],
  'medio-dia': ['medio-dia-02', 'medio-dia-04'],
  atardecer: ['atardecer-01', 'atardecer-03', 'atardecer-04'],
  noche: ['noche-01', 'noche-02', 'noche-03', 'noche-04'],
} as const satisfies Record<TuDiaGroup, readonly string[]>;

/** El nombre del archivo (sin extensión) dentro de hoy-extra/tu-dia. */
export type ImagenProgramaKey = (typeof IMAGENES_PROGRAMA_SIN_PERSONA)[TuDiaGroup][number];

/**
 * Qué foto le toca al programa: la franja la elige la hora (las mismas
 * franjas de siempre, tuDiaImageGroup) y la variante, la semilla del día
 * (misma semilla, misma foto: no parpadea entre renders). Una hora rara
 * (NaN, fuera de 0 a 23) cae en la franja de noche, como en tuDiaImageGroup.
 */
export function imagenProgramaKey(hora: number, semilla?: string): ImagenProgramaKey {
  const banco: readonly ImagenProgramaKey[] = IMAGENES_PROGRAMA_SIN_PERSONA[tuDiaImageGroup(hora)];
  return banco[seededIndex(semilla, banco.length)];
}

/** A dónde puede llevar la tarjeta. Literales: expo-router tiene typedRoutes. */
export type RutaResumen =
  | '/edad-atp'
  | '/edad-atp/comparar'
  | '/edad-atp/labs'
  | '/salud/evaluacion-elite'
  | '/my-health'
  | '/labs-guide'
  | '/profile'
  | '/programa';

/** Una puerta secundaria: un renglón de texto callado DEBAJO de la tarjeta. */
export interface EnlaceResumen {
  key: 'comparar' | 'sin_estudio' | 'falta_sexo' | 'valores' | 'laboratorios';
  texto: string;
  ruta: RutaResumen;
}

export interface TarjetaResumen {
  key: 'edad_atp' | 'evaluacion' | 'sin_estudio' | 'programa';
  titulo: string;
  /** La única línea de la tarjeta. Dato real o qué sigue; nunca un marcador. */
  linea: string;
  /** Letra chica bajo la línea (la advertencia del número). null si no aplica. */
  letraChica: string | null;
  /** Un solo CTA: toda la tarjeta lleva ahí. */
  cta: { label: string; ruta: RutaResumen };
  imagen: ImagenResumenKey;
  /** Solo el programa: avance de 0 a 100 para la barra de la tarjeta. */
  progreso: { current: number; target: number } | null;
  enlaces: EnlaceResumen[];
  /**
   * 8-oct-2026 (revisión en frío): lo que lee el lector de pantalla, en
   * frases normales (un título en mayúsculas se deletrea) y con lo que la
   * vista solo dibuja: la barra del programa aquí se dice ("Semana 3 de 12,
   * día 17... 20 por ciento").
   */
  accesibilidad: string;
}

/** Lo que escribe cada tarjeta; título y CTA en frase normal (se suben a mayúsculas al armar). */
interface PiezasTarjeta {
  key: TarjetaResumen['key'];
  titulo: string;
  linea: string;
  letraChica?: string | null;
  cta: { texto: string; ruta: RutaResumen };
  imagen: ImagenResumenKey;
  progreso?: TarjetaResumen['progreso'];
  enlaces?: EnlaceResumen[];
  /** Solo si la frase por defecto (título, línea, letra chica, CTA) no alcanza. */
  accesibilidad?: string;
}

const sinPuntoFinal = (s: string): string => s.replace(/\.$/, '');

/** Un solo lugar arma el modelo: mayúsculas para la vista (molde de EditorialCard) y la frase para el lector. */
function armarTarjeta(p: PiezasTarjeta): TarjetaResumen {
  const letraChica = p.letraChica ?? null;
  const frases = [p.titulo, p.linea, letraChica, p.cta.texto].filter((s): s is string => !!s).map(sinPuntoFinal);
  return {
    key: p.key,
    titulo: p.titulo.toUpperCase(),
    linea: p.linea,
    letraChica,
    cta: { label: p.cta.texto.toUpperCase(), ruta: p.cta.ruta },
    imagen: p.imagen,
    progreso: p.progreso ?? null,
    enlaces: p.enlaces ?? [],
    accesibilidad: p.accesibilidad ?? `${frases.join('. ')}.`,
  };
}

/**
 * Qué imagen le toca a la tarjeta de Edad ATP. Recibe `biological_sex` tal
 * como venga (unknown): solo 'male' y 'female' exactos dan retrato; NULL, sin
 * fila, 'intersex', mayúsculas o basura dan la neutra. Mismo traductor que el
 * resto de la app (sexo-core): aquí no se inventa otra regla.
 */
export function imagenEdadAtp(sexo: unknown): ImagenResumenKey {
  const s = sexoDePerfil(sexo);
  if (s === 'male') return 'edad_atp_el';
  if (s === 'female') return 'edad_atp_ella';
  return 'estudio_neutra';
}

/**
 * Cuánto cabe en la línea de la tarjeta: dos renglones del subtítulo de
 * EditorialCard (12 pt) en el teléfono más angosto.
 * 8-oct-2026 (revisión en frío): eran 84 y a 320 pt de ancho no cabían. La
 * tarjeta mide 288 y el texto 240; a 12 pt entran unos 35 a 37 caracteres por
 * renglón, así que dos renglones son unos 70.
 */
export const LARGO_LINEA_RESUMEN = 70;

/** Un punto después de esto no cierra una oración ("con el Dr. Pérez"). */
const TERMINA_EN_ABREVIATURA = /(?:^|\s)(?:Dr|Dra|Sr|Sra|Srta|Lic|Ing|etc|vs|aprox)\.$/i;

/**
 * 8-oct-2026 (revisión en frío): tampoco cierra oración el número de una
 * lista ("son: 1. Dormir siete horas. 2. Caminar") ni una inicial ("con el
 * Dr. J. Pérez"). Antes el corte podía caer justo ahí y la línea terminaba en
 * "2." o en "J.". Un decimal no entra aquí ("uno de 44.5." sí cierra): el
 * número de lista es un entero de una o dos cifras suelto. El costo: una
 * oración que termina en un entero corto ("Tienes 38.") o en una sola letra
 * ("vitamina D.") no se toma como cierre; el corte cae en la siguiente
 * oración o por palabra, que es el lado seguro.
 */
const TERMINA_EN_NUMERO_DE_LISTA = /(?:^|[\s:;(])\d{1,2}\.$/;
// Letras escritas a mano y no \p{L}: Hermes no garantiza los escapes de propiedad Unicode.
const TERMINA_EN_INICIAL = /(?:^|[\s(])[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]\.$/;

function puntoQueNoCierra(hastaElPunto: string): boolean {
  return TERMINA_EN_ABREVIATURA.test(hastaElPunto)
    || TERMINA_EN_NUMERO_DE_LISTA.test(hastaElPunto)
    || TERMINA_EN_INICIAL.test(hastaElPunto);
}

/** Una "oración" más corta que esto ("Hola.") no dice nada sola: se prefiere cortar por palabra. */
const MINIMO_ORACION = 20;

/**
 * Un texto libre (las palabras del coach) reducido a una línea: sin saltos y
 * sin espacios dobles. Si no cabe, se queda con las oraciones COMPLETAS que
 * quepan (sus palabras no se dejan a media frase); si ni la primera cabe, se
 * corta en una palabra completa y se dice con puntos suspensivos. null si no
 * hay texto. Un decimal ("44.5") no es fin de oración, y una abreviatura, un
 * número de lista o una inicial tampoco.
 */
export function unaLinea(texto: unknown, max: number = LARGO_LINEA_RESUMEN): string | null {
  if (typeof texto !== 'string') return null;
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (!limpio) return null;
  if (limpio.length <= max) return limpio;
  let finOracion = -1;
  const cierre = /[.!?](?=\s)/g;
  for (let c = cierre.exec(limpio); c !== null; c = cierre.exec(limpio)) {
    const hasta = c.index + 1;
    if (hasta > max) break;
    if (!puntoQueNoCierra(limpio.slice(0, hasta))) finOracion = hasta;
  }
  if (finOracion >= MINIMO_ORACION) return limpio.slice(0, finOracion);
  const corte = limpio.slice(0, Math.max(1, max - 1));
  const espacio = corte.lastIndexOf(' ');
  let base = espacio > 0 ? corte.slice(0, espacio) : corte;
  // 8-oct-2026 (revisión en frío): la línea cortada tampoco termina en "Dr.",
  // "J." o "2." ("con el Dr. J…"): se retrocede a la palabra anterior.
  while (puntoQueNoCierra(base) && base.includes(' ')) base = base.slice(0, base.lastIndexOf(' '));
  return `${base.replace(/[\s,;:.]+$/, '')}…`;
}

// ---------------------------------------------------------------------------
// Modo ATP: laboratorios, evaluación Elite o primer estudio
// ---------------------------------------------------------------------------

/** La advertencia que acompaña al número calculado por la app, igual que en el hero anterior. */
export const LETRA_CHICA_EDAD_ATP = 'Estimación informativa';

/** El renglón callado que conserva la puerta a /edad-atp cuando el CTA se va al perfil. */
export const TEXTO_VER_VALORES = 'Ver mis valores';

/**
 * 8-oct-2026 (segunda revisión en frío): los valores de laboratorio quedaban a
 * dos toques (HOY, el hub de Edad ATP y de ahí ATP Labs) y el dueño pidió que
 * quien quiera verlos, entre y los vea. Renglón callado bajo la tarjeta,
 * directo a ATP Labs. Sigue sin haber un solo valor ni semáforo en HOY.
 */
export const TEXTO_VER_LABORATORIOS = 'Ver mis laboratorios';

/**
 * El delta CON su referente.
 * 8-oct-2026 (revisión en frío): "3.7 años más joven" solo, sin la edad real
 * al lado, no dice contra qué. En el hero anterior (y en Mi programa, que
 * sigue usando textoDeltaEdad tal cual) el delta va junto a un bloque "EDAD
 * REAL 45" y se entiende; en esta tarjeta ese bloque ya no está, así que la
 * frase lo dice: "3.7 años más joven que tu edad real", "3.2 años por encima
 * de tu edad real", "En línea con tu edad real". El número y el signo siguen
 * saliendo de textoDeltaEdad y de edad-delta-core: aquí solo se completa la
 * frase, y el helper de los demás no se toca.
 */
export function deltaConReferente(edad: EdadHero): string {
  const base = textoDeltaEdad(edad);
  switch (classifyEdadDelta(edadDeltaYears(edad.cronologica, edad.integral))) {
    case 'younger': return `${base} que tu edad real`;
    case 'older': return `${base} de tu edad real`;
    default: return base;
  }
}

/**
 * Con estudio. Con Edad ATP calculada, el número va en el título y la línea es
 * su delta con referente (deltaConReferente). Sin cálculo todavía no hay
 * número que enseñar: la línea dice que el estudio ya está y el CTA lleva a
 * calcular.
 *
 * El destino es /edad-atp, el mismo del botón "VER MI EDAD ATP" del hero
 * anterior. Es la puerta donde uno "se mete a ver los valores": ahí están ATP
 * Labs (/edad-atp/labs, los laboratorios con su estado), Comparar estudios y
 * el detalle del resultado.
 * 8-oct-2026 (revisión en frío): aquí se daba otra razón, y era falsa: que
 * /edad-atp/result-preview "recalcula e inserta un cálculo en cada visita",
 * como si el hub no lo hiciera. El hub TAMBIÉN llama a computeEdadAtpV2 al
 * enfocarse cuando hay evaluación suficiente (app/edad-atp/index.tsx, en su
 * carga): en eso las dos pantallas son iguales. La razón verdadera es la de
 * arriba: result-preview enseña el resultado, pero no tiene puerta a ATP Labs
 * ni a Comparar (sus renglones de "Fuentes" llevan a capturar datos, no a
 * leer los valores). El destino no cambió. Que el hub inserte un cálculo en
 * cada visita es deuda que ya existía; esta tarjeta no la arregla.
 *
 * Sin sexo en el perfil y sin Edad ATP no se le dice "calcula" a quien no
 * puede calcular (sin ese dato no se calcula, no se asume): la línea dice qué
 * falta y el CTA lleva al perfil. 8-oct-2026 (revisión en frío): con eso toda
 * la tarjeta se iba a /profile y la puerta a sus valores desaparecía de HOY.
 * Se conserva como renglón callado bajo la tarjeta ("Ver mis valores", a
 * /edad-atp): sus laboratorios no dejan de estar a un toque por faltarle un
 * dato del perfil. Con Edad ATP ya calculada y sin sexo (raro: lo quitó
 * después), la tarjeta sigue enseñando su número y la falta del sexo queda
 * como renglón callado, igual que la nota del hero anterior.
 *
 * `sexo` es el del perfil. Si los datos dicen que falta (`faltaSexo`), manda
 * eso: imagen neutra aunque llegue un sexo por otro lado.
 */
export function tarjetaEdadAtp(datos: DatosHero, sexo: unknown): TarjetaResumen {
  const edad = datos.edad;
  const comparar: EnlaceResumen = { key: 'comparar', texto: 'Comparar con mi estudio anterior', ruta: '/edad-atp/comparar' };
  const laboratorios: EnlaceResumen = { key: 'laboratorios', texto: TEXTO_VER_LABORATORIOS, ruta: '/edad-atp/labs' };
  const imagen: ImagenResumenKey = datos.faltaSexo ? 'estudio_neutra' : imagenEdadAtp(sexo);
  if (edad) {
    return armarTarjeta({
      key: 'edad_atp',
      titulo: `Tu Edad ATP: ${edadIntegralTexto(edad)}`,
      linea: deltaConReferente(edad),
      letraChica: LETRA_CHICA_EDAD_ATP,
      cta: { texto: 'Ver mi Edad ATP', ruta: '/edad-atp' },
      imagen,
      enlaces: datos.faltaSexo
        ? [{ key: 'falta_sexo', texto: AVISO_FALTA_SEXO, ruta: RUTA_PERFIL }, laboratorios, comparar]
        : [laboratorios, comparar],
    });
  }
  if (datos.faltaSexo) {
    return armarTarjeta({
      key: 'edad_atp',
      titulo: 'Tu Edad ATP',
      linea: `${AVISO_FALTA_SEXO_EDAD}.`,
      cta: { texto: ACCION_COMPLETAR_PERFIL, ruta: RUTA_PERFIL },
      imagen,
      enlaces: [{ key: 'valores', texto: TEXTO_VER_VALORES, ruta: '/edad-atp' }, comparar],
    });
  }
  return armarTarjeta({
    key: 'edad_atp',
    titulo: 'Tu Edad ATP',
    linea: 'Tu estudio ya está aquí. Calcula tu Edad ATP para ver el número.',
    cta: { texto: 'Calcular mi Edad ATP', ruta: '/edad-atp' },
    imagen,
    enlaces: [laboratorios, comparar],
  });
}

/** Sin estudio: la misma invitación de siempre, con sus dos puertas. Imagen neutra: aquí no hay sexo que valga. */
export function tarjetaSinEstudio(): TarjetaResumen {
  return armarTarjeta({
    key: 'sin_estudio',
    titulo: 'Sube tu primer estudio',
    linea: 'En un minuto tienes tu Edad ATP y qué hacer con ella.',
    cta: { texto: 'Subir mi estudio', ruta: '/my-health' },
    imagen: 'estudio_neutra',
    enlaces: [{ key: 'sin_estudio', texto: 'No tengo estudio: ver qué laboratorios pedir', ruta: '/labs-guide' }],
  });
}

/** Lo que se dice cuando la evaluación no trae edades ni palabras del coach. Sin número: no se inventa. */
export const LINEA_EVALUACION_LISTA = 'Tu evaluación está lista';

/**
 * Con evaluación Elite. La línea: la Edad ATP que puso el coach y su delta si
 * el documento trae las dos edades; si no, sus palabras (`inicio.lead`) en una
 * línea; si tampoco, que está lista. Los marcadores en atención, sus símbolos
 * y el "N marcadores piden acción" ya no se asoman aquí: viven en la
 * evaluación, a un toque.
 *
 * 8-oct-2026 (revisión en frío): ¿y si las palabras del coach hablan de
 * marcadores ("tres de tus marcadores piden atención")? Decisión: su oración
 * se respeta tal cual, como PROSA en `linea`. Es lo que una persona firmó
 * para ese cliente, no un estado que la app calcula; censurarla sería cambiar
 * sus palabras. Lo que no puede pasar, y el test lo vigila, es que eso se
 * vuelva un estado o una etiqueta: el modelo sigue sin campo de semáforo, sin
 * color y sin conteo, y cuando hay edades la línea no usa el lead.
 */
export function tarjetaEvaluacion(e: EliteV3, sexo: unknown): TarjetaResumen {
  const edad = edadesDeEvaluacion(e);
  return armarTarjeta({
    key: 'evaluacion',
    titulo: `Tu evaluación con ${NOMBRE_COACH_ELITE}`,
    linea: edad
      ? `Edad ATP ${edadIntegralTexto(edad)} · ${deltaConReferente(edad)}`
      : unaLinea(e.inicio.lead) ?? LINEA_EVALUACION_LISTA,
    cta: { texto: 'Ver mi evaluación', ruta: '/salud/evaluacion-elite' },
    imagen: imagenEdadAtp(sexo),
  });
}

/**
 * Qué pinta el hero de HOY en modo ATP. Las vistas `elite_*` y `labs_*` son
 * las tarjetas planas de siempre (el componente no las toca); `tarjeta` es la
 * editorial.
 */
export type VistaHoyAtp =
  | { vista: 'elite_cargando' }
  | { vista: 'elite_no_se_pudo_leer' }
  | { vista: 'elite_en_camino' }
  | { vista: 'labs_cargando' }
  | { vista: 'labs_no_se_pudo_leer' }
  | {
    vista: 'tarjeta';
    tarjeta: TarjetaResumen;
    /** Cliente Elite con labs propios y evaluación aún sin cargar: se le avisa que viene. */
    notaEvaluacionEnCamino: boolean;
  };

export interface EntradaHoyAtp {
  /** decidirHeroElite (elite-hoy-core). */
  estadoElite: EstadoHeroElite;
  /** La lectura de la evaluación sigue en vuelo (no la del nivel). */
  eliteEnVuelo: boolean;
  /** La evaluación leída, o null. */
  evaluacion: EliteV3 | null;
  /** decidirEstadoHero (hero-laboratorios-core). */
  estadoLabs: EstadoHero;
  datos: DatosHero | null;
  /** `biological_sex` del perfil, o null si no se sabe. */
  sexo: unknown;
}

/**
 * El orden es el mismo que tenía HeroLaboratorios (20-sep-2026), movido aquí
 * para poder probarlo: primero decide lo Elite y solo 'labs' (o un cliente con
 * estudio propio) cae a los laboratorios. Lo único nuevo es la salida de los
 * tres estados felices, que ahora son una tarjeta editorial.
 */
export function decidirVistaHoyAtp(en: EntradaHoyAtp): VistaHoyAtp {
  const { estadoElite, estadoLabs } = en;
  if (estadoElite === 'evaluacion') {
    // 'evaluacion' sin documento no debería existir; si pasa, no se pinta una
    // tarjeta feliz con nada adentro: se dice que no se pudo leer.
    if (!en.evaluacion) return { vista: 'elite_no_se_pudo_leer' };
    return { vista: 'tarjeta', tarjeta: tarjetaEvaluacion(en.evaluacion, en.sexo), notaEvaluacionEnCamino: false };
  }
  if (estadoElite === 'no_se_pudo_leer') return { vista: 'elite_no_se_pudo_leer' };
  // Mientras la evaluación se lee no se pinta lo de laboratorios: a un cliente
  // Elite con labs propios le brincaría de su cálculo a lo del coach. Si lo que
  // falta es el nivel, quien ya tiene estudio conserva su tarjeta y quien no,
  // espera (la alternativa sería "Sube tu primer estudio" a quien no debe).
  if (estadoElite === 'cargando' && (en.eliteEnVuelo || estadoLabs !== 'con_estudio')) return { vista: 'elite_cargando' };
  const enCamino = estadoElite === 'en_camino';
  // Elite sin evaluación y sin labs propios: en camino. Solo cuando los labs
  // se leyeron bien y no hay estudio; un fallo de SUS labs se muestra como tal.
  if (enCamino && estadoLabs === 'sin_estudio') return { vista: 'elite_en_camino' };
  if (estadoLabs === 'cargando') return { vista: 'labs_cargando' };
  if (estadoLabs === 'no_se_pudo_leer') return { vista: 'labs_no_se_pudo_leer' };
  if (estadoLabs === 'sin_estudio') return { vista: 'tarjeta', tarjeta: tarjetaSinEstudio(), notaEvaluacionEnCamino: false };
  // con_estudio. Sin datos no hay de qué hablar: nunca una tarjeta feliz vacía.
  if (!en.datos) return { vista: 'labs_no_se_pudo_leer' };
  return { vista: 'tarjeta', tarjeta: tarjetaEdadAtp(en.datos, en.sexo), notaEvaluacionEnCamino: enCamino };
}

// ---------------------------------------------------------------------------
// Lo leído de UNA cuenta (el estado de HeroLaboratorios)
// ---------------------------------------------------------------------------

/**
 * 8-oct-2026 (revisión en frío): todo lo que HeroLaboratorios lee de una
 * cuenta vive junto y lleva el nombre de su dueña (`de`). Antes eran seis
 * useState sueltos que sobrevivían a un cambio de `userId` sin desmontar
 * (cambio de cuenta): la cuenta B podía ver el retrato, el número o la
 * evaluación de la cuenta A, un instante o hasta que su propia lectura
 * terminara, y una lectura de A que llegaba tarde se escribía encima de B.
 * La regla vive aquí para poder probarla; el componente solo la usa:
 *  - `lecturasDe`: si lo guardado es de otra cuenta, se empieza de cero.
 *  - `escribirLectura`: cada lectura escribe con la cuenta que la inició; si
 *    lo guardado ya es de otra, la escritura se descarta.
 */
export interface LecturasHoyAtp {
  /** La cuenta dueña de todo lo de abajo (undefined: sin sesión). */
  de: string | undefined;
  datos: DatosHero | null;
  cargando: boolean;
  fallo: boolean;
  /** `biological_sex` del perfil ya traducido; null = no se sabe (imagen neutra). */
  sexo: Sex | null;
  /** La evaluación Elite, leída en paralelo a los laboratorios. */
  elite: LecturaEliteHero;
  /** Se venció el tope de espera (TOPE_HERO_ELITE_MS). */
  vencido: boolean;
}

/** Una cuenta recién llegada: nada leído, todo en vuelo. */
export function lecturasIniciales(de: string | undefined): LecturasHoyAtp {
  return { de, datos: null, cargando: true, fallo: false, sexo: null, elite: { estado: 'cargando' }, vencido: false };
}

/** Lo guardado si es de `userId` (el MISMO objeto, para no repintar); si es de otra cuenta, de cero. */
export function lecturasDe(guardado: LecturasHoyAtp, userId: string | undefined): LecturasHoyAtp {
  return guardado.de === userId ? guardado : lecturasIniciales(userId);
}

/** Lo que una lectura puede cambiar. La dueña no: esa solo cambia empezando de cero. */
export type CambioLecturas = Partial<Omit<LecturasHoyAtp, 'de'>>;

/**
 * Aplica lo que trajo una lectura iniciada por la cuenta `de`. Si lo guardado
 * ya es de otra cuenta, la lectura llegó tarde y no se escribe nada (se
 * devuelve el mismo objeto). `cambio` recibe lo guardado para las reglas que
 * dependen de él ("una evaluación ya vista gana a un fallo de recarga") y
 * devuelve null si no hay nada que cambiar.
 */
export function escribirLectura(
  guardado: LecturasHoyAtp,
  de: string | undefined,
  cambio: (previo: LecturasHoyAtp) => CambioLecturas | null,
): LecturasHoyAtp {
  if (guardado.de !== de) return guardado;
  const c = cambio(guardado);
  return c ? { ...guardado, ...c, de: guardado.de } : guardado;
}

// ---------------------------------------------------------------------------
// Modo Elite DX: la semana del programa
// ---------------------------------------------------------------------------

/** Lo mínimo de `EstadoProgramaElite` (useProgramaElite) que se necesita; el hook importa react-native y aquí no entra. */
export type ProgramaParaResumen =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'sin_evaluacion' }
  | { estado: 'ok'; avance: AvancePrograma | null };

/**
 * La semana del programa como tarjeta editorial. El título es "SEMANA 3 DE
 * 12"; la línea, el día; la barra, el avance. Terminado el programa no se
 * esconde nada: se dice que se completó y que la cuenta sigue de seguimiento
 * (mismo copy que el encabezado anterior).
 */
export function tarjetaPrograma(a: AvancePrograma): TarjetaResumen {
  const cta = { texto: 'Ver mi programa', ruta: '/programa' as const };
  if (a.completado) {
    return armarTarjeta({
      key: 'programa',
      titulo: 'Programa completado',
      linea: `Terminaste tus ${a.semanasTotales} semanas. Vas en la semana ${a.semana}, de seguimiento.`,
      cta,
      imagen: 'programa_sin_persona',
    });
  }
  return armarTarjeta({
    key: 'programa',
    titulo: `Semana ${a.semana} de ${a.semanasTotales}`,
    linea: `Día ${a.dia} de tu programa con ${NOMBRE_COACH_ELITE}`,
    cta,
    imagen: 'programa_sin_persona',
    progreso: { current: a.pct, target: 100 },
    // 8-oct-2026 (revisión en frío): la barra es un dibujo; al lector de
    // pantalla se le dice el avance con palabras (antes la versión plana lo
    // decía con accessibilityRole="progressbar").
    accesibilidad: `Semana ${a.semana} de ${a.semanasTotales}, día ${a.dia}. Llevas el ${a.pct} por ciento de tu programa con ${NOMBRE_COACH_ELITE}. Ver mi programa.`,
  });
}

/**
 * Qué pinta el encabezado del programa.
 *  - `nada`: no se monta nada (la pantalla que lo aloja ya lo dice, o no se
 *    promete lo que nadie prometió).
 *  - `hueco`: un espacio del mismo alto mientras se lee.
 *  - `error`, `sin_evaluacion`, `fecha_ilegible`: las tarjetas planas de siempre.
 *  - `compacta`: la versión chica, sin imagen ni CTA, para DENTRO de Mi
 *    programa (`soloAvance`): un CTA a /programa desde /programa no lleva a
 *    ningún lado.
 *  - `tarjeta`: la editorial, para HOY.
 */
export type VistaProgramaHoy =
  | { vista: 'nada' }
  | { vista: 'hueco' }
  | { vista: 'error' }
  | { vista: 'sin_evaluacion' }
  | { vista: 'fecha_ilegible' }
  | { vista: 'compacta'; avance: AvancePrograma | null }
  | { vista: 'tarjeta'; tarjeta: TarjetaResumen };

export interface OpcionesProgramaHoy {
  /** El nivel ya confirmó que existe una evaluación. */
  tieneEvaluacion?: boolean;
  /** Solo la semana, compacta (Mi programa). */
  soloAvance?: boolean;
  /** Se puede decir "en preparación" (por defecto true). */
  prometerPreparacion?: boolean;
}

/**
 * Las mismas reglas que tenía ProgramaHeader (25-sep-2026), en el mismo
 * orden; lo nuevo es la salida del estado 'ok' en HOY. Una fecha de inicio
 * que no se puede leer NO se viste de tarjeta bonita: se sigue diciendo, en
 * plano, que no se pudo leer (y no se inventa una semana).
 */
export function decidirVistaPrograma(programa: ProgramaParaResumen, opts: OpcionesProgramaHoy = {}): VistaProgramaHoy {
  const soloAvance = opts.soloAvance === true;
  const prometer = opts.prometerPreparacion !== false;
  if (programa.estado === 'cargando') return soloAvance ? { vista: 'nada' } : { vista: 'hueco' };
  if (soloAvance && programa.estado !== 'ok') return { vista: 'nada' };
  if (programa.estado === 'sin_evaluacion' && (opts.tieneEvaluacion === true || !prometer)) return { vista: 'nada' };
  if (programa.estado === 'error') return { vista: 'error' };
  if (programa.estado === 'sin_evaluacion') return { vista: 'sin_evaluacion' };
  if (soloAvance) return { vista: 'compacta', avance: programa.avance };
  if (programa.avance === null) return { vista: 'fecha_ilegible' };
  return { vista: 'tarjeta', tarjeta: tarjetaPrograma(programa.avance) };
}
