/**
 * Lista de compra — desde mis recetas (#56 parcial, Sprint NUTRICIÓN T5).
 *
 * Selecciona recetas de la semana → agrega ingredientes (determinístico,
 * shopping-list-core) → lista con checkboxes + compartir. Sin IA, sin
 * persistencia (v1 pre-beta); la lista IA semanal sigue en argos-recipes.
 */
import { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Share, Pressable } from 'react-native';
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
import {
  aggregateIngredients,
  shoppingListToText,
  type AggregatedItem,
} from '@/src/services/shopping-list-core';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS } from '@/src/constants/brand';

interface RecipeRow {
  id: string;
  name: string;
  ingredients: unknown;
  is_favorite: boolean;
}

export default function ListaCompraScreen() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase.from('user_recipes')
      .select('id, name, ingredients, is_favorite')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecipes((data as RecipeRow[]) ?? []));
  }, [user?.id]));

  const items: AggregatedItem[] = useMemo(() => {
    const chosen = recipes.filter((r) => selected.has(r.id));
    return aggregateIngredients(chosen);
  }, [recipes, selected]);

  function toggleRecipe(id: string) {
    haptic.light();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setChecked(new Set()); // la lista cambió — reinicia checks
  }

  function toggleItem(name: string) {
    haptic.light();
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  async function shareList() {
    haptic.medium();
    try { await Share.share({ message: shoppingListToText(items) }); } catch { /* cancelado */ }
  }

  const withIngredients = recipes.filter((r) => Array.isArray(r.ingredients) && (r.ingredients as unknown[]).length > 0);
  const withoutIngredients = recipes.length - withIngredients.length;

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Lista de compra" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <EliteText variant="caption" style={s.subtitle}>
          Elige las recetas de tu semana — agregamos los ingredientes por ti
        </EliteText>

        {/* Selección de recetas */}
        {withIngredients.map((r, idx) => {
          const on = selected.has(r.id);
          return (
            <Animated.View key={r.id} entering={FadeInUp.delay(idx * 40).springify()}>
              <AnimatedPressable onPress={() => toggleRecipe(r.id)} style={[s.recipeRow, on && s.recipeRowOn]}>
                <Ionicons
                  name={on ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={on ? '#a8e02a' : '#444'}
                />
                <EliteText style={[s.recipeName, on && { color: '#fff' }]} numberOfLines={1}>
                  {r.name}
                </EliteText>
                {r.is_favorite && <Ionicons name="heart" size={14} color="#fb7185" />}
              </AnimatedPressable>
            </Animated.View>
          );
        })}

        {withIngredients.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="cart-outline" size={48} color="#333" />
            <EliteText style={s.emptyTitle}>Sin recetas con ingredientes</EliteText>
            <EliteText style={s.emptySub}>
              Guarda recetas de ARGOS (traen ingredientes) o genera tu lista IA semanal desde Recetas ARGOS.
            </EliteText>
          </View>
        )}

        {withoutIngredients > 0 && withIngredients.length > 0 && (
          <EliteText variant="caption" style={s.note}>
            {withoutIngredients} receta{withoutIngredients > 1 ? 's' : ''} manual{withoutIngredients > 1 ? 'es' : ''} sin ingredientes no aparece{withoutIngredients > 1 ? 'n' : ''} aquí.
          </EliteText>
        )}

        {/* Lista agregada */}
        {items.length > 0 && (
          <>
            <View style={s.listHeader}>
              <EliteText style={s.listTitle}>TU LISTA ({items.length})</EliteText>
              <Pressable onPress={shareList} hitSlop={10} style={s.shareBtn}>
                <Ionicons name="share-outline" size={16} color="#000" />
                <EliteText style={s.shareText}>Compartir</EliteText>
              </Pressable>
            </View>
            {items.map((item) => {
              const done = checked.has(item.name);
              return (
                <Pressable key={item.name} onPress={() => toggleItem(item.name)} style={s.itemRow}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={done ? '#a8e02a' : '#444'}
                  />
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.itemName, done && s.itemDone]}>
                      {item.name}{item.detail ? ` — ${item.detail}` : ''}
                    </EliteText>
                    <EliteText style={s.itemFrom} numberOfLines={1}>
                      {item.fromRecipes.join(' · ')}
                    </EliteText>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg },

  recipeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: SURFACES.card, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: 6, borderWidth: 1, borderColor: 'transparent',
  },
  recipeRowOn: { borderColor: 'rgba(168,224,42,0.35)' },
  recipeName: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#ccc' },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  emptyTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, color: '#fff' },
  emptySub: { fontSize: FontSizes.sm, color: '#666', textAlign: 'center', lineHeight: 20 },
  note: { color: '#555', fontSize: FontSizes.xs, marginTop: 4, marginBottom: Spacing.sm },

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
