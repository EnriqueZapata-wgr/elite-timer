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
import { nutricionDomain } from './nutricion';
import { hidratacionDomain } from './hidratacion';
import { ayunoDomain } from './ayuno';
import { menteDomain } from './mente';
import { economiaDomain } from './economia';
import { journalDomain } from './journal';
import { emocionesDomain } from './emociones';
import { cicloDomain } from './ciclo';
import { nbackDomain } from './nback';
import { adherenciaDomain } from './adherencia';
import { entrenamientoDomain } from './entrenamiento';
import { glucosaDomain } from './glucosa';
import { labsDomain } from './labs';
import { expedienteDomain } from './expediente';

/**
 * Cada definición fija su propio tipo de datos puertas adentro; el mapa las
 * guarda juntas, que es lo único que no se puede tipar sin existenciales.
 */
export type AnyReportDomainDefinition = ReportDomainDefinition<any>;

export const DOMAIN_DEFINITIONS: Partial<Record<ReportDomainKey, AnyReportDomainDefinition>> = {
  nutricion: nutricionDomain,
  hidratacion: hidratacionDomain,
  ayuno: ayunoDomain,
  mente: menteDomain,
  economia: economiaDomain,
  journal: journalDomain,
  emociones: emocionesDomain,
  ciclo: cicloDomain,
  nback: nbackDomain,
  adherencia: adherenciaDomain,
  entrenamiento: entrenamientoDomain,
  glucosa: glucosaDomain,
  labs: labsDomain,
  expediente: expedienteDomain,
};

export function getDomainDefinition(key: string | null | undefined): AnyReportDomainDefinition | null {
  if (!key) return null;
  return DOMAIN_DEFINITIONS[key as ReportDomainKey] ?? null;
}
