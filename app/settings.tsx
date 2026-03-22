import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { EliteToggle } from '@/components/elite-toggle';
import { useSettings, type VoiceLanguage, type SoundStyle } from '@/src/contexts/settings-context';
import { useAuth } from '@/src/contexts/auth-context';
import { speak } from '@/src/utils/speech';
import { playBeep, initAudio, setSoundStyle } from '@/src/utils/sounds';
import { vibrateMedium } from '@/src/utils/haptics';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

// === OPCIONES ===

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

// === PANTALLA ===

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSetting } = useSettings();
  const { user, signOut } = useAuth();

  return (
    <ScreenContainer centered={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">AJUSTES</EliteText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cuenta del usuario */}
        <View style={styles.accountBox}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.neonGreen} />
          <View style={styles.accountInfo}>
            <EliteText variant="body" style={styles.accountName}>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
            </EliteText>
            <EliteText variant="caption" style={styles.accountEmail}>
              {user?.email}
            </EliteText>
          </View>
        </View>
        {/* ── Voz y audio ── */}
        <SectionLabel>VOZ Y AUDIO</SectionLabel>

        <EliteToggle
          label="Voz del timer"
          description="Anuncia ejercicios y rondas"
          value={settings.voiceEnabled}
          onValueChange={v => updateSetting('voiceEnabled', v)}
        />

        {settings.voiceEnabled && (
          <>
            <EliteText variant="caption" style={styles.chipLabel}>IDIOMA DE VOZ</EliteText>
            <View style={styles.chipRow}>
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
          onValueChange={v => updateSetting('countdownSpoken', v)}
        />

        <Divider />

        {/* ── Sonidos ── */}
        <SectionLabel>SONIDOS</SectionLabel>

        <EliteToggle
          label="Sonidos de transición"
          description="Beep al cambiar de paso"
          value={settings.soundsEnabled}
          onValueChange={v => updateSetting('soundsEnabled', v)}
        />

        {settings.soundsEnabled && (
          <>
            <EliteText variant="caption" style={styles.chipLabel}>ESTILO DE SONIDO</EliteText>
            <View style={styles.chipRow}>
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

        <Divider />

        {/* ── Vibración ── */}
        <SectionLabel>VIBRACIÓN</SectionLabel>

        <EliteToggle
          label="Vibración"
          description="Al cambiar de paso y cuenta regresiva"
          value={settings.vibrationEnabled}
          onValueChange={v => updateSetting('vibrationEnabled', v)}
        />

        <Divider />

        {/* ── Pantalla ── */}
        <SectionLabel>PANTALLA</SectionLabel>

        <EliteToggle
          label="Mantener pantalla encendida"
          description="Mientras el timer corre"
          value={settings.keepAwake}
          onValueChange={v => updateSetting('keepAwake', v)}
        />

        <Divider />

        {/* ── Zona de prueba ── */}
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

        <Divider />

        {/* ── Sesión ── */}
        <View style={styles.logoutContainer}>
          <EliteButton
            label="CERRAR SESIÓN"
            onPress={async () => { await signOut(); router.replace('/login'); }}
            variant="outline"
            style={styles.logoutButton}
          />
        </View>

        {/* Espacio inferior */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === COMPONENTES AUXILIARES ===

function SectionLabel({ children }: { children: string }) {
  return (
    <EliteText variant="label" style={styles.sectionLabel}>{children}</EliteText>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <EliteText
        variant="caption"
        style={[styles.chipText, selected && styles.chipTextSelected]}
      >
        {label}
      </EliteText>
    </Pressable>
  );
}

function TestButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.testButton, pressed && styles.testButtonPressed]}
    >
      <Ionicons name={icon as any} size={22} color={Colors.neonGreen} />
      <EliteText variant="caption" style={styles.testButtonLabel}>{label}</EliteText>
    </Pressable>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  sectionLabel: {
    letterSpacing: 3,
    color: Colors.neonGreen,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceLight,
    marginTop: Spacing.md,
  },
  // Chips
  chipLabel: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '15',
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  chipTextSelected: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },
  // Volumen
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
  // Zona de prueba
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
  testButton: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    minWidth: 70,
  },
  testButtonPressed: {
    backgroundColor: Colors.surfaceLight,
  },
  testButtonLabel: {
    color: Colors.neonGreen,
  },
  // Cuenta
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontFamily: Fonts.semiBold,
  },
  accountEmail: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Logout
  logoutContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  logoutButton: {
    minWidth: 200,
  },
});
