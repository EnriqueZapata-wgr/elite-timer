/**
 * PAYWALL — editorial ATP (negro + lima).
 *
 * PREMIUM (16-ago-2026): UNA membresía. Se acabaron Base y Pro, se acabó el
 * badge RECOMENDADO (con un solo plan no recomienda nada) y se acabó la
 * comparación de tarjetas. Queda una tarjeta, un precio y el toggle de
 * periodo, que sí es una decisión real del usuario.
 *
 * EL PRECIO NUNCA SE ESCRIBE AQUÍ. Sale siempre del producto real de
 * RevenueCat (3.1.2: el precio anunciado es el que se cobra). La referencia
 * comercial son $890 MXN al mes, pero esa cifra vive en la tienda, no en el
 * bundle: si alguien la cambia allá y aquí hubiera una constante, la app
 * mentiría. Por eso sin catálogo esta pantalla no inventa un número, avisa.
 *
 * BLOQ-1 (16-ago) sigue vigente y es lo que sostiene esto: el fallo de
 * offerings dejó de ser terminal (el CTA se convierte en reintento y se ve
 * deshabilitado cuando lo está), y findPackage dejó de exigir que el id del
 * producto dijera "base" o "pro". Sin ese arreglo, la membresía única habría
 * dejado la pantalla muda con una tienda perfectamente sana.
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

/**
 * Lo que incluye la membresía. Cada línea dice algo que ANTES no era cierto o
 * estaba repartido; nada de aquí es adorno.
 *
 * "Sin límites" se puede escribir porque hoy es literal: se retiraron las
 * cuotas diarias que cortaban el acceso. Si algún día vuelve un límite suave
 * (bajar el nivel de modelo en horas de uso extremo), esta línea se cambia el
 * mismo día. Prometer lo que el servidor no cumple es como empezó el problema.
 */
const INCLUYE: string[] = [
  'Todo ATP completo: HOY, Fitness, Nutrición, Mente, Salud, Ciclo y Tests',
  'ARGOS sin límites, tu IA de rendimiento, todos los días',
  'Análisis de comida por foto y por texto',
  'Tu mapa funcional, protocolos y biomarcadores',
  'Reportes profundos, sin costo extra por cada uno',
  'La comunidad: no compras una app, entras a la tribu',
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
  const [busy, setBusy] = useState<'membresia' | 'restore' | null>(null);

  const packages = useMemo(
    () => offerings?.current?.availablePackages ?? [],
    [offerings],
  );

  /**
   * El paquete de este periodo, se llame como se llame en la tienda.
   *
   * Aquí estaba el bug que dejó la pantalla muda: se exigía que el id del
   * producto contuviera "base" o "pro" y, si ninguno lo decía, la búsqueda
   * devolvía nada y el paywall se rendía con un catálogo sano. Con membresía
   * única ningún producto va a decir eso nunca. Ahora el criterio es el
   * PERIODO, que es lo único que de verdad distingue un paquete de otro.
   *
   * Si un periodo trae más de un paquete (catálogo a medio migrar), se toma el
   * primero en vez de rendirse: mejor cobrar el precio real de algo que
   * mostrar una pantalla vacía a quien quiere pagar.
   */
  function findPackage(p: Period): PurchasesPackage | null {
    const wantedType = p === 'monthly' ? 'MONTHLY' : 'ANNUAL';
    return packages.find((pkg) => pkg.packageType === wantedType) ?? null;
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
    // El par a comparar es el mensual contra el anual del catálogo.
    const m = findPackage('monthly');
    const y = findPackage('yearly');
    const monthly12 = (m?.product.price ?? 0) * 12;
    const yearly = y?.product.price ?? 0;
    if (monthly12 > 0 && yearly > 0 && yearly < monthly12) {
      return Math.round((1 - yearly / monthly12) * 100);
    }
    return null;
  }, [packages]);

  /** BLOQ-1: reintento explícito, usable desde el CTA y desde la nota. */
  async function onReintentar() {
    if (reintentando) return;
    haptic.light();
    setReintentando(true);
    await refresh();
    setReintentando(false);
  }

  async function onSubscribe() {
    const pkg = findPackage(period);
    if (!pkg || busy) return;
    haptic.medium();
    setBusy('membresia');
    const result = await purchase(pkg);
    setBusy(null);
    if (result.success) {
      // T5 HARDENING: funnel core — membresía iniciada.
      analytics.track(ATP_EVENTS.SUBSCRIPTION_STARTED, { plan: 'premium', period });
      haptic.success();
      Alert.alert(
        'Bienvenido a ATP',
        'Tu membresía está activa. Todo abierto, sin límites. A romperla.',
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

  function renderTarjetaMembresia() {
    const pkg = findPackage(period);
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
        entering={FadeInDown.delay(140).springify()}
        style={[styles.planCard, styles.planCardPro]}
      >
        <EliteText style={styles.planName}>ATP Premium</EliteText>
        {/* Regla 1 del manual: el lima nunca es letra en claro — teal calibrado. */}
        <EliteText style={[styles.planPrice, { color: kind === 'dark' ? ATP_BRAND.lime : t.tealTexto }]}>
          {priceLabel}
        </EliteText>
        <EliteText style={styles.trialNote}>
          {trialLabel(pkg) ?? 'Se renueva automáticamente. Cancela cuando quieras.'}
        </EliteText>

        <View style={styles.featureList}>
          {INCLUYE.map((linea) => (
            <View key={linea} style={styles.featureRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={ATP_BRAND.lime}
                style={{ marginTop: 2 }}
              />
              <EliteText style={styles.featureText}>{linea}</EliteText>
            </View>
          ))}
        </View>

        <AnimatedPressable
          onPress={() => (puedeReintentar ? onReintentar() : onSubscribe())}
          disabled={ctaDisabled}
          style={[styles.cta, styles.ctaPro, ctaDisabled && styles.ctaMuerto]}
        >
          <EliteText style={[styles.ctaText, styles.ctaTextPro]}>
            {busy === 'membresia' ? 'Procesando…' : pkg ? 'Activar mi membresía' : cargando ? 'Cargando…' : puedeReintentar ? 'REINTENTAR' : 'Muy pronto'}
          </EliteText>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Screen themed edges={[]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Membresía" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <EliteText style={styles.heroTitle}>Una sola membresía</EliteText>
          <EliteText style={styles.heroSubtitle}>
            Todo abierto desde el primer día: sin niveles, sin límites de uso y
            sin pagar por función. Un solo sistema para tu rendimiento, y la
            comunidad que lo sostiene.
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

        {renderTarjetaMembresia()}

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
        {tier === 'premium' && (
          <EliteText style={styles.sdkNote}>
            Tu membresía ya está activa. Puedes gestionarla en Ajustes, Membresía.
          </EliteText>
        )}

        <AnimatedPressable onPress={onRestore} disabled={busy !== null} style={styles.restoreBtn}>
          <EliteText style={styles.restoreText}>
            {busy === 'restore' ? 'Restaurando…' : '¿Ya eres miembro? Restaurar compras'}
          </EliteText>
        </AnimatedPressable>

        {/* MB-13: quien pagó en la web o recibió invitación activa aquí su membresía */}
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
          Membresía auto-renovable: el precio mostrado se cobra por{' '}
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
  // BLOQ-1: un CTA que no responde tiene que VERSE que no responde. Antes
  // quedaba en lima sólido, idéntico al vivo, y el usuario tocaba en vano.
  ctaMuerto: { opacity: 0.4 },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },
  ctaTextPro: { color: t.textoSobreLima },
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
