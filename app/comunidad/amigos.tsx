/**
 * Comunidad › Amigos (C2) — solicitudes pendientes + lista de amigos.
 *
 * Fuente: list_pending_requests / list_friends / respond_friend_request (184).
 * Anti-fuga: solo proyecciones públicas whitelisteadas (el service pasa cada
 * fila por projectionIsClean). Cero DM: aquí no hay mensajería.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, DeviceEventEmitter, Alert } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

function openProfile(userId: string) {
  router.push(`/comunidad/perfil/${userId}`);   // expo-router typegen post-beta
}

function IncomingRow({ row, onRespond }: {
  row: PendingRequestRow;
  onRespond: (requestId: string, accept: boolean) => void;
}) {
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const name = publicDisplayName(row);
  return (
    <View style={[s.row, { backgroundColor: t.card, borderColor: t.borde }]}>
      <Pressable style={s.rowMain} onPress={() => openProfile(row.other_user_id)}>
        <UserAvatar uri={row.avatar_url} name={name} size={38} />
        <View style={{ flex: 1 }}>
          <EliteText style={[s.name, { color: t.texto }]} numberOfLines={1}>{name}</EliteText>
          <EliteText style={[s.sub, { color: t.textoTenue }]}>Quiere ser tu amigo</EliteText>
        </View>
      </Pressable>
      <Pressable style={s.acceptBtn} onPress={() => onRespond(row.request_id, true)} hitSlop={6}>
        <EliteText style={[s.acceptText, { color: acento }]}>Aceptar</EliteText>
      </Pressable>
      <Pressable style={[s.declineBtn, { backgroundColor: t.flotante, borderColor: t.bordeMarcado }]} onPress={() => onRespond(row.request_id, false)} hitSlop={6}>
        <Ionicons name="close" size={18} color={t.textoSecundario} />
      </Pressable>
    </View>
  );
}

function OutgoingRow({ row }: { row: PendingRequestRow }) {
  const { tokens: t } = useAppTheme();
  const name = publicDisplayName(row);
  return (
    <Pressable style={[s.row, { backgroundColor: t.card, borderColor: t.borde }]} onPress={() => openProfile(row.other_user_id)}>
      <View style={s.rowMain}>
        <UserAvatar uri={row.avatar_url} name={name} size={38} />
        <View style={{ flex: 1 }}>
          <EliteText style={[s.name, { color: t.texto }]} numberOfLines={1}>{name}</EliteText>
          <EliteText style={[s.sub, { color: t.textoTenue }]}>Solicitud enviada</EliteText>
        </View>
      </View>
      <EliteText style={[s.pendingBadge, { color: t.textoTenue }]}>Pendiente</EliteText>
    </Pressable>
  );
}

function FriendItem({ row }: { row: FriendRow }) {
  const { tokens: t } = useAppTheme();
  const name = publicDisplayName(row);
  return (
    <Pressable style={[s.row, { backgroundColor: t.card, borderColor: t.borde }]} onPress={() => openProfile(row.user_id)}>
      <View style={s.rowMain}>
        <UserAvatar uri={row.avatar_url} name={name} size={38} />
        <View style={{ flex: 1 }}>
          <EliteText style={[s.name, { color: t.texto }]} numberOfLines={1}>{name}</EliteText>
          <EliteText style={[s.sub, { color: t.textoTenue }]}>
            {row.current_rank != null
              ? `Nivel ${row.current_rank} · ${rankTierLabel(row.current_rank)}`
              : 'Nivel privado'}
          </EliteText>
        </View>
      </View>
      {row.streak_days != null && row.streak_days > 0 && (
        <EliteText style={[s.streak, { color: t.textoSecundario }]}>🔥 {row.streak_days}</EliteText>
      )}
      <Ionicons name="chevron-forward" size={16} color={t.textoTenue} />
    </Pressable>
  );
}

export default function CommunityFriendsScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const secTxt = { color: t.textoSecundario };
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
    const code = await respondFriendRequest(requestId, accept);
    // E-9 (MB-12): si el RPC falló, la solicitud VUELVE a la lista — antes
    // desaparecía de la UI sin haberse respondido de verdad.
    if (code !== 'accepted' && code !== 'declined') {
      Alert.alert('No se pudo responder', 'Revisa tu conexión e intenta de nuevo.');
      load();
    }
  }, [load]);

  const hasAnything = friends.length > 0 || incoming.length > 0 || outgoing.length > 0;

  return (
    <ThemeReady>
    <ScrollView
      style={[s.screen, { backgroundColor: t.fondo }]}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />}
    >
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <View style={{ paddingTop: insets.top + 8 }}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={t.texto} />
          </Pressable>
          <Pressable onPress={() => router.push('/comunidad/buscar')} hitSlop={12}>
            <Ionicons name="search" size={22} color={t.texto} />
          </Pressable>
        </View>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[s.title, { color: t.texto }]}>Amigos</EliteText>
          <EliteText style={[s.subtitle, secTxt]}>Tu tribu dentro de ATP. Sin chats: la constancia habla.</EliteText>
        </Animated.View>
      </View>

      {/* MB-4 Bloque 4: ánimo compartido de tu gente (opt-in, sin ranking) */}
      <Animated.View entering={FadeInUp.delay(70).springify()}>
        <Pressable style={[s.animoLink, { backgroundColor: t.card, borderColor: t.borde }]} onPress={() => { haptic.light(); router.push('/comunidad/animo'); }}>
          <Ionicons name="pulse-outline" size={16} color={t.tealTexto} />
          <View style={{ flex: 1 }}>
            <EliteText style={[s.animoTitle, { color: t.texto }]}>Ánimo de tu gente</EliteText>
            <EliteText style={[s.animoSub, secTxt]}>Lo que tus amigos eligieron compartir</EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
        </Pressable>
      </Animated.View>

      {/* ── Solicitudes recibidas ── */}
      {incoming.length > 0 && (
        <Animated.View entering={FadeInUp.delay(90).springify()}>
          <EliteText style={[s.sectionTitle, secTxt]}>SOLICITUDES RECIBIDAS</EliteText>
          {incoming.map((r) => <IncomingRow key={r.request_id} row={r} onRespond={onRespond} />)}
        </Animated.View>
      )}

      {/* ── Solicitudes enviadas ── */}
      {outgoing.length > 0 && (
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <EliteText style={[s.sectionTitle, secTxt]}>SOLICITUDES ENVIADAS</EliteText>
          {outgoing.map((r) => <OutgoingRow key={r.request_id} row={r} />)}
        </Animated.View>
      )}

      {/* ── Mis amigos ── */}
      <Animated.View entering={FadeInUp.delay(150).springify()}>
        <EliteText style={[s.sectionTitle, secTxt]}>MIS AMIGOS{friends.length > 0 ? ` (${friends.length})` : ''}</EliteText>
        {loading ? (
          <EliteText style={[s.empty, secTxt]}>Cargando…</EliteText>
        ) : friends.length === 0 ? (
          hasAnything ? (
            <EliteText style={[s.empty, secTxt]}>Aún no tienes amigos aceptados. Tus solicitudes están en camino.</EliteText>
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
          <Ionicons name="person-add-outline" size={16} color={acento} />
          <EliteText style={[s.searchLinkText, { color: acento }]}>Buscar más personas</EliteText>
        </Pressable>
      )}
    </ScrollView>
    </ThemeReady>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 4 },
  sectionTitle: {
    fontSize: 11, letterSpacing: 2, fontFamily: Fonts.semiBold,
    textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  streak: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
  acceptBtn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  acceptText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  declineBtn: {
    borderWidth: 1,
    borderRadius: Radius.sm, padding: 6,
  },
  pendingBadge: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  empty: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    textAlign: 'center', paddingVertical: Spacing.lg,
  },
  searchLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.md, paddingVertical: 10,
  },
  searchLinkText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  // MB-4 Bloque 4: acceso al ánimo compartido
  animoLink: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  animoTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  animoSub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
});
