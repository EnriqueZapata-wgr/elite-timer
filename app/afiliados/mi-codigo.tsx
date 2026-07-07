/**
 * Afiliados — Mi código (#47 fase 1). Código único + preview del landing
 * que verán los invitados (somosatp.com/[codigo] — web, fase posterior) +
 * funnel de conversión: clicks → signups → paying.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { router } from 'expo-router';
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
import { ATP_BRAND, ELEVATION, TEXT } from '@/src/constants/brand';

const REFERRAL_URL_BASE = 'https://somosatp.com';

export default function AfiliadosMiCodigoScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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
      <View style={[s.screen, { paddingTop: insets.top + 8, paddingHorizontal: Spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <EliteText style={{ color: TEXT.secondary, marginTop: Spacing.xl, textAlign: 'center' }}>
          Esta pantalla es para afiliados aprobados.
        </EliteText>
      </View>
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
    <ScrollView style={s.screen} contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}>
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.kicker}>MI CÓDIGO</EliteText>
          <EliteText style={s.codeBig}>{code?.code ?? '—'}</EliteText>
          <EliteText style={s.link}>{link}</EliteText>
          <View style={s.actions}>
            <AnimatedPressable style={s.btn} onPress={copyLink}>
              <Ionicons name={copied ? 'checkmark' : 'link-outline'} size={16} color="#000" />
              <EliteText style={s.btnText}>{copied ? 'Copiado' : 'Copiar link'}</EliteText>
            </AnimatedPressable>
            <AnimatedPressable
              style={s.btnSecondary}
              onPress={async () => {
                haptic.medium();
                await Share.share({ message: `Únete a ATP con mi código ${code?.code}. ${link}` });
              }}
            >
              <Ionicons name="share-social-outline" size={16} color={TEXT.primary} />
              <EliteText style={s.btnSecondaryText}>Compartir</EliteText>
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
            <View key={f.label} style={[s.funnelCard, i > 0 && { marginLeft: 8 }]}>
              <EliteText style={s.funnelLabel}>{f.label}</EliteText>
              <EliteText style={s.funnelValue}>{f.value}</EliteText>
              <EliteText style={s.funnelSub}>{f.sub}</EliteText>
            </View>
          ))}
        </View>
        <EliteText style={s.funnelNote}>
          Los clicks se cuentan cuando alguien abre tu landing; los signups cuando crean cuenta
          con tu código.
        </EliteText>
      </Animated.View>

      {/* Preview del landing */}
      <Animated.View entering={FadeInUp.delay(180).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Preview de tu landing</SectionTitle>
        <View style={s.previewCard}>
          <View style={s.previewUrlBar}>
            <Ionicons name="lock-closed" size={10} color={TEXT.tertiary} />
            <EliteText style={s.previewUrl}>{link.replace('https://', '')}</EliteText>
          </View>
          <View style={s.previewBody}>
            <EliteText style={s.previewBadge}>INVITACIÓN DE</EliteText>
            <EliteText style={s.previewName}>{affiliate.business_name ?? 'Afiliado ATP'}</EliteText>
            <EliteText style={s.previewVertical}>{VERTICAL_LABELS[affiliate.vertical]}</EliteText>
            {affiliate.short_bio ? (
              <EliteText style={s.previewBio} numberOfLines={3}>{affiliate.short_bio}</EliteText>
            ) : null}
            <View style={s.previewCta}>
              <EliteText style={s.previewCtaText}>EMPEZAR CON ATP</EliteText>
            </View>
            <EliteText style={s.previewFootnote}>
              Así verán tu invitación. El landing web (somosatp.com/{code?.code ?? 'CÓDIGO'}) se
              publica en la siguiente fase.
            </EliteText>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  kicker: { fontSize: 10, fontFamily: Fonts.semiBold, color: TEXT.secondary, letterSpacing: 2, marginTop: Spacing.md },
  codeBig: { fontSize: 40, fontFamily: Fonts.extraBold, color: ATP_BRAND.lime, letterSpacing: 3, marginTop: 4 },
  link: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  btnText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#000' },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  btnSecondaryText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: TEXT.primary },
  funnelRow: { flexDirection: 'row' },
  funnelCard: {
    flex: 1, backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: 14, padding: Spacing.md, alignItems: 'center',
  },
  funnelLabel: { fontSize: 9, fontFamily: Fonts.semiBold, color: TEXT.tertiary, letterSpacing: 2 },
  funnelValue: { fontSize: 24, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: 4 },
  funnelSub: { fontSize: 10, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2, textAlign: 'center' },
  funnelNote: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.muted, marginTop: 8, lineHeight: 16 },
  previewCard: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  previewUrlBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ELEVATION[2].bg, paddingHorizontal: 12, paddingVertical: 8,
  },
  previewUrl: { fontSize: 11, fontFamily: Fonts.regular, color: TEXT.secondary },
  previewBody: { backgroundColor: ELEVATION[1].bg, padding: Spacing.lg, alignItems: 'center' },
  previewBadge: { fontSize: 9, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime, letterSpacing: 2 },
  previewName: { fontSize: 22, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: 4, textAlign: 'center' },
  previewVertical: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: TEXT.secondary, marginTop: 2 },
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
    fontSize: 10, fontFamily: Fonts.regular, color: TEXT.muted,
    textAlign: 'center', marginTop: Spacing.md, lineHeight: 14,
  },
});
