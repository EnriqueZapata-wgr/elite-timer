/**
 * AJUSTES › DEVELOPER (#137) — solo __DEV__ o admins (founders/team).
 */
import { View, ScrollView, Alert } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useAuth } from '@/src/contexts/auth-context';
import { isAdmin } from '@/src/constants/admin-config';
import { SectionLabel, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';

export default function SettingsDevScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Gate: dev build o admin — nadie más aterriza aquí ni por deep link
  if (!__DEV__ && !isAdmin(user?.id)) {
    return <Redirect href="/settings" />;
  }

  return (
    <View style={ui.screenRoot}>
      <StatusBar style="light" />
      <ScreenHeader title="Developer" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <SectionLabel>HERRAMIENTAS</SectionLabel>
          <SettingRow
            icon="construct-outline"
            label="DEV Tools"
            sub="Herramientas internas de validación"
            onPress={() => { haptic.medium(); router.push('/dev'); }}
          />
          <SettingRow
            icon="analytics-outline"
            label="Edad ATP (preview)"
            sub="Captura de datos del modelo v2"
            onPress={() => { haptic.medium(); router.push('/edad-atp'); }}
          />
          {/* T3 MAGIA 2.0: test aid — reproducir la cinemática sin resetear el flag en DB */}
          <SettingRow
            icon="eye-outline"
            label="Ver Meet ARGOS de nuevo"
            sub="Reproduce la cinemática de primer contacto"
            onPress={() => { haptic.medium(); router.push('/argos/meet'); }}
          />
          {/* T6 HARDENING: verificación Sentry end-to-end. Sentry corre con
              enabled: !__DEV__ (app/_layout.tsx) → este botón solo REPORTA en
              builds preview/producción; en dev es no-op silencioso. */}
          <SettingRow
            icon="bug-outline"
            label="Enviar test error a Sentry"
            sub="Solo reporta en builds no-dev (preview/prod)"
            onPress={() => {
              haptic.warning();
              const marker = `sentry-verify ${new Date().toISOString()}`;
              Sentry.captureException(new Error(`[T6 HARDENING] Test error manual — ${marker}`));
              Alert.alert(
                'Test enviado',
                __DEV__
                  ? 'Estás en build DEV: Sentry está deshabilitado (enabled: !__DEV__). Prueba desde un build preview.'
                  : `Capturado como "${marker}". Revisa atp-mobile en Sentry (org atp-v5) y verifica stack trace legible.`,
              );
            }}
          />
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
