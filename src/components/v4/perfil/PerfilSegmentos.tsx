/**
 * PerfilSegmentos (8-oct-2026 (v4)): las pestanas internas del Perfil
 * (Sistemas, Marcadores, Cruces si la entrega los trae, Genetica). Cuales
 * aparecen lo decide perfil-core; aqui solo se pintan y se eligen.
 */
import { ScrollView, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { ETIQUETA_PESTANA, type PestanaPerfil } from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { acento, suave, TOQUE_MIN } from './perfil-ui';

interface Props {
  pestanas: PestanaPerfil[];
  activa: PestanaPerfil;
  onCambiar: (p: PestanaPerfil) => void;
}

export function PerfilSegmentos({ pestanas, activa, onCambiar }: Props) {
  const t = useSurfaceTokens();
  const color = acento(t);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.fila}
      accessibilityRole="tablist"
    >
      {pestanas.map((p) => {
        const on = p === activa;
        return (
          <AnimatedPressable
            key={p}
            onPress={() => { if (!on) { haptic.selection(); onCambiar(p); } }}
            accessibilityRole="tab"
            accessibilityLabel={ETIQUETA_PESTANA[p]}
            accessibilityState={{ selected: on }}
            style={[
              s.chip,
              { borderColor: on ? color : t.borde, backgroundColor: on ? suave(color, 0.14) : t.card },
            ]}
          >
            <EliteText style={[s.texto, { color: on ? t.texto : t.textoSecundario }]}>{ETIQUETA_PESTANA[p]}</EliteText>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fila: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm },
  chip: {
    minHeight: TOQUE_MIN, paddingHorizontal: Spacing.md, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  texto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
