/**
 * Evaluación de Movilidad (MB-3.6 Bloque 2) — captura GUIADA real de los 7
 * tests que persiste mobility_assessments (antes: placeholder de 50 líneas).
 *
 * Un test por paso, con por-qué + cómo-se-hace + anclas de puntuación
 * (doctrina: guiar con ejemplos, explicar siglas). Tests de cm (toe touch,
 * knee-to-wall) son medida física real; los 0-10 son auto-evaluación con
 * anclas — la lectura lo dice honesto. Resultado con overall + lectura por
 * test + asimetrías + comparación contra tu evaluación anterior, y CTA a
 * generar una rutina de movilidad (objetivo=movilidad del mismo motor).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import {
  ATP_BRAND, TEXT, ELEVATION, CATEGORY_COLORS, GLOW, getScoreColor, withOpacity,
} from '@/src/constants/brand';
import {
  MOBILITY_TESTS,
  EMPTY_MOBILITY_INPUT,
  scoresPorTest,
  overallMobilityScore,
  lecturaDe,
  compararEvaluaciones,
  type MobilityInput,
  type MobilityTestSpec,
  type MobilityReading,
} from '@/src/services/fitness/mobility-core';
import {
  saveMobilityAssessment,
  getPreviousMobilityAssessment,
  type MobilityAssessmentRow,
} from '@/src/services/fitness/mobility-service';

// Movilidad usa el morado desaturado como acento de categoría (mismo que su
// fila en Mi Fitness); el lima queda para CTA/dato heroico (ACCENT_ROLES).
const MOR = CATEGORY_COLORS.mind;

const READING_LABELS: Record<MobilityReading, string> = {
  excelente: 'Excelente', buena: 'Buena', funcional: 'Funcional', limitada: 'Limitada',
};

type Fase = 'inicio' | 'test' | 'resultado';

/** Campos del input por test/lado. */
function campoDe(test: MobilityTestSpec, lado: 'l' | 'r' | null): keyof MobilityInput {
  switch (test.key) {
    case 'deep_squat': return 'deep_squat';
    case 'overhead_squat': return 'overhead_squat';
    case 'toe_touch': return 'toe_touch_cm';
    case 'shoulder_rotation': return lado === 'l' ? 'shoulder_rotation_l' : 'shoulder_rotation_r';
    case 'hip_flexion': return lado === 'l' ? 'hip_flexion_l' : 'hip_flexion_r';
    case 'ankle_dorsiflexion': return lado === 'l' ? 'ankle_dorsiflexion_l_cm' : 'ankle_dorsiflexion_r_cm';
    case 'thoracic_rotation': return lado === 'l' ? 'thoracic_rotation_l' : 'thoracic_rotation_r';
  }
}

/** Input numérico de cm con steppers (permite negativos para toe touch). */
function CmInput({ valor, onChange, permiteNegativo }: {
  valor: number | null;
  onChange: (v: number | null) => void;
  permiteNegativo: boolean;
}) {
  const [texto, setTexto] = useState(valor != null ? String(valor) : '');

  function commit(t: string) {
    setTexto(t);
    const limpio = t.replace(',', '.').trim();
    if (limpio === '' || limpio === '-') { onChange(null); return; }
    const n = parseFloat(limpio);
    if (Number.isFinite(n) && Math.abs(n) <= 60) onChange(Math.round(n * 10) / 10);
  }

  function step(delta: number) {
    haptic.light();
    const base = valor ?? 0;
    let next = Math.round((base + delta) * 10) / 10;
    if (!permiteNegativo && next < 0) next = 0;
    if (next > 60) next = 60;
    setTexto(String(next));
    onChange(next);
  }

  return (
    <View style={cm.row}>
      <AnimatedPressable onPress={() => step(-1)} style={cm.btn}>
        <EliteText style={cm.btnText}>−</EliteText>
      </AnimatedPressable>
      <View style={cm.inputWrap}>
        <TextInput
          style={cm.input}
          value={texto}
          onChangeText={commit}
          keyboardType={permiteNegativo ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder="0"
          placeholderTextColor={TEXT.muted}
          maxLength={5}
        />
        <EliteText style={cm.unidad}>cm</EliteText>
      </View>
      <AnimatedPressable onPress={() => step(1)} style={cm.btn}>
        <EliteText style={cm.btnText}>+</EliteText>
      </AnimatedPressable>
    </View>
  );
}

const cm = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  btn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
  },
  btnText: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  input: {
    minWidth: 76, textAlign: 'center', color: TEXT.primary, fontFamily: Fonts.extraBold,
    fontSize: 30, backgroundColor: ELEVATION[0].bg, borderRadius: Radius.sm,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  unidad: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 13 },
});

