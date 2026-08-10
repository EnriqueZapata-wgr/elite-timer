/**
 * REFERIDOS — código único + share nativo + lista de referidos.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Share, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { generateReferralCode, getMyReferrals } from '@/src/services/economy/referral-service';
import type { Referral } from '@/src/services/economy/economy-types';
import { ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

// E-1 (MB-12): OFF hasta que recordReferralSignup / markReferralPaid se
// invoquen desde algún lado — prometer H+ sin backend que los otorgue no se queda.
const REFERRALS_ENABLED = false;

export default function ReferralsScreen() {
  const { user } = useAuth();
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const secTxt = { color: t.textoSecundario };
  const [code, setCode] = useState<string>('');
  const [referrals, setReferrals] = useState<Referral[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [c, list] = await Promise.all([generateReferralCode(user.id), getMyReferrals(user.id)]);
      setCode(c); setReferrals(list);
    } catch { /* sin código aún */ }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function share() {
    if (!code) return;
    haptic.medium();
    try {
      // E-1 (MB-12): el dominio es somosatp.com (atp.app no es nuestro).
      await Share.share({ message: `Únete a ATP con mi código ${code} y empieza a optimizar tu salud. https://somosatp.com/r/${code}` });
    } catch { /* cancelado */ }
  }

  const rewarded = referrals.filter((r) => r.status === 'rewarded').length;

  // E-1 (MB-12): puerta cerrada también para deep links mientras no haya backend.
  if (!REFERRALS_ENABLED) {
    return (
      <Screen edges={[]} themed>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <ScreenHeader title="Referidos" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm }}>
          <Ionicons name="construct-outline" size={40} color={t.textoSecundario} />
          <EliteText style={{ color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.lg, textAlign: 'center' }}>
            Referidos está en construcción
          </EliteText>
          <EliteText variant="caption" style={{ color: t.textoSecundario, textAlign: 'center', lineHeight: 19 }}>
            Cuando las recompensas se puedan otorgar de verdad, se abre.
          </EliteText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Referidos" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.codeCard, { backgroundColor: t.card, borderColor: t.borde }]}>
          <EliteText variant="caption" style={[styles.muted, secTxt]}>TU CÓDIGO</EliteText>
          <EliteText style={[styles.code, { color: acento }]}>{code || '—'}</EliteText>
          <AnimatedPressable onPress={share} disabled={!code} style={[styles.shareBtn, !code && { opacity: 0.4 }]}>
            <Ionicons name="share-social-outline" size={18} color="#000" />
            <EliteText style={styles.shareText}>Compartir</EliteText>
          </AnimatedPressable>
        </View>

        <EliteText variant="caption" style={[styles.muted, secTxt]}>
          {referrals.length} referido(s) · {rewarded} recompensado(s)
        </EliteText>

        {referrals.length === 0 ? (
          <EliteText variant="caption" style={[styles.muted, secTxt, { marginTop: Spacing.lg }]}>
            Comparte tu código. Cuando un amigo se suscriba, ganas H+.
          </EliteText>
        ) : referrals.map((r) => (
          <View key={r.id} style={[styles.row, { backgroundColor: t.card, borderColor: t.borde }]}>
            <EliteText style={[styles.rowCode, { color: t.texto }]}>{r.referral_code}</EliteText>
            <EliteText variant="caption" style={[styles.rowStatus, secTxt, r.status === 'rewarded' && { color: acento }]}>
              {r.status.toUpperCase()}
            </EliteText>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 80 },
  codeCard: { borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 0.5, alignItems: 'center', gap: Spacing.sm },
  muted: { textAlign: 'center' },
  code: { fontSize: FontSizes.display, fontFamily: Fonts.extraBold, letterSpacing: 3 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 24, marginTop: Spacing.xs },
  shareText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.card, padding: Spacing.md, borderWidth: 0.5 },
  rowCode: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  rowStatus: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
});
