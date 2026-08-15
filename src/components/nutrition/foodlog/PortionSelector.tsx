/**
 * NOCHE-2 · Selector de porción.
 *
 * Abre en la porción default del alimento (1 tortilla, 1 taza, 1 bistec) y
 * deja cambiar a gramos, onzas o medidas de volumen. Es lo que separa
 * "escribe cuántos gramos crees que pesa tu taco" de "3 tortillas".
 *
 * Aquí no hay aritmética: toda la conversión vive en food-library-core. Este
 * componente solo elige la unidad y muestra a cuántos gramos equivale, para
 * que el usuario vea la traducción y no tenga que confiar a ciegas.
 *
 * Las unidades de volumen solo aparecen si el alimento trae densidad. Sin
 * ella no hay forma honesta de pasar de mililitros a gramos, así que la
 * opción ni se ofrece.
 */
import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { useAppTheme } from '@/src/contexts/theme-context';
import {
  resolverGramos, unidadesDisponibles,
  type Cantidad, type FoodItem, type UnidadMasa, type UnidadVolumen,
} from '@/src/services/food-library-core';

/** Una opción del carrusel de unidades. */
type Opcion =
  | { clase: 'porcion'; label: string }
  | { clase: 'masa'; unidad: UnidadMasa }
  | { clase: 'volumen'; unidad: UnidadVolumen };

/** Etiquetas cortas en español. Las porciones ya vienen nombradas de la base. */
const NOMBRE_VOLUMEN: Record<string, string> = {
  ml: 'ml', l: 'l', taza: 'taza', cda: 'cda', cdta: 'cdta', floz: 'fl oz',
};

/**
 * El carrusel: primero lo que el usuario reconoce (sus porciones caseras),
 * después el gramo, y hasta el final las unidades que casi nadie usa.
 */
function opciones(food: FoodItem): Opcion[] {
  const u = unidadesDisponibles(food);
  const out: Opcion[] = u.porciones.map((p) => ({ clase: 'porcion' as const, label: p.label }));
  out.push({ clase: 'masa', unidad: 'g' });
  for (const v of u.volumen) {
    if (v === 'l' || v === 'floz') continue; // ruido: litro y onza líquida casi no se usan aquí
    out.push({ clase: 'volumen', unidad: v });
  }
  out.push({ clase: 'masa', unidad: 'oz' });
  return out;
}

function esActiva(c: Cantidad, o: Opcion): boolean {
  if (o.clase === 'porcion') return c.tipo === 'porcion' && c.label === o.label;
  if (o.clase === 'masa') {
    if (o.unidad === 'g') return c.tipo === 'gramos' || (c.tipo === 'masa' && c.unidad === 'g');
    return c.tipo === 'masa' && c.unidad === o.unidad;
  }
  return c.tipo === 'volumen' && c.unidad === o.unidad;
}

function etiqueta(o: Opcion): string {
  if (o.clase === 'porcion') return o.label;
  if (o.clase === 'masa') return o.unidad;
  return NOMBRE_VOLUMEN[o.unidad] ?? o.unidad;
}

/**
 * Al cambiar de unidad el número se reinicia a algo sensato: 1 de la porción
 * o de la medida, 100 si son gramos. Arrastrar el 3 de "3 tortillas" a los
 * gramos daría 3 g de tortilla, que no es lo que nadie quiso decir.
 */
function nuevaCantidad(o: Opcion): Cantidad {
  if (o.clase === 'porcion') return { tipo: 'porcion', valor: 1, label: o.label };
  if (o.clase === 'masa') {
    if (o.unidad === 'g') return { tipo: 'gramos', valor: 100 };
    return { tipo: 'masa', valor: 1, unidad: o.unidad };
  }
  return { tipo: 'volumen', valor: o.unidad === 'ml' ? 250 : 1, unidad: o.unidad };
}

function conValor(c: Cantidad, valor: number): Cantidad {
  return { ...c, valor };
}

interface Props {
  food: FoodItem;
  cantidad: Cantidad;
  onChange: (c: Cantidad) => void;
  /** Color de acento ya resuelto por el tema de la pantalla. */
  acento: string;
}

export function PortionSelector({ food, cantidad, onChange, acento }: Props) {
  const { tokens: t } = useAppTheme();
  const gramos = resolverGramos(food, cantidad);
  const ops = opciones(food);

  return (
    <View style={s.wrap}>
      <View style={s.fila}>
        <TextInput
          style={[s.valor, { backgroundColor: t.flotante, color: acento }]}
          value={cantidad.valor > 0 ? String(cantidad.valor) : ''}
          onChangeText={(v) => {
            const limpio = v.replace(',', '.').replace(/[^0-9.]/g, '');
            const n = parseFloat(limpio);
            onChange(conValor(cantidad, Number.isFinite(n) ? n : 0));
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel="Cantidad"
        />
        {/* La traducción a gramos siempre a la vista: el usuario ve lo que la
            app va a contar, en vez de confiar a ciegas. */}
        <EliteText style={[s.equivale, { color: t.textoSecundario }]}>
          {gramos != null && gramos > 0 ? `= ${Math.round(gramos)} g` : 'sin equivalencia'}
        </EliteText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.pills}
      >
        {ops.map((o, i) => {
          const activa = esActiva(cantidad, o);
          return (
            <AnimatedPressable
              key={`${o.clase}-${etiqueta(o)}-${i}`}
              scaleDown={0.94}
              onPress={() => { haptic.light(); onChange(nuevaCantidad(o)); }}
              style={[
                s.pill,
                { backgroundColor: t.card, borderColor: t.borde },
                activa && { backgroundColor: acento + '1F', borderColor: acento + '55' },
              ]}
            >
              <EliteText style={{
                fontSize: FontSizes.sm,
                fontFamily: activa ? Fonts.semiBold : Fonts.regular,
                color: activa ? acento : t.textoSecundario,
              }}>
                {etiqueta(o)}
              </EliteText>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 10, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  valor: {
    width: 84,
    height: 48,
    fontFamily: Fonts.bold,
    fontSize: 20,
    textAlign: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: 8,
  },
  equivale: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  pills: { gap: 8, paddingRight: Spacing.sm },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
