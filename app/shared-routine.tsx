/**
 * Shared Routine — Preview de una rutina compartida por link.
 *
 * Recibe share_code como parámetro, muestra preview y permite
 * clonar a la biblioteca del usuario.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { useAuth } from '@/src/contexts/auth-context';
import { getShareInfo, cloneFromShare, type ShareInfo } from '@/src/services/share-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/src/constants/brand';

export default function SharedRoutineScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session } = useAuth();

  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloned, setCloned] = useState(false);

  useEffect(() => {
    if (!code) {
      setError('Link inválido');
      setLoading(false);
      return;
    }
    getShareInfo(code)
      .then(data => {
        if (!data) setError('Rutina no encontrada');
        else setInfo(data);
      })
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleClone = async () => {
    if (!code) return;
    setCloning(true);
    try {
      await cloneFromShare(code);
      setCloned(true);
    } catch (err: any) {
      setError(err.message ?? 'Error al clonar');
    } finally {
      setCloning(false);
    }
  };

  const handleGoToLibrary = () => {
    router.replace('/(tabs)/biblioteca' as any);
  };

  const isTimer = info?.routine_mode === 'timer';
  const accentColor = isTimer ? Colors.neonGreen : CATEGORY_COLORS.mind;

  return (
    <ScreenContainer centered>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.neonGreen} />
      ) : error && !info ? (
        /* ── Error state ── */
        <Animated.View entering={FadeInUp.springify()} style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <EliteText variant="body" style={styles.errorText}>{error}</EliteText>
          <EliteButton
            label="VOLVER"
            variant="outline"
            onPress={() => router.back()}
            style={styles.btn}
          />
        </Animated.View>
      ) : info && cloned ? (
        /* ── Clonado exitoso ── */
        <Animated.View entering={FadeInUp.springify()} style={styles.center}>
          <Ionicons name="checkmark-circle" size={56} color={Colors.neonGreen} />
          <EliteText variant="subtitle" style={styles.successTitle}>
            Rutina agregada
          </EliteText>
          <EliteText variant="caption" style={styles.successSub}>
            "{info.routine_name}" está en tu biblioteca
          </EliteText>
          <EliteButton
            label="IR A BIBLIOTECA"
            onPress={handleGoToLibrary}
            style={styles.btn}
          />
        </Animated.View>
      ) : info ? (
        /* ── Preview ── */
        <Animated.View entering={FadeInUp.springify()} style={styles.previewContainer}>
          {/* Badge de compartido */}
          <View style={styles.sharedBadge}>
            <Ionicons name="link-outline" size={16} color={Colors.neonGreen} />
            <EliteText variant="caption" style={styles.sharedBadgeText}>
              RUTINA COMPARTIDA
            </EliteText>
          </View>

          {/* Card principal */}
          <LinearGradient
            colors={isTimer ? ['#1a2a1a', '#0a1a0a'] as const : ['#1a1a2a', '#0a0a1a'] as const}
            style={styles.card}
          >
            <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

            {/* Modo badge */}
            <View style={[
              styles.modeBadge,
              { backgroundColor: accentColor + '20', borderColor: accentColor + '40' },
            ]}>
              <EliteText variant="caption" style={[styles.modeBadgeText, { color: accentColor }]}>
                {isTimer ? 'TIMER' : 'RUTINA'}
              </EliteText>
            </View>

            {/* Nombre */}
            <EliteText variant="title" style={styles.routineName}>
              {info.routine_name}
            </EliteText>

            {/* Creador */}
            <View style={styles.creatorRow}>
              <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
              <EliteText variant="caption" style={styles.creatorText}>
                {info.creator_name}
              </EliteText>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <EliteText style={[styles.statValue, { color: accentColor }]}>
                  {info.block_count}
                </EliteText>
                <EliteText variant="caption" style={styles.statLabel}>
                  bloques
                </EliteText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <EliteText style={[styles.statValue, { color: accentColor }]}>
                  {info.times_cloned}
                </EliteText>
                <EliteText variant="caption" style={styles.statLabel}>
                  veces clonada
                </EliteText>
              </View>
            </View>
          </LinearGradient>

          {/* Acción */}
          {session ? (
            <EliteButton
              label={cloning ? 'Agregando...' : 'AGREGAR A MI BIBLIOTECA'}
              onPress={handleClone}
              style={styles.btn}
            />
          ) : (
            <View style={styles.authPrompt}>
              <EliteText variant="body" style={styles.authText}>
                Inicia sesión para agregar esta rutina
              </EliteText>
              <EliteButton
                label="INICIAR SESIÓN"
                onPress={() => router.push('/login')}
                style={styles.btn}
              />
            </View>
          )}

          {error && (
            <EliteText variant="caption" style={styles.inlineError}>{error}</EliteText>
          )}
        </Animated.View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    padding: Spacing.md,
  },

  // Badge compartido
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  sharedBadgeText: {
    color: Colors.neonGreen,
    letterSpacing: 3,
    fontFamily: Fonts.bold,
    fontSize: 12,
  },

  // Card
  card: {
    width: '100%',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + 6,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  modeBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  routineName: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  creatorText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },

  // Botones
  btn: {
    marginTop: Spacing.sm,
    minWidth: 220,
  },

  // Auth prompt
  authPrompt: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  authText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Success
  successTitle: {
    fontSize: 22,
    marginTop: Spacing.sm,
  },
  successSub: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Error
  errorText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  inlineError: {
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
