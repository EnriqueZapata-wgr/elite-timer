/**
 * Exercise Detail — ficha del ejercicio matriceado (MB-3 Track F).
 *
 * Hero con poster + los 11 ejes legibles: músculos, equipo, patrón, dinámica,
 * lateralidad, nivel/senior, cualidades, métodos ATP, contraindicaciones y
 * benchmark de Edad ATP (con copy honesto por tier). Variantes de la misma
 * familia para subir/bajar o cambiar de equipo. CTA → sesión con el ejercicio.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { ExerciseClip } from '@/src/components/training/ExerciseClip';
import { haptic } from '@/src/utils/haptics';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import { benchmarkInfo } from '@/src/services/fitness/edad-bridge-core';
import { clipDe, posterDe, type MatrixExercise } from '@/src/constants/exercise-matrix';
import { ATP_BRAND, TEXT, ELEVATION, withOpacity, SEMANTIC } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';

function Tag({ label, tone = 'neutro' }: { label: string; tone?: 'neutro' | 'lime' | 'teal' }) {
  return (
    <View style={[
      t.tag,
      tone === 'lime' && { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: withOpacity(ATP_BRAND.lime, 0.4) },
      tone === 'teal' && { backgroundColor: withOpacity(ATP_BRAND.teal, 0.12), borderColor: withOpacity(ATP_BRAND.teal, 0.4) },
    ]}>
      <Text style={[
        t.tagText,
        tone === 'lime' && { color: ATP_BRAND.lime },
        tone === 'teal' && { color: ATP_BRAND.teal },
      ]}>{label}</Text>
    </View>
  );
}

const t = StyleSheet.create({
  tag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  tagText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 11 },
});

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [catalogo, setCatalogo] = useState<MatrixExercise[]>([]);

  useEffect(() => { getExerciseMatrix().then(setCatalogo); }, []);

  const ex = useMemo(() => catalogo.find((e) => e.slug === slug) ?? null, [catalogo, slug]);
  const variantes = useMemo(
    () => (ex ? catalogo.filter((e) => e.familia === ex.familia && e.slug !== ex.slug) : []),
    [catalogo, ex],
  );

  if (!ex) {
    return (
      <Screen edges={[]}>
        <ScreenHeader title="Ejercicio" />
        <View style={s.center}><Text style={s.metaText}>{catalogo.length === 0 ? 'Cargando…' : 'Ejercicio no encontrado.'}</Text></View>
      </Screen>
    );
  }

  const bench = benchmarkInfo(ex);

  return (
    <Screen edges={[]}>
      <ScreenHeader title={ex.familia} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

        {/* Hero editorial: CLIP protagonista en loop (poster de placeholder) + degradado */}
        <Animated.View entering={FadeInDown.duration(300)} style={s.hero}>
          <ExerciseClip clipUrl={clipDe(ex)} posterUrl={posterDe(ex)} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={s.heroBody}>
            <Text style={s.heroName}>{ex.nombre}</Text>
            <Text style={s.heroMeta}>{ex.musculoPrincipal}{ex.secundarios.length > 0 ? ` · ${ex.secundarios.join(', ')}` : ''}</Text>
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: Spacing.md }}>
          {/* Ejes */}
          <View style={s.tagsWrap}>
            <Tag label={ex.patron} />
            <Tag label={ex.dinamica} />
            <Tag label={ex.lateralidad} />
            <Tag label={ex.nivel} />
            {ex.seniorApto && <Tag label="Senior apto" />}
            {ex.cargable && <Tag label="Cargable" tone="lime" />}
          </View>

          {/* Equipo */}
          <Text style={s.sectionLabel}>EQUIPO</Text>
          <Text style={s.bodyText}>{ex.equipo}</Text>

          {/* Cualidades (pills que manejan el slotting del generador) */}
          <Text style={s.sectionLabel}>CUALIDADES</Text>
          <View style={s.tagsWrap}>
            {ex.cualidades.map((q) => <Tag key={q} label={q} tone="teal" />)}
          </View>

          {/* Métodos ATP */}
          <Text style={s.sectionLabel}>MÉTODOS ATP</Text>
          <View style={s.tagsWrap}>
            {ex.metodos.map((m) => <Tag key={m} label={m} />)}
            {ex.emomApto !== 'No' && <Tag label={`EMOM: ${ex.emomApto}`} tone="lime" />}
          </View>

          {/* Benchmark Edad ATP (Track C, copy honesto por tier) */}
          {ex.benchmark.tier && (
            <View style={s.benchCard}>
              <View style={s.benchHeader}>
                <Ionicons name="pulse" size={16} color={ex.benchmark.tier === 'A' ? ATP_BRAND.lime : ATP_BRAND.teal} />
                <Text style={s.benchTitle}>BENCHMARK EDAD ATP · TIER {ex.benchmark.tier}</Text>
              </View>
              <Text style={s.benchText}>
                {bench.alimentaDirecto
                  ? 'Registrar este ejercicio en tu sesión ES el test: tu mejor set alimenta directo tu Edad ATP de fitness (norma clínica).'
                  : ex.benchmark.tier === 'A'
                    ? 'Variante de un benchmark clínico. La norma se mide con el movimiento estándar — esta versión entrena la cualidad, el estándar alimenta el score.'
                    : 'Referencia de experto (Attia/Galpin), no norma clínica: registrarlo mueve tu PROYECCIÓN de Edad ATP de forma acotada. Confírmalo con tus benchmarks medidos.'}
              </Text>
            </View>
          )}

          {/* Contraindicaciones (capa Mariana) */}
          {ex.contraindicaciones.length > 0 && (
            <View style={s.warnCard}>
              <Ionicons name="alert-circle-outline" size={16} color={SEMANTIC.error} />
              <Text style={s.warnText}>
                Cuidado con: {ex.contraindicaciones.join(' · ')}. Si aplica a ti, el generador te da la variante segura.
              </Text>
            </View>
          )}

          {/* Variantes de la familia (progresión/regresión + swap de equipo) */}
          {variantes.length > 0 && (
            <>
              <Text style={s.sectionLabel}>FAMILIA {ex.familia.toUpperCase()} · {variantes.length} VARIANTES</Text>
              {variantes.map((v) => (
                <AnimatedPressable
                  key={v.slug}
                  style={s.varRow}
                  onPress={() => { haptic.light(); router.replace({ pathname: '/exercise-detail', params: { slug: v.slug } }); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.varName} numberOfLines={1}>{v.nombre}</Text>
                    <Text style={s.varMeta} numberOfLines={1}>{v.equipo} · {v.nivel}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
                </AnimatedPressable>
              ))}
            </>
          )}

          {/* CTA */}
          <View style={{ marginTop: Spacing.xl }}>
            <GradientCTA
              label="ENTRENAR ESTE EJERCICIO"
              pillar="fitness"
              icon="barbell"
              onPress={() => {
                haptic.medium();
                router.push({ pathname: '/strength-session', params: { slugs: ex.slug, name: ex.nombre } });
              }}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 14 },

  hero: {
    height: 300, justifyContent: 'flex-end', backgroundColor: ELEVATION[1].bg,
    marginHorizontal: Spacing.md, borderRadius: Radius.card, overflow: 'hidden',
  },
  heroBody: { padding: Spacing.md },
  heroName: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 24, lineHeight: 30 },
  heroMeta: { color: 'rgba(255,255,255,0.75)', fontFamily: Fonts.regular, fontSize: 13, marginTop: 4 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md },
  sectionLabel: {
    color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2,
    marginTop: Spacing.lg, marginBottom: Spacing.xs,
  },
  bodyText: { color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 14 },

  benchCard: {
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md, marginTop: Spacing.lg,
  },
  benchHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  benchTitle: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1.5 },
  benchText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19 },

  warnCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: withOpacity('#ef4444', 0.08), borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.md,
  },
  warnText: { color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 13, flex: 1, lineHeight: 19 },

  varRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.xs,
  },
  varName: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: 14 },
  varMeta: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },
});
