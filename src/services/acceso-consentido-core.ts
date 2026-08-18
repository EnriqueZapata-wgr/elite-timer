/**
 * Acceso consentido — núcleo PURO (sin react-native, sin supabase), vitest.
 *
 * ═══ QUÉ DECIDE ESTE ARCHIVO ═══
 * Una sola pregunta: ¿esta persona puede entrar a las pestañas?
 *
 * La respuesta NO cuelga de `user_consent_log`, y eso es deliberado. Esa tabla
 * nace en la migración 209; la 032 (líneas 15-16) marcó
 * `onboarding_step='completed'` a TODOS los usuarios preexistentes, 177
 * migraciones antes. Esos usuarios ya consintieron por el camino que existía
 * entonces y tienen CERO filas en `user_consent_log`: gatear por ahí los
 * mandaría a re-firmar algo que ya firmaron. El dato del usuario es sagrado.
 * La marca válida de "este ya pasó" es `onboarding_step`, que sí está
 * backfilleada.
 *
 * ═══ EL MODO DE FALLA, QUE ES EL CORAZÓN DEL ASUNTO ═══
 * Cuando de verdad no se puede leer el perfil hay tres salidas y dos son malas:
 *
 *   · Dejarlo pasar  → es el hueco legal. Una app de salud que recolecta datos
 *     personales sin consentimiento asentado es motivo de rechazo en revisión
 *     de tiendas, y antes que eso es un problema legal. Era lo que hacía el
 *     `catch` de `app/index.tsx`.
 *   · Dejarlo afuera → deja sin app a alguien que pagó. Ese fallo ya costó caro.
 *   · La tercera     → reintentar con espera creciente, y si aun así no se
 *     puede, distinguir DOS personas distintas:
 *        – quien ya entró antes en ESTE teléfono (hay visto bueno guardado):
 *          pasa. Ya consintió, está probado localmente, y una torre de celular
 *          caída no es motivo para quitarle su app.
 *        – quien no tiene visto bueno: NO pasa, y se le dice la verdad de lo
 *          que ocurrió con un botón para reintentar y otro para cerrar sesión.
 *          Nunca una pantalla colgada en "Cargando...", que ya pasó dos veces.
 *
 * El visto bueno solo se escribe DESPUÉS de leer del servidor un
 * `onboarding_step === 'completed'`. Nunca se infiere, nunca se escribe desde
 * el propio fallo. O sea: cachea el sí, jamás fabrica un sí.
 */

/**
 * Esperas entre reintentos, en milisegundos. Cuatro lecturas en total
 * (la primera + tres reintentos) y ~5.1 s de espera acumulada en el peor caso.
 * Suficiente para un cambio de red o un socket que se cayó; corto para no
 * dejar a nadie mirando un logo.
 */
export const ESPERAS_REINTENTO_MS = [600, 1500, 3000] as const;

/**
 * Techo duro por lectura. Sin esto, una petición que nunca resuelve (el caso
 * clásico de red móvil que "conecta" y no transporta) deja la pantalla en
 * splash para siempre, que es exactamente el síntoma que ya se sufrió dos
 * veces. Con techo, una lectura colgada se cuenta como fallo y entra al
 * siguiente reintento.
 */
export const TECHO_LECTURA_MS = 8000;

/** Fase del gate. `verificando` SIEMPRE termina: el bucle tiene techo. */
export type FaseAcceso =
  | 'verificando'
  | 'adentro'
  | 'falta_onboarding'
  | 'sin_conexion';

/** Lo que se leyó del perfil. `paso` = onboarding_step del servidor. */
export interface LecturaPerfil {
  /** El valor de `profiles.onboarding_step`, o undefined si no hay fila. */
  paso: string | null | undefined;
}

/**
 * ¿La lectura del servidor autoriza la entrada?
 *
 * Solo 'completed' autoriza. Un perfil que todavía no existe (registro recién
 * hecho, trigger que no alcanzó a correr) devuelve `paso === undefined` y NO
 * autoriza: sin perfil no hay consentimientos asentados. Ese caso concreto ya
 * había abierto la puerta una vez, cuando `.single()` lanzaba error por perfil
 * inexistente y el error caía a un `catch` que degradaba a las pestañas.
 */
export function autorizaEntrada({ paso }: LecturaPerfil): boolean {
  return paso === 'completed';
}

/**
 * Qué hacer cuando se agotaron los reintentos y el perfil sigue sin leerse.
 *
 * Esta función es la tercera opción escrita en una línea: el visto bueno local
 * es la única cosa que puede convertir un fallo de red en una entrada, y ese
 * visto bueno solo existe si alguna vez se leyó 'completed' del servidor.
 */
export function decidirTrasFalloDefinitivo(vistoBuenoLocal: boolean): FaseAcceso {
  return vistoBuenoLocal ? 'adentro' : 'sin_conexion';
}

/**
 * Espera del siguiente reintento, o null si ya no quedan.
 * `intento` es 0-based: 0 = ya falló la primera lectura.
 */
export function esperaDelReintento(intento: number): number | null {
  return ESPERAS_REINTENTO_MS[intento] ?? null;
}

/** Llave de AsyncStorage del visto bueno. Por usuario: un teléfono compartido
 *  no filtra el permiso de una persona a otra. */
export function llaveVistoBueno(userId: string): string {
  return `@atp/acceso_consentido/${userId}`;
}

/** Copy de la pantalla de fallo. Vive aquí para que el candado lo vigile:
 *  el texto tiene que decir la verdad de lo que pasó y ofrecer salida. */
export const COPY_SIN_CONEXION = {
  titulo: 'No pudimos verificar tu cuenta',
  cuerpo:
    'Necesitamos leer tu perfil para abrir la app y no lo logramos. Casi siempre es la conexión. Revisa tu internet y vuelve a intentar.',
  reintentar: 'Reintentar',
  salir: 'Cerrar sesión',
} as const;
