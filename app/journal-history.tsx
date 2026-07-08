/**
 * JOURNAL — historial dedicado (#39, marathon F3).
 * Lista cronológica + filtros (rango/tipo/búsqueda) + expandir/editar/
 * eliminar + streak + FAB hacia el composer (app/journal.tsx).
 * Editorial ATP: B/N + lima. No app de terapia.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, DeviceEventEmitter, LayoutAnimation, Modal, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, UIManager, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import {
  computeJournalStreak,
  deleteJournalEntry,
  fetchJournalDates,
  fetchJournalEntries,
  updateJournalEntry,
  type JournalEntry,
} from '@/src/services/journal-service';
import { parseLocalDate } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, SEMANTIC, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Mismos tipos/colores que el composer (app/journal.tsx). */
const TYPE_META: Record<string, { label: string; color: string }> = {
  free: { label: 'Libre', color: '#8a8a8a' },
  gratitude: { label: 'Gratitud', color: '#D4537E' },
  vision: { label: 'Visión', color: '#1D9E75' },
  stoic: { label: 'Estoico', color: '#7F77DD' },
  work_dump: { label: 'Descarga', color: '#EF9F27' },
};

const RANGES: { label: string; days: number | null }[] = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: 'Todo', days: null },
];

function formatEntryDate(date: string): string {
  return parseLocalDate(date).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export default function JournalHistoryScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<number | null>(30);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Editor modal
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce de búsqueda (350ms)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [list, dates] = await Promise.all([
      fetchJournalEntries(user.id, { rangeDays, type: typeFilter, search: debouncedSearch }),
      fetchJournalDates(user.id),
    ]);
    setEntries(list);
    setStreak(computeJournalStreak(dates));
    setLoading(false);
  }, [user?.id, rangeDays, typeFilter, debouncedSearch]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleExpand(id: string) {
    haptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function startEdit(entry: JournalEntry) {
    haptic.light();
    setEditing(entry);
    setEditContent(entry.content);
  }

  async function saveEdit() {
    if (!editing || saving) return;
    const trimmed = editContent.trim();
    if (trimmed.length === 0) return;
    setSaving(true);
    const ok = await updateJournalEntry(editing.id, trimmed);
    setSaving(false);
    if (ok) {
      haptic.success();
      setEditing(null);
      load();
    } else {
      Alert.alert('No se pudo guardar', 'Inténtalo de nuevo en un momento.');
    }
  }

  function confirmDelete(entry: JournalEntry) {
    haptic.medium();
    Alert.alert(
      'Eliminar entrada',
      `¿Borrar la entrada del ${formatEntryDate(entry.date)}? No hay vuelta atrás.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteJournalEntry(entry.id);
            if (ok) {
              haptic.success();
              // HOY puede depender de "journal de hoy" — refresca
              DeviceEventEmitter.emit('day_changed');
              load();
            } else {
              Alert.alert('No se pudo eliminar', 'Inténtalo de nuevo en un momento.');
            }
          },
        },
      ],
    );
  }

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Journal" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Streak */}
        {streak >= 2 && (
          <Animated.View entering={FadeInUp.delay(40).springify()} style={styles.streakPill}>
            <EliteText style={styles.streakText}>🔥 {streak} días escribiendo</EliteText>
          </Animated.View>
        )}

        {/* Búsqueda */}
        <Animated.View entering={FadeInUp.delay(70).springify()} style={styles.searchBox}>
          <Ionicons name="search" size={16} color={TEXT.tertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar en tus entradas…"
            placeholderTextColor={TEXT.muted}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={TEXT.tertiary} />
            </Pressable>
          )}
        </Animated.View>

        {/* Filtros: rango */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={styles.chipRow}>
            {RANGES.map((r) => {
              const active = rangeDays === r.days;
              return (
                <Pressable
                  key={r.label}
                  onPress={() => { haptic.light(); setRangeDays(r.days); }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <EliteText style={[styles.chipText, active && styles.chipTextActive]}>{r.label}</EliteText>
                </Pressable>
              );
            })}
          </View>

          {/* Filtros: tipo */}
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => { haptic.light(); setTypeFilter(null); }}
              style={[styles.chip, typeFilter === null && styles.chipActive]}
            >
              <EliteText style={[styles.chipText, typeFilter === null && styles.chipTextActive]}>Todos</EliteText>
            </Pressable>
            {Object.entries(TYPE_META).map(([key, meta]) => {
              const active = typeFilter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => { haptic.light(); setTypeFilter(active ? null : key); }}
                  style={[styles.chip, active && { borderColor: meta.color, backgroundColor: withOpacity(meta.color, 0.12) }]}
                >
                  <EliteText style={[styles.chipText, active && { color: meta.color, fontFamily: Fonts.semiBold }]}>
                    {meta.label}
                  </EliteText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Lista */}
        {loading ? (
          <EliteText style={styles.emptyText}>Cargando…</EliteText>
        ) : entries.length === 0 ? (
          <Animated.View entering={FadeInUp.delay(130).springify()} style={styles.emptyBox}>
            <EliteText style={styles.emptyTitle}>
              {debouncedSearch || typeFilter ? 'Nada con esos filtros' : 'Aún no hay entradas'}
            </EliteText>
            <EliteText style={styles.emptyText}>
              {debouncedSearch || typeFilter
                ? 'Prueba ampliando el rango o quitando filtros.'
                : 'Tu primera entrada está a un tap del botón +.'}
            </EliteText>
          </Animated.View>
        ) : (
          entries.map((entry, i) => {
            const meta = TYPE_META[entry.journal_type] ?? TYPE_META.free;
            const expanded = expandedId === entry.id;
            return (
              <Animated.View key={entry.id} entering={FadeInUp.delay(Math.min(130 + i * 35, 500)).springify()}>
                <Pressable onPress={() => toggleExpand(entry.id)} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <EliteText style={styles.entryDate}>{formatEntryDate(entry.date)}</EliteText>
                    <View style={[styles.typeBadge, { backgroundColor: withOpacity(meta.color, 0.14) }]}>
                      <EliteText style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</EliteText>
                    </View>
                  </View>
                  {entry.prompt ? (
                    <EliteText style={styles.entryPrompt} numberOfLines={expanded ? undefined : 1}>
                      {entry.prompt}
                    </EliteText>
                  ) : null}
                  <EliteText style={styles.entryContent} numberOfLines={expanded ? undefined : 3}>
                    {entry.content}
                  </EliteText>
                  {entry.tags && entry.tags.length > 0 && expanded && (
                    <View style={styles.tagRow}>
                      {entry.tags.map((tag) => (
                        <EliteText key={tag} style={styles.tag}>#{tag}</EliteText>
                      ))}
                    </View>
                  )}
                  {expanded && (
                    <View style={styles.actionRow}>
                      <AnimatedPressable onPress={() => startEdit(entry)} style={styles.actionBtn}>
                        <Ionicons name="pencil-outline" size={14} color={ATP_BRAND.lime} />
                        <EliteText style={styles.actionText}>Editar</EliteText>
                      </AnimatedPressable>
                      <AnimatedPressable onPress={() => confirmDelete(entry)} style={styles.actionBtn}>
                        <Ionicons name="trash-outline" size={14} color={SEMANTIC.error} />
                        <EliteText style={[styles.actionText, { color: SEMANTIC.error }]}>Eliminar</EliteText>
                      </AnimatedPressable>
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB → composer */}
      <AnimatedPressable
        onPress={() => { haptic.medium(); router.push('/journal' as any); }}
        style={styles.fab}
      >
        <Ionicons name="add" size={28} color="#000" />
      </AnimatedPressable>

      {/* Modal editor */}
      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <EliteText style={styles.modalTitle}>
              Editar · {editing ? formatEntryDate(editing.date) : ''}
            </EliteText>
            <TextInput
              style={styles.modalInput}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
              placeholder="Escribe…"
              placeholderTextColor={TEXT.muted}
            />
            <View style={styles.modalActions}>
              <AnimatedPressable onPress={() => setEditing(null)} style={styles.modalBtnSecondary}>
                <EliteText style={styles.modalBtnSecondaryText}>Cancelar</EliteText>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={saveEdit}
                disabled={saving || editContent.trim().length === 0}
                style={styles.modalBtnPrimary}
              >
                <EliteText style={styles.modalBtnPrimaryText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md },
  streakPill: {
    alignSelf: 'flex-start',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    marginBottom: Spacing.sm,
  },
  streakText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: ATP_BRAND.lime },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#0a0a0a',
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Platform.OS === 'ios' ? 10 : 2,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: TEXT.primary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: ELEVATION[2].border,
    backgroundColor: ELEVATION[1].bg,
  },
  chipActive: {
    borderColor: ATP_BRAND.lime,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
  },
  chipText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary },
  chipTextActive: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold },
  entryCard: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  entryDate: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: TEXT.primary,
    textTransform: 'capitalize',
  },
  typeBadge: {
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10, letterSpacing: 0.5 },
  entryPrompt: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  entryContent: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    lineHeight: 19,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  tag: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ELEVATION[1].border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: ATP_BRAND.lime },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.xs },
  emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ATP_BRAND.lime,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: ATP_BRAND.lime,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    backgroundColor: ELEVATION[2].bg,
    borderColor: ELEVATION[2].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: TEXT.primary,
    textTransform: 'capitalize',
  },
  modalInput: {
    minHeight: 140,
    maxHeight: 320,
    backgroundColor: '#0a0a0a',
    borderColor: ELEVATION[2].border,
    borderWidth: 0.5,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: TEXT.primary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  modalBtnSecondary: { paddingVertical: 10, paddingHorizontal: Spacing.md },
  modalBtnSecondaryText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.secondary },
  modalBtnPrimary: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  modalBtnPrimaryText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: '#000' },
});
