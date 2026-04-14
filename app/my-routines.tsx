/**
 * Mis Rutinas — Lista de rutinas guardadas del usuario.
 *
 * Muestra todas las rutinas (timer + routine) con nombre, modo, # bloques y fecha.
 * Tap → ejecuta la rutina. Botones al final para crear nueva rutina o timer.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { getRoutines } from '@/src/services/routine-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import type { Routine } from '@/src/engine/types';

// === HELPERS ===

/** Cuenta bloques hoja (sin contar grupos) */
function countLeafBlocks(blocks: Routine['blocks']): number {
  let count = 0;
  for (const b of blocks) {
    if (b.children && b.children.length > 0) {
      count += countLeafBlocks(b.children);
    } else {
      count++;
    }
  }
  return count;
}

/** Icono y color según modo */
const MODE_META: Record<string, { icon: string; color: string; label: string }> = {
  routine: { icon: 'barbell-outline', color: '#a8e02a', label: 'Fuerza' },
  timer: { icon: 'timer-outline', color: '#38bdf8', label: 'Timer' },
};

// === PANTALLA ===

export default function MyRoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, []),
  );

  async function loadRoutines() {
    setLoading(true);
    try {
      const data = await getRoutines();
      setRoutines(data);
    } catch {
      // silencioso — muestra empty state
    } finally {
      setLoading(false);
    }
  }

  function openRoutine(routine: Routine) {
    haptic.medium();
    // Timer mode → countdown engine, Routine mode → exercise engine
    const screen = routine.mode === 'timer' ? '/execution' : '/routine-execution';
    router.push({
      pathname: screen,
      params: { routine: JSON.stringify(routine) },
    } as any);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Mis rutinas" />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado de carga */}
        {loading && (
          <EliteText variant="body" style={s.loadingText}>Cargando...</EliteText>
        )}

        {/* Empty state */}
        {!loading && routines.length === 0 && (
          <Animated.View entering={FadeInUp.duration(300)} style={s.emptyWrap}>
            <Ionicons name="folder-open-outline" size={48} color="#333" />
            <EliteText variant="subtitle" style={s.emptyTitle}>
              Aún no tienes rutinas
            </EliteText>
            <EliteText variant="body" style={s.emptyText}>
              Crea tu primera rutina de fuerza o un timer personalizado.
            </EliteText>
          </Animated.View>
        )}

        {/* Lista de rutinas */}
        {!loading && routines.map((r, index) => {
          const meta = MODE_META[r.mode] || MODE_META.timer;
          const blockCount = countLeafBlocks(r.blocks);

          return (
            <AnimatedPressable
              key={r.id}
              onPress={() => openRoutine(r)}
              style={s.cardWrap}
            >
              <Animated.View entering={FadeInUp.delay(index * 60).duration(250)}>
                <GradientCard
                  gradient={{ start: `${meta.color}12`, end: `${meta.color}06` }}
                  accentColor={meta.color}
                  accentPosition="left"
                  padding={16}
                >
                  <View style={s.cardRow}>
                    <View style={[s.iconCircle, { backgroundColor: `${meta.color}20` }]}>
                      <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                    </View>

                    <View style={s.cardInfo}>
                      <EliteText style={s.cardName}>{r.name}</EliteText>
                      <View style={s.metaRow}>
                        <View style={[s.modeBadge, { backgroundColor: `${meta.color}20` }]}>
                          <EliteText style={[s.modeBadgeText, { color: meta.color }]}>
                            {meta.label}
                          </EliteText>
                        </View>
                        <EliteText style={s.metaText}>
                          {blockCount} {blockCount === 1 ? 'bloque' : 'bloques'}
                        </EliteText>
                        {r.description ? (
                          <EliteText style={s.metaText} numberOfLines={1}>
                            · {r.description}
                          </EliteText>
                        ) : null}
                      </View>
                    </View>

                    <Ionicons name="play-circle" size={28} color={meta.color} />
                  </View>
                </GradientCard>
              </Animated.View>
            </AnimatedPressable>
          );
        })}

        {/* Botones de crear */}
        {!loading && (
          <Animated.View entering={FadeInUp.delay(routines.length * 60 + 100).duration(300)}>
            <AnimatedPressable
              onPress={() => { haptic.light(); router.push({ pathname: '/builder', params: { mode: 'routine' } }); }}
              style={s.createBtn}
            >
              <View style={s.createRow}>
                <Ionicons name="barbell-outline" size={22} color="#a8e02a" />
                <View style={s.createInfo}>
                  <EliteText style={s.createTitle}>CREAR RUTINA</EliteText>
                  <EliteText style={s.createSub}>Rutina de fuerza con ejercicios y sets</EliteText>
                </View>
                <Ionicons name="add-circle" size={24} color="#a8e02a" />
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => { haptic.light(); router.push({ pathname: '/builder', params: { mode: 'timer' } }); }}
              style={s.createBtn}
            >
              <View style={s.createRow}>
                <Ionicons name="timer-outline" size={22} color="#38bdf8" />
                <View style={s.createInfo}>
                  <EliteText style={s.createTitle}>CREAR TIMER</EliteText>
                  <EliteText style={s.createSub}>Timer personalizado con bloques de tiempo</EliteText>
                </View>
                <Ionicons name="add-circle" size={24} color="#38bdf8" />
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // --- Loading / Empty ---
  loadingText: {
    color: '#666',
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: FontSizes.lg,
    marginTop: Spacing.sm,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // --- Routine cards ---
  cardWrap: {
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  modeBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  metaText: {
    color: '#666',
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },

  // --- Create buttons ---
  createBtn: {
    marginBottom: Spacing.sm,
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderStyle: 'dashed',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  createInfo: {
    flex: 1,
  },
  createTitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: 1,
  },
  createSub: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: 1,
  },
});
