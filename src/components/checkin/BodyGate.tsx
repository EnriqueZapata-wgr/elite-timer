/**
 * BodyGate — la puerta del CUERPO (MB-10 · Track B).
 *
 * No vive en un menú de modos: es la salida discreta de la rueda ("No sé cómo
 * se llama"). Zonas grandes en lenguaje de cuerpo → un par de familias
 * candidatas → el flujo continúa igual que la rueda (misma navegación, misma
 * estadística, misma salvaguarda).
 *
 * Respaldo: Nummenmaa et al. (PNAS 2014) — mapas corporales universales.
 * ⚠️ Acotamiento, nunca diagnóstico: "esto suele sentirse así", jamás
 * "lo que tienes es". El disclaimer está a la vista.
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import type { EmotionFamily } from '@/src/data/emotions-library';
import {
  BODY_ZONES, BODY_GATE_DISCLAIMER, FAMILY_LABELS, type BodyZone,
} from '@/src/data/emotion-wheel-config';
import { getWheelLayout, findFamilySector } from '@/src/services/emotion-wheel-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { BG, BORDER, TEXT, withOpacity } from '@/src/constants/brand';

interface Props {
  /** Familia elegida → la rueda entra a su sector y el flujo sigue igual. */
  onPickFamily: (family: EmotionFamily) => void;
  onClose: () => void;
}

export function BodyGate({ onPickFamily, onClose }: Props) {
  const [zone, setZone] = useState<BodyZone | null>(null);
  const layout = getWheelLayout();

  const familyColor = (fam: EmotionFamily) =>
    findFamilySector(layout, fam)?.color ?? TEXT.secondary;

  return (
    <Animated.View
      entering={SlideInDown.duration(260)}
      exiting={SlideOutDown.duration(200)}
      style={styles.sheet}
    >
      {zone === null ? (
        <>
          <View style={styles.header}>
            <EliteText style={styles.title}>¿Dónde lo sientes?</EliteText>
            <Pressable onPress={() => { haptic.light(); onClose(); }} hitSlop={8}>
              <Ionicons name="close" size={20} color={TEXT.secondary} />
            </Pressable>
          </View>
          <EliteText variant="caption" style={styles.sub}>
            El cuerpo contesta aunque la palabra no llegue.
          </EliteText>
          {BODY_ZONES.map((z) => (
            <Pressable
              key={z.key}
              onPress={() => { haptic.light(); setZone(z); }}
              style={styles.zoneRow}
            >
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={styles.zoneLabel}>{z.label}</EliteText>
                <EliteText variant="caption" style={styles.zoneDetail}>{z.detail}</EliteText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={TEXT.secondary} />
            </Pressable>
          ))}
        </>
      ) : (
        <Animated.View entering={FadeIn.duration(180)}>
          <View style={styles.header}>
            <Pressable onPress={() => { haptic.light(); setZone(null); }} hitSlop={8} style={styles.backRow}>
              <Ionicons name="chevron-back" size={16} color={TEXT.secondary} />
              <EliteText variant="caption" style={styles.backText}>{zone.label}</EliteText>
            </Pressable>
            <Pressable onPress={() => { haptic.light(); onClose(); }} hitSlop={8}>
              <Ionicons name="close" size={20} color={TEXT.secondary} />
            </Pressable>
          </View>
          <EliteText style={styles.title}>Suele sentirse así</EliteText>
          {zone.families.map((fam) => {
            const color = familyColor(fam);
            return (
              <Pressable
                key={fam}
                onPress={() => { haptic.medium(); onPickFamily(fam); }}
                style={[styles.famRow, { borderColor: withOpacity(color, 0.4) }]}
              >
                <View style={[styles.famDot, { backgroundColor: color }]} />
                <EliteText variant="body" style={styles.famLabel}>{FAMILY_LABELS[fam]}</EliteText>
                <Ionicons name="chevron-forward" size={16} color={TEXT.secondary} />
              </Pressable>
            );
          })}
          <Pressable onPress={() => { haptic.light(); onClose(); }} style={styles.noneLink} hitSlop={6}>
            <EliteText variant="caption" style={styles.noneText}>Ninguna de estas · volver a la rueda</EliteText>
          </Pressable>
        </Animated.View>
      )}
      <EliteText variant="caption" style={styles.disclaimer}>{BODY_GATE_DISCLAIMER}</EliteText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: BG.cardElevated,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: BORDER.card,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: { color: TEXT.primary, fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  sub: { color: TEXT.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: TEXT.secondary, fontSize: FontSizes.sm },

  zoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 0.5, borderBottomColor: BORDER.subtle,
  },
  zoneLabel: { color: TEXT.primary, fontSize: FontSizes.lg, fontFamily: Fonts.semiBold },
  zoneDetail: { color: TEXT.secondary, fontSize: FontSizes.sm, lineHeight: 18, marginTop: 1 },

  famRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.sm,
  },
  famDot: { width: 10, height: 10, borderRadius: 5 },
  famLabel: { color: TEXT.primary, fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, flex: 1 },
  noneLink: { alignSelf: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  noneText: { color: TEXT.secondary, fontSize: FontSizes.sm },

  disclaimer: {
    color: TEXT.tertiary, fontSize: FontSizes.xs, lineHeight: 16,
    marginTop: Spacing.sm, fontStyle: 'italic',
  },
});
