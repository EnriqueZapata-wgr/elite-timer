/**
 * OLA 4 · Resultado del quiz de base de datos (Anexo C, pieza 3b).
 *
 * Movido de app/quiz-take.tsx: barras por dominio y protocolos recomendados.
 * Se conserva la regla que importa: NADA viene preseleccionado, porque activar
 * un protocolo es decisión explícita de la persona (B-5 MB-12). Guardar la
 * respuesta y activar lo aceptado ocurre al tocar el botón, no antes.
 */
import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import type { QuizRecommendation } from '@/src/services/quiz-engine-service';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, SEMANTIC, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  domainScores: Record<string, number>;
  recommendations: QuizRecommendation[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onAccept: () => void;
  onExplore: () => void;
  saving: boolean;
}

export function LifestyleResult({
  domainScores, recommendations, selected, onToggle, onAccept, onExplore, saving,
}: Props) {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);

  // Mismos cortes que la pantalla vieja: bajo es alerta, medio es aviso.
  const barColor = (score: number) => (score < 40 ? t.error : score < 70 ? SEMANTIC.warning : ATP_BRAND.lime);

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={s.title}>Tus resultados</EliteText>

          <View style={s.scores}>
            {Object.entries(domainScores).map(([domain, score], idx) => (
              <StaggerItem key={domain} index={idx}>
                <View style={{ gap: Spacing.xs }}>
                  <EliteText variant="caption" style={s.domain}>
                    {domain.charAt(0).toUpperCase() + domain.slice(1)}
                  </EliteText>
                  <View style={s.barRow}>
                    <View style={s.track}>
                      <View style={[s.fill, { width: `${Math.min(score, 100)}%`, backgroundColor: barColor(score) }]} />
                    </View>
                    <EliteText variant="caption" style={[s.value, { color: barColor(score) }]}>{score}/100</EliteText>
                  </View>
                </View>
              </StaggerItem>
            ))}
          </View>

          {recommendations.length > 0 && (
            <View style={{ marginTop: Spacing.md }}>
              <EliteText style={s.recsTitle}>Protocolos recomendados</EliteText>
              {recommendations.map((rec, idx) => {
                const active = selected.has(rec.protocol_key);
                return (
                  <StaggerItem key={rec.protocol_key} index={idx} delay={60}>
                    <View style={s.recCard}>
                      <EliteText variant="body" style={s.recName}>
                        {rec.template_name ?? rec.protocol_key.replace(/_/g, ' ')}
                      </EliteText>
                      <Pressable
                        onPress={() => { haptic.light(); onToggle(rec.protocol_key); }}
                        style={[s.toggle, active && s.toggleActive]}
                      >
                        <EliteText variant="caption" style={{ color: active ? t.textoSobreLima : t.textoSecundario }}>
                          {active ? 'Activado' : 'Activar'}
                        </EliteText>
                      </Pressable>
                    </View>
                  </StaggerItem>
                );
              })}
            </View>
          )}

          <MedicalDisclaimer feature="quiz" />
          <View style={{ height: Spacing.xl }} />
        </Animated.View>
      </ScrollView>

      <View style={s.bottom}>
        <AnimatedPressable onPress={onAccept} disabled={saving} style={[s.primary, saving && { opacity: 0.5 }]}>
          <EliteText style={s.primaryText}>
            {saving ? 'Guardando…' : selected.size > 0 ? 'Aceptar propuestas' : 'Guardar resultados'}
          </EliteText>
        </AnimatedPressable>
        <Pressable onPress={onExplore} style={s.link}>
          <EliteText variant="caption" style={s.linkText}>Explorar más protocolos</EliteText>
        </Pressable>
      </View>
    </>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  title: { fontFamily: Fonts.extraBold, fontSize: 28, color: t.texto, marginBottom: Spacing.md },
  scores: { gap: Spacing.md, marginBottom: Spacing.lg },
  domain: { color: t.texto, fontFamily: Fonts.semiBold, textTransform: 'capitalize', fontSize: FontSizes.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  track: { flex: 1, height: 8, backgroundColor: t.flotante, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  value: { minWidth: 52, textAlign: 'right', fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  recsTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: t.texto, marginBottom: Spacing.md },
  recCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.card, borderWidth: 1, borderColor: t.borde,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  recName: { flex: 1, color: t.texto, fontSize: FontSizes.sm },
  toggle: { paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1, borderColor: t.borde },
  toggleActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  bottom: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm, borderTopWidth: 0.5, borderTopColor: t.borde },
  primary: { backgroundColor: ATP_BRAND.lime, borderRadius: Radius.card, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryText: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: t.textoSobreLima },
  link: { alignItems: 'center', paddingVertical: Spacing.xs },
  linkText: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontSize: FontSizes.sm },
});
