/**
 * <EdadAtpHeroCard> — héroe de Mi Salud (#9): la Edad ATP (motor v2 + lab_values) como número
 * principal + barras de las 5 áreas con color por estado, CeStars y accesos a ATP Labs y al
 * detalle. Reemplaza los datos legacy como protagonista. Se alimenta SOLO del motor v2 y la
 * fuente canónica — nada hardcodeado. Carga sus propios datos (autónomo, bajo riesgo).
 */
import { useCallback, useState } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { computeEdadAtpV2 } from '@/src/services/edad-atp/edad-atp-v2-service';
import { computeCE } from '@/src/services/edad-atp/ce-service';
import type { EdadAtpV2Result, SubEdadKey } from '@/src/types/edad-atp-v2';
import { EDAD_DIMS, statusColor, SUB_EDAD_CE_PENDING_THRESHOLD, EDAD_PENDING_COLOR } from './tokens';
import { CeStars } from './CeStars';
import { CE_STARS_LEGEND } from './ce-stars';

export function EdadAtpHeroCard({ userId }: { userId: string }) {
  const [result, setResult] = useState<EdadAtpV2Result | null>(null);
  const [ce, setCe] = useState(0);
  const [loading, setLoading] = useState(true);

  // useFocusEffect en vez de useEffect: recalcula cuando la pantalla obtiene focus de nuevo
  // (ej: regresar de la pantalla de recálculo). Antes con useEffect+[userId] solo corría 1×
  // al montar → quedaba pegado el valor viejo después de recalcular.
  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      try {
        const [r, c] = await Promise.all([computeEdadAtpV2(userId), computeCE(userId)]);
        if (!alive) return;
        setResult(r);
        setCe(c.ce_integral);
      } catch { /* sin datos suficientes */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]));

  if (loading) {
    return <View style={styles.card}><EliteText variant="caption" style={styles.muted}>Calculando tu Edad ATP…</EliteText></View>;
  }
  if (!result) {
    return (
      <Pressable style={styles.card} onPress={() => router.push('/edad-atp')}>
        <EliteText style={styles.title}>Edad ATP</EliteText>
        <EliteText variant="caption" style={styles.muted}>Captura datos o sube labs para calcular tu Edad ATP.</EliteText>
      </Pressable>
    );
  }

  const chrono = result.chronological_age;
  const delta = Math.round((result.edad_integral - chrono) * 10) / 10;
  const integralColor = statusColor(result.edad_integral, chrono);

  return (
    <View style={styles.card}>
      <Pressable onPress={() => router.push('/edad-atp/result-preview')} style={styles.heroRow}>
        <View>
          <EliteText variant="caption" style={styles.kicker}>TU EDAD ATP</EliteText>
          <EliteText style={[styles.hero, { color: integralColor }]}>{result.edad_integral.toFixed(1)}</EliteText>
          <EliteText variant="caption" style={styles.sub}>
            cronológica {chrono} · {delta > 0 ? '+' : ''}{delta} años
          </EliteText>
        </View>
        <Pressable
          onPress={() => Alert.alert('Calidad de tu evaluación', CE_STARS_LEGEND)}
          hitSlop={8}
          style={styles.ceCol}
        >
          <CeStars ce={ce} size={16} label="Calidad de tu evaluación" />
          <EliteText variant="caption" style={styles.ceHint}>¿Qué es? ⓘ</EliteText>
        </Pressable>
      </Pressable>

      {/* Barras de las 5 áreas. */}
      <View style={styles.bars}>
        {EDAD_DIMS.map((d) => {
          const sub = result.sub_edades[d.key as SubEdadKey];
          if (!sub) return null;
          const pending = sub.ce_percent < SUB_EDAD_CE_PENDING_THRESHOLD;
          const color = pending ? EDAD_PENDING_COLOR : statusColor(sub.age_years, chrono);
          // Magnitud de barra: cercanía a cronológica (más joven → más llena, tope visual).
          const ratio = pending ? 0.15 : Math.max(0.08, Math.min(1, chrono > 0 ? (2 * chrono - sub.age_years) / (2 * chrono) : 0.5));
          return (
            <Pressable key={d.key} style={styles.barRow} onPress={() => router.push(`/edad-atp/sub-edad/${d.key}`)}>
              <EliteText style={styles.barIcon}>{d.icon}</EliteText>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
              </View>
              <EliteText variant="caption" style={[styles.barVal, { color }]}>
                {pending ? '—' : sub.age_years.toFixed(0)}
              </EliteText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.ctaRow}>
        <Pressable style={styles.cta} onPress={() => router.push('/edad-atp/labs')}>
          <EliteText style={styles.ctaText}>Ver ATP Labs</EliteText>
        </Pressable>
        <Pressable style={styles.cta} onPress={() => router.push('/edad-atp/result-preview')}>
          <EliteText style={styles.ctaText}>Detalle y recalcular</EliteText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(168,224,42,0.25)' },
  muted: { color: Colors.textMuted },
  title: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  ceCol: { alignItems: 'flex-end', gap: 1 },
  ceHint: { color: Colors.textMuted, fontSize: FontSizes.xs },
  kicker: { color: Colors.textSecondary, letterSpacing: 2, fontFamily: Fonts.bold },
  hero: { fontSize: 46, fontFamily: Fonts.extraBold, lineHeight: 50 },
  sub: { color: Colors.textSecondary },
  bars: { gap: 6, marginTop: Spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#1a1a1a', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barVal: { width: 28, textAlign: 'right', fontFamily: Fonts.semiBold },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  cta: { flex: 1, backgroundColor: 'rgba(168,224,42,0.10)', borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,224,42,0.3)' },
  ctaText: { color: Colors.neonGreen, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
});
