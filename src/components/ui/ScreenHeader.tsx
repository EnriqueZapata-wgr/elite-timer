/**
 * ScreenHeader — Header estándar para pantallas con BackButton + título centrado.
 * Usa para pantallas de navegación (settings, records, progreso, historial, etc.)
 *
 * V1.5.1 (#8): trae la casita fija (HomeChip, vocabulario del StickyPillarBanner)
 * y registra nav propia — la casita flotante global se auto-oculta aquí.
 */
import { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { puedeExplicar, PREGUNTA_EXPLICAR } from '@/src/services/argos-screen-explain-core';
import { EliteText } from '@/components/elite-text';
import { BackButton } from '@/src/components/ui/BackButton';
import { HomeChip } from '@/src/components/ui/HomeChip';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  /**
   * CIERRE-1: apaga el "¿qué es esto?" en una pantalla concreta. Se usa donde
   * preguntar qué es no tiene sentido (un flujo a media captura, por ejemplo).
   */
  sinExplicar?: boolean;
}

export function ScreenHeader({ title, rightAction, onBack, sinExplicar }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const t = useSurfaceTokens(); // MB-31A: el encabezado sigue el scope
  useRegisterOwnNav();
  const pathname = usePathname();

  /**
   * CIERRE-1 — el atajo "¿qué es esto?".
   *
   * `puedeExplicar` estaba escrito y probado desde el trabajo del navegador y
   * NO estaba cableado a ninguna UI: grep completo daba cero llamadas fuera de
   * los tests. O sea que ARGOS sabía explicar la pantalla en la que estás,
   * pero solo si al usuario se le ocurría preguntar. La capacidad existía y
   * era invisible, que es el patrón que se repite en toda la app.
   *
   * Va aquí y no pantalla por pantalla: ScreenHeader lo usan ~50 pantallas, y
   * el catálogo ya decide solo dónde hay resumen que valga la pena. Donde no
   * lo hay, no aparece nada: no se promete lo que no se puede cumplir.
   *
   * Cede el lugar a `rightAction` si la pantalla ya puso algo suyo ahí: el
   * encabezado tiene UN slot derecho y la acción propia de la pantalla manda.
   *
   * Memoizado por ruta: `puedeExplicar` resuelve contra el catálogo de
   * pantallas y este encabezado lo pintan ~50 pantallas en cada render.
   */
  const explicable = useMemo(() => puedeExplicar(pathname), [pathname]);
  const ofreceExplicar = !sinExplicar && rightAction == null && explicable;

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.side}>
        <BackButton onPress={onBack} />
        <HomeChip />
      </View>
      {/* MB-5 Bloque 4.2: títulos largos ("REGISTRAR CARDIO") se encogen en
          vez de truncarse ("REGISTRAR CARD…") — aplica a todo el pilar. */}
      <EliteText style={[s.title, { color: t.texto }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {title.toUpperCase()}
      </EliteText>
      <View style={[s.side, s.sideRight]}>
        {ofreceExplicar ? (
          <Pressable
            onPress={() => router.push({ pathname: '/argos-chat', params: { q: PREGUNTA_EXPLICAR } })}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Qué es esta pantalla"
            style={({ pressed }) => [s.explicar, pressed && { opacity: 0.5 }]}
          >
            <Ionicons name="help-circle-outline" size={20} color={t.textoSecundario} />
          </Pressable>
        ) : (rightAction ?? null)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  // Lados espejo (back+casita ≈ 86px) — el título queda centrado de verdad.
  side: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 86 },
  // CIERRE-1: discreto. Es una salida por si acaso, no un elemento de la
  // pantalla: no debe competir con el título ni con la acción propia.
  explicar: { padding: 4 },
  sideRight: { justifyContent: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
});
