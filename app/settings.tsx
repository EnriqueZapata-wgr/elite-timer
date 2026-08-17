/**
 * AJUSTES — hub principal.
 *
 * SIMPLE (17-ago-2026). Ajustes se había vuelto el basurero: adentro vivían un
 * test (cronotipo), un catálogo clínico (protocolos), un dato médico (la ficha de
 * emergencia) y los ajustes de la Tribu. Cada cosa se fue a su sección y aquí
 * quedó solo lo que de verdad es un ajuste. Ocho grupos bajaron a seis.
 *
 * Lo que cambió y por qué:
 *  · "Perfil y cuenta" se disolvió aquí. Era una pantalla cuyos tres destinos
 *    reales (editar perfil, suscripción, cerrar sesión) ya son filas: existía
 *    para cobrar un toque de peaje.
 *  · "Privacidad" y "Legal" son un solo grupo. El usuario no distingue entre sus
 *    consentimientos y los documentos que consintió; nosotros sí, y le cobrábamos
 *    la distinción con dos puertas.
 *  · Comunidad se fue a Tribu: quién te ve en la comunidad se decide mirando la
 *    comunidad.
 *
 * DOCTRINA: un hub son tarjetas de NAVEGACIÓN, sin un solo dato adentro. Por eso
 * de aquí se fue el badge de membresía: ese dato vive en /settings/subscription y
 * en un solo lugar. Cada control vive en su grupo (kit compartido en
 * src/components/settings/settings-ui).
 */
