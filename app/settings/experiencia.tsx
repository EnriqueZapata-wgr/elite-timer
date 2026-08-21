/**
 * AJUSTES › EXPERIENCIA (#137) — tema, idioma, unidades, voz, sonidos,
 * vibración, pantalla y zona de prueba. (Antes: 6 secciones del monolito.)
 */
import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Switch, StyleSheet, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ORB_TOUR_DONE_KEY, ORB_TOUR_RESTART_EVENT } from '@/src/components/tour/orb-tour-core';
import { TUTORIAL_POR_PANTALLA } from '@/src/constants/flags';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { EliteText } from '@/components/elite-text';
import { EliteToggle } from '@/components/elite-toggle';
import { useSettings, type VoiceLanguage, type SoundStyle, type FitnessVoiceMode } from '@/src/contexts/settings-context';
import { loadSoundPref, setSoundEnabled as persistSoundPref } from '@/src/components/edad-atp/edad-sound';
import { speak } from '@/src/utils/speech';
import { playBeep, initAudio, setSoundStyle } from '@/src/utils/sounds';
import { vibrateMedium, haptic } from '@/src/utils/haptics';
import { SectionLabel, Divider, Chip, TestButton, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import type { ThemeModeSetting } from '@/src/services/theme/theme-mode-core';
import { minutesToHHMM } from '@/src/services/night-filter-core';
import { ATP_BRAND } from '@/src/constants/brand';

const LANGUAGES: { value: VoiceLanguage; label: string }[] = [
  { value: 'es-MX', label: 'Español (MX)' },
  { value: 'en-US', label: 'English (US)' },
];

// MB-3.5 #6: voz de los métodos/runner de Fitness — opcional, no se quita.
const FITNESS_VOICE_MODES: { value: FitnessVoiceMode; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'hitos', label: 'Solo hitos' },
  { value: 'off', label: 'Apagada' },
];

