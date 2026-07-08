/**
 * AJUSTES › CONEXIONES (#137) — coach, atletas, wearables y afiliados.
 * (Movido del monolito: secciones CONECTAR CON COACH + SOY COACH + DISPOSITIVOS.)
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, TextInput, Alert, Share, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
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
import { SectionLabel, Divider, ConnectionCard, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { Colors, Fonts, Spacing, Radius, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, TEXT_COLORS } from '@/src/constants/brand';

const COACH_TEAL = CATEGORY_COLORS.metrics;

export default function SettingsConexionesScreen() {
  const router = useRouter();
  const [coachCode, setCoachCode] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<CoachConnection[]>([]);
  const [clients, setClients] = useState<CoachConnection[]>([]);
  const [connectCode, setConnectCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useFocusEffect(useCallback(() => { loadCoachData(); }, []));

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
      Alert.alert('Vinculado', `Ahora trabajas con ${result.coach_name}.`);
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
    Alert.alert('Desvincular coach', `¿Dejar de trabajar con ${c.profile_name}?`, [
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
    <View style={ui.screenRoot}>
      <StatusBar style="light" />
      <ScreenHeader title="Conexiones" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══════ CONECTAR CON COACH ══════ */}
        <Animated.View entering={FadeInUp.delay(80).springify()}>
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
        <Animated.View entering={FadeInUp.delay(150).springify()}>
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

        {/* ══════ DISPOSITIVOS ══════ */}
        <Animated.View entering={FadeInUp.delay(220).springify()}>
          <SectionLabel>DISPOSITIVOS</SectionLabel>
          <View style={styles.wearableCard}>
            <View style={styles.wearableHeader}>
              <Ionicons name="watch-outline" size={22} color={CATEGORY_COLORS.metrics} />
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={styles.wearableTitle}>
                  Wearables y dispositivos
                </EliteText>
                <EliteText variant="caption" style={styles.wearableDesc}>
                  Conecta Apple Health o Google Health para datos automáticos de sueño, pasos, FC y HRV.
                </EliteText>
              </View>
            </View>
            {/* Wearables desactivados temporalmente */}
            <View style={[styles.wearableConnectBtn, { opacity: 0.5 }]}>
              <Ionicons name="bluetooth-outline" size={18} color={Colors.textSecondary} />
              <EliteText variant="body" style={[styles.wearableConnectBtnText, { color: Colors.textSecondary }]}>
                Próximamente
              </EliteText>
            </View>
            <EliteText variant="caption" style={styles.wearableCompatible}>
              Apple Health · Google Health · Oura · Garmin · Samsung · Whoop
            </EliteText>
          </View>
          <Divider />
        </Animated.View>

        {/* ══════ AFILIADOS ══════ */}
        <Animated.View entering={FadeInUp.delay(280).springify()}>
          <SectionLabel>PROGRAMA DE AFILIADOS</SectionLabel>
          <SettingRow
            icon="briefcase-outline"
            label="Programa de afiliados"
            sub="Clínicos, coaches, centros y creadores"
            onPress={() => { haptic.medium(); router.push('/afiliados/aplicar' as any); }}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  coachSection: {
    gap: Spacing.sm,
  },
  coachHint: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.xxl,
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
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.display,
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
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.md,
  },
  webHint: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  connectionList: {
    gap: Spacing.xs,
  },
  connectionListLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  wearableCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  wearableHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  wearableTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  wearableDesc: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
    lineHeight: 16,
  },
  wearableConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: CATEGORY_COLORS.metrics + '10',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: CATEGORY_COLORS.metrics + '30',
    paddingVertical: Spacing.md,
  },
  wearableConnectBtnText: {
    color: CATEGORY_COLORS.metrics,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  wearableCompatible: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
