// Coach Engine — Mapa de Principios Canónicos
// Brief §2 — 3 biológicos × 4 mentales × contexto
// System prompt Bloque 2.
// TODO (sub-session COACH 4/N): implementar invokePrinciple() que registre
// principle_invocations + helper para mostrar al coach qué principios aplican
// según el contexto del cliente.

import type { Principle } from './types';

export const PRINCIPLES_CATALOG: ReadonlyArray<{ key: Principle; ambit: 'biologico' | 'mental' | 'modulador'; description: string }> = [
  // TODO: poblar con descripciones cortas alineadas al Bloque 2 del prompt.
];

export async function invokePrinciple(_userId: string, _conversationId: string | null, _principle: Principle, _contextText: string): Promise<void> {
  // TODO: persistir a principle_invocations.
  throw new Error('TODO: implement invokePrinciple');
}
