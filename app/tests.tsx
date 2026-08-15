/**
 * TESTS — hub único de evaluaciones (Ola 4, Anexo C, pieza 2).
 *
 * Absorbe seis hubs que hoy muestran lo mismo desde ángulos distintos:
 * quizzes, mis-evaluaciones, edad-atp/questionnaires, edad-atp/tests,
 * cinematic-tests-index e historia-clinica.
 *
 * Todo lo que se pinta sale del registry: si mañana entra un cuestionario
 * nuevo al catálogo, aparece aquí solo. Y el estado de completado se lee de un
 * jalón con useAssessmentCompletion, no con una consulta por fila.
 *
 * Molde visual: el hero editorial de mis-evaluaciones, que ya seguía el
 * design system.
 */
import { useMemo, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, ImageBackground, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { useAssessmentCompletion } from '@/src/hooks/useAssessmentCompletion';
import { countDone, formatCompletionDate } from '@/src/services/assessments/completion';
import {
  SECTION_META,
  assessmentsBySection,
  heroAssessment,
  masterAssessment,
  currentRoute,
  type Assessment,
  type AssessmentSection,
} from '@/src/constants/assessments';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

const HERO_TESTS = require('@/assets/images/health-hub/tests-evaluaciones.webp');
const MASTER_COLOR = '#A8E02A';

// El acordeón usa LayoutAnimation, que en Android sigue detrás de una bandera.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TestsHub() {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();
  // FIX-215: loading y failed se descartaban. Con el mapa vacío countDone da 0,
  // así que "todavía no llega", "tronó la consulta" y "no has hecho nada"
  // colapsaban en el mismo pixel: un 0/7 que el usuario leía como dato.
  const { completion, loading, failed, refresh } = useAssessmentCompletion(user?.id);

  // Funcional abierta de entrada: es donde casi todos empiezan.
  const [open, setOpen] = useState<Record<string, boolean>>({ funcional: true });

  const toggle = useCallback((id: string) => {
    haptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const go = useCallback((a: Assessment) => {
    haptic.medium();
    router.push(currentRoute(a) as Href);
  }, [router]);

  const hero = heroAssessment();
  const master = masterAssessment();
  const heroDone = hero ? completion[hero.id]?.done : false;
  // Mientras no haya lectura buena, el contador no se pinta: un hueco es honesto,
  // un cero es una afirmación.
  const contadorListo = !loading && !failed;

  return (
    <Screen themed>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="tests" title="Tests" />

        {/* Hero editorial: Braverman conserva pantalla propia y encabeza el hub. */}
        {hero && (
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <AnimatedPressable onPress={() => go(hero)}>
              <ImageBackground source={HERO_TESTS} style={s.hero} imageStyle={s.heroImg}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.5)', 'rgba(10,10,10,0.95)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.heroContent}>
                  <EliteText style={s.heroKicker}>EVALUACIONES</EliteText>
                  <EliteText style={s.heroTitle}>{hero.title}</EliteText>
                  <EliteText variant="caption" style={s.heroSub}>
                    {heroDone
                      ? `Completado ${formatCompletionDate(completion[hero.id]?.date) ?? ''}`.trim()
                      : hero.subtitle}
                  </EliteText>
                </View>
                {heroDone && (
                  <View style={s.heroCheck}>
                    <Ionicons name="checkmark-circle" size={22} color={MASTER_COLOR} />
                  </View>
                )}
              </ImageBackground>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* El Cuestionario Maestro: mapa y brújula, por eso va destacado. */}
        {master && (
          <Animated.View entering={FadeInUp.delay(70).springify()}>
            <AnimatedPressable onPress={() => go(master)} style={s.masterCard}>
              <View style={s.row}>
                <View style={[s.iconWrap, { backgroundColor: withOpacity(MASTER_COLOR, 0.15) }]}>
                  <Ionicons name="sparkles" size={22} color={MASTER_COLOR} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText style={s.masterTitle}>{master.title}</EliteText>
                  <EliteText variant="caption" style={s.blurb}>{master.subtitle}</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={MASTER_COLOR} />
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* FIX-215: si la lectura falló, se dice y se ofrece salida. Antes el
            hub se pintaba idéntico a un usuario sin nada hecho. */}
        {failed && (
          <AnimatedPressable onPress={refresh} style={s.avisoCard}>
            <Ionicons name="cloud-offline-outline" size={18} color={t.error} />
            <View style={{ flex: 1 }}>
              <EliteText style={[s.avisoTitulo, { color: t.error }]}>
                No pudimos leer tu avance
              </EliteText>
              <EliteText variant="caption" style={s.blurb}>
                Revisa tu conexión y toca aquí para volver a intentarlo.
              </EliteText>
            </View>
          </AnimatedPressable>
        )}

        {SECTION_META.map((meta, idx) => (
          <SectionBlock
            key={meta.id}
            s={s}
            t={t}
            meta={meta}
            delay={90 + idx * 40}
            expanded={!!open[meta.id]}
            onToggle={() => toggle(meta.id)}
            completion={completion}
            contadorListo={contadorListo}
            onPick={go}
          />
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SectionBlock({
  s, t, meta, delay, expanded, onToggle, completion, contadorListo, onPick,
}: {
  s: ReturnType<typeof makeStyles>;
  t: AppThemeTokens;
  meta: { id: AssessmentSection; title: string; blurb: string };
  delay: number;
  expanded: boolean;
  onToggle: () => void;
  completion: Record<string, { done: boolean; date?: string }>;
  /** FIX-215: falso mientras la lectura no haya terminado bien. */
  contadorListo: boolean;
  onPick: (a: Assessment) => void;
}) {
  const rows = useMemo(() => assessmentsBySection(meta.id), [meta.id]);
  const done = countDone(completion, rows);

  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={s.section}>
      <AnimatedPressable onPress={onToggle} style={s.sectionHeader}>
        <View style={{ flex: 1 }}>
          <EliteText style={s.sectionTitle}>{meta.title}</EliteText>
          <EliteText variant="caption" style={s.blurb}>{meta.blurb}</EliteText>
        </View>
        <EliteText style={s.counter}>{contadorListo ? `${done}/${rows.length}` : ' '}</EliteText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={t.textoSecundario} />
      </AnimatedPressable>

      {expanded && rows.map((a) => {
        const state = completion[a.id];
        const fecha = formatCompletionDate(state?.date);
        return (
          <AnimatedPressable key={a.id} onPress={() => onPick(a)} style={s.itemRow}>
            <View style={[s.itemIcon, { backgroundColor: withOpacity(a.color ?? '#5B9BD5', 0.15) }]}>
              <Ionicons name={(a.icon ?? 'ellipse-outline') as any} size={18} color={a.color ?? '#5B9BD5'} />
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={s.itemTitle}>{a.title}</EliteText>
              {state?.done
                ? <EliteText variant="caption" style={s.itemDone}>{fecha ? `Completado ${fecha}` : 'Completado'}</EliteText>
                : a.subtitle
                  ? <EliteText variant="caption" style={s.blurb} numberOfLines={2}>{a.subtitle}</EliteText>
                  : null}
            </View>
            {state?.done
              ? <Ionicons name="checkmark-circle" size={20} color={MASTER_COLOR} />
              : <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />}
          </AnimatedPressable>
        );
      })}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  hero: { height: 140, justifyContent: 'flex-end', borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  heroImg: { resizeMode: 'cover' },
  heroContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  heroKicker: { color: '#1D9E75', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 3, marginBottom: 2 },
  heroTitle: { color: '#fff', fontSize: FontSizes.lg, fontFamily: Fonts.extraBold, marginBottom: 2 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm, fontFamily: Fonts.regular },
  heroCheck: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },

  masterCard: {
    backgroundColor: withOpacity(MASTER_COLOR, 0.06), borderWidth: 1, borderColor: withOpacity(MASTER_COLOR, 0.35),
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  masterTitle: { fontSize: FontSizes.md, fontFamily: Fonts.extraBold, color: t.kind === 'dark' ? MASTER_COLOR : t.tealTexto, marginBottom: 2 },

  avisoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: withOpacity(t.error, 0.08), borderWidth: 1, borderColor: withOpacity(t.error, 0.3),
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.md,
  },
  avisoTitulo: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, marginBottom: 2 },

  section: { marginBottom: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: t.card, borderWidth: 1, borderColor: t.borde,
    borderRadius: Radius.card, padding: Spacing.md,
  },
  sectionTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: t.texto },
  counter: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: t.textoSecundario },

  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs, marginLeft: Spacing.md,
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
  },
  itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: t.texto },
  itemDone: { color: t.kind === 'dark' ? MASTER_COLOR : t.tealTexto, fontSize: FontSizes.xs },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  blurb: { color: t.textoSecundario, fontSize: FontSizes.xs, lineHeight: 16 },
});
