/**
 * TIENDA H+ — galería editorial (#101, marathon F6).
 *
 * Rediseño del "callejón trasero de antro" → piezas de galería: B/N
 * cinematic, acento bronce sutil, espaciado generoso. Sin gambling,
 * sin neón, sin "ofertas relámpago".
 *
 * Categorías v1:
 *  - BOOSTS (funcionales): Pro 24h (500 H+) + Pro Semanal (3,000 H+, NUEVO)
 *    — ambos vía RPC atómico activate_pro_boost (débito + rate limit server)
 *  - ANÁLISIS ARGOS: Reporte Premium Braverman (→ /braverman-premium)
 *  - PROTOCOLOS y REGALAR H+: "PRONTO" honesto (faltan decisiones de producto)
 *  - RECARGAS: packs existentes (stub IAP hasta webhook server-side)
 */
import { useCallback, useState } from 'react';
import {
  Alert, DeviceEventEmitter, Modal, ScrollView, StyleSheet, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { playReveal } from '@/src/components/edad-atp/edad-sound';
import { getProtonBalance } from '@/src/services/economy/proton-service';
import { getProtonPackages, mockPurchase, type ProtonPackage } from '@/src/services/economy/shop-service';
import { formatFull } from '@/src/services/economy/format';
import {
  activateProBoost,
  PRO_BOOST_COST_H_PLUS,
  PRO_BOOST_DURATION_HOURS,
  PRO_BOOST_WEEKLY_COST_H_PLUS,
  PRO_BOOST_WEEKLY_DURATION_HOURS,
} from '@/src/services/subscription/subscription-service';
import { ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

/** Acento bronce editorial del shop (guideline #101) — no existe en brand.ts */
const BRONZE = '#C9A961';

interface BoostItem {
  key: string;
  title: string;
  poetic: string;
  cost: number;
  durationHours: number;
  badge?: string;
}

const BOOSTS: BoostItem[] = [
  {
    key: 'boost_24h',
    title: 'Boost Pro · 24 horas',
    poetic: 'Un día entero con ARGOS a máxima potencia. Sin límites, sin freno.',
    cost: PRO_BOOST_COST_H_PLUS,
    durationHours: PRO_BOOST_DURATION_HOURS,
  },
  {
    key: 'boost_weekly',
    title: 'Boost Pro · Semanal',
    poetic: 'Siete días de acceso completo. Para las semanas que importan.',
    cost: PRO_BOOST_WEEKLY_COST_H_PLUS,
    durationHours: PRO_BOOST_WEEKLY_DURATION_HOURS,
    badge: 'NUEVO',
  },
];

export default function ShopScreen() {
  const { user } = useAuth();
  const [hPlus, setHPlus] = useState<number | null>(null);
  const [packages, setPackages] = useState<ProtonPackage[]>([]);
  const [confirming, setConfirming] = useState<BoostItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState<BoostItem | null>(null);

  const load = useCallback(() => {
    if (!user?.id) return;
    // Task #134: null = cold start, no pintar 0
    getProtonBalance(user.id).then((b) => { if (b) setHPlus(b.current_protons); }).catch(() => {});
    getProtonPackages().then(setPackages).catch(() => {});
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    load();
    const sub = DeviceEventEmitter.addListener('balance_changed', load);
    return () => sub.remove();
  }, [load]));

  function onBoostPress(item: BoostItem) {
    haptic.medium();
    const balance = hPlus ?? 0;
    if (balance < item.cost) {
      haptic.warning();
      Alert.alert(
        'Te faltan H+',
        `Necesitas ${formatFull(item.cost)} H+ y tienes ${formatFull(balance)}. Convierte tus E- o completa tu día para ganar más.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Conseguir H+', onPress: () => router.push('/economy/convert') },
        ],
      );
      return;
    }
    setConfirming(item);
  }

  async function confirmBoost() {
    if (!confirming || !user?.id || busy) return;
    setBusy(true);
    const item = confirming;
    const result = await activateProBoost(user.id, item.cost, item.durationHours);
    setBusy(false);
    setConfirming(null);
    if (result.success) {
      haptic.success();
      playReveal(); // chime sutil — el mismo del reveal Edad ATP
      setHPlus(result.hPlusRemaining);
      DeviceEventEmitter.emit('balance_changed');
      DeviceEventEmitter.emit('subscription_changed');
      setUnlocked(item);
      return;
    }
    haptic.warning();
    if (result.error === 'already_active') {
      Alert.alert('Boost activo', 'Ya tienes un boost corriendo. Déjalo terminar antes de encender otro.');
    } else if (result.error === 'rate_limit_exceeded') {
      Alert.alert('Límite semanal', result.message ?? 'Máximo 3 boosts por semana. Considera ATP Pro.');
    } else if (result.error === 'insufficient_h_plus') {
      Alert.alert('Te faltan H+', `Necesitas ${formatFull(item.cost)} H+ y tienes ${formatFull(result.hPlusRemaining)}.`);
    } else {
      Alert.alert('Algo no salió', 'No pudimos completar el canje. Intenta de nuevo.');
    }
  }

  function onBuyPack(pkg: ProtonPackage) {
    haptic.medium();
    Alert.alert(
      'Confirmar recarga',
      `${pkg.name}\n${formatFull(pkg.protons)} H+ por $${formatFull(pkg.price_mxn)} MXN`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar (dev)',
          onPress: async () => {
            if (!user?.id) return;
            const r = await mockPurchase(user.id, pkg);
            if (r.success) {
              haptic.success();
              DeviceEventEmitter.emit('balance_changed');
              Alert.alert('¡Listo!', `Se acreditaron ${formatFull(pkg.protons)} H+`);
            } else {
              Alert.alert('Compra (stub)', 'La acreditación real ocurre en el servidor (webhook IAP).');
            }
          },
        },
      ],
    );
  }

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Tienda H+" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Balance + manifiesto */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.balanceRow}>
          <EliteText style={styles.manifesto}>Cada pieza, ganada.</EliteText>
          {hPlus !== null && (
            <View style={styles.balancePill}>
              <EliteText style={styles.balanceText}>💎 {formatFull(hPlus)} H+</EliteText>
            </View>
          )}
        </Animated.View>

        {/* ── BOOSTS ── */}
        <SectionKicker delay={80} label="BOOSTS" />
        {BOOSTS.map((item, i) => (
          <Animated.View key={item.key} entering={FadeInDown.delay(120 + i * 70).springify()}>
            <AnimatedPressable onPress={() => onBoostPress(item)} style={styles.galleryCard}>
              <View style={styles.galleryHeader}>
                <View style={styles.boltCircle}>
                  <Ionicons name="flash" size={20} color={BRONZE} />
                </View>
                {item.badge && (
                  <View style={styles.newBadge}>
                    <EliteText style={styles.newBadgeText}>{item.badge}</EliteText>
                  </View>
                )}
              </View>
              <EliteText style={styles.galleryTitle}>{item.title}</EliteText>
              <EliteText style={styles.galleryPoetic}>{item.poetic}</EliteText>
              <View style={styles.priceRow}>
                <EliteText style={styles.priceHPlus}>{formatFull(item.cost)} H+</EliteText>
                <View style={styles.redeemBtn}>
                  <EliteText style={styles.redeemText}>Canjear</EliteText>
                </View>
              </View>
            </AnimatedPressable>
          </Animated.View>
        ))}

        {/* ── ANÁLISIS ARGOS ── */}
        <SectionKicker delay={260} label="ANÁLISIS ARGOS" />
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push('/braverman-premium'); }}
            style={styles.galleryCard}
          >
            <View style={styles.boltCircle}>
              <EliteText style={{ fontSize: 18 }}>🧠</EliteText>
            </View>
            <EliteText style={styles.galleryTitle}>Reporte Premium · Braverman</EliteText>
            <EliteText style={styles.galleryPoetic}>
              Tu química cerebral leída a fondo por ARGOS. Incluido con Pro — o con cualquier Boost activo.
            </EliteText>
            <View style={styles.priceRow}>
              <EliteText style={styles.includedText}>Incluido con Pro / Boost</EliteText>
              <Ionicons name="chevron-forward" size={16} color={TEXT.secondary} />
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* ── PRÓXIMAMENTE (honesto, sin nav muerta) ── */}
        <SectionKicker delay={340} label="EN LA GALERÍA PRONTO" />
        <Animated.View entering={FadeInDown.delay(380).springify()} style={styles.soonRow}>
          <View style={[styles.soonCard, { opacity: 0.7 }]}>
            <EliteText style={{ fontSize: 18 }}>🗝️</EliteText>
            <EliteText style={styles.soonTitle}>Protocolos premium</EliteText>
            <View style={styles.soonBadge}><EliteText style={styles.soonBadgeText}>PRONTO</EliteText></View>
          </View>
          <View style={[styles.soonCard, { opacity: 0.7 }]}>
            <EliteText style={{ fontSize: 18 }}>🎁</EliteText>
            <EliteText style={styles.soonTitle}>Regalar H+</EliteText>
            <View style={styles.soonBadge}><EliteText style={styles.soonBadgeText}>PRONTO</EliteText></View>
          </View>
        </Animated.View>

        {/* ── RECARGAS ── */}
        <SectionKicker delay={420} label="RECARGAS" />
        {packages.map((pkg, i) => (
          <Animated.View key={pkg.sku} entering={FadeInDown.delay(460 + i * 50).springify()}>
            <AnimatedPressable onPress={() => onBuyPack(pkg)} style={styles.packRow}>
              <View style={{ flex: 1 }}>
                <EliteText style={styles.packName}>{pkg.name}</EliteText>
                <EliteText style={styles.packProtons}>{formatFull(pkg.protons)} H+</EliteText>
              </View>
              <EliteText style={styles.packPrice}>${formatFull(pkg.price_mxn)} MXN</EliteText>
            </AnimatedPressable>
          </Animated.View>
        ))}
        <EliteText style={styles.footNote}>
          Pagos vía Apple/Google IAP (próximamente). Recarga de prueba por ahora.
        </EliteText>
      </ScrollView>

      {/* ── Confirmación editorial ── */}
      <Modal visible={confirming !== null} transparent animationType="fade" onRequestClose={() => setConfirming(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <EliteText style={styles.modalKicker}>CANJE</EliteText>
            <EliteText style={styles.modalTitle}>{confirming?.title}</EliteText>
            <EliteText style={styles.modalBody}>
              Usarás {formatFull(confirming?.cost ?? 0)} H+ · Te quedarán{' '}
              {formatFull(Math.max(0, (hPlus ?? 0) - (confirming?.cost ?? 0)))} H+
            </EliteText>
            <View style={styles.modalActions}>
              <AnimatedPressable onPress={() => setConfirming(null)} style={styles.modalBtnSecondary}>
                <EliteText style={styles.modalBtnSecondaryText}>Todavía no</EliteText>
              </AnimatedPressable>
              <AnimatedPressable onPress={confirmBoost} disabled={busy} style={styles.modalBtnPrimary}>
                <EliteText style={styles.modalBtnPrimaryText}>{busy ? 'Canjeando…' : 'Canjear'}</EliteText>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Reveal item unlocked ── */}
      <Modal visible={unlocked !== null} transparent animationType="fade" onRequestClose={() => setUnlocked(null)}>
        <AnimatedPressable onPress={() => setUnlocked(null)} style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.unlockedCard}>
            <Ionicons name="flash" size={44} color={BRONZE} />
            <EliteText style={styles.unlockedTitle}>Boost activo</EliteText>
            <EliteText style={styles.unlockedBody}>
              {unlocked?.durationHours === 168 ? 'Siete días' : '24 horas'} de ARGOS Pro empiezan ahora.
            </EliteText>
            <EliteText style={styles.unlockedHint}>Toca para continuar</EliteText>
          </Animated.View>
        </AnimatedPressable>
      </Modal>
    </Screen>
  );
}

function SectionKicker({ label, delay }: { label: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <EliteText style={styles.kicker}>{label}</EliteText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 80, gap: Spacing.sm },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  manifesto: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xl,
    color: TEXT.primary,
    letterSpacing: 0.3,
  },
  balancePill: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
  },
  balanceText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  kicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: TEXT.tertiary,
    letterSpacing: 2.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  galleryCard: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boltCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(BRONZE, 0.1),
    borderWidth: 0.5,
    borderColor: withOpacity(BRONZE, 0.25),
  },
  newBadge: {
    backgroundColor: withOpacity(BRONZE, 0.15),
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: BRONZE, letterSpacing: 1 },
  galleryTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: TEXT.primary,
    marginTop: Spacing.md,
  },
  galleryPoetic: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    lineHeight: 19,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  priceHPlus: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xl, color: BRONZE },
  redeemBtn: {
    borderWidth: 1,
    borderColor: withOpacity(BRONZE, 0.5),
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  redeemText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: BRONZE },
  includedText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.secondary },
  soonRow: { flexDirection: 'row', gap: Spacing.sm },
  soonCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  soonTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary, textAlign: 'center' },
  soonBadge: {
    backgroundColor: ELEVATION[2].bg,
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  soonBadgeText: { fontFamily: Fonts.bold, fontSize: 9, color: TEXT.tertiary, letterSpacing: 1 },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  packName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary },
  packProtons: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, marginTop: 1 },
  packPrice: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: TEXT.secondary },
  footNote: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: ELEVATION[2].bg,
    borderColor: ELEVATION[2].border,
    borderWidth: 0.5,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  modalKicker: { fontFamily: Fonts.semiBold, fontSize: 10, color: BRONZE, letterSpacing: 2.5 },
  modalTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xl, color: TEXT.primary },
  modalBody: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, lineHeight: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalBtnSecondary: { paddingVertical: 10, paddingHorizontal: Spacing.md },
  modalBtnSecondaryText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.secondary },
  modalBtnPrimary: {
    backgroundColor: BRONZE,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  modalBtnPrimaryText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: '#000' },
  unlockedCard: {
    alignItems: 'center',
    backgroundColor: ELEVATION[2].bg,
    borderColor: withOpacity(BRONZE, 0.4),
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xs,
  },
  unlockedTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, color: BRONZE, marginTop: Spacing.sm },
  unlockedBody: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, textAlign: 'center' },
  unlockedHint: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, marginTop: Spacing.sm },
});
