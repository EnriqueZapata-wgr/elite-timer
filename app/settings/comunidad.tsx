/**
 * Settings > Comunidad — visibilidad granular del perfil público + username +
 * bridge Skool. Mapa Comunidad C1. Persiste en user_profile_public (mig 177) al
 * momento. Doctrina: cero chat privado; la conversación humana sale a Skool.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Switch, TextInput, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  getMyPublicProfile, updateVisibility, setUsername,
} from '@/src/services/community/public-profile-service';
import { type PublicProfileRow } from '@/src/services/community/public-profile-core';
import { type VisibilityFlags } from '@/src/constants/community';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity, SKOOL_URL } from '@/src/constants/brand';

const APPEAR_TOGGLES: { key: keyof VisibilityFlags; title: string; desc: string }[] = [
  { key: 'discoverable', title: 'Aparecer en el buscador', desc: 'Otras personas pueden encontrarte por nombre.' },
  { key: 'allow_friend_requests', title: 'Permitir solicitudes de amistad', desc: 'Recibe peticiones para conectar.' },
];

const SHOW_TOGGLES: { key: keyof VisibilityFlags; title: string; desc: string }[] = [
  { key: 'show_photo', title: 'Mostrar foto', desc: 'Tu foto de perfil en público.' },
  { key: 'show_streak', title: 'Mostrar racha', desc: 'Tus días de racha activa.' },
  { key: 'show_electrons', title: 'Mostrar electrones', desc: 'Tus electrones acumulados.' },
  { key: 'show_badges', title: 'Mostrar rango e insignias', desc: 'Tu rango ATP y badges ganados.' },
  { key: 'show_activity', title: 'Mostrar actividad reciente', desc: 'Tus logros en el feed de amigos.' },
  { key: 'show_country', title: 'Mostrar país', desc: 'Tu país en el perfil.' },
  { key: 'show_chronotype', title: 'Mostrar cronotipo', desc: 'Tu cronotipo (león, lobo…).' },
];

export default function SettingsComunidadScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameMsg, setUsernameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getMyPublicProfile(user.id).then((p) => {
      setProfile(p);
      if (p?.username) setUsernameInput(p.username);
    });
  }, [user?.id]);

  const patch = useCallback(async (p: Partial<VisibilityFlags>) => {
    if (!user?.id || !profile) return;
    haptic.light();
    const prev = profile;
    setProfile({ ...profile, ...p }); // optimista
    const ok = await updateVisibility(user.id, p);
    if (!ok) setProfile(prev);
  }, [user?.id, profile]);

  const saveUsername = useCallback(async () => {
    if (!user?.id || savingUsername) return;
    setSavingUsername(true);
    haptic.light();
    const res = await setUsername(usernameInput);
    if (res.ok) {
      setUsernameMsg({ ok: true, text: 'Guardado' });
      setProfile((p) => (p ? { ...p, username: usernameInput.trim().toLowerCase() } : p));
    } else {
      setUsernameMsg({ ok: false, text: res.error ?? 'No se pudo guardar' });
    }
    setSavingUsername(false);
  }, [user?.id, usernameInput, savingUsername]);

  const flagValue = (k: keyof VisibilityFlags) => (profile ? profile[k] : false);

  const renderToggle = (t: { key: keyof VisibilityFlags; title: string; desc: string }) => (
    <View key={t.key} style={s.toggleRow}>
      <View style={{ flex: 1 }}>
        <EliteText style={s.rowTitle}>{t.title}</EliteText>
        <EliteText style={s.rowDesc}>{t.desc}</EliteText>
      </View>
      <Switch
        value={flagValue(t.key)}
        onValueChange={(v) => patch({ [t.key]: v } as Partial<VisibilityFlags>)}
        disabled={!profile}
        trackColor={{ false: '#333', true: withOpacity(ATP_BRAND.lime, 0.5) }}
        thumbColor={flagValue(t.key) ? ATP_BRAND.lime : '#666'}
      />
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}>
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.title}>Comunidad</EliteText>
          <EliteText style={s.subtitle}>Tú decides qué es visible. Nada clínico se comparte nunca.</EliteText>
        </Animated.View>
      </View>

      {/* ── Username ── */}
      <Animated.View entering={FadeInUp.delay(90).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Tu nombre de usuario</SectionTitle>
        <View style={s.usernameRow}>
          <EliteText style={s.at}>@</EliteText>
          <TextInput
            value={usernameInput}
            onChangeText={(t) => { setUsernameInput(t); setUsernameMsg(null); }}
            placeholder="tu_usuario"
            placeholderTextColor={TEXT.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            style={s.input}
          />
          <Pressable onPress={saveUsername} disabled={savingUsername} style={s.saveBtn} hitSlop={8}>
            <EliteText style={s.saveBtnText}>Guardar</EliteText>
          </Pressable>
        </View>
        {usernameMsg && (
          <EliteText style={[s.usernameMsg, { color: usernameMsg.ok ? ATP_BRAND.lime : '#ef4444' }]}>
            {usernameMsg.text}
          </EliteText>
        )}
      </Animated.View>

      {/* ── Amigos (C2) ── */}
      <Animated.View entering={FadeInUp.delay(115).springify()}>
        <Pressable style={s.friendsLink} onPress={() => router.push('/comunidad/amigos' as any)}>
          <Ionicons name="people-outline" size={20} color={ATP_BRAND.lime} />
          <View style={{ flex: 1 }}>
            <EliteText style={s.rowTitle}>Mis amigos</EliteText>
            <EliteText style={s.rowDesc}>Solicitudes, tu tribu y buscar personas.</EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
        </Pressable>
      </Animated.View>

      {/* ── Aparecer ── */}
      <Animated.View entering={FadeInUp.delay(140).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Descubrimiento</SectionTitle>
        {APPEAR_TOGGLES.map(renderToggle)}
      </Animated.View>

      {/* ── Qué muestro ── */}
      <Animated.View entering={FadeInUp.delay(190).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Qué muestro en mi perfil</SectionTitle>
        {SHOW_TOGGLES.map(renderToggle)}
      </Animated.View>

      {/* ── Comunidad humana (copy diferenciador + Skool bridge) ── */}
      <Animated.View entering={FadeInUp.delay(240).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Comunidad humana</SectionTitle>
        <View style={s.skoolCard}>
          <EliteText style={s.skoolCopy}>
            Nuestra IA nunca finge saber lo que se siente sentir. Y no reemplaza a tu nutriólogo clínico.
            Por eso somos comunidad, no algoritmo.
          </EliteText>
          <Pressable onPress={() => Linking.openURL(SKOOL_URL)} style={s.skoolBtn}>
            <Ionicons name="people" size={18} color={ATP_BRAND.black} />
            <EliteText style={s.skoolBtnText}>Únete a la Tribu ATP</EliteText>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 4 },
  usernameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  at: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.tertiary },
  input: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.regular, color: TEXT.primary, paddingVertical: 10 },
  saveBtn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  saveBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
  usernameMsg: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 6, marginLeft: 4 },
  rowTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  rowDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2, lineHeight: 16 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  friendsLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md,
  },
  skoolCard: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, gap: 14,
  },
  skoolCopy: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, lineHeight: 20 },
  skoolBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 12,
  },
  skoolBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: ATP_BRAND.black },
});
