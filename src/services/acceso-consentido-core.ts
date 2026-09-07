/**
 * Acceso consentido — núcleo PURO (sin react-native, sin supabase), vitest.
 *
 * ═══ QUÉ DECIDE ESTE ARCHIVO ═══
 * Una sola pregunta: ¿esta persona puede entrar a las pestañas?
 *
 * ═══ EL CAMBIO DEL 7 DE SEPTIEMBRE DE 2026 (pivote limpio, paso 0) ═══
 * Hasta hoy la respuesta colgaba de `profiles.onboarding_step`, con este
 * argumento escrito aquí mismo: la 032 marcó 'completed' a todos los usuarios
 * previos, `user_consent_log` nace 177 migraciones después y vacía, y gatear
 * por consentimientos mandaría a los founders a re-firmar lo que ya firmaron.
 *
 * El argumento se cayó al mirar producción. En `user_consent_log` hay TRES
 * filas en total (una CB-6, dos CB-7) para 13 perfiles. Cero de CB-1 a CB-5.
 * O sea que nadie firmó "lo que ya firmaron": no existe la firma. Lo que el
 * guardia estaba leyendo era una marca de producto, no un consentimiento, y
 * mientras tanto se trataban datos sensibles de salud sin bitácora que lo
 * respalde. Ese es el hoyo que cierra este archivo.
 *
 * Ahora hay DOS preguntas, y son distintas:
 *   · La LEGAL, que es la que abre o cierra la app: ¿están registrados CB-1
 *     (términos y aviso), CB-3 (transferencia internacional) y CB-4 (mayoría
 *     de edad)? Se responde con `user_consent_log`, y con nada más.
 *   · La de PRODUCTO: ¿terminó el onboarding? Se responde con
 *     `onboarding_step`, y su única consecuencia es a qué pantalla se manda a
 *     alguien que ya pasó la puerta legal.
 *
 * A quien le falte un consentimiento de la puerta NO se le firma nada por
 * adelantado ni se le inventa una fecha: se le pide la próxima vez que entra,
 * en `/consentimientos`, y no pierde ni un dato de los que ya tenía. Un
 * backfill sobre filas reales sería falsificar evidencia legal.
 *
 * CB-2 (datos sensibles de salud) NO vive aquí a propósito. Se pide en la
 * pantalla que va a escribir el primer dato de salud, porque la LFPDPPP pide
 * consentimiento previo al TRATAMIENTO y no previo al registro. Quien no lo
 * da entra igual a la app; lo que se le bloquea es esa función.
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
 * El visto bueno solo se escribe DESPUÉS de leer del servidor los tres
 * consentimientos de la puerta como aceptados. Nunca se infiere, nunca se
 * escribe desde el propio fallo. O sea: cachea el sí, jamás fabrica un sí.
 *
 * La LLAVE del visto bueno no cambia con este pivote, y es a propósito. Si se
 * versionara, todo el que ya entró se quedaría sin su marca local y un arranque
 * en frío sin red lo dejaría afuera de su propia app. Nadie pierde hoy algo
 * que ya tenía; lo que cambia es qué hace falta para GANARSE la marca nueva.
 */
// Type-only: se borra en compilación, el núcleo sigue siendo puro para vitest.
import type { ConsentCheckboxId } from '@/src/constants/consent-copy';

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

/**
 * Techo del gate COMPLETO, reintentos incluidos.
 *
 * El techo por lectura acota cada intento pero no la suma: cuatro lecturas
 * colgadas de 8 s más 5.1 s de esperas dan 37 s de splash. Está acotado y
 * sigue siendo inaceptable. A los 15 s se corta y se pasa directo a decidir,
 * que es lo mismo que iba a pasar 22 s después.
 *
 * El número no es arbitrario: es el punto donde una persona deja de creer que
 * la app está cargando y empieza a creer que se trabó.
 */
export const TECHO_TOTAL_MS = 15000;

/** ¿Ya se pasó el gate de su techo total? `transcurrido` en milisegundos. */
export function seAgotoElTiempo(transcurrido: number): boolean {
  return transcurrido >= TECHO_TOTAL_MS;
}

/** Fase del gate. `verificando` SIEMPRE termina: el bucle tiene techo. */
export type FaseAcceso =
  | 'verificando'
  | 'adentro'
  | 'falta_onboarding'
  | 'faltan_consentimientos'
  | 'sin_conexion';

