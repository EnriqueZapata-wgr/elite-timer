/**
 * Index — Redirect según estado de autenticación y onboarding.
 * Mientras verifica, muestra logo vertical ATP con loader.
 *
 * CONSENT: este archivo es EL GATE. Nadie entra a las pestañas sin haber
 * aceptado CB-2 (datos sensibles), CB-3 (transferencia internacional) y CB-4
 * (mayoría de edad), que se firman en /onboarding/v2/privacy. La marca de
 * "este ya pasó" es `profiles.onboarding_step === 'completed'` y NO
 * `user_consent_log`: ver el encabezado de acceso-consentido-core.ts para el
 * porqué (resumen: la 032 marcó completados a todos los usuarios previos y la
 * tabla de consentimientos nace 177 migraciones después, vacía).
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
  autorizaEntrada,
  decidirTrasFalloDefinitivo,
  esperaDelReintento,
  TECHO_LECTURA_MS,
  COPY_SIN_CONEXION,
  type FaseAcceso,
} from '@/src/services/acceso-consentido-core';
import { marcarVistoBueno, leerVistoBueno } from '@/src/services/acceso-consentido';
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
 * es `ok:true` con `paso: undefined`, y `autorizaEntrada` lo rechaza, que es
 * lo correcto: sin perfil no hay consentimientos asentados. Ese caso ya había
 * abierto la puerta una vez, cuando `.single()` lo convertía en excepción.
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
      for (let n = 0; ; n++) {
        const lectura = await leerPasoDelPerfil(userId);
        if (!vivo) return;

        if (lectura.ok) {
          if (autorizaEntrada({ paso: lectura.paso })) {
            // El visto bueno se marca AQUÍ y en memoria de forma síncrona,
            // antes de cualquier redirect: el guard de app/(tabs)/_layout.tsx
            // lo lee en el mismo frame y por eso no hay parpadeo ni una
            // segunda consulta de red.
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
          } else {
            // Onboarding v2 (F2 sprint UX blockers): 'v2_<step>' → su pantalla;
            // valores legacy v1 → reiniciar en v2 welcome (los datos ya
            // capturados persisten y las pantallas v2 los prefillan).
            setRutaOnboarding(resolveOnboardingRoute(lectura.paso) ?? '/onboarding/v2/welcome');
            setFase('falta_onboarding');
          }
          return;
        }

        const espera = esperaDelReintento(n);
        if (espera === null) break;
        await dormir(espera);
        if (!vivo) return;
      }

      // Se agotaron los reintentos. La única cosa que puede convertir esto en
      // una entrada es un visto bueno guardado, y ese solo existe si alguna vez
      // se leyó 'completed' del servidor en este teléfono.
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
