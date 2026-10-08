/**
 * PerfilCabecera (8-oct-2026 (v4)): la ceja "TU PERFIL", el titulo segun la
 * entrega, la pildora de la entrega (o la version del programa) y el boton
 * redondo con la inicial, que lleva a Tú (cuenta y ajustes).
 */
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { RUTAS_PERFIL } from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { acento, suave, TOQUE_MIN } from './perfil-ui';

interface Props {
  ceja: string;
  titulo: string;
  pildora: string | null;
  inicial: string | null;
}

export function PerfilCabecera({ ceja, titulo, pildora, inicial }: Props) {
  const t = useSurfaceTokens();
  const router = useRouter();
  const color = acento(t);
  return (
    <View style={s.fila}>
      <View style={s.textos}>
        <EliteText style={[s.ceja, { color }]}>{ceja}</EliteText>
        <EliteText style={[s.titulo, { color: t.texto }]} accessibilityRole="header">{titulo}</EliteText>
        {pildora ? (
          <View style={[s.pildora, { borderColor: t.borde, backgroundColor: suave(t.card, 0.9) }]}>
            <EliteText style={[s.pildoraTexto, { color: t.textoSecundario }]}>{pildora}</EliteText>
          </View>
        ) : null}
      </View>
      <AnimatedPressable
        onPress={() => { haptic.light(); router.push(RUTAS_PERFIL.tu); }}
        accessibilityRole="button"
        accessibilityLabel="Abrir tu cuenta y ajustes"
        style={[s.avatar, { backgroundColor: t.card, borderColor: t.borde }]}
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
  ceja: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3 },
  titulo: { fontSize: FontSizes.hero, fontFamily: Fonts.extraBold, marginTop: 2, lineHeight: 34 },
  pildora: {
    alignSelf: 'flex-start', marginTop: Spacing.sm, borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pildoraTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, letterSpacing: 0.5 },
  avatar: {
    width: TOQUE_MIN + 4, height: TOQUE_MIN + 4, borderRadius: (TOQUE_MIN + 4) / 2, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  inicial: { fontSize: FontSizes.xl, fontFamily: Fonts.bold },
});
