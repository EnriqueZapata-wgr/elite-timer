/**
 * Código de activación en el registro: lógica pura, sin red y sin React.
 *
 * PIVOTE ELITE (8 de septiembre de 2026): la app deja de ser pública y pasa a
 * ser solo para clientes con servicio contratado. Sin código de activación no
 * hay cuenta. Aquí vive lo que se DECIDE y lo que se DICE; el IO contra
 * Supabase está en subscription-service.ts y la verdad la tiene el servidor.
 *
 * POR QUÉ existe este archivo aparte: quien teclea el código acaba de pagar un
 * servicio caro. La diferencia entre "ese código no existe" y "no pudimos
 * verificarlo" es la diferencia entre acusarlo de mentir y admitir que falló
 * la conexión, y esa diferencia tiene que poder probarse sin abrir la app.
 * supabase-js no lanza en 4xx: devuelve { data: null, error }, así que un
 * error de red llega con la misma forma que una respuesta vacía. Por eso
 * `estadoDesdeRespuesta` solo cree lo que el servidor dijo con todas sus
 * letras y todo lo demás cae en `no_verificado`, que deja reintentar.
 */

/**
 * Lo que el servidor puede contestar sobre un código ANTES de crear la cuenta
 * (RPC verificar_codigo_activacion, migración 322). El RPC no consume nada:
 * mirar un código no lo gasta.
 *
 * `no_verificado` no viene del servidor: lo produce el cliente cuando no pudo
 * leer (sin red, RPC ausente, respuesta con forma rara).
 */
export type EstadoCodigo =
  | 'usable'
  | 'no_encontrado'
  | 'vencido'
  | 'agotado'
  | 'no_verificado';

/**
 * Estados del canje (RPC redeem_activation_code, migraciones 239 y 240).
 * Se repiten aquí a propósito para que este archivo no importe nada: el
 * runner de tests lo corre en node pelón.
 */
export type EstadoCanje =
  | 'ok'
  | 'not_found'
  | 'expired'
  | 'exhausted'
  | 'already_redeemed'
  | 'not_authenticated'
  | 'network_error';

/**
 * Mínimo de caracteres útiles para molestar al servidor. Los códigos vigentes
 * son ATP-XXXX-XXXX (11 alfanuméricos ya normalizados), pero no se exige el
 * formato exacto: si algún día se emite otro formato, la app no debe rechazar
 * un código bueno por su forma. Solo se evita mandar basura o campos a medias.
 */
export const LARGO_MINIMO_CODIGO = 6;

