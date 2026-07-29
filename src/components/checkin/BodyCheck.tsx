/**
 * BodyCheck — el cuerpo, donde sí tiene sentido (MB-14 · Pieza 2).
 *
 * El mapa corporal deja de ser puerta de entrada (solo ofrecía estados
 * negativos: pecho apretado, mandíbula, nudo, todo apagado — si alguien se
 * siente bien, ninguna aplica) y se vuelve un paso OPCIONAL que aparece
 * únicamente tras elegir una emoción de cuadrante desagradable con intensidad
 * alta (regla en emotion-grid-core.shouldOfferBodyMap). Ahí sí aplica, ahí sí
 * ayuda, y ahí sí las cuatro zonas que existen son las correctas.
 *
 * Siempre hay salida sin contestar. La zona elegida NO se persiste (no hay
 * columna): el valor del paso es dirigir la atención al cuerpo, no el dato.
 *
 * Respaldo: Nummenmaa et al. (PNAS 2014) — mapas corporales universales.
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { BODY_ZONES, type BodyZone } from '@/src/data/emotion-wheel-config';
import {
  BODY_STEP_TITLE, BODY_STEP_SUB, BODY_STEP_SKIP, BODY_STEP_CONTINUE,
} from '@/src/data/emotion-grid-config';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { BG, BORDER, TEXT, TEXT_COLORS, withOpacity } from '@/src/constants/brand';

interface Props {
  /** Color del cuadrante activo — tiñe la selección y el CTA. */
  color: string;
  /** Se llama SIEMPRE (con zona o sin ella): el paso jamás bloquea el flujo. */
  onDone: (zoneKey: string | null) => void;
}

export function BodyCheck({ color, onDone }: Props) {
  const [zone, setZone] = useState<BodyZone | null>(null);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <EliteText style={styles.title}>{BODY_STEP_TITLE}</EliteText>
        <EliteText variant="caption" style={styles.sub}>{BODY_STEP_SUB}</EliteText>

        {BODY_ZONES.map((z) => {
          const selected = zone?.key === z.key;
          return (
            <Pressable
              key={z.key}
              onPress={() => { haptic.light(); setZone(selected ? null : z); }}
              style={[
                styles.zoneCard,
                selected && { borderColor: withOpacity(color, 0.7), backgroundColor: withOpacity(color, 0.12) },
              ]}
            >
              <EliteText variant="body" style={styles.zoneLabel}>{z.label}</EliteText>
              <EliteText variant="caption" style={styles.zoneDetail}>{z.detail}</EliteText>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => { haptic.medium(); onDone(zone?.key ?? null); }}
          style={[styles.continueBtn, { backgroundColor: color }]}
        >
          <EliteText style={styles.continueText}>{BODY_STEP_CONTINUE}</EliteText>
        </Pressable>
        <Pressable
          onPress={() => { haptic.light(); onDone(null); }}
          style={styles.skipLink}
          hitSlop={8}
        >
          <EliteText variant="caption" style={styles.skipText}>{BODY_STEP_SKIP}</EliteText>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { color: TEXT.primary, fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  sub: { color: TEXT.secondary, fontSize: FontSizes.md, lineHeight: 20, marginTop: 4, marginBottom: Spacing.md },

  zoneCard: {
    backgroundColor: BG.card, borderWidth: 1, borderColor: BORDER.card,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: 2,
  },
  zoneLabel: { color: TEXT.primary, fontSize: FontSizes.lg, fontFamily: Fonts.semiBold },
  zoneDetail: { color: TEXT.secondary, fontSize: FontSizes.sm, lineHeight: 18 },

  continueBtn: {
    alignSelf: 'center', marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl + Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
  },
  continueText: {
    color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold,
    fontSize: FontSizes.md, letterSpacing: 2,
  },
  skipLink: { alignSelf: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  skipText: { color: TEXT.secondary, fontSize: FontSizes.md, textDecorationLine: 'underline' },
});
