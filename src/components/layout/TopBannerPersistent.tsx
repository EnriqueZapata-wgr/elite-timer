/**
 * TopBannerPersistent (#v13c 2.6) — franja superior persistente: botón Home (vuelve a HOY) +
 * EconomyHeaderPill (⚡ Electrones · 💎 Protones · Rank). Se inyecta vía TabScreen → aparece en
 * YO y MI ATP. El botón Home solo se muestra fuera de la raíz HOY (en HOY no hace falta).
 *
 * Reusa EconomyHeaderPill (self-gated por LAB_ECONOMY_ENABLED, datos reales) e isHomePath — sin
 * fuentes de datos nuevas. HOY ya muestra su propia pill (no usa TabScreen); ARGOS queda para
 * follow-up (header propio). Ver COWORK_REPORT.
 */
import { View, Pressable, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EconomyHeaderPill } from '@/src/components/economy/EconomyHeaderPill';
import { isHomePath } from '@/src/components/ui/global-topbar-utils';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND } from '@/src/constants/brand';
import { Spacing } from '@/constants/theme';

export function TopBannerPersistent() {
  const pathname = usePathname();
  const router = useRouter();
  const home = isHomePath(pathname);

  return (
    <View style={styles.banner}>
      {!home ? (
        <Pressable onPress={() => { haptic.light(); router.replace('/'); }} style={styles.homeBtn} hitSlop={8}>
          <Ionicons name="home" size={20} color={ATP_BRAND.lime} />
        </Pressable>
      ) : (
        <View style={styles.homeBtn} />
      )}
      <View style={{ flex: 1 }} />
      <EconomyHeaderPill />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: 4, paddingBottom: 4,
  },
  homeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
