/**
 * Mi Diagnóstico Funcional — template HTML del PDF (hotfix 2da pasada).
 *
 * Puro (sin react-native): genera el HTML que expo-print convierte a PDF
 * on-device. Mismo lenguaje editorial que labs-guide-html.ts: fondo blanco
 * para papel/WhatsApp, tipografía sobria, acento lima solo en kickers y
 * datos clave. Testeable node-only.
 *
 * Doctrina Enrique: el diagnóstico es un ENTREGABLE con identidad ATP
 * (portada, secciones, versionado), no un widget en pantalla.
 */
import { escapeHtml } from '../labs-guide-html';

const LIME = '#7fa81f'; // lima oscurecido para legibilidad sobre blanco
const INK = '#111111';
const MUTED = '#555555';

/** Labels de usuario por fuente del snapshot (compartidos con la Card A). */
export const DX_SOURCE_LABELS: Record<string, string> = {
  levantamientos: 'Levantamientos',
  sintomas: 'Síntomas clínicos',
  sintomas_aislados: 'Síntomas aislados',
  padecimientos: 'Padecimientos',
  labs: 'Laboratorios',
  braverman: 'Test Braverman',
  quizzes: 'Quizzes funcionales',
  suplementos: 'Suplementos',
};

export const DX_PDF_DISCLAIMER =
  'Este documento es una síntesis educativa generada por ARGOS (IA de ATP) a partir de los datos que tú registraste. ' +
  'No es un diagnóstico médico ni sustituye la consulta con un profesional de la salud. ' +
  'Compártelo con tu médico o profesional de confianza como punto de partida para una conversación informada.';

export interface DxPdfRoot {
  label: string;
  /** 1-5. */
  severity: number;
  /** 0-1. */
  confidence: number;
  sources: string[];
}

export interface DxPdfInput {
  firstName?: string;
  version: number;
  /** ISO timestamp de la versión. */
  createdAt: string;
  level: number;
  levelLabel: string;
  summaryText: string | null;
  roots: DxPdfRoot[];
  /** Fuentes presentes en el snapshot, en lenguaje de usuario. */
  activeSources: string[];
  nextHint: string | null;
  /** Labels de fuentes faltantes. */
  missing: string[];
}

function levelBlocks(level: number): string {
  return [1, 2, 3, 4, 5]
    .map((n) => `<span class="lvl-block${n <= level ? ' on' : ''}"></span>`)
    .join('');
}

function severityPips(severity: number): string {
  return [1, 2, 3, 4, 5]
    .map((n) => `<span class="pip${n <= severity ? ' on' : ''}"></span>`)
    .join('');
}

