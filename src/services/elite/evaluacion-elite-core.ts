/**
 * Logica PURA de la pantalla "Mi evaluacion Elite" y de Genetica (ATP 3.0,
 * 6 de septiembre de 2026, ruta 3.3, 3.4 y 3.10). Cero React, cero supabase.
 * Se verifica con `node scripts/run-tests-sin-vitest.js`.
 *
 * Que vive aqui: el orden de las secciones navegables, el orden de los
 * sistemas (de peor a mejor), la etiqueta y el color de cada estado
 * (att, sub, opt), el formato de valores y rangos, la escalera de evidencia,
 * la lectura de las filas de functional_dx (que version es la vigente, cuales
 * son anteriores) y un HTML sobrio para el PDF cuando el payload no trae el
 * `html` del generador de Enrique.
 *
 * Lo que NO hace: calcular estados ni rangos. Todo lo que muestra lo escribio
 * y firmo una persona (`interpretado_por`). Aqui solo se ordena y se formatea.
 */

import { SIN_DATO } from '@/src/services/supplements/adherencia-core';
import {
  esEliteV3,
  validarEliteV3,
  type EliteEstado,
  type EliteEvidencia,
  type EliteFuente,
  type EliteMarcador,
  type EliteNivelEje,
  type EliteRango,
  type EliteSistema,
  type EliteV3,
} from './elite-v3-core';

// ---------------------------------------------------------------------------
// Secciones navegables
// ---------------------------------------------------------------------------

export const SECCIONES_UI = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'conteo', label: 'En números' },
  { key: 'edades', label: 'Edades' },
  { key: 'sistemas', label: 'Sistemas' },
  { key: 'contexto', label: 'Contexto' },
  { key: 'marcadores', label: 'Marcadores' },
  { key: 'composicion', label: 'Composición' },
  { key: 'braverman', label: 'Química cerebral' },
  { key: 'genetica', label: 'Genética' },
  { key: 'cruces', label: 'Cruces' },
  { key: 'medico', label: 'Pendientes' },
  { key: 'cierre', label: 'Cierre' },
  { key: 'alimentacion', label: 'Alimentación' },
  { key: 'suplementos', label: 'Suplementos' },
  { key: 'entrenamiento', label: 'Entrenamiento' },
] as const;

export type SeccionUiKey = (typeof SECCIONES_UI)[number]['key'];

// ---------------------------------------------------------------------------
// Estados, fuentes y evidencia
// ---------------------------------------------------------------------------

/** Llave del token de color del tema para cada estado. null = tinta secundaria. */
export type TokenEstado = 'critico' | 'advertencia' | 'exito';

export interface EtiquetaEstado {
  simbolo: string;
  texto: string;
  token: TokenEstado | null;
}

/** El vocabulario visual del formato Omar: triangulo, rombo, circulo. */
export function etiquetaEstado(estado: EliteEstado | null): EtiquetaEstado {
  switch (estado) {
    case 'att': return { simbolo: '▲', texto: 'Pide acción', token: 'critico' };
    case 'sub': return { simbolo: '◆', texto: 'En rango, no en su mejor punto', token: 'advertencia' };
    case 'opt': return { simbolo: '●', texto: 'Donde queremos', token: 'exito' };
    default: return { simbolo: SIN_DATO, texto: 'Sin valor', token: null };
  }
}

export const ETIQUETA_FUENTE: Record<EliteFuente, string> = {
  gen: 'Genética',
  lab: 'Laboratorio',
  ctx: 'Contexto',
};

/** Los cuatro peldanos de la escalera de evidencia (SPEC_DIAGNOSTICO_V3). */
export const ETIQUETA_EVIDENCIA: Record<EliteEvidencia, string> = {
  1: 'Fuera del rango del laboratorio',
  2: 'Dentro del laboratorio, fuera del criterio funcional',
  3: 'Criterio funcional interpretativo',
  4: 'Hay señal, no hay prueba',
};

export function etiquetaEvidencia(e: EliteEvidencia | null): string {
  return e === null ? 'Sin nivel de evidencia anotado' : ETIQUETA_EVIDENCIA[e];
}

export const ETIQUETA_NIVEL_EJE: Record<EliteNivelEje, string> = {
  dom: 'Dominante',
  medio: 'Medio',
  bajo: 'Bajo',
};

// ---------------------------------------------------------------------------
// Orden de sistemas: de peor a mejor
// ---------------------------------------------------------------------------

const RANGO_ESTADO: Record<string, number> = { att: 0, sub: 1, opt: 2 };

/**
 * Peor primero: att, luego sub, luego opt, y al final los que no tienen
 * valor. Dentro del mismo estado, el score mas bajo primero. No muta.
 */
