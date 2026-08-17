/**
 * AJUSTES › PERFIL Y CUENTA (#137) — foto, datos, plan y sesión.
 * La edición real de identidad (nombre/fecha/sexo/foto) vive en /profile;
 * la eliminación de cuenta real vive en Privacidad (flujo con confirmación).
 */
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { SectionLabel, Divider, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { Fonts, Spacing, Radius, FontSizes } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { etiquetaMembresia } from '@/src/services/subscription/tier-logic';

export default function SettingsCuentaScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { tier, isLoading } = useSubscription();
  // MB-31B: pantalla migrada — superficies del tema; el error de sesión usa
  // el token (coral en oscuro, #B03A2E en claro: el coral no se lee).
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  function handleLogout() {
    haptic.heavy();
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm('¿Seguro que quieres cerrar sesión?')) return;
      signOut().then(() => router.replace('/login'));
    } else {
      Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: async () => { await signOut(); router.replace('/login'); } },
      ]);
    }
  }

  return (
    <ThemeReady>
    <View style={[ui.screenRoot, { backgroundColor: tokens.fondo }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScreenHeader title="Perfil y cuenta" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Identidad: foto + nombre + email + membresía */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={[styles.identityCard, { backgroundColor: tokens.card }]}>
          <UserAvatar uri={user?.user_metadata?.avatar_url} name={displayName} size={64} />
          <EliteText variant="body" style={styles.identityName}>{displayName}</EliteText>
          <EliteText variant="caption">{user?.email}</EliteText>
          {/* En claro el lima no es texto: el badge pasa a relleno sólido. */}
          <View style={[styles.tierBadge, !dark && { backgroundColor: ATP_BRAND.lime }]}>
            <EliteText style={[styles.tierBadgeText, !dark && { color: tokens.textoSobreLima }]}>
              {isLoading ? '…' : etiquetaMembresia(tier)}
            </EliteText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify()}>
          <SectionLabel>PERFIL</SectionLabel>
          <SettingRow
            icon="person-outline"
            label="Editar perfil"
            sub="Foto, nombre, fecha de nacimiento y sexo"
            onPress={() => { haptic.medium(); router.push('/profile'); }}
          />
          <Divider />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).springify()}>
          <SectionLabel>PLAN</SectionLabel>
          <SettingRow
            icon="diamond-outline"
            label="Suscripción"
            sub="Tu plan, renovación e historial"
            onPress={() => { haptic.medium(); router.push('/settings/subscription'); }}
          />
          <Divider />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).springify()}>
          <SectionLabel color={tokens.error}>SESIÓN</SectionLabel>
          <SettingRow
            icon="log-out-outline"
            iconColor={tokens.error}
            label="Cerrar sesión"
            onPress={handleLogout}
          />
          <SettingRow
            icon="trash-outline"
            iconColor={tokens.error}
            label="Eliminar cuenta"
            sub="Se gestiona en Privacidad y datos"
            onPress={() => { haptic.medium(); router.push('/settings/privacy'); }}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </ThemeReady>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  identityName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    marginTop: Spacing.xs,
  },
  tierBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    marginTop: Spacing.xs,
  },
  tierBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    color: ATP_BRAND.lime,
    letterSpacing: 1,
  },
});
