/**
 * Comunidad › Perfil público (C2) — get_public_profile + estado de amistad +
 * moderación (reportar / bloquear).
 *
 * Anti-fuga: SOLO muestra la proyección pública whitelisteada; los campos que
 * el dueño ocultó llegan en NULL desde el server y aquí simplemente no se
 * renderizan. El guard projectionIsClean corre en el service. Cero DM.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Alert, DeviceEventEmitter } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getPublicProfile } from '@/src/services/community/public-profile-service';
import { type VisiblePublicProfile } from '@/src/services/community/public-profile-core';
import {
  sendFriendRequest,
  respondFriendRequest,
  unfriend,
  blockUser,
  reportUser,
  unblockUser,
  isBlockedByMe,
  listFriends,
  listPendingRequests,
} from '@/src/services/community/friends-service';
import {
  publicDisplayName,
  stateAfterSendCode,
  type FriendState,
} from '@/src/services/community/friends-core';
import { rankTierLabel } from '@/src/services/economy/rank';
import { REPORT_REASONS, type ReportReasonKey } from '@/src/constants/community';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

interface RelationInfo {
  state: FriendState;
  /** id de la solicitud entrante (para Aceptar desde el perfil). */
  incomingRequestId: string | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.stat}>
      <EliteText style={s.statValue}>{value}</EliteText>
      <EliteText style={s.statLabel}>{label}</EliteText>
    </View>
  );
}

