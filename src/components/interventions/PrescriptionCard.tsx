/**
 * PrescriptionCard (Motor Fase B.1) — card de una intervención PRESCRITA por el
 * motor de personalización. Muestra el "por qué a TI": rank + score + badge BASE,
 * rationale summary (visible), reasons desglosados (expandible, badge por fuente),
 * impacto epigenético, nota de fase del ciclo (si aplica) y biomarcadores por
 * Tier 1/2/3 (doctrina: no cargar labs caros por default). CTA "Activar".
 *
 * Tokens del design system (ELEVATION/TEXT/ATP_BRAND) + spring + haptics.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import type { PrescribedIntervention, RationaleSource } from '@/src/services/interventions/personalize-types';

interface Props {
  prescription: PrescribedIntervention;
  index: number;
  /** true si el user ya la tiene activa (CTA pasa a "Activa ✓"). */
  isActive?: boolean;
  busy?: boolean;
  onActivate: (key: string) => void;
  onOpenDetail?: (key: string) => void;
}

/** Color del score: verde alto, ámbar medio, gris bajo. */
function scoreColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return ATP_BRAND.lime;
  if (score >= 40) return '#fbbf24';
  return TEXT.tertiary;
}

const SOURCE_LABEL: Record<RationaleSource, string> = {
  dx_level: 'DX', braverman: 'Braverman', lab: 'Lab', quiz: 'Objetivo',
  chronotype: 'Cronotipo', cycle: 'Ciclo', profile: 'Perfil', universal: 'Base',
};

