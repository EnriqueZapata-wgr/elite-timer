/**
 * Hoy editorial (7-oct-2026): lo primero de HOY es una tarjeta con imagen,
 * una línea y un CTA. Estos tests cuidan lo que el dueño pidió y lo que la
 * casa no perdona:
 *  - el semáforo de marcadores NO vuelve a la primera vista (ni por el modelo
 *    ni por los componentes),
 *  - un fallo de lectura nunca se viste de tarjeta bonita,
 *  - el sexo nunca se asume para elegir el retrato,
 *  - la decisión de qué se pinta es la MISMA de antes (se compara contra la
 *    cadena de ifs que vivía en HeroLaboratorios y en ProgramaHeader).
 * 8-oct-2026 (revisión en frío): además, que la foto del programa salga solo
 * del banco sin persona, que el delta diga contra qué se compara, que la
 * línea quepa en un teléfono angosto, que una lista o una inicial no partan
 * las palabras del coach, y que lo leído de una cuenta no se le pinte a otra.
 * Se corre con
 * `node scripts/run-tests-sin-vitest.js src/services/hoy/__tests__/hoy-resumen-core.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarEliteV3, type EliteV3 } from '@/src/services/elite/elite-v3-core';
import type { AvancePrograma } from '@/src/services/elite/programa-elite-core';
import { edadesDeEvaluacion, marcadoresDeEvaluacion, type EstadoHeroElite } from '@/src/services/hoy/elite-hoy-core';
import {
  AVISO_FALTA_SEXO, edadIntegralTexto, textoDeltaEdad,
  type DatosHero, type EstadoHero, type MarcadorHero,
} from '@/src/services/hoy/hero-laboratorios-core';
import {
  decidirVistaHoyAtp, decidirVistaPrograma, deltaConReferente, escribirLectura, imagenEdadAtp, imagenProgramaKey,
  lecturasDe, lecturasIniciales, tarjetaEdadAtp, tarjetaEvaluacion, tarjetaPrograma,
  tarjetaSinEstudio, tarjetaPorEmpezar, unaLinea, IMAGENES_PROGRAMA_SIN_PERSONA, LARGO_LINEA_RESUMEN, LETRA_CHICA_EDAD_ATP,
  LINEA_EVALUACION_LISTA, TEXTO_VER_LABORATORIOS, TEXTO_VER_VALORES,
  type ProgramaParaResumen, type TarjetaResumen, type VistaHoyAtp,
} from '@/src/services/hoy/hoy-resumen-core';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { tuDiaImageGroup, type TuDiaGroup } from '@/src/utils/image-pick-core';

const leer = (rel: string): string => readFileSync(resolve(process.cwd(), rel), 'utf8');

const ejemplo: unknown = JSON.parse(leer('R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'));

/** Copia profunda: el validador devuelve el mismo objeto y los tests mutan. */
function omar(): EliteV3 {
  const r = validarEliteV3(JSON.parse(JSON.stringify(ejemplo)));
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}

const m = (key: string, etiqueta: string, estado: MarcadorHero['estado']): MarcadorHero =>
  ({ key, etiqueta, estado, peso: 5, fecha: '2026-09-01' });

/** Un estudio con de todo: uno en atención, uno aceptable, uno óptimo. Justo lo que pintaba puntos rojos. */
const MARCADORES: MarcadorHero[] = [
  m('glucosa', 'Glucosa en ayuno', 'atencion'),
  m('hba1c', 'HbA1c', 'aceptable'),
  m('ferritina', 'Ferritina', 'optimo'),
];

const datos = (o: Partial<DatosHero> = {}): DatosHero => ({
  tieneEstudio: true, edad: { integral: 41.3, cronologica: 45 }, marcadores: MARCADORES, faltaSexo: false, ...o,
});

const CAMPOS_TARJETA = ['accesibilidad', 'cta', 'enlaces', 'imagen', 'key', 'letraChica', 'linea', 'progreso', 'titulo'];

/** Nada que huela a semáforo: nombres de marcador, estados, etiquetas ni símbolos. */
const SEMAFORO = /Glucosa|HbA1c|Ferritina|atenci[oó]n|aceptable|[oó]ptimo|sin_banda|Sin rango|En tu ventana|piden? acci[oó]n|[▲◆●]/i;

const EM_DASH = '—';
const ROJAS = /diagn[oó]stic|tratamiento|terap[eé]utic|previene|\bcura\b|receta m[eé]dica/i;

function textos(t: TarjetaResumen): string[] {
  return [t.titulo, t.linea, t.letraChica ?? '', t.cta.label, t.accesibilidad, ...t.enlaces.map((e) => e.texto)];
}

const avance = (o: Partial<AvancePrograma> = {}): AvancePrograma => ({
  dia: 17, semana: 3, semanasTotales: 12, pct: 20, completado: false, ...o,
});

// ---------------------------------------------------------------------------

describe('imagenEdadAtp: el sexo nunca se asume', () => {
  it('solo male y female exactos dan retrato', () => {
    expect(imagenEdadAtp('male')).toBe('edad_atp_el');
    expect(imagenEdadAtp('female')).toBe('edad_atp_ella');
  });
  it('sin sexo, otro valor o basura: la imagen neutra, nunca "él" por defecto', () => {
    for (const raro of [null, undefined, '', 'intersex', 'MALE', 'Female', 'hombre', 'm', 0, 1, true, {}, []]) {
      expect(imagenEdadAtp(raro)).toBe('estudio_neutra');
    }
  });
});

