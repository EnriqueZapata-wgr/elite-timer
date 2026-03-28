import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, Alert, Share } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter, useSegments, useFocusEffect } from 'expo-router';
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
import {
  generateCoachCode,
  connectToCoach,
  getMyCoaches,
  getMyClients,
  getCoachCode,
  disconnectCoach,
  disconnectClient,
  type CoachConnection,
} from '@/src/services/coach-service';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_COLORS, TEXT_COLORS } from '@/src/constants/brand';

// === CONSTANTES ===

const COACH_TEAL = CATEGORY_COLORS.metrics;

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
  const segments = useSegments();
  const isInTabs = segments[0] === '(tabs)';
  const { settings, updateSetting } = useSettings();
  const { user, signOut } = useAuth();

  // Estado coach
  const [coachCode, setCoachCode] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<CoachConnection[]>([]);
  const [clients, setClients] = useState<CoachConnection[]>([]);
  const [connectCode, setConnectCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Cargar datos de coach al enfocar
  useFocusEffect(
    useCallback(() => {
      loadCoachData();
    }, [])
  );

  const loadCoachData = async () => {
    try {
      const [code, myCoaches, myClients] = await Promise.all([
        getCoachCode().catch(() => null),
        getMyCoaches().catch(() => []),
        getMyClients().catch(() => []),
      ]);
      setCoachCode(code);
      setCoaches(myCoaches);
      setClients(myClients);
    } catch { /* silenciar */ }
  };

  const handleConnect = async () => {
    const code = connectCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert('Código inválido', 'El código de coach tiene 6 caracteres.');
      return;
    }
    setConnecting(true);
    try {
      const result = await connectToCoach(code);
      Alert.alert('Conectado', `Ahora estás conectado con ${result.coach_name}.`);
      setConnectCode('');
      loadCoachData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo conectar.');
    } finally {
      setConnecting(false);
    }
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const code = await generateCoachCode();
      setCoachCode(code);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo generar el código.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!coachCode) return;
    try {
      await Share.share({ message: `Mi código de coach ATP: ${coachCode}` });
    } catch { /* cancelado */ }
  };

  const handleDisconnectCoach = (c: CoachConnection) => {
    Alert.alert('Desconectar coach', `¿Dejar de estar conectado con ${c.profile_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desconectar', style: 'destructive', onPress: async () => {
        await disconnectCoach(c.coach_id).catch(() => {});
        loadCoachData();
      }},
    ]);
  };

  const handleDisconnectClient = (c: CoachConnection) => {
    Alert.alert('Desconectar cliente', `¿Desvincular a ${c.profile_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desconectar', style: 'destructive', onPress: async () => {
        await disconnectClient(c.client_id).catch(() => {});
        loadCoachData();
      }},
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <ScreenContainer centered={false}>
      {/* Header */}
      <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.header}>
        {!isInTabs && (
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
          </Pressable>
        )}
        <EliteText variant="title">{isInTabs ? 'PERFIL' : 'AJUSTES'}</EliteText>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cuenta del usuario */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.accountBox}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.neonGreen} />
          <View style={styles.accountInfo}>
            <EliteText variant="body" style={styles.accountName}>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
            </EliteText>
            <EliteText variant="caption" style={styles.accountEmail}>
              {user?.email}
            </EliteText>
          </View>
        </Animated.View>

        {/* ══════ CONECTAR CON COACH ══════ */}
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <SectionLabel color={COACH_TEAL}>CONECTAR CON COACH</SectionLabel>

          <View style={styles.coachSection}>
            <EliteText variant="caption" style={styles.coachHint}>
              Ingresa el código de 6 dígitos de tu coach
            </EliteText>
            <View style={styles.connectRow}>
              <TextInput
                style={styles.codeInput}
                value={connectCode}
                onChangeText={t => setConnectCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                placeholderTextColor={Colors.textSecondary + '40'}
                maxLength={6}
                autoCapitalize="characters"
              />
              <Pressable
                onPress={handleConnect}
                disabled={connecting || connectCode.length < 6}
                style={[styles.connectBtn, (connecting || connectCode.length < 6) && { opacity: 0.4 }]}
              >
                <EliteText variant="caption" style={styles.connectBtnText}>
                  {connecting ? 'CONECTANDO...' : 'CONECTAR'}
                </EliteText>
              </Pressable>
            </View>

            {/* Lista de coaches conectados */}
            {coaches.length > 0 && (
              <View style={styles.connectionList}>
                <EliteText variant="caption" style={styles.connectionListLabel}>MIS COACHES</EliteText>
                {coaches.map(c => (
                  <ConnectionCard
                    key={c.id}
                    name={c.profile_name}
                    date={formatDate(c.connected_at)}
                    color={COACH_TEAL}
                    onDisconnect={() => handleDisconnectCoach(c)}
                  />
                ))}
              </View>
            )}
          </View>

          <Divider />
        </Animated.View>

        {/* ══════ SOY COACH ══════ */}
        <Animated.View entering={FadeInUp.delay(350).springify()}>
          <SectionLabel color={COACH_TEAL}>SOY COACH</SectionLabel>

          <View style={styles.coachSection}>
            {coachCode ? (
              <>
                <EliteText variant="caption" style={styles.coachHint}>
                  Comparte este código con tus atletas
                </EliteText>
                <View style={styles.codeDisplay}>
                  <EliteText style={styles.codeDisplayText}>{coachCode}</EliteText>
                  <Pressable onPress={handleCopyCode} style={styles.copyBtn}>
                    <Ionicons name="share-outline" size={18} color={COACH_TEAL} />
                    <EliteText variant="caption" style={styles.copyBtnText}>Compartir</EliteText>
                  </Pressable>
                </View>

                {/* Lista de clientes */}
                {clients.length > 0 && (
                  <View style={styles.connectionList}>
                    <EliteText variant="caption" style={styles.connectionListLabel}>
                      MIS ATLETAS ({clients.length})
                    </EliteText>
                    {clients.map(c => (
                      <ConnectionCard
                        key={c.id}
                        name={c.profile_name}
                        date={formatDate(c.connected_at)}
                        color={COACH_TEAL}
                        onDisconnect={() => handleDisconnectClient(c)}
                      />
                    ))}
                  </View>
                )}

                <EliteText variant="caption" style={styles.webHint}>
                  Accede al panel de coach desde la versión web
                </EliteText>
              </>
            ) : (
              <>
                <EliteText variant="caption" style={styles.coachHint}>
                  Genera un código para que tus atletas se conecten contigo
                </EliteText>
                <Pressable
                  onPress={handleGenerateCode}
                  disabled={generatingCode}
                  style={[styles.generateBtn, generatingCode && { opacity: 0.5 }]}
                >
                  <Ionicons name="key-outline" size={18} color={COACH_TEAL} />
                  <EliteText variant="body" style={styles.generateBtnText}>
                    {generatingCode ? 'Generando...' : 'Generar mi código de coach'}
                  </EliteText>
                </Pressable>
              </>
            )}
          </View>

          <Divider />
        </Animated.View>

        {/* ── Voz y audio ── */}
        <Animated.View entering={FadeInUp.delay(450).springify()}>
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
        </Animated.View>

        {/* ── Sonidos ── */}
        <Animated.View entering={FadeInUp.delay(550).springify()}>
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
        </Animated.View>

        {/* ── Vibración ── */}
        <Animated.View entering={FadeInUp.delay(650).springify()}>
          <SectionLabel>VIBRACIÓN</SectionLabel>

          <EliteToggle
            label="Vibración"
            description="Al cambiar de paso y cuenta regresiva"
            value={settings.vibrationEnabled}
            onValueChange={v => updateSetting('vibrationEnabled', v)}
          />

          <Divider />
        </Animated.View>

        {/* ── Pantalla ── */}
        <Animated.View entering={FadeInUp.delay(750).springify()}>
          <SectionLabel>PANTALLA</SectionLabel>

          <EliteToggle
            label="Mantener pantalla encendida"
            description="Mientras el timer corre"
            value={settings.keepAwake}
            onValueChange={v => updateSetting('keepAwake', v)}
          />

          <Divider />
        </Animated.View>

        {/* ── Zona de prueba ── */}
        <Animated.View entering={FadeInUp.delay(850).springify()}>
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
        </Animated.View>

        {/* ── Sesión ── */}
        <Animated.View entering={FadeInUp.delay(950).springify()} style={styles.logoutContainer}>
          <Pressable
            onPress={() => {
              if (typeof window !== 'undefined' && window.confirm) {
                if (!window.confirm('¿Seguro que quieres cerrar sesión?')) return;
                signOut().then(() => router.replace('/login'));
              } else {
                Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Cerrar sesión', style: 'destructive', onPress: async () => { await signOut(); router.replace('/login'); } },
                ]);
              }
            }}
            style={styles.logoutButton}
          >
            <EliteText variant="body" style={styles.logoutText}>Cerrar sesión</EliteText>
          </Pressable>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === COMPONENTES AUXILIARES ===

