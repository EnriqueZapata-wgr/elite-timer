/**
 * AJUSTES › EXPERIENCIA (#137) — tema, idioma, unidades, voz, sonidos,
 * vibración, pantalla y zona de prueba. (Antes: 6 secciones del monolito.)
 */
import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { EliteToggle } from '@/components/elite-toggle';
import { useSettings, type VoiceLanguage, type SoundStyle } from '@/src/contexts/settings-context';
import { loadSoundPref, setSoundEnabled as persistSoundPref } from '@/src/components/edad-atp/edad-sound';
import { speak } from '@/src/utils/speech';
import { playBeep, initAudio, setSoundStyle } from '@/src/utils/sounds';
import { vibrateMedium, haptic } from '@/src/utils/haptics';
import { SectionLabel, Divider, Chip, TestButton, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { Colors, Spacing, Radius } from '@/constants/theme';

const LANGUAGES: { value: VoiceLanguage; label: string }[] = [
  { value: 'es-MX', label: 'Español (MX)' },
  { value: 'en-US', label: 'English (US)' },
];

const SOUND_STYLES: { value: SoundStyle; label: string }[] = [
  { value: 'digital', label: 'Beep digital' },
  { value: 'boxing', label: 'Campana boxeo' },
  { value: 'whistle', label: 'Silbato' },
  { value: 'military', label: 'Militar' },
  { value: 'silent', label: 'Silencioso' },
];

export default function SettingsExperienciaScreen() {
  const router = useRouter();
  const { settings, updateSetting } = useSettings();
  const [edadSound, setEdadSound] = useState(true);
  useEffect(() => { loadSoundPref().then(setEdadSound); }, []);

  return (
    <View style={ui.screenRoot}>
      <StatusBar style="light" />
      <ScreenHeader title="Experiencia" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── App (display-only por ahora) ── */}
        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <SectionLabel>APP</SectionLabel>
          <SettingRow icon="moon-outline" label="Tema"
            right={<EliteText variant="caption" style={{ color: Colors.neonGreen }}>Oscuro</EliteText>} />
          <SettingRow icon="language-outline" label="Idioma"
            right={<EliteText variant="caption" style={{ color: Colors.neonGreen }}>Español</EliteText>} />
          <SettingRow icon="resize-outline" label="Unidades"
            right={<EliteText variant="caption" style={{ color: Colors.neonGreen }}>Métrico</EliteText>} />
          <Divider />
        </Animated.View>

        {/* ── Voz y audio ── */}
        <Animated.View entering={FadeInUp.delay(130).springify()}>
          <SectionLabel>VOZ Y AUDIO</SectionLabel>
          <EliteToggle
            label="Voz del timer"
            description="Anuncia ejercicios y rondas"
            value={settings.voiceEnabled}
            onValueChange={v => { haptic.light(); updateSetting('voiceEnabled', v); }}
          />
          {settings.voiceEnabled && (
            <>
              <EliteText variant="caption" style={ui.chipLabel}>IDIOMA DE VOZ</EliteText>
              <View style={ui.chipRow}>
                {LANGUAGES.map(lang => (
                  <Chip
                    key={lang.value}
                    label={lang.label}
                    selected={settings.voiceLanguage === lang.value}
                    onPress={() => updateSetting('voiceLanguage', lang.value)}
                  />
                ))}
              </View>
            </>
          )}
          <EliteToggle
            label="Cuenta regresiva hablada"
            description='"3, 2, 1" al final de cada paso'
            value={settings.countdownSpoken}
            onValueChange={v => { haptic.light(); updateSetting('countdownSpoken', v); }}
          />
          <Divider />
        </Animated.View>

        {/* ── Sonidos ── */}
        <Animated.View entering={FadeInUp.delay(180).springify()}>
          <SectionLabel>SONIDOS</SectionLabel>
          <EliteToggle
            label="Sonidos de transición"
            description="Beep al cambiar de paso"
            value={settings.soundsEnabled}
            onValueChange={v => { haptic.light(); updateSetting('soundsEnabled', v); }}
          />
          {settings.soundsEnabled && (
            <>
              <EliteText variant="caption" style={ui.chipLabel}>ESTILO DE SONIDO</EliteText>
              <View style={ui.chipRow}>
                {SOUND_STYLES.map(style => (
                  <Chip
                    key={style.value}
                    label={style.label}
                    selected={settings.soundStyle === style.value}
                    onPress={() => updateSetting('soundStyle', style.value)}
                  />
                ))}
              </View>
              <View style={styles.volumeRow}>
                <EliteText variant="body">Volumen</EliteText>
                <View style={styles.volumeControl}>
                  <Pressable onPress={() => updateSetting('soundVolume', Math.max(0, settings.soundVolume - 10))}>
                    <Ionicons name="remove-circle-outline" size={24} color={Colors.neonGreen} />
                  </Pressable>
                  <EliteText variant="subtitle" style={styles.volumeValue}>
                    {settings.soundVolume}%
                  </EliteText>
                  <Pressable onPress={() => updateSetting('soundVolume', Math.min(100, settings.soundVolume + 10))}>
                    <Ionicons name="add-circle-outline" size={24} color={Colors.neonGreen} />
                  </Pressable>
                </View>
              </View>
            </>
          )}
          {/* #69: sonidos de la cinemática Edad ATP */}
          <SettingRow
            icon="musical-notes-outline"
            label="Sonidos Edad ATP"
            sub="Ticks del cálculo + chime del reveal"
            right={
              <Switch
                value={edadSound}
                onValueChange={(v) => { haptic.light(); setEdadSound(v); persistSoundPref(v); }}
                trackColor={{ true: Colors.neonGreen, false: '#333' }}
              />
            }
          />
          <Divider />
        </Animated.View>

        {/* ── Vibración ── */}
        <Animated.View entering={FadeInUp.delay(230).springify()}>
          <SectionLabel>VIBRACIÓN</SectionLabel>
          <EliteToggle
            label="Vibración"
            description="Al cambiar de paso y cuenta regresiva"
            value={settings.vibrationEnabled}
            onValueChange={v => { haptic.light(); updateSetting('vibrationEnabled', v); }}
          />
          <Divider />
        </Animated.View>

        {/* ── Pantalla ── */}
        <Animated.View entering={FadeInUp.delay(280).springify()}>
          <SectionLabel>PANTALLA</SectionLabel>
          <EliteToggle
            label="Mantener pantalla encendida"
            description="Mientras el timer corre"
            value={settings.keepAwake}
            onValueChange={v => { haptic.light(); updateSetting('keepAwake', v); }}
          />
          <Divider />
        </Animated.View>

        {/* ── Zona de prueba ── */}
        <Animated.View entering={FadeInUp.delay(330).springify()}>
          <View style={styles.testBox}>
            <EliteText variant="caption" style={styles.testLabel}>PROBAR</EliteText>
            <View style={styles.testRow}>
              <TestButton
                icon="mic-outline"
                label="Voz"
                onPress={() => speak('Probando la voz del timer', settings.voiceLanguage)}
              />
              <TestButton
                icon="volume-high-outline"
                label="Sonido"
                onPress={() => { initAudio(); setSoundStyle(settings.soundStyle); playBeep(settings.soundVolume / 100); }}
              />
              <TestButton
                icon="phone-portrait-outline"
                label="Vibración"
                onPress={() => vibrateMedium()}
              />
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  volumeValue: {
    color: Colors.neonGreen,
    fontSize: 18,
    minWidth: 45,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  testBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  testLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
