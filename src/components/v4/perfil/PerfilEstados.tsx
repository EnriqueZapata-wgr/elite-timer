/**
 * PerfilEstados (8-oct-2026 (v4)): las caras del Perfil que no son el
 * documento. Esqueleto mientras lee; tarjeta honesta (no se pudo leer, sin
 * documento, documento sin evaluacion) con sus botones, para que nunca se
 * vea vacio y nada se pierda; y la fila de enlace ("Tu historia",
 * "Tu documento completo").
 *
 * 14-oct-2026 (ronda de marca): bordes neutros, esqueleto del heroe en 16/9
 * (igual que el heroe) y el indicador de carga del boton principal con la
 * misma tinta que su texto (en claro iba negro sobre teal).
 */
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon, type AppIconName } from '@/src/components/ui/AppIcon';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';
import { LETTER_SPACING } from '@/src/constants/brand';
import type { RutaPerfil } from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { acento, suave, TOQUE_MIN } from './perfil-ui';

export function PerfilEsqueleto({ etiqueta }: { etiqueta: string }) {
  const { t, borde } = useTintaMarca();
  const bloque = { backgroundColor: t.card, borderColor: borde };
  return (
    <View style={s.esqueleto} accessible accessibilityLabel={etiqueta}>
      <View style={[s.esqTitulo, bloque]} />
      <View style={[s.esqHero, bloque]} />
      <View style={s.esqChips}>
        {[0, 1, 2].map((i) => <View key={i} style={[s.esqChip, bloque]} />)}
      </View>
      {[0, 1, 2, 3].map((i) => <View key={i} style={[s.esqFila, bloque]} />)}
    </View>
  );
}

export interface BotonTarjeta {
  texto: string;
  onPress: () => void;
  /** El principal va relleno; los demas, con borde. */
  principal?: boolean;
  cargando?: boolean;
}

interface TarjetaProps {
  ceja?: string;
  titulo: string;
  texto: string;
  icono?: AppIconName;
  botones: BotonTarjeta[];
}

export function PerfilTarjetaHonesta({ ceja, titulo, texto, icono, botones }: TarjetaProps) {
  const { t, borde } = useTintaMarca();
  const color = acento(t);
  const tintaPrincipal = t.kind === 'dark' ? t.textoSobreLima : t.card;
  return (
    <View style={[s.tarjeta, { backgroundColor: t.card, borderColor: borde }]}>
      {icono ? <AppIcon name={icono} size={28} color={color} /> : null}
      {ceja ? <EliteText style={[s.ceja, { color }]}>{ceja}</EliteText> : null}
      <EliteText style={[s.titulo, { color: t.texto }]} accessibilityRole="header">{titulo}</EliteText>
      <EliteText style={[s.texto, { color: t.textoSecundario }]}>{texto}</EliteText>
      <View style={s.botones}>
        {botones.map((b) => (
          <AnimatedPressable
            key={b.texto}
            disabled={b.cargando}
            onPress={() => { haptic.light(); b.onPress(); }}
            accessibilityRole="button"
            accessibilityLabel={b.texto}
            accessibilityState={{ busy: b.cargando === true }}
            style={[
              s.boton,
              b.principal
                ? { backgroundColor: t.kind === 'dark' ? color : t.tealTexto, borderColor: 'transparent' }
                : { borderColor: borde, backgroundColor: suave(t.hundido, 0.6) },
            ]}
          >
            {b.cargando ? (
              <ActivityIndicator size="small" color={b.principal ? tintaPrincipal : t.texto} />
            ) : (
              <EliteText
                style={[s.botonTexto, { color: b.principal ? tintaPrincipal : t.texto }]}
              >
                {b.texto}
              </EliteText>
            )}
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
}

interface FilaProps {
  icono: AppIconName;
  titulo: string;
  detalle?: string;
  ruta: RutaPerfil;
}

export function PerfilFilaEnlace({ icono, titulo, detalle, ruta }: FilaProps) {
  const { t, borde } = useTintaMarca();
  const router = useRouter();
  return (
    <AnimatedPressable
      onPress={() => { haptic.light(); router.push(ruta); }}
      accessibilityRole="link"
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      style={[s.fila, { backgroundColor: t.card, borderColor: borde }]}
    >
      <AppIcon name={icono} size={22} color={t.texto} />
      <View style={s.filaTextos}>
        <EliteText style={[s.filaTitulo, { color: t.texto }]}>{titulo}</EliteText>
        {detalle ? <EliteText style={[s.filaDetalle, { color: t.textoSecundario }]}>{detalle}</EliteText> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  esqueleto: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.md },
  esqTitulo: { height: 56, width: '70%', borderRadius: Radius.sm, borderWidth: 1 },
  esqHero: { aspectRatio: 16 / 9, borderRadius: Radius.card, borderWidth: 1 },
  esqChips: { flexDirection: 'row', gap: Spacing.sm },
  esqChip: { height: TOQUE_MIN, width: 96, borderRadius: Radius.pill, borderWidth: 1 },
  esqFila: { height: 52, borderRadius: Radius.sm, borderWidth: 1 },
  tarjeta: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: Radius.card, borderWidth: 1,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  ceja: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: LETTER_SPACING.wide },
  titulo: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, lineHeight: 24 },
  texto: { fontSize: FontSizes.sm, lineHeight: 20 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  boton: {
    minHeight: TOQUE_MIN, minWidth: 120, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  botonTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  fila: {
    minHeight: TOQUE_MIN + 12, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.md, borderRadius: Radius.card, borderWidth: 1, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  filaTextos: { flex: 1 },
  filaTitulo: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  filaDetalle: { fontSize: FontSizes.xs, marginTop: 2 },
});
