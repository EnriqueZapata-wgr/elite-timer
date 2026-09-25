/**
 * HOY en la app Elite DX (25-sep-2026, flags.APP_ELITE_DX): la logica PURA
 * del aviso de evaluacion que HOY conserva al retirar HeroLaboratorios.
 * Cero React, cero supabase; se verifica con
 * `node scripts/run-tests-sin-vitest.js src/services/hoy/__tests__/hoy-elite-dx-core.test.ts`.
 *
 * Por que existe: con la bandera, el hero de laboratorios (y su version
 * Elite) sale de HOY y se va a MI PROGRAMA. Ese hero era el UNICO lugar de
 * HOY que decia "No pudimos leer tu evaluacion" en dos casos que nadie mas
 * cubre:
 *  - 'formato': hay evaluacion guardada y esta version de la app no la
 *    entiende. "Que hacer hoy" cae en silencio a la terna de siempre y el
 *    encabezado del programa pinta la semana (lee otra columna), asi que el
 *    cliente veria una terna generica como si fuera su plan.
 *  - 'contradiccion': el nivel confirmo que existe la evaluacion y la
 *    lectura completa dice que no hay (RLS, cache). Sin aviso, la terna
 *    tambien cae a lo de siempre en silencio.
 * El fallo de red ('lectura') NO se avisa aqui: "Que hacer hoy" ya se cae
 * con su propio "no pudimos leer" + Reintentar cuando el fallo importa
 * (falloEvaluacionEsFatal), y dos tarjetas de error por lo mismo sobran.
 */

/** Lo minimo de `LecturaEvaluacionVigente` (elite-hoy-service) que usa el aviso. */
export type LecturaParaAviso =
  | { ok: true; evaluacion: unknown }
  | { ok: false; motivo: 'lectura' | 'formato' };

/** Lo minimo de `NivelHoy` (elite-hoy-core) que usa el aviso. */
export interface NivelParaAviso {
  cargando: boolean;
  tieneEvaluacionElite: boolean;
}

export type AvisoEvaluacionDx = 'ninguno' | 'formato' | 'contradiccion';

/**
 * Que aviso de evaluacion pinta HOY bajo el encabezado del programa.
 * `lectura` null = todavia no se lee (no se pinta nada: el encabezado del
 * programa ya ocupa ese lugar mientras tanto).
 */
export function avisoEvaluacionHoyDx(lectura: LecturaParaAviso | null, nivel: NivelParaAviso): AvisoEvaluacionDx {
  if (!lectura) return 'ninguno';
  if (!lectura.ok) return lectura.motivo === 'formato' ? 'formato' : 'ninguno';
  if (lectura.evaluacion != null) return 'ninguno';
  // Lectura ok y sin evaluacion: solo es aviso si el nivel YA leido dice que existe.
  if (nivel.tieneEvaluacionElite && !nivel.cargando) return 'contradiccion';
  return 'ninguno';
}

/**
 * Un fallo de red no borra lo que ya se sabia (misma regla que
 * useProgramaElite): si el Reintentar de un aviso 'formato' choca con la red,
 * el aviso se queda en vez de desaparecer como si todo estuviera bien.
 */
export function siguienteLecturaAviso(previa: LecturaParaAviso | null, nueva: LecturaParaAviso): LecturaParaAviso {
  if (!nueva.ok && nueva.motivo === 'lectura' && previa) return previa;
  return nueva;
}

/**
 * El nombre para el mensaje prellenado a Enrique ("Hola Enrique, soy ...").
 *
 * 25-sep-2026 (APP_ELITE_DX, revisión en frío): `day.userName` NO sirve solo.
 * compileDay lo arma del primer nombre de user_metadata, luego de
 * profiles.full_name y, si no hay ninguno, de la parte local del correo
 * ("VICENTE.G88"), y lo entrega en mayusculas porque es el saludo grande de
 * HOY. Un "soy Vicente.g88" en el WhatsApp de Enrique es peor que no poner
 * nombre. Orden, sin consultas nuevas:
 *  1. `nombreCompleto` (user_metadata.full_name, lo que la persona escribio
 *     al registrarse): completo, tal cual; si viene todo en mayusculas, se
 *     pasa a nombre propio palabra por palabra.
 *  2. `primerNombre` (day.userName), solo si NO es la parte local del correo:
 *     pasado a nombre propio.
 *  3. null: el mensaje sale sin nombre. Nunca se inventa uno.
 * Si el nombre real coincide con la parte local del correo (vicente@...), se
 * pierde el nombre en el paso 2: se prefiere eso a mandar un usuario de correo.
 */
export function nombreParaMensaje(fuente: {
  nombreCompleto?: unknown;
  primerNombre?: string | null;
  email?: string | null;
}): string | null {
  const completo = typeof fuente.nombreCompleto === 'string' ? fuente.nombreCompleto.trim().replace(/\s+/g, ' ') : '';
  if (completo) return enMayusculas(completo) ? aNombrePropio(completo) : completo;
  const primero = (fuente.primerNombre ?? '').trim();
  if (!primero) return null;
  const localCorreo = (fuente.email ?? '').split('@')[0]?.trim() ?? '';
  if (localCorreo && primero.toLocaleUpperCase('es') === localCorreo.toLocaleUpperCase('es')) return null;
  return aNombrePropio(primero);
}

/** true si tiene letras y todas van en mayuscula ("VICENTE GARCÍA"). */
function enMayusculas(texto: string): boolean {
  return texto !== texto.toLocaleLowerCase('es') && texto === texto.toLocaleUpperCase('es');
}

/** "VICENTE GARCÍA" -> "Vicente García". */
function aNombrePropio(texto: string): string {
  return texto
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      const minus = w.toLocaleLowerCase('es');
      return minus.charAt(0).toLocaleUpperCase('es') + minus.slice(1);
    })
    .join(' ');
}
