/**
 * REFERIDOS — código único + share nativo + lista de referidos.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Share, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { generateReferralCode, getMyReferrals } from '@/src/services/economy/referral-service';
import type { Referral } from '@/src/services/economy/economy-types';
import { ELEVATION, TEXT, ATP_BRAND } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function ReferralsScreen() {
  const { user } = useAuth();
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
      await Share.share({ message: `Únete a ATP con mi código ${code} y empieza a optimizar tu salud. https://atp.app/r/${code}` });
    } catch { /* cancelado */ }
  }

  const rewarded = referrals.filter((r) => r.status === 'rewarded').length;

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Referidos" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.codeCard}>
          <EliteText variant="caption" style={styles.muted}>TU CÓDIGO</EliteText>
          <EliteText style={styles.code}>{code || '—'}</EliteText>
          <AnimatedPressable onPress={share} disabled={!code} style={[styles.shareBtn, !code && { opacity: 0.4 }]}>
            <Ionicons name="share-social-outline" size={18} color="#000" />
            <EliteText style={styles.shareText}>Compartir</EliteText>
          </AnimatedPressable>
        </View>

        <EliteText variant="caption" style={styles.muted}>
          {referrals.length} referido(s) · {rewarded} recompensado(s)
        </EliteText>

        {referrals.length === 0 ? (
          <EliteText variant="caption" style={[styles.muted, { marginTop: Spacing.lg }]}>
            Comparte tu código. Cuando un amigo se suscriba, ganas H+.
          </EliteText>
        ) : referrals.map((r) => (
          <View key={r.id} style={styles.row}>
            <EliteText style={styles.rowCode}>{r.referral_code}</EliteText>
            <EliteText variant="caption" style={[styles.rowStatus, r.status === 'rewarded' && { color: ATP_BRAND.lime }]}>
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
  codeCard: { backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 0.5, borderColor: ELEVATION[1].border, alignItems: 'center', gap: Spacing.sm },
  muted: { color: TEXT.secondary, textAlign: 'center' },
  code: { fontSize: FontSizes.display, fontFamily: Fonts.extraBold, color: ATP_BRAND.lime, letterSpacing: 3 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 24, marginTop: Spacing.xs },
  shareText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 0.5, borderColor: ELEVATION[1].border },
  rowCode: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  rowStatus: { color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
});