export default function MobilityAssessmentScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [fase, setFase] = useState<Fase>('inicio');
  const [paso, setPaso] = useState(0);
  const [input, setInput] = useState<MobilityInput>(EMPTY_MOBILITY_INPUT);
  const [anterior, setAnterior] = useState<MobilityAssessmentRow | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  useEffect(() => {
    if (user) getPreviousMobilityAssessment(user.id).then(setAnterior).catch(() => {});
  }, [user]);

  const test = MOBILITY_TESTS[paso];

  function setCampo(campo: keyof MobilityInput, v: number | null) {
    setInput((prev) => ({ ...prev, [campo]: v }));
  }

  const capturadoEnPaso = useMemo(() => {
    if (!test) return false;
    if (test.bilateral) {
      return input[campoDe(test, 'l')] != null || input[campoDe(test, 'r')] != null;
    }
    return input[campoDe(test, null)] != null;
  }, [test, input]);

  async function terminar(final: MobilityInput) {
    if (!user) return;
    setGuardando(true);
    setErrorGuardado(null);
    const res = await saveMobilityAssessment(user.id, final);
    setGuardando(false);
    if (!res.ok) setErrorGuardado(res.error ?? 'No se pudo guardar.');
    setFase('resultado');
  }

  function siguiente() {
    haptic.medium();
    if (paso + 1 < MOBILITY_TESTS.length) setPaso(paso + 1);
    else terminar(input);
  }

  // ── Fase INICIO ──
  if (fase === 'inicio') {
    return (
      <Screen edges={[]}>
        <ScreenHeader title="Movilidad" />
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(300)}>
            <LinearGradient
              colors={[withOpacity(MOR, 0.22), 'rgba(10,10,10,0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroCard}
            >
              <View style={[s.heroIcon, { backgroundColor: withOpacity(MOR, 0.15) }]}>
                <Ionicons name="body-outline" size={30} color={MOR} />
              </View>
              <EliteText style={s.heroTitle}>Evalúa tu movilidad</EliteText>
              <EliteText style={s.heroBody}>
                7 tests guiados (~6 min) para medir tu rango de movimiento real:
                caderas, hombros, tobillos y espalda. Necesitas una pared y, si
                tienes, una cinta métrica.
              </EliteText>
              {anterior?.overall_score != null && (
                <View style={s.prevRow}>
                  <Ionicons name="time-outline" size={14} color={TEXT.secondary} />
                  <EliteText style={s.prevText}>
                    Tu última evaluación ({anterior.date}): {anterior.overall_score}/10 — hoy comparamos contra eso.
                  </EliteText>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).springify()}>
            {MOBILITY_TESTS.map((t, i) => (
              <View key={t.key} style={s.indexRow}>
                <View style={[s.indexNum, { backgroundColor: withOpacity(MOR, 0.12) }]}>
                  <EliteText style={[s.indexNumText, { color: MOR }]}>{i + 1}</EliteText>
                </View>
                <EliteText style={s.indexName}>{t.nombre}</EliteText>
                <Ionicons name={t.icono as any} size={16} color={TEXT.tertiary} />
              </View>
            ))}
          </Animated.View>

          <View style={{ marginTop: Spacing.lg }}>
            <GradientCTA
              label="EMPEZAR EVALUACIÓN"
              pillar="fitness"
              icon="play"
              onPress={() => { haptic.medium(); setFase('test'); setPaso(0); }}
            />
            <GradientCTA
              label="Rutina de movilidad"
              variant="quiet"
              icon="leaf-outline"
              onPress={() => {
                haptic.light();
                router.push({ pathname: '/routine-generator', params: { objetivo: 'movilidad' } });
              }}
              style={{ marginTop: Spacing.xs }}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ── Fase RESULTADO ──
  if (fase === 'resultado') {
    const overall = overallMobilityScore(input);
    const porTest = scoresPorTest(input);
    const cmp = anterior ? compararEvaluaciones(input, anterior) : null;
    const deltas = cmp ? new Map(cmp.porTest.map((t) => [t.key, t.delta])) : null;

    return (
      <Screen edges={[]}>
        <ScreenHeader title="Tu movilidad" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Overall — el dato heroico */}
          <Animated.View entering={FadeInDown.duration(300)} style={s.resultHero}>
            {overall != null ? (
              <>
                <View style={GLOW.accent}>
                  <EliteText style={[s.resultScore, { color: getScoreColor(overall * 10) }]}>
                    {overall.toFixed(1)}
                  </EliteText>
                </View>
                <EliteText style={s.resultDe10}>de 10 · movilidad {READING_LABELS[lecturaDe(overall)].toLowerCase()}</EliteText>
                {cmp?.deltaOverall != null && (
                  <View style={s.deltaPill}>
                    <Ionicons
                      name={cmp.deltaOverall >= 0 ? 'trending-up' : 'trending-down'}
                      size={13}
                      color={cmp.deltaOverall >= 0 ? ATP_BRAND.lime : TEXT.secondary}
                    />
                    <EliteText style={[s.deltaText, cmp.deltaOverall >= 0 && { color: ATP_BRAND.lime }]}>
                      {cmp.deltaOverall > 0 ? '+' : ''}{cmp.deltaOverall.toFixed(1)} vs tu evaluación del {anterior!.date}
                    </EliteText>
                  </View>
                )}
                <EliteText style={s.honestNote}>
                  Los tests de cm son medida física; los demás son tu auto-evaluación con anclas.
                </EliteText>
              </>
            ) : (
              <EliteText style={s.heroBody}>No capturaste ningún test — no hay score que inventar.</EliteText>
            )}
            {errorGuardado && (
              <View style={s.errorRow}>
                <Ionicons name="cloud-offline-outline" size={14} color={TEXT.secondary} />
                <EliteText style={s.errorText}>No se guardó en la nube: {errorGuardado}</EliteText>
              </View>
            )}
          </Animated.View>

          {/* Lectura por test */}
          {porTest.filter((t) => t.score != null).map((t, i) => {
            const spec = MOBILITY_TESTS.find((m) => m.key === t.key)!;
            const delta = deltas?.get(t.key) ?? null;
            return (
              <Animated.View key={t.key} entering={FadeInUp.delay(80 + i * 40).springify()} style={s.testRow}>
                <View style={[s.testDot, { backgroundColor: getScoreColor((t.score ?? 0) * 10) }]} />
                <View style={{ flex: 1 }}>
                  <EliteText style={s.testName}>{spec.nombre}</EliteText>
                  <EliteText style={s.testReading}>
                    {READING_LABELS[lecturaDe(t.score!)]}
                    {t.asimetria ? ' · asimetría izq/der — vale la pena trabajarla' : ''}
                    {delta != null ? `  (${delta > 0 ? '+' : ''}${delta.toFixed(1)})` : ''}
                  </EliteText>
                </View>
                <EliteText style={[s.testScore, { color: getScoreColor(t.score! * 10) }]}>
                  {t.score!.toFixed(1)}
                </EliteText>
              </Animated.View>
            );
          })}

          <View style={{ marginTop: Spacing.lg }}>
            <GradientCTA
              label="RUTINA DE MOVILIDAD"
              pillar="fitness"
              icon="leaf"
              onPress={() => {
                haptic.medium();
                router.push({ pathname: '/routine-generator', params: { objetivo: 'movilidad' } });
              }}
            />
            <GradientCTA label="Listo" variant="quiet" onPress={() => router.back()} style={{ marginTop: Spacing.xs }} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ── Fase TEST (un test por paso) ──
  return (
    <Screen edges={[]}>
      <ScreenHeader title={`Test ${paso + 1} de ${MOBILITY_TESTS.length}`} onBack={() => {
        if (paso === 0) setFase('inicio');
        else setPaso(paso - 1);
      }} />
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 140 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Progreso */}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${((paso + 1) / MOBILITY_TESTS.length) * 100}%` }]} />
        </View>

        <Animated.View key={test.key} entering={FadeInDown.duration(250)}>
          {/* Qué es y por qué */}
          <View style={[s.testHeader, { backgroundColor: withOpacity(MOR, 0.08) }]}>
            <View style={[s.heroIcon, { backgroundColor: withOpacity(MOR, 0.15) }]}>
              <Ionicons name={test.icono as any} size={26} color={MOR} />
            </View>
            <EliteText style={s.testTitle}>{test.nombre}</EliteText>
            <EliteText style={s.testWhy}>{test.porQue}</EliteText>
          </View>

          {/* Cómo se hace */}
          <EliteText style={s.sectionLabel}>CÓMO SE HACE</EliteText>
          {test.comoSeHace.map((pasoTxt, i) => (
            <View key={i} style={s.howRow}>
              <View style={[s.indexNum, { backgroundColor: withOpacity(MOR, 0.12) }]}>
                <EliteText style={[s.indexNumText, { color: MOR }]}>{i + 1}</EliteText>
              </View>
              <EliteText style={s.howText}>{pasoTxt}</EliteText>
            </View>
          ))}

          {/* Captura */}
          <EliteText style={s.sectionLabel}>
            {test.medida === 'cm' ? 'TU MEDIDA' : 'TU EVALUACIÓN'}
          </EliteText>
          {test.medida === 'cm' && test.unidadHint && (
            <EliteText style={s.unidadHint}>{test.unidadHint}</EliteText>
          )}

          {test.bilateral ? (
            (['l', 'r'] as const).map((lado) => {
              const campo = campoDe(test, lado);
              const valor = input[campo];
              return (
                <View key={lado} style={s.ladoBlock}>
                  <EliteText style={s.ladoLabel}>{lado === 'l' ? 'LADO IZQUIERDO' : 'LADO DERECHO'}</EliteText>
                  {test.medida === 'cm' ? (
                    <CmInput valor={valor} onChange={(v) => setCampo(campo, v)} permiteNegativo={false} />
                  ) : (
                    <View style={s.anchorsWrap}>
                      {test.anclas!.map((a) => (
                        <AnimatedPressable
                          key={a.valor}
                          onPress={() => { haptic.light(); setCampo(campo, a.valor); }}
                          style={[s.anchorCard, valor === a.valor && s.anchorCardActiva]}
                        >
                          <EliteText style={[s.anchorValor, valor === a.valor && { color: ATP_BRAND.lime }]}>
                            {a.valor}
                          </EliteText>
                          <EliteText style={[s.anchorTexto, valor === a.valor && { color: TEXT.primary }]}>
                            {a.texto}
                          </EliteText>
                        </AnimatedPressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          ) : test.medida === 'cm' ? (
            <CmInput
              valor={input[campoDe(test, null)]}
              onChange={(v) => setCampo(campoDe(test, null), v)}
              permiteNegativo={test.key === 'toe_touch'}
            />
          ) : (
            <View style={s.anchorsWrap}>
              {test.anclas!.map((a) => {
                const campo = campoDe(test, null);
                const activo = input[campo] === a.valor;
                return (
                  <AnimatedPressable
                    key={a.valor}
                    onPress={() => { haptic.light(); setCampo(campo, a.valor); }}
                    style={[s.anchorCard, activo && s.anchorCardActiva]}
                  >
                    <EliteText style={[s.anchorValor, activo && { color: ATP_BRAND.lime }]}>{a.valor}</EliteText>
                    <EliteText style={[s.anchorTexto, activo && { color: TEXT.primary }]}>{a.texto}</EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Acciones */}
        <View style={{ marginTop: Spacing.xl }}>
          <GradientCTA
            label={paso + 1 < MOBILITY_TESTS.length ? 'SIGUIENTE' : (guardando ? 'GUARDANDO…' : 'VER RESULTADO')}
            pillar="fitness"
            icon={paso + 1 < MOBILITY_TESTS.length ? 'arrow-forward' : 'checkmark'}
            disabled={!capturadoEnPaso || guardando}
            onPress={siguiente}
          />
          <GradientCTA
            label="Saltar este test"
            variant="quiet"
            onPress={() => {
              haptic.light();
              if (paso + 1 < MOBILITY_TESTS.length) setPaso(paso + 1);
              else terminar(input);
            }}
            style={{ marginTop: 2 }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  // Inicio
  heroCard: { borderRadius: Radius.card, padding: Spacing.lg, marginBottom: Spacing.md },
  heroIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: { color: TEXT.primary, fontFamily: Fonts.extraBold, fontSize: 24, lineHeight: 30 },
  heroBody: {
    color: 'rgba(255,255,255,0.8)', fontFamily: Fonts.regular, fontSize: FontSizes.sm,
    lineHeight: 20, marginTop: 6,
  },
  prevRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: Spacing.sm },
  prevText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12, flex: 1, lineHeight: 17 },
  indexRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ELEVATION[1].border,
  },
  indexNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  indexNumText: { fontSize: 11, fontFamily: Fonts.bold },
  indexName: { color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 14, flex: 1 },

  // Test
  progressBar: { height: 3, backgroundColor: ELEVATION[1].bg, borderRadius: 2, marginBottom: Spacing.md },
  progressFill: { height: '100%', backgroundColor: ATP_BRAND.lime, borderRadius: 2 },
  testHeader: { borderRadius: Radius.card, padding: Spacing.lg, marginBottom: Spacing.sm },
  testTitle: { color: TEXT.primary, fontFamily: Fonts.extraBold, fontSize: 21 },
  testWhy: {
    color: 'rgba(255,255,255,0.8)', fontFamily: Fonts.regular, fontSize: 13,
    lineHeight: 19, marginTop: 6,
  },
  sectionLabel: {
    color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  howRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  // MB-5 Bloque 3: un solo mecanismo de muteo — token de color, sin opacity apilada.
  howText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 13, flex: 1, lineHeight: 19 },
  unidadHint: { color: TEXT.tertiary, fontFamily: Fonts.regular, fontSize: 12, marginTop: -6, marginBottom: Spacing.sm },

  ladoBlock: { marginBottom: Spacing.md },
  ladoLabel: {
    color: TEXT.tertiary, fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  anchorsWrap: { gap: Spacing.xs },
  anchorCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md,
  },
  anchorCardActiva: {
    borderColor: ATP_BRAND.lime, backgroundColor: withOpacity(ATP_BRAND.lime, 0.06),
  },
  anchorValor: {
    width: 30, textAlign: 'center', color: TEXT.secondary, fontFamily: Fonts.extraBold,
    fontSize: 18, fontVariant: ['tabular-nums'],
  },
  anchorTexto: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 13, flex: 1, lineHeight: 18 },

  // Resultado
  resultHero: { alignItems: 'center', paddingVertical: Spacing.lg },
  resultScore: { fontSize: 64, fontFamily: Fonts.extraBold, fontVariant: ['tabular-nums'] },
  resultDe10: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 14, marginTop: 2 },
  deltaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.sm,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  deltaText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 12 },
  honestNote: {
    color: TEXT.tertiary, fontFamily: Fonts.regular, fontSize: 11, textAlign: 'center',
    marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, lineHeight: 16,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  errorText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12 },

  testRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.xs,
  },
  testDot: { width: 10, height: 10, borderRadius: 5 },
  testName: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: 14 },
  testReading: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },
  testScore: { fontFamily: Fonts.extraBold, fontSize: 18, fontVariant: ['tabular-nums'] },
});
