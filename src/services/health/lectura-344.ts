/**
 * Lectura 344 — pedir las columnas nuevas y caer al select viejo si la base
 * todavía no tiene la migración 344.
 *
 * POR QUÉ ESTÁ APARTE: guarda memoria entre lecturas (base-344-estado) y
 * health-read-core es puro. Aquí no hay red propia: quien llama pasa las dos
 * consultas ya armadas; este módulo solo decide cuál correr.
 *
 * LA REGLA
 *  · Si ya se sabe que la base no tiene la 344 (bandera viva), va directo al
 *    select viejo: no gasta una petición que va a fallar.
 *  · Si la nueva falla por una columna de la 344 (`esColumna344Faltante`),
 *    marca la bandera y repite con la vieja.
 *  · Cualquier otro error se devuelve TAL CUAL: un fallo de lectura nunca se
 *    convierte en "no hay datos".
 *
 * Lo usan health-read-service y cardio-perfil-service.
 */
import { base344ConocidaAusente, marcarBase344Ausente } from './base-344-estado';
import type { RespuestaSalud } from './health-read-core';
import { esColumna344Faltante } from './procedencia-core';

export async function leerConCaida<T>(
  nueva: () => PromiseLike<RespuestaSalud<T>>,
  vieja: () => PromiseLike<RespuestaSalud<T>>,
): Promise<RespuestaSalud<T>> {
  if (base344ConocidaAusente()) return vieja();
  const r = await nueva();
  if (r.error && esColumna344Faltante(r.error)) {
    marcarBase344Ausente();
    return vieja();
  }
  return r;
}
