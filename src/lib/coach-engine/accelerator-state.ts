// Coach Engine — Estado del Acelerador
// Brief §5.1 — estándar declarado + sistema construido (habit stacking, colocation).
// System prompt Bloque 5 (Modelo Acelerador/Freno).
// TODO (sub-session COACH 5/N): implementar manejo de aceleradores_state
// (standard_declared + system_components).

export interface AcceleratorState {
  standardDeclared?: string;
  systemComponents: { type: string; description: string }[];
}

export async function getAcceleratorState(_userId: string): Promise<AcceleratorState> {
  // TODO: leer aceleradores_state del usuario.
  throw new Error('TODO: implement getAcceleratorState');
}

export async function updateAcceleratorState(_userId: string, _state: AcceleratorState): Promise<void> {
  // TODO: upsert estándar declarado + sistema construido.
  throw new Error('TODO: implement updateAcceleratorState');
}
