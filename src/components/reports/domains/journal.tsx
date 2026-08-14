/**
 * Dominio journal (OLA1 R-1) — absorbe app/journal-history.tsx completo.
 *
 * Lo que sobrevive tal cual: lista con expandir, filtro por tipo, búsqueda con
 * espera de 350 ms, editar y borrar la entrada, la racha y el botón flotante
 * hacia el composer. Borrar tu entrada desde donde la ves es la única casa
 * razonable: si desde aquí solo se pudiera mirar, habría que ir a buscarla a
 * otra pantalla que ya no existe.
 *
 * Lo que cambia a propósito: los rangos 7/30/90/todo los sustituye el rango del
 * shell (Semana/Mes/Año/Todo), que es el mismo de todos los reportes. Y el
 * filtro corre en memoria sobre lo que ya trajo el rango, no con una consulta
 * por tecleo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, DeviceEventEmitter, LayoutAnimation, Modal, Platform, Pressable,
  StyleSheet, TextInput, UIManager, View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';
import { parseLocalDate } from '@/src/utils/date-helpers';
import { ATP_BRAND, SEMANTIC, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { JOURNAL_TYPE_META as TYPE_META } from '@/src/constants/journal-types';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { deleteJournalEntry, updateJournalEntry, type JournalEntry } from '@/src/services/journal-service';
import { REPORT_DOMAINS } from '@/src/services/reports/report-domain-core';
import {
  filterJournalEntries, hasActiveFilter, journalRows,
  JOURNAL_SEARCH_DEBOUNCE_MS,
} from '@/src/services/reports/journal-report-core';
import {
  loadJournalReport, type JournalReportData,
} from '@/src/services/reports/journal-report-service';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import type { ReportDomainDefinition } from '../ReportDomainShell';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const META = REPORT_DOMAINS.journal;

function formatEntryDate(date: string): string {
  return parseLocalDate(date).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function JournalContent({ data, reload }: { data: JournalReportData; reload: () => void }) {
  const { kind, tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  // Regla 1 del manual: el lima no es texto en claro; acento calibrado.
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), JOURNAL_SEARCH_DEBOUNCE_MS);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const filter = { type: typeFilter, search: debouncedSearch };
  const entries = filterJournalEntries(data.entries, filter);
  const filtered = hasActiveFilter(filter);

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
      reload();
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
              reload();
            } else {
              Alert.alert('No se pudo eliminar', 'Inténtalo de nuevo en un momento.');
            }
          },
        },
      ],
    );
  }

  return (
    <View>
      {data.streak >= 2 && (
        <View style={s.streakPill}>
          <EliteText style={[s.streakText, { color: acento }]}>{data.streak} días seguidos escribiendo</EliteText>
        </View>
      )}

      <View style={[s.searchBox, { backgroundColor: t.hundido, borderColor: t.borde }]}>
        <Ionicons name="search" size={16} color={t.textoTenue} />
        <TextInput
          style={[s.searchInput, { color: t.texto }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar en tus entradas…"
          placeholderTextColor={t.sinDatos}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={t.textoTenue} />
          </Pressable>
        )}
      </View>

      <View style={s.chipRow}>
        <Pressable
          onPress={() => { haptic.light(); setTypeFilter(null); }}
          style={[s.chip, { backgroundColor: t.card, borderColor: t.bordeMarcado }, typeFilter === null && s.chipActive]}
        >
          <EliteText style={[s.chipText, { color: t.textoSecundario }, typeFilter === null && [s.chipTextActive, { color: acento }]]}>Todos</EliteText>
        </Pressable>
        {Object.entries(TYPE_META).map(([key, meta]) => {
          const active = typeFilter === key;
          return (
            <Pressable
              key={key}
              onPress={() => { haptic.light(); setTypeFilter(active ? null : key); }}
              style={[s.chip, { backgroundColor: t.card, borderColor: t.bordeMarcado }, active && { borderColor: meta.color, backgroundColor: withOpacity(meta.color, 0.12) }]}
            >
              <EliteText style={[s.chipText, { color: t.textoSecundario }, active && { color: meta.color, fontFamily: Fonts.semiBold }]}>
                {meta.label}
              </EliteText>
            </Pressable>
          );
        })}
      </View>

      {/* Vacío POR FILTRO, que no es lo mismo que no haber escrito: el rango sí
          trajo entradas, las escondió el filtro, y se dice cómo verlas. */}
      {entries.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="funnel-outline" size={44} color={t.bordeMarcado} />
          <EliteText style={[s.emptyTitle, { color: t.texto }]}>Nada con esos filtros</EliteText>
          <EliteText style={[s.emptyText, { color: t.textoTenue }]}>
            {filtered
              ? 'Prueba quitando el tipo o borrando la búsqueda. Ampliar el rango también trae más.'
              : 'Amplía el rango para ver entradas más viejas.'}
          </EliteText>
        </View>
      ) : (
        entries.map((entry) => {
          const meta = TYPE_META[entry.journal_type] ?? TYPE_META.free;
          const expanded = expandedId === entry.id;
          return (
            <Pressable
              key={entry.id}
              onPress={() => toggleExpand(entry.id)}
              style={[s.entryCard, { backgroundColor: t.card, borderColor: t.borde }]}
            >
              <View style={s.entryHeader}>
                <EliteText style={[s.entryDate, { color: t.texto }]}>{formatEntryDate(entry.date)}</EliteText>
                <View style={[s.typeBadge, { backgroundColor: withOpacity(meta.color, 0.14) }]}>
                  <EliteText style={[s.typeBadgeText, { color: meta.color }]}>{meta.label}</EliteText>
                </View>
              </View>
              {entry.prompt ? (
                <EliteText style={[s.entryPrompt, { color: t.textoSecundario }]} numberOfLines={expanded ? undefined : 1}>
                  {entry.prompt}
                </EliteText>
              ) : null}
              <EliteText style={[s.entryContent, { color: t.textoSecundario }]} numberOfLines={expanded ? undefined : 3}>
                {entry.content}
              </EliteText>
              {entry.tags && entry.tags.length > 0 && expanded && (
                <View style={s.tagRow}>
                  {entry.tags.map((tag) => (
                    <EliteText key={tag} style={[s.tag, { color: t.textoTenue }]}>#{tag}</EliteText>
                  ))}
                </View>
              )}
              {expanded && (
                <View style={[s.actionRow, { borderTopColor: t.borde }]}>
                  <AnimatedPressable onPress={() => startEdit(entry)} style={s.actionBtn}>
                    <Ionicons name="pencil-outline" size={14} color={acento} />
                    <EliteText style={[s.actionText, { color: acento }]}>Editar</EliteText>
                  </AnimatedPressable>
                  <AnimatedPressable onPress={() => confirmDelete(entry)} style={s.actionBtn}>
                    <Ionicons name="trash-outline" size={14} color={SEMANTIC.error} />
                    <EliteText style={[s.actionText, { color: SEMANTIC.error }]}>Eliminar</EliteText>
                  </AnimatedPressable>
                </View>
              )}
            </Pressable>
          );
        })
      )}

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: t.flotante, borderColor: t.bordeMarcado }]}>
            <EliteText style={[s.modalTitle, { color: t.texto }]}>
              Editar · {editing ? formatEntryDate(editing.date) : ''}
            </EliteText>
            <TextInput
              style={[s.modalInput, { backgroundColor: t.hundido, borderColor: t.bordeMarcado, color: t.texto }]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
              placeholder="Escribe…"
              placeholderTextColor={t.sinDatos}
            />
            <View style={s.modalActions}>
              <AnimatedPressable onPress={() => setEditing(null)} style={s.modalBtnSecondary}>
                <EliteText style={[s.modalBtnSecondaryText, { color: t.textoSecundario }]}>Cancelar</EliteText>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={saveEdit}
                disabled={saving || editContent.trim().length === 0}
                style={s.modalBtnPrimary}
              >
                <EliteText style={s.modalBtnPrimaryText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * La tarjeta del hub. Pinta la MISMA cifra que ya cuenta el reporte de mente
 * (journalEntries), no una segunda cuenta propia: dos consultas al mismo dato
 * acaban diciendo dos números distintos.
 */
export function JournalResumen({ entries }: { entries: number }) {
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="JOURNAL" />
      <StatsRow>
        <Stat value={`${entries}`} label="entradas" />
      </StatsRow>
    </>
  );
}

/** Botón flotante al composer. Va fuera del ScrollView: no se desplaza. */
function JournalFab() {
  return (
    <AnimatedPressable
      onPress={() => { haptic.medium(); router.push('/journal'); }}
      style={fabStyles.fab}
    >
      <Ionicons name="add" size={28} color={ATP_BRAND.black} />
    </AnimatedPressable>
  );
}

export const journalDomain: ReportDomainDefinition<JournalReportData> = {
  key: 'journal',
  load: (_period, range) => loadJournalReport(range),
  isEmpty: (d) => d.entries.length === 0,
  toRows: (d) => journalRows(d.entries),
  render: (d, reload) => <JournalContent data={d} reload={reload} />,
  overlay: () => <JournalFab />,
};

const fabStyles = StyleSheet.create({
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
});

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  streakPill: {
    alignSelf: 'flex-start',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    marginBottom: Spacing.sm,
  },
  streakText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 0.5,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Platform.OS === 'ios' ? 10 : 2,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipActive: {
    borderColor: ATP_BRAND.lime,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
  },
  chipText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  chipTextActive: { fontFamily: Fonts.semiBold },
  entryCard: {
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
  entryDate: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, textTransform: 'capitalize' },
  typeBadge: { borderRadius: Radius.xs, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10, letterSpacing: 0.5 },
  entryPrompt: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  entryContent: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 19 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  tag: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.xs },
  emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  emptyText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalCard: { borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  modalTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, textTransform: 'capitalize' },
  modalInput: {
    minHeight: 140,
    maxHeight: 320,
    borderWidth: 0.5,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  modalBtnSecondary: { paddingVertical: 10, paddingHorizontal: Spacing.md },
  modalBtnSecondaryText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  modalBtnPrimary: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  modalBtnPrimaryText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: ATP_BRAND.black },
});
