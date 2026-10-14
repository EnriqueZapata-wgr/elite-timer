/**
 * PerfilCabecera (8-oct-2026 (v4)): la ceja "TU PERFIL", el titulo segun la
 * entrega, la pildora de la entrega (o la version del programa) y el boton
 * redondo con la inicial, que lleva a Tú (cuenta y ajustes).
 *
 * 14-oct-2026 (ronda de marca): la ceja deja de ser teal con letterSpacing 3
 * (el 3 es solo del logo) y toma el SECTION_TITLE gris de la casa.
 */
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';
import { LETTER_SPACING, SECTION_TITLE } from '@/src/constants/brand';
import { RUTAS_PERFIL } from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { suave, TOQUE_MIN } from './perfil-ui';

interface Props {
  ceja: string;
  titulo: string;
  pildora: string | null;
  inicial: string | null;
}

export function PerfilCabecera({ ceja, titulo, pildora, inicial }: Props) {
  const { t, borde } = useTintaMarca();
  const router = useRouter();
  return (
    <View style={s.fila}>
      <View style={s.textos}>
        <EliteText style={[s.ceja, { color: t.textoSecundario }]}>{ceja}</EliteText>
        <EliteText style={[s.titulo, { color: t.texto }]} accessibilityRole="header">{titulo}</EliteText>
        {pildora ? (
          <View style={[s.pildora, { borderColor: borde, backgroundColor: suave(t.card, 0.9) }]}>
            <EliteText style={[s.pildoraTexto, { color: t.textoSecundario }]}>{pildora}</EliteText>
          </View>
        ) : null}
      </View>
      <AnimatedPressable
        onPress={() => { haptic.light(); router.push(RUTAS_PERFIL.tu); }}
        accessibilityRole="button"
        accessibilityLabel="Abrir tu cuenta y ajustes"
        style={[s.avatar, { backgroundColor: t.card, borderColor: borde }]}
      >
        {inicial ? (
          <EliteText style={[s.inicial, { color: t.texto }]}>{inicial}</EliteText>
        ) : (
          <AppIcon name="tab-tu" size={22} color={t.texto} />
        )}
      </AnimatedPressable>
    </View>
  );
}

const s = StyleSheet.create({
  fila: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.md,
  },
  textos: { flex: 1 },
  ceja: {
    fontSize: SECTION_TITLE.fontSize, fontFamily: Fonts.semiBold, letterSpacing: SECTION_TITLE.letterSpacing,
    textTransform: SECTION_TITLE.textTransform,
  },
  titulo: { fontSize: FontSizes.hero, fontFamily: Fonts.extraBold, marginTop: Spacing.xs, lineHeight: 34 },
  pildora: {
    alignSelf: 'flex-start', marginTop: Spacing.sm, borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  pildoraTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, letterSpacing: LETTER_SPACING.tight },
  avatar: {
    width: TOQUE_MIN + 4, height: TOQUE_MIN + 4, borderRadius: (TOQUE_MIN + 4) / 2, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  inicial: { fontSize: FontSizes.xl, fontFamily: Fonts.bold },
});
