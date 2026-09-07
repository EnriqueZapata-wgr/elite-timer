/**
 * Primera sesión · pantalla 2 de 6 — TRES PREGUNTAS.
 * Pivote limpio, 7 de septiembre de 2026 (sección 6 del plan).
 *
 * Qué se pregunta, y por qué solo esto:
 *   1. ¿Qué quieres cambiar primero?  → de aquí sale el objetivo que la app
 *      propone en la pantalla siguiente.
 *   2 y 3. ¿A qué hora despiertas y a qué hora te duermes? → con eso cada
 *      hábito y cada aviso se anclan a tu día real. Es la diferencia entre un
 *      recordatorio útil y uno que se ignora.
 *
 * Es el mismo mecanismo de /packs/armar (misma rueda de horas, mismo prefill
 * desde el cronotipo, mismo criterio de ciclo) puesto al principio de todo, y
 * preguntando por el síntoma en lugar de por el catálogo: veinte tarjetas no
 * son una pregunta. La propuesta, con su señal, llega en la pantalla 3.
 *
 * Nada de esta pantalla escribe: solo lee. Lo que se elige viaja por la URL
 * hasta que la pantalla 4 lo aplica de verdad.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { TimeWheelPicker } from '@/src/components/ui/TimeWheelPicker';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';
import { useAuth } from '@/src/contexts/auth-context';
import {
  intencionesVisibles,
  numeroDePantalla,
  TOTAL_PANTALLAS_PRIMERA_SESION,
  type IntencionInicial,
} from '@/src/services/primera-sesion-core';
import { leerCicloVisible, leerHorarioSugerido } from '@/src/services/primera-sesion-service';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';

export default function PreguntasScreen() {
  const router = useRouter();
  const { user, loading: cargandoSesion } = useAuth();
  const th = useOnboardingTheme();

  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  const [cicloVisible, setCicloVisible] = useState<boolean | null>(null);
  const [elegida, setElegida] = useState<IntencionInicial | null>(null);
  const [despertar, setDespertar] = useState('07:00');
  const [dormir, setDormir] = useState('23:00');
  const [picker, setPicker] = useState<'despertar' | 'dormir' | null>(null);
  const [avanzando, setAvanzando] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let vivo = true;
    setCargando(true);
    (async () => {
      const [visible, horario] = await Promise.all([
        leerCicloVisible(userId),
        leerHorarioSugerido(userId),
      ]);
      if (!vivo) return;
      setCicloVisible(visible);
      setDespertar(horario.despertar);
      setDormir(horario.dormir);
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, [user?.id, intento]);

  const intenciones = intencionesVisibles(cicloVisible);

  // Esta pantalla NO anota el paso en la base, y es a propósito: todavía no
  // hay nada durable que reanudar. Lo elegido viaja por la URL hasta la
  // pantalla 4, que es la que escribe. Si alguien cierra la app aquí, vuelve a
  // estas mismas tres preguntas, que son dos toques, en vez de aterrizar en
  // una pantalla a la que le faltan sus datos.
  const continuar = () => {
    if (!user?.id || !elegida || avanzando) return;
    setAvanzando(true);
    haptic.medium();
    router.replace({
      pathname: '/primera-sesion/objetivo',
      params: { intencion: elegida.id, despertar, dormir },
    });
    setAvanzando(false);
  };

  // Sesión vencida: sin usuario el efecto se sale y el spinner se queda fijo
  // para siempre. Es el único atorón duro que tenía el flujo. A iniciar sesión.
  if (!cargandoSesion && !user?.id) return <Redirect href="/login" />;

  if (cargando) {
    return (
      <OnboardingShell step={numeroDePantalla('preguntas')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <ActivityIndicator color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
          <EliteText style={[s.cargandoTexto, th.sub]}>Un momento</EliteText>
        </View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step={numeroDePantalla('preguntas')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={[s.titulo, th.titulo]}>¿Qué quieres cambiar primero?</EliteText>
          <EliteText style={[s.subtitulo, th.sub]}>
            Elige lo que más te pesa hoy. Con eso te propongo un objetivo y armo
            tu app para eso. Se puede cambiar cuando quieras.
          </EliteText>
        </Animated.View>

        {intenciones.length === 0 ? (
          // Estado vacío real: no debería pasar (la lista es del código), pero
          // si algún día un filtro se los come, la persona ve una salida y no
          // una pantalla en blanco.
          <View style={[s.aviso, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
            <EliteText style={[s.avisoTexto, th.titulo]}>
              No hay objetivos que ofrecerte en esta versión.
            </EliteText>
            <AnimatedPressable onPress={() => setIntento((n) => n + 1)}>
              <EliteText style={[s.avisoAccion, th.acento != null && { color: th.acento }]}>Reintentar</EliteText>
            </AnimatedPressable>
          </View>
        ) : (
          intenciones.map((i, n) => {
            const activa = elegida?.id === i.id;
            return (
              <Animated.View key={i.id} entering={FadeInUp.delay(60 + n * 40).springify()}>
                <AnimatedPressable
                  style={[
                    s.tarjeta,
                    { backgroundColor: th.tokens.card, borderColor: activa ? ATP_BRAND.lime : th.tokens.borde },
                    activa && s.tarjetaActiva,
                  ]}
                  onPress={() => { haptic.light(); setElegida(i); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activa }}
                >
                  <View style={[s.icono, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
                    <AppIcon
                      name={i.icon}
                      size={20}
                      color={activa ? (th.dark ? ATP_BRAND.lime : th.tokens.tealTexto) : th.tokens.textoSecundario}
                    />
                  </View>
                  <EliteText style={[s.tarjetaTexto, th.titulo]}>{i.texto}</EliteText>
                  {activa && <Ionicons name="checkmark-circle" size={20} color={ATP_BRAND.lime} />}
                </AnimatedPressable>
              </Animated.View>
            );
          })
        )}

        {/* No se pudo leer el perfil: se dice, y se ofrece reintentar. No se
            bloquea la pantalla por esto, pero tampoco se calla: de esa lectura
            depende que aparezca el objetivo del ciclo. */}
        {cicloVisible === null && (
          <View style={[s.aviso, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
            <EliteText style={[s.avisoTexto, th.sub]}>
              No pudimos leer tu perfil, así que puede faltar un objetivo en
              esta lista.
            </EliteText>
            <AnimatedPressable onPress={() => { haptic.light(); setIntento((n) => n + 1); }} hitSlop={10}>
              <EliteText style={[s.avisoAccion, th.acento != null && { color: th.acento }]}>Reintentar</EliteText>
            </AnimatedPressable>
          </View>
        )}

        <Animated.View entering={FadeInUp.delay(180).springify()}>
          <EliteText style={[s.pregunta2, th.titulo]}>
            ¿A qué hora despiertas y a qué hora te duermes?
          </EliteText>
          <EliteText style={[s.subtitulo, th.sub]}>
            Con esto anclamos cada hábito y cada aviso a tu día real.
          </EliteText>
          <View style={[s.grupoHoras, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
            <AnimatedPressable
              style={[s.filaHora, s.filaDivisor, { borderBottomColor: th.tokens.borde }]}
              onPress={() => { haptic.light(); setPicker('despertar'); }}
            >
              <AppIcon name="sol" size={18} color={th.tokens.textoSecundario} />
              <EliteText style={[s.horaLabel, th.titulo]}>Despierto a las</EliteText>
              <EliteText style={[s.horaValor, { color: th.dark ? ATP_BRAND.lime : th.tokens.tealTexto }]}>
                {despertar}
              </EliteText>
            </AnimatedPressable>
            <AnimatedPressable
              style={s.filaHora}
              onPress={() => { haptic.light(); setPicker('dormir'); }}
            >
              <AppIcon name="sueno" size={18} color={th.tokens.textoSecundario} />
              <EliteText style={[s.horaLabel, th.titulo]}>Me duermo a las</EliteText>
              <EliteText style={[s.horaValor, { color: th.dark ? ATP_BRAND.lime : th.tokens.tealTexto }]}>
                {dormir}
              </EliteText>
            </AnimatedPressable>
          </View>
        </Animated.View>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <View style={s.barraInferior}>
        <AnimatedPressable
          style={[s.cta, !elegida && th.ctaDisabled]}
          onPress={continuar}
          disabled={!elegida || avanzando}
        >
          <EliteText style={[s.ctaTexto, !elegida && { opacity: 0.4 }]}>
            {avanzando ? 'Un momento' : 'Continuar'}
          </EliteText>
          {!avanzando && (
            <Ionicons
              name="arrow-forward"
              size={18}
              color={elegida ? TEXT_COLORS.onAccent : th.arrowOff}
            />
          )}
        </AnimatedPressable>
      </View>

      <TimeWheelPicker
        visible={picker !== null}
        initialValue={(() => {
          const t = picker === 'dormir' ? dormir : despertar;
          const d = new Date();
          d.setHours(parseInt(t.split(':')[0], 10), parseInt(t.split(':')[1], 10), 0, 0);
          return d;
        })()}
        title={picker === 'dormir' ? 'Me duermo a las' : 'Despierto a las'}
        onConfirm={(date: Date) => {
          const t = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          if (picker === 'dormir') setDormir(t);
          else setDespertar(t);
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
      />
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  cargandoTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },

  titulo: { fontSize: 26, lineHeight: 32, fontFamily: Fonts.bold, marginTop: 20 },
  subtitulo: { fontSize: FontSizes.sm, lineHeight: 20, fontFamily: Fonts.regular, marginTop: 8, marginBottom: Spacing.md },

  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: Radius.lg, padding: 14, marginBottom: 10,
  },
  tarjetaActiva: { borderWidth: 1.5 },
  icono: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  tarjetaTexto: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, lineHeight: 20 },

  aviso: {
    borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md,
    gap: 8, marginTop: Spacing.xs, marginBottom: Spacing.sm,
  },
  avisoTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 18 },
  avisoAccion: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },

  pregunta2: { fontSize: 20, lineHeight: 26, fontFamily: Fonts.bold, marginTop: Spacing.lg },
  grupoHoras: { borderWidth: 0.5, borderRadius: Radius.lg, overflow: 'hidden' },
  filaHora: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  filaDivisor: { borderBottomWidth: 0.5 },
  horaLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  horaValor: { fontFamily: Fonts.bold, fontSize: FontSizes.md },

  barraInferior: { paddingHorizontal: Spacing.md, paddingBottom: 32, paddingTop: Spacing.xs },
  cta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaTexto: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
});
