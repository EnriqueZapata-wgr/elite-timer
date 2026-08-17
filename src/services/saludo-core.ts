/**
 * Saludo de HOY — lógica PURA, sin RN ni Supabase (BLOQ-5).
 *
 * Existe por un motivo concreto: el saludo venía materializado como un campo
 * dentro de `CompiledDay`, calculado una sola vez durante `compileDay()`. Un
 * campo no se entera de que pasó el tiempo. Si el compile ocurrió a las 21:xx y
 * el teléfono se quedó con la app abierta, a la mañana siguiente HOY seguía
 * diciendo "Buenas noches" — que es exactamente lo que reportó la auditoría a
 * las 8:43 de la mañana. No era un umbral mal puesto: la aritmética siempre
 * estuvo bien. Era un valor congelado.
 *
 * Con la función aquí, la pantalla puede derivar el saludo del reloj en cada
 * render en vez de leerlo de un objeto viejo, y se puede probar sin montar nada.
 *
 * Los cortes son los mismos de antes a propósito (12 y 18): este cambio arregla
 * la frescura, no redefine cuándo empieza la tarde. Eso es decisión de producto.
 *
 * DEUDA CONOCIDA: ARGOS tiene su propio saludo en `argos-personality.ts`, con
 * otros cortes (7/11/14/17/20/23) y con la hora forzada a America/Mexico_City
 * vía Intl en vez del reloj del dispositivo. Son dos relojes y dos criterios
 * conviviendo. Unificarlos cambia el tono de ARGOS, así que no se hace aquí.
 */

/** Saludo de HOY para una hora local (0-23). Mismos cortes de siempre. */
export function saludoPorHora(hour: number): string {
  // Una hora inválida no debe pintar "Buenas noches" por accidente: el saludo
  // es lo primero que se lee cada día y un default equivocado se siente roto.
  if (!Number.isFinite(hour)) return 'Hola,';
  const h = Math.floor(hour);
  if (h < 12) return 'Buenos días,';
  if (h < 18) return 'Buenas tardes,';
  return 'Buenas noches,';
}
