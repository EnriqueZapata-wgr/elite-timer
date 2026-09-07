/**
 * Primera sesión · pantalla 3 de 6 — TU OBJETIVO.
 * Pivote limpio, 7 de septiembre de 2026 (sección 6 del plan).
 *
 * ES LA PRIMERA VEZ QUE LA APP DEVUELVE ALGO. Antes del pivote, el primer
 * momento en que una cuenta nueva recibía algo suyo era el resultado de
 * cronotipo, en la pantalla 8. Aquí llega en la 3, y no es un resultado de
 * quiz: es el objetivo con su nombre y, sobre todo, con la SEÑAL que se va a
 * mover y en cuánto se nota.
 *
 * `mide` (PackSenal) existe en el registro desde hoy y hasta ahora no se
 * pintaba en ninguna pantalla. Esta es la pantalla que lo saca a la luz, y por
 * eso la señal no es un adorno del pie: es el renglón que va debajo del
 * nombre. La regla del documento de destinos es dura y esta pantalla la hace
 * verificable: un objetivo solo existe si la persona puede VER moverse algo
 * por seguirlo.
 *
 * Se puede cambiar. El botón no esconde el catálogo: lo ordena, con los
 * objetivos cercanos primero y los veinte disponibles debajo.
 *
 * Esta pantalla tampoco escribe nada. Aplicar es la 4.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';
import { useAuth } from '@/src/contexts/auth-context';
import {
  numeroDePantalla,
  TOTAL_PANTALLAS_PRIMERA_SESION,
  objetivoPropuesto,
  objetivosCercanos,
  objetivosVisibles,
} from '@/src/services/primera-sesion-core';
import { leerCicloVisible } from '@/src/services/primera-sesion-service';
import { PACK_BY_KEY, type PackDef } from '@/src/constants/packs';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';

export default function ObjetivoScreen() {
  const router = useRouter();
  const { user, loading: cargandoSesion } = useAuth();
  const th = useOnboardingTheme();
  const { intencion, despertar, dormir } = useLocalSearchParams<{
    intencion?: string; despertar?: string; dormir?: string;
  }>();

  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  const [cicloVisible, setCicloVisible] = useState<boolean | null>(null);
  const [elegido, setElegido] = useState<PackDef | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [avanzando, setAvanzando] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let vivo = true;
    setCargando(true);
    (async () => {
      const visible = await leerCicloVisible(userId);
      if (!vivo) return;
      setCicloVisible(visible);
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, [user?.id, intento]);

  // La propuesta sale de la intención; si no hay (URL rara, o el objetivo es
  // del ciclo y todavía no se sabe si le toca), se cae con elegancia al
  // primero de la lista visible en vez de tronar.
  const propuesto = useMemo(() => {
    const p = objetivoPropuesto(typeof intencion === 'string' ? intencion : null, cicloVisible);
    return p ?? objetivosVisibles(cicloVisible)[0] ?? null;
  }, [intencion, cicloVisible]);

  const objetivo = elegido ?? propuesto;
  const otros = useMemo(
    () => objetivosCercanos(typeof intencion === 'string' ? intencion : null, cicloVisible)
      .filter((p) => p.key !== objetivo?.key),
    [intencion, cicloVisible, objetivo?.key],
  );

  // Tampoco anota el paso: elegir no es aplicar. El primer hecho durable de
  // esta primera sesión lo escribe la pantalla 4.
  const continuar = () => {
    if (!user?.id || !objetivo || avanzando) return;
    setAvanzando(true);
    haptic.medium();
    router.replace({
      pathname: '/primera-sesion/armado',
      params: { objetivo: objetivo.key, despertar: despertar ?? '07:00', dormir: dormir ?? '23:00' },
    });
    setAvanzando(false);
  };

  // Sesión vencida: sin usuario el spinner se queda fijo. A iniciar sesión.
  if (!cargandoSesion && !user?.id) return <Redirect href="/login" />;

  if (cargando) {
    return (
      <OnboardingShell step={numeroDePantalla('objetivo')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <ActivityIndicator color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
          <EliteText style={[s.cargandoTexto, th.sub]}>Buscando tu objetivo</EliteText>
        </View>
      </OnboardingShell>
    );
  }

  // Estado vacío / no se pudo leer: sin objetivo no hay pantalla que pintar, y
  // la salida honesta es reintentar, no un texto de relleno.
  if (!objetivo) {
    return (
      <OnboardingShell step={numeroDePantalla('objetivo')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <EliteText style={[s.titulo, th.titulo, { textAlign: 'center' }]}>
            No pudimos preparar tu objetivo
          </EliteText>
          <EliteText style={[s.subtitulo, th.sub, { textAlign: 'center' }]}>
            Casi siempre es la conexión. Nada se perdió.
          </EliteText>
          <AnimatedPressable style={s.cta} onPress={() => { haptic.light(); setIntento((n) => n + 1); }}>
            <EliteText style={s.ctaTexto}>Reintentar</EliteText>
          </AnimatedPressable>
        </View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={numeroDePantalla('objetivo')}
      totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}
      onBack={cambiando ? () => setCambiando(false) : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {!cambiando ? (
          <>
            <Animated.View entering={FadeInUp.duration(400)}>
              <EliteText style={[s.antetitulo, th.sub]}>TU OBJETIVO</EliteText>
              <View style={s.encabezado}>
                <View style={[s.icono, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
                  <AppIcon name={objetivo.icon} size={26} color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
                </View>
                <EliteText style={[s.titulo, th.titulo]}>{objetivo.nombre}</EliteText>
              </View>
              <EliteText style={[s.subtitulo, th.sub]}>{objetivo.paraQuien}</EliteText>
            </Animated.View>

            {/* La señal. Es el renglón que justifica el objetivo: qué se va a
                mover y en cuánto se nota. Sin esto, un objetivo es un deseo. */}
            <Animated.View entering={FadeInUp.delay(120).springify()}>
              <View style={[s.senal, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
                <EliteText style={[s.senalEtiqueta, th.sub]}>LO QUE VAS A VER MOVERSE</EliteText>
                <EliteText style={[s.senalQue, th.titulo]}>{objetivo.mide.que}</EliteText>
                <View style={s.senalPie}>
                  <Ionicons name="time-outline" size={15} color={th.tokens.textoSecundario} />
                  <EliteText style={[s.senalCuando, th.sub]}>
                    Se empieza a notar en {objetivo.mide.seNotaEn.toLowerCase()}
                  </EliteText>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(180).springify()}>
              <EliteText style={[s.queEsperar, th.sub]}>{objetivo.queEsperar}</EliteText>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(240).springify()}>
              <AnimatedPressable
                style={[s.cambiar, { borderColor: th.tokens.borde }]}
                onPress={() => { haptic.light(); setCambiando(true); }}
              >
                <EliteText style={[s.cambiarTexto, th.titulo]}>Prefiero otro objetivo</EliteText>
                <Ionicons name="chevron-forward" size={16} color={th.tokens.textoSecundario} />
              </AnimatedPressable>
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View entering={FadeInUp.duration(300)}>
              <EliteText style={[s.titulo, th.titulo]}>Elige tu objetivo</EliteText>
              <EliteText style={[s.subtitulo, th.sub]}>
                Los primeros son los más cercanos a lo que contestaste. Están
                todos los que puedes elegir hoy.
              </EliteText>
            </Animated.View>
            {otros.length === 0 ? (
              <View style={[s.senal, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
                <EliteText style={[s.senalQue, th.titulo]}>
                  No hay otros objetivos disponibles en esta versión.
                </EliteText>
              </View>
            ) : (
              otros.map((p, i) => (
                <Animated.View key={p.key} entering={FadeInUp.delay(40 + i * 30).springify()}>
                  <AnimatedPressable
                    style={[s.opcion, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}
                    onPress={() => { haptic.light(); setElegido(PACK_BY_KEY[p.key] ?? p); setCambiando(false); }}
                  >
                    <View style={[s.iconoChico, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
                      <AppIcon name={p.icon} size={18} color={th.tokens.textoSecundario} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[s.opcionNombre, th.titulo]}>{p.nombre}</EliteText>
                      <EliteText style={[s.opcionSenal, th.sub]}>{p.mide.que}</EliteText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={th.tokens.textoSecundario} />
                  </AnimatedPressable>
                </Animated.View>
              ))
            )}
          </>
        )}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {!cambiando && (
        <View style={s.barraInferior}>
          <AnimatedPressable style={s.cta} onPress={continuar} disabled={avanzando}>
            <EliteText style={s.ctaTexto}>{avanzando ? 'Un momento' : 'Este es mi objetivo'}</EliteText>
            {!avanzando && <Ionicons name="arrow-forward" size={18} color={TEXT_COLORS.onAccent} />}
          </AnimatedPressable>
        </View>
      )}
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.lg },
  cargandoTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },

  antetitulo: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2, marginTop: 20 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  icono: {
    width: 52, height: 52, borderRadius: 16, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  iconoChico: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  titulo: { flex: 1, fontSize: 26, lineHeight: 32, fontFamily: Fonts.bold },
  subtitulo: { fontSize: FontSizes.sm, lineHeight: 20, fontFamily: Fonts.regular, marginTop: 10 },

  senal: {
    borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md,
    marginTop: Spacing.lg, gap: 8,
  },
  senalEtiqueta: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2 },
  senalQue: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, lineHeight: 23 },
  senalPie: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  senalCuando: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },

  queEsperar: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 21, marginTop: Spacing.lg },

  cambiar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 0.5, borderRadius: Radius.lg, paddingHorizontal: Spacing.md,
    paddingVertical: 14, marginTop: Spacing.lg,
  },
  cambiarTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderRadius: Radius.lg, padding: 12, marginBottom: 10,
  },
  opcionNombre: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  opcionSenal: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 17, marginTop: 3 },

  barraInferior: { paddingHorizontal: Spacing.md, paddingBottom: 32, paddingTop: Spacing.xs },
  cta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaTexto: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
});
