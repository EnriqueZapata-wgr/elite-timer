/**
 * MI PROGRAMA (25-sep-2026, APP_ELITE_DX): las filas salen de lo que trae el
 * documento de ESE cliente, las secciones vacias no se pintan como filas
 * huecas, el plan y el medico siempre estan, y ningun numero se inventa.
 * `node scripts/run-tests-sin-vitest.js src/services/elite/__tests__/mi-programa-core.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarEliteV3, type EliteV3 } from '@/src/services/elite/elite-v3-core';
import { SECCIONES_UI } from '@/src/services/elite/evaluacion-elite-core';
import { BLOQUES_PROGRAMA } from '@/src/services/elite/programa-elite-core';
import { APP_REGISTRY, visibleApps } from '@/src/constants/app-registry';
import {
  bloquesMiPrograma, caraSinEvaluacion, CUBIERTAS_POR_RESUMEN, destinoEdad, destinoPiden, detalleSeccion,
  estadoAlVencer, estudiosVisibles, FILA_PLAN_SEMANA, FILAS_EXPEDIENTE, lineaVersion, pidenAccionDelDocumento,
  resumenEvaluacion,
  RUTAS_MI_PROGRAMA, seccionTieneContenido, siguienteEstado,
  type EstadoMiPrograma, type NivelParaPrograma,
  asuntoCorreoCoach, caraGeneticaSinHallazgos, CEJA_NEUTRA, cejaMiPrograma, copyPlanSuplementos, documentoListo,
  enlaceDocumentoCompleto, etiquetaDocumentoConCoach, filaDocumentoCompleto, lineaFirmaEvaluacion,
  ofrecerCompararLaboratorios, puertaDocumento, resumenVigenteDocumento, seccionesVisiblesEvaluacion,
  TITULO_DOCUMENTO_NEUTRO, tituloPantallaEvaluacion, tituloSinLead, vozDeSnapshot,
  AVISO_FICHA_DEL_COACH, columnasMarcador, esFichaDelCoachSoloLectura, mostrarEstado, textosNoSePudoLeer,
} from '@/src/services/elite/mi-programa-core';
import { htmlDeEvaluacion } from '@/src/services/elite/evaluacion-elite-core';
import { vozMientras, vozParaTextos, VOZ_PROGRAMA_NEUTRA } from '@/src/services/elite/voz-programa-core';
import { tituloDeBloque } from '@/src/services/elite/programa-elite-core';
import { VOZ_ELITE, vozDe, vozDeDocumento } from '@/src/services/elite/voz-programa-core';

const ejemplo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json'), 'utf8'),
);

function omar(): EliteV3 {
  const r = validarEliteV3(JSON.parse(JSON.stringify(ejemplo)));
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}

/** Omar sin genetica, sin test de Braverman y sin cruces: un primer entregable tipico. */
function primeraEntrega(): EliteV3 {
  const e = omar();
  e.genetica = { intro: 'Tu genética llega en la segunda entrega.', hallazgos: [], resumen: [{ titulo: 'Lo que tu genética no explica', parrafos: ['x'] }] };
  delete (e.interpretado_por as { genetica?: string }).genetica;
  e.braverman = { intro: 'El test de química cerebral.', naturaleza: null, desgaste: null, lecturas: [], ejes: [], cierre: ['Cierre'] };
  e.cruces = { hilo: null, lista: [] };
  return e;
}

const EM_DASH = '\u2014';
const ROJAS = /diagn[oó]stic|tratamiento|terap[eé]utic|previene|\bcura\b|receta m[eé]dica|intervenci[oó]n/i;

function todoElCopy(e: EliteV3): string[] {
  const out: string[] = [];
  for (const b of bloquesMiPrograma(e)) {
    out.push(b.titulo);
    for (const f of b.filas) { out.push(f.titulo); if (f.detalle) out.push(f.detalle); }
  }
  out.push(lineaVersion(e));
  for (const f of FILAS_EXPEDIENTE) out.push(f.titulo, f.detalle);
  // 7-oct-2026 (Mi plan): la fila que abre TU PLAN pasa por el mismo barrido de copy.
  out.push(FILA_PLAN_SEMANA.titulo, FILA_PLAN_SEMANA.detalle);
  return out;
}

describe('seccionTieneContenido (revision en frio)', () => {
  it('inicio: el lead solo no cuenta (alla va en la cabecera); programa_semanas si', () => {
    const e = omar();
    e.inicio = { edad_cronologica: null, edad_atp: null, diferencia_anios: null, lead: 'Hola', programa_semanas: null };
    expect(seccionTieneContenido(e, 'inicio')).toBe(false);
    e.inicio.programa_semanas = 12;
    expect(seccionTieneContenido(e, 'inicio')).toBe(true);
  });
  it('cierre: el disclaimer solo cuenta (la pantalla lo dibuja)', () => {
    const e = omar();
    (e.cierre as { palancas: unknown[] }).palancas = [];
    e.cierre.vigencia = null; e.cierre.firma = null; e.cierre.disclaimer = null;
    expect(seccionTieneContenido(e, 'cierre')).toBe(false);
    e.cierre.disclaimer = 'Esto no sustituye a tu médico.';
    expect(seccionTieneContenido(e, 'cierre')).toBe(true);
  });
});

