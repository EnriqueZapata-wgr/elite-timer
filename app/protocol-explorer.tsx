/**
 * ProtocolExplorer — Pantalla donde el cliente explora y activa plantillas de protocolos.
 *
 * Muestra protocolos activos del usuario y la galería de plantillas públicas.
 * Cada plantilla se expande para mostrar fases, acciones y botón de activación.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { GradientCard } from '@/src/components/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { getPublicTemplates, assignProtocol, getUserProtocols, generateDailyPlan } from '@/src/services/protocol-builder-service';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS, CATEGORY_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';

// === COMPONENTES AUXILIARES ===

/** Pill — Badge compacto con fondo semitransparente */
function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: withOpacity(color, 0.12), paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm }}>
      <EliteText variant="caption" style={{ color, fontSize: FontSizes.xs }}>{text}</EliteText>
    </View>
  );
}

/** Mapea categoría del protocolo a un color de la paleta */
function getCatColor(cat: string): string {
  const map: Record<string, string> = {
    inflammation: SEMANTIC.error,
    hormonal: CATEGORY_COLORS.optimization,
    sleep: CATEGORY_COLORS.mind,
    metabolic: CATEGORY_COLORS.metrics,
  };
  return map[cat] || ATP_BRAND.lime;
}

// === PANTALLA PRINCIPAL ===

