/**
 * HojaReceta: la ficha de una receta como hoja de verdad (31-ago-2026).
 *
 * Hasta hoy tocar una receta del catalogo abria un Alert con ingredientes y
 * pasos en texto plano (pendiente 16.2). Enrique lo pidio textual: "que
 * pudieras acceder a la ficha de las recetas y que se la puedas cargar a
 * ARGOS para que ARGOS pueda modificarla". Eso es lo que hace esta hoja:
 * pinta la ficha completa y tiene tres salidas.
 *
 *  1. Registrar hoy: el mismo registerRecipe de la pestana, que ya sabe
 *     mandar null a food_logs cuando la ficha no trae un macro.
 *  2. Mandar a la lista: sendRecipeToList, la UNICA puerta receta -> lista
 *     (la misma que usan ListaTab y GeneradorArgos). Aqui no se duplica nada,
 *     solo se llama.
 *  3. Pedirle a ARGOS que la modifique: navega a
 *     /argos-chat?contexto=receta&ref=<uuid>. El contrato vive en
 *     argos-contexto-core: el chat carga la receta por su id y la mete como
 *     contexto con la instruccion de que la persona quiere modificarla. Esta
 *     hoja SOLO navega.
 *
 * Patron de hoja: el mismo de SupplementScanSheet (Modal slide de pantalla
 * completa, cabecera con cerrar, ScrollView con insets). No se inventa otro.
 *
 * La hoja recibe la receta ya cargada, asi que no hay estado cargando. Lo que
 * si hay es ficha incompleta: con las 93 de la 310 entran recetas sin pasos,
 * y las de la persona (user_recipes) no tienen pasos nunca. Se dice, no se
 * deja una seccion vacia.
 */
import { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { useAuth } from '@/src/contexts/auth-context';
import { sendRecipeToList } from '@/src/services/shopping-list-service';
import {
  textoIngrediente, detalleIngrediente, textoPaso, etiquetaMomento,
  type RecetaEnPantalla,
} from '@/src/services/nutrition/catalogo-recetas-core';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  /** null = hoja cerrada. La receta llega ya cargada desde la lista. */
  receta: RecetaEnPantalla | null;
  onCerrar: () => void;
  /** El registerRecipe de la pestana: un solo camino a food_logs. */
  onRegistrar: (receta: RecetaEnPantalla) => Promise<void> | void;
}

/**
 * Raya cuando la ficha no trae el dato. NO cero: "0 g de proteina" en un
 * pescado es un dato falso, no un dato faltante. Mismo criterio que la tarjeta.
 */
const macro = (v: number | null | undefined, sufijo: string) =>
  v == null ? '—' : `${v}${sufijo}`;

