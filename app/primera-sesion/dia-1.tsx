/**
 * Primera sesión · pantalla 6 de 6 — TU DÍA 1.
 * Pivote limpio, 7 de septiembre de 2026 (sección 6 del plan).
 *
 * EL PREMIO POR TERMINAR YA NO ES OTRA TAREA. Antes, quien llegaba a HOY se
 * encontraba con "sube tu primer estudio", que casi nadie trae a la mano.
 * Aquí lo que hay son TRES cosas concretas, ya encendidas, con su hora, y
 * arriba de todo la señal: qué se va a mover por hacerlas y en cuánto se nota.
 *
 * Nada de esta pantalla se inventa: las tres salen de la fila que la pantalla
 * 4 escribió en `user_packs`, reconstruida con `planDeFila`. Si la fila no se
 * puede leer, se dice; si el objetivo no encendió nada, también. Un día 1
 * fabricado sería peor que no tenerlo.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon, hasAppIcon } from '@/src/components/ui/AppIcon';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';
import { useAuth } from '@/src/contexts/auth-context';
import {
  numeroDePantalla,
  TOTAL_PANTALLAS_PRIMERA_SESION,
} from '@/src/services/primera-sesion-core';
import { completarPaso } from '@/src/services/primera-sesion-service';
import { getUserPacks } from '@/src/services/pack-service';
import { planDeFila } from '@/src/services/pack-core';
import { PACK_BY_KEY, type PackDef } from '@/src/constants/packs';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';

/** Tres es el número: cuatro ya es una lista de pendientes el primer día. */
const CUANTAS = 3;

interface Cosa {
  electron: string;
  nombre: string;
  icon: AppIconName;
  hora: string | null;
}

type Fase = 'cargando' | 'sin_lectura' | 'listo';

