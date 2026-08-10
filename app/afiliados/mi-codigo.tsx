/**
 * Afiliados — Mi código (#47 fase 1). Código único + preview del landing
 * que verán los invitados (somosatp.com/[codigo] — web, fase posterior) +
 * funnel de conversión: clicks → signups → paying.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { conversionFunnel, VERTICAL_LABELS } from '@/src/services/affiliate-core';
import {
  getAffiliate, loadAffiliateDashboard, ensurePrimaryCode,
  type Affiliate, type AffiliateCode,
} from '@/src/services/affiliate-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

const REFERRAL_URL_BASE = 'https://somosatp.com';

export default function AfiliadosMiCodigoScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const secTxt = { color: t.textoSecundario };
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [code, setCode] = useState<AffiliateCode | null>(null);
  const [paying, setPaying] = useState(0);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const aff = await getAffiliate(user.id);
    setAffiliate(aff);
    if (!aff || aff.status !== 'approved') return;
    const [dash, primary] = await Promise.all([
      loadAffiliateDashboard(aff.id),
      ensurePrimaryCode(aff.id),
    ]);
    setCode(primary ?? dash.codes[0] ?? null);
    setPaying(dash.referred.filter(r => r.first_paid_at != null).length);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  if (!affiliate || affiliate.status !== 'approved') {
    return (
      <ThemeReady>
      <View style={[s.screen, { backgroundColor: t.fondo, paddingTop: insets.top + 8, paddingHorizontal: Spacing.md }]}>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={t.texto} />
        </Pressable>
        <EliteText style={{ color: t.textoSecundario, marginTop: Spacing.xl, textAlign: 'center' }}>
          Esta pantalla es para afiliados aprobados.
        </EliteText>
      </View>
      </ThemeReady>
    );
  }

  const funnel = conversionFunnel(code?.clicks_count ?? 0, code?.signups_count ?? 0, paying);
  const link = `${REFERRAL_URL_BASE}/${code?.code ?? ''}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <ThemeReady>
    <ScrollView style={[s.screen, { backgroundColor: t.fondo }]} contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={t.texto} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[s.kicker, secTxt]}>MI CÓDIGO</EliteText>
          <EliteText style={[s.codeBig, { color: acento }]}>{code?.code ?? '—'}</EliteText>
          <EliteText style={[s.link, secTxt]}>{link}</EliteText>
          <View style={s.actions}>
            <AnimatedPressable style={s.btn} onPress={copyLink}>
              <Ionicons name={copied ? 'checkmark' : 'link-outline'} size={16} color="#000" />
              <EliteText style={s.btnText}>{copied ? 'Copiado' : 'Copiar link'}</EliteText>
            </AnimatedPressable>
            <AnimatedPressable
              style={[s.btnSecondary, { backgroundColor: t.flotante, borderColor: t.bordeMarcado }]}
              onPress={async () => {
                haptic.medium();
                await Share.share({ message: `Únete a ATP con mi código ${code?.code}. ${link}` });
              }}
            >
              <Ionicons name="share-social-outline" size={16} color={t.texto} />
              <EliteText style={[s.btnSecondaryText, { color: t.texto }]}>Compartir</EliteText>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </View>

      {/* Funnel de conversión */}
      <Animated.View entering={FadeInUp.delay(120).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Conversión</SectionTitle>
        <View style={s.funnelRow}>
          {[
            { label: 'CLICKS', value: funnel.clicks, sub: 'en tu landing' },
            { label: 'SIGNUPS', value: funnel.signups, sub: `${funnel.signupRate}% de clicks` },
            { label: 'DE PAGO', value: funnel.paying, sub: `${funnel.payRate}% de signups` },
          ].map((f, i) => (
            <View key={f.label} style={[s.funnelCard, { backgroundColor: t.card, borderColor: t.borde }, i > 0 && { marginLeft: 8 }]}>
              <EliteText style={[s.funnelLabel, { color: t.textoTenue }]}>{f.label}</EliteText>
              <EliteText style={[s.funnelValue, { color: t.texto }]}>{f.value}</EliteText>
              <EliteText style={[s.funnelSub, { color: t.textoTenue }]}>{f.sub}</EliteText>
            </View>
          ))}
        </View>
        <EliteText style={[s.funnelNote, { color: t.sinDatos }]}>
          Los clicks se cuentan cuando alguien abre tu landing; los signups cuando crean cuenta
          con tu código.
        </EliteText>
      </Animated.View>

      {/* Preview del landing */}
      <Animated.View entering={FadeInUp.delay(180).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Preview de tu landing</SectionTitle>
        <View style={[s.previewCard, { borderColor: t.borde }]}>
          <View style={[s.previewUrlBar, { backgroundColor: t.flotante }]}>
            <Ionicons name="lock-closed" size={10} color={t.textoTenue} />
            <EliteText style={[s.previewUrl, secTxt]}>{link.replace('https://', '')}</EliteText>
          </View>
          <View style={[s.previewBody, { backgroundColor: t.card }]}>
            <EliteText style={[s.previewBadge, { color: acento }]}>INVITACIÓN DE</EliteText>
            <EliteText style={[s.previewName, { color: t.texto }]}>{affiliate.business_name ?? 'Afiliado ATP'}</EliteText>
            <EliteText style={[s.previewVertical, secTxt]}>{VERTICAL_LABELS[affiliate.vertical]}</EliteText>
            {affiliate.short_bio ? (
              <EliteText style={s.previewBio} numberOfLines={3}>{affiliate.short_bio}</EliteText>
            ) : null}
            <View style={s.previewCta}>
              <EliteText style={s.previewCtaText}>EMPEZAR CON ATP</EliteText>
            </View>
            <EliteText style={[s.previewFootnote, { color: t.sinDatos }]}>
              Así verán tu invitación. El landing web (somosatp.com/{code?.code ?? 'CÓDIGO'}) se
              publica en la siguiente fase.
            </EliteText>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
    </ThemeReady>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  kicker: { fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2, marginTop: Spacing.md },
  codeBig: { fontSize: 40, fontFamily: Fonts.extraBold, letterSpacing: 3, marginTop: 4 },
  link: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  btnText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#000' },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  btnSecondaryText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  funnelRow: { flexDirection: 'row' },
  funnelCard: {
    flex: 1, borderWidth: 1,
    borderRadius: 14, padding: Spacing.md, alignItems: 'center',
  },
  funnelLabel: { fontSize: 9, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  funnelValue: { fontSize: 24, fontFamily: Fonts.bold, marginTop: 4 },
  funnelSub: { fontSize: 10, fontFamily: Fonts.regular, marginTop: 2, textAlign: 'center' },
  funnelNote: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 16 },
  previewCard: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1,
  },
  previewUrlBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  previewUrl: { fontSize: 11, fontFamily: Fonts.regular },
  previewBody: { padding: Spacing.lg, alignItems: 'center' },
  previewBadge: { fontSize: 9, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  previewName: { fontSize: 22, fontFamily: Fonts.bold, marginTop: 4, textAlign: 'center' },
  previewVertical: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginTop: 2 },
  previewBio: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#aaa',
    textAlign: 'center', marginTop: 10, lineHeight: 19,
  },
  previewCta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 12, paddingHorizontal: 28, marginTop: Spacing.md,
  },
  previewCtaText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  previewFootnote: {
    fontSize: 10, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: Spacing.md, lineHeight: 14,
  },
});
