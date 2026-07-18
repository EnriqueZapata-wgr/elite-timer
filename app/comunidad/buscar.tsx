/**
 * Comunidad › Buscar personas (C2) — búsqueda con debounce + agregar amigos.
 *
 * Espejo del servidor: mínimo 2 caracteres y rate limit 20/60s (search_users v2,
 * mig 184). El guard local avisa suave ANTES de quemar la llamada; el server
 * además excluye bloqueados en cualquier dirección y perfiles no discoverable.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { haptic } from '@/src/utils/haptics';
import {
  searchUsersGuarded,
  sendFriendRequest,
  listFriends,
  listPendingRequests,
} from '@/src/services/community/friends-service';
import {
  publicDisplayName,
  stateAfterSendCode,
  type FriendState,
} from '@/src/services/community/friends-core';
import { type UserSearchResult } from '@/src/services/community/public-profile-service';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

const DEBOUNCE_MS = 400;
const MIN_CHARS = 2; // espejo del server (length < 2 → vacío)

const STATE_LABEL: Record<Exclude<FriendState, 'none' | 'blocked'>, string> = {
  friends: 'Ya son amigos',
  outgoing: 'Pendiente',
  incoming: 'Te envió solicitud',
};

function ResultRow({ row, state, onAdd }: {
  row: UserSearchResult;
  state: FriendState;
  onAdd: (userId: string) => void;
}) {
  const name = publicDisplayName(row);
  return (
    <View style={s.row}>
      <Pressable style={s.rowMain} onPress={() => router.push(`/comunidad/perfil/${row.user_id}`)}>
        <UserAvatar uri={row.avatar_url} name={name} size={38} />
        <View style={{ flex: 1 }}>
          <EliteText style={s.name} numberOfLines={1}>{name}</EliteText>
          {row.username && <EliteText style={s.sub}>@{row.username}</EliteText>}
        </View>
      </Pressable>
      {state === 'none' || state === 'blocked' ? (
        <Pressable style={s.addBtn} onPress={() => onAdd(row.user_id)} hitSlop={6}>
          <Ionicons name="person-add-outline" size={14} color={ATP_BRAND.lime} />
          <EliteText style={s.addText}>Agregar</EliteText>
        </Pressable>
      ) : (
        <EliteText style={s.stateBadge}>{STATE_LABEL[state]}</EliteText>
      )}
    </View>
  );
}

export default function CommunitySearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [states, setStates] = useState<Record<string, FriendState>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estado de relación existente (amigos + pendientes) para marcar resultados.
  useEffect(() => {
    (async () => {
      const [friends, pending] = await Promise.all([listFriends(), listPendingRequests()]);
      const map: Record<string, FriendState> = {};
      for (const f of friends) map[f.user_id] = 'friends';
      for (const r of pending.incoming) map[r.other_user_id] = 'incoming';
      for (const r of pending.outgoing) map[r.other_user_id] = 'outgoing';
      setStates((prev) => ({ ...map, ...prev }));
    })();
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    const { results: rows, rateLimited: limited } = await searchUsersGuarded(q);
    setResults(rows);
    setRateLimited(limited);
    setSearching(false);
  }, []);

  const onChangeQuery = useCallback((t: string) => {
    setQuery(t);
    if (timer.current) clearTimeout(timer.current);
    if (t.trim().length < MIN_CHARS) {
      setResults([]);
      setRateLimited(false);
      return;
    }
    timer.current = setTimeout(() => runSearch(t), DEBOUNCE_MS);
  }, [runSearch]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onAdd = useCallback(async (userId: string) => {
    haptic.light();
    setStates((prev) => ({ ...prev, [userId]: 'outgoing' })); // optimista
    const code = await sendFriendRequest(userId);
    setStates((prev) => ({ ...prev, [userId]: stateAfterSendCode(code) }));
  }, []);

  const showMinHint = query.trim().length > 0 && query.trim().length < MIN_CHARS;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.title}>Buscar personas</EliteText>
          <EliteText style={s.subtitle}>Encuentra a tu gente por nombre o usuario.</EliteText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(90).springify()}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={TEXT.tertiary} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Nombre o @usuario"
            placeholderTextColor={TEXT.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            style={s.input}
          />
          {query.length > 0 && (
            <Pressable onPress={() => onChangeQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={TEXT.tertiary} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {rateLimited && (
        <EliteText style={s.rateLimit}>Demasiadas búsquedas, espera un momento.</EliteText>
      )}
      {showMinHint && (
        <EliteText style={s.hint}>Escribe al menos {MIN_CHARS} caracteres.</EliteText>
      )}

      <View style={{ marginTop: Spacing.md }}>
        {searching ? (
          <EliteText style={s.empty}>Buscando…</EliteText>
        ) : results.length === 0 && query.trim().length >= MIN_CHARS && !rateLimited ? (
          <EliteText style={s.empty}>
            Sin resultados. Solo aparecen perfiles que activaron “Aparecer en el buscador”.
          </EliteText>
        ) : (
          results.map((row) => (
            <ResultRow
              key={row.user_id}
              row={row}
              state={states[row.user_id] ?? 'none'}
              onAdd={onAdd}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, marginTop: Spacing.lg,
  },
  input: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.regular, color: TEXT.primary, paddingVertical: 12 },
  rateLimit: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#fbbf24',
    marginTop: 8, marginLeft: 4,
  },
  hint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 8, marginLeft: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  addText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
  stateBadge: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: TEXT.tertiary },
  empty: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary,
    textAlign: 'center', paddingVertical: Spacing.lg, lineHeight: 20,
  },
});