describe('unaLinea', () => {
  it('sin texto no hay línea', () => {
    for (const nada of [null, undefined, '', '   ', '\n\t', 7, {}]) expect(unaLinea(nada)).toBeNull();
  });
  it('quita saltos y espacios dobles', () => {
    expect(unaLinea('  Tu cuerpo responde.\n\nVamos   bien.  ')).toBe('Tu cuerpo responde. Vamos bien.');
  });
  it('si no cabe, se queda con las oraciones completas que quepan (las palabras del coach no se dejan a media frase)', () => {
    const lead = 'Tienes 38 años. Tu cuerpo funciona como uno de 44.5. Esos seis años y medio de diferencia son justo los que más rápido se bajan.';
    expect(lead.length).toBeGreaterThan(LARGO_LINEA_RESUMEN);
    // El decimal "44.5" no parte la oración; el corte cae en un punto de verdad.
    expect(unaLinea(lead)).toBe('Tienes 38 años. Tu cuerpo funciona como uno de 44.5.');
  });
  it('una abreviatura no cuenta como fin de oración', () => {
    const lead = 'Revisamos tus resultados con el Dr. Pérez y lo primero que vamos a mover es tu descanso, con tres cambios chicos esta semana.';
    const r = unaLinea(lead) as string;
    expect(r.endsWith('Dr.')).toBe(false);
    expect(r.endsWith('…')).toBe(true);
    expect(r.length).toBeLessThanOrEqual(LARGO_LINEA_RESUMEN);
  });
  it('una primera oración diminuta no se queda sola: se corta por palabra', () => {
    const lead = 'Hola. Lo primero que vamos a mover es la forma en que manejas la glucosa después de comer, con tres cambios chicos.';
    const r = unaLinea(lead) as string;
    expect(r).not.toBe('Hola.');
    expect(r.endsWith('…')).toBe(true);
  });
  it('si ni la primera oración cabe, corta en palabra completa y lo dice con puntos suspensivos', () => {
    const largo = 'Tu metabolismo trae buena base y lo que vamos a mover primero es la forma en que manejas la glucosa después de comer, con tres cambios.';
    const r = unaLinea(largo) as string;
    expect(r.length).toBeLessThanOrEqual(LARGO_LINEA_RESUMEN);
    expect(r.endsWith('…')).toBe(true);
    // Lo que queda es el principio del texto, sin palabra partida.
    const sinPuntos = r.slice(0, -1);
    expect(largo.startsWith(sinPuntos)).toBe(true);
    expect(largo[sinPuntos.length]).toBe(' ');
  });
  it('un texto que cabe exacto no se toca', () => {
    const justo = 'a'.repeat(LARGO_LINEA_RESUMEN);
    expect(unaLinea(justo)).toBe(justo);
  });
  it('una sola palabra larguísima se corta igual (no se queda vacía)', () => {
    const r = unaLinea('x'.repeat(300)) as string;
    expect(r.length).toBeLessThanOrEqual(LARGO_LINEA_RESUMEN);
    expect(r.length).toBeGreaterThan(10);
  });
  it('8-oct-2026: caben dos renglones de 12 pt en un teléfono de 320 pt (eran 84 y no cabían)', () => {
    expect(LARGO_LINEA_RESUMEN).toBeLessThanOrEqual(70);
  });
  it('8-oct-2026: el número de una lista no cierra la oración ("1.", "2.")', () => {
    const lead = 'Tus tres prioridades de este trimestre son: 1. Dormir siete horas. 2. Bajar la inflamación crónica de bajo grado.';
    expect(lead.length).toBeGreaterThan(LARGO_LINEA_RESUMEN);
    // Con 70 el "2." cae justo en el límite: antes la línea terminaba ahí.
    expect(unaLinea(lead)).toBe('Tus tres prioridades de este trimestre son: 1. Dormir siete horas.');
    // En ningún largo la línea termina en el número suelto, ni cerrando ni cortando por palabra.
    for (let max = 12; max < lead.length; max += 1) {
      const r = unaLinea(lead, max) as string;
      expect(/(?:^|\s)\d{1,2}\.?…?$/.test(r), `max=${max}: "${r}"`).toBe(false);
      expect(r.length, `max=${max}: "${r}"`).toBeLessThanOrEqual(max);
    }
  });
  it('8-oct-2026: una inicial tampoco ("Dr. J. Pérez")', () => {
    const lead = 'Revisé tus estudios con el Dr. J. Pérez y coincidimos en el plan.';
    // Cabe entera: no se toca.
    expect(unaLinea(lead)).toBe(lead);
    // Seguida de más texto, la oración se cierra en "plan.", no en "Dr." ni en "J.".
    expect(unaLinea(`${lead} Lo primero es tu descanso y después tu glucosa.`)).toBe(lead);
    // Y si hay que cortarla por palabra, la línea no termina en la abreviatura ni en la inicial.
    for (let max = 12; max < lead.length; max += 1) {
      const r = unaLinea(lead, max) as string;
      expect(/(?:^|\s)(?:Dr|J)\.?…?$/.test(r), `max=${max}: "${r}"`).toBe(false);
      expect(r.endsWith('…'), `max=${max}: "${r}"`).toBe(true);
      expect(r.length, `max=${max}: "${r}"`).toBeLessThanOrEqual(max);
    }
    expect(unaLinea(lead, 40)).toBe('Revisé tus estudios con el…');
  });
  it('un decimal y una oración de verdad siguen cerrando (el arreglo no se pasó de la raya)', () => {
    expect(unaLinea('Tu cuerpo funciona como uno de 44.5. Lo demás lo vemos en tu evaluación, con calma y por partes.'))
      .toBe('Tu cuerpo funciona como uno de 44.5.');
  });
});

describe('deltaConReferente: el delta dice contra qué se compara (8-oct-2026)', () => {
  it('más joven, por encima y en línea, con "tu edad real" una sola vez', () => {
    expect(deltaConReferente({ integral: 41.3, cronologica: 45 })).toBe('3.7 años más joven que tu edad real');
    expect(deltaConReferente({ integral: 51.5, cronologica: 45 })).toBe('6.5 años por encima de tu edad real');
    expect(deltaConReferente({ integral: 45, cronologica: 45 })).toBe('En línea con tu edad real');
    expect(deltaConReferente({ integral: 44, cronologica: 45 })).toBe('1 año más joven que tu edad real');
    expect(deltaConReferente({ integral: 48, cronologica: 45 })).toBe('3 años por encima de tu edad real');
  });
  it('el número y el signo siguen saliendo del helper de siempre: solo se completa la frase', () => {
    for (const integral of [30, 41.3, 44.96, 45, 45.04, 45.1, 48, 51.5, 62.25]) {
      const edad = { integral, cronologica: 45 };
      const frase = deltaConReferente(edad);
      expect(frase.startsWith(textoDeltaEdad(edad)), frase).toBe(true);
      expect(frase.match(/edad real/g) ?? [], frase).toHaveLength(1);
      expect(frase.endsWith('tu edad real'), frase).toBe(true);
      expect(frase.length).toBeLessThanOrEqual(LARGO_LINEA_RESUMEN);
    }
  });
});

describe('tarjetaEdadAtp (con estudio)', () => {
  it('con Edad ATP: el número en el título, el delta con su referente en la línea y un solo CTA', () => {
    const d = datos();
    const t = tarjetaEdadAtp(d, 'female');
    expect(t.key).toBe('edad_atp');
    expect(t.titulo).toBe(`TU EDAD ATP: ${edadIntegralTexto(d.edad!)}`);
    expect(t.titulo).toBe('TU EDAD ATP: 41.3');
    expect(t.linea).toBe(deltaConReferente(d.edad!));
    expect(t.linea).toBe('3.7 años más joven que tu edad real');
    expect(t.letraChica).toBe(LETRA_CHICA_EDAD_ATP);
    expect(t.cta).toEqual({ label: 'VER MI EDAD ATP', ruta: '/edad-atp' });
    expect(t.progreso).toBeNull();
  });
  it('el delta nunca se invierte: por encima y en línea salen del mismo helper', () => {
    const arriba = { integral: 48, cronologica: 45 };
    expect(tarjetaEdadAtp(datos({ edad: arriba }), null).linea).toBe(deltaConReferente(arriba));
    expect(tarjetaEdadAtp(datos({ edad: arriba }), null).linea).toBe('3 años por encima de tu edad real');
    const igual = { integral: 45, cronologica: 45 };
    expect(tarjetaEdadAtp(datos({ edad: igual }), null).linea).toBe('En línea con tu edad real');
  });
  it('sin cálculo todavía no se inventa un número: línea neutra y CTA a calcular', () => {
    const t = tarjetaEdadAtp(datos({ edad: null }), 'male');
    expect(t.titulo).toBe('TU EDAD ATP');
    expect(t.linea).toBe('Tu estudio ya está aquí. Calcula tu Edad ATP para ver el número.');
    expect(t.letraChica).toBeNull();
    expect(t.cta).toEqual({ label: 'CALCULAR MI EDAD ATP', ruta: '/edad-atp' });
    expect(textos(t).join(' ')).not.toMatch(/\d/);
  });
  it('NO lleva marcadores, estados ni etiquetas de semáforo, aunque el estudio traiga uno en atención', () => {
    for (const d of [datos(), datos({ edad: null }), datos({ faltaSexo: true }), datos({ edad: null, faltaSexo: true })]) {
      const t = tarjetaEdadAtp(d, 'male');
      // El modelo no tiene campo donde ponerlos.
      expect(Object.keys(t).sort()).toEqual(CAMPOS_TARJETA);
      expect(JSON.stringify(t)).not.toMatch(SEMAFORO);
    }
  });
  it('el retrato solo con sexo conocido; si los datos dicen que falta, neutra aunque llegue uno', () => {
    expect(tarjetaEdadAtp(datos(), 'male').imagen).toBe('edad_atp_el');
    expect(tarjetaEdadAtp(datos(), 'female').imagen).toBe('edad_atp_ella');
    expect(tarjetaEdadAtp(datos(), null).imagen).toBe('estudio_neutra');
    expect(tarjetaEdadAtp(datos(), undefined).imagen).toBe('estudio_neutra');
    expect(tarjetaEdadAtp(datos({ faltaSexo: true }), 'male').imagen).toBe('estudio_neutra');
    expect(tarjetaEdadAtp(datos({ faltaSexo: true }), 'female').imagen).toBe('estudio_neutra');
  });
  it('"Comparar con mi estudio anterior" sigue ahí, como enlace callado', () => {
    for (const d of [datos(), datos({ edad: null }), datos({ faltaSexo: true })]) {
      const comparar = tarjetaEdadAtp(d, 'male').enlaces.filter((e) => e.key === 'comparar');
      expect(comparar).toEqual([{ key: 'comparar', texto: 'Comparar con mi estudio anterior', ruta: '/edad-atp/comparar' }]);
    }
  });
  it('sin sexo y sin Edad ATP no se le dice "calcula" a quien no puede: se dice qué falta y el CTA va al perfil', () => {
    const t = tarjetaEdadAtp(datos({ edad: null, faltaSexo: true }), null);
    expect(t.linea).toMatch(/falta tu sexo en tu perfil/);
    expect(t.linea).not.toMatch(/Calcula/);
    expect(t.cta).toEqual({ label: 'COMPLETAR MI PERFIL', ruta: '/profile' });
    // El CTA ya es la puerta al perfil: no se repite abajo.
    expect(t.enlaces.some((e) => e.key === 'falta_sexo')).toBe(false);
  });
  it('8-oct-2026: en ese estado la puerta a sus valores no desaparece de HOY ("Ver mis valores" a /edad-atp)', () => {
    const t = tarjetaEdadAtp(datos({ edad: null, faltaSexo: true }), null);
    expect(TEXTO_VER_VALORES).toBe('Ver mis valores');
    expect(t.enlaces[0]).toEqual({ key: 'valores', texto: 'Ver mis valores', ruta: '/edad-atp' });
    expect(t.enlaces.map((e) => e.key)).toEqual(['valores', 'comparar']);
    // Solo ahí: en los demás estados el CTA de la tarjeta ya lleva a /edad-atp.
    for (const d of [datos(), datos({ edad: null }), datos({ faltaSexo: true })]) {
      const otra = tarjetaEdadAtp(d, 'male');
      expect(otra.cta.ruta).toBe('/edad-atp');
      expect(otra.enlaces.some((e) => e.key === 'valores')).toBe(false);
    }
  });
  it('sin sexo pero con Edad ATP ya calculada: enseña su número y la falta del sexo queda como enlace al perfil', () => {
    const t = tarjetaEdadAtp(datos({ faltaSexo: true }), null);
    expect(t.titulo).toBe('TU EDAD ATP: 41.3');
    expect(t.enlaces[0]).toEqual({ key: 'falta_sexo', texto: AVISO_FALTA_SEXO, ruta: '/profile' });
    // Con sexo conocido ese enlace no existe.
    expect(tarjetaEdadAtp(datos(), 'male').enlaces.map((e) => e.key)).toEqual(['laboratorios', 'comparar']);
    expect(t.enlaces.map((e) => e.key)).toEqual(['falta_sexo', 'laboratorios', 'comparar']);
  });
  it('8-oct-2026: sus laboratorios quedan a un toque de HOY, como renglón callado y directo a ATP Labs', () => {
    expect(TEXTO_VER_LABORATORIOS).toBe('Ver mis laboratorios');
    for (const d of [datos(), datos({ edad: null }), datos({ faltaSexo: true })]) {
      const labs = tarjetaEdadAtp(d, 'male').enlaces.filter((e) => e.key === 'laboratorios');
      expect(labs).toEqual([{ key: 'laboratorios', texto: 'Ver mis laboratorios', ruta: '/edad-atp/labs' }]);
    }
    // Sin sexo y sin Edad ATP ya existe "Ver mis valores": no se duplica la puerta.
    const sinNada = tarjetaEdadAtp(datos({ edad: null, faltaSexo: true }), null);
    expect(sinNada.enlaces.some((e) => e.key === 'laboratorios')).toBe(false);
  });
});

