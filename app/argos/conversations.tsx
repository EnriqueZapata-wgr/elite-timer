/**
 * ARGOS — Historial de conversaciones (F2.2 #93 · MB-21 Pieza 3).
 *
 * Lo que lo vuelve usable con cincuenta conversaciones: grupos por fecha
 * (Hoy/Ayer/Esta semana/Más atrás), búsqueda por contenido, renombrar (con
 * título propuesto por ARGOS cuando hay sustancia), marcador de la
 * conversación abierta, paginación, y navegación con push (con replace el
 * panel desaparecía del historial y el regreso se sentía roto).
 */
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  loadConversations, deleteConversation, renameConversation, suggestConversationTitle,
  type ArgosMessage,
} from '@/src/services/argos-service';
import {
  CONVERSATIONS_PAGE_SIZE, groupConversations, filterConversations, hasMorePages,
  hasTitleSubstance, sanitizeTitle, type ConversationListRow,
} from '@/src/services/argos-conversations-core';
import { openArgosChat } from '@/src/services/argos-nav';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, BG, BORDER, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ` · ${time}`;
}

export default function ArgosConversationsScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // El chat manda su conversación activa para marcarla en la lista.
  const params = useLocalSearchParams<{ current?: string }>();
  const [convs, setConvs] = useState<ConversationListRow[]>([]);
  const [loading, setLoading] = useState(true);
  // "No pude leer" ≠ "no hay conversaciones": sin esto, un error de lectura
  // (p. ej. migración 253 sin aplicar) se veía como pérdida total del historial.
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [more, setMore] = useState(false);
  const [query, setQuery] = useState('');
  // Renombrar: la conversación en edición + el borrador del título.
  const [renaming, setRenaming] = useState<ConversationListRow | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { rows, error } = await loadConversations(user.id, CONVERSATIONS_PAGE_SIZE, 0);
    setLoadError(error != null);
    if (error == null) {
      setConvs(rows as ConversationListRow[]);
      setMore(hasMorePages(rows.length));
    }
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  async function loadMore() {
    if (!user?.id || loadingMore) return;
    setLoadingMore(true);
    const { rows, error } = await loadConversations(user.id, CONVERSATIONS_PAGE_SIZE, convs.length);
    if (error == null) {
      setConvs(prev => {
        const seen = new Set(prev.map(r => r.id));
        return [...prev, ...(rows as ConversationListRow[]).filter(r => !seen.has(r.id))];
      });
      setMore(hasMorePages(rows.length));
    }
    setLoadingMore(false);
  }

  const openConv = (id: string) => {
    haptic.light();
    // push, no replace: el panel se queda en el historial y el regreso vuelve aquí.
    openArgosChat({ conversationId: id });
  };

  const confirmDelete = (conv: ConversationListRow) => {
    haptic.warning();
    Alert.alert(
      'Eliminar conversación',
      `"${conv.title}" se eliminará para siempre.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteConversation(conv.id);
            if (ok) { haptic.success(); reload(); }
          },
        },
      ],
    );
  };

  function startRename(conv: ConversationListRow) {
    haptic.light();
    setDraftTitle(conv.title);
    setRenaming(conv);
  }

  async function saveRename() {
    if (!renaming) return;
    const clean = sanitizeTitle(draftTitle);
    if (!clean) { setRenaming(null); return; }
    const ok = await renameConversation(renaming.id, clean);
    if (ok) {
      haptic.success();
      setConvs(prev => prev.map(c => (c.id === renaming.id ? { ...c, title: clean } : c)));
    }
    setRenaming(null);
  }

  async function suggestTitle() {
    if (!user?.id || !renaming || suggesting) return;
    setSuggesting(true);
    const title = await suggestConversationTitle(user.id, (renaming.messages ?? []) as ArgosMessage[]);
    setSuggesting(false);
    if (title) { haptic.light(); setDraftTitle(title); }
  }

  const filtered = filterConversations(convs, query);
  const groups = groupConversations(filtered, Date.now());

  return (
    <View style={{ flex: 1, backgroundColor: ELEVATION[0].bg }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Conversaciones</Text>
          <Text style={s.subtitle}>Tu historial con ARGOS</Text>
        </View>
      </View>

      {/* Búsqueda por contenido, no solo por título */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={16} color={TEXT.tertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar en tus conversaciones..."
          placeholderTextColor={TEXT.muted}
          style={s.searchInput}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={TEXT.tertiary} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}>
        <AnimatedPressable
          style={s.newBtn}
          onPress={() => {
            haptic.medium();
            openArgosChat({ startNew: true });
          }}
        >
          <Ionicons name="add" size={18} color="#000" />
          <Text style={s.newBtnText}>NUEVA CONVERSACIÓN</Text>
        </AnimatedPressable>

        {loading && convs.length === 0 && (
          <Text style={s.empty}>Cargando…</Text>
        )}
        {!loading && loadError && convs.length === 0 && (
          <View>
            <Text style={s.empty}>
              No pude cargar tu historial. Tus conversaciones siguen guardadas.
              Revisa tu conexión e intenta de nuevo.
            </Text>
            <Pressable onPress={reload} style={s.moreBtn}>
              <Text style={s.moreBtnText}>Reintentar</Text>
            </Pressable>
          </View>
        )}
        {!loading && !loadError && convs.length === 0 && (
          <Text style={s.empty}>
            Aún no hay conversaciones. Pregúntale algo a ARGOS y aparecerá aquí.
          </Text>
        )}
        {!loading && convs.length > 0 && filtered.length === 0 && (
          <Text style={s.empty}>Nada con "{query}". Prueba otra palabra.</Text>
        )}

        {groups.map(group => (
          <View key={group.key}>
            <Text style={s.groupLabel}>{group.label.toUpperCase()}</Text>
            {group.rows.map((conv, i) => {
              const last = conv.messages?.[conv.messages.length - 1];
              const isCurrent = params.current != null && conv.id === params.current;
              return (
                <Animated.View key={conv.id} entering={FadeInUp.delay(Math.min(i * 30, 300)).springify()}>
                  <Pressable onPress={() => openConv(conv.id)} style={[s.row, isCurrent && s.rowCurrent]}>
                    <View style={s.rowIcon}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={ATP_BRAND.lime} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[s.rowTitle, { flexShrink: 1 }]} numberOfLines={1}>{conv.title}</Text>
                        {isCurrent && (
                          <View style={s.currentPill}>
                            <Text style={s.currentPillText}>ABIERTA</Text>
                          </View>
                        )}
                      </View>
                      {last && (
                        <Text style={s.rowPreview} numberOfLines={1}>
                          {last.role === 'user' ? 'Tú: ' : 'ARGOS: '}{last.content}
                        </Text>
                      )}
                      <Text style={s.rowDate}>{fmtDate(conv.updated_at)}</Text>
                    </View>
                    <Pressable onPress={() => startRename(conv)} hitSlop={10} style={{ padding: 4 }}>
                      <Ionicons name="pencil-outline" size={16} color={TEXT.tertiary} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(conv)} hitSlop={10} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={TEXT.tertiary} />
                    </Pressable>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}

        {/* Paginación: antes había un tope duro de 50 sin forma de ver más. */}
        {more && !query && (
          <Pressable onPress={loadMore} style={s.moreBtn} disabled={loadingMore}>
            {loadingMore
              ? <ActivityIndicator size="small" color={TEXT.secondary} />
              : <Text style={s.moreBtnText}>Ver más</Text>}
          </Pressable>
        )}
      </ScrollView>

      {/* Renombrar — título editable + propuesta de ARGOS si hay sustancia */}
      <Modal visible={renaming != null} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setRenaming(null)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <Text style={s.modalTitle}>Renombrar conversación</Text>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              style={s.modalInput}
              placeholder="Título"
              placeholderTextColor={TEXT.muted}
              maxLength={80}
              autoFocus
            />
            {renaming != null && hasTitleSubstance(renaming.messages?.length ?? 0) && (
              <Pressable onPress={suggestTitle} style={s.suggestBtn} disabled={suggesting}>
                {suggesting
                  ? <ActivityIndicator size="small" color={ATP_BRAND.lime} />
                  : (
                    <>
                      <Ionicons name="sparkles-outline" size={14} color={ATP_BRAND.lime} />
                      <Text style={s.suggestBtnText}>Que ARGOS proponga uno</Text>
                    </>
                  )}
              </Pressable>
            )}
            <View style={s.modalActions}>
              <Pressable onPress={() => setRenaming(null)} style={s.modalBtn}>
                <Text style={s.modalBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={saveRename} style={[s.modalBtn, s.modalBtnPrimary]}>
                <Text style={s.modalBtnPrimaryText}>Guardar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: BORDER.subtle,
  },
  title: { color: TEXT.primary, fontSize: FontSizes.xl, fontFamily: Fonts.bold },
  subtitle: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BG.input, borderWidth: 1, borderColor: BORDER.input,
    borderRadius: Radius.lg, paddingHorizontal: 14,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
  },
  searchInput: {
    flex: 1, color: TEXT.primary, fontSize: FontSizes.md,
    fontFamily: Fonts.regular, paddingVertical: 10,
  },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 13, marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  newBtnText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1 },
  empty: {
    color: TEXT.muted, fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: Spacing.xl, lineHeight: 20,
  },
  groupLabel: {
    color: TEXT.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold,
    letterSpacing: 2, marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  rowCurrent: { borderColor: withOpacity(ATP_BRAND.lime, 0.45) },
  rowIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { color: TEXT.primary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  currentPill: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2,
  },
  currentPillText: {
    color: ATP_BRAND.lime, fontSize: 8, fontFamily: Fonts.bold, letterSpacing: 1,
  },
  rowPreview: { color: TEXT.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  rowDate: { color: TEXT.muted, fontSize: 10, fontFamily: Fonts.regular, marginTop: 3 },
  moreBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER.card, borderRadius: Radius.lg,
    paddingVertical: 12, marginTop: Spacing.sm,
  },
  moreBtnText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: Radius.md, padding: Spacing.md,
  },
  modalTitle: { color: TEXT.primary, fontSize: FontSizes.lg, fontFamily: Fonts.bold, marginBottom: Spacing.md },
  modalInput: {
    backgroundColor: BG.input, borderWidth: 1, borderColor: BORDER.input,
    borderRadius: Radius.sm, color: TEXT.primary, fontSize: FontSizes.md,
    fontFamily: Fonts.regular, paddingHorizontal: 12, paddingVertical: 10,
  },
  suggestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, marginTop: Spacing.sm,
  },
  suggestBtnText: { color: ATP_BRAND.lime, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: Spacing.md,
  },
  modalBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm,
  },
  modalBtnPrimary: { backgroundColor: ATP_BRAND.lime },
  modalBtnText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  modalBtnPrimaryText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold },
});
