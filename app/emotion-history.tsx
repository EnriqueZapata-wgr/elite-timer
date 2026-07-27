/**
 * Historial emocional + correlaciones cruzadas (MB-4 · Bloque 3 — el foso).
 *
 * - Mosaico de TODO lo que has sentido (forma+color del lenguaje del mapa,
 *   tamaño = frecuencia).
 * - Filtros semana / mes / todo y detalle de cada check-in.
 * - Correlaciones ánimo × sueño · entrenamiento · ciclo · ayuno · sol —
 *   con honestidad estadística (umbral mínimo, lenguaje de observación,
 *   y "aún no hay suficientes datos" cuando no los hay).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { EMOTIONS, QUADRANTS } from '@/src/data/emotions-library';
import {
  buildMosaic, buildDayMoods, computeCorrelation, computePhaseBreakdown,
  filterByRange, RANGE_DAYS, type HistoryRange, type CorrelationResult,
} from '@/src/services/emotion-history-core';
import {
  buildWeekdayPattern, buildDayPartPattern, buildQuadrantDistribution,
  buildTriggers, buildConsistency, computeNavigationEfficacy,
  type PatternReport, type NavEvent,
} from '@/src/services/emotion-stats-core';
import { loadNavigationLogs } from '@/src/services/emotion-stats-service';
import { loadHistoryData, type HistoryData, type HistoryCheckinRecord } from '@/src/services/emotion-history-service';
import { colorAtPoint, emotionGradient, normX, normY, isLightColor } from '@/src/services/emotion-map-core';
import { PHASES } from '@/src/services/cycle-service';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, SEMANTIC, ATP_BRAND, withOpacity } from '@/src/constants/brand';

const EMOTION_BY_ID = new Map(EMOTIONS.map(e => [e.id, e]));

const RANGE_LABELS: { key: HistoryRange; label: string }[] = [
  { key: 'week', label: 'SEMANA' },
  { key: 'month', label: 'MES' },
  { key: 'all', label: 'TODO' },
];

const CORRELATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  sleep: 'moon-outline',
  training: 'barbell-outline',
  fasting: 'timer-outline',
  sun: 'sunny-outline',
};

// MB-9 · Track C — copy de los reportes profundos.
const MOVE_LABELS: Record<string, string> = {
  bajar: 'bajas la energía',
  reencuadrar: 'reencuadras la activación',
  cruzar: 'cruzas al otro lado',
  subir: 'subes desde la calma',
};
// Preposición por dimensión de disparador (dónde / con quién / qué hacías).
const TRIGGER_WORD: Record<string, string> = { where: 'en', who: 'con', doing: 'mientras' };

/** Frase de un patrón temporal (o el vacío que informa). */
function patternLine(report: PatternReport): string {
  if (report.status === 'insufficient') {
    return report.needMore > 0
      ? `Necesitas ${report.needMore} check-in${report.needMore === 1 ? '' : 's'} más para empezar a ver este patrón.`
      : 'Aún no hay señal repartida en suficientes momentos. Sigue registrando.';
  }
  const low = report.lowest!;
  const high = report.highest!;
  return `Tu ánimo tiende a caer ${low.label.toLowerCase()} (${low.avg}/10) y a subir ${high.label.toLowerCase()} (${high.avg}/10). Es una asociación en tus datos, no una causa.`;
}

