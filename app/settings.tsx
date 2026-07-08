/**
 * AJUSTES — hub principal (#137, testing fixes V1.3).
 *
 * Reorganización tipo iOS/Android Settings: 7 grupos navegables + Developer
 * (gated). El monolito anterior (1269 líneas, 15 secciones planas) se partió
 * en sub-pantallas — cada control vive ahora en su grupo:
 *   cuenta · salud · experiencia · notifications · privacy · conexiones ·
 *   legal · dev (kit compartido en src/components/settings/settings-ui).
 */
import { View, ScrollView, Pressable, Platform, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { isAdmin } from '@/src/constants/admin-config';
import { ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { Colors, Fonts, Spacing, Radius, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/src/constants/brand';

interface SettingsGroup {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  route: string;
}

const GROUPS: SettingsGroup[] = [
  {
    icon: 'person-circle-outline',
    iconColor: Colors.neonGreen,
    title: 'Perfil y cuenta',
    subtitle: 'Foto, datos, plan y sesión',
    route: '/settings/cuenta',
  },
  {
    icon: 'pulse-outline',
    iconColor: CATEGORY_COLORS.metrics,
    title: 'Salud y protocolo',
    subtitle: 'Cronotipo, protocolos, ciclo y nutrición',
    route: '/settings/salud',
  },
  {
    icon: 'options-outline',
    iconColor: CATEGORY_COLORS.optimization,
    title: 'Experiencia',
    subtitle: 'Tema, voz, sonidos, vibración y pantalla',
    route: '/settings/experiencia',
  },
  {
    icon: 'notifications-outline',
    iconColor: CATEGORY_COLORS.mind,
    title: 'Notificaciones',
    subtitle: 'Modos, tipos y horas de silencio',
    route: '/settings/notifications',
  },
  {
    icon: 'shield-checkmark-outline',
    iconColor: CATEGORY_COLORS.nutrition,
    title: 'Privacidad y seguridad',
    subtitle: 'Consentimientos, tus datos y eliminación',
    route: '/settings/privacy',
  },
  {
    icon: 'people-outline',
    iconColor: CATEGORY_COLORS.metrics,
    title: 'Conexiones',
    subtitle: 'Coach, atletas, wearables y afiliados',
    route: '/settings/conexiones',
  },
  {
    icon: 'document-text-outline',
    iconColor: Colors.textSecondary,
    title: 'Legal y soporte',
    subtitle: 'Términos, avisos médicos y disclaimers',
    route: '/settings/legal',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const showDev = __DEV__ || isAdmin(user?.id);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <View style={ui.screenRoot}>
      <StatusBar style="light" />
      <ScreenHeader title="Ajustes" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header de cuenta → Perfil y cuenta */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <Pressable
            onPress={() => { haptic.medium(); router.push('/settings/cuenta' as any); }}
            style={styles.accountBox}
          >
            <UserAvatar uri={user?.user_metadata?.avatar_url} name={displayName} size={44} />
            <View style={styles.accountInfo}>
              <EliteText variant="body" style={styles.accountName}>{displayName}</EliteText>
              <EliteText variant="caption" style={styles.accountEmail}>{user?.email}</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Grupos navegables */}
        <View style={styles.groupList}>
          {GROUPS.map((group, i) => (
            <Animated.View key={group.route} entering={FadeInUp.delay(150 + i * 40).springify()}>
              <Pressable
                onPress={() => { haptic.medium(); router.push(group.route as any); }}
                style={styles.groupCard}
              >
                <View style={[styles.groupIcon, { backgroundColor: group.iconColor + '15' }]}>
                  <Ionicons name={group.icon as any} size={20} color={group.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.groupTitle}>{group.title}</EliteText>
                  <EliteText variant="caption" style={styles.groupSubtitle}>{group.subtitle}</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </Pressable>
            </Animated.View>
          ))}

          {showDev && (
            <Animated.View entering={FadeInUp.delay(150 + GROUPS.length * 40).springify()}>
              <Pressable
                onPress={() => { haptic.medium(); router.push('/settings/dev' as any); }}
                style={[styles.groupCard, { opacity: 0.75 }]}
              >
                <View style={[styles.groupIcon, { backgroundColor: Colors.textSecondary + '15' }]}>
                  <Ionicons name="construct-outline" size={20} color={Colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.groupTitle}>Developer</EliteText>
                  <EliteText variant="caption" style={styles.groupSubtitle}>Herramientas internas</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </Pressable>
            </Animated.View>
          )}
        </View>

        {/* Versión */}
        <View style={styles.versionContainer}>
          <EliteText variant="caption" style={styles.versionText}>
            ATP v{Constants.expoConfig?.version ?? '?'}
            {Platform.OS !== 'web' && Updates.updateId ? ` · OTA ${Updates.updateId.slice(0, 8)}` : ''}
          </EliteText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
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
  groupList: {
    gap: Spacing.sm,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  groupIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  groupSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 1,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  versionText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
});