/**
 * Los tres que abren la app. Espejo de los `surface: 'register'` de
 * `consent-copy.ts`, y el test de esa constante lo vigila desde el otro lado
 * para que no se separen.
 */
export const CONSENTIMIENTOS_DE_PUERTA = ['CB-1', 'CB-3', 'CB-4'] as const;

/**
 * El de datos sensibles de salud. NO abre ni cierra la app: bloquea la función
 * que iba a escribir el dato. Vive aquí para que exista un solo lugar donde se
 * lea qué consentimiento gobierna qué.
 */
export const CONSENTIMIENTO_DATOS_SALUD: ConsentCheckboxId = 'CB-2';

/** Último estado conocido por checkbox. Lo que no está, no se ha registrado. */
export type EstadoConsentimientos = Partial<Record<ConsentCheckboxId, 'accepted' | 'revoked'>>;

/** Lo que se leyó del perfil. `paso` = onboarding_step del servidor. */
export interface LecturaPerfil {
  /** El valor de `profiles.onboarding_step`, o undefined si no hay fila. */
  paso: string | null | undefined;
}

/**
 * ¿Cuáles de los tres de la puerta le faltan? Vacío = puede entrar.
 *
 * Una fila `revoked` cuenta como falta: revocar es un derecho y significa que
 * ese consentimiento ya no está vigente, no que nunca existió.
 */
export function faltanConsentimientosDePuerta(
  estado: EstadoConsentimientos,
): ConsentCheckboxId[] {
  return CONSENTIMIENTOS_DE_PUERTA.filter(id => estado[id] !== 'accepted');
}

/**
 * ¿El estado de consentimientos autoriza la entrada?
 *
 * Solo mira CB-1, CB-3 y CB-4. Falta CB-2 a propósito: quien no consintió el
 * tratamiento de datos de salud usa la app igual, con esa función bloqueada.
 */
export function autorizaEntrada(estado: EstadoConsentimientos): boolean {
  return faltanConsentimientosDePuerta(estado).length === 0;
}

/**
 * ¿Se pueden escribir datos de salud? La puerta reutilizable de CB-2 vive en
 * `src/components/legal/PuertaDatosSalud.tsx` y esta es su política.
 */
export function permiteDatosDeSalud(estado: EstadoConsentimientos): boolean {
  return estado[CONSENTIMIENTO_DATOS_SALUD] === 'accepted';
}

/**
 * ¿Terminó el onboarding? Pregunta de PRODUCTO, no legal: su única
 * consecuencia es a qué pantalla se manda a alguien que YA pasó la puerta.
 *
 * Un perfil que todavía no existe (registro recién hecho, trigger que no
 * alcanzó a correr) devuelve `paso === undefined` y cuenta como no terminado,
 * que es lo correcto: se le enseña el onboarding, no las pestañas vacías.
 */
export function onboardingTerminado({ paso }: LecturaPerfil): boolean {
  return paso === 'completed';
}

/** Lo que el gate sabe cuando ya intentó leer todo lo que necesitaba. */
export interface LecturaDeArranque {
  /** false = NO se pudo leer el log de consentimientos (red, error, techo). */
  consentimientosLeidos: boolean;
  /** Último estado por checkbox. Solo tiene sentido si `consentimientosLeidos`. */
  consentimientos: EstadoConsentimientos;
  /** ¿Hay visto bueno guardado en ESTE teléfono? (ya entró antes). */
  vistoBuenoLocal: boolean;
}

/**
 * La decisión legal, en una función.
 *
 * El caso que más importa es el primero: si NO se pudo LEER el estado de
 * consentimientos, eso no es "no consintió". supabase-js no lanza en 4xx, así
 * que un fallo de red y una tabla vacía se parecen mucho, y confundirlos deja
 * fuera de su app a alguien que ya entró antes. Regla de la casa: ante una
 * lectura fallida no se le cierra la puerta a quien ya la había cruzado.
 */
export function decidirAcceso(l: LecturaDeArranque): FaseAcceso {
  if (!l.consentimientosLeidos) return decidirTrasFalloDefinitivo(l.vistoBuenoLocal);
  return autorizaEntrada(l.consentimientos) ? 'adentro' : 'faltan_consentimientos';
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
