/**
 * HPlusExplainerCard (#99) — nudge one-shot en HOY: "¿Qué son los H+?".
 * Dismissable permanente (AsyncStorage). Wrapper propio: si no aplica,
 * no deja hueco (mismo patrón que ProBoostCard).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const DISMISS_KEY = '@atp/h_plus_explainer_dismissed';

export function HPlusExplainerCard() {
  // null = todavía no sabemos (evita flash); true = ya fue descartada
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => setDismissed(v === 'true'))
      .catch(() => setDismissed(true));
  }, []);

  function open() {
    haptic.light();
    router.push('/economy/how-to-earn');
  }

  function dismiss() {
    haptic.light();
    setDismissed(true);
    AsyncStorage.setItem(DISMISS_KEY, 'true').catch(() => {});
  }

  if (dismissed !== false) return null;

  return (
    <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.wrapper}>
      <AnimatedPressable onPress={open} style={styles.card}>
        <View style={styles.iconCircle}>
          <EliteText style={{ fontSize: 16 }}>💎</EliteText>
        </View>
        <View style={styles.body}>
          <EliteText style={styles.title}>¿Qué son los H+?</EliteText>
          <EliteText style={styles.subtitle}>
            Tu esfuerzo tiene economía — 60 segundos para entenderla.
          </EliteText>
        </View>
        <AnimatedPressable onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color={TEXT.tertiary} />
        </AnimatedPressable>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: Spacing.md, marginTop: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
  },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary },
  subtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary },
  closeBtn: { padding: 4 },
});
