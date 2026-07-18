/**
 * Comunidad › Amigos (C2) — solicitudes pendientes + lista de amigos.
 *
 * Fuente: list_pending_requests / list_friends / respond_friend_request (184).
 * Anti-fuga: solo proyecciones públicas whitelisteadas (el service pasa cada
 * fila por projectionIsClean). Cero DM: aquí no hay mensajería.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, DeviceEventEmitter } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { haptic } from '@/src/utils/haptics';
import {
  listFriends,
  listPendingRequests,
  respondFriendRequest,
} from '@/src/services/community/friends-service';
import {
  publicDisplayName,
  type FriendRow,
  type PendingRequestRow,
} from '@/src/services/community/friends-core';
import { rankTierLabel } from '@/src/services/economy/rank';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

function openProfile(userId: string) {
  router.push(`/comunidad/perfil/${userId}`);   // expo-router typegen post-beta
}

function IncomingRow({ row, onRespond }: {
  row: PendingRequestRow;
  onRespond: (requestId: string, accept: boolean) => void;
}) {
  const name = publicDisplayName(row);
  return (
    <View style={s.row}>
      <Pressable style={s.rowMain} onPress={() => openProfile(row.other_user_id)}>
        <UserAvatar uri={row.avatar_url} name={name} size={38} />
        <View style={{ flex: 1 }}>
          <EliteText style={s.name} numberOfLines={1}>{name}</EliteText>
          <EliteText style={s.sub}>Quiere ser tu amigo</EliteText>
        </View>
      </Pressable>
      <Pressable style={s.acceptBtn} onPress={() => onRespond(row.request_id, true)} hitSlop={6}>
        <EliteText style={s.acceptText}>Aceptar</EliteText>
      </Pressable>
      <Pressable style={s.declineBtn} onPress={() => onRespond(row.request_id, false)} hitSlop={6}>
        <Ionicons name="close" size={18} color={TEXT.secondary} />
      </Pressable>
    </View>
  );
}

function OutgoingRow({ row }: { row: PendingRequestRow }) {
  const name = publicDisplayName(row);
  return (
    <Pressable style={s.row} onPress={() => openProfile(row.other_user_id)}>
      <View style={s.rowMain}>
        <UserAvatar uri={row.avatar_url} name={name} size={38} />
        <View style={{ flex: 1 }}>
          <EliteText style={s.name} numberOfLines={1}>{name}</EliteText>
          <EliteText style={s.sub}>Solicitud enviada</EliteText>
        </View>
      </View>
      <EliteText style={s.pendingBadge}>Pendiente</EliteText>
    </Pressable>
  );
}

function FriendItem({ row }: { row: FriendRow }) {
  const name = publicDisplayName(row);
  return (
    <Pressable style={s.row} onPress={() => openProfile(row.user_id)}>
      <View style={s.rowMain}>
        <UserAvatar uri={row.avatar_url} name={name} size={38} />
        <View style={{ flex: 1 }}>
          <EliteText style={s.name} numberOfLines={1}>{name}</EliteText>
          <EliteText style={s.sub}>
            {row.current_rank != null
              ? `Nivel ${row.current_rank} · ${rankTierLabel(row.current_rank)}`
              : 'Nivel privado'}
          </EliteText>
        </View>
      </View>
      {row.streak_days != null && row.streak_days > 0 && (
        <EliteText style={s.streak}>🔥 {row.streak_days}</EliteText>
      )}
      <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
    </Pressable>
  );
}

export default function CommunityFriendsScreen() {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<PendingRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<PendingRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [list, pending] = await Promise.all([listFriends(), listPendingRequests()]);
    setFriends(list);
    setIncoming(pending.incoming);
    setOutgoing(pending.outgoing);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener('friends_changed', load);
    return () => sub.remove();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onRespond = useCallback(async (requestId: string, accept: boolean) => {
    haptic.light();
    // Optimista: saca la solicitud de la lista; el listener friends_changed recarga.
    setIncoming((prev) => prev.filter((r) => r.request_id !== requestId));
    await respondFriendRequest(requestId, accept);
  }, []);

  const hasAnything = friends.length > 0 || incoming.length > 0 || outgoing.length > 0;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />}
    >
      <View style={{ paddingTop: insets.top + 8 }}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </Pressable>
          <Pressable onPress={() => router.push('/comunidad/buscar')} hitSlop={12}>
            <Ionicons name="search" size={22} color={TEXT.primary} />
          </Pressable>
        </View>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.title}>Amigos</EliteText>
          <EliteText style={s.subtitle}>Tu tribu dentro de ATP. Sin chats: la constancia habla.</EliteText>
        </Animated.View>
      </View>

      {/* ── Solicitudes recibidas ── */}
      {incoming.length > 0 && (
        <Animated.View entering={FadeInUp.delay(90).springify()}>
          <EliteText style={s.sectionTitle}>SOLICITUDES RECIBIDAS</EliteText>
          {incoming.map((r) => <IncomingRow key={r.request_id} row={r} onRespond={onRespond} />)}
        </Animated.View>
      )}

      {/* ── Solicitudes enviadas ── */}
      {outgoing.length > 0 && (
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <EliteText style={s.sectionTitle}>SOLICITUDES ENVIADAS</EliteText>
          {outgoing.map((r) => <OutgoingRow key={r.request_id} row={r} />)}
        </Animated.View>
      )}

      {/* ── Mis amigos ── */}
      <Animated.View entering={FadeInUp.delay(150).springify()}>
        <EliteText style={s.sectionTitle}>MIS AMIGOS{friends.length > 0 ? ` (${friends.length})` : ''}</EliteText>
        {loading ? (
          <EliteText style={s.empty}>Cargando…</EliteText>
        ) : friends.length === 0 ? (
          hasAnything ? (
            <EliteText style={s.empty}>Aún no tienes amigos aceptados. Tus solicitudes están en camino.</EliteText>
          ) : (
            <EmptyState
              icon="people-outline"
              title="Todavía no tienes amigos aquí"
              subtitle="Busca a tu gente por nombre de usuario y entrena acompañado."
              actionLabel="Buscar personas"
              onAction={() => router.push('/comunidad/buscar')}
              color={ATP_BRAND.lime}
            />
          )
        ) : (
          friends.map((f) => <FriendItem key={f.user_id} row={f} />)
        )}
      </Animated.View>

      {friends.length > 0 && (
        <Pressable style={s.searchLink} onPress={() => router.push('/comunidad/buscar')}>
          <Ionicons name="person-add-outline" size={16} color={ATP_BRAND.lime} />
          <EliteText style={s.searchLinkText}>Buscar más personas</EliteText>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 4 },
  sectionTitle: {
    fontSize: 11, letterSpacing: 2, fontFamily: Fonts.semiBold, color: TEXT.secondary,
    textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2 },
  streak: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.secondary },
  acceptBtn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  acceptText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
  declineBtn: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: Radius.sm, padding: 6,
  },
  pendingBadge: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: TEXT.tertiary },
  empty: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary,
    textAlign: 'center', paddingVertical: Spacing.lg,
  },
  searchLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.md, paddingVertical: 10,
  },
  searchLinkText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
});
