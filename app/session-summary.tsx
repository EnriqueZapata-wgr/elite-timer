import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { SessionStat } from '@/components/session-stat';
import { BlockBadge } from '@/components/block-badge';
import { Colors, Spacing } from '@/constants/theme';
import type { Session } from '@/types/models';

/**
 * Pantalla Resumen de Sesión — Post-entrenamiento.
 * Muestra tiempo total, bloques completados/saltados, rondas,
 * y detalle por bloque. Botones para volver al inicio o repetir.
 */
export default function SessionSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ session?: string }>();

  // Parsear sesión desde params
  const session: Session | null = params.session ? JSON.parse(params.session) : null;

  if (!session) {
    return (
      <ScreenContainer>
        <EliteText variant="title">SIN DATOS</EliteText>
        <EliteButton label="VOLVER" onPress={() => router.replace('/(tabs)')} />
      </ScreenContainer>
    );
  }

  // Cálculos
  const totalBlocks = session.completedBlocks.length;
  const skippedBlocks = session.completedBlocks.filter(b => b.skipped).length;
  const completedBlocks = totalBlocks - skippedBlocks;
  const totalMinutes = Math.floor(session.totalActualTime / 60);
  const totalSeconds = session.totalActualTime % 60;
  const timeDisplay = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;

  // Porcentaje de eficiencia
  const efficiency = session.totalPlannedTime > 0
    ? Math.round((session.totalActualTime / session.totalPlannedTime) * 100)
    : 100;

  return (
    <ScreenContainer centered={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Encabezado */}
        <View style={styles.header}>
          <EliteText variant="title" style={styles.checkmark}>✓</EliteText>
          <EliteText variant="title">SESIÓN COMPLETA</EliteText>
          <EliteText variant="body" style={styles.routineName}>
            {session.routineName}
          </EliteText>
        </View>

        {/* Stats principales — fila de 3 */}
        <View style={styles.statsRow}>
          <SessionStat
            label="TIEMPO"
            value={timeDisplay}
          />
          <SessionStat
            label="BLOQUES"
            value={`${completedBlocks}`}
            detail={skippedBlocks > 0 ? `${skippedBlocks} saltados` : undefined}
          />
          <SessionStat
            label="RONDAS"
            value={`${session.roundsCompleted}`}
          />
        </View>

        {/* Eficiencia */}
        <View style={styles.efficiencyRow}>
          <EliteText variant="label">EFICIENCIA</EliteText>
          <EliteText
            variant="subtitle"
            style={[
              styles.efficiency,
              { color: efficiency >= 90 ? Colors.neonGreen : Colors.textSecondary },
            ]}
          >
            {efficiency}%
          </EliteText>
        </View>

        {/* Detalle por bloque */}
        <EliteText variant="label" style={styles.sectionLabel}>
          DETALLE DE BLOQUES
        </EliteText>
        {session.completedBlocks.map((block, index) => {
          const mins = Math.floor(block.actualDuration / 60);
          const secs = block.actualDuration % 60;
          return (
            <View key={index} style={styles.blockRow}>
              <EliteText variant="caption" style={styles.blockIndex}>
                {index + 1}
              </EliteText>
              <BlockBadge type={block.type} size="sm" />
              <EliteText variant="body" style={styles.blockTime}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </EliteText>
              {block.skipped && (
                <EliteText variant="caption" style={styles.skippedBadge}>
                  SALTADO
                </EliteText>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.footer}>
        <EliteButton
          label="VOLVER AL INICIO"
          onPress={() => router.replace('/(tabs)')}
        />
        <EliteButton
          label="REPETIR"
          variant="outline"
          onPress={() => router.back()}
          style={styles.repeatButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  checkmark: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  routineName: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Stats principales
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  // Eficiencia
  efficiencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceLight,
    marginBottom: Spacing.lg,
  },
  efficiency: {
    fontSize: 24,
  },
  // Detalle por bloque
  sectionLabel: {
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  blockIndex: {
    color: Colors.textSecondary,
    width: 20,
  },
  blockTime: {
    flex: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  skippedBadge: {
    color: Colors.error,
    fontSize: 10,
  },
  // Footer
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  repeatButton: {
    marginTop: 0,
  },
});
