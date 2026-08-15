/**
 * Mis Rutinas — Lista de rutinas guardadas del usuario.
 *
 * Muestra todas las rutinas (timer + routine) con nombre, modo, # bloques y fecha.
 * Tap → ejecuta la rutina. Botones al final para crear nueva rutina o timer.
 * Ola 2 Fitness PR2 (anexo §3): ?share=CODE abre el sheet de rutina
 * compartida (ex pantalla /shared-routine) — preview, clonar y estados de
 * error, sin salir de la lista.
 */
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { getRoutines, deleteRoutine, archiveRoutines, saveRoutine, generateUUID } from '@/src/services/routine-service';
import { getShareInfo, cloneFromShare, type ShareInfo } from '@/src/services/share-service';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import type { Routine } from '@/src/engine/types';
import { userErrorMessage } from '@/src/utils/user-error';

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

/** Icono y color según modo. MB-28C P6: el azul #38bdf8 del modo timer era
 *  de antes del design system (5º color en el pilar); los timers son la misma
 *  familia que HIIT, que MB-3.6 §4.2 fijó en el amber de marca. Fuerza usa el
 *  lima de categoría, ahora por token. */
const MODE_META: Record<string, { icon: string; color: string; label: string }> = {
  routine: { icon: 'barbell-outline', color: ATP_BRAND.lime, label: 'Fuerza' },
  timer: { icon: 'timer-outline', color: ATP_BRAND.amber, label: 'Timer' },
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
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: tk } = useAppTheme();
  // Regla 1 de la guía: lima como TEXTO no sobrevive el claro → teal calibrado.
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
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
      Alert.alert('No se pudo archivar', userErrorMessage(e, 'Inténtalo de nuevo.'));
    }
  }

  function eliminarSeleccion() {
    if (seleccion.size === 0) return;
    Alert.alert(
      'Eliminar definitivamente',
      `Se eliminarán ${seleccion.size} rutina${seleccion.size === 1 ? '' : 's'} PARA SIEMPRE (sin recuperación). Si tienes duda, usa Archivar: ese sí es reversible.`,
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

  // Ola 2 PR2 (ex /shared-routine): el sheet de rutina compartida.
  const { session } = useAuth();
  const [shareVisible, setShareVisible] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [cloned, setCloned] = useState(false);
  const shareAbiertoRef = useRef<string | null>(null);

  // Audit B5/menor 9: ?abrir=<routineId> abre la rutina asignada DIRECTO
  // (el hero del hub y Entrenar deep-linkean aquí) — sin volver a buscarla.
  // Una sola vez por entrada; si el id no existe, la lista normal.
  const { abrir, share } = useLocalSearchParams<{ abrir?: string; share?: string }>();

  // ?share=CODE abre el sheet una sola vez por código (deep link o interno).
  useEffect(() => {
    if (!share || shareAbiertoRef.current === share) return;
    shareAbiertoRef.current = share;
    setShareVisible(true);
    setShareLoading(true);
    setShareError(null);
    setShareInfo(null);
    setCloned(false);
    getShareInfo(share)
      .then((data) => {
        if (!data) setShareError('Rutina no encontrada');
        else setShareInfo(data);
      })
      .catch(() => setShareError('Error al cargar'))
      .finally(() => setShareLoading(false));
  }, [share]);

  async function clonarCompartida() {
    if (!share || cloning) return;
    haptic.heavy();
    setCloning(true);
    try {
      await cloneFromShare(share);
      setCloned(true);
      loadRoutines();
    } catch (err: any) {
      setShareError(userErrorMessage(err, 'No se pudo clonar la rutina.'));
    } finally {
      setCloning(false);
    }
  }
  const abiertaRef = useRef<string | null>(null);
  useEffect(() => {
    if (!abrir || abiertaRef.current === abrir || routines.length === 0) return;
    const asignada = routines.find((r) => r.id === abrir);
    if (asignada) {
      abiertaRef.current = abrir;
      openRoutine(asignada);
    }
  }, [abrir, routines]);

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
    // Ola 2 PR3: la interfaz la sigue decidiendo el CONTENIDO, pero el
    // árbitro (routineUsesClipRunner) vive DENTRO de /session — matriz corre
    // con clip, puro tiempo corre el modo timer absorbido. Un solo destino.
    router.push({
      pathname: '/session',
      params: { routine: JSON.stringify(routine), name: routine.name },
    });
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
            } catch {
              // D-2 (MB-12): fallar mudo confirmaba en falso.
              Alert.alert('No se pudo duplicar', 'Revisa tu conexión e intenta de nuevo.');
            }
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
            } catch {
              // D-2 (MB-12): fallar mudo dejaba la rutina "eliminada" solo en apariencia.
              Alert.alert('No se pudo eliminar', 'La rutina sigue ahí. Revisa tu conexión e intenta de nuevo.');
            }
          },
        },
      ]
    );
  }

  return (
    <ThemeReady>
    <View style={[s.screen, { backgroundColor: tk.fondo }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Mis rutinas" />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado de carga */}
        {loading && (
          <EliteText variant="body" style={[s.loadingText, { color: tk.textoSecundario }]}>Cargando...</EliteText>
        )}

        {/* MB-5 2.3: banner de limpieza — solo marca; decidir es del usuario */}
        {!loading && candidatas.size > 0 && (
          <Animated.View entering={FadeInUp.duration(250)}>
            <AnimatedPressable onPress={abrirLimpieza} style={[s.limpiezaBanner, { backgroundColor: tk.card }]}>
              <View style={[s.iconCircle, { backgroundColor: withOpacity(ATP_BRAND.amber, 0.15) }]}>
                <Ionicons name="sparkles-outline" size={20} color={ATP_BRAND.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.limpiezaTitle, { color: tk.texto }]}>Limpieza de rutinas</EliteText>
                <EliteText style={[s.limpiezaSub, { color: tk.textoSecundario }]}>
                  {candidatas.size} vacía{candidatas.size === 1 ? '' : 's'}, duplicada{candidatas.size === 1 ? '' : 's'} o del patrón viejo: revisar
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tk.textoTenue} />
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* Empty state */}
        {!loading && routines.length === 0 && (
          <Animated.View entering={FadeInUp.duration(300)} style={s.emptyWrap}>
            <Ionicons name="folder-open-outline" size={48} color={tk.bordeMarcado} />
            <EliteText variant="subtitle" style={[s.emptyTitle, { color: tk.texto }]}>
              Aún no tienes rutinas
            </EliteText>
            <EliteText variant="body" style={[s.emptyText, { color: tk.textoSecundario }]}>
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
                      <EliteText style={[s.cardName, { color: tk.texto }]}>{r.name}</EliteText>
                      <View style={s.metaRow}>
                        <View style={[s.modeBadge, { backgroundColor: `${meta.color}20` }]}>
                          {/* Regla 1: el lima de Fuerza como TEXTO → acento; el amber se queda. */}
                          <EliteText style={[s.modeBadgeText, { color: meta.color === ATP_BRAND.lime ? acento : meta.color }]}>
                            {meta.label}
                          </EliteText>
                        </View>
                        {blockCount === 0 ? (
                          <View style={[s.modeBadge, { backgroundColor: withOpacity(tk.error, 0.18) }]}>
                            <EliteText style={[s.modeBadgeText, { color: tk.error }]}>
                              0 ejercicios · toca para editar
                            </EliteText>
                          </View>
                        ) : (
                          <EliteText style={[s.metaText, { color: tk.textoSecundario }]}>
                            {blockCount} {blockCount === 1 ? 'bloque' : 'bloques'}
                          </EliteText>
                        )}
                        {r.description ? (
                          <EliteText style={[s.metaText, { color: tk.textoSecundario }]} numberOfLines={1}>
                            · {r.description}
                          </EliteText>
                        ) : null}
                      </View>
                    </View>

                    <Ionicons
                      name={blockCount === 0 ? 'create-outline' : 'play-circle'}
                      size={28}
                      color={blockCount === 0 ? tk.error : meta.color}
                    />
                  </View>
                </GradientCard>
              </Animated.View>
            </AnimatedPressable>
          );
        })}

        {/* Hint */}
        {!loading && routines.length > 0 && (
          <EliteText variant="caption" style={{ color: tk.bordeMarcado, fontSize: 9, textAlign: 'center', marginBottom: Spacing.sm }}>
            Mantén presionado para editar o eliminar
          </EliteText>
        )}

        {/* Botones de crear */}
        {!loading && (
          <Animated.View entering={FadeInUp.delay(routines.length * 60 + 100).duration(300)}>
            <AnimatedPressable
              onPress={() => { haptic.light(); router.push({ pathname: '/builder', params: { mode: 'routine' } }); }}
              style={[s.createBtn, { backgroundColor: tk.hundido, borderColor: tk.borde }]}
            >
              <View style={s.createRow}>
                <Ionicons name="barbell-outline" size={22} color={ATP_BRAND.lime} />
                <View style={s.createInfo}>
                  <EliteText style={[s.createTitle, { color: tk.texto }]}>CREAR RUTINA</EliteText>
                  <EliteText style={[s.createSub, { color: tk.textoSecundario }]}>Rutina de fuerza con ejercicios y sets</EliteText>
                </View>
                <Ionicons name="add-circle" size={24} color={ATP_BRAND.lime} />
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => { haptic.light(); router.push({ pathname: '/builder', params: { mode: 'timer' } }); }}
              style={[s.createBtn, { backgroundColor: tk.hundido, borderColor: tk.borde }]}
            >
              <View style={s.createRow}>
                <Ionicons name="timer-outline" size={22} color={ATP_BRAND.amber} />
                <View style={s.createInfo}>
                  <EliteText style={[s.createTitle, { color: tk.texto }]}>CREAR TIMER</EliteText>
                  <EliteText style={[s.createSub, { color: tk.textoSecundario }]}>Timer personalizado con bloques de tiempo</EliteText>
                </View>
                <Ionicons name="add-circle" size={24} color={ATP_BRAND.amber} />
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
        <View style={[s.limpiezaOverlay, { backgroundColor: kind === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)' }]}>
          <View style={[s.limpiezaSheet, { backgroundColor: tk.flotante }]}>
            <View style={s.limpiezaHeader}>
              <EliteText style={[s.limpiezaSheetTitle, { color: tk.texto }]}>LIMPIEZA DE RUTINAS</EliteText>
              <Pressable onPress={() => setLimpiezaVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={tk.textoSecundario} />
              </Pressable>
            </View>
            <EliteText style={[s.limpiezaNota, { color: tk.textoSecundario }]}>
              Marcadas: vacías, duplicadas por nombre o con ejercicios del patrón viejo.
              Destoca las que quieras conservar. Archivar las oculta y es reversible.
            </EliteText>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {routines.filter((r) => candidatas.has(r.id)).map((r) => {
                const motivo = candidatas.get(r.id)!;
                const marcada = seleccion.has(r.id);
                // Regla 2 de la guía: el teal como texto pasa por el token calibrado;
                // el error de UI también (en oscuro son el mismo hex).
                const motivoTexto = motivo === 'patrón viejo' ? tk.tealTexto
                  : motivo === 'vacía' ? tk.error : MOTIVO_COLOR[motivo];
                return (
                  <Pressable key={r.id} onPress={() => toggleSeleccion(r.id)} style={[s.limpiezaRow, { borderBottomColor: tk.borde }]}>
                    <Ionicons
                      name={marcada ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={marcada ? ATP_BRAND.lime : tk.textoTenue}
                    />
                    <EliteText style={[s.limpiezaRowName, { color: tk.texto }]} numberOfLines={1}>{r.name}</EliteText>
                    <View style={[s.motivoChip, { backgroundColor: withOpacity(MOTIVO_COLOR[motivo], 0.15) }]}>
                      <EliteText style={[s.motivoText, { color: motivoTexto }]}>{motivo.toUpperCase()}</EliteText>
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
                <Ionicons name="trash-outline" size={15} color={tk.error} />
                <EliteText style={[s.eliminarText, { color: tk.error }]}>Eliminar definitivamente ({seleccion.size})</EliteText>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ola 2 PR2 (ex /shared-routine): sheet de rutina compartida —
          preview con creador y stats, clonar a la biblioteca, estados de
          error honestos. El deep link ?share=CODE cae aquí. */}
      <Modal
        visible={shareVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareVisible(false)}
      >
        <View style={[s.limpiezaOverlay, { backgroundColor: kind === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)' }]}>
          <View style={[s.limpiezaSheet, { backgroundColor: tk.flotante }]}>
            <View style={s.limpiezaHeader}>
              <EliteText style={[s.limpiezaSheetTitle, { color: tk.texto }]}>RUTINA COMPARTIDA</EliteText>
              <Pressable onPress={() => setShareVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={tk.textoSecundario} />
              </Pressable>
            </View>

            {shareLoading && (
              <View style={s.shareCenter}>
                <ActivityIndicator size="large" color={ATP_BRAND.lime} />
              </View>
            )}

            {!shareLoading && shareError && !shareInfo && (
              <View style={s.shareCenter}>
                <Ionicons name="alert-circle-outline" size={40} color={tk.error} />
                <EliteText style={[s.shareErrorText, { color: tk.textoSecundario }]}>{shareError}</EliteText>
                <GradientCTA label="VOLVER" variant="quiet" onPress={() => setShareVisible(false)} />
              </View>
            )}

            {!shareLoading && shareInfo && cloned && (
              <View style={s.shareCenter}>
                <Ionicons name="checkmark-circle" size={48} color={ATP_BRAND.lime} />
                <EliteText style={[s.shareName, { color: tk.texto }]}>Rutina agregada</EliteText>
                <EliteText style={[s.shareMeta, { color: tk.textoSecundario }]}>
                  "{shareInfo.routine_name}" ya está en tus rutinas
                </EliteText>
                <GradientCTA label="LISTO" pillar="fitness" onPress={() => setShareVisible(false)} />
              </View>
            )}

            {!shareLoading && shareInfo && !cloned && (
              <View>
                <View style={[s.shareModeBadge, { backgroundColor: withOpacity(shareInfo.routine_mode === 'timer' ? ATP_BRAND.amber : ATP_BRAND.lime, 0.15) }]}>
                  <EliteText style={[s.shareModeText, { color: shareInfo.routine_mode === 'timer' ? ATP_BRAND.amber : acento }]}>
                    {shareInfo.routine_mode === 'timer' ? 'TIMER' : 'RUTINA'}
                  </EliteText>
                </View>
                <EliteText style={[s.shareName, { color: tk.texto }]}>{shareInfo.routine_name}</EliteText>
                <View style={s.shareCreatorRow}>
                  <Ionicons name="person-outline" size={14} color={tk.textoSecundario} />
                  <EliteText style={[s.shareMeta, { color: tk.textoSecundario }]}>{shareInfo.creator_name}</EliteText>
                </View>
                <View style={s.shareStatsRow}>
                  <View style={s.shareStat}>
                    <EliteText style={[s.shareStatValue, { color: acento }]}>{shareInfo.block_count}</EliteText>
                    <EliteText style={[s.shareMeta, { color: tk.textoSecundario }]}>bloques</EliteText>
                  </View>
                  <View style={[s.shareStatDivider, { backgroundColor: tk.borde }]} />
                  <View style={s.shareStat}>
                    <EliteText style={[s.shareStatValue, { color: acento }]}>{shareInfo.times_cloned}</EliteText>
                    <EliteText style={[s.shareMeta, { color: tk.textoSecundario }]}>veces clonada</EliteText>
                  </View>
                </View>
                {session ? (
                  <GradientCTA
                    label={cloning ? 'AGREGANDO…' : 'AGREGAR A MIS RUTINAS'}
                    pillar="fitness"
                    icon="download-outline"
                    disabled={cloning}
                    onPress={clonarCompartida}
                  />
                ) : (
                  <GradientCTA
                    label="INICIAR SESIÓN PARA AGREGARLA"
                    pillar="fitness"
                    onPress={() => { setShareVisible(false); router.push('/login'); }}
                  />
                )}
                {shareError && (
                  <EliteText style={[s.shareErrorText, { color: tk.error }]}>{shareError}</EliteText>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
    </ThemeReady>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // --- Loading / Empty ---
  // NOCHE-4: el color lo pone tk.textoSecundario en cada uso. El gris de base
  // que vivia aqui era codigo muerto: nunca se pintaba y confundia al leer.
  loadingText: {
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
    fontSize: FontSizes.lg,
    marginTop: Spacing.sm,
  },
  emptyText: {
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
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },

  // --- Limpieza (MB-5 2.3) ---
  limpiezaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1,
    borderColor: withOpacity(ATP_BRAND.amber, 0.35),
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  limpiezaTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  limpiezaSub: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 1 },

  limpiezaOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  limpiezaSheet: {
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Spacing.md, paddingBottom: Spacing.xl,
  },
  limpiezaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  limpiezaSheetTitle: { fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 2 },
  limpiezaNota: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 17, marginBottom: Spacing.sm },
  limpiezaRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ELEVATION[3].border,
  },
  limpiezaRowName: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 13 },
  motivoChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  motivoText: { fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 0.5 },
  eliminarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm,
  },
  eliminarText: { fontFamily: Fonts.semiBold, fontSize: 13 },

  // --- Sheet de rutina compartida (Ola 2 PR2, ex /shared-routine) ---
  shareCenter: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  shareModeBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill, marginBottom: Spacing.xs,
  },
  shareModeText: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 1 },
  shareName: { fontFamily: Fonts.extraBold, fontSize: 22, marginBottom: 2 },
  shareCreatorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  shareMeta: { fontFamily: Fonts.regular, fontSize: 12 },
  shareStatsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginBottom: Spacing.md, paddingVertical: Spacing.sm,
  },
  shareStat: { alignItems: 'center', flex: 1 },
  shareStatValue: { fontFamily: Fonts.extraBold, fontSize: 24, fontVariant: ['tabular-nums'] },
  shareStatDivider: { width: 1, height: 30 },
  shareErrorText: { fontFamily: Fonts.regular, fontSize: 13, textAlign: 'center', marginTop: Spacing.xs },

  // --- Create buttons ---
  createBtn: {
    marginBottom: Spacing.sm,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
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
    letterSpacing: 1,
  },
  createSub: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
});
