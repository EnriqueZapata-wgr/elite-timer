/**
 * AJUSTES › DEVELOPER (#137) — solo __DEV__ o admins (founders/team).
 */
import { View, ScrollView } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

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
            onPress={() => { haptic.medium(); router.push('/dev' as any); }}
          />
          <SettingRow
            icon="analytics-outline"
            label="Edad ATP (preview)"
            sub="Captura de datos del modelo v2"
            onPress={() => { haptic.medium(); router.push('/edad-atp' as any); }}
          />
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
