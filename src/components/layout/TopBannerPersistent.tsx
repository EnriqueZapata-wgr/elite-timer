/**
 * TopBannerPersistent (#v13c 2.6) — franja superior persistente: botón Home (vuelve a HOY) +
 * EconomyHeaderPill (⚡ Electrones · Rank). Se inyecta vía TabScreen → aparece en
 * YO y MI ATP. El botón Home solo se muestra fuera de la raíz HOY (en HOY no hace falta).
 *
 * Reusa EconomyHeaderPill (self-gated por LAB_ECONOMY_ENABLED, datos reales) e isHomePath — sin
 * fuentes de datos nuevas. HOY ya muestra su propia pill (no usa TabScreen); ARGOS queda para
 * follow-up (header propio). Ver COWORK_REPORT.
 */
import { View, Pressable, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { EconomyHeaderPill } from '@/src/components/economy/EconomyHeaderPill';
import { useSubscription } from '@/src/hooks/useSubscription';
import { ocultarPildoraEconomia } from '@/src/services/hoy/elite-hoy-core';
import { APP_ELITE_DX } from '@/src/constants/flags';
import { HomeIcon } from '@/src/components/ui/HomeIcon';
import { isHomePath } from '@/src/components/ui/global-topbar-utils';
import { haptic } from '@/src/utils/haptics';
import { Spacing } from '@/constants/theme';

export function TopBannerPersistent() {
  const pathname = usePathname();
  const router = useRouter();
  const home = isHomePath(pathname);
  // 20-sep-2026 (A10): la misma condicion que HOY. Un cliente Elite no ve la
  // pildora de electrones en ninguna barra (antes la veia en YO y MI ATP y no
  // en HOY). Mientras el nivel se lee, tampoco (evita el parpadeo).
  const { tier, tieneEvaluacionElite, isLoading } = useSubscription();
  const pildoraOculta = ocultarPildoraEconomia({ tier, tieneEvaluacionElite, cargando: isLoading });

  return (
    <View style={styles.banner}>
      {!home ? (
        <Pressable onPress={() => { haptic.light(); router.replace('/'); }} style={styles.homeBtn} hitSlop={8}>
          <HomeIcon size={20} />
        </Pressable>
      ) : (
        <View style={styles.homeBtn} />
      )}
      <View style={{ flex: 1 }} />
      {/* 25-sep-2026 (APP_ELITE_DX, revisión en frío): las salas nuevas (Mi
          programa, Progreso, Tú) usan esta barra; la app Elite DX no habla de
          electrones ni de rango, para nadie. El boton Home se queda. */}
      <EconomyHeaderPill oculta={APP_ELITE_DX || pildoraOculta} />
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