export default function ProtocolExplorerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Estado
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeProtocols, setActiveProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, ap] = await Promise.all([
        getPublicTemplates().catch(() => []),
        user?.id ? getUserProtocols(user.id).catch(() => []) : [],
      ]);
      setTemplates(t);
      setActiveProtocols(ap);
    } catch { /* silenciar */ }
    setLoading(false);
  };

  // Activar protocolo con confirmación
  const handleActivate = async (templateId: string, templateName: string) => {
    if (!user?.id) return;
    Alert.alert('Activar protocolo', `¿Activar "${templateName}"? Tu día se actualizará.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Activar',
        onPress: async () => {
          setActivating(templateId);
          try {
            await assignProtocol(user.id, templateId, null, 'self');
            await generateDailyPlan(user.id, undefined, true);
            haptic.success();
            Alert.alert('Protocolo activado', 'Tu día se ha actualizado con las nuevas acciones.', [
              { text: 'Ver mi día', onPress: () => router.replace('/(tabs)') },
              { text: 'Seguir explorando', onPress: () => loadData() },
            ]);
            loadData();
          } catch (err: any) {
            haptic.error();
            Alert.alert('Error', err.message || 'No se pudo activar');
          }
          setActivating(null);
        },
      },
    ]);
  };

  // Protocolos activos filtrados
  const activeOnes = activeProtocols.filter(p => p.status === 'active');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <PillarHeader pillar="optimization" title="Protocolos" />

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" height={100} />
          <SkeletonLoader variant="card" height={100} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sección 1: Protocolos activos */}
          {activeOnes.length > 0 && (
            <View style={styles.section}>
              <EliteText variant="caption" style={styles.sectionLabel}>
                TUS PROTOCOLOS ACTIVOS
              </EliteText>
              {activeOnes.map((p, i) => (
                <StaggerItem key={p.id} index={i}>
                  <View style={styles.activeCard}>
                    <View style={styles.activeRow}>
                      <Ionicons name="checkmark-circle" size={18} color={SEMANTIC.success} />
                      <View style={styles.activeInfo}>
                        <EliteText style={styles.activeName}>{p.name}</EliteText>
                        <EliteText variant="caption" style={styles.activeMeta}>
                          Fase {p.current_phase} · Desde {new Date(p.started_at).toLocaleDateString()}
                        </EliteText>
                      </View>
                      <View style={styles.activeBadge}>
                        <EliteText variant="caption" style={styles.activeBadgeText}>
                          Activo
                        </EliteText>
                      </View>
                    </View>
                  </View>
                </StaggerItem>
              ))}
            </View>
          )}

          {/* Sección 2: Explorar protocolos */}
          {templates.length > 0 ? (
            <View style={styles.section}>
              <EliteText variant="caption" style={styles.sectionLabel}>
                EXPLORAR PROTOCOLOS
              </EliteText>
              {templates.map((t, i) => {
                const isActive = activeProtocols.some(
                  ap => ap.template_id === t.id && ap.status === 'active'
                );
                const isExpanded = expandedId === t.id;
                const catColor = getCatColor(t.category);

                return (
                  <StaggerItem key={t.id} index={i}>
                    <Pressable onPress={() => setExpandedId(isExpanded ? null : t.id)}>
                      <GradientCard
                        color={catColor}
                        style={{ marginBottom: Spacing.sm, padding: Spacing.md }}
                      >
                        {/* Nombre + descripción */}
                        <View style={styles.templateHeader}>
                          <View style={styles.templateInfo}>
                            <EliteText style={styles.templateName}>
                              {t.name}
                            </EliteText>
                            <EliteText variant="caption" style={styles.templateDesc}>
                              {t.description}
                            </EliteText>
                          </View>
                        </View>

                        {/* Meta: duración + dificultad + tags */}
                        <View style={styles.pillRow}>
                          <Pill text={`${t.duration_weeks} semanas`} color={catColor} />
                          <Pill
                            text={
                              t.difficulty === 'beginner'
                                ? 'Principiante'
                                : t.difficulty === 'intermediate'
                                  ? 'Intermedio'
                                  : 'Avanzado'
                            }
                            color={TEXT_COLORS.secondary}
                          />
                          {(t.tags || []).slice(0, 3).map((tag: string, j: number) => (
                            <Pill key={j} text={tag} color={TEXT_COLORS.muted} />
                          ))}
                        </View>

                        {/* Expandido: fases + acciones + botón activar */}
                        {isExpanded && (
                          <Animated.View entering={FadeInUp.springify()}>
                            {/* Fases */}
                            {(t.phases || []).length > 0 && (
                              <View style={styles.phasesSection}>
                                <EliteText variant="caption" style={[styles.phasesLabel, { color: catColor }]}>
                                  FASES
                                </EliteText>
                                {t.phases.map((phase: any, k: number) => (
                                  <View key={k} style={styles.phaseRow}>
                                    <EliteText variant="caption" style={{ color: catColor, fontSize: FontSizes.sm }}>
                                      {k + 1}.
                                    </EliteText>
                                    <View style={styles.phaseInfo}>
                                      <EliteText variant="caption" style={styles.phaseName}>
                                        {phase.name}
                                      </EliteText>
                                      <EliteText variant="caption" style={styles.phaseDesc}>
                                        {phase.description} ({phase.duration_weeks} sem)
                                      </EliteText>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}

                            {/* Conteo de acciones */}
                            <EliteText variant="caption" style={styles.actionsCount}>
                              {(t.default_actions || []).length} acciones diarias incluidas
                            </EliteText>

                            {/* Botón activar / ya activo */}
                            {!isActive ? (
                              <AnimatedPressable
                                onPress={() => handleActivate(t.id, t.name)}
                                disabled={activating === t.id}
                                style={styles.activateBtn}
                              >
                                <EliteText style={styles.activateBtnText}>
                                  {activating === t.id ? 'Activando...' : 'Activar protocolo'}
                                </EliteText>
                              </AnimatedPressable>
                            ) : (
                              <View style={styles.alreadyActiveContainer}>
                                <EliteText style={styles.alreadyActiveText}>
                                  Ya activo
                                </EliteText>
                              </View>
                            )}
                          </Animated.View>
                        )}

                        {/* Chevron para indicar expandible */}
                        <View style={styles.chevronContainer}>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={TEXT_COLORS.muted}
                          />
                        </View>
                      </GradientCard>
                    </Pressable>
                  </StaggerItem>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="flask-outline"
              title="Sin protocolos disponibles"
              subtitle="Tu coach publicará protocolos pronto"
              color={ATP_BRAND.lime}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ATP_BRAND.black,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    color: TEXT_COLORS.muted,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  // Protocolos activos
  activeCard: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeInfo: {
    flex: 1,
  },
  activeName: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
  activeMeta: {
    color: TEXT_COLORS.muted,
    fontSize: FontSizes.xs,
  },
  activeBadge: {
    backgroundColor: withOpacity(SEMANTIC.success, 0.12),
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  activeBadgeText: {
    color: SEMANTIC.success,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
  },
  // Templates
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
  },
  templateDesc: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  // Fases expandidas
  phasesSection: {
    marginTop: Spacing.sm,
  },
  phasesLabel: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    color: TEXT_COLORS.primary,
    fontSize: FontSizes.sm,
  },
  phaseDesc: {
    color: TEXT_COLORS.muted,
    fontSize: FontSizes.xs,
  },
  actionsCount: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.sm,
    marginTop: 8,
  },
  activateBtn: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.card,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  activateBtnText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
  },
  alreadyActiveContainer: {
    backgroundColor: withOpacity(SEMANTIC.success, 0.08),
    borderRadius: Radius.card,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  alreadyActiveText: {
    color: SEMANTIC.success,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
  chevronContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
});
