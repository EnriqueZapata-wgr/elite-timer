/**
 * withPreflight — envuelve una acción IA: si el usuario no tiene H+ suficientes, ofrece ir a
 * la tienda en vez de llamar al LLM. El proxy igual responde 402 (guard real server-side);
 * esto es la UX que lo pre-empta con un Alert amable.
 *
 * Flag OFF (default) → proceed() directo, SIN auth/preflight/Alert → byte-idéntico al actual.
 */
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { preflightAction } from './preflight';
import { LAB_ECONOMY_ENABLED } from './economy-config';
import { haptic } from '@/src/utils/haptics';

export type PreflightOutcome<T> = T | { aborted: true; reason: 'insufficient_protons' };

export function wasAborted<T>(r: PreflightOutcome<T>): r is { aborted: true; reason: 'insufficient_protons' } {
  return !!r && typeof r === 'object' && (r as any).aborted === true;
}

export async function withPreflight<T>(
  actionKey: string,
  proceed: () => Promise<T>,
): Promise<PreflightOutcome<T>> {
  if (!LAB_ECONOMY_ENABLED) return proceed(); // byte-idéntico: ni auth ni preflight

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return proceed(); // sin sesión no gateamos en cliente; el server decide

  const check = await preflightAction(user.id, actionKey);
  if (check.ok) return proceed();

  haptic.warning();
  return new Promise<PreflightOutcome<T>>((resolve) => {
    Alert.alert(
      'H+ insuficientes',
      `Esta acción cuesta ${check.required.toLocaleString()} H+. Tienes ${check.current.toLocaleString()} H+.`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve({ aborted: true, reason: 'insufficient_protons' }) },
        { text: 'Ir a la Tienda', onPress: () => { router.push('/economy/shop'); resolve({ aborted: true, reason: 'insufficient_protons' }); } },
      ],
    );
  });
}