export default function EmotionHistoryScreen() {
  const router = useRouter();
  const [data, setData] = useState<HistoryData | null>(null);
  const [navLogs, setNavLogs] = useState<NavEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<HistoryRange>('month');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistoryData()
      .then(setData)
      .catch(() => setData({ checkins: [], correlationDefs: [], phaseByDate: null }))
      .finally(() => setLoading(false));
    // C.1: los movimientos de navegación tomados alimentan la efectividad.
    loadNavigationLogs().then(setNavLogs).catch(() => {});
  }, []);

  const rangeCheckins = useMemo(
    () => (data ? filterByRange(data.checkins, range) : []),
    [data, range],
  );
  const mosaic = useMemo(() => buildMosaic(rangeCheckins), [rangeCheckins]);
  const dayMoods = useMemo(() => buildDayMoods(rangeCheckins), [rangeCheckins]);
  const correlations: CorrelationResult[] = useMemo(
    () => (data ? data.correlationDefs.map(def => computeCorrelation(dayMoods, def)) : []),
    [data, dayMoods],
  );
  const phaseBreakdown = useMemo(
    () => (data?.phaseByDate ? computePhaseBreakdown(dayMoods, data.phaseByDate) : null),
    [data, dayMoods],
  );

  // ── MB-9 · Track C: reportes profundos (día/hora, distribución+tendencia,
  //    disparadores, consistencia, efectividad de navegación) ──
  const prevCheckins = useMemo(() => {
    if (!data) return [];
    const days = RANGE_DAYS[range];
    const now = Date.now();
    const start = now - 2 * days * 86400000;
    const end = now - days * 86400000;
    return data.checkins.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return Number.isFinite(t) && t >= start && t < end;
    });
  }, [data, range]);

  const weekdayPattern = useMemo(() => buildWeekdayPattern(rangeCheckins), [rangeCheckins]);
  const dayPartPattern = useMemo(() => buildDayPartPattern(rangeCheckins), [rangeCheckins]);
  const distribution = useMemo(() => buildQuadrantDistribution(rangeCheckins, prevCheckins), [rangeCheckins, prevCheckins]);
  const triggers = useMemo(() => buildTriggers(rangeCheckins), [rangeCheckins]);
  const consistency = useMemo(() => buildConsistency(rangeCheckins, RANGE_DAYS[range]), [rangeCheckins, range]);
  const efficacy = useMemo(() => computeNavigationEfficacy(navLogs, rangeCheckins), [navLogs, rangeCheckins]);

  const maxCount = mosaic[0]?.count ?? 1;

  return (
    <Screen>
      <PillarHeader pillar="mind" title="Tu historial" onBack={() => router.back()} />

      {/* Filtros de rango */}
      <View style={styles.pillsRow}>
        {RANGE_LABELS.map(r => {
          const active = range === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => { haptic.light(); setRange(r.key); setExpandedId(null); }}
              style={[styles.pill, active && styles.pillActive]}
            >
              <EliteText variant="caption" style={[styles.pillText, active && styles.pillTextActive]}>
                {r.label}
              </EliteText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {/* MB-4 Bloque 5: acceso al perfil emocional del periodo */}
        <Pressable
          onPress={() => { haptic.light(); router.push('/emotion-profile'); }}
          style={styles.profileLink}
        >
          <Ionicons name="planet-outline" size={16} color={SEMANTIC.info} />
          <View style={{ flex: 1 }}>
            <EliteText variant="body" style={styles.profileLinkTitle}>Tu clima emocional</EliteText>
            <EliteText variant="caption" style={styles.profileLinkSub}>
              El perfil de tus últimos 30 días — foto del periodo, no etiqueta
            </EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEXT_COLORS.secondary} />
        </Pressable>

        {!loading && rangeCheckins.length === 0 && (
          <EmptyState
            icon="pulse-outline"
            title="Sin registros en este rango"
            subtitle="Cada check-in que hagas va pintando este mosaico."
          />
        )}

        {/* ═══ MOSAICO ═══ */}
        {mosaic.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <EliteText variant="caption" style={styles.sectionTitle}>TODO LO QUE HAS SENTIDO</EliteText>
            <View style={styles.mosaicWrap}>
              {mosaic.map((m, i) => {
                const emotion = EMOTION_BY_ID.get(m.emotionId);
                if (!emotion) return null;
                const nx = normX(emotion.quadrant, emotion.intensity);
                const ny = normY(emotion.energy);
                const [gTop, gBottom] = emotionGradient(nx, ny);
                const base = colorAtPoint(nx, ny);
                // Tamaño = frecuencia (44 → 76 px)
                const size = 44 + Math.round((m.count / maxCount) * 32);
                return (
                  <Animated.View
                    key={m.emotionId}
                    entering={FadeInDown.delay(Math.min(i, 12) * 40).springify()}
                    style={styles.mosaicItem}
                  >
                    <LinearGradient colors={[gTop, gBottom]} style={[styles.mosaicCircle, { width: size, height: size, borderRadius: size / 2 }]}>
                      <EliteText style={[styles.mosaicCount, { color: isLightColor(base) ? TEXT_COLORS.onAccent : TEXT_COLORS.primary }]}>
                        {m.count}
                      </EliteText>
                    </LinearGradient>
                    <EliteText variant="caption" style={styles.mosaicLabel} numberOfLines={2}>
                      {emotion.label}
                    </EliteText>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ═══ CORRELACIONES — el foso ═══ */}
        {rangeCheckins.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={styles.sectionTitle}>TU ÁNIMO × TU VIDA</EliteText>
            <EliteText variant="caption" style={styles.sectionSub}>
              Observaciones de tus propios datos. No son diagnósticos ni causas.
            </EliteText>
            {correlations.map((c, i) => (
              <Animated.View key={c.key} entering={FadeInDown.delay(i * 50).duration(300)}>
                <View style={[styles.corrCard, c.status === 'signal' && styles.corrCardSignal]}>
                  <View style={styles.corrHeader}>
                    <Ionicons
                      name={CORRELATION_ICONS[c.key] ?? 'analytics-outline'}
                      size={16}
                      color={c.status === 'signal' ? SEMANTIC.info : TEXT_COLORS.secondary}
                    />
                    <EliteText variant="caption" style={styles.corrLabel}>{c.label.toUpperCase()}</EliteText>
                    {c.status === 'signal' && (
                      <View style={styles.corrBadge}>
                        <EliteText variant="caption" style={styles.corrBadgeText}>PATRÓN</EliteText>
                      </View>
                    )}
                  </View>
                  <EliteText variant="body" style={styles.corrText}>{c.observation}</EliteText>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {/* ═══ CUÁNDO SE TE CAE EL ÁNIMO (día / hora) ═══ */}
        {rangeCheckins.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={styles.sectionTitle}>CUÁNDO CAMBIA TU ÁNIMO</EliteText>
            <View style={styles.corrCard}>
              <View style={styles.corrHeader}>
                <Ionicons name="calendar-outline" size={16} color={TEXT_COLORS.secondary} />
                <EliteText variant="caption" style={styles.corrLabel}>POR DÍA DE LA SEMANA</EliteText>
              </View>
              <EliteText variant="body" style={styles.corrText}>{patternLine(weekdayPattern)}</EliteText>
            </View>
            <View style={styles.corrCard}>
              <View style={styles.corrHeader}>
                <Ionicons name="time-outline" size={16} color={TEXT_COLORS.secondary} />
                <EliteText variant="caption" style={styles.corrLabel}>POR FRANJA DEL DÍA</EliteText>
              </View>
              <EliteText variant="body" style={styles.corrText}>{patternLine(dayPartPattern)}</EliteText>
            </View>
          </View>
        )}

        {/* ═══ DISTRIBUCIÓN POR CUADRANTE + TENDENCIA ═══ */}
        {distribution.status === 'ok' && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={styles.sectionTitle}>DÓNDE VIVISTE ESTE PERIODO</EliteText>
            <View style={styles.corrCard}>
              {distribution.shares.map((s) => {
                const info = QUADRANTS[s.quadrant];
                const up = (s.deltaPct ?? 0) > 0;
                return (
                  <View key={s.quadrant} style={styles.distRow}>
                    <View style={[styles.distDot, { backgroundColor: info.color }]} />
                    <EliteText variant="body" style={styles.distLabel} numberOfLines={1}>{info.label}</EliteText>
                    <EliteText variant="body" style={styles.distPct}>{s.pct}%</EliteText>
                    {s.deltaPct != null && Math.abs(s.deltaPct) >= 1 && (
                      <View style={styles.distTrend}>
                        <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={12} color={up ? SEMANTIC.acceptable : TEXT_COLORS.secondary} />
                        <EliteText variant="caption" style={styles.distTrendText}>{Math.abs(s.deltaPct)}</EliteText>
                      </View>
                    )}
                  </View>
                );
              })}
              {distribution.shares.every((s) => s.deltaPct == null) && (
                <EliteText variant="caption" style={styles.distNote}>
                  La flecha de tendencia aparece cuando el periodo anterior también tiene registros.
                </EliteText>
              )}
            </View>
          </View>
        )}

        {/* ═══ DISPARADORES FRECUENTES (asociación, no causa) ═══ */}
        {triggers.status === 'ok' && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={styles.sectionTitle}>QUÉ ACOMPAÑA TUS BAJONES</EliteText>
            <EliteText variant="caption" style={styles.sectionSub}>
              Lo que más estaba presente en tus estados desagradables. Presencia, no causa.
            </EliteText>
            <View style={styles.corrCard}>
              {triggers.triggers.map((t) => (
                <View key={`${t.dimension}-${t.value}`} style={styles.distRow}>
                  <Ionicons name="pricetag-outline" size={14} color={TEXT_COLORS.secondary} />
                  <EliteText variant="body" style={styles.distLabel} numberOfLines={1}>
                    {TRIGGER_WORD[t.dimension]} {t.value}
                  </EliteText>
                  <EliteText variant="caption" style={styles.distPct}>{t.count}×</EliteText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══ TU NAVEGACIÓN FUNCIONA (C.1 · el diferenciador) ═══ */}
        {efficacy.moves.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={styles.sectionTitle}>MOVERTE FUNCIONA</EliteText>
            <EliteText variant="caption" style={styles.sectionSub}>
              De tus movimientos y tu siguiente check-in. Asociación, no promesa.
            </EliteText>
            {efficacy.moves.map((m) => (
              <View key={m.move} style={[styles.corrCard, styles.corrCardSignal]}>
                <View style={styles.corrHeader}>
                  <Ionicons name="navigate-outline" size={16} color={SEMANTIC.info} />
                  <EliteText variant="caption" style={styles.corrLabel}>{(MOVE_LABELS[m.move] ?? m.move).toUpperCase()}</EliteText>
                </View>
                <EliteText variant="body" style={styles.corrText}>
                  Cuando {MOVE_LABELS[m.move] ?? m.move}, tu siguiente check-in mejora {Math.round((m.rate ?? 0) * 10)} de cada 10 veces ({m.sampled} registros).
                </EliteText>
              </View>
            ))}
          </View>
        )}

        {/* ═══ CONSISTENCIA (racha de escucha) ═══ */}
        {rangeCheckins.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={styles.sectionTitle}>TU CONSTANCIA</EliteText>
            <View style={styles.corrCard}>
              <View style={styles.consRow}>
                <View style={styles.consStat}>
                  <EliteText style={styles.consNum}>{consistency.currentStreak}</EliteText>
                  <EliteText variant="caption" style={styles.consLbl}>racha actual</EliteText>
                </View>
                <View style={styles.consStat}>
                  <EliteText style={styles.consNum}>{consistency.longestStreak}</EliteText>
                  <EliteText variant="caption" style={styles.consLbl}>racha más larga</EliteText>
                </View>
                <View style={styles.consStat}>
                  <EliteText style={styles.consNum}>{Math.round(consistency.consistencyPct)}%</EliteText>
                  <EliteText variant="caption" style={styles.consLbl}>días con check-in</EliteText>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ═══ CONSCIENCIA DE CICLO ═══ */}
        {phaseBreakdown && rangeCheckins.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={styles.sectionTitle}>TU ÁNIMO × TU CICLO</EliteText>
            {phaseBreakdown.status === 'ok' ? (
              <View style={styles.corrCard}>
                {phaseBreakdown.entries.map(e => {
                  const info = PHASES[e.phase];
                  return (
                    <View key={e.phase} style={styles.phaseRow}>
                      <Ionicons name={(info?.icon as any) ?? 'ellipse-outline'} size={15} color={info?.color ?? TEXT_COLORS.secondary} />
                      <EliteText variant="body" style={[styles.phaseName, { color: info?.color ?? Colors.textPrimary }]}>
                        {info?.label ?? e.phase}
                      </EliteText>
                      <EliteText variant="caption" style={styles.phaseDays}>{e.days} días</EliteText>
                      <EliteText variant="body" style={styles.phaseAvg}>{e.avg}/10</EliteText>
                    </View>
                  );
                })}
                {/* Doctrina bidireccional */}
                <EliteText variant="caption" style={styles.phaseDoctrine}>
                  La fase explica, no excusa. Conocer el patrón es para usarlo a tu favor.
                </EliteText>
              </View>
            ) : (
              <View style={styles.corrCard}>
                <EliteText variant="body" style={styles.corrText}>
                  Aún no hay suficientes check-ins repartidos entre fases para ver un patrón honesto. Sigue registrando.
                </EliteText>
              </View>
            )}
          </View>
        )}

        {/* ═══ REGISTROS (detalle de cada check-in) ═══ */}
        {rangeCheckins.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={styles.sectionTitle}>REGISTROS</EliteText>
            {rangeCheckins.map(ci => (
              <CheckinRow
                key={ci.id}
                checkin={ci}
                expanded={expandedId === ci.id}
                onToggle={() => { haptic.light(); setExpandedId(expandedId === ci.id ? null : ci.id); }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function CheckinRow({ checkin, expanded, onToggle }: {
  checkin: HistoryCheckinRecord; expanded: boolean; onToggle: () => void;
}) {
  const qInfo = QUADRANTS[checkin.quadrant];
  const labels = checkin.emotions
    .map(id => EMOTION_BY_ID.get(id)?.label)
    .filter(Boolean)
    .join(' · ');
  const context = [checkin.context_where, checkin.context_who, checkin.context_doing]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable onPress={onToggle} style={[styles.rowCard, { borderLeftColor: qInfo.color }]}>
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <EliteText variant="caption" style={[styles.rowEmotions, { color: qInfo.color }]}>
            {labels || qInfo.label}
          </EliteText>
          <EliteText variant="caption" style={styles.rowDate}>
            {new Date(checkin.created_at).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </EliteText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={TEXT_COLORS.secondary} />
      </View>
      {expanded && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.rowDetail}>
          {context.length > 0 && (
            <EliteText variant="caption" style={styles.rowContext}>{context}</EliteText>
          )}
          {checkin.note && (
            <EliteText variant="body" style={styles.rowNote}>“{checkin.note}”</EliteText>
          )}
          {!context && !checkin.note && (
            <EliteText variant="caption" style={styles.rowContext}>Sin contexto ni nota.</EliteText>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pillsRow: {
    flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  pill: {
    paddingHorizontal: Spacing.md, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: SURFACES.base, borderWidth: 0.5, borderColor: SURFACES.cardLight,
  },
  // MB-7 Track D: fuera el neonGreen de ELITE — lime de marca (micro-acento).
  pillActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  pillText: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, letterSpacing: 1 },
  pillTextActive: { color: TEXT_COLORS.onAccent },

  sectionTitle: {
    color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md,
  },

  // MB-4 Bloque 5: acceso al perfil
  profileLink: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.md,
  },
  profileLinkTitle: { color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  profileLinkSub: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 1 },
  sectionSub: {
    color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: -Spacing.xs,
    marginBottom: Spacing.sm, paddingHorizontal: Spacing.md,
  },

  // Mosaico
  mosaicWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, alignItems: 'flex-end',
  },
  mosaicItem: { alignItems: 'center', width: 80 },
  mosaicCircle: { alignItems: 'center', justifyContent: 'center' },
  mosaicCount: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md },
  mosaicLabel: {
    color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: 4,
  },

  // Correlaciones
  corrCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  corrCardSignal: { borderLeftWidth: 3, borderLeftColor: SEMANTIC.info },
  corrHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  corrLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 2 },
  corrBadge: {
    backgroundColor: withOpacity(SEMANTIC.info, 0.15), borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, marginLeft: 'auto',
  },
  corrBadgeText: { color: SEMANTIC.info, fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1 },
  corrText: { color: Colors.textPrimary, fontSize: FontSizes.md, lineHeight: 21 },

  // MB-9 · Track C — distribución / disparadores / consistencia
  distRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs + 1 },
  distDot: { width: 10, height: 10, borderRadius: 5 },
  distLabel: { color: Colors.textPrimary, fontSize: FontSizes.md, flex: 1 },
  distPct: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  distTrend: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 34, justifyContent: 'flex-end' },
  distTrendText: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  distNote: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: Spacing.xs, lineHeight: 16 },
  consRow: { flexDirection: 'row', justifyContent: 'space-around' },
  consStat: { alignItems: 'center', gap: 2 },
  consNum: { color: ATP_BRAND.lime, fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl },
  consLbl: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center' },

  // Ciclo
  phaseRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  phaseName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, flex: 1 },
  phaseDays: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  phaseAvg: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  phaseDoctrine: {
    color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 19,
    marginTop: Spacing.sm, fontStyle: 'italic',
  },

  // Registros
  rowCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.sm + 2, marginBottom: 6, marginHorizontal: Spacing.md,
    borderLeftWidth: 3,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowEmotions: { fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  rowDate: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: 2 },
  rowDetail: { marginTop: Spacing.sm, gap: Spacing.xs },
  rowContext: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  rowNote: { color: Colors.textPrimary, fontSize: FontSizes.md, lineHeight: 21, fontStyle: 'italic' },
});
