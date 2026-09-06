/**
 * QueHacerHoy (ATP 3.0, 6-sep-2026, ruta 2.2): las tres acciones de hoy,
 * justo debajo del hero de laboratorios. ARGOS las elige entre las
 * intervenciones personalizadas que la persona ya tiene, priorizando las
 * ligadas a un marcador fuera de ventana; sin intervenciones, tres hábitos
 * base del catálogo. La regla vive en que-hacer-hoy-core.ts (con test).
 *
 * El cumplido usa el mismo camino que "Mi protocolo" (logCompletion:
 * intervention_completions + electrón + 'electrons_changed'). Palomear es
 * optimista; si no quedó registrado, la paloma se regresa.
 *
 * Estados (regla 13): cargando, "no se pudo leer" con reintentar, y la
 * lista (nunca vacía: el core siempre devuelve tres).
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CandadoNivel, destinoCandado } from '@/src/components/ui/CandadoNivel';
import { useSubscription } from '@/src/hooks/useSubscription';
import { warn as logWarn } from '@/src/lib/logger';
import { INTERVENTIONS_CHANGED_EVENT } from '@/src/services/interventions/intervention-service';
import { cargarQueHacerHoy, registrarCumplidoHoy } from '@/src/services/hoy/que-hacer-hoy-service';
import { marcarHecha, type AccionHoy } from '@/src/services/hoy/que-hacer-hoy-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  userId?: string;
}

export function QueHacerHoy({ userId }: Props) {
  const t = useSurfaceTokens();
  const router = useRouter();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  // La lista y el detalle viven en /salud/intervenciones (app `protocolos`,
  // Pro). Candado solo cuando SABEMOS que es free (fail-open); la paloma de
  // cada acción sigue libre para todos.
  const { tier, isLoading: nivelCargando, nivelNoSePudoLeer } = useSubscription();
  const protocolosConCandado = !nivelCargando && !nivelNoSePudoLeer && tier === 'free';
  const abrirProtocolos = useCallback((key?: string) => {
    haptic.light();
    if (protocolosConCandado) router.push(destinoCandado('protocolos', 'premium'));
    else if (key) router.push(`/salud/intervenciones/${key}`);
    else router.push('/salud/intervenciones');
  }, [protocolosConCandado, router]);

  const [acciones, setAcciones] = useState<AccionHoy[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!userId) return;
    setCargando(true);
    try {
      setAcciones(await cargarQueHacerHoy(userId));
    } catch (e) {
      logWarn('[que-hacer-hoy] no se pudo leer', e);
    } finally {
      setCargando(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  useEffect(() => {
    // Activar o pausar algo en /salud/intervenciones cambia la terna.
    const sub = DeviceEventEmitter.addListener(INTERVENTIONS_CHANGED_EVENT, () => { cargar(); });
    return () => sub.remove();
  }, [cargar]);

  const palomear = useCallback(async (a: AccionHoy) => {
    if (!userId || a.hecha || ocupada) return;
    haptic.success();
    setOcupada(a.key);
    setAcciones((prev) => (prev ? marcarHecha(prev, a.key, true) : prev));
    // Si quedó registrado, logCompletion emite INTERVENTIONS_CHANGED y el
    // listener relee (trae el id de una fila base recién nacida).
    const ok = await registrarCumplidoHoy(userId, a);
    if (!ok) setAcciones((prev) => (prev ? marcarHecha(prev, a.key, false) : prev));
    setOcupada(null);
  }, [userId, ocupada]);

  const card = [s.card, { backgroundColor: t.card, borderColor: dark ? withOpacity(ATP_BRAND.lime, 0.2) : t.bordeEditorial }];

  const cabecera = (
    <View style={s.headerRow}>
      <View style={[s.iconWrap, { backgroundColor: withOpacity(acento, 0.14) }]}>
        <AppIcon name="protocolos" size={18} color={acento} />
      </View>
      <EliteText style={[s.label, { color: acento }]}>QUÉ HACER HOY</EliteText>
    </View>
  );

  if (cargando && !acciones) {
    return (
      <View style={card}>
        {cabecera}
        <EliteText style={[s.body, { color: t.textoSecundario }]}>Eligiendo tus tres de hoy...</EliteText>
      </View>
    );
  }

  if (!acciones) {
    return (
      <View style={card}>
        {cabecera}
        <EliteText style={[s.titulo, { color: t.texto }]}>No pudimos leer tus hábitos</EliteText>
        <EliteText style={[s.body, { color: t.textoSecundario }]}>Revisa tu conexión y vuelve a intentar.</EliteText>
        <AnimatedPressable
          style={[s.btnQuiet, { borderColor: t.bordeMarcado }]}
          onPress={() => { haptic.light(); cargar(); }}
        >
          <Ionicons name="refresh" size={14} color={t.texto} />
          <EliteText style={[s.btnQuietText, { color: t.texto }]}>Reintentar</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  const ligadas = acciones.some((a) => a.porMarcador != null);
  return (
    <Animated.View entering={FadeInUp.delay(130).springify()} style={card}>
      {cabecera}
      <EliteText style={[s.body, { color: t.textoSecundario }]}>
        {ligadas
          ? 'Tres hábitos elegidos por tus marcadores fuera de ventana.'
          : 'Tres hábitos para hoy. Palomea lo que ya hiciste.'}
      </EliteText>
      <View style={s.lista}>
        {acciones.map((a) => (
          <View key={a.key} style={[s.fila, { backgroundColor: t.hundido }]}>
            <AnimatedPressable
              style={[s.check, { borderColor: a.hecha ? acento : t.bordeMarcado, backgroundColor: a.hecha ? acento : 'transparent' }]}
              onPress={() => palomear(a)}
              disabled={a.hecha || ocupada != null}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: a.hecha }}
              accessibilityLabel={`Marcar ${a.titulo} como hecho`}
            >
              {a.hecha && <Ionicons name="checkmark" size={16} color={dark ? ATP_BRAND.black : t.textoSobreLima} />}
            </AnimatedPressable>
            <AnimatedPressable
              style={{ flex: 1 }}
              // Sin fila propia (hábito base recién sugerido) el detalle diría
              // "no la encontramos": se abre la lista, que sí la trae.
              onPress={() => abrirProtocolos(a.userInterventionId ? a.key : undefined)}
            >
              <EliteText style={[s.filaTitulo, { color: t.texto }, a.hecha && s.tachado]} numberOfLines={1}>{a.titulo}</EliteText>
              <EliteText style={[s.filaDetalle, { color: t.textoSecundario }]} numberOfLines={2}>{a.detalle}</EliteText>
              {a.porMarcador ? (
                <EliteText style={[s.filaMotivo, { color: acento }]} numberOfLines={1}>Por tu {a.porMarcador}</EliteText>
              ) : null}
            </AnimatedPressable>
          </View>
        ))}
      </View>
      <AnimatedPressable style={s.verTodo} onPress={() => abrirProtocolos()}>
        <EliteText style={[s.verTodoText, { color: acento }]}>Ver todos mis hábitos</EliteText>
        {protocolosConCandado
          ? <CandadoNivel appKey="protocolos" nivel="premium" tocable={false} />
          : <Ionicons name="chevron-forward" size={14} color={acento} />}
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2 },
  titulo: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: 10 },
  body: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 6 },
  btnQuiet: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderColor: ELEVATION[2].border, borderRadius: 12,
    paddingVertical: 11, marginTop: Spacing.sm,
  },
  btnQuietText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  lista: { marginTop: 10, gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  filaDetalle: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 16, marginTop: 2 },
  filaMotivo: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, marginTop: 3 },
  tachado: { textDecorationLine: 'line-through', opacity: 0.7 },
  verTodo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, paddingVertical: 6 },
  verTodoText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