function SectionLabel({ children, color }: { children: string; color?: string }) {
  return (
    <EliteText variant="label" style={[styles.sectionLabel, color ? { color } : undefined]}>
      {children}
    </EliteText>
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

function ConnectionCard({ name, date, color, onDisconnect }: {
  name: string; date: string; color: string; onDisconnect: () => void;
}) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={styles.connectionCard}>
      <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
        <EliteText style={[styles.avatarText, { color }]}>{initials}</EliteText>
      </View>
      <View style={styles.connectionInfo}>
        <EliteText variant="body" style={styles.connectionName}>{name}</EliteText>
        <EliteText variant="caption" style={styles.connectionDate}>Desde {date}</EliteText>
      </View>
      <Pressable onPress={onDisconnect} hitSlop={8} style={styles.disconnectBtn}>
        <Ionicons name="close-circle-outline" size={20} color={Colors.textSecondary} />
      </Pressable>
    </View>
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

  // ── Coach sections ──
  coachSection: {
    gap: Spacing.sm,
  },
  coachHint: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  connectRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
  },
  connectBtn: {
    backgroundColor: COACH_TEAL,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.sm,
  },
  connectBtnText: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
  },
  codeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: COACH_TEAL + '30',
    padding: Spacing.md,
  },
  codeDisplayText: {
    fontFamily: 'monospace',
    fontSize: 32,
    letterSpacing: 10,
    color: COACH_TEAL,
    fontWeight: '800',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: COACH_TEAL + '30',
  },
  copyBtnText: {
    color: COACH_TEAL,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: COACH_TEAL + '10',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: COACH_TEAL + '30',
    padding: Spacing.md,
  },
  generateBtnText: {
    color: COACH_TEAL,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  webHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // ── Connections list ──
  connectionList: {
    gap: Spacing.xs,
  },
  connectionListLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  connectionDate: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  disconnectBtn: {
    padding: Spacing.xs,
  },

  // ── Existing styles ──
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
  logoutContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  logoutButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  logoutText: {
    color: Colors.error,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
});