describe('tarjetaSinEstudio', () => {
  const t = tarjetaSinEstudio();
  it('las mismas dos puertas de siempre: subir el estudio y "no tengo estudio"', () => {
    expect(t.titulo).toBe('SUBE TU PRIMER ESTUDIO');
    expect(t.cta).toEqual({ label: 'SUBIR MI ESTUDIO', ruta: '/my-health' });
    expect(t.enlaces).toHaveLength(1);
    expect(t.enlaces[0].ruta).toBe('/labs-guide');
    expect(t.enlaces[0].texto).toMatch(/^No tengo estudio/);
  });
  it('imagen neutra (no hay persona que retratar) y ningún número inventado', () => {
    expect(t.imagen).toBe('estudio_neutra');
    expect(t.letraChica).toBeNull();
    expect(Object.keys(t).sort()).toEqual(CAMPOS_TARJETA);
  });
});

describe('tarjetaEvaluacion (cliente con evaluación Elite)', () => {
  it('título con el nombre del coach, la Edad ATP que él puso y su delta, y un solo CTA a la evaluación', () => {
    const e = omar();
    const edad = edadesDeEvaluacion(e);
    expect(edad).not.toBeNull();
    const t = tarjetaEvaluacion(e, 'male');
    expect(t.key).toBe('evaluacion');
    expect(t.titulo).toBe(`TU EVALUACIÓN CON ${NOMBRE_COACH_ELITE.toUpperCase()}`);
    expect(t.linea).toBe(`Edad ATP ${edadIntegralTexto(edad!)} · ${deltaConReferente(edad!)}`);
    expect(t.linea).toMatch(/tu edad real$/);
    expect(t.cta).toEqual({ label: 'VER MI EVALUACIÓN', ruta: '/salud/evaluacion-elite' });
    expect(t.enlaces).toEqual([]);
    expect(t.letraChica).toBeNull();
  });
  it('NO lleva las filas de marcadores, sus símbolos ni el "N marcadores piden acción"', () => {
    const e = omar();
    const t = tarjetaEvaluacion(e, 'male');
    expect(Object.keys(t).sort()).toEqual(CAMPOS_TARJETA);
    const json = JSON.stringify(t);
    expect(json).not.toMatch(/[▲◆●]/);
    expect(json).not.toMatch(/piden? acci[oó]n/i);
    const nombres = marcadoresDeEvaluacion(e).map((x) => x.nombre).filter((n) => n.length >= 4);
    expect(nombres.length).toBeGreaterThan(3);
    for (const n of nombres) expect(json.includes(n), `se coló el marcador "${n}"`).toBe(false);
    // Ni el estado crudo que firmó el coach.
    expect(json).not.toMatch(/"(att|sub|opt)"/);
  });
  it('sin las dos edades: las palabras del coach, en una línea', () => {
    const e = omar();
    e.inicio.edad_atp = null;
    e.edades.atp = null;
    e.inicio.lead = '  Tu base es buena.\nLo primero que vamos a mover es tu descanso.  ';
    expect(edadesDeEvaluacion(e)).toBeNull();
    const t = tarjetaEvaluacion(e, 'female');
    expect(t.linea).toBe('Tu base es buena. Lo primero que vamos a mover es tu descanso.');
    expect(t.linea).not.toMatch(/Edad ATP/);
  });
  it('sin edades y sin palabras: se dice que está lista, sin inventar un número', () => {
    const e = omar();
    e.inicio.edad_atp = null;
    e.edades.atp = null;
    e.inicio.lead = null;
    const t = tarjetaEvaluacion(e, null);
    expect(t.linea).toBe(LINEA_EVALUACION_LISTA);
    expect(t.linea).not.toMatch(/\d/);
  });
  it('retrato solo con el sexo del PERFIL; el sexo que trae el documento no se usa para adivinar', () => {
    const e = omar();
    expect(tarjetaEvaluacion(e, 'male').imagen).toBe('edad_atp_el');
    expect(tarjetaEvaluacion(e, 'female').imagen).toBe('edad_atp_ella');
    // El documento dice un sexo, pero el perfil no se pudo leer: neutra.
    expect(e.cliente.sexo === 'male' || e.cliente.sexo === 'female').toBe(true);
    expect(tarjetaEvaluacion(e, null).imagen).toBe('estudio_neutra');
  });
});

