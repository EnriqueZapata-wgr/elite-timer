/**
 * Registro de definiciones de dominio (OLA1 R-0).
 *
 * report-domain-core dice QUÉ dominios existen y cómo se ven; aquí se dice
 * CÓMO se leen y qué pintan. Un dominio registrado en el core pero sin
 * definición aquí es un dominio anunciado y no construido: la ruta lo dice en
 * voz alta en vez de fingir una pantalla vacía.
 */
import type { ReportDomainKey } from '@/src/services/reports/report-domain-core';
import type { ReportDomainDefinition } from '../ReportDomainShell';

/**
 * Cada definición fija su propio tipo de datos puertas adentro; el mapa las
 * guarda juntas, que es lo único que no se puede tipar sin existenciales.
 */
export type AnyReportDomainDefinition = ReportDomainDefinition<any>;

export const DOMAIN_DEFINITIONS: Partial<Record<ReportDomainKey, AnyReportDomainDefinition>> = {};

export function getDomainDefinition(key: string | null | undefined): AnyReportDomainDefinition | null {
  if (!key) return null;
  return DOMAIN_DEFINITIONS[key as ReportDomainKey] ?? null;
}
