/**
 * MenteRecentSessions (Ajuste post-overhaul · 1) — bloque compacto "Tus
 * últimas sesiones" DENTRO de cada sección del pilar (doctrina dura: el hub es
 * solo menú, los datos viven en el destino). Cada sección muestra su propio
 * historial de `mind_sessions` filtrado por tipo: Meditación → 'meditation'
 * (incluye piezas de descanso, que SON meditación), Respiración → 'breathing'.
 *
 * Si no hay sesiones no pinta nada (cero estado vacío ruidoso).
 */
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { formatRelativeTime } from '@/src/components/mente/mente-hub-core';
import { supabase } from '@/src/lib/supabase';
import { ATP_BRAND } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';

interface SessionRow {
  id: string;
  template_name: string | null;
  duration_seconds: number | null;
  rounds_completed: number | null;
  created_at: string;
}

interface Props {
  type: 'meditation' | 'breathing';
  /** Nombre por default si la sesión no guardó template_name. */
  fallbackLabel: string;
}

export function MenteRecentSessions({ type, fallbackLabel }: Props) {
  const [rows, setRows] = useState<SessionRow[]>([]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('mind_sessions')
        .select('id, template_name, duration_seconds, rounds_completed, created_at')
        .eq('user_id', user.id).eq('type', type)
        .order('created_at', { ascending: false }).limit(5)
        .then(({ data }) => { if (alive) setRows((data as SessionRow[]) ?? []); });
    });
    return () => { alive = false; };
  }, [type]));

  if (rows.length === 0) return null;

  return (
    <View style={s.wrap}>
      <EliteText style={s.label}>TUS ÚLTIMAS SESIONES</EliteText>
      {rows.map(row => {
        const mins = Math.round((row.duration_seconds || 0) / 60);
        const meta = [
          mins > 0 ? `${mins} min` : null,
          row.rounds_completed ? `${row.rounds_completed} rondas` : null,
        ].filter(Boolean).join(' · ');
        return (
          <View key={row.id} style={s.row}>
            <Ionicons name="checkmark-circle" size={18} color={ATP_BRAND.lime} />
            <View style={{ flex: 1 }}>
              <EliteText style={s.name} numberOfLines={1}>
                {row.template_name || fallbackLabel}
              </EliteText>
              {!!meta && <EliteText style={s.meta}>{meta}</EliteText>}
            </View>
            <EliteText style={s.when}>{formatRelativeTime(row.created_at)}</EliteText>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: Spacing.lg },
  label: {
    fontSize: 11, letterSpacing: 2, fontFamily: Fonts.semiBold,
    color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  name: { color: '#fff', fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  meta: { color: 'rgba(255,255,255,0.45)', fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
  when: { color: 'rgba(255,255,255,0.45)', fontSize: FontSizes.xs, fontFamily: Fonts.regular },
});

export default MenteRecentSessions;