export function ordenarSistemas(sistemas: EliteSistema[]): EliteSistema[] {
  return [...sistemas].sort((a, b) => {
    const ra = a.estado === null ? 3 : RANGO_ESTADO[a.estado];
    const rb = b.estado === null ? 3 : RANGO_ESTADO[b.estado];
    if (ra !== rb) return ra - rb;
    const sa = a.score === null ? Number.POSITIVE_INFINITY : a.score;
    const sb = b.score === null ? Number.POSITIVE_INFINITY : b.score;
    return sa - sb;
  });
}

// ---------------------------------------------------------------------------
// Formato de valores y rangos
// ---------------------------------------------------------------------------

/** "6.2 mg/dL", "6.2" o la raya si no hay valor. Nunca inventa unidad. */
export function formatearValor(valor: number | null, unidad: string | null): string {
  if (valor === null) return SIN_DATO;
  const v = Number.isInteger(valor) ? String(valor) : String(Number(valor.toFixed(2)));
  return unidad ? `${v} ${unidad}` : v;
}

/** "70 a 99", "hasta 30", "desde 40" o la raya cuando no hay rango. */
export function formatearRango(r: EliteRango | null): string {
  if (!r) return SIN_DATO;
  if (r.min !== null && r.max !== null) return `${r.min} a ${r.max}`;
  if (r.max !== null) return `hasta ${r.max}`;
  if (r.min !== null) return `desde ${r.min}`;
  return SIN_DATO;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * 'YYYY-MM' se lee "mayo 2026" (el dia no se inventa); 'YYYY-MM-DD' o un ISO
 * completo se lee "12 de mayo de 2026". Lo que no se entienda se devuelve tal cual.
 */
export function formatearFecha(f: string | null | undefined): string {
  if (!f) return SIN_DATO;
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(f);
  if (!m) return f;
  const mes = MESES[Number(m[2]) - 1];
  if (!mes) return f;
  if (!m[3]) return `${mes} ${m[1]}`;
  return `${Number(m[3])} de ${mes} de ${m[1]}`;
}

/** "+3.2 años" o "-1.5 años" para la diferencia Edad ATP contra cronologica. */
export function formatearDiferenciaAnios(d: number | null): string {
  if (d === null) return SIN_DATO;
  const abs = Math.abs(d).toFixed(1);
  if (d > 0) return `+${abs} años`;
  if (d < 0) return `-${abs} años`;
  return '0 años';
}

/** Marcadores en `att`, en el orden del documento (grupos y composicion). */
export function marcadoresQuePidenAccion(e: EliteV3): EliteMarcador[] {
  return e.marcadores.grupos.flatMap((g) => g.marcadores).concat(e.composicion.filas).filter((m) => m.estado === 'att');
}

// ---------------------------------------------------------------------------
// Lectura de las filas de functional_dx (ruta 3.10: versiones)
// ---------------------------------------------------------------------------

export interface FilaDxElite {
  id: string;
  version: number;
  created_at: string;
  sources_snapshot: unknown;
}

export interface VersionElite {
  id: string;
  /** functional_dx.version (la de la tabla). */
  version_dx: number;
  /** elite_v3.version (el numero de revision de la evaluacion). */
  version_elite: number;
  created_at: string;
  /** null cuando el objeto guardado no pasa el validador. */
  evaluacion: EliteV3 | null;
  errores: string[];
}

/**
 * Convierte las filas de functional_dx que traen `elite_v3` en versiones
 * ordenadas de la mas reciente a la mas antigua (por version de la tabla).
 * La primera es la vigente. Las filas sin `elite_v3` se descartan; las que lo
 * traen pero no validan se conservan con `evaluacion: null` para que la
 * pantalla diga "no se pudo leer" en vez de fingir que no existe.
 */
export function versionesDesdeFilas(filas: FilaDxElite[]): VersionElite[] {
  return filas
    .filter((f) => esEliteV3(f.sources_snapshot))
    .map((f) => {
      const snap = f.sources_snapshot as { elite_v3: unknown };
      const r = validarEliteV3(snap.elite_v3);
      const crudo = snap.elite_v3 as { version?: unknown };
      const versionElite = r.ok ? r.valor.version : (typeof crudo.version === 'number' ? crudo.version : 0);
      return {
        id: f.id,
        version_dx: f.version,
        version_elite: versionElite,
        created_at: f.created_at,
        evaluacion: r.ok ? r.valor : null,
        errores: r.ok ? [] : r.errores,
      };
    })
    .sort((a, b) => b.version_dx - a.version_dx);
}

// ---------------------------------------------------------------------------
// HTML para el PDF cuando el payload no trae el del generador
// ---------------------------------------------------------------------------

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lista(items: string[]): string {
  return items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
}

function parrafos(items: string[]): string {
  return items.map((p) => `<p>${esc(p)}</p>`).join('');
}

function filaMarcador(m: EliteMarcador): string {
  const est = etiquetaEstado(m.estado);
  return `<tr>
  <td>${esc(m.nombre)}${m.estimado ? ' <em>(estimado)</em>' : ''}</td>
  <td>${esc(formatearValor(m.valor, m.unidad))}</td>
  <td>${esc(formatearRango(m.rango_lab))}</td>
  <td>${esc(formatearRango(m.objetivo))}</td>
  <td class="e-${m.estado ?? 'na'}">${est.simbolo} ${esc(est.texto)}</td>
  <td>${m.fuente.map((f) => ETIQUETA_FUENTE[f]).join(', ')}</td>
  <td>${m.evidencia ?? SIN_DATO}</td>
</tr>`;
}

/**
 * Documento sobrio para papel: cabecera, secciones en el orden de la app y
 * tablas de marcadores. Se usa solo si `elite_v3.html` viene vacio.
 */
export function htmlDeEvaluacion(e: EliteV3): string {
  const c = e.cliente;
  const sistemas = ordenarSistemas(e.sistemas);
  const secciones: string[] = [];

  secciones.push(`<section><h2>Inicio</h2>
<p><strong>Edad cronológica:</strong> ${esc(formatearValor(e.inicio.edad_cronologica, 'años'))} · <strong>Edad ATP:</strong> ${esc(formatearValor(e.inicio.edad_atp, 'años'))} (${esc(formatearDiferenciaAnios(e.inicio.diferencia_anios))})</p>
${e.inicio.lead ? `<p>${esc(e.inicio.lead)}</p>` : ''}</section>`);

  secciones.push(`<section><h2>Sistemas</h2><table><thead><tr><th>Sistema</th><th>Puntaje</th><th>Estado</th><th>Por qué</th></tr></thead><tbody>
${sistemas.map((s) => `<tr><td>${esc(s.nombre)}</td><td>${s.score ?? SIN_DATO}</td><td class="e-${s.estado ?? 'na'}">${etiquetaEstado(s.estado).simbolo} ${esc(etiquetaEstado(s.estado).texto)}</td><td>${esc(s.por_que)}</td></tr>`).join('')}
</tbody></table></section>`);

  secciones.push(`<section><h2>Contexto</h2>${parrafos(e.contexto.parrafos)}${e.contexto.cita ? `<blockquote>${esc(e.contexto.cita)}</blockquote>` : ''}${lista(e.contexto.antecedentes)}</section>`);

  const cabecera = '<thead><tr><th>Marcador</th><th>Valor</th><th>Rango del laboratorio</th><th>Objetivo</th><th>Estado</th><th>Fuente</th><th>Evidencia</th></tr></thead>';
  secciones.push(`<section><h2>Marcadores</h2>${e.marcadores.intro ? `<p>${esc(e.marcadores.intro)}</p>` : ''}
${e.marcadores.grupos.map((g) => `<h3>${esc(g.nombre)}</h3><table>${cabecera}<tbody>${g.marcadores.map(filaMarcador).join('')}</tbody></table>`).join('')}
${lista(e.marcadores.notas)}</section>`);

  secciones.push(`<section><h2>Composición</h2><table>${cabecera}<tbody>${e.composicion.filas.map(filaMarcador).join('')}</tbody></table></section>`);

  secciones.push(`<section><h2>Química cerebral</h2>${e.braverman.intro ? `<p>${esc(e.braverman.intro)}</p>` : ''}
${e.braverman.ejes.map((x) => `<h3>${esc(x.titulo)}${x.nivel ? ` · ${ETIQUETA_NIVEL_EJE[x.nivel]}` : ''}</h3><p>${esc(x.texto)}</p>`).join('')}
${parrafos(e.braverman.cierre)}</section>`);

  if (e.genetica.hallazgos.length) {
    secciones.push(`<section><h2>Genética</h2>${e.genetica.intro ? `<p>${esc(e.genetica.intro)}</p>` : ''}
${e.genetica.hallazgos.map((h) => `<h3>${esc(h.tema)}: ${esc(h.titulo)}</h3>${h.gen || h.variante ? `<p><em>${esc([h.gen, h.variante, h.genotipo].filter(Boolean).join(' · '))}</em></p>` : ''}<p>${esc(h.hallazgo)}</p><p>${esc(h.implicacion)}</p>${h.que_hacer ? `<p><strong>Qué hacer:</strong> ${esc(h.que_hacer)}</p>` : ''}${h.evidencia !== null ? `<p class="ev">Evidencia: ${esc(etiquetaEvidencia(h.evidencia))}</p>` : ''}`).join('')}
${e.genetica.resumen.map((b) => `<h3>${esc(b.titulo)}</h3>${parrafos(b.parrafos)}`).join('')}</section>`);
  }

  secciones.push(`<section><h2>Cruces</h2>${e.cruces.hilo ? `<p><strong>${esc(e.cruces.hilo.variable)}</strong> aparece en ${e.cruces.hilo.en} de ${e.cruces.hilo.de} cruces.</p>` : ''}
${e.cruces.lista.map((x) => `<h3>${esc(x.titulo)}</h3><p>${esc(x.hallazgo)}</p><p>${esc(x.consecuencia)}</p><p><strong>La regla:</strong> ${esc(x.accion)}</p>`).join('')}</section>`);

  secciones.push(`<section><h2>Pendientes</h2>${e.medico.intro ? `<p>${esc(e.medico.intro)}</p>` : ''}
${e.medico.pendientes.map((p) => `<p><strong>${esc(p.que)}</strong>: ${esc(p.por_que)} (${esc(p.con_quien)})</p>`).join('')}</section>`);

  secciones.push(`<section><h2>Cierre</h2>${e.cierre.palancas.map((p, i) => `<h3>${i + 1}. ${esc(p.titulo)}</h3><p>${esc(p.por_que)}</p><p>${esc(p.como)}</p>`).join('')}
${e.cierre.vigencia ? `<p>${esc(e.cierre.vigencia)}</p>` : ''}${e.cierre.firma ? `<p>${esc(e.cierre.firma)}</p>` : ''}</section>`);

  secciones.push(`<section><h2>Alimentación</h2><h3>Prioriza</h3>${lista(e.alimentacion.prioriza)}<h3>Evita</h3>${lista(e.alimentacion.evita)}
${e.alimentacion.ventana ? `<p><strong>Ventana:</strong> ${esc(e.alimentacion.ventana.inicio)} a ${esc(e.alimentacion.ventana.fin)}</p>` : ''}
${lista(e.alimentacion.horarios.map((h) => `${h.momento}: ${h.que}`))}${lista(e.alimentacion.notas)}</section>`);

  secciones.push(`<section><h2>Suplementos</h2><table><thead><tr><th>Suplemento</th><th>Dosis</th><th>Momento</th><th>Por qué</th></tr></thead><tbody>
${e.suplementos.map((s) => `<tr><td>${esc(s.nombre)}</td><td>${esc(s.dosis_cantidad !== null && s.dosis_unidad ? `${s.dosis_cantidad} ${s.dosis_unidad}` : SIN_DATO)}${s.unidades_por_toma !== null ? ` x${s.unidades_por_toma}` : ''}</td><td>${esc(s.momento ?? SIN_DATO)}</td><td>${esc(s.por_que)}</td></tr>`).join('')}
</tbody></table></section>`);

  secciones.push(`<section><h2>Entrenamiento</h2>${e.entrenamiento.base ? `<p>${esc(e.entrenamiento.base)}</p>` : ''}
${e.entrenamiento.sesiones.map((s) => `<p><strong>${esc(s.tipo)}</strong>${s.frecuencia_semana ? ` · ${esc(s.frecuencia_semana)}` : ''}${s.duracion ? ` · ${esc(s.duracion)}` : ''}${s.intensidad ? ` · ${esc(s.intensidad)}` : ''}${s.nota ? `. ${esc(s.nota)}` : ''}</p>`).join('')}
${lista(e.entrenamiento.descanso)}${lista(e.entrenamiento.notas)}</section>`);

  const firma = `${esc(e.interpretado_por.evaluacion)}${e.interpretado_por.genetica ? ` · Genética: ${esc(e.interpretado_por.genetica)}` : ''}`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Mi evaluación Elite</title>
<style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:32px;font-size:12px;line-height:1.5}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}h3{font-size:13px;margin:14px 0 4px}
table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f4f4f4}
.meta{color:#555}.e-att{color:#b42318}.e-sub{color:#9a6700}.e-opt{color:#1f7a3a}.ev{color:#555;font-size:11px}blockquote{margin:8px 0;padding-left:10px;border-left:3px solid #ddd;color:#333}
.pie{margin-top:28px;color:#555;font-size:11px}
</style></head><body>
<h1>Mi evaluación Elite</h1>
<p class="meta">${esc(c.nombre_preferido)} · versión ${e.version} · toma ${esc(formatearFecha(c.fecha_toma))} · interpretada por ${firma}</p>
${secciones.join('\n')}
${e.cierre.disclaimer ? `<p class="pie">${esc(e.cierre.disclaimer)}</p>` : ''}
</body></html>`;
}
