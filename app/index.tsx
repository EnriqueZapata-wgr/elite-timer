/**
 * Index — Redirect según estado de autenticación y onboarding.
 * Mientras verifica, muestra logo vertical ATP con loader.
 *
 * CONSENT: este archivo es EL GATE. Nadie entra a las pestañas sin tener
 * registrados CB-1 (términos y aviso), CB-3 (transferencia internacional) y
 * CB-4 (mayoría de edad), que se firman en /register.
 *
 * 7-sep-2026 (pivote limpio, paso 0): la marca dejó de ser
 * `profiles.onboarding_step` y pasó a ser `user_consent_log`, que es donde de
 * verdad vive el consentimiento. El porqué completo está en el encabezado de
 * acceso-consentido-core.ts; en corto: en producción esa tabla tiene tres
 * filas para 13 perfiles y ninguna de CB-1 a CB-5, así que el guardia estaba
 * leyendo una marca de producto mientras la app trataba datos sensibles de
 * salud sin bitácora. A quien le falte un consentimiento de la puerta se le
 * pide en /consentimientos, una vez y sin perder nada; NO se le firma nada
 * por adelantado.
 *
 * `onboarding_step` se sigue leyendo, pero ya solo contesta una pregunta de
 * producto: a qué pantalla se enruta a alguien que YA pasó la puerta legal.
 *
 * EL MODO DE FALLA, QUE ERA EL PROBLEMA DE VERDAD
 * Antes había dos, y ninguno era correcto:
 *   · Si la petición RECHAZABA (fetch caído en RN), el `catch` hacía
 *     `setOnboardingDone(true)` y degradaba a las pestañas. Ese era el hueco
 *     legal: un fallo de red metía a una persona a una app de salud sin haber
 *     consentido nada.
 *   · Si la petición RESOLVÍA con error (el caso normal de Supabase: el error
 *     viaja en `error`, no se lanza), el código hacía `const { data } = ...`
 *     ignorando `error`, así que `data` quedaba null, el paso quedaba
 *     `undefined` y la persona se iba de cabeza a repetir el onboarding. O sea
 *     que el mismo fallo de red, según su forma exacta, o abría la puerta o
 *     mandaba a re-firmar a alguien que ya había firmado.
 *
 * Ahora hay UNO solo y es explícito: los dos casos son "no se pudo leer", se
 * reintenta con espera creciente y techo de tiempo, y al agotarse decide
 * `decidirTrasFalloDefinitivo`: pasa quien ya entró antes en este teléfono, y
 * a quien no, se le dice la verdad con un botón para reintentar y otro para
 * cerrar sesión. Nunca un "Cargando..." colgado.
 */
import { useState, useEffect } from 'react';
import { Redirect, type Href } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Image, Pressable } from 'react-native';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { resolveOnboardingRoute } from '@/src/services/onboarding-v2-core';
import {
  decidirAcceso,
  decidirTrasFalloDefinitivo,
  esperaDelReintento,
  onboardingTerminado,
  seAgotoElTiempo,
  CONSENTIMIENTOS_DE_PUERTA,
  TECHO_LECTURA_MS,
  COPY_SIN_CONEXION,
  type EstadoConsentimientos,
  type FaseAcceso,
} from '@/src/services/acceso-consentido-core';
import type { ConsentCheckboxId } from '@/src/constants/consent-copy';
import { marcarVistoBueno, leerVistoBueno, olvidarVistoBueno } from '@/src/services/acceso-consentido';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';

const logoVertical = require('@/assets/images/splash-icon.png');

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Corre una lectura con techo de tiempo. Devuelve null si se pasó del techo.
 *
 * Sin esto, una petición que nunca resuelve (red móvil que "conecta" y no
 * transporta) deja el splash puesto para siempre. Ese síntoma exacto ya se
 * sufrió dos veces, y la causa nunca fue el `await`: era que nadie le había
 * puesto un límite.
 */
async function conTecho<T>(p: PromiseLike<T>): Promise<T | null> {
  let id: ReturnType<typeof setTimeout> | undefined;
  const techo = new Promise<null>((r) => { id = setTimeout(() => r(null), TECHO_LECTURA_MS); });
  try {
    return await Promise.race([Promise.resolve(p), techo]);
  } finally {
    if (id) clearTimeout(id);
  }
}

/**
 * Lee `profiles.onboarding_step`. `ok:false` es CUALQUIER forma de no haber
 * podido leer: error devuelto, promesa rechazada o techo de tiempo. Las tres
 * son el mismo hecho y merecen el mismo trato.
 *
 * Ojo con lo que NO es un fallo: que no exista la fila. Con `maybeSingle` eso
 * es `ok:true` con `paso: undefined`, y `onboardingTerminado` lo rechaza, que
 * es lo correcto: a quien acaba de crear su cuenta se le enseña el onboarding,
 * no unas pestañas vacías. Ese caso ya había abierto la puerta una vez, cuando
 * `.single()` lo convertía en excepción.
 */
