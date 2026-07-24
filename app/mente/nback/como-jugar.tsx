/**
 * N-Back — cómo jugar (tutorial; primera vez es la puerta obligada a la
 * sesión con N=1 forzado — decisión #44-1).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { haptic } from '@/src/utils/haptics';
import { NBACK_CONFIG } from '@/src/services/nback-core';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: 'eye-outline',
    title: 'Dos estímulos a la vez',
    body: 'En cada turno se ilumina una celda del grid Y suena una letra. Son dos canales independientes: posición y sonido.',
  },
  {
    icon: 'time-outline',
    title: 'Compara con N turnos atrás',
    body: 'Con N=2: si la celda actual es la MISMA que hace 2 turnos, toca POSICIÓN. Si la letra actual es la MISMA que hace 2 turnos, toca SONIDO. Pueden coincidir los dos, uno o ninguno.',
  },
  {
    icon: 'trending-up-outline',
    title: 'El nivel se adapta a ti',
    body: `≥${NBACK_CONFIG.RAISE_THRESHOLD * 100}% en AMBOS canales → subes de nivel. <${NBACK_CONFIG.DROP_THRESHOLD * 100}% en cualquiera → baja para consolidar. En medio → te quedas. No hay techo: N=8+ es territorio de élite.`,
  },
  {
    icon: 'headset-outline',
    title: 'El sonido es obligatorio',
    body: 'Usa auriculares o pon el altavoz claro — necesitas distinguir las letras con precisión. Si tu teléfono está en silencio, reactiva el sonido antes de empezar.',
  },
  {
    icon: 'flash-outline',
    title: 'Tu constancia paga',
    body: `${NBACK_CONFIG.ROUNDS_PER_DAY} rounds al día (~20 min) por ${NBACK_CONFIG.CHALLENGE_DAYS} días. El primer round del día suma tu electrón en HOY; completar la sesión diaria, romper tu récord de N y sostener la racha suman H+.`,
  },
];

export default function NBackComoJugarScreen() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <StickyPillarBanner scrolled={scrolled} onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
        contentContainerStyle={s.scroll}
      >
        <View style={s.header}>
          <EliteText style={s.kicker}>N-BACK · TUTORIAL</EliteText>
          <EliteText style={s.title}>Cómo jugar</EliteText>
          <EliteText style={s.subtitle}>
            Dual N-Back: el único entrenamiento de memoria de trabajo con
            evidencia real de transferir a inteligencia fluida (Jaeggi 2008).
          </EliteText>
        </View>

        <View style={s.body}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.stepCard}>
              <View style={s.stepIcon}>
                <Ionicons name={step.icon as any} size={20} color={ATP_BRAND.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.stepTitle}>{step.title}</EliteText>
                <EliteText style={s.stepBody}>{step.body}</EliteText>
              </View>
            </View>
          ))}

          <AnimatedPressable
            style={s.startBtn}
            onPress={() => { haptic.medium(); router.replace('/mente/nback/sesion'); }}
          >
            <Ionicons name="play" size={18} color="#000" />
            <EliteText style={s.startText}>EMPEZAR</EliteText>
          </AnimatedPressable>
          <EliteText style={s.startHint}>
            Tu primera sesión arranca en N=1 para que aprendas la mecánica sin presión.
          </EliteText>

          <View style={{ height: Spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: Spacing.xxl },
  header: { paddingTop: 108, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  kicker: { color: '#7F77DD', fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { color: '#fff', fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: 1, marginTop: 2 },
  subtitle: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 20 },
  body: { paddingHorizontal: Spacing.md },

  stepCard: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  stepIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { color: '#fff', fontSize: FontSizes.md, fontFamily: Fonts.bold },
  stepBody: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 3, lineHeight: 19 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.pill,
    paddingVertical: 14, marginTop: Spacing.md,
  },
  startText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2 },
  startHint: {
    color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: 10,
  },
});
