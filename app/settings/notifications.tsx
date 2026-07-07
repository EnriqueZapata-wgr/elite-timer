/**
 * Settings > Notificaciones (#61) — control granular:
 * modos (standard / adaptive ARGOS / silent), toggles por tipo,
 * quiet hours (steppers de hora) y DND en consulta clínica (V1.5+).
 * Persiste en user_notification_prefs (migración 157) al momento.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  getNotificationPrefs, updateNotificationPrefs,
  MODE_META, CHANNEL_META,
  type NotificationPrefs, type NotificationMode,
} from '@/src/services/notification-prefs-service';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

/** 'HH:MM[:SS]' → hora entera (fallback def). */
function hourOf(t: string | null, def: number): number {
  const m = t ? /^(\d{1,2}):/.exec(t) : null;
  return m ? Math.min(23, parseInt(m[1], 10)) : def;
}

const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function SettingsNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getNotificationPrefs(user.id).then(setPrefs);
  }, [user?.id]);

  const patch = useCallback(async (p: Partial<NotificationPrefs>) => {
    if (!user?.id || !prefs) return;
    haptic.light();
    const prev = prefs;
    setPrefs({ ...prefs, ...p }); // optimista
    const ok = await updateNotificationPrefs(user.id, p);
    if (!ok) setPrefs(prev);
  }, [user?.id, prefs]);

  const quietEnabled = !!(prefs?.quiet_hours_start && prefs?.quiet_hours_end);
  const quietStart = hourOf(prefs?.quiet_hours_start ?? null, 22);
  const quietEnd = hourOf(prefs?.quiet_hours_end ?? null, 7);

  const stepHour = (which: 'start' | 'end', delta: number) => {
    const cur = which === 'start' ? quietStart : quietEnd;
    const next = (cur + delta + 24) % 24;
    patch(which === 'start' ? { quiet_hours_start: fmtHour(next) } : { quiet_hours_end: fmtHour(next) });
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
    >
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.title}>Notificaciones</EliteText>
          <EliteText style={s.subtitle}>Decide qué te interrumpe y cuándo.</EliteText>
        </Animated.View>
      </View>

      {/* ── Modo ── */}
      <Animated.View entering={FadeInUp.delay(90).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Modo</SectionTitle>
        {MODE_META.map(m => {
          const selected = prefs?.mode === m.value;
          return (
            <Pressable
              key={m.value}
              onPress={() => patch({ mode: m.value as NotificationMode })}
              style={[s.modeRow, selected && s.modeRowActive]}
            >
              <View style={[s.radio, selected && s.radioOn]}>
                {selected && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <EliteText style={s.rowTitle}>{m.title}</EliteText>
                  {m.pro && (
                    <View style={s.proBadge}>
                      <EliteText style={s.proBadgeText}>PRO</EliteText>
                    </View>
                  )}
                </View>
                <EliteText style={s.rowDesc}>{m.description}</EliteText>
              </View>
            </Pressable>
          );
        })}
      </Animated.View>

      {/* ── Toggles por tipo ── */}
      <Animated.View entering={FadeInUp.delay(140).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Por tipo</SectionTitle>
        {CHANNEL_META.map(c => {
          const disabled = prefs?.mode === 'silent' && c.key !== 'system';
          return (
            <View key={c.key} style={[s.toggleRow, disabled && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <EliteText style={s.rowTitle}>{c.title}</EliteText>
                <EliteText style={s.rowDesc}>{disabled ? 'Silenciado por el modo Silent' : c.description}</EliteText>
              </View>
              <Switch
                value={(prefs?.[c.column] as boolean) ?? true}
                onValueChange={(v) => patch({ [c.column]: v } as Partial<NotificationPrefs>)}
                disabled={!prefs || disabled}
                trackColor={{ false: '#333', true: withOpacity(ATP_BRAND.lime, 0.5) }}
                thumbColor={(prefs?.[c.column] as boolean) ? ATP_BRAND.lime : '#666'}
              />
            </View>
          );
        })}
      </Animated.View>

      {/* ── Quiet hours ── */}
      <Animated.View entering={FadeInUp.delay(190).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Horas de silencio</SectionTitle>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <EliteText style={s.rowTitle}>Quiet hours</EliteText>
            <EliteText style={s.rowDesc}>
              {quietEnabled
                ? `Sin notificaciones de ${fmtHour(quietStart)} a ${fmtHour(quietEnd)} (solo sistema).`
                : 'Silencia todo en una ventana horaria (solo sistema pasa).'}
            </EliteText>
          </View>
          <Switch
            value={quietEnabled}
            onValueChange={(v) => patch(v
              ? { quiet_hours_start: fmtHour(22), quiet_hours_end: fmtHour(7) }
              : { quiet_hours_start: null, quiet_hours_end: null })}
            disabled={!prefs}
            trackColor={{ false: '#333', true: withOpacity(ATP_BRAND.lime, 0.5) }}
            thumbColor={quietEnabled ? ATP_BRAND.lime : '#666'}
          />
        </View>

        {quietEnabled && (
          <View style={s.hoursCard}>
            {([['start', 'DESDE', quietStart], ['end', 'HASTA', quietEnd]] as const).map(([which, label, value]) => (
              <View key={which} style={s.hourRow}>
                <EliteText style={s.hourLabel}>{label}</EliteText>
                <View style={s.stepper}>
                  <Pressable onPress={() => stepHour(which, -1)} hitSlop={8} style={s.stepBtn}>
                    <Ionicons name="remove" size={16} color={TEXT.primary} />
                  </Pressable>
                  <EliteText style={s.hourValue}>{fmtHour(value)}</EliteText>
                  <Pressable onPress={() => stepHour(which, 1)} hitSlop={8} style={s.stepBtn}>
                    <Ionicons name="add" size={16} color={TEXT.primary} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* ── DND consulta ── */}
      <Animated.View entering={FadeInUp.delay(240).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Consulta clínica</SectionTitle>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <EliteText style={s.rowTitle}>DND durante consulta</EliteText>
            <EliteText style={s.rowDesc}>
              Silencio automático mientras estás en consulta con tu clínico (llega con V1.5).
            </EliteText>
          </View>
          <Switch
            value={prefs?.dnd_during_consultation ?? true}
            onValueChange={(v) => patch({ dnd_during_consultation: v })}
            disabled={!prefs}
            trackColor={{ false: '#333', true: withOpacity(ATP_BRAND.lime, 0.5) }}
            thumbColor={prefs?.dnd_during_consultation ? ATP_BRAND.lime : '#666'}
          />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 4 },
  modeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  modeRowActive: { borderColor: withOpacity(ATP_BRAND.lime, 0.5) },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: ATP_BRAND.lime },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ATP_BRAND.lime },
  rowTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  rowDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2, lineHeight: 16 },
  proBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  proBadgeText: { fontSize: 9, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 1 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  hoursCard: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, gap: 12,
  },
  hourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hourLabel: { fontSize: 10, fontFamily: Fonts.semiBold, color: TEXT.tertiary, letterSpacing: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#0a0a0a',
    borderWidth: 1, borderColor: '#222', alignItems: 'center', justifyContent: 'center',
  },
  hourValue: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: TEXT.primary, minWidth: 56, textAlign: 'center' },
});
