/**
 * Lista de compra — persistente y conectada (MB-28B · Pieza 3).
 *
 * Antes: se armaba desde recetas en memoria y moría al salir de la pantalla.
 * Ahora vive en shopping_list_items (migración 260) y tiene las dos
 * conexiones que la vuelven útil:
 *   1. De la receta a la lista: tocar una receta manda sus ingredientes,
 *      sin duplicar lo que ya está anotado (planRecipeToList, pura).
 *   2. De la lista a la despensa: marcar comprado deja rastro; lo comprado
 *      no se vuelve a pedir la semana entrante mientras siga ahí.
 * También se escribe a mano, que es como empieza toda lista real.
 *
 * Nada se borra solo: quitar un item es acción explícita con confirmación.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Share, Pressable, TextInput, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { shoppingListToText, type ShoppingListItem } from '@/src/services/shopping-list-core';
import {
  fetchShoppingList, addManualItem, sendRecipeToList, setItemStatus, removeItemChecked,
} from '@/src/services/shopping-list-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, ATP_BRAND } from '@/src/constants/brand';

interface RecipeRow {
  id: string;
  name: string;
  ingredients: unknown;
  is_favorite: boolean;
}

export default function ListaCompraScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [listFailed, setListFailed] = useState(false);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  // D-2 (MB-12): fallo de red ≠ "sin recetas con ingredientes".
  const [recipesFailed, setRecipesFailed] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [busy, setBusy] = useState(false);
  /** Resumen del último envío de receta ("3 agregados · 1 ya estaba"). */
  const [sendSummary, setSendSummary] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetchShoppingList(user.id);
    if (!res.ok) { setListFailed(true); return; }
    setListFailed(false);
    setItems(res.items);
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    loadList();
    if (!user?.id) return;
    supabase.from('user_recipes')
      .select('id, name, ingredients, is_favorite')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setRecipesFailed(true); return; }
        setRecipesFailed(false);
        setRecipes((data as RecipeRow[]) ?? []);
      });
  }, [user?.id, loadList]));

  const pending = items.filter((i) => i.status === 'pending');
  const bought = items.filter((i) => i.status === 'bought');

  async function handleAddManual() {
    if (!user?.id || !manualInput.trim() || busy) return;
    haptic.light();
    setBusy(true);
    const res = await addManualItem(user.id, manualInput);
    setBusy(false);
    if (res.status === 'error') {
      Alert.alert('No se pudo agregar', 'Revisa tu conexión e intenta de nuevo.');
      return;
    }
    setManualInput('');
    setSendSummary(res.status === 'exists' ? 'Ya estaba en tu lista.' : null);
    loadList();
  }

  async function handleSendRecipe(recipe: RecipeRow) {
    if (!user?.id || busy) return;
    haptic.medium();
    setBusy(true);
    const res = await sendRecipeToList(user.id, { name: recipe.name, ingredients: recipe.ingredients });
    setBusy(false);
    if (!res.ok) {
      Alert.alert('No se pudo mandar', 'Revisa tu conexión e intenta de nuevo.');
      return;
    }
    haptic.success();
    const parts: string[] = [];
    if (res.added > 0) parts.push(`${res.added} a tu lista`);
    if (res.merged > 0) parts.push(`${res.merged} ya estaba${res.merged > 1 ? 'n' : ''}`);
    if (res.inPantry.length > 0) parts.push(`en tu despensa: ${res.inPantry.join(', ')}`);
    setSendSummary(`${recipe.name}: ${parts.length > 0 ? parts.join(' · ') : 'sin ingredientes nuevos'}`);
    loadList();
  }

  async function handleToggleBought(item: ShoppingListItem) {
    haptic.light();
    const next = item.status === 'pending' ? 'bought' : 'pending';
    // Optimista: la vuelta al estado real la da el reload.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    const res = await setItemStatus(item.id, next);
    if (!res.ok) loadList();
  }

  function handleRemove(item: ShoppingListItem) {
    haptic.heavy();
    Alert.alert('Quitar de la lista', `¿Quitar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive',
        onPress: async () => {
          const res = await removeItemChecked(item.id);
          if (!res.ok) { Alert.alert('No se pudo quitar', 'Intenta de nuevo.'); return; }
          loadList();
        },
      },
    ]);
  }

  async function shareList() {
    haptic.medium();
    const text = shoppingListToText(pending.map((i) => ({ name: i.name, detail: i.detail ?? '' })));
    try { await Share.share({ message: text }); } catch { /* cancelado */ }
  }

  const withIngredients = recipes.filter((r) => Array.isArray(r.ingredients) && (r.ingredients as unknown[]).length > 0);
  const withoutIngredients = recipes.length - withIngredients.length;

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Lista de compra" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled">

        {/* ── Alta a mano: como empieza toda lista real ── */}
        <View style={s.addRow}>
          <TextInput
            style={s.addInput}
            value={manualInput}
            onChangeText={setManualInput}
            placeholder="Agregar a la lista (ej: aguacate)"
            placeholderTextColor={TEXT_COLORS.muted}
            returnKeyType="done"
            onSubmitEditing={handleAddManual}
          />
          <AnimatedPressable onPress={handleAddManual} scaleDown={0.9}
            style={[s.addBtn, { backgroundColor: manualInput.trim() ? '#a8e02a' : SURFACES.cardLight }]}>
            <Ionicons name="add" size={22} color={manualInput.trim() ? '#000' : TEXT_COLORS.muted} />
          </AnimatedPressable>
        </View>

        {listFailed && (
          <View style={s.empty}>
            <Ionicons name="cloud-offline-outline" size={48} color="#333" />
            <EliteText style={s.emptyTitle}>Tu lista no se pudo leer</EliteText>
            <EliteText style={s.emptySub}>
              Revisa tu conexión y vuelve a entrar. Tu lista sigue guardada.
            </EliteText>
          </View>
        )}

        {/* ── TU LISTA ── */}
        {pending.length > 0 && (
          <>
            <View style={s.listHeader}>
              <EliteText style={s.listTitle}>TU LISTA ({pending.length})</EliteText>
              <Pressable onPress={shareList} hitSlop={10} style={s.shareBtn}>
                <Ionicons name="share-outline" size={16} color="#000" />
                <EliteText style={s.shareText}>Compartir</EliteText>
              </Pressable>
            </View>
            {pending.map((item, idx) => (
              <Animated.View key={item.id} entering={FadeInUp.delay(idx * 30).springify()}>
                <View style={s.itemRow}>
                  <Pressable onPress={() => handleToggleBought(item)} hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                    <Ionicons name="ellipse-outline" size={20} color="#444" />
                    <View style={{ flex: 1 }}>
                      <EliteText style={s.itemName}>
                        {item.name}{item.detail ? ` · ${item.detail}` : ''}
                      </EliteText>
                      {item.fromRecipes.length > 0 && (
                        <EliteText style={s.itemFrom} numberOfLines={1}>
                          {item.fromRecipes.join(' · ')}
                        </EliteText>
                      )}
                    </View>
                  </Pressable>
                  <Pressable onPress={() => handleRemove(item)} hitSlop={8}>
                    <Ionicons name="close" size={16} color="#444" />
                  </Pressable>
                </View>
              </Animated.View>
            ))}
          </>
        )}

        {!listFailed && pending.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="cart-outline" size={48} color="#333" />
            <EliteText style={s.emptyTitle}>Tu lista está vacía</EliteText>
            <EliteText style={s.emptySub}>
              Escribe arriba lo que necesitas, o manda los ingredientes de una receta con un toque.
            </EliteText>
          </View>
        )}

        {/* ── EN TU DESPENSA: lo comprado deja rastro ── */}
        {bought.length > 0 && (
          <>
            <View style={s.listHeader}>
              <EliteText style={s.listTitle}>EN TU DESPENSA ({bought.length})</EliteText>
            </View>
            <EliteText variant="caption" style={s.pantryHint}>
              Lo comprado se queda aquí y la lista no te lo vuelve a pedir. Toca para pedirlo otra vez.
            </EliteText>
            {bought.map((item) => (
              <View key={item.id} style={s.itemRow}>
                <Pressable onPress={() => handleToggleBought(item)} hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#a8e02a" />
                  <EliteText style={[s.itemName, s.itemDone]}>
                    {item.name}{item.detail ? ` · ${item.detail}` : ''}
                  </EliteText>
                </Pressable>
                <Pressable onPress={() => handleRemove(item)} hitSlop={8}>
                  <Ionicons name="close" size={16} color="#444" />
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* ── DESDE TUS RECETAS: un toque manda los ingredientes ── */}
        {(withIngredients.length > 0 || recipesFailed) && (
          <View style={s.listHeader}>
            <EliteText style={s.listTitle}>DESDE TUS RECETAS</EliteText>
          </View>
        )}
        {sendSummary && (
          <EliteText variant="caption" style={s.sendSummary}>{sendSummary}</EliteText>
        )}
        {recipesFailed && (
          <EliteText variant="caption" style={s.note}>
            Tus recetas no se pudieron leer. Revisa tu conexión y vuelve a entrar.
          </EliteText>
        )}
        {withIngredients.map((r, idx) => (
          <Animated.View key={r.id} entering={FadeInUp.delay(idx * 40).springify()}>
            <AnimatedPressable onPress={() => handleSendRecipe(r)} style={s.recipeRow} disabled={busy}>
              <Ionicons name="arrow-up-circle-outline" size={22} color="#a8e02a" />
              <EliteText style={s.recipeName} numberOfLines={1}>{r.name}</EliteText>
              {r.is_favorite && <Ionicons name="heart" size={14} color="#fb7185" />}
              <EliteText variant="caption" style={{ color: '#666', fontSize: FontSizes.xs }}>
                {Array.isArray(r.ingredients) ? (r.ingredients as unknown[]).length : 0} ing.
              </EliteText>
            </AnimatedPressable>
          </Animated.View>
        ))}
        {!recipesFailed && withIngredients.length === 0 && (
          <EliteText variant="caption" style={s.note}>
            Guarda recetas con ingredientes (de ARGOS o desde tus registros) y mándalas aquí con un toque.
          </EliteText>
        )}
        {withoutIngredients > 0 && withIngredients.length > 0 && (
          <EliteText variant="caption" style={s.note}>
            {withoutIngredients} receta{withoutIngredients > 1 ? 's' : ''} sin ingredientes no aparece{withoutIngredients > 1 ? 'n' : ''} aquí.
          </EliteText>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md },

  addRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' },
  addInput: {
    flex: 1, backgroundColor: SURFACES.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: SURFACES.border,
    paddingHorizontal: 14, paddingVertical: 12,
    color: TEXT_COLORS.primary, fontSize: FontSizes.md, fontFamily: Fonts.regular,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },

  recipeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: SURFACES.card, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: 6, borderWidth: 1, borderColor: 'transparent',
  },
  recipeName: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#ccc' },

  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  emptyTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, color: '#fff' },
  emptySub: { fontSize: FontSizes.sm, color: '#666', textAlign: 'center', lineHeight: 20 },
  note: { color: '#555', fontSize: FontSizes.xs, marginTop: 4, marginBottom: Spacing.sm },
  pantryHint: { color: '#555', fontSize: FontSizes.xs, marginBottom: Spacing.sm, lineHeight: 16 },
  sendSummary: { color: ATP_BRAND.amber, fontSize: FontSizes.xs, marginBottom: Spacing.sm, lineHeight: 16 },

  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  listTitle: { fontSize: 11, fontFamily: Fonts.bold, color: '#888', letterSpacing: 2 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#a8e02a', borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  shareText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: '#000' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemName: { fontSize: FontSizes.md, color: '#eee' },
  itemDone: { color: '#555', textDecorationLine: 'line-through' },
  itemFrom: { fontSize: FontSizes.xs, color: '#555', marginTop: 1 },
});