describe('decidirVistaHoyAtp', () => {
  const ELITE: EstadoHeroElite[] = ['cargando', 'evaluacion', 'en_camino', 'no_se_pudo_leer', 'labs'];
  const LABS: EstadoHero[] = ['cargando', 'no_se_pudo_leer', 'sin_estudio', 'con_estudio'];

  /** La cadena de ifs que vivía en HeroLaboratorios hasta el 6-oct-2026, copiada tal cual. */
  function antes(estadoElite: EstadoHeroElite, eliteEnVuelo: boolean, estado: EstadoHero): string {
    if (estadoElite === 'evaluacion') return 'evaluacion';
    if (estadoElite === 'no_se_pudo_leer') return 'elite_no_se_pudo_leer';
    if (eliteEnVuelo && estadoElite === 'cargando') return 'elite_cargando';
    if (estadoElite === 'cargando' && estado !== 'con_estudio') return 'elite_cargando';
    const enCamino = estadoElite === 'en_camino';
    if (enCamino && estado === 'sin_estudio') return 'elite_en_camino';
    if (estado === 'cargando') return 'labs_cargando';
    if (estado === 'no_se_pudo_leer') return 'labs_no_se_pudo_leer';
    if (estado === 'sin_estudio') return 'sin_estudio';
    return 'con_estudio';
  }

  const nombre = (v: VistaHoyAtp): string => {
    if (v.vista !== 'tarjeta') return v.vista;
    return v.tarjeta.key === 'edad_atp' ? 'con_estudio' : v.tarjeta.key;
  };

  function vistaDe(estadoElite: EstadoHeroElite, eliteEnVuelo: boolean, estadoLabs: EstadoHero): VistaHoyAtp {
    return decidirVistaHoyAtp({
      estadoElite,
      eliteEnVuelo,
      evaluacion: estadoElite === 'evaluacion' ? omar() : null,
      estadoLabs,
      // Datos solo cuando el estado de labs dice que los hay (así los entrega decidirEstadoHero).
      datos: estadoLabs === 'con_estudio' ? datos() : estadoLabs === 'sin_estudio' ? datos({ tieneEstudio: false, marcadores: [], edad: null }) : null,
      sexo: 'male',
    });
  }

  it('la decisión es la MISMA de antes en las 40 combinaciones (solo cambió cómo se ven los estados felices)', () => {
    let n = 0;
    for (const el of ELITE) for (const enVuelo of [true, false]) for (const la of LABS) {
      n += 1;
      expect(nombre(vistaDe(el, enVuelo, la)), `${el} / enVuelo=${enVuelo} / ${la}`).toBe(antes(el, enVuelo, la));
    }
    expect(n).toBe(40);
  });

  it('regla 7: un fallo o una lectura en vuelo de los labs NUNCA sale como tarjeta feliz (salvo que haya evaluación)', () => {
    for (const el of ELITE) for (const enVuelo of [true, false]) for (const la of ['cargando', 'no_se_pudo_leer'] as const) {
      const v = vistaDe(el, enVuelo, la);
      if (el === 'evaluacion') continue;
      expect(v.vista, `${el} / ${la}`).not.toBe('tarjeta');
    }
    // El caso que más duele: sin red, a nadie se le dice "Sube tu primer estudio".
    const sinRed = vistaDe('labs', false, 'no_se_pudo_leer');
    expect(sinRed).toEqual({ vista: 'labs_no_se_pudo_leer' });
  });

  it('un fallo de la evaluación Elite tampoco: "no se pudo leer" gana a los laboratorios leídos', () => {
    for (const la of LABS) {
      expect(vistaDe('no_se_pudo_leer', false, la)).toEqual({ vista: 'elite_no_se_pudo_leer' });
      expect(vistaDe('no_se_pudo_leer', true, la)).toEqual({ vista: 'elite_no_se_pudo_leer' });
    }
  });

  it('entradas incoherentes no fabrican una tarjeta vacía', () => {
    // "Hay evaluación" sin documento.
    expect(decidirVistaHoyAtp({
      estadoElite: 'evaluacion', eliteEnVuelo: false, evaluacion: null, estadoLabs: 'con_estudio', datos: datos(), sexo: 'male',
    })).toEqual({ vista: 'elite_no_se_pudo_leer' });
    // "Con estudio" sin datos.
    expect(decidirVistaHoyAtp({
      estadoElite: 'labs', eliteEnVuelo: false, evaluacion: null, estadoLabs: 'con_estudio', datos: null, sexo: 'male',
    })).toEqual({ vista: 'labs_no_se_pudo_leer' });
  });

  it('con evaluación manda la evaluación, con o sin labs propios', () => {
    for (const la of LABS) {
      const v = vistaDe('evaluacion', false, la);
      expect(v.vista).toBe('tarjeta');
      if (v.vista === 'tarjeta') {
        expect(v.tarjeta.key).toBe('evaluacion');
        expect(v.notaEvaluacionEnCamino).toBe(false);
      }
    }
  });

  it('cliente Elite con labs propios y evaluación sin cargar: su tarjeta de Edad ATP con la nota de que viene', () => {
    const v = vistaDe('en_camino', false, 'con_estudio');
    expect(v.vista).toBe('tarjeta');
    if (v.vista === 'tarjeta') {
      expect(v.tarjeta.key).toBe('edad_atp');
      expect(v.notaEvaluacionEnCamino).toBe(true);
    }
    // A quien no es Elite no se le promete nada.
    const comun = vistaDe('labs', false, 'con_estudio');
    if (comun.vista === 'tarjeta') expect(comun.notaEvaluacionEnCamino).toBe(false);
    expect(comun.vista).toBe('tarjeta');
  });

  it('ninguna vista, en ninguna combinación, trae rastro del semáforo', () => {
    for (const el of ELITE) for (const enVuelo of [true, false]) for (const la of LABS) {
      const v = vistaDe(el, enVuelo, la);
      if (v.vista !== 'tarjeta' || v.tarjeta.key === 'evaluacion') continue;
      expect(JSON.stringify(v), `${el} / ${la}`).not.toMatch(SEMAFORO);
    }
  });

  it('el sexo viaja hasta la imagen y sin él la tarjeta es neutra', () => {
    const con = decidirVistaHoyAtp({ estadoElite: 'labs', eliteEnVuelo: false, evaluacion: null, estadoLabs: 'con_estudio', datos: datos(), sexo: 'female' });
    const sin = decidirVistaHoyAtp({ estadoElite: 'labs', eliteEnVuelo: false, evaluacion: null, estadoLabs: 'con_estudio', datos: datos(), sexo: null });
    expect(con.vista === 'tarjeta' && con.tarjeta.imagen).toBe('edad_atp_ella');
    expect(sin.vista === 'tarjeta' && sin.tarjeta.imagen).toBe('estudio_neutra');
  });
});

describe('tarjetaPrograma', () => {
  it('"SEMANA 3 DE 12", el día, la barra y un CTA a Mi programa', () => {
    const t = tarjetaPrograma(avance());
    expect(t.key).toBe('programa');
    expect(t.titulo).toBe('SEMANA 3 DE 12');
    expect(t.linea).toBe(`Día 17 de tu programa con ${NOMBRE_COACH_ELITE}`);
    expect(t.progreso).toEqual({ current: 20, target: 100 });
    expect(t.cta).toEqual({ label: 'VER MI PROGRAMA', ruta: '/programa' });
    expect(t.imagen).toBe('programa_sin_persona');
    expect(t.enlaces).toEqual([]);
    expect(Object.keys(t).sort()).toEqual(CAMPOS_TARJETA);
  });
  it('8-oct-2026: al lector de pantalla se le dice la semana, el día y el avance que la barra solo dibuja', () => {
    const t = tarjetaPrograma(avance());
    expect(t.accesibilidad).toBe(`Semana 3 de 12, día 17. Llevas el 20 por ciento de tu programa con ${NOMBRE_COACH_ELITE}. Ver mi programa.`);
    const fin = tarjetaPrograma(avance({ dia: 95, semana: 14, pct: 100, completado: true }));
    expect(fin.accesibilidad).toBe('Programa completado. Terminaste tus 12 semanas. Vas en la semana 14, de seguimiento. Ver mi programa.');
  });
  it('terminado el programa no se esconde nada: se dice y sigue de seguimiento, sin barra', () => {
    const t = tarjetaPrograma(avance({ dia: 95, semana: 14, pct: 100, completado: true }));
    expect(t.titulo).toBe('PROGRAMA COMPLETADO');
    expect(t.linea).toBe('Terminaste tus 12 semanas. Vas en la semana 14, de seguimiento.');
    expect(t.progreso).toBeNull();
    expect(t.cta.ruta).toBe('/programa');
  });
});