export default function Dia1Screen() {
  const router = useRouter();
  const { user, loading: cargandoSesion } = useAuth();
  const th = useOnboardingTheme();
  const analytics = useAnalytics();

  const [fase, setFase] = useState<Fase>('cargando');
  const [intento, setIntento] = useState(0);
  const [objetivo, setObjetivo] = useState<PackDef | null>(null);
  const [cosas, setCosas] = useState<Cosa[]>([]);
  const [avanzando, setAvanzando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let vivo = true;
    setFase('cargando');
    (async () => {
      // null = FALLO de lectura. No es "no tiene objetivo": son dos hechos
      // distintos y aquí llevan a dos pantallas distintas.
      const filas = await getUserPacks(userId);
      if (!vivo) return;
      if (filas === null) { setFase('sin_lectura'); return; }
      const fila = [...filas]
        .filter((f) => f.active)
        .sort((a, b) => (b.activated_at ?? '').localeCompare(a.activated_at ?? ''))[0];
      const pack = fila ? PACK_BY_KEY[fila.pack_key] ?? null : null;
      const plan = fila ? planDeFila(fila) : null;
      setObjetivo(pack);
      setCosas(
        (plan?.encendidos ?? []).slice(0, CUANTAS).map((e) => {
          const meta = ELECTRON_WEIGHTS[e as ElectronSource];
          return {
            electron: e,
            nombre: meta?.name ?? e,
            // El icono viaja como string en el registro de electrones: se
            // estrecha con el guardia del propio mapa en vez de forzar el tipo.
            icon: meta?.icon != null && hasAppIcon(meta.icon) ? meta.icon : 'ajustes',
            hora: plan?.habitTimes[e] ?? null,
          };
        }),
      );
      setFase('listo');
    })();
    return () => { vivo = false; };
  }, [user?.id, intento]);

  /**
   * El cierre de verdad. `completarPaso` reintenta la escritura de 'completed'
   * y solo devuelve ok cuando la fila existe: `onboardingTerminado` no acepta
   * otra cosa, así que darlo por bueno sin la fila mandaría a la persona de
   * vuelta a las tres preguntas en el siguiente arranque en frío, después de
   * cuatro minutos de trabajo. Si no entra, se dice y se puede reintentar.
   */
  const empezar = async () => {
    const userId = user?.id;
    if (!userId || avanzando) return;
    setAvanzando(true);
    setErrorCierre(null);
    try {
      const paso = await completarPaso(userId, 'dia-1');
      if (!paso.ok) {
        haptic.warning();
        setErrorCierre(paso.detalle);
        return;
      }
      analytics.track(ATP_EVENTS.ONBOARDING_COMPLETED, { flujo: 'primera_sesion_6' });
      haptic.success();
      router.replace(paso.ruta);
    } finally {
      setAvanzando(false);
    }
  };

  // Sesión vencida: sin usuario esta pantalla gira para siempre. A iniciar sesión.
  if (!cargandoSesion && !user?.id) return <Redirect href="/login" />;

  if (fase === 'cargando') {
    return (
      <OnboardingShell step={numeroDePantalla('dia-1')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <ActivityIndicator size="large" color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
        </View>
      </OnboardingShell>
    );
  }

  if (fase === 'sin_lectura') {
    return (
      <OnboardingShell step={numeroDePantalla('dia-1')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <Ionicons name="cloud-offline-outline" size={28} color={th.tokens.textoSecundario} />
          <EliteText style={[s.titulo, th.titulo, s.centrado]}>No pudimos leer tu día 1</EliteText>
          <EliteText style={[s.subtitulo, th.sub, s.centrado]}>
            Tu objetivo ya quedó guardado. Casi siempre es la conexión.
          </EliteText>
          <AnimatedPressable style={s.cta} onPress={() => { haptic.light(); setIntento((n) => n + 1); }}>
            <EliteText style={s.ctaTexto}>Reintentar</EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={s.saltar} onPress={empezar} disabled={avanzando} hitSlop={8}>
            <EliteText style={[s.saltarTexto, th.sub]}>
              {avanzando ? 'Un momento' : 'Entrar a la app'}
            </EliteText>
          </AnimatedPressable>
          {errorCierre && (
            <EliteText style={[s.nota, s.centrado, { color: th.tokens.error }]}>{errorCierre}</EliteText>
          )}
        </View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step={numeroDePantalla('dia-1')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={[s.antetitulo, th.sub]}>TU DÍA 1</EliteText>
          {/* Con la lista vacía NO se dice "ya quedó lista": se llega aquí
              cuando el armado no entró y la persona decidió seguir de todos
              modos, y felicitarla por eso sería mentirle. */}
          <EliteText style={[s.titulo, th.titulo]}>
            {cosas.length > 0 ? 'Esto ya está encendido' : 'Todavía no hay nada encendido'}
          </EliteText>
        </Animated.View>

        {/* La señal, arriba: es lo que le da sentido a las tres cosas de abajo. */}
        {objetivo && (
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <View style={[s.senal, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
              <View style={s.senalEncabezado}>
                <AppIcon name={objetivo.icon} size={18} color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
                <EliteText style={[s.senalObjetivo, th.titulo]}>{objetivo.nombre}</EliteText>
              </View>
              <EliteText style={[s.senalQue, th.titulo]}>{objetivo.mide.que}</EliteText>
              <EliteText style={[s.senalCuando, th.sub]}>
                Se empieza a notar en {objetivo.mide.seNotaEn.toLowerCase()}.
              </EliteText>
            </View>
          </Animated.View>
        )}

        {cosas.length === 0 ? (
          // Estado vacío real: hay objetivo pero no encendió hábitos, o no hay
          // objetivo. No se inventan tres cosas para llenar la pantalla.
          <Animated.View entering={FadeInUp.delay(160).springify()}>
            <View style={[s.senal, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
              <EliteText style={[s.texto, th.titulo]}>
                {objetivo
                  ? 'Tu día de hoy no tiene tareas nuevas de este objetivo. Lo que sigue vive en tus apps, y las tienes en tu sala.'
                  : 'Tu objetivo no llegó a aplicarse, así que tu día está vacío. Puedes armarlo cuando quieras desde el Centro, y nada de lo que diste se perdió.'}
              </EliteText>
            </View>
          </Animated.View>
        ) : (
          <>
            <EliteText style={[s.seccion, th.sub]}>TRES COSAS, YA PUESTAS</EliteText>
            {cosas.map((c, i) => (
              <Animated.View key={c.electron} entering={FadeInUp.delay(160 + i * 60).springify()}>
                <View style={[s.cosa, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
                  <View style={[s.icono, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
                    <AppIcon name={c.icon} size={20} color={th.tokens.textoSecundario} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.cosaNombre, th.titulo]}>{c.nombre}</EliteText>
                    <EliteText style={[s.cosaHora, th.sub]}>
                      {c.hora ? `A las ${c.hora}` : 'Cuando toque, dentro de su app'}
                    </EliteText>
                  </View>
                  <Ionicons name="checkmark-circle-outline" size={20} color={ATP_BRAND.lime} />
                </View>
              </Animated.View>
            ))}
            <EliteText style={[s.nota, th.sub]}>
              Ya están en tu día, a esa hora. Las que se anclan al sol se mueven
              con tu ventana buena de sol. Se pueden cambiar cuando quieras, y no
              tienes que configurar nada más para empezar.
            </EliteText>
          </>
        )}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <View style={s.barraInferior}>
        {errorCierre && (
          <EliteText style={[s.nota, { color: th.tokens.error }]}>{errorCierre}</EliteText>
        )}
        <AnimatedPressable style={s.cta} onPress={empezar} disabled={avanzando}>
          <EliteText style={s.ctaTexto}>
            {avanzando ? 'Un momento' : errorCierre ? 'Reintentar' : 'Empezar'}
          </EliteText>
          {!avanzando && !errorCierre && (
            <Ionicons name="arrow-forward" size={18} color={TEXT_COLORS.onAccent} />
          )}
        </AnimatedPressable>
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.lg },
  centrado: { textAlign: 'center' },

  antetitulo: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2, marginTop: 24 },
  titulo: { fontSize: 26, lineHeight: 32, fontFamily: Fonts.bold, marginTop: 6 },
  subtitulo: { fontSize: FontSizes.sm, lineHeight: 21, fontFamily: Fonts.regular, marginTop: 10 },

  senal: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, gap: 8, marginTop: Spacing.md },
  senalEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  senalObjetivo: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  senalQue: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, lineHeight: 22 },
  senalCuando: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },

  seccion: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2, marginTop: Spacing.lg, marginBottom: 8 },
  cosa: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderRadius: Radius.lg, padding: 14, marginBottom: 10,
  },
  icono: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  cosaNombre: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  cosaHora: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 3 },
  texto: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20 },
  nota: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 17, marginTop: 4 },

  barraInferior: { paddingHorizontal: Spacing.md, paddingBottom: 28, paddingTop: Spacing.xs },
  cta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaTexto: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
  saltar: { paddingVertical: 12, alignItems: 'center' },
  saltarTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
});
