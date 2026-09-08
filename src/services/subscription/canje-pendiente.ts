/**
 * Canje pendiente: el código que se guarda cuando no hubo sesión para canjearlo.
 *
 * POR QUÉ EXISTE (8 de septiembre de 2026, revisión en frío del pivote Elite).
 * Con la confirmación por correo activada, `signUp` NO deja sesión, y sin
 * sesión `redeem_activation_code` contesta not_authenticated. Ese es el camino
 * de todos los clientes nuevos, no un caso raro. Sin esto, la persona tendría
 * que volver a teclear su código a mano en otra pantalla, y para eso primero
 * tendría que enterarse de que esa pantalla existe.
 *
 * Aquí el código se guarda en el teléfono con llave POR PERSONA (el bug de la
 * llave global ya nos pasó esta misma noche con la cola de consentimientos) y
 * se canjea solo en el primer login. Al aplicarse, se borra.
 *
 * Qué NO se guarda: nada más que el código. Ni contraseña, ni nombre, ni el
 * correo suelto (el correo es parte de la llave, no del contenido).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { warn as logWarn } from '@/src/lib/logger';
import {
  decidirTrasCanjePendiente,
  llaveCanjePendiente,
  nivelQuedoAplicado,
} from './codigo-registro-core';
import { redeemActivationCode } from './subscription-service';

/** Guarda el código para canjearlo en cuanto haya sesión. Nunca revienta. */
export async function guardarCanjePendiente(correo: string, codigo: string): Promise<void> {
  const llave = llaveCanjePendiente(correo);
  if (!llave || !codigo.trim()) return;
  try {
    await AsyncStorage.setItem(llave, codigo.trim());
  } catch (e) {
    // Que no se pueda guardar no puede tumbar un alta ya hecha. Se pierde el
    // automatismo, no la cuenta: queda la pantalla "Tengo un código".
    logWarn('[canje-pendiente] no se pudo guardar el código:', e);
  }
}

/** Borra el código guardado de esa persona. */
export async function olvidarCanjePendiente(correo: string): Promise<void> {
  const llave = llaveCanjePendiente(correo);
  if (!llave) return;
  try {
    await AsyncStorage.removeItem(llave);
  } catch (e) {
    logWarn('[canje-pendiente] no se pudo borrar el código guardado:', e);
  }
}

export type ResultadoCanjePendiente =
  /** No había nada guardado para esta persona. */
  | 'sin_pendiente'
  /** El nivel quedó aplicado y el código ya se borró del teléfono. */
  | 'aplicado'
  /** No se pudo (sin red, sin sesión todavía): se conserva para el próximo intento. */
  | 'sigue_pendiente'
  /** El servidor dijo que ese código ya no sirve: se borra para no insistir. */
  | 'descartado';

/**
 * Canjea el código guardado de esta persona, si hay. Se llama justo después
 * de un login exitoso, cuando ya existe sesión.
 *
 * Es idempotente: si el código ya se había canjeado en esta misma cuenta, el
 * servidor contesta already_redeemed, que cuenta como aplicado, y se borra.
 * Nunca lanza: un fallo aquí no puede impedirle a nadie entrar a su cuenta.
 */
export async function canjearPendiente(correo: string): Promise<ResultadoCanjePendiente> {
  const llave = llaveCanjePendiente(correo);
  if (!llave) return 'sin_pendiente';
  let codigo: string | null = null;
  try {
    codigo = await AsyncStorage.getItem(llave);
  } catch (e) {
    logWarn('[canje-pendiente] no se pudo leer el código guardado:', e);
    return 'sigue_pendiente';
  }
  if (!codigo) return 'sin_pendiente';

  const canje = await redeemActivationCode(codigo);
  if (decidirTrasCanjePendiente(canje.status) === 'conservar') return 'sigue_pendiente';

  await olvidarCanjePendiente(correo);
  if (nivelQuedoAplicado(canje.status)) return 'aplicado';
  // not_found / expired / exhausted: el código ya no sirve y reintentarlo en
  // cada entrada solo haría ruido. Queda en el log para poder explicarlo.
  logWarn('[canje-pendiente] el código guardado ya no sirve:', canje.status);
  return 'descartado';
}
