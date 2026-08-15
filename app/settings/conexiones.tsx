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
import { ATP_BRAND, CATEGORY_COLORS, TEXT_COLORS } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';

const COACH_TEAL = CATEGORY_COLORS.metrics;

export default function SettingsConexionesScreen() {
  const router = useRouter();
  // MB-31B: pantalla migrada. El teal de coach es color de sección: como
  // TEXTO no llega en claro (regla 3 del manual 3.6) — ahí sube al teal
  // calibrado; como relleno lleva negro encima.
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const tealTexto = dark ? COACH_TEAL : tokens.tealTexto;
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
      // MB-SEC-1 §6: err.message reenvía el error crudo de Postgres/RPC → log
      // interno + copy genérico (no filtrar tabla/columna al usuario).
      console.warn('[conexiones] connectToCoach falló:', err?.message);
      Alert.alert('Error', 'No se pudo conectar. Revisa el código e intenta de nuevo.');
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
      // MB-SEC-1 §6: log interno + copy genérico (sin filtrar detalle del RPC).
      console.warn('[conexiones] generateCoachCode falló:', err?.message);
      Alert.alert('Error', 'No se pudo generar el código. Intenta de nuevo.');
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
    <ThemeReady>
    <View style={[ui.screenRoot, { backgroundColor: tokens.fondo }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScreenHeader title="Conexiones" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══════ CONECTAR CON COACH ══════ */}
        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <SectionLabel color={tealTexto}>CONECTAR CON COACH</SectionLabel>
          <View style={styles.coachSection}>
            <EliteText variant="caption" style={styles.coachHint}>
              Ingresa el código de 6 dígitos de tu coach
            </EliteText>
            <View style={styles.connectRow}>
              <TextInput
                style={[styles.codeInput, { backgroundColor: tokens.hundido, borderColor: tokens.borde, color: tokens.texto }]}
                value={connectCode}
                onChangeText={t => setConnectCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                placeholderTextColor={tokens.sinDatos}
                maxLength={6}
                autoCapitalize="characters"
              />
              <Pressable
                onPress={handleConnect}
                disabled={connecting || connectCode.length < 6}
                style={[styles.connectBtn, (connecting || connectCode.length < 6) && { opacity: 0.4 }]}
              >
                {/* Relleno de sección: en claro el texto encima va negro. */}
                <EliteText variant="caption" style={[styles.connectBtnText, !dark && { color: ATP_BRAND.black }]}>
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
          <SectionLabel color={tealTexto}>SOY COACH</SectionLabel>
          <View style={styles.coachSection}>
            {coachCode ? (
              <>
                <EliteText variant="caption" style={styles.coachHint}>
                  Comparte este código con tus atletas
                </EliteText>
                <View style={[styles.codeDisplay, { backgroundColor: tokens.card }]}>
                  <EliteText style={[styles.codeDisplayText, { color: tealTexto }]}>{coachCode}</EliteText>
                  <Pressable onPress={handleCopyCode} style={styles.copyBtn}>
                    <Ionicons name="share-outline" size={18} color={tealTexto} />
                    <EliteText variant="caption" style={[styles.copyBtnText, { color: tealTexto }]}>Compartir</EliteText>
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
                  <Ionicons name="key-outline" size={18} color={tealTexto} />
                  <EliteText variant="body" style={[styles.generateBtnText, { color: tealTexto }]}>
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
          <View style={[styles.wearableCard, { backgroundColor: tokens.card, borderColor: tokens.borde }]}>
            <View style={styles.wearableHeader}>
              <Ionicons name="watch-outline" size={22} color={CATEGORY_COLORS.metrics} />
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={styles.wearableTitle}>
                  Salud del teléfono
                </EliteText>
                {/* NOCHE-1: esto decía "Próximamente" mientras el import ya
                    funcionaba en otras pantallas. La promesa vuelve a
                    coincidir con lo que la app hace. */}
                <EliteText variant="caption" style={styles.wearableDesc}>
                  Conecta ATP con la plataforma de salud de tu teléfono y tus
                  pasos, tu sueño, tu frecuencia cardiaca, tu peso y tu energía
                  activa entran solos.
                </EliteText>
              </View>
            </View>
            <Pressable
              onPress={() => { haptic.medium(); router.push('/settings/salud-conexion'); }}
              style={styles.wearableConnectBtn}
            >
              <Ionicons name="pulse-outline" size={18} color={CATEGORY_COLORS.metrics} />
              <EliteText variant="body" style={styles.wearableConnectBtnText}>
                Conectar mis datos de salud
              </EliteText>
            </Pressable>
            {/* Una integración, todas las fuentes: cualquier app o reloj que
                escriba en la plataforma de salud del sistema llega por aquí,
                sin integrar cada marca por separado. */}
            <EliteText variant="caption" style={[styles.wearableCompatible, { color: dark ? tokens.sinDatos : tokens.textoSecundario }]}>
              Llega lo que escriban ahí tu reloj y tus apps de salud
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
            onPress={() => { haptic.medium(); router.push('/afiliados/aplicar'); }}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </ThemeReady>
  );
}

const styles = StyleSheet.create({
  coachSection: {
    gap: Spacing.sm,
  },
  coachHint: {
    fontSize: FontSizes.sm,
  },
  connectRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: COACH_TEAL + '30',
    padding: Spacing.md,
  },
  codeDisplayText: {
    fontFamily: 'monospace',
    fontSize: FontSizes.display,
    letterSpacing: 10,
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
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  webHint: {
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  connectionList: {
    gap: Spacing.xs,
  },
  connectionListLabel: {
    letterSpacing: 2,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  wearableCard: {
    borderRadius: Radius.md,
    borderWidth: 0.5,
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
  },
  wearableDesc: {
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
    fontSize: FontSizes.xs,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
