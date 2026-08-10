/**
 * Afiliados — Dashboard (#47 fase 1). Solo afiliados aprobados: wallet,
 * referidos, comisiones, código con copiar/compartir, gráfica de referidos
 * por mes (6m) e historial de payouts (12m).
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
import { getLocalToday } from '@/src/utils/date-helpers';
import {
  formatMXN, referralsByMonth, referralsInLastDays, earningsSummary,
} from '@/src/services/affiliate-core';
import {
  getAffiliate, loadAffiliateDashboard, ensurePrimaryCode,
  type Affiliate, type AffiliateWallet, type AffiliateCode, type ReferredUser, type Earning,
} from '@/src/services/affiliate-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

const REFERRAL_URL_BASE = 'https://somosatp.com'; // landing web [codigo] — fase posterior

function monthLabel(ym: string): string {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const m = parseInt(ym.slice(5, 7), 10);
  return meses[m - 1] ?? ym;
}

export default function AfiliadosDashboardScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const secTxt = { color: t.textoSecundario };

  const [affiliate, setAffiliate] = useState<Affiliate | null | undefined>(undefined);
  const [wallet, setWallet] = useState<AffiliateWallet | null>(null);
  const [code, setCode] = useState<AffiliateCode | null>(null);
  const [referred, setReferred] = useState<ReferredUser[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [copied, setCopied] = useState(false);
  // D-2 (MB-12): fallo de red = estado de error con reintento, no "$0.00".
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadError(false);
      const aff = await getAffiliate(user.id);
      setAffiliate(aff);
      if (!aff || aff.status !== 'approved') return;
      const [dash, primaryCode] = await Promise.all([
        loadAffiliateDashboard(aff.id),
        ensurePrimaryCode(aff.id),
      ]);
      setWallet(dash.wallet);
      setReferred(dash.referred);
      setEarnings(dash.earnings);
      setCode(primaryCode ?? dash.codes[0] ?? null);
    } catch {
      setLoadError(true);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // D-2 (MB-12): patrón routine-generator — estado de error + Reintentar.
  if (loadError) {
    return (
      <ThemeReady>
      <View style={[st.screen, { backgroundColor: t.fondo, paddingTop: insets.top + 8, paddingHorizontal: Spacing.md }]}>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={t.texto} />
        </Pressable>
        <View style={st.guardBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={t.textoTenue} />
          <EliteText style={[st.guardTitle, { color: t.texto }]}>No pudimos leer tu panel</EliteText>
          <EliteText style={[st.guardBody, secTxt]}>
            Tu balance y tus referidos siguen intactos. Esto fue un problema de conexión.
          </EliteText>
          <AnimatedPressable style={st.guardBtn} onPress={() => { haptic.medium(); load(); }}>
            <EliteText style={st.guardBtnText}>REINTENTAR</EliteText>
          </AnimatedPressable>
        </View>
      </View>
      </ThemeReady>
    );
  }

  // ── Guard: no aprobado → a aplicar ──
  if (affiliate === null || (affiliate && affiliate.status !== 'approved')) {
    return (
      <ThemeReady>
      <View style={[st.screen, { backgroundColor: t.fondo, paddingTop: insets.top + 8, paddingHorizontal: Spacing.md }]}>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={t.texto} />
        </Pressable>
        <View style={st.guardBox}>
          <Ionicons name="lock-closed-outline" size={40} color={t.textoTenue} />
          <EliteText style={[st.guardTitle, { color: t.texto }]}>Dashboard de afiliados</EliteText>
          <EliteText style={[st.guardBody, secTxt]}>
            {affiliate ? 'Tu aplicación aún no está aprobada.' : 'Necesitas ser afiliado ATP para ver este panel.'}
          </EliteText>
          <AnimatedPressable
            style={st.guardBtn}
            onPress={() => { haptic.medium(); router.replace('/afiliados/aplicar'); }}
          >
            <EliteText style={st.guardBtnText}>
              {affiliate ? 'VER MI APLICACIÓN' : 'APLICAR COMO AFILIADO'}
            </EliteText>
          </AnimatedPressable>
        </View>
      </View>
      </ThemeReady>
    );
  }

  if (affiliate === undefined) {
    return <View style={[st.screen, { backgroundColor: t.fondo }]} />;
  }

  const today = getLocalToday();
  const active = referred.filter(r => r.active).length;
  const inactive = referred.length - active;
  const last30 = referralsInLastDays(referred, today, 30);
  const serie = referralsByMonth(referred, today, 6);
  const maxSerie = Math.max(1, ...serie.map(b => b.count));
  const { thisMonth, ytd } = earningsSummary(earnings, today);
  const payouts = earnings.filter(e => e.status === 'paid').slice(0, 12);
  const pendingPayout = earnings
    .filter(e => e.status === 'ready_for_payout' || e.status === 'pending')
    .reduce((a, e) => a + Number(e.commission_mxn), 0);

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code.code);
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const shareLink = async () => {
    if (!code) return;
    haptic.medium();
    await Share.share({
      message: `Únete a ATP con mi código ${code.code} y arranca tu sistema operativo de rendimiento humano. ${REFERRAL_URL_BASE}/${code.code}`,
    });
  };

  return (
    <ThemeReady>
    <ScrollView style={[st.screen, { backgroundColor: t.fondo }]} contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={t.texto} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[st.kicker, { color: acento }]}>AFILIADO ATP · {affiliate.business_name ?? ''}</EliteText>
          <EliteText style={[st.title, { color: t.texto }]}>Tu dashboard</EliteText>
        </Animated.View>
      </View>

      {/* Wallet — héroe */}
      <Animated.View entering={FadeInUp.delay(90).springify()} style={st.walletCard}>
        <EliteText style={[st.walletLabel, secTxt]}>BALANCE ACTUAL</EliteText>
        <EliteText style={[st.walletBalance, { color: acento }]}>{formatMXN(Number(wallet?.balance_mxn ?? 0))}</EliteText>
        <View style={st.walletRow}>
          <EliteText style={[st.walletMeta, secTxt]}>Próximo payout: {formatMXN(pendingPayout)}</EliteText>
          <EliteText style={[st.walletMeta, secTxt]}>Histórico: {formatMXN(Number(wallet?.lifetime_earned_mxn ?? 0))}</EliteText>
        </View>
      </Animated.View>

      {/* Referidos + comisiones */}
      <Animated.View entering={FadeInUp.delay(140).springify()} style={st.statsRow}>
        <View style={[st.statCard, { backgroundColor: t.card, borderColor: t.borde }]}>
          <EliteText style={[st.statLabel, { color: t.textoTenue }]}>REFERIDOS</EliteText>
          <EliteText style={[st.statValue, { color: t.texto }]}>{active}</EliteText>
          <EliteText style={[st.statSub, { color: t.textoTenue }]}>activos · {inactive} inactivos</EliteText>
          <EliteText style={[st.statSub, { color: t.textoTenue }]}>+{last30} últimos 30d</EliteText>
        </View>
        <View style={[st.statCard, { backgroundColor: t.card, borderColor: t.borde }]}>
          <EliteText style={[st.statLabel, { color: t.textoTenue }]}>COMISIONES</EliteText>
          <EliteText style={[st.statValue, { color: t.texto }]}>{formatMXN(thisMonth)}</EliteText>
          <EliteText style={[st.statSub, { color: t.textoTenue }]}>este mes</EliteText>
          <EliteText style={[st.statSub, { color: t.textoTenue }]}>{formatMXN(ytd)} en el año</EliteText>
        </View>
      </Animated.View>

      {/* Código de referido */}
      <Animated.View entering={FadeInUp.delay(190).springify()} style={[st.codeCard, { backgroundColor: t.card, borderColor: t.borde }]}>
        <EliteText style={[st.statLabel, { color: t.textoTenue }]}>TU CÓDIGO DE REFERIDO</EliteText>
        <EliteText style={[st.codeText, { color: t.texto }]}>{code?.code ?? '—'}</EliteText>
        <View style={st.codeActions}>
          <AnimatedPressable style={st.codeBtn} onPress={copyCode}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#000" />
            <EliteText style={st.codeBtnText}>{copied ? 'Copiado' : 'Copiar'}</EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={[st.codeBtnSecondary, { backgroundColor: t.flotante, borderColor: t.bordeMarcado }]} onPress={shareLink}>
            <Ionicons name="share-social-outline" size={16} color={t.texto} />
            <EliteText style={[st.codeBtnSecondaryText, { color: t.texto }]}>Compartir link</EliteText>
          </AnimatedPressable>
        </View>
        <Pressable
          onPress={() => { haptic.light(); router.push('/afiliados/mi-codigo'); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}
          hitSlop={6}
        >
          <EliteText style={{ color: acento, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold }}>
            Métricas de conversión y preview del landing
          </EliteText>
          <Ionicons name="chevron-forward" size={12} color={acento} />
        </Pressable>
      </Animated.View>

      {/* Gráfica referidos por mes */}
      <Animated.View entering={FadeInUp.delay(240).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Referidos por mes</SectionTitle>
        <View style={[st.chartCard, { backgroundColor: t.card, borderColor: t.borde }]}>
          <View style={st.chartRow}>
            {serie.map(b => (
              <View key={b.month} style={st.chartCol}>
                <EliteText style={[st.chartCount, secTxt]}>{b.count > 0 ? b.count : ''}</EliteText>
                <View style={[st.chartBar, {
                  height: Math.max(4, (b.count / maxSerie) * 72),
                  backgroundColor: b.count > 0 ? ATP_BRAND.lime : '#1a1a1a',
                }]} />
                <EliteText style={[st.chartMonth, { color: t.textoTenue }]}>{monthLabel(b.month)}</EliteText>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Historial payouts */}
      <Animated.View entering={FadeInUp.delay(290).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Historial de payouts</SectionTitle>
        {payouts.length === 0 && (
          <EliteText style={{ color: t.sinDatos, fontSize: FontSizes.sm, fontFamily: Fonts.regular }}>
            Aún no hay payouts. Las comisiones se pagan mes vencido.
          </EliteText>
        )}
        {payouts.map(p => (
          <View key={`${p.month_start}-${p.source_type}`} style={[st.payoutRow, { backgroundColor: t.card, borderColor: t.borde }]}>
            <View style={{ flex: 1 }}>
              <EliteText style={[st.payoutMonth, { color: t.texto }]}>
                {monthLabel(p.month_start)} {p.month_start.slice(0, 4)}
              </EliteText>
              <EliteText style={[st.payoutMeta, { color: t.textoTenue }]}>
                {p.active_referrals_count} referidos activos · pagado {p.paid_at ? p.paid_at.slice(0, 10) : ''}
              </EliteText>
            </View>
            <EliteText style={[st.payoutAmount, { color: acento }]}>{formatMXN(Number(p.commission_mxn))}</EliteText>
          </View>
        ))}
      </Animated.View>
    </ScrollView>
    </ThemeReady>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1 },
  kicker: { fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2, marginTop: Spacing.md },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: 4 },
  walletCard: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderWidth: 1,
    borderColor: withOpacity(ATP_BRAND.lime, 0.2), borderRadius: 20,
    padding: Spacing.lg, marginTop: Spacing.lg,
  },
  walletLabel: { fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  walletBalance: { fontSize: 34, fontFamily: Fonts.extraBold, marginTop: 4 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  walletMeta: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  statCard: {
    flex: 1, borderWidth: 1,
    borderRadius: 16, padding: Spacing.md,
  },
  statLabel: { fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  statValue: { fontSize: 22, fontFamily: Fonts.bold, marginTop: 4 },
  statSub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
  codeCard: {
    borderWidth: 1,
    borderRadius: 16, padding: Spacing.md, marginTop: 10,
  },
  codeText: { fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: 2, marginTop: 6 },
  codeActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  codeBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#000' },
  codeBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  codeBtnSecondaryText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  chartCard: {
    borderWidth: 1,
    borderRadius: 16, padding: Spacing.md,
  },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartBar: { width: 22, borderRadius: 5 },
  chartCount: { fontSize: 10, fontFamily: Fonts.semiBold },
  chartMonth: { fontSize: 9, fontFamily: Fonts.regular, textTransform: 'uppercase' },
  payoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1,
    borderRadius: 12, padding: Spacing.md, marginBottom: 6,
  },
  payoutMonth: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, textTransform: 'capitalize' },
  payoutMeta: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
  payoutAmount: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  guardBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 80 },
  guardTitle: { fontSize: 20, fontFamily: Fonts.bold, marginTop: 8 },
  guardBody: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, textAlign: 'center' },
  guardBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 14, paddingHorizontal: 24, marginTop: Spacing.md,
  },
  guardBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
