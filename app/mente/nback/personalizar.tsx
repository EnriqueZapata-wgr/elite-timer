/**
 * N-Back — Personalizar (V1.5 #C7): toda la config del módulo agrupada fuera
 * de la home (que queda de foco). Client-only vía AsyncStorage
 * (getNBackSettings/saveNBackSettings) — sin migración.
 *
 * Toggles nuevos V1.5: flash visual (#C8, separado del háptico) y contador de
 * turno (#C9) — a Enrique le gustan pero deben poder apagarse.
 */
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { haptic } from '@/src/utils/haptics';
import { NBACK_CONFIG, type NBackResumeMode } from '@/src/services/nback-core';
import {
  getNBackSettings, saveNBackSettings, DEFAULT_NBACK_SETTINGS, type NBackSettings,
} from '@/src/services/nback-service';
import { ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

export default function NBackPersonalizarScreen() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState<NBackSettings>(DEFAULT_NBACK_SETTINGS);

  useEffect(() => {
    let alive = true;
    getNBackSettings().then(s => { if (alive) setSettings(s); });
    return () => { alive = false; };
  }, []);

  const update = useCallback((patch: Partial<NBackSettings>) => {
    haptic.light();
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveNBackSettings(next);
      return next;
    });
  }, []);

  const toggle = (key: 'feedbackSound' | 'feedbackFlash' | 'showTurnNumber') => (
    <AnimatedPressable
      style={[s.pill, settings[key] && s.pillActive]}
      onPress={() => update({ [key]: !settings[key] } as Partial<NBackSettings>)}
    >
      <EliteText style={[s.pillText, settings[key] && s.pillTextActive]}>
        {settings[key] ? 'ON' : 'OFF'}
      </EliteText>
    </AnimatedPressable>
  );

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <StickyPillarBanner scrolled={scrolled} onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
        contentContainerStyle={s.scroll}
      >
        <View style={s.header}>
          <EliteText style={s.kicker}>N-BACK · AJUSTES</EliteText>
          <EliteText style={s.title}>Personalizar</EliteText>
        </View>

        <View style={s.body}>
          <EliteText style={s.sectionLabel}>JUEGO</EliteText>

          <View style={s.settingRow}>
            <EliteText style={s.settingLabel}>Velocidad</EliteText>
            <View style={s.pillGroup}>
              {NBACK_CONFIG.SPEEDS.map(sp => (
                <AnimatedPressable
                  key={sp}
                  style={[s.pill, settings.speed === sp && s.pillActive]}
                  onPress={() => update({ speed: sp })}
                >
                  <EliteText style={[s.pillText, settings.speed === sp && s.pillTextActive]}>{sp}x</EliteText>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          <View style={s.settingRowColumn}>
            <EliteText style={s.settingLabel}>Arrancar sesión en</EliteText>
            <View style={[s.pillGroup, { marginTop: 8 }]}>
              {([
                { mode: 'last', label: 'Último N' },
                { mode: 'best', label: 'Mi mejor N' },
                { mode: 'restart', label: 'Desde 1' },
              ] as { mode: NBackResumeMode; label: string }[]).map(({ mode, label }) => (
                <AnimatedPressable
                  key={mode}
                  style={[s.pill, settings.resumeMode === mode && s.pillActive]}
                  onPress={() => update({ resumeMode: mode })}
                >
                  <EliteText style={[s.pillText, settings.resumeMode === mode && s.pillTextActive]}>{label}</EliteText>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          <EliteText style={s.sectionLabel}>FEEDBACK</EliteText>

          <View style={s.settingRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <EliteText style={s.settingLabel}>Flash acierto/error</EliteText>
              <EliteText style={s.settingHint}>Verde al acertar, rojo al fallar: apágalo si te distrae.</EliteText>
            </View>
            {toggle('feedbackFlash')}
          </View>

          <View style={s.settingRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <EliteText style={s.settingLabel}>Vibración acierto/error</EliteText>
              <EliteText style={s.settingHint}>Háptico distinto al acertar y al fallar.</EliteText>
            </View>
            {toggle('feedbackSound')}
          </View>

          <View style={s.settingRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <EliteText style={s.settingLabel}>Contador de turno</EliteText>
              <EliteText style={s.settingHint}>El “7/22” arriba a la derecha durante el round.</EliteText>
            </View>
            {toggle('showTurnNumber')}
          </View>

          <View style={{ height: Spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: Spacing.xxl },
  header: { paddingTop: 108, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  kicker: { color: '#7F77DD', fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { color: '#fff', fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: 1, marginTop: 2 },
  body: { paddingHorizontal: Spacing.md },

  sectionLabel: {
    color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2,
    marginTop: Spacing.md, marginBottom: Spacing.xs,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  settingRowColumn: { paddingVertical: 12 },
  settingLabel: { color: TEXT.primary, fontSize: FontSizes.md, fontFamily: Fonts.regular },
  settingHint: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  pillGroup: { flexDirection: 'row', gap: 8 },
  pill: {
    borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'transparent',
  },
  pillActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.15), borderColor: withOpacity(ATP_BRAND.lime, 0.5) },
  pillText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  pillTextActive: { color: ATP_BRAND.lime },
});