describe('seccionTieneContenido', () => {
  it('el documento completo de Omar tiene todas las secciones', () => {
    const e = omar();
    for (const s of SECCIONES_UI) expect(seccionTieneContenido(e, s.key)).toBe(true);
  });
  it('sin hallazgos no hay Genetica, aunque traiga intro y resumen (la pantalla no los pinta)', () => {
    expect(seccionTieneContenido(primeraEntrega(), 'genetica')).toBe(false);
  });
  it('Braverman sin puntajes, ejes ni lecturas no cuenta: intro y cierre son el marco, no el test', () => {
    expect(seccionTieneContenido(primeraEntrega(), 'braverman')).toBe(false);
    const e = primeraEntrega();
    e.braverman.naturaleza = { dopamina: 1, acetilcolina: 2, serotonina: 3, gaba: 4 };
    expect(seccionTieneContenido(e, 'braverman')).toBe(true);
  });
  it('cruces vacios no cuentan; el hilo solo si cuenta', () => {
    const e = primeraEntrega();
    expect(seccionTieneContenido(e, 'cruces')).toBe(false);
    e.cruces.hilo = { variable: 'Insulina', en: 2, de: 3 };
    expect(seccionTieneContenido(e, 'cruces')).toBe(true);
  });
  it('marcadores: la intro sola no cuenta; notas si', () => {
    const e = omar();
    e.marcadores = { intro: 'Hola', grupos: [], notas: [] };
    expect(seccionTieneContenido(e, 'marcadores')).toBe(false);
    e.marcadores.notas = ['La ApoB fue estimada.'];
    expect(seccionTieneContenido(e, 'marcadores')).toBe(true);
    e.marcadores = { intro: null, grupos: [{ nombre: 'Vacio', marcadores: [] }], notas: [''] };
    expect(seccionTieneContenido(e, 'marcadores')).toBe(false);
  });
  it('composicion: un reparto todo en null no es contenido', () => {
    const e = omar();
    e.composicion = { reparto: { peso_kg: null, grasa_pct: null, grasa_kg: null, musculo_pct: null, musculo_kg: null, resto_pct: null, resto_kg: null }, filas: [] };
    expect(seccionTieneContenido(e, 'composicion')).toBe(false);
    e.composicion.reparto!.peso_kg = 80;
    expect(seccionTieneContenido(e, 'composicion')).toBe(true);
  });
  it('edades y conteo todo en null no son contenido', () => {
    const e = omar();
    e.edades = { real: null, sangre: null, vida: null, atp: null, sf_pct: null, detalle: [] };
    e.conteo = { total_medido: null, piden_accion: null, valores_medidos: null, hallazgos_adn: null, ejes_quimica: null, mueven_tu_caso: null, ritmo_envejecimiento_meses: null, calidad_estudio: null };
    expect(seccionTieneContenido(e, 'edades')).toBe(false);
    expect(seccionTieneContenido(e, 'conteo')).toBe(false);
  });
});

describe('bloquesMiPrograma', () => {
  it('sigue el orden de BLOQUES_PROGRAMA', () => {
    expect(bloquesMiPrograma(omar()).map((b) => b.key)).toEqual(BLOQUES_PROGRAMA.map((b) => b.key));
  });
  it('en Omar completo, cada seccion tiene su fila salvo Inicio y En numeros (las cubre el resumen)', () => {
    const bloques = bloquesMiPrograma(omar());
    for (const b of BLOQUES_PROGRAMA) {
      const esperadas = b.secciones.filter((x) => b.key !== 'evaluacion' || !CUBIERTAS_POR_RESUMEN.includes(x));
      expect(bloques.find((x) => x.key === b.key)!.filas.map((f) => f.seccion)).toEqual(esperadas);
    }
    const ev = bloques.find((x) => x.key === 'evaluacion')!.filas.map((f) => f.seccion);
    expect(ev.includes('inicio')).toBe(false);
    expect(ev.includes('conteo')).toBe(false);
  });
  it('primera entrega: sin filas de Genetica, Quimica cerebral ni Cruces en Tu evaluacion', () => {
    const ev = bloquesMiPrograma(primeraEntrega()).find((b) => b.key === 'evaluacion')!;
    const secs = ev.filas.map((f) => f.seccion);
    expect(secs.includes('genetica')).toBe(false);
    expect(secs.includes('braverman')).toBe(false);
    expect(secs.includes('cruces')).toBe(false);
    expect(secs.includes('marcadores')).toBe(true);
  });
  it('Tu plan y Con tu medico se quedan aunque vengan vacios, con "En tu evaluación"', () => {
    const e = omar();
    e.suplementos = [];
    e.alimentacion = { prioriza: [], evita: [], ventana: null, horarios: [], notas: [] };
    e.entrenamiento = { base: null, sesiones: [], descanso: [], notas: [] };
    e.medico = { intro: null, fuera_del_tuyo: [], pendientes: [], advertencias: [] };
    const bloques = bloquesMiPrograma(e);
    const plan = bloques.find((b) => b.key === 'plan')!;
    expect(plan.filas.map((f) => f.seccion)).toEqual(['alimentacion', 'suplementos', 'entrenamiento']);
    for (const f of plan.filas) expect(f.detalle).toBe('En tu evaluación');
    const medico = bloques.find((b) => b.key === 'medico')!;
    expect(medico.filas).toHaveLength(1);
    expect(medico.filas[0].detalle).toBe('En tu evaluación');
    expect(medico.filas[0].titulo).toBe('Pendientes');
  });
  it('los titulos son las etiquetas de la pantalla de la evaluacion', () => {
    const plan = bloquesMiPrograma(omar()).find((b) => b.key === 'plan')!;
    expect(plan.filas.map((f) => f.titulo)).toEqual(['Alimentación', 'Suplementos', 'Entrenamiento']);
  });
});

describe('detalleSeccion: numeros del documento, nunca inventados', () => {
  const e = omar();
  it('cuenta lo que trae Omar', () => {
    expect(detalleSeccion(e, 'medico')).toBe('10 pendientes de medir');
    expect(detalleSeccion(e, 'sistemas')).toBe('10 sistemas, de peor a mejor');
    expect(detalleSeccion(e, 'marcadores')).toBe('28 marcadores comentados');
    expect(detalleSeccion(e, 'composicion')).toBe('6 medidas');
    expect(detalleSeccion(e, 'genetica')).toBe('22 hallazgos');
    expect(detalleSeccion(e, 'cruces')).toBe('6 cruces');
    expect(detalleSeccion(e, 'conteo')).toBe('156 medidos');
    expect(detalleSeccion(e, 'edades')).toBe('Edad real, sangre, vida y ATP');
    expect(detalleSeccion(e, 'cierre')).toBe('Tus tres palancas');
    expect(detalleSeccion(e, 'suplementos')).toBe('6 en tu plan');
  });
  it('singular con uno', () => {
    const x = omar();
    x.medico.pendientes = x.medico.pendientes.slice(0, 1);
    x.cruces.lista = x.cruces.lista.slice(0, 1);
    x.genetica.hallazgos = x.genetica.hallazgos.slice(0, 1);
    expect(detalleSeccion(x, 'medico')).toBe('1 pendiente de medir');
    expect(detalleSeccion(x, 'cruces')).toBe('1 cruce');
    expect(detalleSeccion(x, 'genetica')).toBe('1 hallazgo');
  });
  it('sin dato no hay segunda linea (nunca "0" ni la raya)', () => {
    const x = omar();
    x.conteo.total_medido = null;
    x.edades = { ...x.edades, real: null, sangre: null, vida: null, atp: 44.5 };
    expect(detalleSeccion(x, 'conteo')).toBeNull();
    expect(detalleSeccion(x, 'edades')).toBe('Edad ATP');
    x.edades.atp = null;
    expect(detalleSeccion(x, 'edades')).toBeNull();
    expect(detalleSeccion(x, 'inicio')).toBeNull();
    expect(detalleSeccion(x, 'contexto')).toBeNull();
  });
});

