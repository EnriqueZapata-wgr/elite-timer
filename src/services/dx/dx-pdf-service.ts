/**
 * Mi Diagnóstico Funcional — generación PDF + share (hotfix 2da pasada).
 *
 * Mismo patrón que labs-guide-service: buildDxHtml (puro) → expo-print →
 * rename amable → expo-sharing.
 *
 * ⚠️ expo-print es módulo NATIVO nuevo: en binarios viejos vía OTA no existe
 * y requireNativeModule revienta AL IMPORTAR (crash Sentry 'ExpoPrint') →
 * los imports nativos van lazy (require dentro del try/catch), nunca a
 * nivel de módulo.
 */
import type { FunctionalDxRow } from './dx-service';
import { computeDxQuality, DX_LEVEL_LABELS, type DxQualityLevel } from './dx-quality-core';
import { presenceFromSnapshot } from './dx-engine-core';
import { buildDxHtml, DX_SOURCE_LABELS, type DxPdfInput } from './dx-html';
import { ROOT_LABELS, type InterventionRoot } from '@/src/constants/intervention-vocab';
import { warn as logWarn } from '@/src/lib/logger';

export type DxShareResult = 'shared' | 'unavailable' | 'error';

/** Fuentes presentes en el snapshot, en lenguaje de usuario (mismo criterio que la Card A). */
export function activeSourcesFromSnapshot(snapshot: Record<string, unknown> | null | undefined): string[] {
  return Object.entries(snapshot ?? {})
    .filter(([, v]) => {
      const count = (v as any)?.count;
      const present = (v as any)?.present;
      const completed = (v as any)?.completed;
      return present === true || (typeof count === 'number' && count > 0) || (Array.isArray(completed) && completed.length > 0);
    })
    .map(([k]) => DX_SOURCE_LABELS[k] ?? k);
}

/** Arma el input del PDF desde la fila vigente (puro, testeable). */
export function buildDxPdfInput(dx: FunctionalDxRow, firstName = ''): DxPdfInput {
  const quality = computeDxQuality(presenceFromSnapshot(dx.sources_snapshot));
  const roots = (dx.roots_detected ?? []).map((r) => ({
    label: ROOT_LABELS[r.root_key as InterventionRoot] ?? r.root_key,
    severity: r.severity,
    confidence: r.confidence,
    sources: r.sources ?? [],
  }));
  return {
    firstName,
    version: dx.version,
    createdAt: dx.created_at,
    level: dx.quality_level,
    levelLabel: DX_LEVEL_LABELS[dx.quality_level as DxQualityLevel] ?? '—',
    summaryText: dx.summary_text,
    roots,
    activeSources: activeSourcesFromSnapshot(dx.sources_snapshot),
    nextHint: quality.nextHint,
    missing: quality.missing.map((m) => m.label),
  };
}

/**
 * Genera el PDF del diagnóstico vigente y abre el share sheet.
 * Fail-soft total: si el módulo nativo falta (binario viejo) devuelve 'error'
 * y la pantalla pide actualizar la app — nunca crashea.
 */
export async function generateAndShareDxPdf(dx: FunctionalDxRow, firstName = ''): Promise<DxShareResult> {
  try {
    const Print = require('expo-print') as typeof import('expo-print');
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');

    const html = buildDxHtml(buildDxPdfInput(dx, firstName));
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // Renombrar al nombre amable que verá el doctor en WhatsApp.
    let shareUri = uri;
    try {
      const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
      const pretty = new File(Paths.cache, `Mapa-Funcional-ATP-v${dx.version}.pdf`);
      if (pretty.exists) pretty.delete();
      new File(uri).move(pretty);
      shareUri = pretty.uri;
    } catch { /* el rename es cosmético — compartir el original si falla */ }

    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir Mi Mapa Funcional',
      UTI: 'com.adobe.pdf',
    });
    return 'shared';
  } catch (e) {
    logWarn('[dx-pdf] generateAndShareDxPdf failed', e);
    return 'error';
  }
}
