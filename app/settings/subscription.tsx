/**
 * AJUSTES › MEMBRESÍA — estado, renovación, gestión e historial.
 *
 * PREMIUM (16-ago-2026): una sola membresía. Se fueron el nombre del plan, el
 * color por nivel y el countdown del Boost H+.
 *
 * La cancelación real vive donde se compró: App Store, Google Play o el
 * portal del proveedor de pago de la preventa. 31-ago-2026: antes esta
 * pantalla decía "Apple/Google" por plataforma, pero la preventa cobra por
 * otro proveedor, así que a quien pagó fuera de las tiendas le mandaba a una
 * tienda donde no hay nada que cancelar. Ahora el nombre sale del `store` del
 * entitlement de RevenueCat (APP_STORE | PLAY_STORE | el de la preventa...) y
 * el enlace de `managementURL`, que para la preventa es el portal del
 * cliente. El copy es el mismo que los términos publicados (cláusula 5).
 * Historial desde subscription_events (webhook de Cowork).
 *
 * ATP 3.0 (5-sep-2026, ruta 2.6): el código de activación vive SOLO aquí,
 * como "servicio contratado con ATP" (Apple 3.1.1: no es vía de compra).
 * Nada en esta pantalla nombra proveedores externos ni precios de fuera.
 *
 * TU SERVICIO (20-sep-2026, cliente Elite día uno). La pantalla tenía una
 * sola cara, la de tienda: "Suscripción", "TU MEMBRESÍA", trial, "Cancelar
 * suscripción", "Restaurar compras". Un cliente Elite no compró nada en la
 * app: contrató una evaluación con Enrique y entró por código. A esa
 * persona se le enseña OTRA cara: qué servicio tiene, desde y hasta cuándo
 * (del grant vigente en tier_grants) y cómo escribirle a Enrique. La cara de
 * tienda se conserva intacta para quien tiene un entitlement de tienda vivo
 * (regla de la casa: a nadie se le quita lo que ya tenía). El discriminador
 * es el entitlement activo de RevenueCat, no el nivel: Elite nunca sale de
 * una tienda.
 *
 * RONDA DE ARREGLOS (20-sep-2026):
 *  · La cara no se elige hasta que el hook terminó de leer (`isLoading`):
 *    antes una suscriptora de tienda veía "Tu servicio" un instante y luego
 *    "Suscripción". Mientras, un spinner y ningún título.
 *  · "No se pudo leer" no es "no hay datos". Con `nivelNoSePudoLeer` en true y
 *    sin entitlement de tienda, un Elite por código con la red caída veía
 *    "Sin servicio activo" y la invitación a canjear. Ahora ve un estado
 *    propio: no se pudo leer, revisa tu conexión, Reintentar y el contacto.
 *    Sin etiqueta de nivel, sin invitación a canjear. Si el hook conserva un
 *    nivel de miembro confirmado antes, se sigue pintando ese (fail-open).
 *  · Restaurar compras vive al final de AMBAS caras: Apple lo exige mientras
 *    haya suscriptores, y una suscriptora con RevenueCat sin sincronizar caía
 *    en "Tu servicio" sin salida.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import {
  fetchOrigenMembresia,
  fetchSubscriptionEvents,
  type OrigenMembresiaLectura,
  type SubscriptionEvent,
} from '@/src/services/subscription/subscription-service';
import { etiquetaMembresia } from '@/src/services/subscription/tier-logic';
import { CONTACTO_ELITE_EMAIL, NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { StatusBar } from 'expo-status-bar';
import type { AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { VENTA_AL_PUBLICO } from '@/src/constants/flags';

// MB-31B: el nombre de la membresía es TEXTO — en claro ni el lima (1.34) ni
// el teal de marca llegan como letra; ahí usan el teal calibrado (regla 1/2).
const colorMembresia = (esMiembro: boolean, t: AppThemeTokens): string => {
  if (!esMiembro) return t.textoSecundario;
  return t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
};

const EVENT_LABELS: Record<string, string> = {
  INITIAL_PURCHASE: 'Compra inicial',
  RENEWAL: 'Renovación',
  CANCELLATION: 'Cancelación programada',
  UNCANCELLATION: 'Reactivación',
  NON_RENEWING_PURCHASE: 'Compra única',
  SUBSCRIPTION_PAUSED: 'Suscripción pausada',
  EXPIRATION: 'Expiración',
  BILLING_ISSUE: 'Problema de cobro',
  PRODUCT_CHANGE: 'Cambio de periodo',
  TRANSFER: 'Transferencia',
  TEMPORARY_ENTITLEMENT_GRANT: 'Acceso temporal',
  TEST: 'Evento de prueba',
};

const STORE_SUBSCRIPTIONS_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SubscriptionSettingsScreen() {
  const { user } = useAuth();
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const thCard = { backgroundColor: tokens.card, borderColor: tokens.borde };
  const thTenue = { color: dark ? tokens.textoTenue : tokens.textoSecundario };
  const {
    tier, esMiembro, esElite, customerInfo, offerings, restore, refresh, isLoading, nivelNoSePudoLeer,
  } = useSubscription();
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  // 20-sep-2026: el grant vigente (código, alta manual, pago web) es la fuente
  // de "desde cuándo" y "hasta cuándo" para quien no compró en tienda.
  const [origen, setOrigen] = useState<OrigenMembresiaLectura | null>(null);

  useFocusEffect(useCallback(() => {
    if (user?.id) fetchSubscriptionEvents(user.id).then(setEvents);
  }, [user?.id]));

  useEffect(() => {
    if (!user?.id) return;
    let vivo = true;
    fetchOrigenMembresia(user.id).then((o) => { if (vivo) setOrigen(o); });
    return () => { vivo = false; };
  }, [user?.id, tier]);

  // Entitlement activo más relevante (para renovación/trial)
  const activeEntitlement = customerInfo
    ? Object.values(customerInfo.entitlements.active)[0] ?? null
    : null;
  const inTrial = activeEntitlement?.periodType === 'TRIAL';
  const trialDaysLeft = inTrial && activeEntitlement?.expirationDate
    ? Math.max(0, Math.ceil(
        (new Date(activeEntitlement.expirationDate).getTime() - Date.now()) / 86_400_000,
      ))
    : null;

  // Monto de renovación: precio del product del entitlement activo
  const renewalPrice = (() => {
    if (!activeEntitlement || !offerings?.current) return null;
    const pkg = offerings.current.availablePackages.find(
      (p) => p.product.identifier === activeEntitlement.productIdentifier,
    );
    return pkg?.product.priceString ?? null;
  })();

  const managementUrl = customerInfo?.managementURL ?? STORE_SUBSCRIPTIONS_URL;

  /**
   * Dónde se gestiona de verdad esta suscripción. Sale del entitlement, no de
   * la plataforma: alguien con iPhone que compró en la preventa no gestiona
   * en App Store. Si RevenueCat no lo dice, no se adivina: se habla del
   * "proveedor de pago".
   */
  const proveedor = (() => {
    const store = String(activeEntitlement?.store ?? '').toUpperCase();
    if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return 'App Store';
    if (store === 'PLAY_STORE') return 'Google Play';
    if (store === 'STRIPE') return 'el portal de suscripción';
    if (store === 'PROMOTIONAL') return null;
    return 'tu proveedor de pago';
  })();

  function onManagePayment() {
    haptic.medium();
    if (managementUrl) Linking.openURL(managementUrl);
  }

  function onCancel() {
    haptic.medium();
    Alert.alert(
      'Cancelar suscripción',
      proveedor
        ? `La cancelación se hace en ${proveedor}, sin penalización. Mantienes el acceso hasta el fin del periodo ya pagado.`
        : 'Esta membresía es promocional y no tiene cobro que cancelar.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Ir a gestionar',
          style: 'destructive',
          onPress: () => { if (managementUrl) Linking.openURL(managementUrl); },
        },
      ],
    );
  }

  async function onRestore() {
    if (restoring) return;
    haptic.medium();
    setRestoring(true);
    const result = await restore();
    setRestoring(false);
    if (result.success) {
      haptic.success();
      Alert.alert('Compras restauradas', 'Tu suscripción quedó sincronizada.');
    } else {
      Alert.alert('Restaurar compras', result.error ?? 'No encontramos compras en esta cuenta.');
    }
  }

  const hasPaidPlan = esMiembro;

  /**
   * 20-sep-2026: qué cara se pinta. Con un entitlement de tienda vivo, la de
   * siempre (renovación, método de pago, cancelar, restaurar). Sin él, la de
   * "Tu servicio": lo que contrató con ATP, su vigencia y cómo escribir. Elite
   * y los códigos nunca pasan por una tienda, así que caen aquí.
   */
  const caraDeTienda = activeEntitlement !== null;
  const asuntoContacto = esElite ? 'Soy cliente ATP Elite' : 'Sobre mi servicio ATP';

  /**
   * Ronda de arreglos (20-sep-2026): tres estados de la pantalla.
   *  · `listo`: el hook ya leyó; antes no se elige cara (spinner, sin título).
   *  · `nivelIlegible`: la lectura del nivel falló, no hay entitlement de tienda
   *    que hable por la persona y el hook no conserva un nivel de miembro
   *    confirmado antes. No es "free": es "no sé". Se dice y se ofrece
   *    reintentar. Si el hook sí conserva un nivel de miembro (una lectura
   *    anterior en esta misma sesión), se pinta ese: a nadie se le quita lo que
   *    tenía por una lectura caída.
   *  · `caraNormal`: cualquiera de las dos caras de siempre.
   */
  const listo = !isLoading;
  const nivelIlegible = listo && nivelNoSePudoLeer && !caraDeTienda && !esMiembro;
  const caraNormal = listo && !nivelIlegible;

  async function onReintentar() {
    if (reintentando) return;
    haptic.medium();
    setReintentando(true);
    try { await refresh(); } finally { setReintentando(false); }
  }

  function onEscribir() {
    haptic.medium();
    const url = `mailto:${CONTACTO_ELITE_EMAIL}?subject=${encodeURIComponent(asuntoContacto)}`;
    // Sin app de correo (Android limpio) openURL rechaza: se enseña el correo
    // para copiarlo, en vez de un botón que no hace nada.
    Linking.openURL(url).catch((e) => {
      logWarn('[tu-servicio] no se pudo abrir el correo', e);
      Alert.alert('Escríbenos', `Escríbenos a ${CONTACTO_ELITE_EMAIL} con el asunto "${asuntoContacto}".`);
    });
  }

  const descripcionServicio = (() => {
    if (isLoading) return null;
    if (esElite) return `Evaluación personalizada con ${NOMBRE_COACH_ELITE} y la plataforma ATP con ARGOS conociendo tu caso.`;
    if (esMiembro) return 'La plataforma ATP completa, con ARGOS.';
    return 'Si contrataste un servicio con ATP, activa tu código aquí abajo.';
  })();

  return (
    <Screen edges={[]} themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScreenHeader title={isLoading ? '' : caraDeTienda ? 'Suscripción' : 'Tu servicio'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Leyendo: sin cara todavía (ver cabecera). ── */}
        {isLoading && (
          <View style={styles.cargando} accessibilityLabel="Leyendo tu servicio">
            <ActivityIndicator size="small" color={tokens.textoSecundario} />
          </View>
        )}

        {/* ── El nivel no se pudo leer y nadie más habla por esta persona. ── */}
        {nivelIlegible && (
          <Animated.View entering={FadeInUp.delay(40).springify()} style={[styles.tierCard, thCard]}>
            <Ionicons name="cloud-offline-outline" size={22} color={tokens.textoSecundario} />
            <EliteText style={[styles.servicioDesc, { color: tokens.texto }]}>
              No se pudo leer tu servicio. Revisa tu conexión.
            </EliteText>
            <AnimatedPressable
              onPress={onReintentar}
              disabled={reintentando}
              style={[styles.reintentarBtn, { borderColor: tokens.borde }]}
              accessibilityRole="button"
              accessibilityLabel="Reintentar la lectura de tu servicio"
            >
              <EliteText style={[styles.reintentarText, { color: tokens.texto }]}>
                {reintentando ? 'Reintentando…' : 'Reintentar'}
              </EliteText>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* ── Membresía actual. PREMIUM: no hay planes que comparar, así que
             tampoco hay "TU PLAN": hay membresía o no la hay. ── */}
        {caraNormal && (
        <Animated.View entering={FadeInUp.delay(40).springify()} style={[styles.tierCard, thCard]}>
          <EliteText style={[styles.tierLabel, thTenue]}>{caraDeTienda ? 'TU MEMBRESÍA' : 'SERVICIO CONTRATADO'}</EliteText>
          <EliteText style={[styles.tierName, { color: colorMembresia(esMiembro, tokens) }]}>
            {isLoading ? '…' : etiquetaMembresia(tier)}
          </EliteText>
          {!caraDeTienda && descripcionServicio && (
            <EliteText style={[styles.servicioDesc, { color: tokens.textoSecundario }]}>{descripcionServicio}</EliteText>
          )}
          {caraDeTienda && inTrial && trialDaysLeft !== null && (
            <View style={[styles.trialBadge, !dark && { backgroundColor: ATP_BRAND.lime }]}>
              <EliteText style={[styles.trialText, !dark && { color: tokens.textoSobreLima }]}>
                Trial · {trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`}
              </EliteText>
            </View>
          )}
          {/* 7-sep-2026 (VENTA_AL_PUBLICO): con la venta al público apagada
              este botón llevaría a una pantalla que ya no se pinta. Se retira
              el botón, NO la puerta: el `router.push('/paywall')` sigue escrito
              y el censo lo sigue viendo, así que la ruta no queda huérfana. */}
          {VENTA_AL_PUBLICO && !hasPaidPlan && (
            <AnimatedPressable
              onPress={() => { haptic.medium(); router.push('/paywall'); }}
              style={styles.upgradeCta}
            >
              <EliteText style={styles.upgradeCtaText}>Activar mi membresía</EliteText>
            </AnimatedPressable>
          )}
        </Animated.View>
        )}

        {/* ── Vigencia y contacto (cara "Tu servicio", 20-sep-2026). Las fechas
             salen del grant vigente; si no hay grant, no se inventa nada: se
             manda con Enrique, que es quien las tiene. Si la lectura FALLÓ se
             dice eso, que es otra cosa (ronda de arreglos). ── */}
        {caraNormal && !caraDeTienda && hasPaidPlan && (
          <Animated.View entering={FadeInUp.delay(90).springify()}>
            <EliteText style={[styles.sectionTitle, thTenue]}>VIGENCIA</EliteText>
            <View style={[styles.card, thCard]}>
              {origen && !origen.noSePudoLeer && (origen.startsAt || origen.expiresAt) ? (
                <>
                  <View style={styles.row}>
                    <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>Desde</EliteText>
                    <EliteText style={[styles.rowValue, { color: tokens.textoSecundario }]}>
                      {origen.startsAt ? formatDate(origen.startsAt) : 'Sin fecha registrada'}
                    </EliteText>
                  </View>
                  <View style={[styles.divider, { backgroundColor: tokens.borde }]} />
                  <View style={styles.row}>
                    <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>Hasta</EliteText>
                    <EliteText style={[styles.rowValue, { color: tokens.textoSecundario }]}>
                      {origen.expiresAt ? formatDate(origen.expiresAt) : 'Sin vencimiento'}
                    </EliteText>
                  </View>
                </>
              ) : (
                <EliteText style={[styles.emptyText, thTenue]}>
                  {origen === null
                    ? '…'
                    : origen.noSePudoLeer
                      ? 'No se pudieron leer las fechas de tu servicio. Revisa tu conexión.'
                      : `Las fechas de tu servicio las tiene ${NOMBRE_COACH_ELITE}. Si necesitas confirmarlas, escríbele aquí abajo.`}
                </EliteText>
              )}
            </View>
          </Animated.View>
        )}

        {listo && !caraDeTienda && (
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <EliteText style={[styles.sectionTitle, thTenue]}>CONTACTO</EliteText>
            <AnimatedPressable
              onPress={onEscribir}
              style={[styles.card, thCard]}
              accessibilityRole="button"
              accessibilityLabel={esElite ? `Escribir a ${NOMBRE_COACH_ELITE}` : 'Escribir a ATP'}
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>
                    {esElite ? `Escribir a ${NOMBRE_COACH_ELITE}` : 'Escríbenos'}
                  </EliteText>
                  <EliteText style={[styles.eventDate, thTenue]}>{CONTACTO_ELITE_EMAIL}</EliteText>
                </View>
                <Ionicons name="mail-outline" size={16} color={tokens.textoSecundario} />
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* ── Renovación y gestión (solo con suscripción de tienda viva) ── */}
        {caraNormal && caraDeTienda && hasPaidPlan && (
          <Animated.View entering={FadeInUp.delay(90).springify()}>
            <EliteText style={[styles.sectionTitle, thTenue]}>GESTIÓN</EliteText>
            <View style={[styles.card, thCard]}>
              <View style={styles.row}>
                <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>Próxima renovación</EliteText>
                <EliteText style={[styles.rowValue, { color: tokens.textoSecundario }]}>
                  {activeEntitlement?.willRenew === false
                    ? `Termina el ${formatDate(activeEntitlement?.expirationDate)}`
                    : `${formatDate(activeEntitlement?.expirationDate)}${renewalPrice ? ` · ${renewalPrice}` : ''}`}
                </EliteText>
              </View>
              <View style={[styles.divider, { backgroundColor: tokens.borde }]} />
              <AnimatedPressable onPress={onManagePayment} style={styles.row}>
                <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>Método de pago</EliteText>
                <View style={styles.rowRight}>
                  <EliteText style={[styles.rowValue, { color: tokens.textoSecundario }]}>
                    {proveedor ? `Gestionar en ${proveedor}` : 'Sin cobro'}
                  </EliteText>
                  <Ionicons name="open-outline" size={14} color={tokens.textoSecundario} />
                </View>
              </AnimatedPressable>
              <View style={[styles.divider, { backgroundColor: tokens.borde }]} />
              <AnimatedPressable onPress={onCancel} style={styles.row}>
                <EliteText style={[styles.rowLabel, { color: tokens.error }]}>
                  Cancelar suscripción
                </EliteText>
                <Ionicons name="chevron-forward" size={16} color={tokens.error} />
              </AnimatedPressable>
            </View>
          </Animated.View>
        )}

        {/* ── Código de activación (MB-13; ATP 3.0 ruta 2.6: servicio contratado,
             no vía de compra). No se invita a canjear mientras no se sepa qué
             tiene la persona (leyendo o nivel ilegible). ── */}
        {caraNormal && (
        <Animated.View entering={FadeInUp.delay(110).springify()}>
          <AnimatedPressable
            onPress={() => { haptic.medium(); router.push('/redeem-code'); }}
            style={[styles.card, thCard]}
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>Tengo un código de activación</EliteText>
                <EliteText style={[styles.eventDate, thTenue]}>
                  Para servicios contratados con ATP
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.textoSecundario} />
            </View>
          </AnimatedPressable>
        </Animated.View>
        )}

        {/* ── Restaurar. Ronda de arreglos (20-sep-2026): antes en la cara "Tu
             servicio" solo se pintaba con la venta al público encendida, y una
             suscriptora de tienda con RevenueCat sin sincronizar caía ahí sin
             salida (Apple exige restore mientras haya suscriptores). Ahora es
             una fila discreta al final de AMBAS caras y del estado ilegible;
             en la de tienda sigue diciendo lo de siempre. ── */}
        {listo && (
          <Animated.View entering={FadeInUp.delay(130).springify()}>
            <AnimatedPressable
              onPress={onRestore}
              disabled={restoring}
              style={styles.restoreBtn}
              accessibilityRole="button"
              accessibilityLabel="Restaurar compras de la tienda"
            >
              {!caraDeTienda && (
                <EliteText style={[styles.restoreHint, thTenue]}>¿Ya tenías una suscripción de la tienda?</EliteText>
              )}
              <EliteText style={[styles.restoreText, { color: tokens.textoSecundario }]}>
                {restoring ? 'Restaurando…' : 'Restaurar compras'}
              </EliteText>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* ── Historial. En "Tu servicio" solo si hay movimientos: el vacío
             hablaba de compras y renovaciones a quien no compra aquí. ── */}
        {caraNormal && (caraDeTienda || events.length > 0) && (
        <Animated.View entering={FadeInUp.delay(170).springify()}>
          <EliteText style={[styles.sectionTitle, thTenue]}>{caraDeTienda ? 'HISTORIAL DE PAGOS' : 'HISTORIAL'}</EliteText>
          {events.length === 0 ? (
            <View style={[styles.card, thCard]}>
              <EliteText style={[styles.emptyText, thTenue]}>
                Sin movimientos todavía. Aquí verás tus compras y renovaciones.
              </EliteText>
            </View>
          ) : (
            <View style={[styles.card, thCard]}>
              {events.map((ev, i) => (
                <View key={ev.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: tokens.borde }]} />}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[styles.rowLabel, { color: tokens.texto }]}>
                        {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      </EliteText>
                      <EliteText style={[styles.eventDate, thTenue]}>{formatDate(ev.processed_at)}</EliteText>
                    </View>
                    {ev.price_usd !== null && (
                      <EliteText style={[styles.rowValue, { color: tokens.textoSecundario }]}>
                        ${ev.price_usd.toFixed(2)} {ev.currency ?? 'USD'}
                      </EliteText>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
        )}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 80, gap: Spacing.lg },
  tierCard: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tierLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  tierName: { fontFamily: Fonts.extraBold, fontSize: FontSizes.display },
  servicioDesc: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  trialBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  trialText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  upgradeCta: {
    marginTop: Spacing.sm,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
  },
  upgradeCtaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: TEXT_COLORS.onAccent },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.md },
  rowValue: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  eventDate: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: ELEVATION[1].border },
  restoreBtn: { alignItems: 'center', paddingVertical: Spacing.xs, gap: 2 },
  restoreHint: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, textAlign: 'center' },
  restoreText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  cargando: { alignItems: 'center', paddingVertical: Spacing.xl },
  reintentarBtn: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
  },
  reintentarText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
});