import { View, ScrollView, Platform, StyleSheet, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter , type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { isAdmin } from '@/src/constants/admin-config';
import { ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { Colors, Fonts, Spacing, Radius, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { ORB_SAFE_BOTTOM } from '@/src/components/argos/ArgosFloatingButton';

interface SettingsGroup {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  route: Href;
}

const GROUPS: SettingsGroup[] = [
  {
    icon: 'diamond-outline',
    iconColor: Colors.neonGreen,
    title: 'Membresía',
    subtitle: 'Tu plan, renovación e historial de pagos',
    route: '/settings/subscription' as const,
  },
  {
    icon: 'pulse-outline',
    iconColor: CATEGORY_COLORS.metrics,
    title: 'Salud y protocolo',
    subtitle: 'Nivel de entrenamiento, nutrición y ciclo',
    route: '/settings/salud' as const,
  },
  {
    icon: 'options-outline',
    iconColor: CATEGORY_COLORS.optimization,
    title: 'Experiencia',
    subtitle: 'Tema, voz, sonidos, vibración y pantalla',
    route: '/settings/experiencia' as const,
  },
  {
    icon: 'notifications-outline',
    iconColor: CATEGORY_COLORS.mind,
    title: 'Notificaciones',
    subtitle: 'Modos, tipos y horas de silencio',
    route: '/settings/notifications' as const,
  },
  {
    icon: 'shield-checkmark-outline',
    iconColor: CATEGORY_COLORS.nutrition,
    // Privacidad y Legal eran dos grupos. Son la misma pregunta del usuario:
    // qué firmé y qué hacen con mis datos.
    title: 'Privacidad y legal',
    subtitle: 'Consentimientos, documentos, tus datos y eliminación',
    route: '/settings/privacy' as const,
  },
  {
    icon: 'people-outline',
    iconColor: CATEGORY_COLORS.metrics,
    title: 'Conexiones',
    subtitle: 'Coach, atletas, dispositivos y afiliados',
    route: '/settings/conexiones' as const,
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const showDev = __DEV__ || isAdmin(user?.id);

  // Venía de /settings/cuenta sin un solo cambio: mismo copy, misma confirmación.
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
  // MB-31B: hub migrado — superficies del tema; los colores de los iconos de
  // grupo son identidad de sección y quedan igual en los dos modos.
  const { kind, tokens } = useAppTheme();
  const thCard = { backgroundColor: tokens.card, borderColor: tokens.borde };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <ThemeReady>
    <View style={[ui.screenRoot, { backgroundColor: tokens.fondo }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Ajustes" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: ORB_SAFE_BOTTOM }}>
        {/* Header de cuenta → editar perfil DIRECTO. Antes paraba en
            /settings/cuenta, que solo servía para ofrecerte esta misma fila. */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          {/* MB-1.5 §1: spring en pointer-down (antes Pressable sin feedback) */}
          <AnimatedPressable
            onPress={() => { haptic.medium(); router.push('/profile'); }}
            style={[styles.accountBox, { backgroundColor: tokens.card }]}
          >
            <UserAvatar uri={user?.user_metadata?.avatar_url} name={displayName} size={44} />
            <View style={styles.accountInfo}>
              <EliteText variant="body" style={styles.accountName}>{displayName}</EliteText>
              <EliteText variant="caption" style={styles.accountEmail}>{user?.email}</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.textoSecundario} />
          </AnimatedPressable>
        </Animated.View>

        {/* Grupos navegables */}
        <View style={styles.groupList}>
          {GROUPS.map((group, i) => (
            <Animated.View key={String(group.route)} entering={FadeInUp.delay(150 + i * 40).springify()}>
              <AnimatedPressable
                onPress={() => { haptic.medium(); router.push(group.route); }}
                style={[styles.groupCard, thCard]}
              >
                <View style={[styles.groupIcon, { backgroundColor: group.iconColor + '15' }]}>
                  <Ionicons name={group.icon as any} size={20} color={group.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.groupTitle}>{group.title}</EliteText>
                  <EliteText variant="caption" style={styles.groupSubtitle}>{group.subtitle}</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={tokens.textoSecundario} />
              </AnimatedPressable>
            </Animated.View>
          ))}

          {showDev && (
            <Animated.View entering={FadeInUp.delay(150 + GROUPS.length * 40).springify()}>
              <AnimatedPressable
                onPress={() => { haptic.medium(); router.push('/settings/dev'); }}
                style={[styles.groupCard, thCard, { opacity: 0.75 }]}
              >
                <View style={[styles.groupIcon, { backgroundColor: tokens.textoSecundario + '15' }]}>
                  <Ionicons name="construct-outline" size={20} color={tokens.textoSecundario} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.groupTitle}>Developer</EliteText>
                  <EliteText variant="caption" style={styles.groupSubtitle}>Herramientas internas</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={tokens.textoSecundario} />
              </AnimatedPressable>
            </Animated.View>
          )}
        </View>

        {/* Cerrar sesión. La única ACCIÓN del hub, y va abajo y aparte a
            propósito: no se toca por accidente al buscar un grupo. Eliminar
            cuenta NO está aquí — vive en Privacidad, con su confirmación y su
            periodo de gracia, y no se duplica como fila que solo reenvía. */}
        <Animated.View entering={FadeInUp.delay(150 + (GROUPS.length + 1) * 40).springify()}>
          <AnimatedPressable
            onPress={handleLogout}
            style={[styles.groupCard, thCard, { marginTop: Spacing.lg }]}
          >
            <View style={[styles.groupIcon, { backgroundColor: tokens.error + '15' }]}>
              <Ionicons name="log-out-outline" size={20} color={tokens.error} />
            </View>
            <View style={{ flex: 1 }}>
              <EliteText variant="body" style={[styles.groupTitle, { color: tokens.error }]}>Cerrar sesión</EliteText>
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* Versión */}
        <View style={styles.versionContainer}>
          <EliteText variant="caption" style={[styles.versionText, { color: kind === 'dark' ? tokens.textoTenue : tokens.textoSecundario }]}>
            ATP v{Constants.expoConfig?.version ?? '?'}
            {Platform.OS !== 'web' && Updates.updateId ? ` · OTA ${Updates.updateId.slice(0, 8)}` : ''}
          </EliteText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </ThemeReady>
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
    fontSize: FontSizes.sm,
    marginTop: 1,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  versionText: {
    fontSize: FontSizes.sm,
  },
});
