/**
 * EMOM Autoajustable — Estrés metabólico con deuda de reps.
 *
 * Cada minuto el usuario hace X reps. Reps faltantes = deuda.
 * Al final, serie de paga. La app dice si subir/bajar peso.
 *
 * MB-3.5 #3 (fix conceptual — antes era un AMRAP): el minuto corre FIJO e
 * independiente de cuándo registras. Tocar un número SELECCIONA las reps de la
 * ronda actual (corregible hasta que el minuto cierre); la ronda se COMMITEA
 * al llegar el reloj a 0 y la siguiente arranca al minuto, no al registrar.
 * Si el minuto muere sin registro NO se asume 0: la ronda queda pendiente y se
 * pide el dato (banner en vivo o captura al final).
 *
 * ⚠️ La regla de peso (deuda, serie de paga, subir/mantener/bajar) NO se toca.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Fonts, Radius } from '@/constants/theme';
import { EMOM_CLASE_LABEL, type EmomPrescripcion } from '@/src/services/fitness/emom-core';

// MB-31B: naranja de fase EMOM = señal de dominio (doctrina), se queda
// hardcodeado como relleno/icono en los dos temas. Como TEXTO no alcanza
// contraste en claro (1.96:1) — se oscurece solo ahí.
const NARANJA = '#fb923c';
const naranjaTexto = (dark: boolean) => (dark ? NARANJA : '#B45309');
// MB-31B: rojo de estado "fallo/deuda" — mismo tratamiento que MYO REPS.
const ROJO = '#ef4444';
const rojoTexto = (dark: boolean) => (dark ? ROJO : '#C0392B');

// Límites duros del ajuste manual (guiado, no prisionero: el rango sugerido
// viene de la prescripción; estos solo evitan configuraciones sin sentido).
const RONDAS_LIM = { min: 3, max: 20 };
const REPS_LIM = { min: 1, max: 60 };

interface Props {
  exerciseName: string;
  userLevel: 'beginner' | 'intermediate';
  /**
   * MB-5 Bloque 1: prescripción X×X según la carga del ejercicio (emom-core).
   * Sin ella (planes viejos, ejercicios fuera de matriz) corre el default
   * previo: 10×10 intermedio · 8×8 principiante.
   */
  prescripcion?: EmomPrescripcion;
  onComplete: (result: { rounds: number[]; debt: number; weightFeedback: string }) => void;
  /** Cue de voz opcional (el host decide si habla). { hito } = se habla también en modo 'solo hitos'. */
  onCue?: (text: string, opts?: { hito?: boolean }) => void;
}

