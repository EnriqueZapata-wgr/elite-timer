// Coach Engine — Estado del Acelerador
// Brief §5.1 — estándar declarado + sistema construido (habit stacking, colocation).
// System prompt Bloque 5: el Acelerador empuja (estándar) + organiza la vida
// para que la acción deseada sea inevitable (sistema).

import { supabase } from '@/src/lib/supabase';

export interface SystemComponent {
  type: 'habit_stacking' | 'colocation' | 'other';
  description: string;
}

export interface AcceleratorState {
  standardDeclared?: string;
  systemComponents: SystemComponent[];
}

/**
 * Lee el estado del acelerador del usuario (aceleradores_state).
 * Bloque 5. Retorna null si el usuario aún no tiene estado declarado.
 */
export async function getAcceleratorState(userId: string): Promise<AcceleratorState | null> {
  const { data, error } = await supabase
    .from('aceleradores_state')
    .select('standard_declared, system_components')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`accelerator-state: getAcceleratorState failed — ${error.message}`);
  }
  if (!data) return null;

  return {
    standardDeclared: data.standard_declared ?? undefined,
    systemComponents: Array.isArray(data.system_components) ? data.system_components : [],
  };
}

/**
 * UPSERT del estado del acelerador (merge defensivo). Bloque 5.
 * Solo sobreescribe los campos presentes en `patch`; conserva el resto del
 * estado existente. UNIQUE(user_id) garantiza una fila por usuario.
 */
export async function updateAcceleratorState(
  userId: string,
  patch: Partial<AcceleratorState>,
): Promise<void> {
  const existing = await getAcceleratorState(userId);
  const merged: AcceleratorState = {
    standardDeclared: patch.standardDeclared ?? existing?.standardDeclared,
    systemComponents: patch.systemComponents ?? existing?.systemComponents ?? [],
  };

  const { error } = await supabase.from('aceleradores_state').upsert(
    {
      user_id: userId,
      standard_declared: merged.standardDeclared ?? null,
      system_components: merged.systemComponents,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    throw new Error(`accelerator-state: updateAcceleratorState failed — ${error.message}`);
  }
}

/**
 * Agrega un componente al sistema construido (habit stacking, colocation, etc.).
 * Bloque 5: lee el estado, hace append al array y persiste. Mecanismos canónicos
 * que vuelven la acción deseada más fácil que su alternativa.
 */
export async function appendSystemComponent(
  userId: string,
  component: SystemComponent,
): Promise<void> {
  const existing = await getAcceleratorState(userId);
  const systemComponents = [...(existing?.systemComponents ?? []), component];
  await updateAcceleratorState(userId, { systemComponents });
}

// INTEGRATION TEST: getAcceleratorState(userId) → null cuando no hay fila
// INTEGRATION TEST: updateAcceleratorState(userId, { standardDeclared: 'X' }) hace UPSERT y conserva systemComponents
// INTEGRATION TEST: appendSystemComponent(userId, { type: 'habit_stacking', description: '...' }) hace append sin perder previos