/** Mayúsculas y solo alfanuméricos: la gente lo escribe con o sin guiones. */
export function normalizarCodigo(entrada: string | null | undefined): string {
  if (typeof entrada !== 'string') return '';
  return entrada.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** ¿Vale la pena mandarlo al servidor? No valida el código, solo su forma. */
export function tieneFormaDeCodigo(entrada: string | null | undefined): boolean {
  return normalizarCodigo(entrada).length >= LARGO_MINIMO_CODIGO;
}

/**
 * Traduce la respuesta del RPC de verificación a un estado.
 * Regla de la casa: si hubo error, o si la respuesta no trae un estado que
 * reconozcamos, NO se concluye que el código sea malo. Se dice que no se pudo
 * verificar y se deja reintentar.
 */
export function estadoDesdeRespuesta(data: unknown, hayError: boolean): EstadoCodigo {
  if (hayError) return 'no_verificado';
  if (!data || typeof data !== 'object') return 'no_verificado';
  const estado = (data as Record<string, unknown>).estado;
  if (estado === 'usable' || estado === 'no_encontrado' || estado === 'vencido' || estado === 'agotado') {
    return estado;
  }
  return 'no_verificado';
}

/** Solo un código vivo abre la puerta. La duda nunca crea la cuenta. */
export function permiteCrearCuenta(estado: EstadoCodigo): boolean {
  return estado === 'usable';
}

/**
 * Copy por estado. Nunca dice "compra" ni menciona precios, tiendas ni sitios:
 * el código es el que va con el servicio contratado, no una vía de pago
 * (Apple 3.1.1). Y nunca da a entender que la persona esté inventando algo.
 */
export function mensajeDeCodigo(estado: EstadoCodigo): string | null {
  switch (estado) {
    case 'usable':
      return null;
    case 'no_encontrado':
      return 'No reconocimos ese código. Revísalo y escríbelo tal como te lo enviamos. Si sigue sin pasar, avísanos y lo resolvemos.';
    case 'vencido':
      return 'Este código ya venció. Avísanos y te enviamos uno nuevo hoy mismo.';
    case 'agotado':
      return 'Este código ya se activó. Si fuiste tú, entra con esa cuenta. Si no, avísanos y te enviamos otro.';
    case 'no_verificado':
    default:
      return 'No pudimos verificar tu código en este momento. Revisa tu conexión e inténtalo de nuevo.';
  }
}

/**
 * ¿El nivel quedó aplicado?
 * `already_redeemed` cuenta como sí: es lo que contesta el servidor cuando la
 * MISMA persona canjea dos veces (doble toque, reintento tras un timeout que
 * en realidad sí llegó). El grant ya existe; volver a fallar por eso sería
 * castigar a alguien por tocar dos veces.
 */
export function nivelQuedoAplicado(estado: EstadoCanje): boolean {
  return estado === 'ok' || estado === 'already_redeemed';
}

/**
 * Copy cuando la cuenta YA se creó y el canje no pudo completarse.
 * Aquí lo importante es que nadie crea que perdió su cuenta ni su código: la
 * cuenta existe y el código sigue sin gastarse.
 *
 * 8-sep-2026, corregido tras la revisión en frío: antes esto mandaba a
 * "Ajustes, Tengo un código". Mandar a alguien a buscar una pantalla que no
 * sabe que existe es dejarlo solo. Ahora el código queda guardado en el
 * teléfono y se canjea solo al entrar, así que el mensaje promete lo que de
 * verdad va a pasar. Devuelve null cuando no hay nada que avisar.
 */
export function mensajeDeCanjeTrasCuenta(estado: EstadoCanje): string | null {
  if (nivelQuedoAplicado(estado)) return null;
  if (estado === 'network_error' || estado === 'not_authenticated') {
    return 'Tu cuenta ya quedó creada. Tu código quedó guardado y tu nivel se activa solo la próxima vez que entres con señal.';
  }
  // not_found / expired / exhausted después de que la verificación dijo que
  // servía: alguien más lo usó en el mismo minuto o venció entre un paso y
  // otro. Es rarísimo y no es culpa de quien está del otro lado.
  return 'Tu cuenta ya quedó creada, pero tu código no se pudo activar. Avísanos y lo dejamos listo hoy mismo.';
}

/**
 * CAMINO PROPIO: cuenta creada y SIN sesión (8-sep-2026, revisión en frío).
 *
 * Con la confirmación por correo activada, `signUp` no deja sesión: no es un
 * caso raro, es el camino de TODOS. Sin sesión, redeem_activation_code
 * contesta not_authenticated, y antes de este arreglo la persona terminaba en
 * la pantalla de login sin que nada le dijera que abriera su correo.
 *
 * Las tres cosas que tiene que saber al salir de la pantalla de registro, y
 * que este texto dice en ese orden: su cuenta sí se creó, tiene que abrir el
 * correo, y su código sigue vivo y se aplica solo cuando vuelva.
 */
export const COPY_CONFIRMA_TU_CORREO = {
  titulo: 'Revisa tu correo',
  texto: 'Tu cuenta ya quedó creada. Te enviamos un correo para confirmarla: ábrelo, toca el enlace y entra con tu correo y tu contraseña. Tu código ya quedó guardado y tu nivel se activa solo en cuanto entres.',
} as const;

/**
 * Llave del canje pendiente en el teléfono, POR PERSONA.
 *
 * La cola de consentimientos tuvo esta misma noche el bug de la llave global:
 * lo encolado por una cuenta se le aplicaba a la siguiente que entrara en ese
 * teléfono. Aquí la llave lleva el correo desde el principio, así que el
 * código de un cliente no puede aplicarse en la cuenta de otro.
 *
 * El correo es lo único que identifica a la persona cuando todavía no hay
 * sesión, que es justo el momento en que hay que guardar el código.
 * Devuelve '' con un correo vacío: sin identidad no se guarda nada.
 */
export function llaveCanjePendiente(correo: string | null | undefined): string {
  const limpio = typeof correo === 'string' ? correo.trim().toLowerCase() : '';
  return limpio ? `@atp/canje_pendiente/${limpio}` : '';
}

/**
 * ¿Qué hacer con el código guardado después de intentar canjearlo?
 * `conservar` solo cuando el intento no probó nada (sin red, sin sesión):
 * ese código sigue vivo y merece otro intento. Se borra cuando ya se aplicó
 * (no hay nada que reintentar) y también cuando el servidor dijo con todas
 * sus letras que ese código no va a servir nunca: reintentarlo en cada
 * arranque solo haría ruido, y la persona ya tiene a quién avisarle.
 */
export function decidirTrasCanjePendiente(estado: EstadoCanje): 'borrar' | 'conservar' {
  if (estado === 'network_error' || estado === 'not_authenticated') return 'conservar';
  return 'borrar';
}
