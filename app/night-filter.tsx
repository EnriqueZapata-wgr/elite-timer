/**
 * MB-30B Pieza 1 — Filtro nocturno de sistema.
 *
 * Android: overlay real encima de TODO el teléfono (tipo Twilight), con
 * progresión ámbar → naranja → rojo anclada al corte de pantallas del
 * usuario. El permiso de superposición se pide SOLO al activar (con una
 * línea que explica qué hace), el filtro SIEMPRE se apaga de un toque y
 * mientras corre hay un aviso persistente del sistema con "Apagar filtro".
 *
 * iOS: ninguna app puede dibujar encima de otras — la pantalla es una guía
 * honesta para dejar configurados los Atajos del sistema + Night Shift. El
 * copy vive en ios-guide-copy.ts y tiene barrido de honestidad en tests.
 */
import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Platform, Alert, AppState, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { EliteText } from '@/components/elite-text';
import { EliteToggle } from '@/components/elite-toggle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ui } from '@/src/components/settings/settings-ui';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getHabitTime } from '@/src/services/hoy/habit-times-service';
import {
  nightFilterAvailable, canDrawOverlays, openOverlaySettings,
  isNightFilterEnabled, enableNightFilter, disableNightFilter,
} from '@/src/services/night-filter-service';
import {
  NIGHT_FILTER_RAMP, NIGHT_FILTER_END_MINUTES, NIGHT_FILTER_FALLBACK_CUTOFF,
  minutesToHHMM,
} from '@/src/services/night-filter-core';
import { timeToMinutes } from '@/src/services/notification-prefs-core';
import { IOS_GUIDE_INTRO, IOS_GUIDE_STEPS, IOS_GUIDE_FOOTER } from '@/src/components/night-filter/ios-guide-copy';
import { Colors, Fonts, Spacing, Radius, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';

export default function NightFilterScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cutoff, setCutoff] = useState<string>('21:45');
  const [enabled, setEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [busy, setBusy] = useState(false);
  // El usuario intentó encender pero faltaba el permiso: al volver de
  // Ajustes con el permiso concedido, se completa el encendido solo.
  const pendingEnable = useRef(false);

  const available = nightFilterAvailable();
  const cutoffMin = timeToMinutes(cutoff) ?? NIGHT_FILTER_FALLBACK_CUTOFF;

  useEffect(() => {
    if (user?.id) {
      getHabitTime(user.id, 'screen_time_cutoff').then(setCutoff).catch(() => { /* fallback */ });
    }
    isNightFilterEnabled().then(setEnabled);
    setHasPermission(canDrawOverlays());
  }, [user?.id]);

  // Re-chequear el permiso al volver de los Ajustes del sistema.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (s) => {
      if (s !== 'active') return;
      const granted = canDrawOverlays();
      setHasPermission(granted);
      if (granted && pendingEnable.current && user?.id) {
        pendingEnable.current = false;
        const res = await enableNightFilter(user.id);
        if (res.ok) {
          setEnabled(true);
          haptic.success();
        }
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  function askOverlayPermission() {
    // Una línea que explica qué hace el permiso, ANTES de mandar a Ajustes.
    Alert.alert(
      'Permiso de superposición',
      'Permite que ATP pinte un filtro de color encima de las demás apps. Solo se usa para este filtro nocturno.',
      [
        { text: 'Ahora no', style: 'cancel', onPress: () => { pendingEnable.current = false; } },
        { text: 'Ir a Ajustes', onPress: () => openOverlaySettings() },
      ],
    );
  }

  async function onToggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (!next) {
        // APAGAR SIEMPRE FUNCIONA: sin permisos, sin red, sin condiciones.
        await disableNightFilter();
        setEnabled(false);
        haptic.light();
        return;
      }
      if (!user?.id) return;
      const res = await enableNightFilter(user.id);
      if (res.ok) {
        setEnabled(true);
        haptic.success();
      } else if (res.reason === 'permission') {
        pendingEnable.current = true;
        askOverlayPermission();
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Rama iOS: la guía honesta ──
  if (Platform.OS === 'ios') {
    return (
      <View style={ui.screenRoot}>
        <StatusBar style="light" />
        <ScreenHeader title="Filtro nocturno" onBack={() => router.back()} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.hero}>
            <AppIcon name="off-pantallas" size={40} color={ATP_BRAND.amber} />
            <EliteText variant="subtitle" style={styles.heroTitle}>{IOS_GUIDE_INTRO.title}</EliteText>
            <EliteText variant="caption" style={styles.heroBody}>{IOS_GUIDE_INTRO.body}</EliteText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(140).springify()} style={styles.cutoffCard}>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            <EliteText variant="caption" style={styles.cutoffText}>
              Tu corte de pantallas en ATP: {cutoff}. Úsalo como hora de la automatización.
            </EliteText>
          </Animated.View>

          {IOS_GUIDE_STEPS.map((step, i) => (
            <Animated.View
              key={step.title}
              entering={FadeInUp.delay(190 + i * 40).springify()}
              style={styles.stepCard}
            >
              <View style={styles.stepBadge}>
                <EliteText variant="caption" style={styles.stepNumber}>{i + 1}</EliteText>
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={styles.stepTitle}>{step.title}</EliteText>
                <EliteText variant="caption" style={styles.stepBody}>{step.body}</EliteText>
              </View>
            </Animated.View>
          ))}

          <Animated.View entering={FadeInUp.delay(200 + IOS_GUIDE_STEPS.length * 40).springify()}>
            <AnimatedPressable
              style={styles.shortcutsBtn}
              onPress={() => {
                haptic.medium();
                Linking.openURL('shortcuts://').catch(() => {
                  Alert.alert('Atajos', 'Busca la app Atajos en tu iPhone para empezar.');
                });
              }}
            >
              <Ionicons name="open-outline" size={18} color="#000" />
              <EliteText variant="body" style={styles.shortcutsBtnText}>Abrir Atajos</EliteText>
            </AnimatedPressable>
            <EliteText variant="caption" style={styles.footer}>{IOS_GUIDE_FOOTER}</EliteText>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Rama Android: el filtro real ──
  const rampPreview = NIGHT_FILTER_RAMP.map((s) => ({
    time: minutesToHHMM(cutoffMin + s.at),
    color: `rgba(${s.r},${s.g},${s.b},${Math.min(1, s.a + 0.25)})`, // +opacidad solo para que el swatch se vea
  }));

  return (
    <View style={ui.screenRoot}>
      <StatusBar style="light" />
      <ScreenHeader title="Filtro nocturno" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.hero}>
          <AppIcon name="off-pantallas" size={40} color={ATP_BRAND.amber} />
          <EliteText variant="subtitle" style={styles.heroTitle}>Luz cálida encima de todo</EliteText>
          <EliteText variant="caption" style={styles.heroBody}>
            Un filtro de color sobre todo el teléfono — no solo sobre ATP. Empieza en
            ámbar suave una hora antes de tu corte de pantallas, pasa por naranja y
            se asienta en rojo, hasta las {minutesToHHMM(NIGHT_FILTER_END_MINUTES)} de la mañana.
          </EliteText>
        </Animated.View>

        {!available && (
          <Animated.View entering={FadeInUp.delay(130).springify()} style={styles.warnCard}>
            <Ionicons name="cube-outline" size={18} color={ATP_BRAND.amber} />
            <EliteText variant="caption" style={styles.warnText}>
              Tu versión instalada de ATP aún no trae el módulo del filtro. Llega con la
              próxima actualización de la tienda — no hay nada que configurar todavía.
            </EliteText>
          </Animated.View>
        )}

        {available && (
          <>
            <Animated.View entering={FadeInUp.delay(130).springify()}>
              <EliteToggle
                label="Filtro nocturno"
                description={enabled
                  ? 'Encendido. Se pinta solo en su ventana y siempre lo puedes apagar aquí o desde el aviso.'
                  : 'Apagado. Nada se dibuja sobre tu pantalla.'}
                value={enabled}
                onValueChange={onToggle}
              />
            </Animated.View>

            {!hasPermission && (
              <Animated.View entering={FadeInUp.delay(170).springify()} style={styles.warnCard}>
                <Ionicons name="layers-outline" size={18} color={ATP_BRAND.amber} />
                <View style={{ flex: 1 }}>
                  <EliteText variant="caption" style={styles.warnText}>
                    {enabled
                      ? 'El permiso de superposición ya no está concedido: el filtro no puede pintar. Concédelo de nuevo o apágalo — la app funciona igual.'
                      : 'Para pintar encima de otras apps, Android pide el permiso de superposición. Se pide solo si enciendes el filtro, y ATP funciona completa sin él.'}
                  </EliteText>
                  <AnimatedPressable
                    style={styles.permBtn}
                    onPress={() => { haptic.medium(); askOverlayPermission(); }}
                  >
                    <EliteText variant="caption" style={styles.permBtnText}>Ir a Ajustes</EliteText>
                  </AnimatedPressable>
                </View>
              </Animated.View>
            )}

            <Animated.View entering={FadeInUp.delay(210).springify()} style={styles.rampCard}>
              <EliteText variant="caption" style={styles.rampTitle}>TU PROGRESIÓN</EliteText>
              <View style={styles.rampRow}>
                {rampPreview.map((p) => (
                  <View key={p.time} style={styles.rampStop}>
                    <View style={[styles.swatch, { backgroundColor: p.color }]} />
                    <EliteText variant="caption" style={styles.rampTime}>{p.time}</EliteText>
                  </View>
                ))}
              </View>
              <EliteText variant="caption" style={styles.rampHint}>
                Anclada a tu corte de pantallas ({cutoff}). Si cambias tu horario, el
                filtro se mueve contigo.
              </EliteText>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.noteCard}>
              <Ionicons name="notifications-outline" size={16} color={Colors.textSecondary} />
              <EliteText variant="caption" style={styles.noteText}>
                Mientras el filtro está encendido, Android muestra un aviso fijo con el
                botón "Apagar filtro". Ese aviso no se puede ocultar — es tu salida de
                un toque, siempre.
              </EliteText>
            </Animated.View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  heroTitle: {
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  heroBody: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  cutoffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cutoffText: {
    flex: 1,
    color: Colors.textSecondary,
  },
  stepCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ATP_BRAND.amber + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: ATP_BRAND.amber,
    fontFamily: Fonts.semiBold,
  },
  stepTitle: {
    fontFamily: Fonts.semiBold,
    marginBottom: 2,
  },
  stepBody: {
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  shortcutsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: ATP_BRAND.amber,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  shortcutsBtnText: {
    color: '#000',
    fontFamily: Fonts.semiBold,
  },
  footer: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  warnCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: ATP_BRAND.amber + '12',
    borderWidth: 0.5,
    borderColor: ATP_BRAND.amber + '44',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  warnText: {
    flex: 1,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  permBtn: {
    alignSelf: 'flex-start',
    backgroundColor: ATP_BRAND.amber,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginTop: Spacing.sm,
  },
  permBtnText: {
    color: '#000',
    fontFamily: Fonts.semiBold,
  },
  rampCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  rampTitle: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  rampRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rampStop: {
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  rampTime: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  rampHint: {
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  noteCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  noteText: {
    flex: 1,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
