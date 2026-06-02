// Coach Engine — Mapa de Principios Canónicos
// Brief §2 — 3 biológicos × 4 mentales × contexto modulador.
// System prompt Bloque 2: antes de recomendar, identifica qué principios
// aplican (1-3 relevantes, no checklist mecánico).

import { supabase } from '@/src/lib/supabase';
import type { Principle } from './types';

export interface PrincipleEntry {
  key: Principle;
  ambit: 'biologico' | 'mental' | 'modulador';
  description: string;
}

/**
 * Catálogo de los 8 principios canónicos + contexto modulador (Bloque 2).
 * Ámbito biológico (3), ámbito mental (4), contexto (1, modulador discreto).
 */
export const PRINCIPLES_CATALOG: ReadonlyArray<PrincipleEntry> = [
  {
    key: 'fisiologia',
    ambit: 'biologico',
    description:
      'Cómo funcionan los sistemas del cuerpo a nivel orgánico y sistémico (ejes hormonales, ritmo circadiano, regulación glucémica, sistema inmune).',
  },
  {
    key: 'biomecanica',
    ambit: 'biologico',
    description:
      'Cómo se mueve el cuerpo — vectores de fuerza, palancas, postura, integridad articular.',
  },
  {
    key: 'mecanismos_biologicos',
    ambit: 'biologico',
    description:
      'Lo que sucede a nivel tejido, célula y molécula (mitocondria, cadena de transporte de electrones, autofagia, vías metabólicas, señalización celular).',
  },
  {
    key: 'identidad',
    ambit: 'mental',
    description:
      'Quién cree el cliente que es. Lo que se permite y no se permite por congruencia interna. El motor donde cierra el modelo Acelerador/Freno.',
  },
  {
    key: 'proposito',
    ambit: 'mental',
    description:
      'Para qué hace lo que hace. La motivación raíz que sobrevive a la fricción.',
  },
  {
    key: 'filosofia',
    ambit: 'mental',
    description:
      'La cosmovisión del cliente, incluyendo léxico, lenguaje, dichos y mantras. Perspectiva PNL: el lenguaje construye la realidad; cómo nombra sus síntomas y metas revela cómo manifiesta su mundo.',
  },
  {
    key: 'estandar',
    ambit: 'mental',
    description:
      'Lo que el cliente espera de sí mismo. El piso de exigencia. Acelerador principal del modelo Acelerador/Freno.',
  },
  {
    key: 'contexto',
    ambit: 'modulador',
    description:
      'Modulador discreto (no principio constante): mudanza, embarazo, viaje, crisis, duelo, enfermedad de un cercano, restricciones temporales o financieras. A veces no afecta nada, a veces lo afecta todo.',
  },
];

/**
 * Devuelve la descripción canónica de un principio del catálogo.
 * Bloque 2: helper para que el coach sustente qué principio aplica.
 */
export function describePrinciple(principle: Principle): string {
  const entry = PRINCIPLES_CATALOG.find((p) => p.key === principle);
  if (!entry) {
    throw new Error(`principles-map: describePrinciple failed — unknown principle '${principle}'`);
  }
  return entry.description;
}

/**
 * Persiste qué principio invocó el coach en una intervención (auditabilidad).
 * Bloque 2 + obligación "audita tu propia decisión".
 * NOTA: la tabla principle_invocations usa (conversation_id, context_text);
 * el `rationale` del spec se persiste como context_text (ver flag COWORK_REPORT).
 */
export async function invokePrinciple(params: {
  userId: string;
  conversationId?: string | null;
  principle: Principle;
  rationale: string;
}): Promise<void> {
  const { error } = await supabase.from('principle_invocations').insert({
    user_id: params.userId,
    conversation_id: params.conversationId ?? null,
    principle: params.principle,
    context_text: params.rationale,
  });
  if (error) {
    throw new Error(`principles-map: invokePrinciple failed — ${error.message}`);
  }
}

// TEST: PRINCIPLES_CATALOG.length >= 9 (8 principios + contexto) → es 8 (3 bio + 4 mental + 1 modulador)
//   NOTA: el spec pide >= 9; el catálogo canónico del Bloque 2 son 8 entradas
//   (3 biológicos + 4 mentales + 1 contexto). Ver flag COWORK_REPORT.
// TEST: describePrinciple('identidad') incluye 'quién cree' y 'permite'
// TEST: describePrinciple('estandar') incluye 'espera de sí mismo'
// INTEGRATION TEST: invokePrinciple({ userId, principle: 'fisiologia', rationale: '...' }) inserta en principle_invocations
