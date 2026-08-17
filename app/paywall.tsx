/**
 * PAYWALL — editorial ATP (negro + lima).
 *
 * 2 planes (Base con 14 días trial · Pro sin trial, RECOMENDADO) con toggle
 * mensual/anual. Los precios vienen de RevenueCat offerings; si el binario
 * aún no trae el SDK nativo (pre-build) los CTAs quedan deshabilitados con
 * copy honesto — nunca placeholder roto.
 *
 * BLOQ-1 (auditoría visual 16-ago): la pantalla salía sin un solo precio y con
 * el CTA muerto. Dos cosas se arreglaron aquí, ninguna cosmética:
 *  1. El fallo dejó de ser terminal. Sin precio y con error, el CTA ES el
 *     reintento; deshabilitado, además, se ve deshabilitado.
 *  2. Deja de exigir que el product id diga "base" o "pro". Cuando el catálogo
 *     colapse a una sola membresía premium, un solo paquete por periodo basta
 *     para resolver el plan y se pinta UNA tarjeta, no dos iguales.
 * El precio sigue saliendo siempre del producto real: jamás una constante
 * nuestra (3.1.2 — el precio anunciado es el que se cobra).
 *
 * Disciplina de lima: CTA Pro + badge RECOMENDADO. Glow: solo card Pro.
 */
import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useSubscription } from '@/src/hooks/useSubscription';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { ATP_BRAND, GLOW, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

type Period = 'monthly' | 'yearly';
type PlanKey = 'base' | 'pro';

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  base: [
    'Los 7 pilares completos: HOY, Fitness, Nutrición, Mente, Salud, Ciclo y Tests',
    'ARGOS, tu IA de rendimiento (límite mensual)',
    'Economía H+ · retos y recompensas',
    'Registro de nutrición, ayuno e hidratación',
  ],
  pro: [
    'Todo lo de ATP Base',
    'ARGOS proactivo y sin límites',
    'Análisis de comida por foto',
    'Protocolos y biomarcadores avanzados',
    'Acceso anticipado a nuevas funciones',
  ],
};

/**
 * BLOQ-1: el catálogo va camino a UNA sola membresía premium. Mientras el
 * reparto de tiers se desmonta, esta lista es la que se pinta cuando la tienda
 * ya no distingue Base de Pro: es la unión de las dos, sin la línea "Todo lo de
 * ATP Base" que solo tenía sentido habiendo dos planes.
 */
const PLAN_UNICO_FEATURES: string[] = [
  'Los 7 pilares completos: HOY, Fitness, Nutrición, Mente, Salud, Ciclo y Tests',
  'ARGOS sin límites, tu IA de rendimiento',
  'Análisis de comida por foto',
  'Protocolos y biomarcadores avanzados',
  'Economía H+ · retos y recompensas',
  'Acceso anticipado a nuevas funciones',
];

const LEGAL_LINKS = [
  { label: 'Privacidad', url: 'https://somosatp.com/privacidad' },
  { label: 'Términos', url: 'https://somosatp.com/terminos' },
  { label: 'Reembolsos', url: 'https://somosatp.com/reembolsos' },
];

