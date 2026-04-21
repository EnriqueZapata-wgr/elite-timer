/**
 * OnboardingShell — Wrapper compartido para todas las pantallas de onboarding.
 * Progress bar segmentada + step label + SafeAreaView.
 */
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { Fonts, Spacing } from '@/constants/theme';

interface Props {
  step: number;
  totalSteps?: number;
  children: React.ReactNode;
}

export function OnboardingShell({ step, totalSteps = 7, children }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <EliteText style={styles.stepText}>PASO {step} DE {totalSteps}</EliteText>
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
