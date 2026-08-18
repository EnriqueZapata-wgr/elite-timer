/**
 * Identidad del llamador de una Edge Function — lógica pura, sin red propia.
 *
 * EL PROBLEMA QUE RESUELVE. `argos-proxy` tomaba el `userId` del CUERPO de la
 * petición y con ese dato decidía tier, cuota, gasto acumulado y a quién se le
 * carga cada llamada al modelo. El cuerpo lo escribe el cliente, así que
 * cualquiera con la anon key (que viaja en el bundle, es pública por diseño)
 * podía mandar el identificador de otra persona y:
 *   · quemarle el techo antiabuso de 500 MXN al día hasta dejarla sin ARGOS,
 *   · ensuciarle su historial de llamadas y su gasto,
 *   · o rotar identificadores inventados en cada petición para que el techo
 *     nunca se alcance y la factura la pague ATP.
 * Omitir el campo era todavía mejor negocio para el abusador: sin userId, el
 * conteo y el techo devuelven "abierto" y no cortan nada.
 *
 * QUÉ NO ARREGLA ESTO, PARA QUE NADIE SE CONFÍE. El proxy nunca leyó el
 * contexto personal del usuario: el contexto (`dynamicSystem`) lo arma el
 * cliente con su propia sesión y sus propias policies de RLS. Así que el hueco
 * era de CUOTA, GASTO y ATRIBUCIÓN, no de lectura de datos ajenos. Que no se
 * cuente como fuga de historial clínico, porque no lo es.
 *
 * POR QUÉ EN DOS TIEMPOS. No quedan builds: el cliente viejo manda la anon key
 * en `Authorization`, no el token del usuario. Si el servidor empieza a exigir
 * un JWT de usuario el mismo día, todo el que no haya recibido el OTA se queda
 * sin ARGOS. Entonces:
 *   · TIEMPO 1 (este código, `exigirJwt: false`): si viene un JWT de usuario
 *     válido, ESE manda y el cuerpo se ignora. Si no viene, se acepta el
 *     cuerpo y se deja un renglón en el log. El modo de falla es "sigue
 *     funcionando".
 *   · TIEMPO 2 (`exigirJwt: true`, se prende con una variable de entorno, sin
 *     redeploy de código): sin JWT de usuario no hay servicio. Ahí y solo ahí
 *     el hueco queda cerrado de verdad. Mientras el tiempo 2 esté apagado, un
 *     abusador que OMITA el header sigue pudiendo suplantar: el tiempo 1 solo
 *     protege al cliente honesto que sí manda su token.
 *
 * POR QUÉ LA ANON KEY SE DESCARTA SIN PREGUNTAR. La anon key ES un JWT firmado
 * y válido, así que `verify_jwt = true` de Supabase la deja pasar y no es
 * autenticación de nada. `getUser()` con ella devuelve vacío, pero eso cuesta
 * un viaje a Auth por petición. Comparándola de entrada nos ahorramos ese
 * viaje en todas las peticiones de los clientes viejos.
 */

/** De dónde salió el identificador con el que se va a trabajar. */
export type FuenteIdentidad =
  /** Del JWT del usuario, verificado contra Auth. Es el único confiable. */
  | 'jwt'
  /** Del cuerpo de la petición. Cliente sin actualizar (o abusador). */
  | 'cuerpo'
  /** No hubo ninguno. */
  | 'ninguna';

export interface Identidad {
  /** El userId con el que debe operar el handler. null = sin identidad. */
  userId: string | null;
  fuente: FuenteIdentidad;
  /**
   * El cuerpo declaró un userId DISTINTO al del JWT verificado. Es la señal de
   * suplantación: no hay razón legítima para que un cliente honesto discrepe
   * de su propio token. Se ignora el cuerpo y se deja el renglón en el log.
   */
  suplantacionIntentada: boolean;
  /** true → el handler debe responder 401 sin gastar un solo token. */
  rechazar: boolean;
}

/** Verifica un JWT y devuelve el userId, o null si no vale. Lo inyecta el llamador. */
export type VerificadorJwt = (jwt: string) => Promise<string | null>;

/** Saca el token del header Authorization. Tolera "Bearer" en cualquier caja. */
export function extraerJwt(authorization: string | null | undefined): string | null {
  // El trim va ANTES de quitar el esquema, no después: `^Bearer` está anclado al
  // inicio de la cadena, así que un header con espacios al frente hacía que el
  // reemplazo no coincidiera y el token saliera con el "Bearer" pegado. Eso no
  // abre un hueco (el token malformado no verifica y cae al camino de gracia),
  // pero degrada a un usuario legítimo a la ruta del cliente viejo sin motivo.
  const crudo = (authorization ?? '').trim().replace(/^Bearer\s+/i, '').trim();
  return crudo.length > 0 ? crudo : null;
}

export interface OpcionesIdentidad {
  authorization: string | null | undefined;
  /** Lo que el cliente dijo que era. Se trata como no confiable siempre. */
  bodyUserId: unknown;
  verificar: VerificadorJwt;
  /** La anon key del proyecto, para descartarla sin ir a Auth. */
  anonKey?: string | null;
  /** TIEMPO 2. Con esto en true, sin JWT de usuario no hay servicio. */
  exigirJwt: boolean;
}

export async function resolverIdentidad(opts: OpcionesIdentidad): Promise<Identidad> {
  const jwt = extraerJwt(opts.authorization);
  const esAnon = !!jwt && !!opts.anonKey && jwt === opts.anonKey;

  let userIdJwt: string | null = null;
  if (jwt && !esAnon) {
    try {
      userIdJwt = await opts.verificar(jwt);
    } catch {
      // Un hiccup de Auth no puede convertirse en un 401 para un usuario
      // legítimo: se cae al camino de gracia (o al rechazo, si ya es tiempo 2).
      userIdJwt = null;
    }
  }

  const declarado = typeof opts.bodyUserId === 'string' && opts.bodyUserId.length > 0
    ? opts.bodyUserId
    : null;

  if (userIdJwt) {
    return {
      userId: userIdJwt,
      fuente: 'jwt',
      suplantacionIntentada: declarado !== null && declarado !== userIdJwt,
      rechazar: false,
    };
  }

  if (opts.exigirJwt) {
    return { userId: null, fuente: 'ninguna', suplantacionIntentada: false, rechazar: true };
  }

  if (declarado) {
    return { userId: declarado, fuente: 'cuerpo', suplantacionIntentada: false, rechazar: false };
  }

  return { userId: null, fuente: 'ninguna', suplantacionIntentada: false, rechazar: false };
}

/**
 * Renglón de log. Solo se escribe cuando la identidad NO vino del JWT: en un
 * mundo ya actualizado esta línea desaparece de los logs, y ese silencio es
 * justo la señal de que se puede prender el tiempo 2.
 */
export function renglonIdentidad(id: Identidad, funcion: string): string | null {
  if (id.fuente === 'jwt' && !id.suplantacionIntentada) return null;
  if (id.suplantacionIntentada) {
    return `[identidad] ${funcion}: SUPLANTACION INTENTADA — el cuerpo declaró otro userId que el JWT. Se usó el del JWT.`;
  }
  return `[identidad] ${funcion}: fuente=${id.fuente} (cliente sin JWT de usuario). ` +
    `Mientras esta línea aparezca, ARGOS_EXIGE_JWT debe quedar apagado.`;
}