export default function PaywallScreen() {
  // MB-31B remate: pantalla sin dueño en el reparto — tokens del tema.
  const { kind, tokens: t } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { offerings, offeringsError, isLoading, refresh, purchase, restore, sdkReady, tier } = useSubscription();
  const [reintentando, setReintentando] = useState(false);
  const analytics = useAnalytics();
  const [period, setPeriod] = useState<Period>('yearly');
  const [busy, setBusy] = useState<PlanKey | 'restore' | null>(null);

  const packages = useMemo(
    () => offerings?.current?.availablePackages ?? [],
    [offerings],
  );

  function nombraPlan(pkg: PurchasesPackage, plan: PlanKey): boolean {
    return `${pkg.identifier} ${pkg.product.identifier}`.toLowerCase().includes(plan);
  }

  /**
   * BLOQ-1: ¿la tienda todavía distingue Base de Pro por el nombre del producto?
   * Si NINGÚN paquete menciona "base" ni "pro", el catálogo ya es de membresía
   * única. Antes eso dejaba el paywall mudo con una tienda perfectamente sana:
   * la búsqueda por substring era el único criterio, no encontraba nada, y la
   * pantalla que cobra se rendía como si no hubiera precios.
   */
  const modoPlanUnico = useMemo(
    () => packages.length > 0 && !packages.some((pkg) => nombraPlan(pkg, 'base') || nombraPlan(pkg, 'pro')),
    [packages],
  );

  function findPackage(plan: PlanKey, p: Period): PurchasesPackage | null {
    const wantedType = p === 'monthly' ? 'MONTHLY' : 'ANNUAL';
    const delPeriodo = packages.filter((pkg) => pkg.packageType === wantedType);
    const porNombre = delPeriodo.find((pkg) => nombraPlan(pkg, plan));
    if (porNombre) return porNombre;
    // Membresía única: si el periodo trae un solo paquete, ese ES el plan, se
    // llame como se llame. El precio sale del producto real, nunca de una
    // constante nuestra (3.1.2: el precio que se anuncia es el que se cobra).
    return modoPlanUnico && delPeriodo.length === 1 ? delPeriodo[0] : null;
  }

  // E-2 (MB-12): el trial sale del PRODUCTO real (introPrice gratis) o no se
  // muestra — "14 días de prueba gratis" fijo era publicidad falsa (3.1.2).
  function trialLabel(pkg: PurchasesPackage | null): string | null {
    const intro = (pkg?.product as any)?.introPrice;
    if (!intro || Number(intro.price) !== 0) return null;
    const units = Number(intro.periodNumberOfUnits ?? 0);
    const unit = String(intro.periodUnit ?? '').toUpperCase();
    const unitEs = unit === 'DAY' ? 'día' : unit === 'WEEK' ? 'semana' : unit === 'MONTH' ? 'mes' : unit === 'YEAR' ? 'año' : '';
    if (!units || !unitEs) return null;
    const plural = units > 1 ? (unitEs === 'mes' ? 'meses' : `${unitEs}s`) : unitEs;
    return `${units} ${plural} de prueba gratis`;
  }

  // E-2 (MB-12): el % de ahorro se CALCULA de los precios reales; si no se
  // puede calcular, el badge no existe.
  const savingsPct = useMemo(() => {
    // BLOQ-1: con membresía única no hay "pro"/"base" que filtrar — el par a
    // comparar es simplemente el mensual contra el anual del catálogo.
    const pares: Array<[PurchasesPackage | undefined, PurchasesPackage | undefined]> = modoPlanUnico
      ? [[
          packages.find((pkg) => pkg.packageType === 'MONTHLY'),
          packages.find((pkg) => pkg.packageType === 'ANNUAL'),
        ]]
      : (['pro', 'base'] as PlanKey[]).map((plan) => [
          packages.find((pkg) => nombraPlan(pkg, plan) && pkg.packageType === 'MONTHLY'),
          packages.find((pkg) => nombraPlan(pkg, plan) && pkg.packageType === 'ANNUAL'),
        ]);
    for (const [m, y] of pares) {
      const monthly12 = (m?.product.price ?? 0) * 12;
      const yearly = y?.product.price ?? 0;
      if (monthly12 > 0 && yearly > 0 && yearly < monthly12) {
        return Math.round((1 - yearly / monthly12) * 100);
      }
    }
    return null;
  }, [packages, modoPlanUnico]);

  /** BLOQ-1: reintento explícito, usable desde el CTA y desde la nota. */
  async function onReintentar() {
    if (reintentando) return;
    haptic.light();
    setReintentando(true);
    await refresh();
    setReintentando(false);
  }

  async function onSubscribe(plan: PlanKey) {
    const pkg = findPackage(plan, period);
    if (!pkg || busy) return;
    haptic.medium();
    setBusy(plan);
    const result = await purchase(pkg);
    setBusy(null);
    if (result.success) {
      // T5 HARDENING: funnel core — suscripción iniciada.
      analytics.track(ATP_EVENTS.SUBSCRIPTION_STARTED, { plan, period });
      haptic.success();
      Alert.alert(
        plan === 'pro' ? 'Bienvenido a ATP Pro' : 'Bienvenido a ATP Base',
        'Tu suscripción está activa. A romperla. 🚀',
        [{ text: 'Vamos', onPress: () => router.back() }],
      );
    } else if (result.error !== 'cancelled') {
      haptic.error();
      Alert.alert('Algo no salió', result.error ?? 'Intenta de nuevo en unos minutos.');
    }
  }

  async function onRestore() {
    if (busy) return;
    haptic.medium();
    setBusy('restore');
    const result = await restore();
    setBusy(null);
    if (result.success) {
      haptic.success();
      Alert.alert('Compras restauradas', 'Tu suscripción quedó sincronizada.');
    } else {
      Alert.alert('Restaurar compras', result.error ?? 'No encontramos compras en esta cuenta.');
    }
  }

  function renderPlanCard(plan: PlanKey, delay: number) {
    const pkg = findPackage(plan, period);
    const isPro = plan === 'pro';
    const cargando = isLoading || reintentando;
    /**
     * BLOQ-1: sin precio y con error, el CTA se convierte en el reintento en vez
     * de quedarse muerto. Antes decía "Sin conexión", estaba `disabled` y no
     * pintaba estado deshabilitado: parecía pulsable, no hacía nada, y la única
     * salida real era una línea de texto tenue al final del scroll que no se
     * lee como botón. Una pantalla de cobro sin salida es rechazo en review.
     */
    const puedeReintentar = !pkg && !cargando && sdkReady && offeringsError;
    // E-2 (MB-12): tres estados reales — cargando / error / no disponible.
    const priceLabel = pkg
      ? `${pkg.product.priceString} / ${period === 'monthly' ? 'mes' : 'año'}`
      : cargando
        ? 'Cargando precios…'
        : offeringsError
          ? 'No pudimos cargar los precios'
          : 'Disponible pronto';
    const ctaDisabled = busy !== null || (!pkg && !puedeReintentar);

    return (
      <Animated.View
        entering={FadeInDown.delay(delay).springify()}
        style={[styles.planCard, isPro && styles.planCardPro]}
      >
        {/* Sin dos planes que comparar, "RECOMENDADO" no recomienda nada. */}
        {isPro && !modoPlanUnico && (
          <View style={styles.recommendedBadge}>
            <EliteText style={styles.recommendedText}>RECOMENDADO</EliteText>
          </View>
        )}
        <EliteText style={styles.planName}>
          {modoPlanUnico ? 'ATP Premium' : isPro ? 'ATP Pro' : 'ATP Base'}
        </EliteText>
        {/* Regla 1 del manual: el lima nunca es letra en claro — teal calibrado. */}
        <EliteText style={[styles.planPrice, isPro && { color: kind === 'dark' ? ATP_BRAND.lime : t.tealTexto }]}>
          {priceLabel}
        </EliteText>
        <EliteText style={styles.trialNote}>
          {trialLabel(pkg) ?? 'Se renueva automáticamente. Cancela cuando quieras.'}
        </EliteText>

        <View style={styles.featureList}>
          {(modoPlanUnico ? PLAN_UNICO_FEATURES : PLAN_FEATURES[plan]).map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={isPro ? ATP_BRAND.lime : t.textoSecundario}
                style={{ marginTop: 2 }}
              />
              <EliteText style={styles.featureText}>{feature}</EliteText>
            </View>
          ))}
        </View>

        <AnimatedPressable
          onPress={() => (puedeReintentar ? onReintentar() : onSubscribe(plan))}
          disabled={ctaDisabled}
          style={[styles.cta, isPro ? styles.ctaPro : styles.ctaBase, ctaDisabled && styles.ctaMuerto]}
        >
          <EliteText style={[styles.ctaText, isPro ? styles.ctaTextPro : styles.ctaTextBase]}>
            {busy === plan ? 'Procesando…' : pkg ? 'Suscribirme' : cargando ? 'Cargando…' : puedeReintentar ? 'REINTENTAR' : 'Muy pronto'}
          </EliteText>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Screen themed edges={[]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Suscripción" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <EliteText style={styles.heroTitle}>Desbloquea tu potencial</EliteText>
          <EliteText style={styles.heroSubtitle}>
            Un solo sistema para tu rendimiento: cuerpo, mente y datos trabajando juntos.
          </EliteText>
        </Animated.View>

        {/* Toggle mensual / anual */}
        <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.toggleRow}>
          {(['monthly', 'yearly'] as Period[]).map((p) => {
            const active = period === p;
            return (
              <AnimatedPressable
                key={p}
                onPress={() => { haptic.light(); setPeriod(p); }}
                style={[styles.toggleOption, active && styles.toggleOptionActive]}
              >
                <EliteText style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {p === 'monthly' ? 'Mensual' : 'Anual'}
                </EliteText>
                {p === 'yearly' && savingsPct != null && (
                  <View style={styles.savingsBadge}>
                    <EliteText style={styles.savingsText}>AHORRAS {savingsPct}%</EliteText>
                  </View>
                )}
              </AnimatedPressable>
            );
          })}
        </Animated.View>

        {renderPlanCard('pro', 140)}
        {!modoPlanUnico && renderPlanCard('base', 190)}

        {/* E-2 (MB-12): error ≠ "no disponible". BLOQ-1: el reintento ya vive
            en el CTA de la tarjeta; aquí queda solo la explicación de por qué
            no hay precio, para que el usuario no crea que la app está rota. */}
        {sdkReady && offeringsError && packages.length === 0 && (
          <EliteText style={styles.sdkNote}>
            No pudimos contactar a la tienda para traer los precios. Revisa tu
            conexión y toca REINTENTAR.
          </EliteText>
        )}
        {!sdkReady && (
          <EliteText style={styles.sdkNote}>
            Las compras se habilitan con la próxima actualización de la app.
          </EliteText>
        )}
        {tier !== 'free' && (
          <EliteText style={styles.sdkNote}>
            Ya tienes un plan activo ({tier}). Puedes gestionarlo en Ajustes → Suscripción.
          </EliteText>
        )}

        <AnimatedPressable onPress={onRestore} disabled={busy !== null} style={styles.restoreBtn}>
          <EliteText style={styles.restoreText}>
            {busy === 'restore' ? 'Restaurando…' : '¿Ya eres suscriptor? Restaurar compras'}
          </EliteText>
        </AnimatedPressable>

        {/* MB-13: quien pagó en la web o recibió invitación activa aquí su plan */}
        <AnimatedPressable
          onPress={() => { haptic.light(); router.push('/redeem-code'); }}
          disabled={busy !== null}
          style={styles.restoreBtn}
        >
          <EliteText style={styles.restoreText}>
            Tengo un código. Si compraste en la web o te invitaron, aquí lo activas.
          </EliteText>
        </AnimatedPressable>

        {/* E-2 (MB-12): disclosure obligatoria de suscripción auto-renovable */}
        <EliteText style={styles.sdkNote}>
          Suscripciones auto-renovables: el precio mostrado se cobra por{' '}
          {period === 'monthly' ? 'mes' : 'año'} y se renueva automáticamente al
          final de cada periodo, salvo que canceles al menos 24 horas antes en
          tu cuenta de App Store o Google Play. Puedes gestionarla o cancelarla
          desde los ajustes de tu tienda.
        </EliteText>

        <View style={styles.legalRow}>
          {LEGAL_LINKS.map((link, i) => (
            <View key={link.label} style={styles.legalItem}>
              {i > 0 && <EliteText style={styles.legalDot}>·</EliteText>}
              <AnimatedPressable onPress={() => Linking.openURL(link.url)}>
                <EliteText style={styles.legalText}>{link.label}</EliteText>
              </AnimatedPressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

// MB-31B remate: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 80, gap: Spacing.md },
  heroTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.hero,
    color: t.texto,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: t.textoSecundario,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: t.card,
    borderColor: t.borde,
    borderWidth: 0.5,
    borderRadius: Radius.pill,
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  // Era ELEVATION[3].bg (popover); el rol aquí es superficie elevada sobre la card.
  toggleOptionActive: { backgroundColor: t.flotante },
  toggleText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: t.textoSecundario },
  toggleTextActive: { color: t.texto },
  savingsBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  // Regla 1 del manual: el lima nunca es letra en claro — teal calibrado.
  savingsText: { fontFamily: Fonts.bold, fontSize: 9, color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, letterSpacing: 0.5 },
  planCard: {
    backgroundColor: t.card,
    borderColor: t.borde,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  planCardPro: {
    borderColor: withOpacity(ATP_BRAND.lime, 0.5),
    borderWidth: 1,
    ...GLOW.accent,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: Spacing.sm,
  },
  recommendedText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: t.textoSobreLima,
    letterSpacing: 1,
  },
  planName: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, color: t.texto },
  planPrice: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: t.texto,
    marginTop: Spacing.xs,
  },
  trialNote: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: t.textoSecundario,
    marginTop: 2,
  },
  featureList: { marginTop: Spacing.md, gap: Spacing.sm },
  featureRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  featureText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: t.textoSecundario,
    lineHeight: 18,
  },
  cta: {
    marginTop: Spacing.lg,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaPro: { backgroundColor: ATP_BRAND.lime },
  ctaBase: { borderWidth: 1, borderColor: ATP_BRAND.lime },
  // BLOQ-1: un CTA que no responde tiene que VERSE que no responde. Antes
  // quedaba en lima sólido, idéntico al vivo, y el usuario tocaba en vano.
  ctaMuerto: { opacity: 0.4 },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },
  ctaTextPro: { color: t.textoSobreLima },
  // Regla 1 del manual: el lima nunca es letra en claro — teal calibrado.
  ctaTextBase: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto },
  sdkNote: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: t.textoTenue,
    textAlign: 'center',
  },
  restoreBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  restoreText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: t.textoSecundario },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legalItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legalDot: { color: t.sinDatos },
  legalText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: t.textoTenue },
});