export function EMOMAuto({ exerciseName, userLevel, prescripcion, onComplete, onCue }: Props) {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const s = useMemo(() => makeStyles(t), [t]);
  const legacy = userLevel === 'beginner' ? { rounds: 8, targetReps: 8 } : { rounds: 10, targetReps: 10 };
  // X×X ajustable en la fase ready; al iniciar queda fijo para toda la sesión.
  const [rondasCfg, setRondasCfg] = useState(prescripcion?.rondas ?? legacy.rounds);
  const [repsCfg, setRepsCfg] = useState(prescripcion?.reps ?? legacy.targetReps);
  const config = { rounds: rondasCfg, targetReps: repsCfg };
  const [phase, setPhase] = useState<'ready' | 'active' | 'captura' | 'debt' | 'done'>('ready');
  const [currentRound, setCurrentRound] = useState(0);
  const [timer, setTimer] = useState(60);
  /** Reps commiteadas por ronda; null = el minuto murió sin registro (pendiente). */
  const [results, setResults] = useState<(number | null)[]>([]);
  /** Selección de la ronda ACTUAL — corregible hasta que el reloj llegue a 0. */
  const [seleccion, setSeleccion] = useState<number | null>(null);
  /** Selección para rondas pendientes (banner en vivo / fase captura) — se confirma explícito. */
  const [capturaSel, setCapturaSel] = useState<number | null>(null);
  const [totalDebt, setTotalDebt] = useState(0);
  // El commit del minuto lee la selección vía ref (el tick no depende de taps).
  const seleccionRef = useRef<number | null>(null);
  seleccionRef.current = seleccion;
  const resultsRef = useRef<(number | null)[]>([]);
  resultsRef.current = results;

  // El reloj: corre FIJO mientras la fase es activa. Nada lo reinicia.
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, currentRound]);

  // Cuenta regresiva hablada del minuto (3-2-1) — cue aditivo, la regla no cambia.
  useEffect(() => {
    if (phase !== 'active') return;
    if (timer === 3 || timer === 2 || timer === 1) onCue?.(String(timer));
    if (timer <= 0) finalizarMinuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, phase]);

  /** El minuto cerró: commit de la selección (o pendiente) y arranca la ronda siguiente. */
  function finalizarMinuto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const reps = seleccionRef.current; // null = sin registro → NO se asume 0
    const nuevos = [...resultsRef.current, reps];
    setResults(nuevos);
    setSeleccion(null);
    if (reps == null) {
      onCue?.(`Ronda ${nuevos.length} sin registro. Marca tus repeticiones.`);
    }

    if (nuevos.length >= config.rounds) {
      if (nuevos.some((r) => r == null)) {
        setPhase('captura');
      } else {
        cerrarEmom(nuevos as number[]);
      }
    } else {
      setCurrentRound((r) => r + 1);
      setTimer(60);
      onCue?.(`Ronda ${nuevos.length + 1}.`);
    }
  }

  /** Captura tardía de una ronda que murió sin registro (banner / fase captura). */
  function capturarPendiente(roundIdx: number, reps: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nuevos = [...resultsRef.current];
    nuevos[roundIdx] = reps;
    setResults(nuevos);
    setCapturaSel(null);
    if (phase === 'captura' && nuevos.every((r) => r != null)) {
      cerrarEmom(nuevos as number[]);
    }
  }

  /** Cierre del EMOM — REGLA DE PESO INTACTA (deuda, serie de paga, feedback). */
  function cerrarEmom(rondas: number[]) {
    const finalDebt = rondas.reduce((s, r) => s + Math.max(0, config.targetReps - r), 0);
    setTotalDebt(finalDebt);
    if (finalDebt === 0) {
      setPhase('done');
      onCue?.('Peso bajo. Sube el peso la próxima sesión.', { hito: true });
      onComplete({ rounds: rondas, debt: 0, weightFeedback: 'Peso bajo. Sube el peso la próxima sesión.' });
    } else {
      setPhase('debt');
      onCue?.(`Serie de paga: ${finalDebt} repeticiones.`, { hito: true });
    }
  }

  function completeDebtPayment() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const rondas = resultsRef.current.map((r) => r ?? 0);
    const lastRound = rondas[rondas.length - 1];
    let weightFeedback = '';
    if (totalDebt > lastRound) {
      weightFeedback = `Deuda (${totalDebt}) > última serie (${lastRound}). Peso alto, bájale.`;
    } else {
      weightFeedback = 'Deuda pagada. Peso OK.';
    }
    setPhase('done');
    onCue?.(weightFeedback, { hito: true });
    onComplete({ rounds: rondas, debt: totalDebt, weightFeedback });
  }

  // Botones de reps (target hacia abajo) — tap = SELECCIONAR, no cerrar.
  // MB-5 Bloque 1: paso adaptativo a la carga (target 10 → de 1 en 1, como
  // antes; target 25-40 → saltos) + ajuste fino ± para el dato exacto (la
  // deuda se calcula con reps exactas).
  const paso = Math.max(1, Math.round(config.targetReps / 10));
  const repsButtons = Array.from({ length: 6 }, (_, i) => config.targetReps - i * paso)
    .filter((r) => r >= 0);

  const pendientes = results.map((r, i) => (r == null ? i : -1)).filter((i) => i >= 0);
  const deudaParcial = results.reduce<number>((s, r) => s + (r == null ? 0 : Math.max(0, config.targetReps - r)), 0);

  const botonesReps = (onPick: (r: number) => void, activo: number | null) => (
    <View style={s.repsRow}>
      {repsButtons.map((r) => (
        <Pressable
          key={r}
          onPress={() => onPick(r)}
          style={[s.repBtn, activo === r && s.repBtnActivo]}
        >
          <Text style={[s.repBtnText, activo === r && s.repBtnTextActivo]}>{r}</Text>
        </Pressable>
      ))}
    </View>
  );

  /** Ajuste fino ±1 sobre una selección ya hecha (dato exacto para la deuda). */
  const ajusteFino = (valor: number, onChange: (n: number) => void) => (
    <View style={s.fineRow}>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(Math.max(0, valor - 1)); }}
        style={s.fineBtn}
      >
        <Ionicons name="remove" size={18} color={t.texto} />
      </Pressable>
      <Text style={s.fineValue}>{valor}</Text>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(Math.min(REPS_LIM.max, valor + 1)); }}
        style={s.fineBtn}
      >
        <Ionicons name="add" size={18} color={t.texto} />
      </Pressable>
    </View>
  );

  /** Stepper de configuración X×X (solo fase ready — guiado, no prisionero). */
  const cfgStepper = (label: string, valor: number, set: (n: number) => void, min: number, max: number) => (
    <View style={s.cfgRow}>
      <Text style={s.cfgLabel}>{label}</Text>
      <View style={s.cfgControls}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set(Math.max(min, valor - 1)); }}
          style={s.fineBtn}
        >
          <Ionicons name="remove" size={18} color={t.texto} />
        </Pressable>
        <Text style={s.cfgValue}>{valor}</Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set(Math.min(max, valor + 1)); }}
          style={s.fineBtn}
        >
          <Ionicons name="add" size={18} color={t.texto} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ padding: 20 }}>
      {/* Header */}
      <View style={s.headerCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="timer" size={18} color={NARANJA} />
          <Text style={s.headerTitle}>EMOM AUTOAJUSTABLE</Text>
        </View>
        <Text style={s.headerBody}>
          {config.rounds} rondas × {config.targetReps} reps por minuto. El reloj no espera:{'\n'}
          marca tus reps cuando termines. La ronda cierra al minuto.{'\n'}
          Reps faltantes = deuda. Al final, serie de paga.
        </Text>
      </View>

      {/* READY — X×X ajustable (MB-5 Bloque 1: guiado, no prisionero) */}
      {phase === 'ready' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={s.exerciseName}>{exerciseName}</Text>
          {prescripcion && (
            <Text style={s.claseHint}>{EMOM_CLASE_LABEL[prescripcion.clase]}</Text>
          )}
          <View style={s.cfgCard}>
            {cfgStepper('RONDAS', rondasCfg, setRondasCfg, RONDAS_LIM.min, RONDAS_LIM.max)}
            {cfgStepper('REPS POR MINUTO', repsCfg, setRepsCfg, REPS_LIM.min, REPS_LIM.max)}
            {prescripcion && (
              <Text style={s.sugeridoText}>
                Sugerido para este ejercicio: {prescripcion.repsMin}-{prescripcion.repsMax} reps · {prescripcion.rondasMin}-{prescripcion.rondasMax} rondas
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => { setPhase('active'); setTimer(60); onCue?.(`EMOM iniciado: ${rondasCfg} rondas de ${repsCfg} repeticiones. Ronda 1.`, { hito: true }); }}
            style={s.ctaBtn}
          >
            <Text style={s.ctaText}>INICIAR EMOM</Text>
          </Pressable>
        </View>
      )}

      {/* ACTIVE */}
      {phase === 'active' && (
        <View style={{ alignItems: 'center' }}>
          {/* Timer grande — corre fijo, nada lo reinicia */}
          <Text style={s.bigTimer}>
            0:{String(Math.max(0, timer)).padStart(2, '0')}
          </Text>
          <Text style={s.roundLabel}>
            Ronda {currentRound + 1} de {config.rounds}
          </Text>
          <Text style={[s.debtLabel, { color: deudaParcial > 0 ? rojoTexto(dark) : (dark ? ATP_BRAND.lime : t.tealTexto) }]}>
            Deuda acumulada: {deudaParcial} reps
          </Text>

          {/* Ronda pendiente (el minuto murió sin registro): pedir el dato, no asumir 0 */}
          {pendientes.length > 0 && (
            <View style={s.pendienteCard}>
              <Text style={s.pendienteTitle}>RONDA {pendientes[0] + 1} SIN REGISTRO</Text>
              <Text style={s.pendienteBody}>¿Cuántas reps hiciste?</Text>
              {botonesReps((r) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCapturaSel(r); }, capturaSel)}
              {capturaSel != null && (
                <>
                  {ajusteFino(capturaSel, setCapturaSel)}
                  <Pressable onPress={() => capturarPendiente(pendientes[0], capturaSel)} style={s.miniCta}>
                    <Text style={s.miniCtaText}>REGISTRAR RONDA</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* Selección de la ronda actual (corregible hasta el minuto) */}
          <Text style={s.hintText}>
            {seleccion == null ? '¿Cuántas reps completaste? (tocar selecciona)' : `Seleccionaste ${seleccion}. Se registra al cerrar el minuto. Corrige si quieres.`}
          </Text>
          {botonesReps((r) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSeleccion(r); }, seleccion)}
          {seleccion != null && ajusteFino(seleccion, setSeleccion)}

          {/* Rondas completadas */}
          {results.length > 0 && (
            <View style={{ marginTop: 20, width: '100%' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {results.map((reps, i) => (
                  <View key={i} style={[s.roundChip, {
                    backgroundColor: reps == null ? 'rgba(251,146,60,0.15)'
                      : reps === config.targetReps ? 'rgba(168,224,42,0.15)' : 'rgba(239,68,68,0.15)',
                  }]}>
                    <Text style={{
                      color: reps == null ? naranjaTexto(dark) : reps === config.targetReps ? (dark ? ATP_BRAND.lime : t.tealTexto) : rojoTexto(dark),
                      fontSize: 11, fontFamily: Fonts.semiBold,
                    }}>
                      R{i + 1}: {reps == null ? '¿?' : reps}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* CAPTURA (rondas sin registro al terminar los minutos) */}
      {phase === 'captura' && (
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="help-circle-outline" size={32} color={NARANJA} />
          <Text style={s.pendienteTitle}>RONDA {(pendientes[0] ?? 0) + 1} SIN REGISTRO</Text>
          <Text style={s.pendienteBody}>El EMOM terminó. ¿Cuántas reps hiciste en esa ronda?</Text>
          {botonesReps((r) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCapturaSel(r); }, capturaSel)}
          {capturaSel != null && (
            <>
              {ajusteFino(capturaSel, setCapturaSel)}
              <Pressable onPress={() => capturarPendiente(pendientes[0], capturaSel)} style={s.miniCta}>
                <Text style={s.miniCtaText}>REGISTRAR RONDA</Text>
              </Pressable>
            </>
          )}
          <Text style={s.hintText}>
            {pendientes.length > 1 ? `Faltan ${pendientes.length} rondas por registrar.` : 'Última ronda por registrar.'}
          </Text>
        </View>
      )}

      {/* DEBT PAYMENT */}
      {phase === 'debt' && (
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="warning" size={32} color={NARANJA} />
          <Text style={s.debtTitle}>SERIE DE PAGA</Text>
          <Text style={s.debtNumber}>{totalDebt}</Text>
          <Text style={s.debtHint}>reps de deuda · mínimo descanso</Text>
          <Pressable onPress={completeDebtPayment} style={s.ctaBtn}>
            <Text style={s.ctaText}>DEUDA PAGADA</Text>
          </Pressable>
        </View>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Ionicons name="checkmark-circle" size={48} color={ATP_BRAND.lime} />
          <Text style={s.doneTitle}>EMOM COMPLETADO</Text>
          <Text style={s.doneMeta}>
            {results.length} rondas · Deuda: {totalDebt} reps
          </Text>
        </View>
      )}
    </View>
  );
}

// MB-31B: estilos derivados del tema — dark = valores de siempre (ELEVATION/TEXT).
const makeStyles = (t: AppThemeTokens) => {
  const dark = t.kind === 'dark';
  return StyleSheet.create({
    headerCard: { backgroundColor: dark ? 'rgba(251,146,60,0.1)' : 'rgba(180,83,9,0.10)', borderRadius: Radius.card, padding: 16, marginBottom: 20 },
    headerTitle: { color: naranjaTexto(dark), fontSize: 15, fontFamily: Fonts.extraBold },
    headerBody: { color: t.textoSecundario, fontSize: 13, lineHeight: 20, fontFamily: Fonts.regular },

    exerciseName: { color: t.texto, fontSize: 18, fontFamily: Fonts.bold, marginBottom: 8 },
    claseHint: { color: naranjaTexto(dark), fontSize: 12, fontFamily: Fonts.semiBold, marginBottom: 12, textAlign: 'center' },
    cfgCard: {
      width: '100%', backgroundColor: t.card, borderColor: t.borde,
      borderWidth: 1, borderRadius: Radius.card, padding: 14, gap: 10,
    },
    cfgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cfgLabel: { color: t.textoSecundario, fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 1.5 },
    cfgControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cfgValue: { color: t.texto, fontSize: 22, fontFamily: Fonts.extraBold, fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'center' },
    sugeridoText: { color: t.textoSecundario, fontSize: 11, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 2 },
    fineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 },
    fineBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: t.flotante,
      borderWidth: 1, borderColor: t.bordeMarcado, justifyContent: 'center', alignItems: 'center',
    },
    fineValue: { color: t.texto, fontSize: 20, fontFamily: Fonts.extraBold, fontVariant: ['tabular-nums'], minWidth: 36, textAlign: 'center' },
    miniCta: {
      backgroundColor: NARANJA, borderRadius: Radius.pill, paddingVertical: 10, paddingHorizontal: 24,
      marginTop: 12, alignSelf: 'center',
    },
    miniCtaText: { color: t.textoSobreLima, fontSize: 13, fontFamily: Fonts.extraBold, letterSpacing: 1 },
    ctaBtn: {
      backgroundColor: NARANJA, borderRadius: Radius.card, padding: 18, paddingHorizontal: 48,
      alignItems: 'center', marginTop: 16,
    },
    ctaText: { color: t.textoSobreLima, fontSize: 16, fontFamily: Fonts.extraBold },

    bigTimer: { color: naranjaTexto(dark), fontSize: 56, fontFamily: Fonts.extraBold, fontVariant: ['tabular-nums'] },
    roundLabel: { color: t.textoSecundario, fontSize: 14, marginBottom: 4, fontFamily: Fonts.regular },
    debtLabel: { fontSize: 13, fontFamily: Fonts.semiBold, marginBottom: 16 },
    hintText: { color: t.textoSecundario, fontSize: 12, marginTop: 12, marginBottom: 10, textAlign: 'center', fontFamily: Fonts.regular },

    repsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    repBtn: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: t.flotante, justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: t.bordeMarcado,
    },
    repBtnActivo: { backgroundColor: NARANJA, borderColor: NARANJA },
    repBtnText: { color: t.texto, fontSize: 16, fontFamily: Fonts.bold },
    repBtnTextActivo: { color: t.textoSobreLima },

    pendienteCard: {
      width: '100%', backgroundColor: t.card, borderColor: NARANJA, borderWidth: 1,
      borderRadius: Radius.card, padding: 14, marginBottom: 14, alignItems: 'center',
    },
    pendienteTitle: { color: naranjaTexto(dark), fontSize: 13, fontFamily: Fonts.extraBold, letterSpacing: 1, marginTop: 6 },
    pendienteBody: { color: t.textoSecundario, fontSize: 12, marginVertical: 8, fontFamily: Fonts.regular },

    roundChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

    debtTitle: { color: naranjaTexto(dark), fontSize: 22, fontFamily: Fonts.extraBold, marginTop: 8 },
    debtNumber: { color: t.texto, fontSize: 56, fontFamily: Fonts.extraBold, marginVertical: 16 },
    debtHint: { color: t.textoSecundario, fontSize: 14, marginBottom: 8, fontFamily: Fonts.regular },

    doneTitle: { color: dark ? ATP_BRAND.lime : t.tealTexto, fontSize: 20, fontFamily: Fonts.extraBold, marginTop: 8 },
    doneMeta: { color: t.textoSecundario, fontSize: 13, marginTop: 8, textAlign: 'center', fontFamily: Fonts.regular },
  });
};