function rootsSection(roots: DxPdfRoot[]): string {
  if (roots.length === 0) {
    return '<p class="empty">ARGOS aún no detecta raíces funcionales con la data disponible. Agrega más fuentes y actualiza tu diagnóstico.</p>';
  }
  return roots
    .map(
      (r) => `
    <div class="root">
      <div class="root-head">
        <span class="root-name">${escapeHtml(r.label)}</span>
        <span class="root-sev">${severityPips(r.severity)}</span>
      </div>
      <p class="root-meta">Confianza ${Math.round((r.confidence ?? 0) * 100)}%</p>
      ${r.sources.length ? `<p class="root-sources">Sustentado en: ${r.sources.map(escapeHtml).join(' · ')}</p>` : ''}
    </div>`,
    )
    .join('');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** HTML completo del entregable. Degrada con gracia si falta cualquier pieza. */
export function buildDxHtml(input: DxPdfInput): string {
  const name = (input.firstName ?? '').trim();
  const greeting = name ? `Preparado para ${escapeHtml(name)}.` : 'Tu síntesis funcional.';
  const dateStr = formatDate(input.createdAt);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: ${INK}; padding: 36px 42px; font-size: 12px; line-height: 1.55; }
  .kicker { font-size: 10px; letter-spacing: 3px; color: ${LIME}; font-weight: 700; text-transform: uppercase; }
  h1 { font-size: 26px; font-weight: 800; margin: 6px 0 2px; letter-spacing: -0.5px; }
  .subtitle { color: ${MUTED}; font-size: 13px; margin-bottom: 4px; }
  .version { color: #999; font-size: 10px; }
  .greeting { margin: 18px 0 6px; font-size: 14px; font-weight: 700; }
  h2 { font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin: 22px 0 8px; border-bottom: 2px solid ${INK}; padding-bottom: 4px; }
  p { margin-bottom: 6px; }
  .level-card { border: 1px solid #ddd; border-radius: 8px; padding: 14px 16px; margin-top: 10px; display: flex; align-items: center; gap: 14px; page-break-inside: avoid; }
  .level-num { font-size: 34px; font-weight: 800; color: ${LIME}; }
  .level-label { font-weight: 800; font-size: 13px; }
  .level-caption { color: ${MUTED}; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; }
  .lvl-blocks { margin-left: auto; }
  .lvl-block { display: inline-block; width: 18px; height: 8px; border-radius: 2px; background: #e5e5e5; margin-left: 3px; }
  .lvl-block.on { background: ${LIME}; }
  .root { border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; page-break-inside: avoid; }
  .root-head { display: flex; justify-content: space-between; align-items: baseline; }
  .root-name { font-size: 13px; font-weight: 800; }
  .pip { display: inline-block; width: 7px; height: 14px; border-radius: 2px; background: #e5e5e5; margin-left: 2px; }
  .pip.on { background: ${LIME}; }
  .root-meta { color: ${MUTED}; font-size: 10.5px; margin: 2px 0 0; }
  .root-sources { color: ${MUTED}; font-size: 10.5px; margin-top: 3px; }
  .chips span { display: inline-block; background: #f4f4f4; border-radius: 10px; padding: 3px 10px; margin: 0 4px 4px 0; font-size: 10.5px; font-weight: 600; }
  .hint { background: #f4f4f4; border-left: 3px solid ${LIME}; padding: 8px 12px; margin: 8px 0; font-weight: 600; }
  .empty { color: ${MUTED}; }
  .disclaimer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #ddd; color: #888; font-size: 9.5px; }
  .footer { margin-top: 14px; color: #aaa; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="kicker">ATP · Sistema operativo de rendimiento humano</div>
  <h1>Mi Diagnóstico Funcional</h1>
  <div class="subtitle">Síntesis de raíces funcionales por ARGOS</div>
  <div class="version">Versión ${input.version}${dateStr ? ` · ${dateStr}` : ''}</div>

  <p class="greeting">${greeting}</p>

  <div class="level-card">
    <span class="level-num">${input.level}</span>
    <span>
      <div class="level-caption">Nivel de diagnóstico</div>
      <div class="level-label">${escapeHtml(input.levelLabel)}</div>
    </span>
    <span class="lvl-blocks">${levelBlocks(input.level)}</span>
  </div>

  <h2>Síntesis</h2>
  ${input.summaryText ? `<p>${escapeHtml(input.summaryText)}</p>` : '<p class="empty">Sin síntesis disponible en esta versión.</p>'}

  <h2>Raíces detectadas</h2>
  ${rootsSection(input.roots)}

  ${input.activeSources.length ? `
  <h2>Fuentes que alimentan este análisis</h2>
  <div class="chips">${input.activeSources.map((s) => `<span>${escapeHtml(s)}</span>`).join('')}</div>` : ''}

  ${input.nextHint ? `
  <h2>Cómo subir de nivel</h2>
  <div class="hint">${escapeHtml(input.nextHint)}</div>
  ${input.missing.length ? `<div class="chips">${input.missing.map((m) => `<span>${escapeHtml(m)}</span>`).join('')}</div>` : ''}` : ''}

  <p class="disclaimer">${DX_PDF_DISCLAIMER}</p>
  <div class="footer">Generado desde la app ATP · Documento vivo — se actualiza con tu data</div>
</body>
</html>`;
}
