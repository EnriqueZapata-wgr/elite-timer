/**
 * Perfil emocional (MB-4 · Bloque 5) — tono test de personalidad, honestidad ATP.
 *
 * ⚠️ La regla que lo hace honesto: NO es una etiqueta fija. El copy dice
 * explícito que es una FOTO del periodo analizado, que se recalcula y cambia.
 * Nada de "tú eres X". Requiere un mínimo de registros; antes, se explica
 * qué falta.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EMOTIONS, QUADRANTS, type QuadrantKey } from '@/src/data/emotions-library';
import { computeEmotionProfile, buildShareText, PROFILE_PERIOD_DAYS, type EmotionProfile } from '@/src/services/emotion-profile-core';
import { loadHistoryData, type HistoryCheckinRecord } from '@/src/services/emotion-history-service';
import { emotionCanonColor, emotionCanonGradient, isLightColor, quadrantCanonColor } from '@/src/services/emotion-plane-core';
import { haptic } from '@/src/utils/haptics';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, ATP_BRAND, CATEGORY_COLORS, withOpacity, BG } from '@/src/constants/brand';

const EMOTION_BY_ID = new Map(EMOTIONS.map(e => [e.id, e]));

const MOMENT_LABEL: Record<string, string> = {
  'mañana': 'en la mañana',
  'tarde': 'en la tarde',
  'noche': 'en la noche',
};

export default function EmotionProfileScreen() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<HistoryCheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoryData()
      .then(d => {
        const cutoff = Date.now() - PROFILE_PERIOD_DAYS * 86400000;
        setCheckins(d.checkins.filter(c => new Date(c.created_at).getTime() >= cutoff));
      })
      .catch(() => setCheckins([]))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) {
    return (
      <Screen>
        <PillarHeader pillar="mind" title="Tu clima emocional" onBack={() => router.back()} />
      </Screen>
    );
  }

  // ═══ FALTA DATA: se explica qué falta, sin inventar perfil ═══
  if (profile.status === 'insufficient') {
    return (
      <Screen>
        <PillarHeader pillar="mind" title="Tu clima emocional" onBack={() => router.back()} />
        <View style={styles.center}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.insufficientCard}>
            <Ionicons name="hourglass-outline" size={32} color={TEXT_COLORS.secondary} />
            <EliteText style={styles.insufficientTitle}>Tu perfil se está armando</EliteText>
            <EliteText variant="body" style={styles.insufficientText}>
              Llevas {profile.have} {profile.have === 1 ? 'check-in' : 'check-ins'} en los últimos {profile.periodDays} días.
              Con {profile.needed} o más, el perfil se arma solo — antes de eso sería inventar.
            </EliteText>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (profile.have / profile.needed) * 100)}%` }]} />
            </View>
            {/* MB-7 Track D: CTA al molde editorial (degradado de marca, glow
                Mente) — era lime plano legacy. Es lo PRIMERO que el usuario ve
                en un pilar recién nacido. */}
            <GradientCTA
              label="HACER UN CHECK-IN"
              pillar="mind"
              onPress={() => router.push('/checkin')}
              style={{ marginTop: Spacing.md }}
            />
          </Animated.View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.ambient} pointerEvents="none">
        <LinearGradient colors={[withOpacity(heroColor, 0.25), 'transparent']} style={{ flex: 1 }} />
      </View>
      <PillarHeader pillar="mind" title="Tu clima emocional" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>

        {/* ═══ HÉROE: el arquetipo del periodo ═══ */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.heroWrap}>
          <EliteText variant="caption" style={styles.heroPeriod}>
            FOTO DE TUS ÚLTIMOS {profile.periodDays} DÍAS
          </EliteText>
          <EliteText style={[styles.heroName, { color: heroColor }]}>
            {profile.archetype!.name}
          </EliteText>
          <EliteText variant="body" style={styles.heroTagline}>
            {profile.archetype!.tagline}
          </EliteText>
          {/* La regla que lo hace honesto, en la cara del usuario: */}
          <EliteText variant="caption" style={styles.heroHonest}>
            Esto no es quién eres. Es cómo estuviste estos días — se recalcula solo y cambia contigo.
          </EliteText>
        </Animated.View>

        {/* ═══ MEZCLA DE ZONAS ═══ */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <EliteText variant="caption" style={styles.sectionTitle}>TU MEZCLA DEL PERIODO</EliteText>
          <View style={styles.card}>
            {profile.quadrantMix.map(q => {
              const info = QUADRANTS[q.quadrant as QuadrantKey];
              return (
                <View key={q.quadrant} style={styles.mixRow}>
                  <View style={[styles.mixDot, { backgroundColor: info?.color ?? TEXT_COLORS.secondary }]} />
                  <EliteText variant="caption" style={styles.mixLabel} numberOfLines={1}>
                    {info?.label ?? q.quadrant}
                  </EliteText>
                  <View style={styles.mixTrack}>
                    {/* Fallback real: withOpacity('') producía un color inválido */}
                    <View style={[styles.mixFill, { width: `${q.pct}%`, backgroundColor: withOpacity(info?.color ?? TEXT_COLORS.secondary, 0.8) }]} />
                  </View>
                  <EliteText variant="caption" style={styles.mixPct}>{Math.round(q.pct)}%</EliteText>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ═══ LO QUE MÁS SENTISTE ═══ */}
        {profile.topEmotions.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <EliteText variant="caption" style={styles.sectionTitle}>LO QUE MÁS SENTISTE</EliteText>
            <View style={styles.topRow}>
              {profile.topEmotions.map(t => {
                const e = EMOTION_BY_ID.get(t.emotionId);
                if (!e) return null;
                // MB-17: los chips heredan el color canónico de su celda.
                const [gTop, gBottom] = emotionCanonGradient(e);
                const base = emotionCanonColor(e);
                const chipText = isLightColor(base) ? TEXT_COLORS.onAccent : TEXT_COLORS.primary;
                return (
                  <LinearGradient key={t.emotionId} colors={[gTop, gBottom]} style={styles.topChip}>
                    <EliteText variant="caption" style={[styles.topChipText, { color: chipText }]} numberOfLines={2}>
                      {e.label}
                    </EliteText>
                    <EliteText variant="caption" style={[styles.topChipCount, { color: withOpacity(chipText, 0.6) }]}>
                      ×{t.count}
                    </EliteText>
                  </LinearGradient>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ═══ PATRONES DEL PERIODO ═══ */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <EliteText variant="caption" style={styles.sectionTitle}>PATRONES</EliteText>
          <View style={styles.card}>
            <View style={styles.patternRow}>
              <Ionicons name="pulse-outline" size={15} color={TEXT_COLORS.secondary} />
              <EliteText variant="body" style={styles.patternText}>
                {profile.variability === 'estable' && 'Tu ánimo se movió poco día a día: periodo estable.'}
                {profile.variability === 'medio' && 'Tu ánimo tuvo movimiento normal día a día.'}
                {profile.variability === 'oscilante' && 'Tu ánimo osciló bastante entre días. No es un defecto: es un dato.'}
              </EliteText>
            </View>
            {profile.bestMoment && (
              <View style={styles.patternRow}>
                <Ionicons name="time-outline" size={15} color={TEXT_COLORS.secondary} />
                <EliteText variant="body" style={styles.patternText}>
                  Tus mejores registros del periodo fueron {MOMENT_LABEL[profile.bestMoment]}.
                </EliteText>
              </View>
            )}
            <View style={styles.patternRow}>
              <Ionicons name="calendar-outline" size={15} color={TEXT_COLORS.secondary} />
              <EliteText variant="body" style={styles.patternText}>
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
          {/* Track D (MB-10): la entrada a Exploración — el espiral vive aquí,
              no en el check-in. Para días buenos: territorio y vocabulario. */}
          <Pressable
            onPress={() => { haptic.light(); router.push('/emotion-exploration'); }}
            style={styles.exploreLink}
            hitSlop={8}
          >
            <Ionicons name="map-outline" size={14} color={TEXT_COLORS.secondary} />
            <EliteText variant="caption" style={styles.exploreText}>Explorar el territorio de emociones</EliteText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 340, zIndex: 0 },

  // Falta data
  insufficientCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5,
    borderColor: SURFACES.border, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
  },
  insufficientTitle: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  insufficientText: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22, textAlign: 'center' },
  progressTrack: {
    width: '100%', height: 6, borderRadius: 3, backgroundColor: BG.input, marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: withOpacity(ATP_BRAND.lime, 0.85) },

  // Héroe
  heroWrap: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl, gap: Spacing.sm },
  heroPeriod: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 2 },
  heroName: { fontSize: 38, lineHeight: 46, fontFamily: Fonts.extraBold, textAlign: 'center' },
  heroTagline: { color: Colors.textPrimary, fontSize: FontSizes.lg, lineHeight: 26, textAlign: 'center' },
  heroHonest: {
    color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 19,
    textAlign: 'center', marginTop: Spacing.xs, fontStyle: 'italic',
  },

  sectionTitle: {
    color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.sm, marginTop: Spacing.md, paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5,
    borderColor: SURFACES.border, padding: Spacing.md, marginHorizontal: Spacing.md,
    gap: Spacing.sm,
  },

  // Mezcla
  mixRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  mixDot: { width: 10, height: 10, borderRadius: 5 },
  mixLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs, width: 120 },
  mixTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: BG.input, overflow: 'hidden' },
  mixFill: { height: 6, borderRadius: 3 },
  mixPct: { color: Colors.textPrimary, fontSize: FontSizes.xs, fontFamily: Fonts.bold, width: 36, textAlign: 'right' },

  // Top emociones
  topRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  topChip: {
    flex: 1, borderRadius: Radius.card, padding: Spacing.md,
    alignItems: 'center', gap: 4, minHeight: 76, justifyContent: 'center',
  },
  topChipText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, textAlign: 'center' },
  topChipCount: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xs },

  // Patrones
  patternRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  patternText: { color: Colors.textPrimary, fontSize: FontSizes.md, lineHeight: 21, flex: 1 },

  // Compartir
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    borderRadius: Radius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.xl,
  },
  shareText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.sm, letterSpacing: 1.5 },

  // Track D: entrada a Exploración
  exploreLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: Spacing.sm, marginTop: Spacing.md,
  },
  exploreText: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, textDecorationLine: 'underline' },
});
