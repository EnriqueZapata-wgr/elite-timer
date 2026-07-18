/**
 * MI PROGRESO — pantalla central de balance + rank + logros (E- + H+ + accesos).
 * Nombre antes "Mi Economía" — renombrado 23-jun por Enrique (incluye logros, no solo dinero).
 * Lee balances reales; refresca en 'balance_changed'. Entrada escalonada FadeInDown.
 * Las secciones aún no construidas se muestran como "Próximamente" (nav honesta).
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect , type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { RankBadge } from '@/src/components/economy/RankBadge';
import { BalanceCard } from '@/src/components/economy/BalanceCard';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getElectronBalance } from '@/src/services/economy/electron-service';
import { getProtonBalance } from '@/src/services/economy/proton-service';
import type { ElectronBalance, ProtonBalance } from '@/src/services/economy/economy-types';
import { ELEVATION, TEXT, ATP_BRAND } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface NavItem {
  icon: keyof typeof Ionicons.glyphMap; label: string; sublabel?: string;
  route?: Href; soon?: boolean;
}

export default function EconomyAdminScreen() {
  const { user } = useAuth();
  const [electrons, setElectrons] = useState<ElectronBalance | null>(null);
  const [protons, setProtons] = useState<ProtonBalance | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [e, p] = await Promise.all([getElectronBalance(user.id), getProtonBalance(user.id)]);
    setElectrons(e); setProtons(p);
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    load();
    const sub = DeviceEventEmitter.addListener('balance_changed', load);
    return () => sub.remove();
  }, [load]));

  const navItems: NavItem[] = [
    { icon: 'swap-horizontal', label: 'Convertir E- → H+', sublabel: 'Tasa actual 100 → 300', route: '/economy/convert' },
    { icon: 'receipt-outline', label: 'Historial de movimientos', sublabel: 'E- y H+', route: '/economy/history' },
    { icon: 'flag-outline', label: 'Mis Retos', sublabel: 'Browse + activos', route: '/economy/challenges' },
    { icon: 'people-outline', label: 'Referidos', sublabel: 'Tu código + tracking', route: '/economy/referrals' },
    { icon: 'cart-outline', label: 'Tienda H+', sublabel: 'Paquetes', route: '/economy/shop' },
    // #99: explicación visual de la economía
    { icon: 'school-outline', label: '¿Cómo gano H+?', sublabel: 'La economía en 60 segundos', route: '/economy/how-to-earn' },
    { icon: 'trophy-outline', label: 'Mis Logros', sublabel: 'Próximamente', soon: true },
  ];

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Mi Progreso" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <RankBadge lifetimeElectrons={electrons?.lifetime_electrons ?? 0} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).springify()}>
          <BalanceCard
            protons={protons?.current_protons ?? 0}
            onPressShop={() => { haptic.medium(); router.push('/economy/shop'); }}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.eRow}>
          <Ionicons name="flash" size={16} color={ATP_BRAND.lime} />
          <EliteText variant="caption" style={styles.eText}>
            {(electrons?.current_electrons ?? 0).toLocaleString('en-US')} E- disponibles para convertir
          </EliteText>
        </Animated.View>

        {navItems.map((item, i) => (
          <Animated.View key={item.label} entering={FadeInDown.delay(180 + i * 40).springify()}>
            <AnimatedPressable
              disabled={item.soon}
              onPress={() => { if (item.route) { haptic.light(); router.push(item.route); } }}
              style={[styles.navRow, item.soon && styles.navSoon]}
            >
              <View style={styles.navIcon}><Ionicons name={item.icon} size={20} color={ATP_BRAND.lime} /></View>
              <View style={{ flex: 1 }}>
                <EliteText style={styles.navLabel}>{item.label}</EliteText>
                {item.sublabel ? <EliteText variant="caption" style={styles.navSub}>{item.sublabel}</EliteText> : null}
              </View>
              {item.soon
                ? <View style={styles.soonBadge}><EliteText style={styles.soonText}>PRONTO</EliteText></View>
                : <Ionicons name="chevron-forward" size={18} color={TEXT.secondary} />}
            </AnimatedPressable>
          </Animated.View>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 80 },
  eRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.xs },
  eText: { color: TEXT.secondary },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 0.5, borderColor: ELEVATION[1].border,
  },
  navSoon: { opacity: 0.6 },
  navIcon: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${ATP_BRAND.lime}1A`,
  },
  navLabel: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  navSub: { color: TEXT.secondary, marginTop: 2 },
  soonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${ATP_BRAND.lime}1A` },
  soonText: { fontSize: 9, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 1 },
});
