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
import { syncAppAvisos } from '@/src/services/app-avisos-service';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, PILL, withOpacity } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { StatusBar } from 'expo-status-bar';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

/** 'HH:MM[:SS]' → hora entera (fallback def). */
function hourOf(t: string | null, def: number): number {
  const m = t ? /^(\d{1,2}):/.exec(t) : null;
  return m ? Math.min(23, parseInt(m[1], 10)) : def;
}

const fmtHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function SettingsNotificationsScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // MB-31B: pantalla migrada — superficies/texto del tema; el lima de radios
  // y switches es indicador (no texto) y se queda en los dos modos.
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const thCard = { backgroundColor: tokens.card, borderColor: tokens.borde };
  const thDesc = { color: dark ? tokens.textoTenue : tokens.textoSecundario };
  const switchTheme = {
    trackColor: { false: tokens.bordeMarcado, true: withOpacity(ATP_BRAND.lime, 0.5) },
  } as const;
  // El gris del thumb apagado de siempre = el #666 canónico del DS (PILL).
  const thumbOff = dark ? PILL.textColor : tokens.flotante;
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
    if (!ok) { setPrefs(prev); return; }
    // MB-23 P3: EL MAESTRO MANDA también sobre los avisos por app — cambiar
    // modo o silencio re-agenda (o cancela) los locales ya programados.
    syncAppAvisos(user.id, null).catch(() => {});
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
    <ThemeReady>
    <ScrollView
      style={[s.screen, { backgroundColor: tokens.fondo }]}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={tokens.texto} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[s.title, { color: tokens.texto }]}>Notificaciones</EliteText>
          <EliteText style={[s.subtitle, { color: tokens.textoSecundario }]}>Decide qué te interrumpe y cuándo.</EliteText>
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
              style={[s.modeRow, thCard, selected && s.modeRowActive]}
            >
              <View style={[s.radio, { borderColor: tokens.bordeMarcado }, selected && s.radioOn]}>
                {selected && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                {/* SIMPLE (17-ago-2026): aquí iba un badge "PRO" sobre Adaptive
                    ARGOS. Era una promesa falsa desde el pivote: el modo se podía
                    seleccionar sin pagar nada, así que el badge insinuaba un muro
                    que no existía. Con una sola membresía no hay nada que marcar
                    como PRO, porque todo lo es. */}
                <EliteText style={[s.rowTitle, { color: tokens.texto }]}>{m.title}</EliteText>
                <EliteText style={[s.rowDesc, thDesc]}>{m.description}</EliteText>
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
            <View key={c.key} style={[s.toggleRow, thCard, disabled && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.rowTitle, { color: tokens.texto }]}>{c.title}</EliteText>
                <EliteText style={[s.rowDesc, thDesc]}>{disabled ? 'Silenciado por el modo Silent' : c.description}</EliteText>
              </View>
              <Switch
                value={(prefs?.[c.column] as boolean) ?? true}
                onValueChange={(v) => patch({ [c.column]: v } as Partial<NotificationPrefs>)}
                disabled={!prefs || disabled}
                {...switchTheme}
                thumbColor={(prefs?.[c.column] as boolean) ? ATP_BRAND.lime : thumbOff}
              />
            </View>
          );
        })}
      </Animated.View>

      {/* ── Quiet hours ── */}
      <Animated.View entering={FadeInUp.delay(190).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Horas de silencio</SectionTitle>
        <View style={[s.toggleRow, thCard]}>
          <View style={{ flex: 1 }}>
            <EliteText style={[s.rowTitle, { color: tokens.texto }]}>Quiet hours</EliteText>
            <EliteText style={[s.rowDesc, thDesc]}>
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
            {...switchTheme}
            thumbColor={quietEnabled ? ATP_BRAND.lime : thumbOff}
          />
        </View>

        {quietEnabled && (
          <View style={[s.hoursCard, thCard]}>
            {([['start', 'DESDE', quietStart], ['end', 'HASTA', quietEnd]] as const).map(([which, label, value]) => (
              <View key={which} style={s.hourRow}>
                <EliteText style={[s.hourLabel, thDesc]}>{label}</EliteText>
                <View style={s.stepper}>
                  <Pressable onPress={() => stepHour(which, -1)} hitSlop={8} style={[s.stepBtn, { backgroundColor: tokens.hundido, borderColor: tokens.borde }]}>
                    <Ionicons name="remove" size={16} color={tokens.texto} />
                  </Pressable>
                  <EliteText style={[s.hourValue, { color: tokens.texto }]}>{fmtHour(value)}</EliteText>
                  <Pressable onPress={() => stepHour(which, 1)} hitSlop={8} style={[s.stepBtn, { backgroundColor: tokens.hundido, borderColor: tokens.borde }]}>
                    <Ionicons name="add" size={16} color={tokens.texto} />
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
        <View style={[s.toggleRow, thCard]}>
          <View style={{ flex: 1 }}>
            <EliteText style={[s.rowTitle, { color: tokens.texto }]}>DND durante consulta</EliteText>
            <EliteText style={[s.rowDesc, thDesc]}>
              Silencio automático mientras estás en consulta con tu clínico (llega con V1.5).
            </EliteText>
          </View>
          <Switch
            value={prefs?.dnd_during_consultation ?? true}
            onValueChange={(v) => patch({ dnd_during_consultation: v })}
            disabled={!prefs}
            {...switchTheme}
            thumbColor={prefs?.dnd_during_consultation ? ATP_BRAND.lime : thumbOff}
          />
        </View>
      </Animated.View>
    </ScrollView>
    </ThemeReady>
  );
}

// MB-31B: solo layout + acentos de marca; el color vivo entra inline.
const s = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 4 },
  modeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  modeRowActive: { borderColor: withOpacity(ATP_BRAND.lime, 0.5) },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: ATP_BRAND.lime },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ATP_BRAND.lime },
  rowTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  rowDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2, lineHeight: 16 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  hoursCard: {
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, gap: 12,
  },
  hourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hourLabel: { fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  hourValue: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, minWidth: 56, textAlign: 'center' },
});
