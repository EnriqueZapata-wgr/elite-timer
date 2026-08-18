/**
 * Acceso consentido — I/O del visto bueno (AsyncStorage + memoria).
 *
 * La política vive en `acceso-consentido-core.ts` (puro). Aquí solo el
 * almacén, en dos capas:
 *
 *   · MEMORIA (síncrona) — es lo que hace posible el guard del layout de
 *     pestañas sin un parpadeo. Cuando el gate de `app/index.tsx` confirma
 *     contra el servidor, marca aquí ANTES de redirigir; para cuando
 *     `app/(tabs)/_layout.tsx` monta, la respuesta ya está y no hay ni una
 *     lectura de disco.
 *   · DISCO (AsyncStorage) — sobrevive al cierre de la app. Es lo que rescata
 *     a quien ya consintió cuando el arranque en frío no tiene red.
 *
 * SOLO SE GUARDA EL SÍ. Nunca se escribe desde un fallo, nunca se infiere. El
 * único origen de una escritura es haber leído `onboarding_step === 'completed'`
 * del servidor.
 *
 * NO SE BORRA AL CERRAR SESIÓN, a propósito. La llave es por userId, así que un
 * teléfono compartido no filtra nada, y nadie llega a las pestañas sin una
 * sesión válida de Supabase: borrarlo no cerraría ningún hueco y sí agregaría
 * un escenario donde alguien que ya consintió se queda afuera.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { llaveVistoBueno } from './acceso-consentido-core';

/** Usuarios con visto bueno confirmado en esta corrida del proceso. */
const enMemoria = new Set<string>();

/** ¿Hay visto bueno en memoria? Síncrono a propósito (ver encabezado). */
export function hayVistoBuenoEnMemoria(userId: string): boolean {
  return enMemoria.has(userId);
}

/**
 * Marca el visto bueno. Memoria primero y de forma SÍNCRONA: el llamador
 * redirige a las pestañas en el mismo frame y el guard tiene que ver el sí ya
 * puesto. El disco se escribe en segundo plano y su fallo no bloquea nada
 * (perder la escritura solo cuesta una lectura de red la próxima vez).
 */
export function marcarVistoBueno(userId: string): void {
  enMemoria.add(userId);
  AsyncStorage.setItem(llaveVistoBueno(userId), '1').catch(() => {
    /* defensivo: el visto bueno de memoria ya sirve para esta sesión */
  });
}

/**
 * ¿Hay visto bueno guardado en este teléfono? Consulta memoria y, si no,
 * disco. Un fallo de AsyncStorage se lee como "no hay": ante la duda, el gate
 * pregunta al servidor o muestra la pantalla honesta. Nunca abre por error.
 */
export async function leerVistoBueno(userId: string): Promise<boolean> {
  if (enMemoria.has(userId)) return true;
  try {
    const v = await AsyncStorage.getItem(llaveVistoBueno(userId));
    if (v === '1') {
      enMemoria.add(userId);
      return true;
    }
  } catch {
    /* defensivo */
  }
  return false;
}