describe('resumen', () => {
  it('Omar: Edad ATP y real del documento, 13 piden accion (su conteo), version y toma', () => {
    const r = resumenEvaluacion(omar());
    expect(r.edad).toEqual({ integral: 44.5, cronologica: 38 });
    expect(r.piden).toBe(13);
    expect(r.version).toBe(`Versión ${omar().version} · toma de mayo 2026 · interpretada por Enrique Zapata`);
  });
  it('sin conteo cuenta los att comentados; sin conteo y sin marcadores es null, no 0', () => {
    const e = omar();
    e.conteo.piden_accion = null;
    const att = e.marcadores.grupos.flatMap((g) => g.marcadores).concat(e.composicion.filas).filter((m) => m.estado === 'att').length;
    expect(pidenAccionDelDocumento(e)).toBe(att);
    e.marcadores.grupos = [];
    e.composicion.filas = [];
    expect(pidenAccionDelDocumento(e)).toBeNull();
  });
  it('un 0 escrito por Enrique si es un dato', () => {
    const e = omar();
    e.conteo.piden_accion = 0;
    expect(pidenAccionDelDocumento(e)).toBe(0);
  });
  it('sin fecha de toma no aparece la raya del SIN_DATO', () => {
    const e = omar();
    e.cliente.fecha_toma = '';
    expect(lineaVersion(e)).toBe(`Versión ${e.version} · interpretada por Enrique Zapata`);
  });
});

describe('estudiosVisibles', () => {
  it('Genetica solo con hallazgos; sin evaluacion leida, solo laboratorios (Evolucion salio)', () => {
    expect(estudiosVisibles(omar())).toEqual(['labs', 'genetica']);
    expect(estudiosVisibles(primeraEntrega())).toEqual(['labs']);
    expect(estudiosVisibles(null)).toEqual(['labs']);
  });
});

describe('destinos del resumen: siempre a una seccion que dibuja el numero tocado', () => {
  it('edad: Inicio si la Edad ATP viene de inicio; Edades si salio del respaldo', () => {
    const e = omar();
    expect(destinoEdad(e)).toBe('inicio');
    e.inicio.edad_atp = null;
    expect(destinoEdad(e)).toBe('edades');
    expect(resumenEvaluacion(e).edad).toEqual({ integral: 44.5, cronologica: 38 });
    expect(resumenEvaluacion(e).destinoEdad).toBe('edades');
  });
  it('piden accion: Marcadores si tiene contenido; si no, En numeros con conteo; si no, Composicion', () => {
    const e = omar();
    expect(destinoPiden(e)).toBe('marcadores');
    e.marcadores = { intro: null, grupos: [], notas: [] };
    expect(destinoPiden(e)).toBe('conteo');
    e.conteo.piden_accion = null;
    // El numero sale de los att de composicion: ahi se ve.
    expect(pidenAccionDelDocumento(e)).not.toBeNull();
    expect(destinoPiden(e)).toBe('composicion');
    e.composicion.filas = [];
    expect(pidenAccionDelDocumento(e)).toBeNull();
    expect(destinoPiden(e)).toBeNull();
  });
  it('el destino de piden accion siempre es una seccion con contenido', () => {
    for (const e of [omar(), primeraEntrega()]) {
      const d = destinoPiden(e);
      expect(d !== null && seccionTieneContenido(e, d)).toBe(true);
    }
  });
});

describe('caraSinEvaluacion (misma regla que la pantalla de la evaluacion, A5)', () => {
  const n = (o: Partial<NivelParaPrograma> = {}): NivelParaPrograma => ({
    esElite: false, tieneEvaluacionElite: false, nivelNoSePudoLeer: false, nivelCargando: false, ...o,
  });
  it('solo se promete "en preparacion" a Elite o a quien tiene evaluacion registrada', () => {
    expect(caraSinEvaluacion(n({ esElite: true }))).toBe('en_preparacion');
    expect(caraSinEvaluacion(n({ tieneEvaluacionElite: true }))).toBe('en_preparacion');
    expect(caraSinEvaluacion(n({ esElite: true, nivelNoSePudoLeer: true }))).toBe('en_preparacion');
  });
  it('sin nivel legible: no se pudo leer la cuenta; con nivel legible y sin Elite: neutral', () => {
    expect(caraSinEvaluacion(n({ nivelNoSePudoLeer: true }))).toBe('cuenta_no_leida');
    expect(caraSinEvaluacion(n())).toBe('neutral');
  });
  it('mientras el nivel carga no se decide', () => {
    expect(caraSinEvaluacion(n({ nivelCargando: true, esElite: true }))).toBe('cargando');
    expect(caraSinEvaluacion(n({ nivelCargando: true }))).toBe('cargando');
  });
});

/** El archivo de app/ que atiende una ruta estatica. */
function archivoDeRuta(ruta: string): string | null {
  for (const c of [`app${ruta}.tsx`, `app${ruta}/index.tsx`]) {
    const abs = resolve(process.cwd(), c);
    if (existsSync(abs)) return abs;
  }
  return null;
}

