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
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, DeviceEventEmitter, Modal, ScrollView, StyleSheet, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesStoreProduct } from 'react-native-purchases';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { playReveal } from '@/src/components/edad-atp/edad-sound';
import { getProtonBalance } from '@/src/services/economy/proton-service';
import { formatFull } from '@/src/services/economy/format';
import { getProtonPackages, type ProtonPackage } from '@/src/services/economy/shop-service';
import {
  clearPendingPurchases,
  getHPlusProducts,
  getPendingPurchases,
  purchaseHPlusPack,
  reclaimHPlusPurchases,
  resolvePendingPurchases,
  type PendingHPlusPurchase,
} from '@/src/services/economy/iap-service';
import { PackageCard } from '@/src/components/economy/PackageCard';
import {
  activateProBoost,
  PRO_BOOST_COST_H_PLUS,
  PRO_BOOST_DURATION_HOURS,
  PRO_BOOST_WEEKLY_COST_H_PLUS,
  PRO_BOOST_WEEKLY_DURATION_HOURS,
} from '@/src/services/subscription/subscription-service';
import { withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
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
  const { kind, tokens: t } = useAppTheme();
  const secTxt = { color: t.textoSecundario };
  const [hPlus, setHPlus] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<BoostItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState<BoostItem | null>(null);
  // MB-13 · Pieza 6: recargas como consumibles IAP reales.
  const [packs, setPacks] = useState<ProtonPackage[]>([]);
  const [products, setProducts] = useState<Record<string, PurchasesStoreProduct>>({});
  const [pending, setPending] = useState<PendingHPlusPurchase[]>([]);
  const [buyingSku, setBuyingSku] = useState<string | null>(null);
  const [reclaiming, setReclaiming] = useState(false);

  const load = useCallback(() => {
    if (!user?.id) return;
    // Task #134: null = cold start, no pintar 0
    getProtonBalance(user.id).then((b) => { if (b) setHPlus(b.current_protons); }).catch(() => {});
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    load();
    const sub = DeviceEventEmitter.addListener('balance_changed', load);
    return () => sub.remove();
  }, [load]));

  // Catálogo + productos reales de la tienda + compras pendientes.
  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      const catalog = await getProtonPackages();
      if (!alive) return;
      setPacks(catalog);
      setPending(await getPendingPurchases());
      const prods = await getHPlusProducts(catalog.map((p) => p.sku));
      if (alive) setProducts(prods);
    })();
    return () => { alive = false; };
  }, []));

  // 6.3: mientras haya compra pendiente, se observa el ledger propio hasta
  // que el webhook acredite. La UI lo dice; no se queda muda.
  useEffect(() => {
    if (pending.length === 0) return;
    const timer = setInterval(async () => {
      const resolved = await resolvePendingPurchases();
      if (resolved.length > 0) {
        haptic.success();
        playReveal();
        DeviceEventEmitter.emit('balance_changed');
        setPending(await getPendingPurchases());
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [pending.length]);

  async function onBuyPack(pkg: ProtonPackage) {
    const product = products[pkg.sku];
    if (!product || buyingSku) return;
    haptic.medium();
    setBuyingSku(pkg.sku);
    const result = await purchaseHPlusPack(product, pkg.sku, pkg.protons);
    setBuyingSku(null);
    if (result.success) {
      // El cobro ya pasó; el crédito llega por webhook. Estado visible.
      setPending(await getPendingPurchases());
    } else if (result.error !== 'cancelled') {
      haptic.warning();
      Alert.alert('Algo no salió', result.error ?? 'Intenta de nuevo en unos minutos.');
    }
  }

  // 6.4: reclamo server-side del consumible perdido entre cobro y webhook.
  async function onReclaim() {
    if (reclaiming) return;
    haptic.medium();
    setReclaiming(true);
    const result = await reclaimHPlusPurchases();
    setReclaiming(false);
    if (result.success && result.credited > 0) {
      haptic.success();
      playReveal();
      DeviceEventEmitter.emit('balance_changed');
      await clearPendingPurchases();
      setPending([]);
      Alert.alert('Recarga acreditada', `${formatFull(result.protons)} H+ llegaron a tu cuenta.`);
    } else if (result.success) {
      if (result.checked > 0) {
        // La tienda reporta compras y todas ya estaban acreditadas.
        await clearPendingPurchases();
        setPending([]);
      }
      Alert.alert(
        'Sin pendientes',
        'La tienda no reporta compras sin acreditar. Si pagaste hace un momento, dale unos segundos y vuelve a intentar.',
      );
    } else {
      haptic.warning();
      Alert.alert('No pudimos verificar', 'Revisa tu conexión e intenta de nuevo.');
    }
  }

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

  // E-1 (MB-12) retiró RECARGAS con precios pintados y "Comprar (dev)".
  // MB-13 · Pieza 6 las regresa como consumibles IAP reales: precio del
  // producto de la tienda, crédito server-side idempotente vía webhook.
  const recargasReady = packs.length > 0 && Object.keys(products).length > 0;

  return (
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Tienda H+" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Balance + manifiesto */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.balanceRow}>
          <EliteText style={[styles.manifesto, { color: t.texto }]}>Cada pieza, ganada.</EliteText>
          {hPlus !== null && (
            <View style={[styles.balancePill, { backgroundColor: t.card, borderColor: t.borde }]}>
              <EliteText style={[styles.balanceText, { color: t.texto }]}>💎 {formatFull(hPlus)} H+</EliteText>
            </View>
          )}
        </Animated.View>

        {/* ── BOOSTS ── */}
        <SectionKicker delay={80} label="BOOSTS" />
        {BOOSTS.map((item, i) => (
          <Animated.View key={item.key} entering={FadeInDown.delay(120 + i * 70).springify()}>
            <AnimatedPressable onPress={() => onBoostPress(item)} style={[styles.galleryCard, { backgroundColor: t.card, borderColor: t.borde }]}>
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
              <EliteText style={[styles.galleryTitle, { color: t.texto }]}>{item.title}</EliteText>
              <EliteText style={[styles.galleryPoetic, secTxt]}>{item.poetic}</EliteText>
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
            style={[styles.galleryCard, { backgroundColor: t.card, borderColor: t.borde }]}
          >
            <View style={styles.boltCircle}>
              <EliteText style={{ fontSize: 18 }}>🧠</EliteText>
            </View>
            <EliteText style={[styles.galleryTitle, { color: t.texto }]}>Reporte Premium · Braverman</EliteText>
            {/* E-1 (MB-12): se COBRA con H+ a todos (doctrina correcta) — el
                copy "incluido con Pro" era el que estaba mal, no el cobro. */}
            <EliteText style={[styles.galleryPoetic, secTxt]}>
              Tu química cerebral leída a fondo por ARGOS. Se canjea con H+;
              el precio exacto lo ves antes de generar.
            </EliteText>
            <View style={styles.priceRow}>
              <EliteText style={[styles.includedText, secTxt]}>Se paga con H+</EliteText>
              <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* ── RECARGAS (MB-13 · Pieza 6: consumibles IAP reales) ── */}
        {recargasReady && (
          <>
            <SectionKicker delay={320} label="RECARGAS" />
            {pending.length > 0 && (
              <Animated.View entering={FadeInDown.springify()} style={styles.pendingCard}>
                <Ionicons name="hourglass-outline" size={18} color={BRONZE} />
                <View style={{ flex: 1 }}>
                  <EliteText style={styles.pendingTitle}>Pago recibido</EliteText>
                  <EliteText style={[styles.pendingBody, secTxt]}>
                    Tus H+ se acreditan en cuanto el servidor confirma la compra,
                    normalmente en menos de un minuto. Puedes seguir usando la app.
                  </EliteText>
                </View>
              </Animated.View>
            )}
            {packs.map((pkg, i) => {
              const product = products[pkg.sku];
              if (!product) return null;
              return (
                <Animated.View key={pkg.sku} entering={FadeInDown.delay(360 + i * 60).springify()}>
                  <PackageCard
                    pkg={pkg}
                    priceLabel={buyingSku === pkg.sku ? 'Procesando…' : `COMPRAR · ${product.priceString}`}
                    popular={pkg.display_order === 2}
                    onBuy={() => onBuyPack(pkg)}
                  />
                </Animated.View>
              );
            })}
            <AnimatedPressable onPress={onReclaim} disabled={reclaiming} style={styles.reclaimLink}>
              <EliteText style={[styles.reclaimLinkText, secTxt]}>
                {reclaiming ? 'Verificando con la tienda…' : '¿Pagaste y no ves tus H+? Reclamar recarga'}
              </EliteText>
            </AnimatedPressable>
          </>
        )}

        {/* ── PRÓXIMAMENTE (honesto, sin nav muerta) ── */}
        <SectionKicker delay={340} label="EN LA GALERÍA PRONTO" />
        <Animated.View entering={FadeInDown.delay(380).springify()} style={styles.soonRow}>
          <View style={[styles.soonCard, { backgroundColor: t.card, borderColor: t.borde, opacity: 0.7 }]}>
            <EliteText style={{ fontSize: 18 }}>🗝️</EliteText>
            <EliteText style={[styles.soonTitle, { color: t.texto }]}>Protocolos premium</EliteText>
            <View style={[styles.soonBadge, { backgroundColor: t.flotante }]}><EliteText style={[styles.soonBadgeText, { color: t.textoTenue }]}>PRONTO</EliteText></View>
          </View>
          <View style={[styles.soonCard, { backgroundColor: t.card, borderColor: t.borde, opacity: 0.7 }]}>
            <EliteText style={{ fontSize: 18 }}>🎁</EliteText>
            <EliteText style={[styles.soonTitle, { color: t.texto }]}>Regalar H+</EliteText>
            <View style={[styles.soonBadge, { backgroundColor: t.flotante }]}><EliteText style={[styles.soonBadgeText, { color: t.textoTenue }]}>PRONTO</EliteText></View>
          </View>
        </Animated.View>

        <EliteText style={[styles.footNote, { color: t.textoTenue }]}>
          {recargasReady
            ? 'Los H+ también se ganan: completa tu día y convierte tus E-.'
            : 'Las recargas con dinero llegan con los pagos de Apple/Google. Por ahora, los H+ se ganan: completa tu día y convierte tus E-.'}
        </EliteText>
      </ScrollView>

      {/* ── Confirmación editorial ── */}
      <Modal visible={confirming !== null} transparent animationType="fade" onRequestClose={() => setConfirming(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.flotante, borderColor: t.bordeMarcado }]}>
            <EliteText style={styles.modalKicker}>CANJE</EliteText>
            <EliteText style={[styles.modalTitle, { color: t.texto }]}>{confirming?.title}</EliteText>
            <EliteText style={[styles.modalBody, secTxt]}>
              Usarás {formatFull(confirming?.cost ?? 0)} H+ · Te quedarán{' '}
              {formatFull(Math.max(0, (hPlus ?? 0) - (confirming?.cost ?? 0)))} H+
            </EliteText>
            <View style={styles.modalActions}>
              <AnimatedPressable onPress={() => setConfirming(null)} style={styles.modalBtnSecondary}>
                <EliteText style={[styles.modalBtnSecondaryText, secTxt]}>Todavía no</EliteText>
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
          <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.unlockedCard, { backgroundColor: t.flotante }]}>
            <Ionicons name="flash" size={44} color={BRONZE} />
            <EliteText style={styles.unlockedTitle}>Boost activo</EliteText>
            <EliteText style={[styles.unlockedBody, secTxt]}>
              {unlocked?.durationHours === 168 ? 'Siete días' : '24 horas'} de ARGOS Pro empiezan ahora.
            </EliteText>
            <EliteText style={[styles.unlockedHint, { color: t.textoTenue }]}>Toca para continuar</EliteText>
          </Animated.View>
        </AnimatedPressable>
      </Modal>
    </Screen>
  );
}

function SectionKicker({ label, delay }: { label: string; delay: number }) {
  const { tokens: t } = useAppTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <EliteText style={[styles.kicker, { color: t.textoTenue }]}>{label}</EliteText>
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
    letterSpacing: 0.3,
  },
  balancePill: {
    borderWidth: 0.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
  },
  balanceText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  kicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  galleryCard: {
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
    marginTop: Spacing.md,
  },
  galleryPoetic: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
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
  includedText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  soonRow: { flexDirection: 'row', gap: Spacing.sm },
  soonCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  soonTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, textAlign: 'center' },
  soonBadge: {
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  soonBadgeText: { fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 1 },
  // Estilos sin referencia en el JSX (los packs viven en PackageCard) — se
  // les retira el color neutro sin borrarlos (regla 4 de la guía MB-31B3).
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  packName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  packProtons: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 1 },
  packPrice: { fontFamily: Fonts.bold, fontSize: FontSizes.md },
  footNote: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: withOpacity(BRONZE, 0.08),
    borderColor: withOpacity(BRONZE, 0.3),
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pendingTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: BRONZE },
  pendingBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 2,
  },
  reclaimLink: { alignItems: 'center', paddingVertical: Spacing.xs },
  reclaimLinkText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderWidth: 0.5,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  modalKicker: { fontFamily: Fonts.semiBold, fontSize: 10, color: BRONZE, letterSpacing: 2.5 },
  modalTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xl },
  modalBody: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalBtnSecondary: { paddingVertical: 10, paddingHorizontal: Spacing.md },
  modalBtnSecondaryText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  modalBtnPrimary: {
    backgroundColor: BRONZE,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  modalBtnPrimaryText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: '#000' },
  unlockedCard: {
    alignItems: 'center',
    borderColor: withOpacity(BRONZE, 0.4),
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xs,
  },
  unlockedTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, color: BRONZE, marginTop: Spacing.sm },
  unlockedBody: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center' },
  unlockedHint: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: Spacing.sm },
});
