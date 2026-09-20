/**
 * QueHacerHoy (ATP 3.0, 6-sep-2026, ruta 2.2): las tres acciones de hoy,
 * justo debajo del hero de laboratorios. ARGOS las elige entre las prácticas
 * personalizadas que la persona ya tiene encendidas, priorizando las ligadas
 * a un marcador fuera de ventana; sin ninguna, tres hábitos base del
 * catálogo. La regla vive en que-hacer-hoy-core.ts (con test).
 *
 * El cumplido escribe por el mismo camino de siempre (logCompletion:
 * intervention_completions + electrón + 'electrons_changed'). Palomear es
 * optimista; si no quedó registrado, la paloma se regresa.
 *
 * Estados (regla 13): cargando, "no se pudo leer" con reintentar, y la
 * lista (nunca vacía: el core siempre devuelve tres).
 *
 * 20-sep-2026 (cliente Elite): con evaluacion cargada la tarjeta habla de su
 * plan. La primera linea nombra su objetivo activo y la senal que va a ver
 * moverse; las filas priorizan la toma de suplementos del plan de Enrique
 * (se registra en Mis suplementos, donde viven dosis y hora) y sus palancas
 * del cierre (abren la evaluacion: son palancas de semanas, no de un dia).
 * Lo que no viene del plan sigue siendo lo de siempre, con paloma.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { warn as logWarn } from '@/src/lib/logger';
import { INTERVENTIONS_CHANGED_EVENT } from '@/src/services/interventions/intervention-service';
import { cargarQueHacerHoy, registrarCumplidoHoy, type ResultadoQueHacerHoy } from '@/src/services/hoy/que-hacer-hoy-service';
import { marcarHecha, type AccionHoy } from '@/src/services/hoy/que-hacer-hoy-core';
import { lineaPlanHoy, tituloTarjetaHoy, type NivelHoy } from '@/src/services/hoy/elite-hoy-core';
import { EVALUACION_ELITE_CHANGED_EVENT } from '@/src/services/hoy/elite-hoy-service';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  userId?: string;
  /**
   * 20-sep-2026 (ronda de arreglos, A7): el nivel leido UNA vez en HOY. Con
   * el, un fallo de functional_dx solo tumba la terna cuando no sabemos que
   * no hay plan. Sin el (undefined) se asume que no se sabe: fatal.
   */
  nivel?: NivelHoy;
}

