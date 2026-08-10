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
  getMyPublicProfile, updateVisibility, setUsername, syncPublicProfile,
} from '@/src/services/community/public-profile-service';
import { type PublicProfileRow } from '@/src/services/community/public-profile-core';
import { type VisibilityFlags } from '@/src/constants/community';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, PILL, withOpacity, SKOOL_URL } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { StatusBar } from 'expo-status-bar';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

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
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // MB-31B: pantalla migrada — superficies/texto del tema; el botón Skool es
  // relleno lima con negro (igual en los dos modos).
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const thCard = { backgroundColor: tokens.card, borderColor: tokens.borde };
  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameMsg, setUsernameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      let p = await getMyPublicProfile(user.id);
      // E-8 (MB-12): la migración 177 solo backfilleó usuarios EXISTENTES y su
      // trigger no crea la fila — todo usuario nuevo veía los 9 toggles
      // muertos sin explicación. Al primer acceso se crea la fila y se relee.
      if (!p) {
        const created = await syncPublicProfile({});
        if (created) p = await getMyPublicProfile(user.id);
      }
      setProfile(p);
      if (p?.username) setUsernameInput(p.username);
    })();
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
      // E-8 (MB-12): el alta pudo CREAR la fila — sin releer, el estado se
      // quedaba en null y los toggles seguían muertos hasta salir y volver.
      const fresh = await getMyPublicProfile(user.id);
      setProfile(fresh ?? null);
      if (fresh?.username) setUsernameInput(fresh.username);
    } else {
      setUsernameMsg({ ok: false, text: res.error ?? 'No se pudo guardar' });
    }
    setSavingUsername(false);
  }, [user?.id, usernameInput, savingUsername]);

  const flagValue = (k: keyof VisibilityFlags) => (profile ? profile[k] : false);

  const renderToggle = (t: { key: keyof VisibilityFlags; title: string; desc: string }) => (
    <View key={t.key} style={[s.toggleRow, thCard]}>
      <View style={{ flex: 1 }}>
        <EliteText style={[s.rowTitle, { color: tokens.texto }]}>{t.title}</EliteText>
        <EliteText style={[s.rowDesc, { color: dark ? tokens.textoTenue : tokens.textoSecundario }]}>{t.desc}</EliteText>
      </View>
      <Switch
        value={flagValue(t.key)}
        onValueChange={(v) => patch({ [t.key]: v } as Partial<VisibilityFlags>)}
        disabled={!profile}
        trackColor={{ false: tokens.bordeMarcado, true: withOpacity(ATP_BRAND.lime, 0.5) }}
        thumbColor={flagValue(t.key) ? ATP_BRAND.lime : (dark ? PILL.textColor : tokens.flotante)}
      />
    </View>
  );

  return (
    <ThemeReady>
    <ScrollView
      style={[s.screen, { backgroundColor: tokens.fondo }]}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={tokens.texto} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[s.title, { color: tokens.texto }]}>Comunidad</EliteText>
          <EliteText style={[s.subtitle, { color: tokens.textoSecundario }]}>Tú decides qué es visible. Nada clínico se comparte nunca.</EliteText>
        </Animated.View>
      </View>

      {/* ── Username ── */}
      <Animated.View entering={FadeInUp.delay(90).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Tu nombre de usuario</SectionTitle>
        <View style={[s.usernameRow, thCard]}>
          <EliteText style={[s.at, { color: dark ? tokens.textoTenue : tokens.textoSecundario }]}>@</EliteText>
          <TextInput
            value={usernameInput}
            onChangeText={(t) => { setUsernameInput(t); setUsernameMsg(null); }}
            placeholder="tu_usuario"
            placeholderTextColor={tokens.sinDatos}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            style={[s.input, { color: tokens.texto }]}
          />
          <Pressable
            onPress={saveUsername}
            disabled={savingUsername}
            style={[s.saveBtn, !dark && { backgroundColor: ATP_BRAND.lime }]}
            hitSlop={8}
          >
            <EliteText style={[s.saveBtnText, !dark && { color: tokens.textoSobreLima }]}>Guardar</EliteText>
          </Pressable>
        </View>
        {usernameMsg && (
          <EliteText style={[s.usernameMsg, {
            color: usernameMsg.ok
              ? (dark ? ATP_BRAND.lime : tokens.tealTexto)
              : (dark ? '#ef4444' : tokens.error),
          }]}>
            {usernameMsg.text}
          </EliteText>
        )}
      </Animated.View>

      {/* ── Amigos (C2) ── */}
      <Animated.View entering={FadeInUp.delay(115).springify()}>
        <Pressable style={[s.friendsLink, thCard]} onPress={() => router.push('/comunidad/amigos')}>
          <Ionicons name="people-outline" size={20} color={dark ? ATP_BRAND.lime : tokens.tealTexto} />
          <View style={{ flex: 1 }}>
            <EliteText style={[s.rowTitle, { color: tokens.texto }]}>Mis amigos</EliteText>
            <EliteText style={[s.rowDesc, { color: dark ? tokens.textoTenue : tokens.textoSecundario }]}>Solicitudes, tu tribu y buscar personas.</EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.textoTenue} />
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
        <View style={[s.skoolCard, thCard]}>
          <EliteText style={[s.skoolCopy, { color: tokens.textoSecundario }]}>
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
    </ThemeReady>
  );
}

// MB-31B: solo layout + defaults oscuros (ELEVATION); el color vivo entra
// inline desde los tokens.
const s = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 4 },
  usernameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  at: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  input: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.regular, paddingVertical: 10 },
  saveBtn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  saveBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
  usernameMsg: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 6, marginLeft: 4 },
  rowTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  rowDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2, lineHeight: 16 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  friendsLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md,
  },
  skoolCard: {
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, gap: 14,
  },
  skoolCopy: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 20 },
  skoolBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 12,
  },
  skoolBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: ATP_BRAND.black },
});
