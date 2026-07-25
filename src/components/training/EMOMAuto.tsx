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
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ELEVATION, TEXT } from '@/src/constants/brand';
import { Fonts, Radius } from '@/constants/theme';

const NARANJA = '#fb923c';

interface Props {
  exerciseName: string;
  userLevel: 'beginner' | 'intermediate';
  onComplete: (result: { rounds: number[]; debt: number; weightFeedback: string }) => void;
  /** Cue de voz opcional (el host decide si habla). { hito } = se habla también en modo 'solo hitos'. */
  onCue?: (text: string, opts?: { hito?: boolean }) => void;
}

export function EMOMAuto({ exerciseName, userLevel, onComplete, onCue }: Props) {
  const config = userLevel === 'beginner' ? { rounds: 8, targetReps: 8 } : { rounds: 10, targetReps: 10 };
  const [phase, setPhase] = useState<'ready' | 'active' | 'captura' | 'debt' | 'done'>('ready');
  const [currentRound, setCurrentRound] = useState(0);
  const [timer, setTimer] = useState(60);
  /** Reps commiteadas por ronda; null = el minuto murió sin registro (pendiente). */
  const [results, setResults] = useState<(number | null)[]>([]);
  /** Selección de la ronda ACTUAL — corregible hasta que el reloj llegue a 0. */
  const [seleccion, setSeleccion] = useState<number | null>(null);
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
  const repsButtons = Array.from({ length: config.targetReps + 1 }, (_, i) => config.targetReps - i)
    .filter((r) => r >= 0)
    .slice(0, 6);

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
          marca tus reps cuando termines — la ronda cierra al minuto.{'\n'}
          Reps faltantes = deuda. Al final, serie de paga.
        </Text>
      </View>

      {/* READY */}
      {phase === 'ready' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={s.exerciseName}>{exerciseName}</Text>
          <Pressable
            onPress={() => { setPhase('active'); setTimer(60); onCue?.('EMOM iniciado. Ronda 1.', { hito: true }); }}
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
          <Text style={[s.debtLabel, { color: deudaParcial > 0 ? '#ef4444' : '#a8e02a' }]}>
            Deuda acumulada: {deudaParcial} reps
          </Text>

          {/* Ronda pendiente (el minuto murió sin registro): pedir el dato, no asumir 0 */}
          {pendientes.length > 0 && (
            <View style={s.pendienteCard}>
              <Text style={s.pendienteTitle}>RONDA {pendientes[0] + 1} SIN REGISTRO</Text>
              <Text style={s.pendienteBody}>¿Cuántas reps hiciste?</Text>
              {botonesReps((r) => capturarPendiente(pendientes[0], r), null)}
            </View>
          )}

          {/* Selección de la ronda actual (corregible hasta el minuto) */}
          <Text style={s.hintText}>
            {seleccion == null ? '¿Cuántas reps completaste? (tocar selecciona)' : `Seleccionaste ${seleccion} — se registra al cerrar el minuto. Corrige si quieres.`}
          </Text>
          {botonesReps((r) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSeleccion(r); }, seleccion)}

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
                      color: reps == null ? NARANJA : reps === config.targetReps ? '#a8e02a' : '#ef4444',
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
          <Text style={s.pendienteBody}>El EMOM terminó — ¿cuántas reps hiciste en esa ronda?</Text>
          {botonesReps((r) => capturarPendiente(pendientes[0], r), null)}
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
          <Text style={s.debtHint}>reps de deuda — mínimo descanso</Text>
          <Pressable onPress={completeDebtPayment} style={s.ctaBtn}>
            <Text style={s.ctaText}>DEUDA PAGADA</Text>
          </Pressable>
        </View>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Ionicons name="checkmark-circle" size={48} color="#a8e02a" />
          <Text style={s.doneTitle}>EMOM COMPLETADO</Text>
          <Text style={s.doneMeta}>
            {results.length} rondas · Deuda: {totalDebt} reps
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  headerCard: { backgroundColor: 'rgba(251,146,60,0.1)', borderRadius: Radius.card, padding: 16, marginBottom: 20 },
  headerTitle: { color: NARANJA, fontSize: 15, fontFamily: Fonts.extraBold },
  headerBody: { color: '#ccc', fontSize: 13, lineHeight: 20, fontFamily: Fonts.regular },

  exerciseName: { color: '#fff', fontSize: 18, fontFamily: Fonts.bold, marginBottom: 20 },
  ctaBtn: {
    backgroundColor: NARANJA, borderRadius: Radius.card, padding: 18, paddingHorizontal: 48,
    alignItems: 'center', marginTop: 16,
  },
  ctaText: { color: '#000', fontSize: 16, fontFamily: Fonts.extraBold },

  bigTimer: { color: NARANJA, fontSize: 56, fontFamily: Fonts.extraBold, fontVariant: ['tabular-nums'] },
  roundLabel: { color: TEXT.secondary, fontSize: 14, marginBottom: 4, fontFamily: Fonts.regular },
  debtLabel: { fontSize: 13, fontFamily: Fonts.semiBold, marginBottom: 16 },
  hintText: { color: TEXT.secondary, fontSize: 12, marginTop: 12, marginBottom: 10, textAlign: 'center', fontFamily: Fonts.regular },

  repsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  repBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: ELEVATION[2].bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: ELEVATION[2].border,
  },
  repBtnActivo: { backgroundColor: NARANJA, borderColor: NARANJA },
  repBtnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
  repBtnTextActivo: { color: '#000' },

  pendienteCard: {
    width: '100%', backgroundColor: ELEVATION[1].bg, borderColor: NARANJA, borderWidth: 1,
    borderRadius: Radius.card, padding: 14, marginBottom: 14, alignItems: 'center',
  },
  pendienteTitle: { color: NARANJA, fontSize: 13, fontFamily: Fonts.extraBold, letterSpacing: 1, marginTop: 6 },
  pendienteBody: { color: TEXT.secondary, fontSize: 12, marginVertical: 8, fontFamily: Fonts.regular },

  roundChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  debtTitle: { color: NARANJA, fontSize: 22, fontFamily: Fonts.extraBold, marginTop: 8 },
  debtNumber: { color: '#fff', fontSize: 56, fontFamily: Fonts.extraBold, marginVertical: 16 },
  debtHint: { color: TEXT.secondary, fontSize: 14, marginBottom: 8, fontFamily: Fonts.regular },

  doneTitle: { color: '#a8e02a', fontSize: 20, fontFamily: Fonts.extraBold, marginTop: 8 },
  doneMeta: { color: TEXT.secondary, fontSize: 13, marginTop: 8, textAlign: 'center', fontFamily: Fonts.regular },
});
