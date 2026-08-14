/**
 * Dominio emociones (OLA1 R-2) — absorbe app/emotion-history.tsx y
 * app/emotion-profile.tsx en UNA pantalla con dos pestañas: Mosaico (default) y
 * Perfil.
 *
 * Eran dos pantallas que hacían la MISMA consulta cara por separado. Ahora hay
 * una sola lectura, y las dos pestañas miran exactamente el mismo dato: antes,
 * entre un fetch y el otro, podían no coincidir.
 *
 * Sobrevive todo: mosaico, detalle de cada check-in con zona del cuerpo,
 * correlaciones con su umbral de honestidad, fase del ciclo, patrones por día
 * y por franja, cuadrantes con tendencia, disparadores, eficacia de la
 * navegación, constancia, arquetipo, compartir y el estado "te faltan N
 * check-ins" con su barra.
 *
 * Se va, a propósito, el gradiente de ambiente de las dos pantallas: el marco
 * de todos los reportes es el header del pilar, y dos capas de violeta encima
 * del mismo contenido no son una decisión, son un accidente.
 */
import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Share } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { EMOTIONS, QUADRANTS, type QuadrantKey } from '@/src/data/emotions-library';
import {
  buildMosaic, buildDayMoods, computeCorrelation, computePhaseBreakdown,
  type CorrelationResult,
} from '@/src/services/emotion-history-core';
import {
  buildWeekdayPattern, buildDayPartPattern, buildQuadrantDistribution,
  buildTriggers, buildConsistency, computeNavigationEfficacy,
  type PatternReport,
} from '@/src/services/emotion-stats-core';
import {
  computeEmotionProfile, buildShareText, PROFILE_PERIOD_DAYS, type EmotionProfile,
} from '@/src/services/emotion-profile-core';
import type { HistoryCheckinRecord } from '@/src/services/emotion-history-service';
import {
  emotionCanonColor, emotionCanonGradient, isLightColor, quadrantCanonColor,
} from '@/src/services/emotion-plane-core';
import { bodyZoneLabel } from '@/src/data/checkin-config';
import { PHASES } from '@/src/services/cycle-service';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, SEMANTIC, ATP_BRAND, CATEGORY_COLORS, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { REPORT_DOMAINS } from '@/src/services/reports/report-domain-core';
import {
  filterCheckinsByRange, previousWindow, consistencyWindowDays, emocionesRows,
} from '@/src/services/reports/emociones-report-core';
import {
  loadEmocionesReport, type EmocionesReportData,
} from '@/src/services/reports/emociones-report-service';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import { ReportTabs, useReportTab } from '../ReportTabs';
import { useReportRange } from '../report-range-context';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.emociones;
const EMOTION_BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));

const CORRELATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  sleep: 'moon-outline',
  training: 'barbell-outline',
  fasting: 'timer-outline',
  sun: 'sunny-outline',
};

const MOVE_LABELS: Record<string, string> = {
  bajar: 'bajas la energía',
  reencuadrar: 'reencuadras la activación',
  cruzar: 'cruzas al otro lado',
  subir: 'subes desde la calma',
};

/** Preposición por dimensión de disparador (dónde / con quién / qué hacías). */
const TRIGGER_WORD: Record<string, string> = { where: 'en', who: 'con', doing: 'mientras' };

const MOMENT_LABEL: Record<string, string> = {
  'mañana': 'en la mañana',
  'tarde': 'en la tarde',
  'noche': 'en la noche',
};

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

/**
 * El redirect del perfil viejo llega con ?section=perfil; useReportTab entiende
 * tanto ?tab= como ?section=, asi que ese enlace sigue cayendo donde caia.
 */
const TABS = [
  { key: 'mosaico', label: 'MOSAICO' },
  { key: 'perfil', label: 'PERFIL' },
] as const;

type Tab = typeof TABS[number]['key'];

export function EmocionesContent({ data }: { data: EmocionesReportData }) {
  const [tab, setTab] = useReportTab<Tab>(TABS, 'mosaico');

  return (
    <View>
      <ReportTabs tabs={TABS} active={tab} onSelect={setTab} accent={META.accent} />
      {tab === 'mosaico' ? <MosaicoTab data={data} /> : <PerfilTab data={data} />}
    </View>
  );
}

