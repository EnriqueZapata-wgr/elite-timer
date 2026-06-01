// Coach Engine — Explicador de Auditoría
// Brief §7.2.9 — a pedido del usuario, explica qué pregunta rectora /
// nivel de cascada / principio aplicó el coach en una intervención.
// System prompt: obligación "audita tu propia decisión".
// TODO (sub-session COACH 6/N): implementar explainIntervention() leyendo
// intervention_logs + principle_invocations.

import type { CascadeLevel, Principle } from './types';

export interface AuditExplanation {
  question1?: 'sabe' | 'no_sabe';
  question2?: 'verde' | 'amarillo' | 'rojo';
  cascadeLevel?: CascadeLevel;
  principleInvoked?: Principle;
  rationale: string;
}

export async function explainIntervention(_userId: string, _interventionId: string): Promise<AuditExplanation> {
  // TODO: reconstruir el razonamiento desde intervention_logs.
  throw new Error('TODO: implement explainIntervention');
}
