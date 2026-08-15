/**
 * ExpandableSheet — bottom sheet expandible con snap points, sin @gorhom/bottom-sheet
 * (no está en deps). Usa react-native-gesture-handler + reanimated (sí están).
 *
 * Snap points: ~25% / ~50% / ~90% de la pantalla. Abre en 50%. Drag del handle para
 * expandir/reducir; arrastrar por debajo del 25% o tap en el backdrop → cierra.
 * Bullet-proof: si el gesto fallara, el handle es TAPPABLE (cicla 50%↔90%) y hay backdrop
 * para cerrar, así que siempre es usable.
 */
import { useEffect, useMemo } from 'react';
import { Modal, View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H = Math.round(SCREEN_H * 0.9);
// translateY por snap (sheet anclado abajo; mayor translateY = menos visible).
const SNAP_FULL = 0;                          // ~90% visible
const SNAP_MID = Math.round(SHEET_H * 0.45);  // ~50% visible
const SNAP_MIN = Math.round(SHEET_H * 0.72);  // ~25% visible
const CLOSE_THRESHOLD = Math.round(SHEET_H * 0.82); // arrastrar más abajo → cerrar
const SNAPS = [SNAP_FULL, SNAP_MID, SNAP_MIN];
const SPRING = { damping: 18, stiffness: 160 };

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function ExpandableSheet({ visible, onClose, title, children }: Props) {
  // MB-31B: superficies del scope. El oscuro queda idéntico al de siempre; en
  // claro la hoja flota en papel y el lima del título cede al teal (el lima
  // sobre claro da 1.34 de contraste, o sea nada).
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const ty = useSharedValue(SHEET_H); // arranca cerrado (fuera de pantalla)

  useEffect(() => {
    ty.value = withSpring(visible ? SNAP_MID : SHEET_H, SPRING);
  }, [visible, ty]);

  const cycle = () => {
    // Fallback sin gesto: alterna entre medio y completo.
    ty.value = withSpring(ty.value > SNAP_MID - 1 ? SNAP_FULL : SNAP_MID, SPRING);
  };

  const pan = Gesture.Pan()
    .onChange((e) => {
      ty.value = Math.min(SHEET_H, Math.max(SNAP_FULL, ty.value + e.changeY));
    })
    .onEnd((e) => {
      const pos = ty.value + e.velocityY * 0.08;
      if (pos > CLOSE_THRESHOLD) {
        ty.value = withTiming(SHEET_H, { duration: 200 }, (done) => { if (done) runOnJS(onClose)(); });
        return;
      }
      let nearest = SNAPS[0];
      for (const s of SNAPS) if (Math.abs(pos - s) < Math.abs(pos - nearest)) nearest = s;
      ty.value = withSpring(nearest, SPRING);
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <Animated.View style={[s.sheet, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={s.handleArea}>
              <Pressable onPress={cycle} hitSlop={16} style={s.handleHit}>
                <View style={s.handle} />
              </Pressable>
              {title ? <EliteText variant="body" style={s.title}>{title}</EliteText> : null}
            </View>
          </GestureDetector>
          <View style={s.body}>{children}</View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const makeStyles = (t: AppThemeTokens) => {
  const dark = t.kind === 'dark';
  return StyleSheet.create({
    root: { flex: 1 },
    // El velo se mantiene oscuro en los dos temas: es lo que hunde el fondo.
    // En claro se suaviza para no ensuciar el papel de abajo.
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: dark ? 'rgba(0,0,0,0.5)' : 'rgba(15,21,24,0.32)',
    },
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0, height: SHEET_H,
      backgroundColor: dark ? t.hundido : t.flotante,
      borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
      borderTopWidth: 1,
      borderColor: dark ? 'rgba(168,224,42,0.25)' : t.borde,
    },
    handleArea: { alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
    handleHit: { paddingVertical: 6, paddingHorizontal: 40 },
    handle: {
      width: 44, height: 5, borderRadius: 3,
      backgroundColor: dark ? t.sinDatos : withOpacity(t.texto, 0.28),
    },
    title: {
      color: dark ? Colors.neonGreen : t.tealTexto,
      fontFamily: Fonts.bold, fontSize: FontSizes.sm, marginTop: 4, letterSpacing: 1,
    },
    body: { flex: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  });
};