describe('la foto del programa: solo del banco SIN persona (8-oct-2026, revisión en frío)', () => {
  const FRANJAS: TuDiaGroup[] = ['despertar', 'medio-dia', 'atardecer', 'noche'];
  const todas: string[] = FRANJAS.flatMap((f) => [...IMAGENES_PROGRAMA_SIN_PERSONA[f]]);

  it('los nombres permitidos, uno por uno (cambiar esta lista es una decisión, no un descuido)', () => {
    expect(IMAGENES_PROGRAMA_SIN_PERSONA).toEqual({
      despertar: ['amanecer-03'],
      'medio-dia': ['medio-dia-02', 'medio-dia-04'],
      atardecer: ['atardecer-01', 'atardecer-03', 'atardecer-04'],
      noche: ['noche-01', 'noche-02', 'noche-03', 'noche-04'],
    });
  });
  it('fuera las cuatro fotos con una persona de sexo legible (y la del senderista)', () => {
    // amanecer-01 un hombre sin camisa, amanecer-02 una mujer, atardecer-02 un
    // hombre con barba, medio-dia-03 una mujer; medio-dia-01, un senderista
    // diminuto en la cumbre: sin sexo legible, pero persona.
    for (const fuera of ['amanecer-01', 'amanecer-02', 'atardecer-02', 'medio-dia-03', 'medio-dia-01']) {
      expect(todas.includes(fuera), `${fuera} volvió al banco del programa`).toBe(false);
    }
  });
  it('cada franja tiene al menos una foto, sin repetidos, y cada nombre es un archivo que existe', () => {
    expect(Object.keys(IMAGENES_PROGRAMA_SIN_PERSONA).sort()).toEqual([...FRANJAS].sort());
    for (const f of FRANJAS) expect(IMAGENES_PROGRAMA_SIN_PERSONA[f].length, f).toBeGreaterThanOrEqual(1);
    expect(new Set(todas).size).toBe(todas.length);
    for (const n of todas) {
      expect(existsSync(resolve(process.cwd(), `assets/images/hoy-extra/tu-dia/${n}.webp`)), `falta ${n}.webp`).toBe(true);
    }
  });
  it('las mismas franjas horarias de pickTuDiaImage: la hora elige la franja y nunca sale de ella', () => {
    const SEMILLAS = [undefined, '', 'a', 'u1-2026-10-08', 'u1-2026-10-09', 'u2-2026-10-08', 'zzzz'];
    for (let h = 0; h < 24; h += 1) for (const semilla of SEMILLAS) {
      const banco: readonly string[] = IMAGENES_PROGRAMA_SIN_PERSONA[tuDiaImageGroup(h)];
      expect(banco.includes(imagenProgramaKey(h, semilla)), `hora ${h}, semilla ${semilla}`).toBe(true);
    }
    expect(imagenProgramaKey(5)).toBe('amanecer-03');
    expect(imagenProgramaKey(11)).toBe('amanecer-03');
    expect(IMAGENES_PROGRAMA_SIN_PERSONA['medio-dia'].includes(imagenProgramaKey(12) as never)).toBe(true);
    expect(IMAGENES_PROGRAMA_SIN_PERSONA.atardecer.includes(imagenProgramaKey(18) as never)).toBe(true);
    expect(IMAGENES_PROGRAMA_SIN_PERSONA.noche.includes(imagenProgramaKey(22) as never)).toBe(true);
    expect(IMAGENES_PROGRAMA_SIN_PERSONA.noche.includes(imagenProgramaKey(4) as never)).toBe(true);
  });
  it('rotación determinista: misma semilla, misma foto; semillas distintas recorren el banco', () => {
    for (let h = 0; h < 24; h += 1) {
      expect(imagenProgramaKey(h, 'u1-2026-10-08')).toBe(imagenProgramaKey(h, 'u1-2026-10-08'));
    }
    // Sin semilla, la primera del banco (como seededIndex).
    expect(imagenProgramaKey(23)).toBe('noche-01');
    const vistas = new Set<string>();
    for (let d = 1; d <= 28; d += 1) vistas.add(imagenProgramaKey(23, `u1-2026-10-${String(d).padStart(2, '0')}`));
    expect([...vistas].sort()).toEqual(['noche-01', 'noche-02', 'noche-03', 'noche-04']);
  });
  it('una hora rara no truena ni se sale del banco', () => {
    for (const rara of [NaN, -1, 24, 99, Infinity]) {
      expect(IMAGENES_PROGRAMA_SIN_PERSONA.noche.includes(imagenProgramaKey(rara, 'x') as never), String(rara)).toBe(true);
    }
  });
  it('el componente carga exactamente esos archivos de tu-dia y ya no usa el banco con personas', () => {
    const tarjeta = leer('src/components/hoy/HoyResumenCard.tsx');
    const cargadas = [...tarjeta.matchAll(/require\('@\/assets\/images\/hoy-extra\/tu-dia\/([a-z0-9-]+)\.webp'\)/g)].map((m) => m[1]);
    expect([...cargadas].sort()).toEqual([...todas].sort());
    // Cada llave apunta a SU archivo (no a otro con el nombre cambiado).
    for (const n of todas) {
      expect(tarjeta.includes(`'${n}': require('@/assets/images/hoy-extra/tu-dia/${n}.webp'),`), n).toBe(true);
    }
    for (const rel of ['src/components/hoy/HoyResumenCard.tsx', 'src/components/elite-dx/ProgramaHeader.tsx']) {
      const codigo = sinComentarios(leer(rel));
      expect(codigo.includes('pickTuDiaImage'), `${rel} volvió a pickTuDiaImage`).toBe(false);
      expect(codigo.includes('image-rotation'), `${rel} importa image-rotation`).toBe(false);
    }
  });
});

describe('lo leído de una cuenta no se le pinta a otra (8-oct-2026, revisión en frío)', () => {
  const deA = () => escribirLectura(
    escribirLectura(lecturasIniciales('A'), 'A', () => ({ datos: datos(), sexo: 'male', cargando: false })),
    'A', () => ({ elite: { estado: 'ok', evaluacion: omar() } }),
  );

  it('una cuenta recién llegada empieza sin nada: ni datos, ni sexo, ni evaluación', () => {
    expect(lecturasIniciales('A')).toEqual({
      de: 'A', datos: null, cargando: true, fallo: false, sexo: null, elite: { estado: 'cargando' }, vencido: false,
    });
    expect(lecturasIniciales(undefined).de).toBeUndefined();
  });
  it('misma cuenta: lo guardado se conserva tal cual (el mismo objeto)', () => {
    const a = deA();
    expect(lecturasDe(a, 'A')).toBe(a);
    expect(a.sexo).toBe('male');
    expect(a.datos?.edad).toEqual({ integral: 41.3, cronologica: 45 });
  });
  it('cambia la cuenta: se empieza de cero; nada de A llega a B (ni el retrato ni el número)', () => {
    const a = deA();
    for (const otra of ['B', undefined]) {
      const b = lecturasDe(a, otra);
      expect(b).toEqual(lecturasIniciales(otra));
      // Y la vista que sale de ahí no es una tarjeta con lo de A.
      const v = decidirVistaHoyAtp({
        estadoElite: 'cargando', eliteEnVuelo: b.elite.estado === 'cargando', evaluacion: null,
        estadoLabs: 'cargando', datos: b.datos, sexo: b.sexo,
      });
      expect(v.vista).not.toBe('tarjeta');
    }
  });
  it('una lectura de A que llega tarde, ya con B en pantalla, se descarta entera', () => {
    const b = lecturasDe(deA(), 'B');
    let llamado = false;
    for (const tardia of [
      () => ({ sexo: 'male' as const }),
      () => ({ datos: datos(), fallo: false }),
      () => ({ elite: { estado: 'ok' as const, evaluacion: omar() } }),
      () => ({ cargando: false }),
      () => ({ vencido: true }),
      () => ({ fallo: true }),
    ]) {
      const r = escribirLectura(b, 'A', () => { llamado = true; return tardia(); });
      expect(r).toBe(b);
    }
    expect(llamado).toBe(false);
    expect(b.sexo).toBeNull();
    expect(b.datos).toBeNull();
  });
  it('la lectura de la cuenta vigente sí se escribe, sin tocar lo demás ni cambiar de dueña', () => {
    const b0 = lecturasIniciales('B');
    const b1 = escribirLectura(b0, 'B', () => ({ sexo: 'female' }));
    expect(b1).toEqual({ ...b0, sexo: 'female' });
    expect(b0.sexo).toBeNull();
    // Ni queriendo se cambia la dueña con una escritura.
    const tramposa = escribirLectura(b1, 'B', () => ({ de: 'A', fallo: true } as never));
    expect(tramposa.de).toBe('B');
    expect(tramposa.fallo).toBe(true);
  });
  it('"una evaluación ya vista gana a un fallo de recarga": null no cambia nada', () => {
    const a = deA();
    const r = escribirLectura(a, 'A', (previo) => (previo.elite.estado === 'ok' && previo.elite.evaluacion ? null : { elite: { estado: 'fallo', motivo: 'lectura' } }));
    expect(r).toBe(a);
    const sinEvaluacion = escribirLectura(lecturasIniciales('A'), 'A', (previo) => (previo.elite.estado === 'ok' && previo.elite.evaluacion ? null : { elite: { estado: 'fallo', motivo: 'lectura' } }));
    expect(sinEvaluacion.elite).toEqual({ estado: 'fallo', motivo: 'lectura' });
  });
  it('sin sesión (userId undefined) no se cuela una lectura con nombre', () => {
    const nadie = lecturasIniciales(undefined);
    expect(escribirLectura(nadie, 'A', () => ({ sexo: 'male' }))).toBe(nadie);
  });
});

