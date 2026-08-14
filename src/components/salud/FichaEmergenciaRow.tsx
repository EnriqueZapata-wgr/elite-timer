/**
 * FichaEmergenciaRow — la única fila roja de SALUD.
 *
 * OLA6 PIEZA D. El rojo en ATP no se usa para adornar ni para alarmar: se usa
 * una vez, aquí, porque esta es la única fila que alguien va a buscar con
 * prisa y sin conocer la app. Si mañana aparece una segunda fila roja, esta
 * deja de significar lo que significa.
 *
 * Vive en la sección MI EXPEDIENTE porque es lo que un tercero necesita LEER
 * de ti, no lo que tú mides.
 */
import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { hasLocalCard } from '@/src/services/salud/emergency-card-store';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

/** Rojo de urgencias. No es un token de marca: es señalética. */
const ROJO = '#D93636';

export function FichaEmergenciaRow() {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const [existe, setExiste] = useState<boolean | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    hasLocalCard().then((v) => { if (alive) setExiste(v); });
    return () => { alive = false; };
  }, []));

  return (
    <AnimatedPressable
      style={s.row}
      onPress={() => { haptic.medium(); router.push('/salud/ficha-emergencia'); }}
    >
      <View style={s.icon}>
        <Ionicons name="medkit" size={18} color={ROJO} />
      </View>
      <View style={{ flex: 1 }}>
        <EliteText style={s.title}>Ficha de emergencia</EliteText>
        <EliteText style={s.sub} numberOfLines={1}>
          {existe === false
            ? 'Sangre, alergias y a quién llamar. Aún sin llenar'
            : 'Sangre, alergias y a quién llamar, sin abrir sesión'}
        </EliteText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={ROJO} />
    </AnimatedPressable>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.hundido,
    borderWidth: 1, borderColor: ROJO + '66',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6,
  },
  icon: {
    width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ROJO + '1A',
  },
  title: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  sub: { color: t.textoSecundario, fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 1 },
});

export { ROJO as ROJO_EMERGENCIA };
export const FICHA_ROW_SPACING = Spacing.xs;