export function QueHacerHoy({ userId, nivel }: Props) {
  const t = useSurfaceTokens();
  const router = useRouter();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  // 7-sep-2026 (pivote limpio): esta tarjeta abría la lista "Mi Protocolo",
  // que era app Pro, así que una cuenta Free tocaba su propio día y chocaba
  // con un candado. La lista se retiró y con ella el candado: el detalle de
  // cada práctica se abre para todos (es lo que la persona ya trae puesto,
  // no contenido de paga). Aquí solo caben tres, así que "ver todo" va a
  // /agenda, que las trae TODAS con su hora y deja pausar y descartar cada
  // una desde su ficha.
  const abrirPractica = useCallback((key?: string) => {
    haptic.light();
    if (key) router.push(`/salud/intervenciones/${key}`);
    else router.push('/agenda');
  }, [router]);

  const [acciones, setAcciones] = useState<AccionHoy[] | null>(null);
  const [plan, setPlan] = useState<Pick<ResultadoQueHacerHoy, 'evaluacion' | 'objetivo'>>({ evaluacion: null, objetivo: null });
  const [cargando, setCargando] = useState(true);
  const [ocupada, setOcupada] = useState<string | null>(null);

  // Por ref y no como dependencia: `nivel` es un objeto nuevo en cada render
  // de HOY y meterlo en `cargar` haria que el foco recargara sin parar.
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;

  const cargar = useCallback(async (forzar = false) => {
    if (!userId) return;
    setCargando(true);
    try {
      const r = await cargarQueHacerHoy(userId, { forzar, nivel: nivelRef.current });
      setAcciones(r.acciones);
      setPlan({ evaluacion: r.evaluacion, objetivo: r.objetivo });
    } catch (e) {
      logWarn('[que-hacer-hoy] no se pudo leer', e);
    } finally {
      setCargando(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  // (A7) Si la terna se cayo mientras el nivel estaba en vuelo (no se sabia si
  // habia plan), al resolverse el nivel se intenta UNA vez mas, sin boton.
  // Solo en esa transicion: nunca un bucle sobre un fallo persistente.
  const nivelCargando = nivel?.cargando ?? false;
  const nivelCargabaRef = useRef(nivelCargando);
  const sinTernaRef = useRef(false);
  sinTernaRef.current = acciones === null && !cargando;
  useEffect(() => {
    const cargaba = nivelCargabaRef.current;
    nivelCargabaRef.current = nivelCargando;
    if (cargaba && !nivelCargando && sinTernaRef.current) cargar();
  }, [nivelCargando, cargar]);
  useEffect(() => {
    // Activar o pausar una práctica cambia la terna.
    const sub = DeviceEventEmitter.addListener(INTERVENTIONS_CHANGED_EVENT, () => { cargar(); });
    // 20-sep-2026 (A2): la evaluacion que HOY conoce cambio (Reintentar o
    // Actualizar del hero, o una version nueva): la terna se rearma.
    const subElite = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, (p?: { userId?: string }) => {
      if (p?.userId && userId && p.userId !== userId) return;
      cargar();
    });
    return () => { sub.remove(); subElite.remove(); };
  }, [cargar, userId]);

  // 20-sep-2026: las filas del plan no se palomean aqui. Los suplementos se
  // registran en Mis suplementos (dosis, hora, cantidad) y las palancas se
  // leen en la evaluacion. Tocar la paloma abre el lugar correcto.
  const abrirDelPlan = useCallback((a: AccionHoy) => {
    haptic.light();
    if (a.tipo === 'suplementos') router.push('/supplements');
    else router.push({ pathname: '/salud/evaluacion-elite', params: { seccion: 'cierre' } });
  }, [router]);

  const palomear = useCallback(async (a: AccionHoy) => {
    if (!userId || a.hecha || ocupada) return;
    if (a.tipo === 'suplementos' || a.tipo === 'palanca') { abrirDelPlan(a); return; }
    haptic.success();
    setOcupada(a.key);
    setAcciones((prev) => (prev ? marcarHecha(prev, a.key, true) : prev));
    // Si quedó registrado, logCompletion emite INTERVENTIONS_CHANGED y el
    // listener relee (trae el id de una fila base recién nacida).
    const ok = await registrarCumplidoHoy(userId, a);
    if (!ok) setAcciones((prev) => (prev ? marcarHecha(prev, a.key, false) : prev));
    setOcupada(null);
  }, [userId, ocupada, abrirDelPlan]);

  const card = [s.card, { backgroundColor: t.card, borderColor: dark ? withOpacity(ATP_BRAND.lime, 0.2) : t.bordeEditorial }];

  const cabecera = (
    <View style={s.headerRow}>
      <View style={[s.iconWrap, { backgroundColor: withOpacity(acento, 0.14) }]}>
        <AppIcon name="protocolos" size={18} color={acento} />
      </View>
      <EliteText style={[s.label, { color: acento }]}>{tituloTarjetaHoy(plan.evaluacion)}</EliteText>
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
          onPress={() => { haptic.light(); cargar(true); }}
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
        {lineaPlanHoy(plan.objetivo, plan.evaluacion, ligadas)}
      </EliteText>
      <View style={s.lista}>
        {acciones.map((a) => {
          const delPlan = a.tipo === 'suplementos' || a.tipo === 'palanca';
          const firma = a.firma ?? (a.porMarcador ? `Por tu ${a.porMarcador}${plan.evaluacion ? ', según tu evaluación' : ''}` : null);
          return (
          <View key={a.key} style={[s.fila, { backgroundColor: t.hundido }]}>
            {a.tipo === 'palanca' ? (
              // Una palanca no se palomea: es de semanas. El glifo dice "lee".
              <View style={[s.check, { borderColor: 'transparent', backgroundColor: withOpacity(acento, 0.14) }]}>
                <AppIcon name="evaluaciones" size={14} color={acento} />
              </View>
            ) : (
            <AnimatedPressable
              style={[s.check, { borderColor: a.hecha ? acento : t.bordeMarcado, backgroundColor: a.hecha ? acento : 'transparent' }]}
              onPress={() => palomear(a)}
              disabled={a.hecha || ocupada != null}
              // La fila de suplementos no palomea: abre Mis suplementos. Un
              // control que navega es un boton, no una casilla (A11).
              accessibilityRole={a.tipo === 'suplementos' ? 'button' : 'checkbox'}
              accessibilityState={a.tipo === 'suplementos' ? undefined : { checked: a.hecha }}
              accessibilityLabel={a.tipo === 'suplementos' ? 'Registrar mis suplementos de hoy' : `Marcar ${a.titulo} como hecho`}
            >
              {a.hecha && <Ionicons name="checkmark" size={16} color={dark ? ATP_BRAND.black : t.textoSobreLima} />}
            </AnimatedPressable>
            )}
            <AnimatedPressable
              style={{ flex: 1 }}
              // Sin fila propia (hábito base recién sugerido) el detalle diría
              // "no la encontramos": se abre la agenda, que sí la trae.
              onPress={() => (delPlan ? abrirDelPlan(a) : abrirPractica(a.userInterventionId ? a.key : undefined))}
            >
              <EliteText style={[s.filaTitulo, { color: t.texto }, a.hecha && s.tachado]} numberOfLines={1}>{a.titulo}</EliteText>
              <EliteText style={[s.filaDetalle, { color: t.textoSecundario }]} numberOfLines={2}>{a.detalle}</EliteText>
              {firma ? (
                <EliteText style={[s.filaMotivo, { color: acento }]} numberOfLines={1}>{firma}</EliteText>
              ) : null}
            </AnimatedPressable>
            {delPlan ? <Ionicons name="chevron-forward" size={14} color={t.textoSecundario} /> : null}
          </View>
          );
        })}
      </View>
      <AnimatedPressable style={s.verTodo} onPress={() => abrirPractica()}>
        <EliteText style={[s.verTodoText, { color: acento }]}>Ver todo mi día</EliteText>
        <Ionicons name="chevron-forward" size={14} color={acento} />
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
