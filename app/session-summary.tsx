import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { SessionStat } from '@/components/session-stat';
import { BlockBadge } from '@/components/block-badge';
import { Colors, Spacing } from '@/constants/theme';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { convertLegacyRoutine } from '@/src/engine/convertLegacy';
import type { Session } from '@/types/models';
import { haptic } from '@/src/utils/haptics';

/**
 * Pantalla Resumen de Sesión — Post-entrenamiento.
 * Muestra tiempo total, bloques completados/saltados, rondas,
 * y detalle por bloque. Botones para volver al inicio o repetir.
 */
export default function SessionSummaryScreen() {
  const router = useRouter();
  // MB-31B3: la pantalla migro a tokens y sigue el tema global.
  const { kind, tokens: t } = useAppTheme();
  // Regla 1 del manual: el lima no es texto en claro; acento calibrado.
  const acento = kind === 'dark' ? Colors.neonGreen : t.tealTexto;
  const params = useLocalSearchParams<{ session?: string }>();

  // Parsear sesión desde params (con try-catch para robustez)
  let session: Session | null = null;
  try {
    session = params.session ? JSON.parse(params.session) : null;
  } catch {
    // JSON malformado — se muestra pantalla de fallback
  }

  if (!session) {
    return (
      <ThemeReady>
      <View style={[styles.screenRoot, styles.screenCentered, { backgroundColor: t.fondo }]}>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <ScreenHeader title="Resumen" />
        <EliteText variant="title">SIN DATOS</EliteText>
        <EliteButton label="VOLVER" onPress={() => { haptic.medium(); router.replace('/(tabs)'); }} />
      </View>
      </ThemeReady>
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
    <ThemeReady>
    <View style={[styles.screenRoot, { backgroundColor: t.fondo }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Resumen" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Encabezado */}
        <View style={styles.header}>
          <EliteText variant="title" style={styles.checkmark}>✓</EliteText>
          <EliteText variant="title">SESIÓN COMPLETA</EliteText>
          <EliteText variant="body" style={[styles.routineName, { color: t.textoSecundario }]}>
            {session.routineSnapshot.name}
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
        <View style={[styles.efficiencyRow, { borderColor: t.borde }]}>
          <EliteText variant="label">EFICIENCIA</EliteText>
          <EliteText
            variant="subtitle"
            style={[
              styles.efficiency,
              // Hallazgo MB-31B3: lima como TEXTO de dato — acento calibrado.
              { color: efficiency >= 90 ? acento : t.textoSecundario },
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
            <View key={index} style={[styles.blockRow, { borderBottomColor: t.borde }]}>
              <EliteText variant="caption" style={[styles.blockIndex, { color: t.textoSecundario }]}>
                {index + 1}
              </EliteText>
              <BlockBadge type={block.type} size="sm" />
              <EliteText variant="body" style={styles.blockTime}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </EliteText>
              {block.skipped && (
                <EliteText variant="caption" style={[styles.skippedBadge, { color: t.error }]}>
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
          onPress={() => { haptic.success(); router.replace('/(tabs)'); }}
        />
        <EliteButton
          label="REPETIR"
          variant="outline"
          onPress={() => {
            haptic.medium();
            const engineRoutine = convertLegacyRoutine(session!.routineSnapshot);
            router.replace({
              pathname: '/execution',
              params: {
                routine: JSON.stringify(engineRoutine),
              },
            });
          }}
          style={styles.repeatButton}
        />
      </View>
    </View>
    </ThemeReady>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  screenCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  },
  blockIndex: {
    width: 20,
  },
  blockTime: {
    flex: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  skippedBadge: {
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