// ── Pestaña MOSAICO ────────────────────────────────────────────────────────

function MosaicoTab({ data }: { data: EmocionesReportData }) {
  const { resolved } = useReportRange();
  const { kind, tokens: t } = useAppTheme();
  const secTxt = { color: t.textoSecundario };
  const priTxt = { color: t.texto };
  const cardSurf = { backgroundColor: t.card, borderColor: t.borde };
  const sec = t.textoSecundario;
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const all = data.history.checkins;
  const rangeCheckins = useMemo(() => filterCheckinsByRange(all, resolved), [all, resolved]);
  const prevCheckins = useMemo(() => previousWindow(all, resolved), [all, resolved]);

  const mosaic = useMemo(() => buildMosaic(rangeCheckins), [rangeCheckins]);
  const dayMoods = useMemo(() => buildDayMoods(rangeCheckins), [rangeCheckins]);
  const correlations: CorrelationResult[] = useMemo(
    () => data.history.correlationDefs.map((def) => computeCorrelation(dayMoods, def)),
    [data.history.correlationDefs, dayMoods],
  );
  const phaseBreakdown = useMemo(
    () => (data.history.phaseByDate ? computePhaseBreakdown(dayMoods, data.history.phaseByDate) : null),
    [data.history.phaseByDate, dayMoods],
  );

  const weekdayPattern = useMemo(() => buildWeekdayPattern(rangeCheckins), [rangeCheckins]);
  const dayPartPattern = useMemo(() => buildDayPartPattern(rangeCheckins), [rangeCheckins]);
  const distribution = useMemo(
    () => buildQuadrantDistribution(rangeCheckins, prevCheckins),
    [rangeCheckins, prevCheckins],
  );
  const triggers = useMemo(() => buildTriggers(rangeCheckins), [rangeCheckins]);
  const consistency = useMemo(
    () => buildConsistency(rangeCheckins, consistencyWindowDays(rangeCheckins, resolved)),
    [rangeCheckins, resolved],
  );
  const efficacy = useMemo(
    () => computeNavigationEfficacy(data.navLogs, rangeCheckins),
    [data.navLogs, rangeCheckins],
  );

  const maxCount = mosaic[0]?.count ?? 1;

  // Hay check-ins, pero no en ESTE rango. No es lo mismo que no haber
  // registrado nunca: eso lo dice el estado vacío del shell.
  if (rangeCheckins.length === 0) {
    return (
      <EmptyState
        icon="pulse-outline"
        title="Sin registros en este rango"
        subtitle="Cambia el rango para ver los que sí tienes. Cada check-in que hagas va pintando este mosaico."
      />
    );
  }

  return (
    <View>
      {/* ═══ MOSAICO ═══ */}
      {mosaic.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)}>
          <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>TODO LO QUE HAS SENTIDO</EliteText>
          <View style={styles.mosaicWrap}>
            {mosaic.map((m, i) => {
              const emotion = EMOTION_BY_ID.get(m.emotionId);
              if (!emotion) return null;
              // MB-17: la coordenada bautiza el color — el mosaico hereda el
              // color de la celda de cada emoción en el plano.
              const [gTop, gBottom] = emotionCanonGradient(emotion);
              const base = emotionCanonColor(emotion);
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
                  <EliteText variant="caption" style={[styles.mosaicLabel, secTxt]} numberOfLines={2}>
                    {emotion.label}
                  </EliteText>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* ═══ CORRELACIONES — el foso ═══ */}
      <View style={{ marginTop: Spacing.xl }}>
        <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>TU ÁNIMO × TU VIDA</EliteText>
        <EliteText variant="caption" style={[styles.sectionSub, secTxt]}>
          Observaciones de tus propios datos. No son diagnósticos ni causas.
        </EliteText>
        {correlations.map((c, i) => (
          <Animated.View key={c.key} entering={FadeInDown.delay(i * 50).duration(300)}>
            <View style={[styles.corrCard, cardSurf, c.status === 'signal' && styles.corrCardSignal]}>
              <View style={styles.corrHeader}>
                <Ionicons
                  name={CORRELATION_ICONS[c.key] ?? 'analytics-outline'}
                  size={16}
                  color={c.status === 'signal' ? SEMANTIC.info : sec}
                />
                <EliteText variant="caption" style={[styles.corrLabel, secTxt]}>{c.label.toUpperCase()}</EliteText>
                {c.status === 'signal' && (
                  <View style={styles.corrBadge}>
                    <EliteText variant="caption" style={[styles.corrBadgeText, { color: t.info }]}>PATRÓN</EliteText>
                  </View>
                )}
              </View>
              <EliteText variant="body" style={[styles.corrText, priTxt]}>{c.observation}</EliteText>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* ═══ CUÁNDO CAMBIA TU ÁNIMO (día / franja) ═══ */}
      <View style={{ marginTop: Spacing.xl }}>
        <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>CUÁNDO CAMBIA TU ÁNIMO</EliteText>
        <View style={[styles.corrCard, cardSurf]}>
          <View style={styles.corrHeader}>
            <Ionicons name="calendar-outline" size={16} color={sec} />
            <EliteText variant="caption" style={[styles.corrLabel, secTxt]}>POR DÍA DE LA SEMANA</EliteText>
          </View>
          <EliteText variant="body" style={[styles.corrText, priTxt]}>{patternLine(weekdayPattern)}</EliteText>
        </View>
        <View style={[styles.corrCard, cardSurf]}>
          <View style={styles.corrHeader}>
            <Ionicons name="time-outline" size={16} color={sec} />
            <EliteText variant="caption" style={[styles.corrLabel, secTxt]}>POR FRANJA DEL DÍA</EliteText>
          </View>
          <EliteText variant="body" style={[styles.corrText, priTxt]}>{patternLine(dayPartPattern)}</EliteText>
        </View>
      </View>

      {/* ═══ DISTRIBUCIÓN POR CUADRANTE + TENDENCIA ═══ */}
      {distribution.status === 'ok' && (
        <View style={{ marginTop: Spacing.xl }}>
          <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>DÓNDE VIVISTE ESTE PERIODO</EliteText>
          <View style={[styles.corrCard, cardSurf]}>
            {distribution.shares.map((s) => {
              const info = QUADRANTS[s.quadrant];
              const up = (s.deltaPct ?? 0) > 0;
              return (
                <View key={s.quadrant} style={styles.distRow}>
                  <View style={[styles.distDot, { backgroundColor: info.color }]} />
                  <EliteText variant="body" style={[styles.distLabel, priTxt]} numberOfLines={1}>{info.label}</EliteText>
                  <EliteText variant="body" style={[styles.distPct, priTxt]}>{s.pct}%</EliteText>
                  {s.deltaPct != null && Math.abs(s.deltaPct) >= 1 && (
                    <View style={styles.distTrend}>
                      <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={12} color={up ? SEMANTIC.acceptable : sec} />
                      <EliteText variant="caption" style={[styles.distTrendText, secTxt]}>{Math.abs(s.deltaPct)}</EliteText>
                    </View>
                  )}
                </View>
              );
            })}
            {distribution.shares.every((s) => s.deltaPct == null) && (
              <EliteText variant="caption" style={[styles.distNote, secTxt]}>
                La flecha de tendencia aparece cuando el periodo anterior también tiene registros. En el rango Todo no hay periodo anterior que comparar.
              </EliteText>
            )}
          </View>
        </View>
      )}

      {/* ═══ DISPARADORES FRECUENTES (asociación, no causa) ═══ */}
      {triggers.status === 'ok' && (
        <View style={{ marginTop: Spacing.xl }}>
          <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>QUÉ ACOMPAÑA TUS BAJONES</EliteText>
          <EliteText variant="caption" style={[styles.sectionSub, secTxt]}>
            Lo que más estaba presente en tus estados desagradables. Presencia, no causa.
          </EliteText>
          <View style={[styles.corrCard, cardSurf]}>
            {triggers.triggers.map((tr) => (
              <View key={`${tr.dimension}-${tr.value}`} style={styles.distRow}>
                <Ionicons name="pricetag-outline" size={14} color={sec} />
                <EliteText variant="body" style={[styles.distLabel, priTxt]} numberOfLines={1}>
                  {TRIGGER_WORD[tr.dimension]} {tr.value}
                </EliteText>
                <EliteText variant="caption" style={[styles.distPct, priTxt]}>{tr.count}×</EliteText>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ═══ TU NAVEGACIÓN FUNCIONA (el diferenciador) ═══ */}
      {efficacy.moves.length > 0 && (
        <View style={{ marginTop: Spacing.xl }}>
          <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>MOVERTE FUNCIONA</EliteText>
          <EliteText variant="caption" style={[styles.sectionSub, secTxt]}>
            De tus movimientos y tu siguiente check-in. Asociación, no promesa.
          </EliteText>
          {efficacy.moves.map((m) => (
            <View key={m.move} style={[styles.corrCard, cardSurf, styles.corrCardSignal]}>
              <View style={styles.corrHeader}>
                <Ionicons name="navigate-outline" size={16} color={SEMANTIC.info} />
                <EliteText variant="caption" style={[styles.corrLabel, secTxt]}>{(MOVE_LABELS[m.move] ?? m.move).toUpperCase()}</EliteText>
              </View>
              <EliteText variant="body" style={[styles.corrText, priTxt]}>
                Cuando {MOVE_LABELS[m.move] ?? m.move}, tu siguiente check-in mejora {Math.round((m.rate ?? 0) * 10)} de cada 10 veces ({m.sampled} registros).
              </EliteText>
            </View>
          ))}
        </View>
      )}

      {/* ═══ CONSISTENCIA (racha de escucha) ═══ */}
      <View style={{ marginTop: Spacing.xl }}>
        <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>TU CONSTANCIA</EliteText>
        <View style={[styles.corrCard, cardSurf]}>
          <View style={styles.consRow}>
            <View style={styles.consStat}>
              <EliteText style={[styles.consNum, { color: acento }]}>{consistency.currentStreak}</EliteText>
              <EliteText variant="caption" style={[styles.consLbl, secTxt]}>racha actual</EliteText>
            </View>
            <View style={styles.consStat}>
              <EliteText style={[styles.consNum, { color: acento }]}>{consistency.longestStreak}</EliteText>
              <EliteText variant="caption" style={[styles.consLbl, secTxt]}>racha más larga</EliteText>
            </View>
            <View style={styles.consStat}>
              <EliteText style={[styles.consNum, { color: acento }]}>{Math.round(consistency.consistencyPct)}%</EliteText>
              <EliteText variant="caption" style={[styles.consLbl, secTxt]}>días con check-in</EliteText>
            </View>
          </View>
        </View>
      </View>

      {/* ═══ CONSCIENCIA DE CICLO ═══ */}
      {phaseBreakdown && (
        <View style={{ marginTop: Spacing.xl }}>
          <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>TU ÁNIMO × TU CICLO</EliteText>
          {phaseBreakdown.status === 'ok' ? (
            <View style={[styles.corrCard, cardSurf]}>
              {phaseBreakdown.entries.map((e) => {
                const info = PHASES[e.phase];
                return (
                  <View key={e.phase} style={styles.phaseRow}>
                    <Ionicons name={(info?.icon as any) ?? 'ellipse-outline'} size={15} color={info?.color ?? sec} />
                    <EliteText variant="body" style={[styles.phaseName, { color: info?.color ?? t.texto }]}>
                      {info?.label ?? e.phase}
                    </EliteText>
                    <EliteText variant="caption" style={[styles.phaseDays, secTxt]}>{e.days} días</EliteText>
                    <EliteText variant="body" style={[styles.phaseAvg, priTxt]}>{e.avg}/10</EliteText>
                  </View>
                );
              })}
              {/* Doctrina bidireccional */}
              <EliteText variant="caption" style={[styles.phaseDoctrine, secTxt]}>
                La fase explica, no excusa. Conocer el patrón es para usarlo a tu favor.
              </EliteText>
            </View>
          ) : (
            <View style={[styles.corrCard, cardSurf]}>
              <EliteText variant="body" style={[styles.corrText, priTxt]}>
                Aún no hay suficientes check-ins repartidos entre fases para ver un patrón honesto. Sigue registrando.
              </EliteText>
            </View>
          )}
        </View>
      )}

      {/* ═══ REGISTROS (detalle de cada check-in) ═══ */}
      <View style={{ marginTop: Spacing.xl }}>
        <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>REGISTROS</EliteText>
        {rangeCheckins.map((ci) => (
          <CheckinRow
            key={ci.id}
            checkin={ci}
            expanded={expandedId === ci.id}
            onToggle={() => { haptic.light(); setExpandedId(expandedId === ci.id ? null : ci.id); }}
          />
        ))}
      </View>
    </View>
  );
}

function CheckinRow({ checkin, expanded, onToggle }: {
  checkin: HistoryCheckinRecord; expanded: boolean; onToggle: () => void;
}) {
  const { tokens: t } = useAppTheme();
  const qInfo = QUADRANTS[checkin.quadrant];
  const labels = checkin.emotions
    .map((id) => EMOTION_BY_ID.get(id)?.label)
    .filter(Boolean)
    .join(' · ');
  const context = [checkin.context_where, checkin.context_who, checkin.context_doing]
    .filter(Boolean)
    .join(' · ');
  // MB-17 Pieza 5: si el check-in trae zona del cuerpo, su etiqueta corta
  // acompaña la fecha en la tarjeta. Sin zona, nada — no se inventa.
  const zoneLabel = bodyZoneLabel(checkin.body_zone);
  return (
    <Pressable onPress={onToggle} style={[styles.rowCard, { backgroundColor: t.card, borderLeftColor: qInfo.color }]}>
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <EliteText variant="caption" style={[styles.rowEmotions, { color: qInfo.color }]}>
            {labels || qInfo.label}
          </EliteText>
          <EliteText variant="caption" style={[styles.rowDate, { color: t.textoTenue }]}>
            {new Date(checkin.created_at).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
            {zoneLabel ? ` · ${zoneLabel}` : ''}
          </EliteText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={t.textoSecundario} />
      </View>
      {expanded && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.rowDetail}>
          {context.length > 0 && (
            <EliteText variant="caption" style={[styles.rowContext, { color: t.textoSecundario }]}>{context}</EliteText>
          )}
          {checkin.note && (
            <EliteText variant="body" style={[styles.rowNote, { color: t.texto }]}>“{checkin.note}”</EliteText>
          )}
          {!context && !checkin.note && (
            <EliteText variant="caption" style={[styles.rowContext, { color: t.textoSecundario }]}>Sin contexto ni nota.</EliteText>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

// ── Pestaña PERFIL ─────────────────────────────────────────────────────────

/**
 * El perfil NO sigue el rango del shell: es, por definición, la foto de los
 * últimos 30 días, y su copy lo dice en la cara. Cambiarle la ventana con las
 * pills convertiría "foto del periodo" en otra cosa cada vez.
 */
function PerfilTab({ data }: { data: EmocionesReportData }) {
  const { tokens: t } = useAppTheme();
  const secTxt = { color: t.textoSecundario };
  const priTxt = { color: t.texto };
  const cardSurf = { backgroundColor: t.card, borderColor: t.borde };

  const checkins = useMemo(() => {
    const cutoff = Date.now() - PROFILE_PERIOD_DAYS * 86400000;
    return data.history.checkins.filter((c) => new Date(c.created_at).getTime() >= cutoff);
  }, [data.history.checkins]);

  const profile: EmotionProfile = useMemo(() => computeEmotionProfile(checkins), [checkins]);

  const heroColor = useMemo(() => {
    const key = profile.archetype?.key;
    // MB-17: sin cuadrante dominante no hay celda que herede — el ambiente
    // del módulo (violeta Mente) es el color honesto para "mezclado".
    if (!key || key === 'mixed') return CATEGORY_COLORS.mind;
    return quadrantCanonColor(key as QuadrantKey);
  }, [profile]);

  const handleShare = async () => {
    haptic.medium();
    const text = buildShareText(profile);
    if (!text) return;
    try { await Share.share({ message: text }); } catch { /* usuario canceló */ }
  };

  // ═══ FALTA DATA: se explica qué falta, sin inventar perfil ═══
  if (profile.status === 'insufficient') {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={[styles.insufficientCard, cardSurf]}>
        <Ionicons name="hourglass-outline" size={32} color={t.textoSecundario} />
        <EliteText style={[styles.insufficientTitle, priTxt]}>Tu perfil se está armando</EliteText>
        <EliteText variant="body" style={[styles.insufficientText, secTxt]}>
          Llevas {profile.have} {profile.have === 1 ? 'check-in' : 'check-ins'} en los últimos {profile.periodDays} días.
          Con {profile.needed} o más, el perfil se arma solo: antes de eso sería inventar.
        </EliteText>
        <View style={[styles.progressTrack, { backgroundColor: t.hundido }]}>
          <View style={[styles.progressFill, { width: `${Math.min(100, (profile.have / profile.needed) * 100)}%` }]} />
        </View>
        <GradientCTA
          label="HACER UN CHECK-IN"
          pillar="mind"
          onPress={() => router.push('/checkin')}
          style={{ marginTop: Spacing.md }}
        />
      </Animated.View>
    );
  }

  return (
    <View>
      {/* ═══ HÉROE: el arquetipo del periodo ═══ */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.heroWrap}>
        <EliteText variant="caption" style={[styles.heroPeriod, secTxt]}>
          FOTO DE TUS ÚLTIMOS {profile.periodDays} DÍAS
        </EliteText>
        <EliteText style={[styles.heroName, { color: heroColor }]}>
          {profile.archetype!.name}
        </EliteText>
        <EliteText variant="body" style={[styles.heroTagline, priTxt]}>
          {profile.archetype!.tagline}
        </EliteText>
        {/* La regla que lo hace honesto, en la cara del usuario: */}
        <EliteText variant="caption" style={[styles.heroHonest, secTxt]}>
          Esto no es quién eres. Es cómo estuviste estos días: se recalcula solo y cambia contigo.
        </EliteText>
      </Animated.View>

      {/* ═══ MEZCLA DE ZONAS ═══ */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>TU MEZCLA DEL PERIODO</EliteText>
        <View style={[styles.card, cardSurf]}>
          {profile.quadrantMix.map((q) => {
            const info = QUADRANTS[q.quadrant as QuadrantKey];
            return (
              <View key={q.quadrant} style={styles.mixRow}>
                <View style={[styles.mixDot, { backgroundColor: info?.color ?? t.textoSecundario }]} />
                <EliteText variant="caption" style={[styles.mixLabel, secTxt]} numberOfLines={1}>
                  {info?.label ?? q.quadrant}
                </EliteText>
                <View style={[styles.mixTrack, { backgroundColor: t.hundido }]}>
                  {/* Fallback real: withOpacity('') producía un color inválido */}
                  <View style={[styles.mixFill, { width: `${q.pct}%`, backgroundColor: withOpacity(info?.color ?? TEXT_COLORS.secondary, 0.8) }]} />
                </View>
                <EliteText variant="caption" style={[styles.mixPct, priTxt]}>{Math.round(q.pct)}%</EliteText>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* ═══ LO QUE MÁS SENTISTE ═══ */}
      {profile.topEmotions.length > 0 && (
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>LO QUE MÁS SENTISTE</EliteText>
          <View style={styles.topRow}>
            {profile.topEmotions.map((top) => {
              const e = EMOTION_BY_ID.get(top.emotionId);
              if (!e) return null;
              // MB-17: los chips heredan el color canónico de su celda.
              const [gTop, gBottom] = emotionCanonGradient(e);
              const base = emotionCanonColor(e);
              const chipText = isLightColor(base) ? TEXT_COLORS.onAccent : TEXT_COLORS.primary;
              return (
                <LinearGradient key={top.emotionId} colors={[gTop, gBottom]} style={styles.topChip}>
                  <EliteText variant="caption" style={[styles.topChipText, { color: chipText }]} numberOfLines={2}>
                    {e.label}
                  </EliteText>
                  <EliteText variant="caption" style={[styles.topChipCount, { color: withOpacity(chipText, 0.6) }]}>
                    ×{top.count}
                  </EliteText>
                </LinearGradient>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* ═══ PATRONES DEL PERIODO ═══ */}
      <Animated.View entering={FadeInDown.delay(350).duration(400)}>
        <EliteText variant="caption" style={[styles.sectionTitle, secTxt]}>PATRONES</EliteText>
        <View style={[styles.card, cardSurf]}>
          <View style={styles.patternRow}>
            <Ionicons name="pulse-outline" size={15} color={t.textoSecundario} />
            <EliteText variant="body" style={[styles.patternText, priTxt]}>
              {profile.variability === 'estable' && 'Tu ánimo se movió poco día a día: periodo estable.'}
              {profile.variability === 'medio' && 'Tu ánimo tuvo movimiento normal día a día.'}
              {profile.variability === 'oscilante' && 'Tu ánimo osciló bastante entre días. No es un defecto: es un dato.'}
            </EliteText>
          </View>
          {profile.bestMoment && (
            <View style={styles.patternRow}>
              <Ionicons name="time-outline" size={15} color={t.textoSecundario} />
              <EliteText variant="body" style={[styles.patternText, priTxt]}>
                Tus mejores registros del periodo fueron {MOMENT_LABEL[profile.bestMoment]}.
              </EliteText>
            </View>
          )}
          <View style={styles.patternRow}>
            <Ionicons name="calendar-outline" size={15} color={t.textoSecundario} />
            <EliteText variant="body" style={[styles.patternText, priTxt]}>
              Registraste {profile.have} check-ins en {profile.daysCovered} días distintos.
            </EliteText>
          </View>
        </View>
      </Animated.View>

      {/* ═══ COMPARTIR ═══ */}
      <Animated.View entering={FadeInDown.delay(450).duration(400)} style={{ alignItems: 'center' }}>
        <Pressable onPress={handleShare} style={[styles.shareBtn, { backgroundColor: heroColor }]}>
          <Ionicons name="share-social-outline" size={16} color={TEXT_COLORS.onAccent} />
          <EliteText style={styles.shareText}>COMPARTIR MI CLIMA</EliteText>
        </Pressable>
        {/* La entrada a Exploración: el espiral vive aquí, no en el check-in.
            Para días buenos: territorio y vocabulario. */}
        <Pressable
          onPress={() => { haptic.light(); router.push('/emotion-exploration'); }}
          style={styles.exploreLink}
          hitSlop={8}
        >
          <Ionicons name="map-outline" size={14} color={t.textoSecundario} />
          <EliteText variant="caption" style={[styles.exploreText, secTxt]}>Explorar el territorio de emociones</EliteText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── La tarjeta del hub ─────────────────────────────────────────────────────

/**
 * La cifra es la MISMA que ya cuenta getMindReport (checkins). No se consulta
 * por segunda vez para pintar un número que ya está.
 */
export function EmocionesResumen({ checkins }: { checkins: number }) {
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="EMOCIONES" />
      <StatsRow>
        <Stat value={`${checkins}`} label="check-ins" />
      </StatsRow>
    </>
  );
}

export const emocionesDomain: ReportDomainDefinition<EmocionesReportData> = {
  key: 'emociones',
  load: () => loadEmocionesReport(),
  isEmpty: (d) => d.history.checkins.length === 0,
  toRows: (d) => emocionesRows(d.history.checkins),
  render: (d) => <EmocionesContent data={d} />,
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.sm,
  },
  sectionSub: {
    fontSize: FontSizes.sm, marginTop: -Spacing.xs, marginBottom: Spacing.sm,
  },

  // Mosaico
  mosaicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'flex-end' },
  mosaicItem: { alignItems: 'center', width: 80 },
  mosaicCircle: { alignItems: 'center', justifyContent: 'center' },
  mosaicCount: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md },
  mosaicLabel: { fontSize: FontSizes.xs, textAlign: 'center', marginTop: 4 },

  // Correlaciones
  corrCard: {
    borderRadius: Radius.card, borderWidth: 0.5,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  corrCardSignal: { borderLeftWidth: 3, borderLeftColor: SEMANTIC.info },
  corrHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  corrLabel: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 2 },
  corrBadge: {
    backgroundColor: withOpacity(SEMANTIC.info, 0.15), borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, marginLeft: 'auto',
  },
  corrBadgeText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1 },
  corrText: { fontSize: FontSizes.md, lineHeight: 21 },

  // Distribución / disparadores / consistencia
  distRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs + 1 },
  distDot: { width: 10, height: 10, borderRadius: 5 },
  distLabel: { fontSize: FontSizes.md, flex: 1 },
  distPct: { fontFamily: Fonts.bold, fontSize: FontSizes.md },
  distTrend: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 34, justifyContent: 'flex-end' },
  distTrendText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  distNote: { fontSize: FontSizes.xs, marginTop: Spacing.xs, lineHeight: 16 },
  consRow: { flexDirection: 'row', justifyContent: 'space-around' },
  consStat: { alignItems: 'center', gap: 2 },
  consNum: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl },
  consLbl: { fontSize: FontSizes.xs, textAlign: 'center' },

  // Ciclo
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs + 2 },
  phaseName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, flex: 1 },
  phaseDays: { fontSize: FontSizes.xs },
  phaseAvg: { fontFamily: Fonts.bold, fontSize: FontSizes.md },
  phaseDoctrine: { fontSize: FontSizes.sm, lineHeight: 19, marginTop: Spacing.sm, fontStyle: 'italic' },

  // Registros
  rowCard: {
    borderRadius: Radius.card, padding: Spacing.sm + 2, marginBottom: 6, borderLeftWidth: 3,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowEmotions: { fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  rowDate: { fontSize: FontSizes.xs, marginTop: 2 },
  rowDetail: { marginTop: Spacing.sm, gap: Spacing.xs },
  rowContext: { fontSize: FontSizes.sm },
  rowNote: { fontSize: FontSizes.md, lineHeight: 21, fontStyle: 'italic' },

  // Perfil · falta data
  insufficientCard: {
    borderRadius: Radius.card, borderWidth: 0.5,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg,
  },
  insufficientTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  insufficientText: { fontSize: FontSizes.md, lineHeight: 22, textAlign: 'center' },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, marginTop: Spacing.sm, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: withOpacity(ATP_BRAND.lime, 0.85) },

  // Perfil · héroe
  heroWrap: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  heroPeriod: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 2 },
  heroName: { fontSize: 38, lineHeight: 46, fontFamily: Fonts.extraBold, textAlign: 'center' },
  heroTagline: { fontSize: FontSizes.lg, lineHeight: 26, textAlign: 'center' },
  heroHonest: {
    fontSize: FontSizes.sm, lineHeight: 19, textAlign: 'center',
    marginTop: Spacing.xs, fontStyle: 'italic',
  },
  card: { borderRadius: Radius.card, borderWidth: 0.5, padding: Spacing.md, gap: Spacing.sm },

  // Perfil · mezcla
  mixRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  mixDot: { width: 10, height: 10, borderRadius: 5 },
  mixLabel: { fontSize: FontSizes.xs, width: 120 },
  mixTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  mixFill: { height: 6, borderRadius: 3 },
  mixPct: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, width: 36, textAlign: 'right' },

  // Perfil · top emociones
  topRow: { flexDirection: 'row', gap: Spacing.sm },
  topChip: {
    flex: 1, borderRadius: Radius.card, padding: Spacing.md,
    alignItems: 'center', gap: 4, minHeight: 76, justifyContent: 'center',
  },
  topChipText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, textAlign: 'center' },
  topChipCount: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xs },

  // Perfil · patrones
  patternRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  patternText: { fontSize: FontSizes.md, lineHeight: 21, flex: 1 },

  // Perfil · compartir
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    borderRadius: Radius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.xl,
  },
  shareText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.sm, letterSpacing: 1.5 },
  exploreLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: Spacing.sm, marginTop: Spacing.md,
  },
  exploreText: { fontSize: FontSizes.sm, textDecorationLine: 'underline' },
});