export function HojaReceta({ receta, onCerrar, onRegistrar }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // Componente compartido dentro de /cocina (que monta ThemeReady via
  // <Screen themed>), asi que useSurfaceTokens da el tema real.
  const t = useSurfaceTokens();
  const s = makeStyles(t);
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const azulTx = t.kind === 'dark' ? '#38bdf8' : t.info;
  const [registrando, setRegistrando] = useState(false);
  const [mandando, setMandando] = useState(false);
  const [resumenLista, setResumenLista] = useState<string | null>(null);
  // Al cerrar, `receta` pasa a null antes de que termine la animacion de
  // salida del Modal; sin esto la hoja se vacia a media bajada.
  const ultima = useRef<RecetaEnPantalla | null>(null);
  if (receta) ultima.current = receta;
  const r = receta ?? ultima.current;

  function cerrar() {
    haptic.light();
    setResumenLista(null);
    onCerrar();
  }

  async function registrar() {
    if (!r || registrando) return;
    setRegistrando(true);
    try {
      await onRegistrar(r);
    } finally {
      setRegistrando(false);
    }
  }

  async function mandarALista() {
    if (!r || !user?.id || mandando) return;
    haptic.medium();
    setMandando(true);
    // try/finally: supabase-js no rechaza en 4xx (eso llega como res.ok
    // false), pero SI rechaza cuando falla el fetch (modo avion). Sin esto
    // `mandando` se quedaba en true para siempre y el boton muerto.
    try {
      const res = await sendRecipeToList(user.id, { name: r.name, ingredients: r.ingredients });
      if (!res.ok) {
        Alert.alert('No se pudo mandar a la lista', 'Revisa tu conexión e intenta de nuevo.');
        return;
      }
      haptic.success();
      // Mismo resumen que ListaTab y GeneradorArgos, para que la lista diga lo
      // mismo desde cualquier puerta.
      const partes: string[] = [];
      if (res.added > 0) partes.push(`${res.added} a tu lista`);
      if (res.merged > 0) partes.push(`${res.merged} ya estaba${res.merged > 1 ? 'n' : ''}`);
      if (res.inPantry.length > 0) partes.push(`en tu despensa: ${res.inPantry.join(', ')}`);
      setResumenLista(partes.length > 0 ? partes.join(' · ') : 'Sin ingredientes nuevos para la lista.');
    } catch {
      Alert.alert('No se pudo mandar a la lista', 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setMandando(false);
    }
  }

  function pedirAArgos() {
    if (!r) return;
    haptic.medium();
    // El Modal se presenta por encima de la navegacion: si no se cierra antes,
    // el chat se abre debajo y no se ve.
    setResumenLista(null);
    onCerrar();
    router.push({ pathname: '/argos-chat', params: { contexto: 'receta', ref: r.id } });
  }

  if (!r) return null;

  const momento = etiquetaMomento(r.meal_type);
  const meta = [
    momento,
    r.servings ? `${r.servings} porción${r.servings > 1 ? 'es' : ''}` : null,
    r.prep_time_min ? `${r.prep_time_min} min de preparación` : null,
    r.cook_time_min ? `${r.cook_time_min} min de cocción` : null,
  ].filter((x): x is string => !!x);
  const ingredientes = (r.ingredients ?? [])
    .map((i) => ({ texto: textoIngrediente(i), detalle: detalleIngrediente(i) }))
    .filter((i) => i.texto);
  const pasos = (r.instructions ?? []).map(textoPaso).filter(Boolean);
  const algunMacroNulo = r.total_calories == null || r.total_protein == null
    || r.total_carbs == null || r.total_fat == null;
  const propia = r.origin === 'user';

  return (
    <Modal visible={receta != null} animationType="slide" onRequestClose={cerrar}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.headerRow}>
          <EliteText variant="caption" style={s.headerLabel}>
            {propia ? 'Tu receta' : 'Receta del catálogo'}
          </EliteText>
          <Pressable onPress={cerrar} hitSlop={12} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={t.textoSecundario} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          <EliteText style={s.nombre}>{r.name}</EliteText>
          {meta.length > 0 && (
            <EliteText variant="caption" style={s.meta}>{meta.join(' · ')}</EliteText>
          )}

          {/* Macros: mismo orden y mismos colores que la tarjeta de la lista. */}
          <View style={s.macroCard}>
            <View style={s.macroRow}>
              <View style={s.macroItem}>
                <EliteText style={[s.macroValue, { color: r.total_calories == null ? t.textoSecundario : t.texto }]}>{macro(r.total_calories, '')}</EliteText>
                <EliteText style={s.macroLabel}>kcal</EliteText>
              </View>
              <View style={s.macroDivider} />
              <View style={s.macroItem}>
                <EliteText style={[s.macroValue, { color: r.total_protein == null ? t.textoSecundario : azulTx }]}>{macro(r.total_protein, 'g')}</EliteText>
                <EliteText style={s.macroLabel}>proteína</EliteText>
              </View>
              <View style={s.macroDivider} />
              <View style={s.macroItem}>
                <EliteText style={[s.macroValue, { color: r.total_carbs == null ? t.textoSecundario : t.texto }]}>{macro(r.total_carbs, 'g')}</EliteText>
                <EliteText style={s.macroLabel}>carbs</EliteText>
              </View>
              <View style={s.macroDivider} />
              <View style={s.macroItem}>
                <EliteText style={[s.macroValue, { color: r.total_fat == null ? t.textoSecundario : t.texto }]}>{macro(r.total_fat, 'g')}</EliteText>
                <EliteText style={s.macroLabel}>grasa</EliteText>
              </View>
            </View>
            {algunMacroNulo && (
              <EliteText variant="caption" style={s.macroNota}>
                La raya es un dato que la ficha no trae. No se inventa.
              </EliteText>
            )}
          </View>

          {!!r.description && (
            <EliteText style={s.descripcion}>{r.description}</EliteText>
          )}

          <EliteText style={s.seccion}>Ingredientes</EliteText>
          {ingredientes.length === 0 ? (
            <EliteText style={s.vacio}>Esta ficha todavía no trae ingredientes.</EliteText>
          ) : ingredientes.map((i, idx) => (
            <View key={idx} style={s.ingRow}>
              <View style={s.ingPunto} />
              <View style={{ flex: 1 }}>
                <EliteText style={s.ingTexto}>{i.texto}</EliteText>
                {!!i.detalle && (
                  <EliteText variant="caption" style={s.ingDetalle}>{i.detalle}</EliteText>
                )}
              </View>
            </View>
          ))}

          <EliteText style={s.seccion}>Pasos</EliteText>
          {pasos.length === 0 ? (
            <EliteText style={s.vacio}>
              {propia
                ? 'Tus recetas guardadas no traen pasos. Si quieres, ARGOS te los propone.'
                : 'Esta ficha todavía no trae pasos.'}
            </EliteText>
          ) : pasos.map((p, idx) => (
            <View key={idx} style={s.pasoRow}>
              <View style={s.pasoNum}>
                <EliteText style={s.pasoNumTexto}>{idx + 1}</EliteText>
              </View>
              <EliteText style={s.pasoTexto}>{p}</EliteText>
            </View>
          ))}
        </ScrollView>

        {/* Pie fijo: las tres salidas siempre a la mano, sin bajar 20 pasos. */}
        <View style={[s.pie, { paddingBottom: insets.bottom + Spacing.sm }]}>
          {!!resumenLista && (
            <EliteText variant="caption" style={s.resumenLista}>{resumenLista}</EliteText>
          )}
          <View style={s.pieFila}>
            <AnimatedPressable onPress={registrar} disabled={registrando} style={s.btnSec}>
              <Ionicons name="add-circle" size={18} color={acento} />
              <EliteText style={s.btnSecTexto}>{registrando ? 'Registrando...' : 'Registrar hoy'}</EliteText>
            </AnimatedPressable>
            <AnimatedPressable onPress={mandarALista} disabled={mandando} style={s.btnSec}>
              <AppIcon name="lista-compra" size={18} color={acento} />
              <EliteText style={s.btnSecTexto}>{mandando ? 'Mandando...' : 'Mandar a la lista'}</EliteText>
            </AnimatedPressable>
          </View>
          <AnimatedPressable onPress={pedirAArgos} style={s.btnArgos}>
            <Ionicons name="sparkles" size={18} color={ATP_BRAND.black} />
            <EliteText style={s.btnArgosTexto}>Pedirle a ARGOS que la modifique</EliteText>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

// Tokens del tema (patron makeStyles de SupplementScanSheet). El lima como
// RELLENO con negro encima es correcto en los dos temas (manual 3.6); como
// texto no, por eso el acento de los botones secundarios va por `acento`.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.fondo },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  headerLabel: {
    color: t.textoSecundario, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.card,
  },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },

  nombre: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xxl, lineHeight: 30 },
  meta: { color: t.textoSecundario, fontSize: FontSizes.sm, marginTop: 6 },

  macroCard: {
    backgroundColor: t.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: ATP_BRAND.amber,
  },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', flex: 1 },
  macroValue: { fontSize: FontSizes.xl, fontFamily: Fonts.bold },
  macroLabel: { color: t.textoSecundario, fontSize: FontSizes.xs, marginTop: 2 },
  macroDivider: { width: 1, height: 32, backgroundColor: t.borde },
  macroNota: { color: t.textoSecundario, fontSize: FontSizes.xs, marginTop: Spacing.sm, textAlign: 'center' },

  descripcion: { color: t.texto, fontSize: FontSizes.md, lineHeight: 21, marginTop: Spacing.md },

  seccion: {
    color: t.textoSecundario, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm,
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  vacio: { color: t.textoSecundario, fontSize: FontSizes.md, lineHeight: 21 },

  ingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  // El punto es forma, no texto: ambar como en la tarjeta.
  ingPunto: { width: 6, height: 6, borderRadius: 3, backgroundColor: ATP_BRAND.amber, marginTop: 8 },
  ingTexto: { color: t.texto, fontSize: FontSizes.md, lineHeight: 21 },
  ingDetalle: { color: t.textoSecundario, fontSize: FontSizes.sm, marginTop: 1 },

  pasoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  pasoNum: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.hundido, borderWidth: 0.5, borderColor: t.borde, marginTop: 1,
  },
  pasoNumTexto: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  pasoTexto: { flex: 1, color: t.texto, fontSize: FontSizes.md, lineHeight: 22 },

  pie: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: t.borde, backgroundColor: t.fondo,
  },
  pieFila: { flexDirection: 'row', gap: Spacing.sm },
  btnSec: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: Radius.card,
    backgroundColor: t.hundido, borderWidth: 0.5, borderColor: t.borde,
  },
  btnSecTexto: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  btnArgos: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: Radius.card, backgroundColor: ATP_BRAND.lime,
  },
  btnArgosTexto: { color: ATP_BRAND.black, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  resumenLista: { color: t.exito, fontSize: FontSizes.sm, textAlign: 'center' },
});
