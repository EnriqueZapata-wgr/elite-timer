/**
 * VerProRow (ATP 3.0, 5-sep-2026, ruta 1.11): el botón que acompaña a la
 * burbuja del límite diario de Free en el chat de ARGOS.
 *
 * El proxy contestó 429 `free_chat_limit`; la pantalla pintó su mensaje como
 * burbuja de ARGOS y aquí va la salida: un chip "Ver Pro" que abre el paywall
 * con `contexto=cuarto_chat` (pivote 3.3: el cuarto mensaje es un momento de
 * conversión, no un error). Mismo molde de chip que NavOptionsRow para que no
 * se sienta como otra app; el lima sí aparece porque aquí SÍ es la acción de
 * la pantalla.
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

interface Props {
  /** Contexto del paywall que mandó el proxy (normalmente 'cuarto_chat'). */
  contexto: string;
}

export function VerProRow({ contexto }: Props) {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.wrap}>
      <AnimatedPressable
        onPress={() => { haptic.medium(); router.push({ pathname: '/paywall', params: { contexto } }); }}
        style={s.chip}
        accessibilityRole="button"
        accessibilityLabel="Ver Pro"
      >
        <Ionicons name="lock-closed" size={14} color={t.textoSobreLima} />
        <Text style={s.chipText}>Ver Pro</Text>
      </AnimatedPressable>
    </View>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  wrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginBottom: 12, justifyContent: 'flex-start',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.6),
  },
  chipText: {
    color: t.textoSobreLima, fontSize: FontSizes.sm, fontFamily: Fonts.bold,
  },
});