async function leerPasoDelPerfil(
  userId: string,
): Promise<{ ok: false } | { ok: true; paso: string | null | undefined }> {
  try {
    const r = await conTecho(
      supabase.from('profiles').select('onboarding_step').eq('id', userId).maybeSingle(),
    );
    if (!r || r.error) return { ok: false };
    return { ok: true, paso: r.data?.onboarding_step };
  } catch {
    return { ok: false };
  }
}

/**
 * Lee el ÚLTIMO estado de CB-1, CB-3 y CB-4 en `user_consent_log`.
 *
 * Va directo a la tabla y no a `getConsentStatus` porque ésa devuelve `{}`
 * tanto si la lectura falló como si no hay filas, y aquí esos dos casos son
 * dos personas distintas: una que no puede leer (se le rescata con el visto
 * bueno local) y una que nunca consintió (se le pide). supabase-js no lanza en
 * 4xx, así que la señal es `error`, no una excepción.
 *
 * El log es append-only: la fila más reciente de cada checkbox manda, y por
 * eso el orden es descendente y solo se queda la primera de cada uno.
 */
async function leerConsentimientosDePuerta(
  userId: string,
): Promise<{ ok: false } | { ok: true; estado: EstadoConsentimientos }> {
  try {
    const r = await conTecho(
      supabase
        .from('user_consent_log')
        .select('checkbox_id, action, created_at')
        .eq('user_id', userId)
        .in('checkbox_id', [...CONSENTIMIENTOS_DE_PUERTA])
        .order('created_at', { ascending: false }),
    );
    if (!r || r.error) return { ok: false };
    const estado: EstadoConsentimientos = {};
    for (const fila of r.data ?? []) {
      const id = fila.checkbox_id as ConsentCheckboxId;
      if (!estado[id]) estado[id] = fila.action === 'accepted' ? 'accepted' : 'revoked';
    }
    return { ok: true, estado };
  } catch {
    return { ok: false };
  }
}

/**
 * Las dos lecturas que necesita el arranque, en paralelo. Basta que una falle
 * para que el arranque cuente como fallido: sin consentimientos no se puede
 * decidir la puerta, y sin `onboarding_step` no se sabe a dónde enrutar a
 * quien la cruza.
 */
async function leerEstadoDeArranque(
  userId: string,
): Promise<{ ok: false } | { ok: true; paso: string | null | undefined; consentimientos: EstadoConsentimientos }> {
  const [perfil, consentimientos] = await Promise.all([
    leerPasoDelPerfil(userId),
    leerConsentimientosDePuerta(userId),
  ]);
  if (!perfil.ok || !consentimientos.ok) return { ok: false };
  return { ok: true, paso: perfil.paso, consentimientos: consentimientos.estado };
}

/**
 * Backfill (Step COACH 7.2/N): founders que terminaron onboarding ANTES del
 * paso de voz no tienen fila en coach_voice_config.
 *
 * Si no se puede saber, devuelve false: no estorbar. Esto NO es cumplimiento,
 * es una comodidad de producto, y no tiene por qué dejar a nadie afuera.
 */
async function faltaConfigDeVoz(userId: string): Promise<boolean> {
  const r = await conTecho(
    supabase.from('coach_voice_config').select('id').eq('user_id', userId).maybeSingle(),
  );
  if (!r || r.error) return false;
  return !r.data;
}