/** Los destinos de los <Redirect> de un archivo (href="..." o pathname: '...'). */
function destinosRedirect(src: string): string[] {
  if (!/<Redirect\b/.test(src)) return [];
  const out: string[] = [];
  for (const m of src.matchAll(/<Redirect[^>]*href=(?:"([^"]+)"|\{\s*\{[^}]*pathname:\s*'([^']+)'|\{\s*'([^']+)')/g)) {
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out.length ? out : ['(redirect sin destino legible)'];
}

const HACIA_SALUD = /^\/(\(tabs\)\/)?salud(\/|$)|^\(redirect/;

describe('rutas de MI PROGRAMA: ninguna cae en el hub de SALUD', () => {
  it('cada ruta existe en app/ y, si redirige, no es hacia /salud', () => {
    for (const ruta of Object.values(RUTAS_MI_PROGRAMA)) {
      const f = archivoDeRuta(ruta);
      expect(f === null ? `falta ${ruta}` : 'ok').toBe('ok');
      const destinos = destinosRedirect(readFileSync(f!, 'utf8'));
      for (const d of destinos) expect(`${ruta} -> ${d}: ${HACIA_SALUD.test(d) ? 'SALUD' : 'ok'}`).toBe(`${ruta} -> ${d}: ok`);
    }
  });
  it('la evaluacion, genetica, sintomas, datos, la ficha, el mapa, padecimientos y la linea de tiempo son pantallas reales (sin Redirect)', () => {
    for (const r of [RUTAS_MI_PROGRAMA.evaluacion, RUTAS_MI_PROGRAMA.genetica, RUTAS_MI_PROGRAMA.sintomas,
      RUTAS_MI_PROGRAMA.datos, RUTAS_MI_PROGRAMA.ficha, RUTAS_MI_PROGRAMA.labs, RUTAS_MI_PROGRAMA.suplementos,
      RUTAS_MI_PROGRAMA.mapa, RUTAS_MI_PROGRAMA.padecimientos, RUTAS_MI_PROGRAMA.linea]) {
      expect(destinosRedirect(readFileSync(archivoDeRuta(r)!, 'utf8'))).toEqual([]);
    }
  });
  it('7-oct-2026: "Ver mi plan de la semana" abre /mi-plan, una pantalla real de esta sala', () => {
    expect(FILA_PLAN_SEMANA.ruta).toBe('/mi-plan');
    expect(Object.values(RUTAS_MI_PROGRAMA).includes(FILA_PLAN_SEMANA.ruta)).toBe(true);
    expect(destinosRedirect(readFileSync(archivoDeRuta(FILA_PLAN_SEMANA.ruta)!, 'utf8'))).toEqual([]);
    // La pantalla empuja el literal (para que el censo de rutas la vea como
    // puerta): tiene que ser el mismo destino que declara el core.
    const pantalla = readFileSync(resolve(process.cwd(), 'src/screens/elite-dx/MiProgramaScreen.tsx'), 'utf8');
    expect(pantalla).toMatch(`router.push('${FILA_PLAN_SEMANA.ruta}')`);
    expect(pantalla).toMatch('titulo={FILA_PLAN_SEMANA.titulo}');
  });
  it('control: el detector si caza /salud/evolucion (la que salio)', () => {
    const d = destinosRedirect(readFileSync(archivoDeRuta('/salud/evolucion')!, 'utf8'));
    expect(d.some((x) => HACIA_SALUD.test(x))).toBe(true);
  });
  it('las filas del expediente usan solo rutas de RUTAS_MI_PROGRAMA', () => {
    const rutas: string[] = Object.values(RUTAS_MI_PROGRAMA);
    expect(FILAS_EXPEDIENTE.map((f) => f.key))
      .toEqual(['mapa', 'historia', 'sintomas', 'padecimientos', 'datos', 'linea', 'ficha']);
    for (const f of FILAS_EXPEDIENTE) expect(rutas.includes(f.ruta)).toBe(true);
  });
  it('26-sep-2026: el mapa es carpeta y la atiende su index.tsx; padecimientos y linea de tiempo existen', () => {
    expect((archivoDeRuta(RUTAS_MI_PROGRAMA.mapa) ?? '').replace(/\\/g, '/').endsWith('app/salud/diagnostico/index.tsx')).toBe(true);
    expect(archivoDeRuta(RUTAS_MI_PROGRAMA.padecimientos)).not.toBeNull();
    expect((archivoDeRuta(RUTAS_MI_PROGRAMA.linea) ?? '').replace(/\\/g, '/').endsWith('app/salud/mi-expediente/index.tsx')).toBe(true);
  });
  it('26-sep-2026: lo que el registro cierra por nivel queda abierto para Elite, aun con la venta al publico encendida', () => {
    const porRuta = new Map(visibleApps(true, 'elite', false, true).map((a) => [String(a.route), a]));
    for (const r of [RUTAS_MI_PROGRAMA.mapa, RUTAS_MI_PROGRAMA.padecimientos]) {
      const app = porRuta.get(r);
      expect(app ? `${r}: ${app.bloqueada ? 'cerrada' : 'abierta'}` : `${r}: fuera del registro`).toBe(`${r}: abierta`);
    }
    // La linea de tiempo no es app del registro: no la cierra ningun nivel.
    expect(APP_REGISTRY.some((a) => String(a.route) === RUTAS_MI_PROGRAMA.linea)).toBe(false);
  });
});

describe('siguienteEstado (regla 13)', () => {
  const e = omar();
  const cargando: EstadoMiPrograma = { estado: 'cargando' };
  it('lectura buena: ok o sin evaluacion', () => {
    expect(siguienteEstado(cargando, { ok: true, evaluacion: e })).toEqual({ estado: 'ok', evaluacion: e });
    expect(siguienteEstado(cargando, { ok: true, evaluacion: null })).toEqual({ estado: 'sin_evaluacion' });
  });
  it('un fallo no borra una evaluacion ya vista', () => {
    const ok: EstadoMiPrograma = { estado: 'ok', evaluacion: e };
    expect(siguienteEstado(ok, { ok: false, motivo: 'lectura' })).toBe(ok);
  });
  it('un fallo sin nada visto es error con su motivo, nunca "sin evaluacion"', () => {
    expect(siguienteEstado(cargando, { ok: false, motivo: 'lectura' })).toEqual({ estado: 'error', motivo: 'lectura' });
    expect(siguienteEstado(cargando, { ok: false, motivo: 'formato' })).toEqual({ estado: 'error', motivo: 'formato' });
  });
  it('el tope solo afecta a lo que seguia cargando, y una lectura tardia buena gana', () => {
    expect(estadoAlVencer(cargando)).toEqual({ estado: 'error', motivo: 'tope' });
    const ok: EstadoMiPrograma = { estado: 'ok', evaluacion: e };
    expect(estadoAlVencer(ok)).toBe(ok);
    expect(siguienteEstado({ estado: 'error', motivo: 'tope' }, { ok: true, evaluacion: e })).toEqual(ok);
  });
});

describe('copy', () => {
  it('sin em dashes ni palabras rojas, con documento completo y con primera entrega', () => {
    for (const e of [omar(), primeraEntrega()]) {
      for (const txt of todoElCopy(e)) {
        expect(txt.includes(EM_DASH)).toBe(false);
        expect(ROJAS.test(txt)).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 8-oct-2026 (nivel 2): el mismo documento con `tipo: 'programa'`
// ---------------------------------------------------------------------------

const programaCrudo: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'R and D/diagnostico/programa_ejemplo.json'), 'utf8'),
);

/** El ejemplo de programa de A: sin evaluacion, con nombre, con plan y con las tres palancas. */
function programa(): EliteV3 {
  const r = validarEliteV3(JSON.parse(JSON.stringify(programaCrudo)));
  if (!r.ok) throw new Error(r.errores.join('\n'));
  return r.valor;
}

/** Programa sin nombre (la ceja y los titulos caen en las palabras genericas). */
function programaSinNombre(): EliteV3 {
  const e = programa();
  e.inicio.programa_nombre = null;
  return e;
}

/** Programa con una evaluacion ligera: dos marcadores y la edad que el coach calculo. */
function programaConEvaluacion(): EliteV3 {
  const e = programa();
  const o = omar();
  e.marcadores = { intro: null, grupos: [o.marcadores.grupos[0]], notas: [] };
  e.inicio.edad_cronologica = 41;
  return e;
}

/** La regla de bloquesMiPrograma hasta el 7-oct-2026, copiada tal cual. */
function bloquesAntes(e: EliteV3) {
  return BLOQUES_PROGRAMA
    .map((b) => ({
      key: b.key,
      titulo: b.titulo,
      filas: b.secciones
        .filter((sec) => b.key !== 'evaluacion'
          || (!CUBIERTAS_POR_RESUMEN.includes(sec) && seccionTieneContenido(e, sec)))
        .map((sec) => ({ seccion: sec, titulo: etiquetaSeccion(sec), detalle: detalleSeccion(e, sec) })),
    }))
    .filter((b) => b.filas.length > 0);
}

function etiquetaSeccion(k: string): string {
  return SECCIONES_UI.find((x) => x.key === k)?.label ?? k;
}

const ELITE = /elite/i;

describe('nivel 2: Elite se queda letra por letra', () => {
  it('bloquesMiPrograma de un documento Elite es el de antes (completo y primera entrega)', () => {
    for (const e of [omar(), primeraEntrega()]) expect(bloquesMiPrograma(e)).toEqual(bloquesAntes(e));
  });
  it('las palabras de siempre', () => {
    const e = omar();
    expect(lineaVersion(e)).toMatch(/^Versión \d+ · toma de .+ · interpretada por /);
    expect(lineaFirmaEvaluacion(e)).toBe(`Interpretada por ${e.interpretado_por.evaluacion} · toma: ${lineaVersion(e).split('toma de ')[1].split(' · ')[0]}`);
    expect(etiquetaDocumentoConCoach(VOZ_ELITE)).toBe('TU EVALUACIÓN CON ENRIQUE');
    expect(documentoListo(VOZ_ELITE)).toBe('Tu evaluación está lista');
    expect(filaDocumentoCompleto(VOZ_ELITE)).toEqual({ titulo: 'Ver tu evaluación completa', detalle: 'Todas las secciones y tu PDF' });
    expect(tituloSinLead(vozDeDocumento(e))).toBe('Tu evaluación Elite');
    expect(tituloPantallaEvaluacion(e, false)).toBe('Mi evaluación Elite');
    expect(cejaMiPrograma({ estado: 'ok', evaluacion: e })).toBe('ATP ELITE');
    expect(seccionesVisiblesEvaluacion(e)).toEqual(SECCIONES_UI.map((x) => x.key));
    expect(seccionesVisiblesEvaluacion(primeraEntrega())).toEqual(SECCIONES_UI.map((x) => x.key));
    expect(ofrecerCompararLaboratorios(e)).toBe(true);
    expect(caraGeneticaSinHallazgos(vozDeDocumento(e), 2)).toEqual({
      titulo: 'Tu genética se integra en la segunda entrega (semana 8)',
      texto: 'Tu evaluación versión 2 ya está en la app. Cuando llegue la interpretación genética, aquí la ves por tema, con qué hacer en cada caso.',
      cta: 'Ver mi evaluación Elite',
    });
    expect(enlaceDocumentoCompleto(vozDeDocumento(e))).toBe('Ver mi evaluación Elite completa');
    expect(resumenVigenteDocumento(vozDeDocumento(e))).toBe('Tu versión vigente es tu evaluación Elite, interpretada por Enrique. Ábrela abajo para verla completa.');
    expect(puertaDocumento(vozDeDocumento(e))).toEqual({
      titulo: 'Mi evaluación Elite',
      detalle: 'Tu evaluación interpretada por Enrique: secciones, marcadores, cruces y tus tres palancas',
      accesibilidad: 'Abrir Mi evaluación Elite',
    });
    expect(copyPlanSuplementos({ ok: true, evaluacion: e })).toEqual({
      origen: 'Lo armó Enrique a partir de tu evaluación. Aquí registras tus tomas; si algo no te va, díselo y él lo ajusta.',
      enlace: 'Ver el porqué en mi evaluación',
      pie: 'Este plan lo asignó Enrique a partir de tu evaluación y lo ajusta él. Lo que registras aquí es tuyo.',
      soloLectura: 'Tu plan Elite se conserva: lo sigues viendo y registrando tus tomas.',
    });
    expect(asuntoCorreoCoach({ ok: true, evaluacion: e })).toBe('Mi programa ATP Elite');
  });
  it('inicio de un Elite sigue contando la duracion del programa', () => {
    const e = omar();
    e.inicio.edad_cronologica = null; e.inicio.edad_atp = null; e.inicio.diferencia_anios = null;
    expect(seccionTieneContenido(e, 'inicio')).toBe(true);
  });
});

describe('nivel 2: lo que lee el cliente de un programa', () => {
  it('Inicio solo cuenta con alguna edad: la duracion sola es del plan', () => {
    const e = programa();
    expect(e.inicio.programa_semanas).toBe(12);
    expect(seccionTieneContenido(e, 'inicio')).toBe(false);
    e.inicio.edad_cronologica = 41;
    expect(seccionTieneContenido(e, 'inicio')).toBe(true);
  });

  it('MI PROGRAMA: sin bloque de medico vacio, la evaluacion se llama TU PROGRAMA y Tu plan siempre esta', () => {
    const e = programa();
    const b = bloquesMiPrograma(e);
    expect(b.map((x) => x.key)).toEqual(['plan', 'evaluacion']);
    expect(b.find((x) => x.key === 'evaluacion')?.titulo).toBe('TU PROGRAMA');
    expect(b.find((x) => x.key === 'evaluacion')?.filas.map((f) => f.seccion)).toEqual(['cierre']);
    expect(b.find((x) => x.key === 'plan')?.titulo).toBe(tituloDeBloque(BLOQUES_PROGRAMA[0], vozDeDocumento(e)));
    // Sin plan escrito: el bloque sigue (la pantalla le pone "Ver mi plan de la semana") y sin filas huecas.
    e.suplementos = [];
    e.alimentacion = { ...e.alimentacion, prioriza: [], evita: [], horarios: [], ventana: null, notas: [], metas: null, comidas: [] } as never;
    e.entrenamiento = { ...e.entrenamiento, base: null, sesiones: [], descanso: [], notas: [], rutinas: [] } as never;
    const sinPlan = bloquesMiPrograma(e);
    expect(sinPlan.find((x) => x.key === 'plan')?.filas).toEqual([]);
    // Con medico, el bloque vuelve y no dice "evaluación".
    const conMedico = programa();
    conMedico.medico = { intro: 'Pide tu glucosa en ayunas a tu médico.', fuera_del_tuyo: [], pendientes: [], advertencias: [] };
    const fila = bloquesMiPrograma(conMedico).find((x) => x.key === 'medico')?.filas[0];
    expect(fila?.detalle).toBe('En tu programa');
  });

  it('con evaluacion ligera: TU EVALUACIÓN con lo que trae, nada mas', () => {
    const e = programaConEvaluacion();
    const ev = bloquesMiPrograma(e).find((x) => x.key === 'evaluacion');
    expect(ev?.titulo).toBe('TU EVALUACIÓN');
    expect(ev?.filas.map((f) => f.seccion)).toEqual(['marcadores', 'cierre']);
    expect(seccionesVisiblesEvaluacion(e)).toContain('inicio');
    expect(ofrecerCompararLaboratorios(e)).toBe(true);
  });

  it('la pantalla del documento solo pinta secciones con algo', () => {
    const v = seccionesVisiblesEvaluacion(programa());
    expect(v).toEqual(['cierre', 'alimentacion', 'suplementos', 'entrenamiento']);
    for (const k of ['inicio', 'conteo', 'genetica', 'braverman', 'medico', 'marcadores'] as const) expect(v.includes(k)).toBe(false);
    expect(ofrecerCompararLaboratorios(programa())).toBe(false);
  });

  it('firma, version y titulos: sin toma inventada y sin marca', () => {
    const e = programa();
    expect(e.cliente.fecha_toma).toBeNull();
    expect(lineaVersion(e)).toBe('Versión 1 · preparado por Enrique Zapata');
    expect(lineaFirmaEvaluacion(e)).toBe('Preparado por Enrique Zapata');
    const conToma = programaConEvaluacion();
    conToma.cliente.fecha_toma = '2026-09-30';
    expect(lineaFirmaEvaluacion(conToma)).toBe('Interpretada por Enrique Zapata · toma: 30 de septiembre de 2026');
    expect(tituloPantallaEvaluacion(e, false)).toBe('Fuerza y sueño');
    expect(tituloPantallaEvaluacion(programaSinNombre(), false)).toBe('Mi programa completo');
    expect(tituloSinLead(vozDeDocumento(e))).toBe('Fuerza y sueño');
    expect(tituloSinLead(vozDeDocumento(programaSinNombre()))).toBe('Tu programa');
  });

  it('sin documento leido: titulo neutro; con candado (cuenta sin nada), el de Elite', () => {
    expect(tituloPantallaEvaluacion(null, false)).toBe(TITULO_DOCUMENTO_NEUTRO);
    expect(tituloPantallaEvaluacion(null, true)).toBe('Mi evaluación Elite');
  });

  it('la ceja: nombre, o neutra; nunca Elite mientras no hay documento', () => {
    expect(cejaMiPrograma({ estado: 'ok', evaluacion: programa() })).toBe('FUERZA Y SUEÑO');
    expect(cejaMiPrograma({ estado: 'ok', evaluacion: programaSinNombre() })).toBe(CEJA_NEUTRA);
    for (const st of [{ estado: 'cargando' }, { estado: 'sin_evaluacion' }, { estado: 'error', motivo: 'lectura' }] as EstadoMiPrograma[]) {
      expect(cejaMiPrograma(st)).toBe(CEJA_NEUTRA);
    }
  });

  it('resumen, fila completa, genetica, mapa y suplementos: con el genero y sin promesas', () => {
    const voz = vozDeDocumento(programa());
    expect(etiquetaDocumentoConCoach(voz)).toBe('TU PROGRAMA CON ENRIQUE');
    expect(documentoListo(voz)).toBe('Tu programa está listo');
    expect(filaDocumentoCompleto(voz)).toEqual({ titulo: 'Ver tu programa completo', detalle: 'Todas las secciones y tu PDF' });
    expect(caraGeneticaSinHallazgos(voz, 1)).toEqual({
      titulo: 'Tu programa no incluye estudio genético',
      texto: 'Lo que Enrique preparó para ti está en tu programa.',
      cta: 'Ver mi programa',
    });
    expect(enlaceDocumentoCompleto(voz)).toBe('Ver mi programa completo');
    expect(resumenVigenteDocumento(voz)).toBe('Tu versión vigente es tu programa, preparado por Enrique. Ábrelo abajo para verlo completo.');
    expect(puertaDocumento(voz).titulo).toBe('Fuerza y sueño');
    expect(copyPlanSuplementos({ ok: true, evaluacion: programa() })).toEqual({
      origen: 'Lo armó Enrique para tu programa. Aquí registras tus tomas; si algo no te va, díselo y él lo ajusta.',
      enlace: 'Ver el porqué en mi programa',
      pie: 'Este plan lo asignó Enrique para tu programa y lo ajusta él. Lo que registras aquí es tuyo.',
      soloLectura: 'Tu plan se conserva: lo sigues viendo y registrando tus tomas.',
    });
    expect(asuntoCorreoCoach({ ok: true, evaluacion: programa() })).toBe('Mi programa ATP');
    // Con evaluacion ligera, "tu evaluación" es verdad y se dice.
    const conEv = vozDeDocumento(programaConEvaluacion());
    expect(copyPlanSuplementos({ ok: true, evaluacion: programaConEvaluacion() }).enlace).toBe('Ver el porqué en mi evaluación');
    expect(resumenVigenteDocumento(conEv)).toBe('Tu versión vigente es tu evaluación, interpretada por Enrique. Ábrela abajo para verla completa.');
    expect(enlaceDocumentoCompleto(conEv)).toBe('Ver mi evaluación completa');
  });

  it('sin documento, leyendo o sin poder leer: Suplementos sin enlace (caeria en un candado) y sin "evaluación"', () => {
    for (const l of [null, { ok: true as const, evaluacion: null }, { ok: false as const, motivo: 'lectura' as const }]) {
      const c = copyPlanSuplementos(l);
      expect(c.enlace).toBeNull();
      for (const txt of Object.values(c)) if (txt) expect(/evaluaci[oó]n|elite/i.test(txt)).toBe(false);
      expect(asuntoCorreoCoach(l)).toBe('Mi programa ATP');
    }
    expect(puertaDocumento(null).titulo).toBe(TITULO_DOCUMENTO_NEUTRO);
  });

  it('vozDeSnapshot: la fila del mapa funcional dice su tipo aunque no valide', () => {
    expect(vozDeSnapshot({ elite_v3: JSON.parse(JSON.stringify(programaCrudo)) })?.tipo).toBe('programa');
    expect(vozDeSnapshot({ elite_v3: JSON.parse(JSON.stringify(ejemplo)) })?.tipo).toBe('elite');
    const roto = JSON.parse(JSON.stringify(programaCrudo));
    delete roto.cierre;
    const v = vozDeSnapshot({ elite_v3: roto });
    expect(v?.tipo).toBe('programa');
    expect(v?.nombre).toBe('Fuerza y sueño');
    expect(vozDeSnapshot({ algo: 1 })).toBeNull();
    expect(vozDeSnapshot(null)).toBeNull();
  });

  it('barrido: nada de lo que lee un programa dice Elite, ni lleva em dash ni palabras rojas', () => {
    const docs = [programa(), programaSinNombre(), programaConEvaluacion()];
    const textos: string[] = [];
    for (const e of docs) {
      const voz = vozDeDocumento(e);
      textos.push(...todoElCopy(e), lineaFirmaEvaluacion(e), tituloSinLead(voz), tituloPantallaEvaluacion(e, false),
        cejaMiPrograma({ estado: 'ok', evaluacion: e }), etiquetaDocumentoConCoach(voz), documentoListo(voz),
        ...Object.values(filaDocumentoCompleto(voz)), ...Object.values(caraGeneticaSinHallazgos(voz, e.version)),
        enlaceDocumentoCompleto(voz), resumenVigenteDocumento(voz), ...Object.values(puertaDocumento(voz)),
        ...Object.values(copyPlanSuplementos({ ok: true, evaluacion: e })).filter((x): x is string => !!x),
        asuntoCorreoCoach({ ok: true, evaluacion: e }));
    }
    textos.push(tituloPantallaEvaluacion(null, false), CEJA_NEUTRA, ...Object.values(puertaDocumento(null)),
      vozDe({ tipo: 'programa' }).asuntoCorreo);
    for (const t of textos) {
      expect(ELITE.test(t), t).toBe(false);
      expect(t.includes(EM_DASH), t).toBe(false);
      expect(ROJAS.test(t), t).toBe(false);
    }
  });
});

describe('nivel 2: contrato de fuente de las pantallas', () => {
  const leerApp = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');
  it('la evaluacion ya no fija el nombre del PDF ni el titulo Elite', () => {
    const src = leerApp('app/salud/evaluacion-elite.tsx');
    expect(src.includes('Evaluacion-Elite-v')).toBe(false);
    expect(src.includes('title="Mi evaluación Elite"')).toBe(false);
    expect(src).toMatch(/archivoPdf\(voz, evaluacion\.version\)/);
    expect(src).toMatch(/seccionesVisiblesEvaluacion\(e\)/);
  });
  it('Suplementos, Genetica, el mapa y MI PROGRAMA toman sus palabras del core', () => {
    expect(leerApp('app/supplements.tsx')).toMatch(/copyPlanSuplementos\(lecturaDoc, tier\)/);
    expect(leerApp('app/supplements.tsx').includes('>Ver el porqué en mi evaluación<')).toBe(false);
    expect(leerApp('app/salud/genetica.tsx')).toMatch(/caraGeneticaSinHallazgos\(voz, e\.version\)/);
    expect(leerApp('app/salud/diagnostico/index.tsx')).toMatch(/puertaDocumento\(/);
    const mp = leerApp('src/screens/elite-dx/MiProgramaScreen.tsx');
    expect(mp.includes('>ATP ELITE<')).toBe(false);
    expect(mp).toMatch(/cejaMiPrograma\(estado, tier\)/);
  });
});

// ---------------------------------------------------------------------------
// 8-oct-2026 (nivel 2, revision en frio): sin documento leido decide el nivel
// ---------------------------------------------------------------------------

describe('nivel 2: la voz de la cuenta (vozMientras)', () => {
  const elite = { ok: true as const, evaluacion: null as EliteV3 | null };
  it('un documento leido siempre manda, sea cual sea el nivel', () => {
    expect(vozMientras({ documento: { ok: true, evaluacion: omar() }, tier: 'premium' })?.tipo).toBe('elite');
    expect(vozMientras({ documento: { ok: true, evaluacion: omar() }, tier: 'free' })).toEqual(VOZ_ELITE);
    expect(vozMientras({ documento: { ok: true, evaluacion: programa() }, tier: 'elite' })?.tipo).toBe('programa');
  });
  it('sin documento leido: nivel Elite es la voz Elite; otro nivel (o sin leer), ninguna', () => {
    for (const d of [null, undefined, elite, { ok: false as const }]) {
      expect(vozMientras({ documento: d, tier: 'elite' })).toBe(VOZ_ELITE);
      for (const tier of ['premium', 'free', null, undefined]) {
        expect(vozMientras({ documento: d, tier })).toBeNull();
        expect(vozParaTextos({ documento: d, tier })).toBe(VOZ_PROGRAMA_NEUTRA);
      }
    }
  });
  it('un cliente Elite ve lo de siempre desde el primer cuadro (nivel leido, documento aun no)', () => {
    expect(cejaMiPrograma({ estado: 'cargando' }, 'elite')).toBe('ATP ELITE');
    expect(cejaMiPrograma({ estado: 'error', motivo: 'lectura' }, 'elite')).toBe('ATP ELITE');
    expect(cejaMiPrograma({ estado: 'sin_evaluacion' }, 'elite')).toBe('ATP ELITE');
    expect(tituloPantallaEvaluacion(null, false, 'elite')).toBe('Mi evaluación Elite');
    expect(asuntoCorreoCoach(null, 'elite')).toBe('Mi programa ATP Elite');
    expect(copyPlanSuplementos(null, 'elite')).toEqual(copyPlanSuplementos({ ok: true, evaluacion: omar() }));
    expect(copyPlanSuplementos({ ok: false, motivo: 'lectura' }, 'elite').enlace).toBe('Ver el porqué en mi evaluación');
  });
  it('programa (codigo premium) sin documento leido: neutro, nunca Elite', () => {
    expect(cejaMiPrograma({ estado: 'cargando' }, 'premium')).toBe(CEJA_NEUTRA);
    expect(tituloPantallaEvaluacion(null, false, 'premium')).toBe('Mi programa completo');
    expect(asuntoCorreoCoach(null, 'premium')).toBe('Mi programa ATP');
    expect(copyPlanSuplementos(null, 'premium').enlace).toBeNull();
    // Con su documento leido, aunque alguien le diera nivel Elite, habla su documento.
    expect(cejaMiPrograma({ estado: 'ok', evaluacion: programa() }, 'elite')).toBe('FUERZA Y SUEÑO');
    expect(asuntoCorreoCoach({ ok: true, evaluacion: programa() }, 'elite')).toBe('Mi programa ATP');
  });
});

describe('nivel 2: "no se pudo leer" y "cargando" con el genero del documento', () => {
  it('Elite: las frases de siempre', () => {
    expect(textosNoSePudoLeer(VOZ_ELITE)).toEqual({
      etiqueta: 'TU EVALUACIÓN CON ENRIQUE',
      titulo: 'No pudimos leer tu evaluación',
      tituloImpersonal: 'No se pudo leer tu evaluación',
      sigueGuardado: 'Tu evaluación sigue guardada.',
      formato: 'Tu evaluación está guardada, pero esta versión de la app no la entiende. Actualiza la app y vuelve a intentar.',
      cargando: 'Cargando tu evaluación…',
    });
  });
  it('programa: "tu programa", en masculino y sin Elite', () => {
    const x = textosNoSePudoLeer(VOZ_PROGRAMA_NEUTRA);
    expect(x.etiqueta).toBe('TU PROGRAMA CON ENRIQUE');
    expect(x.titulo).toBe('No pudimos leer tu programa');
    expect(x.sigueGuardado).toBe('Tu programa sigue guardado.');
    expect(x.formato).toBe('Tu programa está guardado, pero esta versión de la app no lo entiende. Actualiza la app y vuelve a intentar.');
    expect(x.cargando).toBe('Cargando tu programa…');
    for (const t of Object.values(x)) { expect(ELITE.test(t)).toBe(false); expect(t.includes(EM_DASH)).toBe(false); }
  });
});

describe('nivel 2: sin filas de raya en un programa', () => {
  const sinNada = { valor: 72.4, rango_lab: null, objetivo: null, estado: null } as const;
  it('Elite: todas las columnas, como siempre', () => {
    expect(columnasMarcador(sinNada, false)).toEqual({ valor: true, rango: true, objetivo: true, estado: true });
    expect(mostrarEstado(null, false)).toBe(true);
  });
  it('programa: solo las columnas con dato', () => {
    expect(columnasMarcador(sinNada, true)).toEqual({ valor: true, rango: false, objetivo: false, estado: false });
    expect(columnasMarcador({ valor: null, rango_lab: { min: null, max: null }, objetivo: { min: 20, max: null }, estado: 'opt' } as never, true))
      .toEqual({ valor: false, rango: false, objetivo: true, estado: true });
    expect(mostrarEstado(null, true)).toBe(false);
    expect(mostrarEstado('att', true)).toBe(true);
  });
  it('el PDF de un programa no imprime rayas ni "Sin valor" en marcadores, sistemas ni suplementos', () => {
    const e = programaConEvaluacion();
    const m0 = e.marcadores.grupos[0].marcadores[0];
    e.marcadores.grupos[0].marcadores = [{ ...m0, rango_lab: null, objetivo: null, estado: null, evidencia: null }];
    e.composicion.filas = [{ ...m0, key: 'peso', nombre: 'Peso', valor: 80, unidad: 'kg', rango_lab: null, objetivo: null, estado: null, evidencia: null }];
    e.sistemas = [{ key: 'metabolismo', nombre: 'Metabolismo', score: null, estado: null, por_que: 'Se ve bien.' }];
    e.suplementos = e.suplementos.map((x) => ({ ...x, dosis_cantidad: null, momento: null }));
    const html = htmlDeEvaluacion(e);
    const i = html.indexOf(EM_DASH);
    expect(i < 0 ? '' : html.slice(Math.max(0, i - 120), i + 20)).toBe('');
    expect(html.includes('Sin valor')).toBe(false);
    expect(ELITE.test(html)).toBe(false);
  });
});

describe('nivel 2: el candado de la ficha del coach (329)', () => {
  it('se reconoce por su mensaje, nada mas', () => {
    expect(esFichaDelCoachSoloLectura({ message: 'ficha_del_coach_solo_lectura' })).toBe(true);
    expect(esFichaDelCoachSoloLectura({ message: 'ERROR: ficha_del_coach_solo_lectura (42501)' })).toBe(true);
    expect(esFichaDelCoachSoloLectura({ message: 'permission denied for table user_supplements' })).toBe(false);
    expect(esFichaDelCoachSoloLectura(null)).toBe(false);
    expect(esFichaDelCoachSoloLectura({ message: 42 })).toBe(false);
  });
  it('el aviso dice de quien es y que se puede hacer, sin raya ni marca', () => {
    for (const t of Object.values(AVISO_FICHA_DEL_COACH)) {
      expect(ELITE.test(t)).toBe(false);
      expect(t.includes(EM_DASH)).toBe(false);
      expect(ROJAS.test(t)).toBe(false);
    }
    expect(AVISO_FICHA_DEL_COACH.texto).toMatch(/pausarla/);
    expect(leerFuente('app/supplements.tsx')).toMatch(/esFichaDelCoachSoloLectura\(error\)/);
  });
});

function leerFuente(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}
