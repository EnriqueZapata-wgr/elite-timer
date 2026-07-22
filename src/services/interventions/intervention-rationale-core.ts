/**
 * intervention-rationale-core — lógica PURA del "¿Por qué estas intervenciones?"
 * (Megabuzón 2da pasada B.4). Sin react-native/supabase → testeable con vitest.
 *
 * Doctrina (intervention-engine-core): el match DX↔intervenciones es 100%
 * determinístico y ya está decidido cuando se llama a ARGOS — aquí SOLO se
 * construye la narrativa "por qué" encima del resultado. ARGOS nunca decide
 * el match ni sugiere agregar/quitar intervenciones.
 *
 * Cobro: server-side en argos-proxy por requestType 'intervention_rationale'
 * (seed 280 H+ en migración 175; Pro efectivo = gratis, ver proxy). El cache
 * por set_hash (migración 196) hace que releer sea siempre gratis.
 */
import type { DxRoot } from '@/src/services/dx/dx-engine-core';
import type { ResolvedInterventionDef } from './intervention-engine-core';
// Triple-audit P1.4: el prompt mandaba claves snake_case crudas (root_key,
// roots, y PCR_hs/presion_* embebidos en benefit/how del catálogo) y ARGOS
// las eco-eaba en la narrativa. Se legibiliza TODO antes del stringify.
import { displayLabel, legibilizeKeysInText } from '@/src/constants/display-labels';
import { ROOT_LABELS } from '@/src/constants/intervention-vocab';
import type { InterventionRoot } from '@/src/constants/intervention-vocab';

/** action_key registrado en proton_action_costs (migración 175, 280 H+). */
export const INTERVENTION_RATIONALE_ACTION_KEY = 'intervention_rationale';

/** FNV-1a 32-bit → hex (mismo patrón que edad-atp/dataset-hash: puro, sin crypto). */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Hash estable del contexto del rationale: DX vigente (su id — cada versión
 * nueva del DX tiene id nuevo) + set de intervenciones activas (ordenado →
 * insensible al orden de carga). Mismo DX + mismo set → mismo hash → cache hit
 * gratis. Cambia el set o se regenera el DX → hash nuevo → regenerar.
 */
export function computeRationaleSetHash(dxId: string, interventionKeys: string[]): string {
  const keys = [...interventionKeys].sort().join(',');
  return fnv1a(`${dxId}|${keys}`);
}

export interface RationalePromptInput {
  dx: {
    version: number;
    qualityLevel: number;
    summary: string | null;
    roots: Pick<DxRoot, 'root_key' | 'severity' | 'confidence'>[];
  };
  interventions: Pick<ResolvedInterventionDef, 'name' | 'how' | 'benefit' | 'categories' | 'roots'>[];
}

export interface RationalePrompt {
  system: string;
  user: string;
}

/**
 * Prompt de la narrativa. Output esperado: markdown 200-400 palabras, español,
 * tono ARGOS. El system blinda la doctrina (no fármacos, no diagnóstico médico,
 * falta de data ≠ ausencia, no tocar el match).
 */
export function buildRationalePrompt(input: RationalePromptInput): RationalePrompt {
  const system = `Eres ARGOS, el guía de rendimiento humano de ATP (medicina funcional: causas raíz sobre síntomas).

Recibirás el Mapa Funcional vigente del usuario (raíces detectadas con severidad 1-5 y confianza 0-1) y las intervenciones que él YA tiene activas en su protocolo. El match raíces↔intervenciones lo decidió un motor determinístico y el propio usuario — está cerrado.

TU ÚNICA TAREA: explicar por qué ese conjunto de intervenciones tiene sentido para esas raíces.

Reglas no negociables:
- NO sugieras agregar, quitar ni sustituir intervenciones. No inventes intervenciones nuevas.
- NUNCA recomiendes fármacos, medicamentos ni bloqueadores químicos.
- Esto NO es un diagnóstico médico ni sustituye a un profesional de salud — no uses lenguaje de certeza clínica.
- Falta de data ≠ ausencia: con confianza baja (<0.5) matiza ("hay indicios de…", "posible…"); nunca afirmes certezas.
- Conecta cada grupo de intervenciones con la(s) raíz(ces) que ataca, en términos simples y accionables.

Formato de salida (markdown, español, 200-400 palabras):
1. Un párrafo inicial con el panorama general (qué detectó tu mapa funcional y la lógica del protocolo).
2. Grupos por raíz o tema con encabezados "##" cortos o bullets, conectando intervenciones → raíz → beneficio esperado.
3. Una línea final de refuerzo (tú tienes el control, consistencia gana).

Tono: cercano, segunda persona, energizante, cero tecnicismos innecesarios. NUNCA escribas claves técnicas con guiones bajos (p.ej. "PCR_hs", "presion_arterial_sistolica") — usa siempre el nombre legible en español. Solo devuelve el markdown, sin preámbulos.`;

  const user = JSON.stringify(
    {
      diagnostico_funcional: {
        version: input.dx.version,
        nivel_calidad: input.dx.qualityLevel,
        resumen: input.dx.summary,
        raices: input.dx.roots.map((r) => ({
          raiz: ROOT_LABELS[r.root_key as InterventionRoot] ?? displayLabel(r.root_key),
          severidad: r.severity,
          confianza: r.confidence,
        })),
      },
      intervenciones_activas: input.interventions.map((i) => ({
        nombre: i.name,
        como: legibilizeKeysInText(i.how),
        beneficio: legibilizeKeysInText(i.benefit),
        categorias: i.categories,
        raices_que_ataca: (i.roots ?? []).map((rk) => ROOT_LABELS[rk as InterventionRoot] ?? displayLabel(rk)),
      })),
    },
    null,
    1,
  );

  return { system, user };
}
