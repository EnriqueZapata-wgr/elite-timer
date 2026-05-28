/**
 * OnboardingShell — Wrapper compartido para todas las pantallas de onboarding.
 * Progress bar segmentada + step label + back button opcional + SafeAreaView.
 */
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Fonts, Spacing } from '@/constants/theme';

interface Props {
  step: number;
  totalSteps?: number;
  /** Si se provee, muestra un botón "atrás" en el header. */
  onBack?: () => void;
  children: React.ReactNode;
}

export function OnboardingShell({ step, totalSteps = 8, onBack, children }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          {onBack ? (
            <AnimatedPressable
              onPress={() => { haptic.light(); onBack(); }}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#888" />
            </AnimatedPressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          <EliteText style={styles.stepText}>PASO {step} DE {totalSteps}</EliteText>
        </View>
        <View style={styles.progressBar}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                i < step && styles.segmentFilled,
                i === step - 1 && styles.segmentCurrent,
              ]}
            />
          ))}
        </View>
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: Spacing.md, paddingTop: 16 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtn: {
    width: 28,
    height: 28,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#a8e02a',
    letterSpacing: 2,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  segment: {
    flex: 1,
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
  },
  segmentFilled: {
    backgroundColor: '#a8e02a',
  },
  segmentCurrent: {
    backgroundColor: '#a8e02a',
  },
});
