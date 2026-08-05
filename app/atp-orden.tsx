/**
 * Mi orden (MB-19 PIEZA 2) — la pantalla que edita el orden "Mío" de la sala ATP.
 *
 * Con una LISTA, no arrastrando. Subir, bajar y fijar arriba resuelven el 100%
 * del caso con cero riesgo: el arrastre es su propio proyecto y se puede montar
 * encima después sin rehacer nada de esto, porque el dato que se guarda es el
 * mismo arreglo de llaves.
 *
 * Se guarda en cuanto tocas: no hay botón de guardar que se pueda olvidar.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { useSystemReducedMotion } from '@/src/components/ui/useSystemReducedMotion';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { visibleApps, APP_BY_KEY } from '@/src/constants/app-registry';
import {
  reconcileOrder, moveInOrder, pinToTop, type CustomOrder,
} from '@/src/services/atp-room-core';
import { loadCustomOrder, saveCustomOrder } from '@/src/services/atp-room-store';
import { getInstallPrefs } from '@/src/services/hoy/install-service';
import { gridApps } from '@/src/services/hoy/install-core';
import { getCycleAppMode } from '@/src/services/app-mode-service';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT, ELEVATION } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

export default function AtpOrdenScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [apps, setApps] = useState(() => visibleApps(false));
  const [order, setOrder] = useState<CustomOrder>({ keys: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let cycleVisible = false;
      if (user?.id) {
        try {
          const [{ data }, mode] = await Promise.all([
            supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle(),
            getCycleAppMode(user.id),
          ]);
          // MB-22 P4: female (propio) o modo instalado (acompañante).
          cycleVisible = (data as any)?.biological_sex === 'female' || mode != null;
        } catch { /* sin perfil: el ciclo queda fuera */ }
      }
      const stored = await loadCustomOrder();
      // MB-22: se ordena lo que está en la cuadrícula — solo instaladas.
      const prefs = user?.id ? await getInstallPrefs(user.id) : null;
      if (!alive) return;
      const enCuadricula = gridApps(visibleApps(cycleVisible), prefs);
      setApps(enCuadricula);
      // Siembra con el registro: la primera vez la lista sale completa y en
      // orden de catálogo, no vacía.
      setOrder(reconcileOrder(stored, enCuadricula));
      setReady(true);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const commit = useCallback((next: CustomOrder) => {
    setOrder(next);
    saveCustomOrder(next);
  }, []);

  const move = (key: string, dir: -1 | 1) => { haptic.light(); commit(moveInOrder(order, key, dir)); };
  const pin = (key: string) => { haptic.medium(); commit(pinToTop(order, key)); };

  // Solo las llaves de apps en la cuadrícula: una desinstalada no se ordena.
  const enGrid = new Set(apps.map((a) => a.key));
  const rows = order.keys.filter((k) => enGrid.has(k)).map((k) => APP_BY_KEY[k]).filter(Boolean);

  // Pieza 5: mismo criterio que la cuadrícula — con "reducir movimiento" del
  // sistema, la fila se mueve sin rebote (LinearTransition lisa).
  const reducedMotion = useSystemReducedMotion();
  const rowLayout = reducedMotion ? LinearTransition : LinearTransition.springify().damping(18);

  return (
    <Screen>
      <StatusBar style="light" />
      <ScreenHeader title="Mi orden" onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <EliteText style={s.hint}>
          Este es el orden que ves con el chip Mío. Sube, baja o fija arriba lo que más usas.
        </EliteText>

        {ready && rows.map((app, i) => (
          <Animated.View
            key={app.key}
            entering={FadeInUp.delay(Math.min(i, 12) * 24).springify()}
            layout={rowLayout}
            style={s.row}
          >
            <EliteText style={s.position}>{i + 1}</EliteText>
            <View style={s.rowIcon}>
              <AppIcon name={app.icon} size={20} color={TEXT.primary} />
            </View>
            <EliteText style={s.rowLabel} numberOfLines={1}>{app.label}</EliteText>

            <AnimatedPressable
              style={s.action}
              disabled={i === 0}
              onPress={() => pin(app.key)}
            >
              <Ionicons name="arrow-up-circle-outline" size={22} color={i === 0 ? TEXT.muted : ATP_BRAND.lime} />
            </AnimatedPressable>
            <AnimatedPressable
              style={s.action}
              disabled={i === 0}
              onPress={() => move(app.key, -1)}
            >
              <Ionicons name="chevron-up" size={20} color={i === 0 ? TEXT.muted : TEXT.secondary} />
            </AnimatedPressable>
            <AnimatedPressable
              style={s.action}
              disabled={i === rows.length - 1}
              onPress={() => move(app.key, 1)}
            >
              <Ionicons name="chevron-down" size={20} color={i === rows.length - 1 ? TEXT.muted : TEXT.secondary} />
            </AnimatedPressable>
          </Animated.View>
        ))}

        {ready && rows.length === 0 && (
          <EliteText style={s.hint}>No hay funciones que ordenar todavía.</EliteText>
        )}

        {/* Nota honesta: si el registro crece, las nuevas aparecen al final. */}
        {ready && rows.length < apps.length && (
          <EliteText style={s.footnote}>
            Las funciones nuevas se agregan al final de tu lista.
          </EliteText>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  hint: {
    color: TEXT.secondary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  footnote: {
    color: TEXT.tertiary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    marginTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  position: {
    width: 20,
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: TEXT.muted,
    textAlign: 'center',
  },
  rowIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: ELEVATION[2].bg, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  action: { padding: 4 },
});