describe('decidirVistaPrograma', () => {
  const ESTADOS: ProgramaParaResumen[] = [
    { estado: 'cargando' }, { estado: 'error' }, { estado: 'sin_evaluacion' },
    { estado: 'ok', avance: avance() }, { estado: 'ok', avance: null },
  ];

  /** Las reglas de ProgramaHeader hasta el 6-oct-2026, copiadas tal cual. `ok` era una sola tarjeta. */
  function antes(p: ProgramaParaResumen, tieneEvaluacion: boolean, soloAvance: boolean, prometer: boolean): string {
    if (p.estado === 'cargando') return soloAvance ? 'nada' : 'hueco';
    if (soloAvance && p.estado !== 'ok') return 'nada';
    if (p.estado === 'sin_evaluacion' && (tieneEvaluacion || !prometer)) return 'nada';
    if (p.estado === 'error') return 'error';
    if (p.estado === 'sin_evaluacion') return 'sin_evaluacion';
    return 'ok';
  }

  it('mismas reglas de antes en las 40 combinaciones; lo nuevo es cómo sale el estado ok', () => {
    let n = 0;
    for (const p of ESTADOS) for (const te of [true, false]) for (const sa of [true, false]) for (const pr of [true, false]) {
      n += 1;
      const v = decidirVistaPrograma(p, { tieneEvaluacion: te, soloAvance: sa, prometerPreparacion: pr });
      const viejo = antes(p, te, sa, pr);
      const caso = `${JSON.stringify(p)} te=${te} sa=${sa} pr=${pr}`;
      if (viejo !== 'ok') { expect(v.vista, caso).toBe(viejo); continue; }
      // ok: compacta dentro de Mi programa; en HOY, editorial o (fecha rota) plana.
      const esperado = sa ? 'compacta' : p.estado === 'ok' && p.avance === null ? 'fecha_ilegible' : 'tarjeta';
      expect(v.vista, caso).toBe(esperado);
    }
    expect(n).toBe(40);
  });

  it('sin opciones: prometer es true y no es soloAvance (los valores por defecto del componente)', () => {
    expect(decidirVistaPrograma({ estado: 'sin_evaluacion' })).toEqual({ vista: 'sin_evaluacion' });
    expect(decidirVistaPrograma({ estado: 'cargando' })).toEqual({ vista: 'hueco' });
    expect(decidirVistaPrograma({ estado: 'ok', avance: avance() }).vista).toBe('tarjeta');
  });

  it('regla 7: el fallo de lectura es "error" con Reintentar, nunca una tarjeta ni un hueco', () => {
    for (const te of [true, false]) for (const pr of [true, false]) {
      expect(decidirVistaPrograma({ estado: 'error' }, { tieneEvaluacion: te, prometerPreparacion: pr })).toEqual({ vista: 'error' });
    }
  });

  it('una fecha de inicio ilegible no se viste de tarjeta ni inventa una semana', () => {
    expect(decidirVistaPrograma({ estado: 'ok', avance: null })).toEqual({ vista: 'fecha_ilegible' });
  });

  it('dentro de Mi programa (soloAvance) NUNCA sale la editorial: no hay CTA a /programa desde /programa', () => {
    for (const p of ESTADOS) for (const te of [true, false]) for (const pr of [true, false]) {
      const v = decidirVistaPrograma(p, { tieneEvaluacion: te, soloAvance: true, prometerPreparacion: pr });
      expect(v.vista).not.toBe('tarjeta');
      expect(JSON.stringify(v)).not.toMatch(/\/programa/);
    }
    const a = avance();
    // 8-oct-2026 (nivel 2): la compacta trae ademas porEmpezar y nombre (null sin ellos).
    expect(decidirVistaPrograma({ estado: 'ok', avance: a }, { soloAvance: true })).toEqual({ vista: 'compacta', avance: a, porEmpezar: null, nombre: null });
    expect(decidirVistaPrograma({ estado: 'ok', avance: null }, { soloAvance: true })).toEqual({ vista: 'compacta', avance: null, porEmpezar: null, nombre: null });
  });
});

// ---------------------------------------------------------------------------
// Copy y rutas de TODAS las tarjetas que el core puede armar
// ---------------------------------------------------------------------------

function todasLasTarjetas(): TarjetaResumen[] {
  const sinEdades = omar();
  sinEdades.inicio.edad_atp = null;
  sinEdades.edades.atp = null;
  sinEdades.inicio.lead = null;
  return [
    tarjetaEdadAtp(datos(), 'male'),
    tarjetaEdadAtp(datos({ edad: { integral: 48, cronologica: 45 } }), 'female'),
    tarjetaEdadAtp(datos({ edad: { integral: 45, cronologica: 45 } }), null),
    tarjetaEdadAtp(datos({ edad: null }), null),
    tarjetaEdadAtp(datos({ faltaSexo: true }), null),
    tarjetaEdadAtp(datos({ edad: null, faltaSexo: true }), null),
    tarjetaSinEstudio(),
    tarjetaEvaluacion(omar(), 'male'),
    tarjetaEvaluacion(sinEdades, null),
    tarjetaPrograma(avance()),
    tarjetaPrograma(avance({ dia: 95, semana: 14, pct: 100, completado: true })),
  ];
}

describe('copy de las tarjetas', () => {
  const tarjetas = todasLasTarjetas();
  it('cero em dashes y cero palabras rojas', () => {
    for (const t of tarjetas) for (const s of textos(t)) {
      expect(s.includes(EM_DASH), `em dash en "${s}"`).toBe(false);
      expect(ROJAS.test(s), `palabra roja en "${s}"`).toBe(false);
    }
  });
  it('una línea de verdad: título, línea y CTA nunca vacíos y sin saltos', () => {
    for (const t of tarjetas) {
      for (const s of [t.titulo, t.linea, t.cta.label]) {
        expect(s.trim().length).toBeGreaterThan(0);
        expect(/\n/.test(s)).toBe(false);
      }
      expect(t.linea.length).toBeLessThanOrEqual(LARGO_LINEA_RESUMEN);
      // Título y CTA en mayúsculas (el molde de EditorialCard).
      expect(t.titulo).toBe(t.titulo.toUpperCase());
      expect(t.cta.label).toBe(t.cta.label.toUpperCase());
    }
  });
  it('8-oct-2026: cada tarjeta trae su frase para el lector de pantalla, en frase normal y con lo que se ve', () => {
    for (const t of tarjetas) {
      expect(t.accesibilidad.trim().length).toBeGreaterThan(0);
      expect(/\n/.test(t.accesibilidad)).toBe(false);
      // En frase normal: un título todo en mayúsculas se deletrea.
      expect(t.accesibilidad).not.toBe(t.accesibilidad.toUpperCase());
      expect(t.accesibilidad.toUpperCase().includes(t.cta.label), t.accesibilidad).toBe(true);
      expect(/\.\./.test(t.accesibilidad), t.accesibilidad).toBe(false);
      expect(t.accesibilidad.endsWith('.'), t.accesibilidad).toBe(true);
      // Fuera del programa (que dice su barra con palabras), es lo mismo que se ve.
      if (t.progreso === null) {
        expect(t.accesibilidad.toUpperCase().startsWith(t.titulo), t.accesibilidad).toBe(true);
        expect(t.accesibilidad.includes(t.linea.replace(/\.$/, '')), t.accesibilidad).toBe(true);
      }
    }
  });
  it('solo el programa en curso lleva barra, y va de 0 a 100', () => {
    for (const t of tarjetas) {
      if (t.progreso === null) continue;
      expect(t.key).toBe('programa');
      expect(t.progreso.target).toBe(100);
      expect(t.progreso.current).toBeGreaterThanOrEqual(0);
      expect(t.progreso.current).toBeLessThanOrEqual(100);
    }
  });
});