export default function IndexRedirect() {
  const { session, loading, signOut } = useAuth();
  const [fase, setFase] = useState<FaseAcceso>('verificando');
  const [rutaOnboarding, setRutaOnboarding] = useState<Href | null>(null);
  // Sube al tocar "Reintentar" y vuelve a disparar el efecto. Es la salida que
  // convierte la pantalla de fallo en algo accionable en vez de un callejón.
  const [reintentoManual, setReintentoManual] = useState(0);

  useEffect(() => {
    const userId = session?.user?.id;
    if (loading || !userId) return;
    let vivo = true;
    setFase('verificando');

    (async () => {
      const inicio = Date.now();
      for (let n = 0; ; n++) {
        const lectura = await leerEstadoDeArranque(userId);
        if (!vivo) return;

        if (lectura.ok) {
          // Primero la pregunta LEGAL. Si faltan CB-1, CB-3 o CB-4, no hay
          // app: se va a pedirlos. `vistoBuenoLocal` va en false a propósito
          // porque aquí la lectura SÍ salió: el rescate local es solo para
          // cuando no se pudo leer, no para tapar un "no consintió".
          const decision = decidirAcceso({
            consentimientosLeidos: true,
            consentimientos: lectura.consentimientos,
            vistoBuenoLocal: false,
          });
          if (decision !== 'adentro') {
            // El servidor acaba de desmentir la marca local. Si no se borra,
            // el guard de las pestañas la sigue creyendo y un deep link entra
            // saltándose esta puerta. Solo aquí, donde la lectura SÍ salió.
            olvidarVistoBueno(userId);
            setFase('faltan_consentimientos');
            return;
          }

          if (!onboardingTerminado({ paso: lectura.paso })) {
            // Onboarding v2 (F2 sprint UX blockers): 'v2_<step>' → su pantalla;
            // valores legacy v1 (incluido 'pending') → reiniciar en v2 welcome
            // (los datos ya capturados persisten y las pantallas v2 los
            // prefillan). Nadie se queda sin ruta por un valor viejo.
            setRutaOnboarding(resolveOnboardingRoute(lectura.paso) ?? '/onboarding/v2/welcome');
            setFase('falta_onboarding');
            return;
          }

          // El visto bueno se marca AQUÍ y en memoria de forma síncrona,
          // antes de cualquier redirect: el guard de app/(tabs)/_layout.tsx
          // lo lee en el mismo frame y por eso no hay parpadeo ni una
          // segunda consulta de red. Desde el 7-sep-2026 significa "los tres
          // consentimientos de la puerta se leyeron aceptados del servidor",
          // que es más de lo que significaba antes.
          //
          // Se marca aunque falte la config de voz. El backfill de voz no es
          // materia de consentimiento, y si el visto bueno dependiera de él,
          // voice-config saldría a las pestañas, el guard la rebotaría al
          // gate y el gate la mandaría de vuelta a voice-config: un bucle.
          marcarVistoBueno(userId);
          const faltaVoz = await faltaConfigDeVoz(userId);
          if (!vivo) return;
          if (faltaVoz) {
            setRutaOnboarding('/onboarding/voice-config?mode=backfill');
            setFase('falta_onboarding');
          } else {
            setFase('adentro');
          }
          return;
        }

        const espera = esperaDelReintento(n);
        // El techo por lectura acota cada intento; este acota la suma. Sin él,
        // cuatro lecturas colgadas dan 37 s de splash: acotado y aun así
        // inaceptable.
        if (espera === null || seAgotoElTiempo(Date.now() - inicio)) break;
        await dormir(espera);
        if (!vivo) return;
      }

      // Se agotaron los reintentos. La única cosa que puede convertir esto en
      // una entrada es un visto bueno guardado, y ese solo existe si alguna vez
      // se leyeron del servidor los tres consentimientos de la puerta en este
      // teléfono. Regla de la casa: no poder LEER no es "no consintió", así que
      // a quien ya entró antes no se le cierra la puerta por un fallo de red.
      const vistoBueno = await leerVistoBueno(userId);
      if (!vivo) return;
      setFase(decidirTrasFalloDefinitivo(vistoBueno));
    })();

    return () => { vivo = false; };
  }, [session?.user?.id, loading, reintentoManual]);

  if (loading || (session && fase === 'verificando')) {
    return (
      <View style={styles.splash}>
        <Image source={logoVertical} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
      </View>
    );
  }

  // Sin sesión → login. El onboarding post-signup vive en /onboarding/v2/*.
  if (!session) return <Redirect href="/login" />;

  if (fase === 'sin_conexion') {
    return (
      <View style={styles.splash}>
        <Image source={logoVertical} style={styles.logo} resizeMode="contain" />
        <EliteText variant="subtitle" style={styles.falloTitulo}>{COPY_SIN_CONEXION.titulo}</EliteText>
        <EliteText variant="body" style={styles.falloCuerpo}>{COPY_SIN_CONEXION.cuerpo}</EliteText>
        <Pressable
          style={styles.botonPrimario}
          onPress={() => setReintentoManual((n) => n + 1)}
          accessibilityRole="button"
        >
          <EliteText variant="body" style={styles.botonPrimarioTexto}>
            {COPY_SIN_CONEXION.reintentar}
          </EliteText>
        </Pressable>
        <Pressable style={styles.botonSecundario} onPress={signOut} accessibilityRole="button">
          <EliteText variant="caption" style={styles.botonSecundarioTexto}>
            {COPY_SIN_CONEXION.salir}
          </EliteText>
        </Pressable>
      </View>
    );
  }

  // La puerta legal. Vive en su propia pantalla y no aquí porque la pide
  // gente que YA tiene cuenta y datos dentro: merece un lugar donde se le
  // explique qué pasó, no un modal encima del splash.
  if (fase === 'faltan_consentimientos') {
    return <Redirect href="/consentimientos" />;
  }

  if (fase === 'falta_onboarding') {
    return <Redirect href={rutaOnboarding ?? '/onboarding/v2/welcome'} />;
  }
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 280,
    height: 280,
  },
  loader: {
    marginTop: 24,
  },
  // CONSENT: la pantalla del fallo. Es corta a propósito — dice qué pasó, por
  // qué suele pasar y qué hacer. No pide reportar nada ni muestra un código de
  // error: quien la ve está intentando abrir su app, no depurarla.
  falloTitulo: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  falloCuerpo: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  botonPrimario: {
    marginTop: Spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: Colors.neonGreen,
  },
  botonPrimarioTexto: {
    color: Colors.textOnGreen,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
  },
  // La salida. Sin ella, alguien con una sesión rota se queda encerrado en
  // esta pantalla y su único recurso es desinstalar.
  botonSecundario: {
    marginTop: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  botonSecundarioTexto: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
  },
});
