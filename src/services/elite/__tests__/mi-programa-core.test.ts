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
  estadoAlVencer, estudiosVisibles, FILAS_EXPEDIENTE, lineaVersion, pidenAccionDelDocumento, resumenEvaluacion,
  RUTAS_MI_PROGRAMA, seccionTieneContenido, siguienteEstado,
  type EstadoMiPrograma, type NivelParaPrograma,
} from '@/src/services/elite/mi-programa-core';

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
