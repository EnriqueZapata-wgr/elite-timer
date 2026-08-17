/**
 * MI PROGRESO — rango, electrones, logros e historial.
 *
 * PREMIUM (16-ago-2026): esta pantalla era mitad progreso y mitad cajero. Se
 * fue la mitad de cajero (saldo H+, tienda, conversión, "cómo gano H+") porque
 * ya no hay moneda que administrar. Lo que queda es lo que la persona vino a
 * ver: qué tan lejos ha llegado.
 *
 * Los electrones se quedan y son el centro: rango, avance y racha. Nunca fueron
 * moneda, aunque durante un tiempo se pudieran convertir.
 *
 * Lee el balance real; refresca en 'balance_changed'. Entrada escalonada FadeInDown.
 * Las secciones aún no construidas se muestran como "Próximamente" (nav honesta).
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect , type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { RankBadge } from '@/src/components/economy/RankBadge';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getElectronBalance } from '@/src/services/economy/electron-service';
import type { ElectronBalance } from '@/src/services/economy/economy-types';
import { ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface NavItem {
  icon: keyof typeof Ionicons.glyphMap; label: string; sublabel?: string;
  route?: Href; soon?: boolean;
}

export default function EconomyAdminScreen() {
  const { user } = useAuth();
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const [electrons, setElectrons] = useState<ElectronBalance | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setElectrons(await getElectronBalance(user.id));
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    load();
    const sub = DeviceEventEmitter.addListener('balance_changed', load);
    return () => sub.remove();
  }, [load]));

  // PREMIUM (16-ago-2026): salieron del menú "Convertir E- → H+", "Tienda H+" y
  // "¿Cómo gano H+?" — sus tres pantallas ya no existen y dejarlas linkeadas
  // mandaba a la nada. Retos y Referidos siguen en "Próximamente": no es que se
  // hayan cancelado, es que su premio era H+ y falta decidir con qué se premia.
  const navItems: NavItem[] = [
    { icon: 'receipt-outline', label: 'Historial de electrones', sublabel: 'Qué ganaste y cuándo', route: '/economy/history' },
    { icon: 'flag-outline', label: 'Mis Retos', sublabel: 'Próximamente', soon: true },
    { icon: 'people-outline', label: 'Referidos', sublabel: 'Próximamente', soon: true },
    { icon: 'trophy-outline', label: 'Mis Logros', sublabel: 'Próximamente', soon: true },
  ];

  return (
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Mi Progreso" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* D-2 (MB-12): balance null = no se pudo leer — jamás pintar 0 real */}
        {electrons != null && (
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <RankBadge lifetimeElectrons={electrons.lifetime_electrons} />
          </Animated.View>
        )}

        {electrons != null ? (
          <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.eRow}>
            <Ionicons name="flash" size={16} color={ATP_BRAND.lime} />
            <EliteText variant="caption" style={[styles.eText, { color: t.textoSecundario }]}>
              {electrons.lifetime_electrons.toLocaleString('en-US')} E- acumulados en total
            </EliteText>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.eRow}>
            <Ionicons name="cloud-offline-outline" size={16} color={t.textoSecundario} />
            <EliteText variant="caption" style={[styles.eText, { color: t.textoSecundario }]}>
              Tu progreso no se pudo leer.{' '}
              <EliteText variant="caption" style={{ color: acento }} onPress={load}>
                Reintentar
              </EliteText>
            </EliteText>
          </Animated.View>
        )}

        {navItems.map((item, i) => (
          <Animated.View key={item.label} entering={FadeInDown.delay(180 + i * 40).springify()}>
            <AnimatedPressable
              disabled={item.soon}
              onPress={() => { if (item.route) { haptic.light(); router.push(item.route); } }}
              style={[styles.navRow, { backgroundColor: t.card, borderColor: t.borde }, item.soon && styles.navSoon]}
            >
              <View style={styles.navIcon}><Ionicons name={item.icon} size={20} color={ATP_BRAND.lime} /></View>
              <View style={{ flex: 1 }}>
                <EliteText style={[styles.navLabel, { color: t.texto }]}>{item.label}</EliteText>
                {item.sublabel ? <EliteText variant="caption" style={[styles.navSub, { color: t.textoSecundario }]}>{item.sublabel}</EliteText> : null}
              </View>
              {item.soon
                ? <View style={styles.soonBadge}><EliteText style={[styles.soonText, { color: acento }]}>PRONTO</EliteText></View>
                : <Ionicons name="chevron-forward" size={18} color={t.textoSecundario} />}
            </AnimatedPressable>
          </Animated.View>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 80 },
  eRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.xs },
  eText: {},
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 0.5,
  },
  navSoon: { opacity: 0.6 },
  navIcon: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${ATP_BRAND.lime}1A`,
  },
  navLabel: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  navSub: { marginTop: 2 },
  soonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${ATP_BRAND.lime}1A` },
  soonText: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1 },
});
