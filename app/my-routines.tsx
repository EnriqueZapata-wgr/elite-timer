/**
 * Mis Rutinas — Lista de rutinas guardadas del usuario.
 *
 * Muestra todas las rutinas (timer + routine) con nombre, modo, # bloques y fecha.
 * Tap → ejecuta la rutina. Botones al final para crear nueva rutina o timer.
 */
import { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { getRoutines, deleteRoutine, archiveRoutines, saveRoutine, generateUUID } from '@/src/services/routine-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT, ELEVATION, SEMANTIC, withOpacity } from '@/src/constants/brand';
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

// ── Limpieza (MB-5 2.3) ──

type MotivoLimpieza = 'vacía' | 'duplicada' | 'patrón viejo';

/**
 * Marca rutinas que no cumplen el patrón nuevo: 0 ejercicios (huérfanas de
 * saves rotos), duplicadas por nombre (se conserva la más reciente — la lista
 * viene created_at DESC) y rutinas de fuerza con ejercicios sin trazar a la
 * biblioteca (sin matrix_slug). Solo MARCA — archivar/eliminar es decisión
 * explícita del usuario.
 */
function detectarCandidatas(routines: Routine[]): Map<string, MotivoLimpieza> {
  const out = new Map<string, MotivoLimpieza>();
  const nombresVistos = new Set<string>();
  for (const r of routines) {
    if (countLeafBlocks(r.blocks) === 0) { out.set(r.id, 'vacía'); continue; }
    const nombre = r.name.trim().toLowerCase();
    if (nombresVistos.has(nombre)) { out.set(r.id, 'duplicada'); continue; }
    nombresVistos.add(nombre);
    if (r.mode === 'routine') {
      let tieneEjercicios = false;
      let sinTraza = false;
      const walk = (blocks: Routine['blocks']) => {
        for (const b of blocks) {
          if (b.type === 'work' && (b.exercise_id || b.exercise_name)) {
            tieneEjercicios = true;
            if (!b.matrix_slug) sinTraza = true;
          }
          if (b.children) walk(b.children);
        }
      };
      walk(r.blocks);
      if (tieneEjercicios && sinTraza) out.set(r.id, 'patrón viejo');
    }
  }
  return out;
}

const MOTIVO_COLOR: Record<MotivoLimpieza, string> = {
  'vacía': SEMANTIC.error,
  'duplicada': ATP_BRAND.amber,
  'patrón viejo': ATP_BRAND.teal,
};

// === PANTALLA ===

export default function MyRoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  // MB-5 2.3: limpieza en lote (archivar reversible / eliminar con doble confirmación).
  const [limpiezaVisible, setLimpiezaVisible] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const candidatas = useMemo(() => detectarCandidatas(routines), [routines]);

  function abrirLimpieza() {
    haptic.medium();
    setSeleccion(new Set(candidatas.keys()));
    setLimpiezaVisible(true);
  }

  function toggleSeleccion(id: string) {
    haptic.light();
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function archivarSeleccion() {
    if (seleccion.size === 0) return;
    haptic.medium();
    try {
      await archiveRoutines([...seleccion]);
      haptic.success();
      setLimpiezaVisible(false);
      loadRoutines();
    } catch (e) {
      Alert.alert('No se pudo archivar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    }
  }

  function eliminarSeleccion() {
    if (seleccion.size === 0) return;
    Alert.alert(
      'Eliminar definitivamente',
      `Se eliminarán ${seleccion.size} rutina${seleccion.size === 1 ? '' : 's'} PARA SIEMPRE (sin recuperación). Si tienes duda, usa Archivar — ese sí es reversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: `Eliminar ${seleccion.size}`,
          style: 'destructive',
          onPress: async () => {
            let fallidas = 0;
            for (const id of seleccion) {
              try { await deleteRoutine(id); } catch { fallidas++; }
            }
            haptic.success();
            setLimpiezaVisible(false);
            loadRoutines();
            if (fallidas > 0) Alert.alert('Aviso', `${fallidas} no se pudieron eliminar. Reintenta.`);
          },
        },
      ],
    );
  }

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
    // F08.15: rutinas con 0 ejercicios (huérfanas de saves anteriores rotos)
    // no se pueden ejecutar. Redirigir al builder para editar/eliminar en
    // lugar de abrir una pantalla vacía.
    if (countLeafBlocks(routine.blocks) === 0) {
      router.push({ pathname: '/builder', params: { routineId: routine.id } });
      return;
    }
    // Timer mode → countdown engine, Routine mode → exercise engine
    const screen = routine.mode === 'timer' ? '/execution' : '/routine-execution';
    router.push({
      pathname: screen,
      params: { routine: JSON.stringify(routine) },
    } as any);
  }

  function handleLongPress(routine: Routine) {
    haptic.heavy();
    Alert.alert(
      routine.name,
      'Elige una acción',
      [
        {
          text: 'Editar',
          onPress: () => router.push({
            pathname: '/builder',
            params: { routineId: routine.id },
          } as any),
        },
        {
          text: 'Duplicar',
          onPress: async () => {
            try {
              const copy: Routine = {
                ...routine,
                id: generateUUID(),
                name: `${routine.name} (copia)`,
              };
              await saveRoutine(copy);
              haptic.success();
              loadRoutines();
            } catch { /* silenciar */ }
          },
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => confirmDeleteRoutine(routine),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  function confirmDeleteRoutine(routine: Routine) {
    Alert.alert(
      'Eliminar rutina',
      `¿Eliminar "${routine.name}" permanentemente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutine(routine.id);
              haptic.success();
              loadRoutines();
            } catch { /* silenciar */ }
          },
        },
      ]
    );
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

        {/* MB-5 2.3: banner de limpieza — solo marca; decidir es del usuario */}
        {!loading && candidatas.size > 0 && (
          <Animated.View entering={FadeInUp.duration(250)}>
            <AnimatedPressable onPress={abrirLimpieza} style={s.limpiezaBanner}>
              <View style={[s.iconCircle, { backgroundColor: withOpacity(ATP_BRAND.amber, 0.15) }]}>
                <Ionicons name="sparkles-outline" size={20} color={ATP_BRAND.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.limpiezaTitle}>Limpieza de rutinas</EliteText>
                <EliteText style={s.limpiezaSub}>
                  {candidatas.size} vacía{candidatas.size === 1 ? '' : 's'}, duplicada{candidatas.size === 1 ? '' : 's'} o del patrón viejo — revisar
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
            </AnimatedPressable>
          </Animated.View>
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
              onLongPress={() => handleLongPress(r)}
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
                        {blockCount === 0 ? (
                          <View style={[s.modeBadge, { backgroundColor: 'rgba(239,68,68,0.18)' }]}>
                            <EliteText style={[s.modeBadgeText, { color: '#ef4444' }]}>
                              0 ejercicios · toca para editar
                            </EliteText>
                          </View>
                        ) : (
                          <EliteText style={s.metaText}>
                            {blockCount} {blockCount === 1 ? 'bloque' : 'bloques'}
                          </EliteText>
                        )}
                        {r.description ? (
                          <EliteText style={s.metaText} numberOfLines={1}>
                            · {r.description}
                          </EliteText>
                        ) : null}
                      </View>
                    </View>

                    <Ionicons
                      name={blockCount === 0 ? 'create-outline' : 'play-circle'}
                      size={28}
                      color={blockCount === 0 ? '#ef4444' : meta.color}
                    />
                  </View>
                </GradientCard>
              </Animated.View>
            </AnimatedPressable>
          );
        })}

        {/* Hint */}
        {!loading && routines.length > 0 && (
          <EliteText variant="caption" style={{ color: '#333', fontSize: 9, textAlign: 'center', marginBottom: Spacing.sm }}>
            Mantén presionado para editar o eliminar
          </EliteText>
        )}

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

      {/* MB-5 2.3: modal de limpieza — muestra QUÉ se va; archivar es
          reversible, eliminar pide doble confirmación. Nunca borrado silencioso. */}
      <Modal
        visible={limpiezaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLimpiezaVisible(false)}
      >
        <View style={s.limpiezaOverlay}>
          <View style={s.limpiezaSheet}>
            <View style={s.limpiezaHeader}>
              <EliteText style={s.limpiezaSheetTitle}>LIMPIEZA DE RUTINAS</EliteText>
              <Pressable onPress={() => setLimpiezaVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={TEXT.secondary} />
              </Pressable>
            </View>
            <EliteText style={s.limpiezaNota}>
              Marcadas: vacías, duplicadas por nombre o con ejercicios del patrón viejo.
              Destoca las que quieras conservar. Archivar las oculta y es reversible.
            </EliteText>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {routines.filter((r) => candidatas.has(r.id)).map((r) => {
                const motivo = candidatas.get(r.id)!;
                const marcada = seleccion.has(r.id);
                return (
                  <Pressable key={r.id} onPress={() => toggleSeleccion(r.id)} style={s.limpiezaRow}>
                    <Ionicons
                      name={marcada ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={marcada ? ATP_BRAND.lime : TEXT.tertiary}
                    />
                    <EliteText style={s.limpiezaRowName} numberOfLines={1}>{r.name}</EliteText>
                    <View style={[s.motivoChip, { backgroundColor: withOpacity(MOTIVO_COLOR[motivo], 0.15) }]}>
                      <EliteText style={[s.motivoText, { color: MOTIVO_COLOR[motivo] }]}>{motivo.toUpperCase()}</EliteText>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ marginTop: Spacing.md, gap: Spacing.xs }}>
              <GradientCTA
                label={`ARCHIVAR ${seleccion.size} (REVERSIBLE)`}
                pillar="fitness"
                icon="archive-outline"
                disabled={seleccion.size === 0}
                onPress={archivarSeleccion}
              />
              <AnimatedPressable
                onPress={eliminarSeleccion}
                disabled={seleccion.size === 0}
                style={s.eliminarBtn}
              >
                <Ionicons name="trash-outline" size={15} color={SEMANTIC.error} />
                <EliteText style={s.eliminarText}>Eliminar definitivamente ({seleccion.size})</EliteText>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
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

  // --- Limpieza (MB-5 2.3) ---
  limpiezaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1,
    borderColor: withOpacity(ATP_BRAND.amber, 0.35),
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  limpiezaTitle: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  limpiezaSub: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 1 },

  limpiezaOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  limpiezaSheet: {
    backgroundColor: ELEVATION[2].bg, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Spacing.md, paddingBottom: Spacing.xl,
  },
  limpiezaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  limpiezaSheetTitle: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 2 },
  limpiezaNota: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 17, marginBottom: Spacing.sm },
  limpiezaRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ELEVATION[3].border,
  },
  limpiezaRowName: { flex: 1, color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: 13 },
  motivoChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  motivoText: { fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 0.5 },
  eliminarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm,
  },
  eliminarText: { color: SEMANTIC.error, fontFamily: Fonts.semiBold, fontSize: 13 },

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
