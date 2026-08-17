/**
 * Config de la economía de ATP.
 *
 * PREMIUM (16-ago-2026): se eliminaron los Protones (H+). Ya no hay moneda
 * interna, ninguna función se paga por transacción y nada se raciona.
 *
 * El razonamiento, para que nadie lo reintroduzca sin discutirlo: el activo
 * más valioso de ATP es la IA. Cobrarla por consumo hace que la gente la use
 * menos, y quien la usa menos desinstala. La apuesta es al revés: menos
 * clientes, más premium, uso ilimitado.
 *
 * Lo que SIGUE VIVO son los ELECTRONES (E-), y solo para lo que siempre
 * fueron: logros, avance, rachas y rango. No son moneda, no se compran, no se
 * gastan y no se convierten en nada.
 *
 * Las tablas proton_balance, proton_transactions, proton_action_costs y
 * proton_packages NO se tocaron: hay personas con saldo y con historial, y ese
 * dato es suyo. Simplemente dejaron de leerse desde la app. Siguen saliendo en
 * la exportación de datos (data-export-generator).
 */

/**
 * Interruptor de la capa de gamificación visible (pill de rango en HOY, etc.).
 * Antes encendía además el cobro por H+; ese cobro ya no existe.
 */
export const LAB_ECONOMY_ENABLED = true;