describe('rutas contra los archivos reales de app/', () => {
  /** Mismo criterio que progreso-core.test: la ruta existe si un archivo de app/ la sirve. */
  const existe = (ruta: string): boolean => [
    `app${ruta}.tsx`, `app${ruta}/index.tsx`, `app/(tabs)${ruta}.tsx`, `app/(tabs)${ruta}/index.tsx`,
  ].some((c) => existsSync(resolve(process.cwd(), c)));

  it('el propio criterio distingue una ruta real de una inventada', () => {
    expect(existe('/edad-atp')).toBe(true);
    expect(existe('/pantalla-que-no-existe')).toBe(false);
  });
  it('cada CTA y cada enlace lleva a una pantalla que existe', () => {
    const rutas = new Set<string>();
    for (const t of todasLasTarjetas()) {
      rutas.add(t.cta.ruta);
      for (const e of t.enlaces) rutas.add(e.ruta);
    }
    expect(rutas.size).toBeGreaterThanOrEqual(7);
    for (const r of rutas) expect(existe(r), `no existe la pantalla de ${r}`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Contrato con los componentes: el semáforo no vuelve por la puerta de atrás
// ---------------------------------------------------------------------------

/** Quita comentarios: las notas del equipo cuentan la historia y sí nombran lo que salió. */
function sinComentarios(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

describe('contrato de fuente (7-oct-2026, Hoy editorial)', () => {
  const core = leer('src/services/hoy/hoy-resumen-core.ts');
  const heroLabs = sinComentarios(leer('src/components/hoy/HeroLaboratorios.tsx'));
  const heroElite = sinComentarios(leer('src/components/hoy/HeroEvaluacionElite.tsx'));
  const tarjeta = sinComentarios(leer('src/components/hoy/HoyResumenCard.tsx'));
  const programa = sinComentarios(leer('src/components/elite-dx/ProgramaHeader.tsx'));
  const hoy = sinComentarios(leer('app/(tabs)/index.tsx'));

  it('el core es puro: sin require de assets y sin react-native', () => {
    const codigo = sinComentarios(core);
    expect(codigo).not.toMatch(/require\(/);
    expect(codigo).not.toMatch(/from 'react/);
    expect(codigo).not.toMatch(/\.webp|\.png|\.jpg/);
  });

  it('los heros de HOY ya no pintan marcadores, puntos de color ni etiquetas de semáforo', () => {
    const PROHIBIDO = [
      'top3Marcadores', 'ETIQUETA_ESTADO_HERO', 'marcadoresEliteParaHero', 'etiquetaEstado', 'lineaPidenAccion',
      'cuentaPidenAccion', 'esDeTomaAnterior', 'tonoDeltaEdad', 'colorEstado', 'colorToken',
      't.critico', 't.advertencia', 't.exito', '/edad-atp/lab/[key]',
    ];
    for (const [nombre, src] of [['HeroLaboratorios', heroLabs], ['HeroEvaluacionElite', heroElite], ['HoyResumenCard', tarjeta]] as const) {
      for (const p of PROHIBIDO) expect(src.includes(p), `${nombre} volvió a usar ${p}`).toBe(false);
    }
  });

  it('los estados felices pasan por la decisión del core y por el molde EditorialCard', () => {
    expect(heroLabs).toMatch(/decidirVistaHoyAtp\(/);
    expect(heroLabs).toMatch(/<HoyResumenCard /);
    expect(heroElite).toMatch(/<HoyResumenCard /);
    expect(programa).toMatch(/decidirVistaPrograma\(/);
    expect(programa).toMatch(/<HoyResumenCard /);
    expect(tarjeta).toMatch(/<EditorialCard/);
    // Un solo destino por tarjeta: el CTA del modelo (el toque y el lector de pantalla abren lo mismo).
    expect(tarjeta).toMatch(/const abrir = \(\) => router\.push\(tarjeta\.cta\.ruta\);/);
    expect(tarjeta).toMatch(/onTap=\{abrir\}/);
    expect(tarjeta.match(/router\.push\(tarjeta\./g) ?? []).toHaveLength(1);
  });

  it('8-oct-2026: la tarjeta es un botón con etiqueta para el lector de pantalla (la frase del core)', () => {
    expect(tarjeta).toMatch(/accessibilityRole="button"\s+accessibilityLabel=\{tarjeta\.accesibilidad\}/);
    expect(tarjeta).toMatch(/onAccessibilityTap=\{abrir\}/);
    expect(tarjeta).toMatch(/actionName === 'activate'\) abrir\(\)/);
  });

  it('8-oct-2026: el degradado sale del helper de marca, no de un par escrito a mano', () => {
    expect(tarjeta).toMatch(/brandGradient\(\)/);
    expect(tarjeta).not.toMatch(/\[ATP_BRAND\.lime, ATP_BRAND\.teal\]/);
    expect(tarjeta).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it('8-oct-2026: mientras se lee el programa, el hueco tiene la forma de la tarjeta (16:9), no 96 px', () => {
    expect(programa).toMatch(/hueco: \{ aspectRatio: 16 \/ 9, marginHorizontal: Spacing\.md, marginBottom: Spacing\.md \}/);
    expect(programa).not.toMatch(/height: 96/);
  });

  it('8-oct-2026: HeroLaboratorios guarda lo leído con su dueña y no escribe sin mirar de quién es', () => {
    expect(heroLabs).toMatch(/const lecturas = lecturasDe\(guardado, userId\);/);
    expect(heroLabs).toMatch(/setGuardado\(\(previo\) => escribirLectura\(previo, de, cambio\)\)/);
    // Ya no hay estados sueltos ni escrituras directas que sobrevivan a un cambio de cuenta.
    expect(heroLabs).not.toMatch(/\bset(Datos|Sexo|Elite|Fallo|Cargando|Vencido)\(/);
    expect(heroLabs.match(/useState</g) ?? []).toHaveLength(1);
  });

  it('8-oct-2026: "en camino" ya no promete en HOY los marcadores que HOY ya no enseña', () => {
    expect(heroElite).toMatch(/aquí vas a ver tu evaluación y tu plan\. No necesitas subir nada\./);
    expect(heroElite).not.toMatch(/tus marcadores/);
  });

  it('los estados que NO son felices siguen diciendo lo mismo, con su Reintentar', () => {
    expect(heroLabs).toMatch(/Leyendo tus laboratorios\.\.\./);
    expect(heroLabs).toMatch(/No pudimos leer tus laboratorios/);
    expect(heroLabs).toMatch(/Revisa tu conexión\. Tus datos siguen aquí\./);
    expect(heroLabs).toMatch(/Reintentar/);
    expect(heroElite).toMatch(/está preparando tu evaluación/);
    // 8-oct-2026 (nivel 2): la frase vive en mi-programa-core (textosNoSePudoLeer,
    // con la voz Elite por defecto: "No pudimos leer tu evaluación", con test alla).
    expect(heroElite).toMatch(/textosNoSePudoLeer\(voz\)/);
    expect(heroElite).toMatch(/voz = VOZ_ELITE/);
    expect(heroElite).toMatch(/Reintentar/);
    expect(programa).toMatch(/No pudimos leer tu programa\. Revisa tu conexión\./);
    expect(programa).toMatch(/Tu evaluación está en preparación/);
    expect(programa).toMatch(/No se pudo leer la fecha de inicio de tu programa\./);
  });

  it('el retrato por sexo solo se pide con la llave que decidió el core, nunca con una variable', () => {
    const llamadas = tarjeta.match(/pickEdadAtpImage\([^)]*\)/g) ?? [];
    expect(llamadas.sort()).toEqual(["pickEdadAtpImage('female')", "pickEdadAtpImage('male')"]);
    // La neutra es lab-preview (YO_STATIC_IMAGES.lab), no la de un sexo.
    expect(tarjeta).toMatch(/case 'estudio_neutra': return YO_STATIC_IMAGES\.lab;/);
    expect(leer('src/utils/yo-image-picker.ts')).toMatch(/lab: require\('@\/assets\/images\/yo\/lab-preview\.webp'\)/);
    // Y los heros no eligen imagen por su cuenta.
    for (const src of [heroLabs, heroElite, programa]) expect(src).not.toMatch(/pickEdadAtpImage|require\(/);
  });

  it('dentro de Mi programa la semana sigue compacta, con su barra accesible', () => {
    expect(programa).toMatch(/accessibilityRole="progressbar"/);
    expect(programa).toMatch(/vista\.vista === 'compacta' \? vista\.avance : null/);
  });

  it('HOY monta MI PLAN donde estaba "Qué hacer hoy", con las mismas props y en los dos modos', () => {
    expect(hoy).toMatch(/import \{ MiPlanCard \} from '@\/src\/components\/hoy\/MiPlanCard';/);
    expect(hoy.match(/<MiPlanCard userId=\{user\?\.id\} nivel=\{nivel\} \/>/g) ?? []).toHaveLength(1);
    expect(hoy).not.toMatch(/QueHacerHoy/);
    // Sigue fuera de la rama por modo: lo ven ATP y Elite DX.
    expect(hoy).toMatch(/<PuertasElite userId=\{user\?\.id\} \/>\s*<\/>\s*\)\}\s*<MiPlanCard /);
    // Y arriba siguen las dos piezas que ahora son editoriales.
    expect(hoy).toMatch(/<HeroLaboratorios userId=\{user\?\.id\} nivel=\{nivel\} \/>/);
    expect(hoy).toMatch(/<ProgramaHeader userId=\{user\?\.id\}/);
  });
});

// ---------------------------------------------------------------------------
// 8-oct-2026 (nivel 2): programa con nombre, con inicio por llegar, y el
// mismo documento con `tipo: 'programa'`
// ---------------------------------------------------------------------------

const programaCrudo: unknown = JSON.parse(leer('R and D/diagnostico/programa_ejemplo.json'));
function programaDoc(): EliteV3 {
  const r = validarEliteV3(JSON.parse(JSON.stringify(programaCrudo)));
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}

describe('nivel 2: la semana del programa con nombre y por empezar', () => {
  const por = { inicio: '2026-10-12', faltanDias: 4 };

  it('sin nombre la tarjeta es la de siempre; con nombre, la línea lo dice', () => {
    const a = avance();
    expect(tarjetaPrograma(a, null)).toEqual(tarjetaPrograma(a));
    expect(tarjetaPrograma(a, '  ')).toEqual(tarjetaPrograma(a));
    const t = tarjetaPrograma(a, 'Fuerza y sueño');
    expect(t.titulo).toBe('SEMANA 3 DE 12');
    expect(t.linea).toBe('Fuerza y sueño · Día 17');
    expect(t.accesibilidad.startsWith('Fuerza y sueño. Semana 3 de 12, día 17.')).toBe(true);
    expect(decidirVistaPrograma({ estado: 'ok', avance: a, nombre: 'Fuerza y sueño' })).toEqual({ vista: 'tarjeta', tarjeta: t });
  });

  it('un inicio por llegar es su tarjeta, nunca "fecha ilegible" ni un día inventado', () => {
    const v = decidirVistaPrograma({ estado: 'ok', avance: null, porEmpezar: por, nombre: 'Fuerza y sueño' });
    expect(v.vista).toBe('tarjeta');
    if (v.vista !== 'tarjeta') return;
    expect(v.tarjeta.titulo).toBe('FUERZA Y SUEÑO');
    expect(v.tarjeta.linea).toBe('Empieza el 12 de octubre de 2026 · faltan 4 días');
    expect(v.tarjeta.progreso).toBeNull();
    expect(v.tarjeta.cta.ruta).toBe('/programa');
    expect(v.tarjeta.linea).not.toMatch(/D[ií]a \d|Semana \d/);
    // Sin nombre, "Tu programa"; a un día, "mañana".
    expect(tarjetaPorEmpezar({ inicio: '2026-10-09', faltanDias: 1 }).titulo).toBe('TU PROGRAMA');
    expect(tarjetaPorEmpezar({ inicio: '2026-10-09', faltanDias: 1 }).linea).toBe('Empieza mañana');
    // Por empezar manda aunque llegara un avance (nunca debería): no se pinta una semana.
    const conAmbos = decidirVistaPrograma({ estado: 'ok', avance: avance(), porEmpezar: por });
    expect(conAmbos.vista === 'tarjeta' && conAmbos.tarjeta.titulo).toBe('TU PROGRAMA');
  });

  it('dentro de Mi programa, compacta con la fecha y sin avance', () => {
    expect(decidirVistaPrograma({ estado: 'ok', avance: avance(), porEmpezar: por, nombre: 'Fuerza y sueño' }, { soloAvance: true }))
      .toEqual({ vista: 'compacta', avance: null, porEmpezar: por, nombre: 'Fuerza y sueño' });
  });

  it('las reglas de antes no se mueven con nombre o por empezar en los otros estados', () => {
    expect(decidirVistaPrograma({ estado: 'ok', avance: null, nombre: 'X' })).toEqual({ vista: 'fecha_ilegible' });
    expect(decidirVistaPrograma({ estado: 'ok', avance: null, porEmpezar: null })).toEqual({ vista: 'fecha_ilegible' });
  });

  it('el encabezado mira por empezar antes que la fecha', () => {
    const src = sinComentarios(leer('src/components/elite-dx/ProgramaHeader.tsx'));
    expect(src).toMatch(/vista\.vista === 'compacta' && vista\.porEmpezar/);
    expect(src.indexOf("vista.porEmpezar")).toBeLessThan(src.indexOf('No se pudo leer la fecha de inicio'));
    expect(src).toMatch(/lineaPorEmpezar\(vista\.porEmpezar\)/);
  });
});

describe('nivel 2: la tarjeta del documento en modo ATP', () => {
  it('un programa sin evaluación: su nombre de documento, su CTA, y nunca Elite', () => {
    const e = programaDoc();
    const t = tarjetaEvaluacion(e, null);
    expect(t.titulo).toBe(`TU PROGRAMA CON ${NOMBRE_COACH_ELITE.toUpperCase()}`);
    expect(t.cta.label).toBe('VER MI PROGRAMA');
    expect(t.cta.ruta).toBe('/salud/evaluacion-elite');
    expect(t.linea).toBe(unaLinea(e.inicio.lead));
    e.inicio.lead = null;
    expect(tarjetaEvaluacion(e, null).linea).toBe('Tu programa está listo');
    for (const x of textos(tarjetaEvaluacion(e, null))) {
      expect(/elite|evaluaci[oó]n/i.test(x)).toBe(false);
      expect(x.includes(EM_DASH)).toBe(false);
      expect(ROJAS.test(x)).toBe(false);
    }
  });
  it('Elite: la tarjeta de siempre', () => {
    const e = omar();
    e.inicio.lead = null; e.inicio.edad_atp = null; e.edades.atp = null;
    const t = tarjetaEvaluacion(e, null);
    expect(t.titulo).toBe(`TU EVALUACIÓN CON ${NOMBRE_COACH_ELITE.toUpperCase()}`);
    expect(t.linea).toBe(LINEA_EVALUACION_LISTA);
    expect(t.cta.label).toBe('VER MI EVALUACIÓN');
  });
});