export function PrescriptionCard({ prescription, index, isActive, busy, onActivate, onOpenDetail }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const p = prescription;
  const color = scoreColor(p.score);
  const bio = p.suggestedBiomarkers;
  const tierList = tier === 1 ? bio.tier1 : tier === 2 ? bio.tier2 : bio.tier3;
  const hasBiomarkers = bio.tier1.length + bio.tier2.length + bio.tier3.length > 0;

  return (
    <Animated.View entering={FadeInUp.delay(40 + Math.min(index, 5) * 50).springify()} style={s.card}>
      {/* Header: rank + nombre + BASE + score */}
      <AnimatedPressable onPress={() => { haptic.light(); onOpenDetail?.(p.intervention.key); }} style={s.header}>
        <View style={[s.rankBubble, { borderColor: withOpacity(color, 0.5) }]}>
          <EliteText style={[s.rankText, { color }]}>{p.rank}</EliteText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <EliteText style={s.name} numberOfLines={2}>{p.intervention.name}</EliteText>
            {p.isUniversalP1 && (
              <View style={s.baseBadge}><EliteText style={s.baseBadgeText}>BASE</EliteText></View>
            )}
          </View>
          {/* Barra de score 0-100 */}
          <View style={s.scoreTrack}>
            <View style={[s.scoreFill, { width: `${p.score}%`, backgroundColor: color }]} />
          </View>
        </View>
        <EliteText style={[s.scoreNum, { color }]}>{p.score}</EliteText>
      </AnimatedPressable>

      {/* Rationale summary */}
      <EliteText style={s.summary}>{p.rationale.summary}</EliteText>

      {/* Nota de ciclo (solo si aplica) */}
      {p.cyclePhaseNote && (
        <View style={s.cycleNote}>
          <Ionicons name="moon-outline" size={13} color="#D4537E" />
          <EliteText style={s.cycleNoteText}>{p.cyclePhaseNote}</EliteText>
        </View>
      )}

      {/* Impacto epigenético (1 línea) */}
      {p.rationale.epigeneticImpact ? (
        <EliteText style={s.epi} numberOfLines={expanded ? undefined : 2}>
          🧬 {p.rationale.epigeneticImpact}
        </EliteText>
      ) : null}

      {/* Reasons expandible */}
      {p.rationale.reasons.length > 0 && (
        <AnimatedPressable onPress={() => { haptic.light(); setExpanded((v) => !v); }} style={s.expandBtn}>
          <EliteText style={s.expandText}>
            {expanded ? 'Ocultar razones' : `Ver ${p.rationale.reasons.length} razón${p.rationale.reasons.length > 1 ? 'es' : ''} para ti`}
          </EliteText>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={ATP_BRAND.lime} />
        </AnimatedPressable>
      )}

      {expanded && (
        <View style={s.reasonsBox}>
          {p.rationale.reasons.map((r, i) => (
            <View key={i} style={s.reasonRow}>
              <View style={[s.sourceBadge, { backgroundColor: withOpacity(color, 0.12) }]}>
                <EliteText style={[s.sourceBadgeText, { color }]}>{SOURCE_LABEL[r.source]}</EliteText>
              </View>
              <EliteText style={s.reasonText}>{r.detail}</EliteText>
            </View>
          ))}

          {/* Biomarcadores por tier (tabs) */}
          {hasBiomarkers && (
            <View style={s.bioBox}>
              <EliteText style={s.bioLabel}>BIOMARCADORES SUGERIDOS</EliteText>
              <View style={s.tierTabs}>
                {([1, 2, 3] as const).map((t) => {
                  const count = t === 1 ? bio.tier1.length : t === 2 ? bio.tier2.length : bio.tier3.length;
                  const active = tier === t;
                  return (
                    <AnimatedPressable
                      key={t}
                      onPress={() => { haptic.light(); setTier(t); }}
                      style={[s.tierTab, active && s.tierTabActive]}
                    >
                      <EliteText style={[s.tierTabText, active && s.tierTabTextActive]}>
                        Tier {t} · {count}
                      </EliteText>
                    </AnimatedPressable>
                  );
                })}
              </View>
              <EliteText style={s.tierHint}>
                {tier === 1 ? 'Accesibles — panel básico común.'
                  : tier === 2 ? 'Pídelos si hay señal específica.'
                    : 'Solo para diferencial crítico (costosos).'}
              </EliteText>
              <EliteText style={s.bioList}>
                {tierList.length > 0 ? tierList.join(' · ') : 'Ninguno en este tier.'}
              </EliteText>
            </View>
          )}
        </View>
      )}

      {/* CTA */}
      <AnimatedPressable
        onPress={() => { if (!isActive && !busy) { haptic.medium(); onActivate(p.intervention.key); } }}
        disabled={isActive || busy}
        style={[s.cta, isActive && s.ctaActive]}
      >
        <Ionicons
          name={isActive ? 'checkmark-circle' : 'add-circle-outline'}
          size={16}
          color={isActive ? ATP_BRAND.lime : '#000'}
        />
        <EliteText style={[s.ctaText, isActive && s.ctaTextActive]}>
          {isActive ? 'Activa en tu protocolo' : 'Activar'}
        </EliteText>
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rankBubble: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontFamily: Fonts.extraBold, fontSize: FontSizes.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary, flexShrink: 1 },
  baseBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.xs,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  baseBadgeText: { fontFamily: Fonts.bold, fontSize: 9, color: ATP_BRAND.lime, letterSpacing: 1 },
  scoreTrack: {
    height: 4, borderRadius: 2, backgroundColor: ELEVATION[2].bg, marginTop: 6, overflow: 'hidden',
  },
  scoreFill: { height: 4, borderRadius: 2 },
  scoreNum: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md, minWidth: 30, textAlign: 'right' },
  summary: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, lineHeight: 19 },
  cycleNote: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: withOpacity('#D4537E', 0.08), borderRadius: Radius.sm,
    padding: Spacing.sm, borderWidth: 0.5, borderColor: withOpacity('#D4537E', 0.25),
  },
  cycleNoteText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: '#F0A6C0', lineHeight: 16 },
  epi: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, lineHeight: 16 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  expandText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  reasonsBox: {
    gap: 6, backgroundColor: ELEVATION[2].bg, borderRadius: Radius.sm,
    padding: Spacing.sm, borderWidth: 0.5, borderColor: ELEVATION[2].border,
  },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sourceBadge: { borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 2, minWidth: 62, alignItems: 'center' },
  sourceBadgeText: { fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 0.5 },
  reasonText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.secondary },
  bioBox: { marginTop: 6, gap: 6 },
  bioLabel: { fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 1.5, color: TEXT.tertiary },
  tierTabs: { flexDirection: 'row', gap: 6 },
  tierTab: {
    flex: 1, borderRadius: Radius.xs, paddingVertical: 6, alignItems: 'center',
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
  },
  tierTabActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: withOpacity(ATP_BRAND.lime, 0.4) },
  tierTabText: { fontFamily: Fonts.semiBold, fontSize: 10, color: TEXT.tertiary },
  tierTabTextActive: { color: ATP_BRAND.lime },
  tierHint: { fontFamily: Fonts.regular, fontSize: 10, color: TEXT.muted, fontStyle: 'italic' },
  bioList: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.secondary, lineHeight: 16 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.sm, paddingVertical: 10, marginTop: 2,
  },
  ctaActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.1), borderWidth: 0.5, borderColor: withOpacity(ATP_BRAND.lime, 0.4) },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: '#000', letterSpacing: 0.5 },
  ctaTextActive: { color: ATP_BRAND.lime },
});

export default PrescriptionCard;