export default function CommunityPublicProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<VisiblePublicProfile | null>(null);
  const [relation, setRelation] = useState<RelationInfo>({ state: 'none', incomingRequestId: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isMe = !!user?.id && user.id === userId;

  const load = useCallback(async () => {
    if (!userId) return;
    const [p, blocked, friends, pending] = await Promise.all([
      getPublicProfile(userId),
      isBlockedByMe(userId),
      listFriends(),
      listPendingRequests(),
    ]);
    setProfile(p);
    if (blocked) {
      setRelation({ state: 'blocked', incomingRequestId: null });
    } else if (friends.some((f) => f.user_id === userId)) {
      setRelation({ state: 'friends', incomingRequestId: null });
    } else {
      const inc = pending.incoming.find((r) => r.other_user_id === userId);
      const out = pending.outgoing.find((r) => r.other_user_id === userId);
      setRelation({
        state: inc ? 'incoming' : out ? 'outgoing' : 'none',
        incomingRequestId: inc?.request_id ?? null,
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener('friends_changed', load);
    return () => sub.remove();
  }, [load]);

  // ── Acciones de amistad ──

  const onAdd = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    haptic.light();
    const code = await sendFriendRequest(userId);
    setRelation((r) => ({ ...r, state: stateAfterSendCode(code) }));
    if (code === 'not_allowed') {
      Alert.alert('No disponible', 'Esta persona no acepta solicitudes por ahora.');
    }
    setBusy(false);
  }, [userId, busy]);

  const onAccept = useCallback(async () => {
    if (!relation.incomingRequestId || busy) return;
    setBusy(true);
    haptic.light();
    const code = await respondFriendRequest(relation.incomingRequestId, true);
    if (code === 'accepted') setRelation({ state: 'friends', incomingRequestId: null });
    setBusy(false);
  }, [relation.incomingRequestId, busy]);

  const onUnfriend = useCallback(() => {
    if (!userId) return;
    Alert.alert('Eliminar amigo', '¿Quitar a esta persona de tus amigos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          haptic.medium();
          const code = await unfriend(userId);
          if (code === 'unfriended') setRelation({ state: 'none', incomingRequestId: null });
        },
      },
    ]);
  }, [userId]);

  // ── Moderación ──

  const onBlock = useCallback(() => {
    if (!userId) return;
    setMenuOpen(false);
    Alert.alert(
      'Bloquear',
      'No podrán enviarte solicitudes ni aparecer en tu búsqueda. Si son amigos, la amistad se elimina.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            haptic.medium();
            await blockUser(userId);
            router.back();
          },
        },
      ],
    );
  }, [userId]);

  const onUnblock = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    haptic.light();
    await unblockUser(userId);
    setRelation({ state: 'none', incomingRequestId: null });
    setBusy(false);
  }, [userId, busy]);

  const onReport = useCallback(async (reason: ReportReasonKey) => {
    if (!userId) return;
    setReportOpen(false);
    haptic.light();
    await reportUser(userId, reason);
    Alert.alert('Gracias', 'Recibimos tu reporte. Lo revisaremos pronto.');
  }, [userId]);

  const name = profile ? publicDisplayName(profile) : 'Atleta ATP';

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
    >
      <View style={{ paddingTop: insets.top + 8 }}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </Pressable>
          {!isMe && (
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
              <Ionicons name="ellipsis-horizontal" size={22} color={TEXT.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <EliteText style={s.empty}>Cargando…</EliteText>
      ) : !profile ? (
        <EliteText style={s.empty}>Este perfil no está disponible.</EliteText>
      ) : (
        <>
          {/* ── Identidad ── */}
          <Animated.View entering={FadeInUp.delay(40).springify()} style={s.identity}>
            <UserAvatar uri={profile.avatar_url} name={name} size={84} />
            <EliteText style={s.name}>{name}</EliteText>
            {profile.username && <EliteText style={s.username}>@{profile.username}</EliteText>}
            {(profile.country || profile.chronotype) && (
              <EliteText style={s.meta}>
                {[profile.country, profile.chronotype].filter(Boolean).join(' · ')}
              </EliteText>
            )}
          </Animated.View>

          {/* ── Stats visibles (los NULL del server se ocultan) ── */}
          <Animated.View entering={FadeInUp.delay(90).springify()} style={s.statsRow}>
            <Stat label="Amigos" value={String(profile.friend_count)} />
            {profile.streak_days != null && (
              <Stat label="Racha" value={`🔥 ${profile.streak_days}`} />
            )}
            {profile.lifetime_electrons != null && (
              <Stat label="Electrones" value={`${profile.lifetime_electrons.toLocaleString()} E-`} />
            )}
            {profile.current_rank != null && (
              <Stat label="Nivel" value={`${profile.current_rank} · ${rankTierLabel(profile.current_rank)}`} />
            )}
          </Animated.View>

          {/* ── Acción principal según estado ── */}
          {!isMe && (
            <Animated.View entering={FadeInUp.delay(140).springify()}>
              {relation.state === 'none' && (
                <Pressable style={s.primaryBtn} onPress={onAdd} disabled={busy}>
                  <Ionicons name="person-add-outline" size={18} color={ATP_BRAND.black} />
                  <EliteText style={s.primaryBtnText}>Agregar amigo</EliteText>
                </Pressable>
              )}
              {relation.state === 'outgoing' && (
                <View style={s.secondaryBtn}>
                  <Ionicons name="hourglass-outline" size={16} color={TEXT.secondary} />
                  <EliteText style={s.secondaryBtnText}>Solicitud enviada</EliteText>
                </View>
              )}
              {relation.state === 'incoming' && (
                <Pressable style={s.primaryBtn} onPress={onAccept} disabled={busy}>
                  <Ionicons name="checkmark" size={18} color={ATP_BRAND.black} />
                  <EliteText style={s.primaryBtnText}>Aceptar solicitud</EliteText>
                </Pressable>
              )}
              {relation.state === 'friends' && (
                <Pressable style={s.secondaryBtn} onPress={onUnfriend}>
                  <Ionicons name="person-remove-outline" size={16} color={TEXT.secondary} />
                  <EliteText style={s.secondaryBtnText}>Eliminar amigo</EliteText>
                </Pressable>
              )}
              {relation.state === 'blocked' && (
                <Pressable style={s.secondaryBtn} onPress={onUnblock} disabled={busy}>
                  <Ionicons name="lock-open-outline" size={16} color={TEXT.secondary} />
                  <EliteText style={s.secondaryBtnText}>Desbloquear</EliteText>
                </Pressable>
              )}
            </Animated.View>
          )}

          <EliteText style={s.footNote}>
            Solo se muestra lo que esta persona decidió compartir. Nada clínico es público, nunca.
          </EliteText>
        </>
      )}

      {/* ── Menú overflow: Reportar / Bloquear ── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={[s.menu, { marginTop: insets.top + 48 }]}>
            <Pressable
              style={s.menuItem}
              onPress={() => { setMenuOpen(false); setReportOpen(true); }}
            >
              <Ionicons name="flag-outline" size={18} color={TEXT.primary} />
              <EliteText style={s.menuItemText}>Reportar</EliteText>
            </Pressable>
            {relation.state !== 'blocked' && (
              <Pressable style={s.menuItem} onPress={onBlock}>
                <Ionicons name="hand-left-outline" size={18} color="#ef4444" />
                <EliteText style={[s.menuItemText, { color: '#ef4444' }]}>Bloquear</EliteText>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── Sheet de razones de report ── */}
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setReportOpen(false)}>
          <View style={s.sheet}>
            <EliteText style={s.sheetTitle}>¿Por qué reportas este perfil?</EliteText>
            {REPORT_REASONS.map((r) => (
              <Pressable key={r.key} style={s.reasonRow} onPress={() => onReport(r.key)}>
                <EliteText style={s.reasonText}>{r.label}</EliteText>
                <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
              </Pressable>
            ))}
            <Pressable style={s.cancelBtn} onPress={() => setReportOpen(false)}>
              <EliteText style={s.cancelText}>Cancelar</EliteText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { alignItems: 'center', marginTop: Spacing.lg, gap: 4 },
  name: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.sm },
  username: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary },
  meta: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2 },
  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
    marginTop: Spacing.lg,
  },
  stat: {
    alignItems: 'center', minWidth: 90,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.md,
  },
  statValue: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT.primary },
  statLabel: {
    fontSize: 10, letterSpacing: 1, fontFamily: Fonts.semiBold, color: TEXT.tertiary,
    textTransform: 'uppercase', marginTop: 4,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 13,
    marginTop: Spacing.lg,
  },
  primaryBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: ATP_BRAND.black },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingVertical: 13, marginTop: Spacing.lg,
  },
  secondaryBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.secondary },
  footNote: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary,
    textAlign: 'center', marginTop: Spacing.lg, lineHeight: 16,
  },
  empty: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary,
    textAlign: 'center', paddingVertical: Spacing.xl,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  menu: {
    position: 'absolute', right: Spacing.md, top: 0,
    backgroundColor: ELEVATION[3].bg, borderWidth: 1, borderColor: ELEVATION[3].border,
    borderRadius: Radius.md, paddingVertical: 4, minWidth: 170,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  menuItemText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  sheet: {
    backgroundColor: ELEVATION[2].bg, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    borderWidth: 1, borderColor: ELEVATION[2].border,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: 34,
  },
  sheetTitle: {
    fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: TEXT.primary,
    textAlign: 'center', marginBottom: Spacing.md,
  },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingVertical: 13, paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  reasonText: { fontSize: FontSizes.md, fontFamily: Fonts.regular, color: TEXT.primary },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.secondary },
});