// MB-31A: los cuatro modos del manual 3.7b. Adaptativo NO es "como el
// teléfono": usa el horario real del usuario (despertar → corte), no el
// atardecer genérico del sistema.
const THEME_MODES: { value: ThemeModeSetting; label: string }[] = [
  { value: 'claro', label: 'Claro' },
  { value: 'oscuro', label: 'Oscuro' },
  { value: 'adaptativo', label: 'Adaptativo' },
  { value: 'sistema', label: 'Como el teléfono' },
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
  const { mode, setMode, veilEnabled, setVeilEnabled, corteMinutes, kind, tokens } = useAppTheme();
  const [edadSound, setEdadSound] = useState(true);
  useEffect(() => { loadSoundPref().then(setEdadSound); }, []);

  // MB-31A: pantalla PILOTO del modo claro (la primera <ThemeReady>): quien
  // elige un tema lo ve actuar aquí mismo. El acento de texto en claro es el
  // teal calibrado, nunca lima (regla 1).
  const acento = kind === 'dark' ? Colors.neonGreen : tokens.tealTexto;
  const labelChips = [ui.chipLabel, { color: tokens.textoSecundario }];

  return (
    <ThemeReady>
    <View style={[ui.screenRoot, { backgroundColor: tokens.fondo }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Experiencia" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── App (display-only por ahora) ── */}
        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <SectionLabel>APP</SectionLabel>
          {/* MB-31A: el selector de tema, ya de verdad. */}
          <EliteText variant="caption" style={labelChips}>TEMA</EliteText>
          <View style={ui.chipRow}>
            {THEME_MODES.map((m) => (
              <Chip
                key={m.value}
                label={m.label}
                selected={mode === m.value}
                onPress={() => { haptic.light(); setMode(m.value); }}
              />
            ))}
          </View>
          {mode === 'adaptativo' ? (
            <EliteText variant="caption" style={[styles.themeNote, { color: tokens.textoSecundario }]}>
              Con tu horario: claro al despertar y oscuro desde tu corte de pantallas
              ({minutesToHHMM(corteMinutes)}), no con el atardecer genérico del sistema.
            </EliteText>
          ) : null}
          {/* Regla de tránsito MB-31A: la nota honesta mientras queden
              pantallas sin migrar. Se retira cuando MB-31B termine. */}
          <EliteText variant="caption" style={[styles.themeNote, { color: tokens.textoSecundario }]}>
            El modo claro va llegando por partes: el marco ya cambia, pero varias
            pantallas siguen en oscuro mientras terminamos la migración.
          </EliteText>
          <SettingRow icon="language-outline" label="Idioma"
            right={<EliteText variant="caption" style={{ color: acento }}>Español</EliteText>} />
          <SettingRow icon="resize-outline" label="Unidades"
            right={<EliteText variant="caption" style={{ color: acento }}>Métrico</EliteText>} />
          {/* 21-ago-2026: la puerta del tutorial. Con la bandera encendida
              lleva al centro de ayuda (las piezas por pantalla); apagada,
              relanza el tour de 12 pasos como siempre. */}
          <SettingRow
            icon="school-outline"
            label={TUTORIAL_POR_PANTALLA ? 'Tutorial' : 'Volver a ver el tutorial'}
            sub="Repite la explicación de cualquier pantalla"
            onPress={async () => {
              haptic.light();
              if (TUTORIAL_POR_PANTALLA) {
                router.push('/tutorial');
                return;
              }
              await AsyncStorage.removeItem(ORB_TOUR_DONE_KEY).catch(() => {});
              DeviceEventEmitter.emit(ORB_TOUR_RESTART_EVENT);
              router.replace('/');
            }}
          />
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
              <EliteText variant="caption" style={labelChips}>IDIOMA DE VOZ</EliteText>
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
          {settings.voiceEnabled && (
            <>
              <EliteText variant="caption" style={labelChips}>VOZ EN FITNESS (MÉTODOS Y SESIÓN)</EliteText>
              <View style={ui.chipRow}>
                {FITNESS_VOICE_MODES.map(mode => (
                  <Chip
                    key={mode.value}
                    label={mode.label}
                    selected={settings.fitnessVoice === mode.value}
                    onPress={() => { haptic.light(); updateSetting('fitnessVoice', mode.value); }}
                  />
                ))}
              </View>
            </>
          )}
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
              <EliteText variant="caption" style={labelChips}>ESTILO DE SONIDO</EliteText>
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
                    <Ionicons name="remove-circle-outline" size={24} color={acento} />
                  </Pressable>
                  <EliteText variant="subtitle" style={[styles.volumeValue, { color: acento }]}>
                    {settings.soundVolume}%
                  </EliteText>
                  <Pressable onPress={() => updateSetting('soundVolume', Math.min(100, settings.soundVolume + 10))}>
                    <Ionicons name="add-circle-outline" size={24} color={acento} />
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
                // El lima del track es relleno de control (indicador), no texto.
                trackColor={{ true: ATP_BRAND.lime, false: tokens.bordeMarcado }}
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
          {/* MB-31A: el velo nocturno DENTRO de la app. OTRO ajuste, no un
              tema: funciona con los cuatro modos y entibia el que esté
              (en claro NO te manda a oscuro). Misma curva que el filtro de
              sistema y la pantalla del buró (night-curve.ts). */}
          <EliteToggle
            label="Filtro nocturno en ATP"
            description={`Entibia la app desde una hora antes de tu corte (${minutesToHHMM(corteMinutes)}), sobre cualquier tema`}
            value={veilEnabled}
            onValueChange={(v) => { haptic.light(); setVeilEnabled(v); }}
          />
          {/* MB-30B: filtro nocturno de sistema (overlay Android / guía iOS).
              Fila inline porque el glifo es una FUNCIÓN y va por AppIcon
              (SettingRow solo dibuja Ionicons y el ratchet lo veta). */}
          <Pressable
            onPress={() => { haptic.light(); router.push('/night-filter'); }}
            style={ui.settingRow}
          >
            <View style={ui.settingRowLeft}>
              <AppIcon name="off-pantallas" size={20} color={tokens.textoSecundario} />
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={ui.settingRowLabel}>Filtro nocturno</EliteText>
                <EliteText variant="caption" style={[ui.settingRowSub, { color: tokens.textoSecundario }]}>
                  Luz cálida sobre todo el teléfono hacia tu corte de pantallas
                </EliteText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.textoSecundario} />
          </Pressable>
          <Divider />
        </Animated.View>

        {/* ── Zona de prueba ── */}
        <Animated.View entering={FadeInUp.delay(330).springify()}>
          <View style={[styles.testBox, { backgroundColor: tokens.card }]}>
            <EliteText variant="caption" style={[styles.testLabel, { color: tokens.textoSecundario }]}>PROBAR</EliteText>
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
    </ThemeReady>
  );
}

const styles = StyleSheet.create({
  themeNote: {
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
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
    fontSize: 18,
    minWidth: 45,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  testBox: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  testLabel: {
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
