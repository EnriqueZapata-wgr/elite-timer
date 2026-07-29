/**
 * Mis Recetas — Guardar y reusar comidas personalizadas sin re-estimar.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, TextInput, Modal, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SwipeToDeleteRow } from '@/src/components/ui/SwipeToDeleteRow';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { saveFoodLog } from '@/src/services/food-log-service';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, SURFACES, ATP_BRAND } from '@/src/constants/brand';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';

interface Recipe {
  id: string;
  name: string;
  ingredients: any[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meal_type: string | null;
  created_at: string;
  /** T5 (#56): favoritos (migración 168). */
  is_favorite: boolean;
}

export default function MyRecipesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  // T5 (#56): filtro de favoritas
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');

  useFocusEffect(useCallback(() => {
    loadRecipes();
  }, [user?.id]));

  async function loadRecipes() {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    // MB-8 Track B (G4): un 400 no es "sin recetas".
    if (error) logWarn('[my-recipes] load failed:', error.message);
    else setRecipes((data as Recipe[]) ?? []);
    setLoading(false);
  }

  async function registerRecipe(recipe: Recipe) {
    if (!user?.id) return;
    haptic.medium();
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    // Track A (MB-8): guardado unificado + chequeo real de error (antes el
    // try/catch no atrapaba 4xx y mostraba "Registrado" en falso — G3).
    const result = await saveFoodLog({
      userId: user.id,
      mealTime: now,
      mealType: recipe.meal_type || 'snack_am',
      description: recipe.name,
      source: 'recipe',
      calories: recipe.total_calories,
      proteinG: recipe.total_protein,
      carbsG: recipe.total_carbs,
      fatG: recipe.total_fat,
      extras: { recipe_id: recipe.id },
    });
    if (!result.ok) {
      Alert.alert('Error', 'No se pudo registrar la receta.');
      return;
    }
    haptic.success();
    Alert.alert('Registrado', `"${recipe.name}" agregado a tu registro de hoy.`);
  }

  // T5 (#56): toggle favorito (optimista)
  async function toggleFavorite(recipe: Recipe) {
    haptic.light();
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorite: !r.is_favorite } : r));
    const { error } = await supabase
      .from('user_recipes')
      .update({ is_favorite: !recipe.is_favorite })
      .eq('id', recipe.id);
    if (error) loadRecipes(); // revertir al estado real
  }

  async function deleteRecipe(recipe: Recipe) {
    haptic.heavy();
    Alert.alert('Eliminar receta', `¿Eliminar "${recipe.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          // MB-8 Track B (G4): borrado verificado.
          const { data, error } = await supabase.from('user_recipes').delete().eq('id', recipe.id).select('id');
          if (error || !data?.length) {
            logWarn('[my-recipes] delete failed:', error?.message ?? 'no rows');
            Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
            return;
          }
          haptic.success();
          loadRecipes();
        },
      },
    ]);
  }

  async function createRecipe() {
    if (!user?.id || !newName.trim()) return;
    haptic.medium();
    // MB-8 Track B (G4): el try/catch no atrapa 4xx — se chequea {error}.
    const { error } = await supabase.from('user_recipes').insert({
      user_id: user.id,
      name: newName.trim(),
      total_calories: parseInt(newCalories) || 0,
      total_protein: parseFloat(newProtein) || 0,
      total_carbs: parseFloat(newCarbs) || 0,
      total_fat: parseFloat(newFat) || 0,
    });
    if (error) {
      logWarn('[my-recipes] create failed:', error.message);
      Alert.alert('Error', 'No se pudo crear la receta.');
      return;
    }
    haptic.success();
    setShowCreate(false);
    setNewName(''); setNewCalories(''); setNewProtein(''); setNewCarbs(''); setNewFat('');
    loadRecipes();
  }

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Mis Recetas" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <EliteText variant="caption" style={s.subtitle}>
          Guarda tus comidas frecuentes para registrar con un toque
        </EliteText>

        {/* T5 (#56): filtro Todas | Favoritas + acceso a lista de compra */}
        <View style={s.filterRow}>
          {([['all', 'Todas'], ['favorites', '❤️ Favoritas']] as const).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => { haptic.light(); setFilter(id); }}
              style={[s.filterPill, filter === id && s.filterPillOn]}
            >
              <EliteText style={[s.filterText, filter === id && s.filterTextOn]}>{label}</EliteText>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => { haptic.light(); router.push('/lista-compra'); }}
            style={s.shoppingBtn}
          >
            <Ionicons name="cart-outline" size={14} color="#a8e02a" />
            <EliteText style={s.shoppingText}>Lista de compra</EliteText>
          </Pressable>
        </View>

        {recipes.length > 0 && (
          <EliteText variant="caption" style={{ color: '#666', fontSize: 11, marginBottom: 8 }}>
            Desliza ← o mantén presionado para eliminar
          </EliteText>
        )}

        {/* Lista de recetas (filtrada) */}
        {recipes.filter(r => filter === 'all' || r.is_favorite).map((recipe, idx) => (
          <Animated.View key={recipe.id} entering={FadeInUp.delay(idx * 50).springify()}>
            <SwipeToDeleteRow onConfirmDelete={() => deleteRecipe(recipe)}>
            <AnimatedPressable onPress={() => registerRecipe(recipe)} onLongPress={() => deleteRecipe(recipe)}>
              <View style={s.recipeCard}>
                <View style={s.recipeHeader}>
                  <Ionicons name="bookmark" size={16} color={ATP_BRAND.amber} />
                  <EliteText style={s.recipeName} numberOfLines={1}>{recipe.name}</EliteText>
                  {/* T5: corazón de favorito */}
                  <Pressable onPress={() => toggleFavorite(recipe)} hitSlop={10}>
                    <Ionicons
                      name={recipe.is_favorite ? 'heart' : 'heart-outline'}
                      size={20}
                      color={recipe.is_favorite ? '#fb7185' : '#444'}
                    />
                  </Pressable>
                </View>
                <View style={s.macroRow}>
                  <View style={s.macroItem}>
                    <EliteText style={s.macroValue}>{recipe.total_calories}</EliteText>
                    <EliteText style={s.macroLabel}>kcal</EliteText>
                  </View>
                  <View style={s.macroDivider} />
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: '#38bdf8' }]}>{recipe.total_protein}g</EliteText>
                    <EliteText style={s.macroLabel}>prot</EliteText>
                  </View>
                  <View style={s.macroDivider} />
                  <View style={s.macroItem}>
                    <EliteText style={s.macroValue}>{recipe.total_carbs}g</EliteText>
                    <EliteText style={s.macroLabel}>carbs</EliteText>
                  </View>
                  <View style={s.macroDivider} />
                  <View style={s.macroItem}>
                    <EliteText style={s.macroValue}>{recipe.total_fat}g</EliteText>
                    <EliteText style={s.macroLabel}>grasa</EliteText>
                  </View>
                </View>
                <View style={s.useRow}>
                  <Ionicons name="add-circle" size={16} color="#a8e02a" />
                  <EliteText style={s.useText}>Toca para registrar hoy</EliteText>
                </View>
              </View>
            </AnimatedPressable>
            </SwipeToDeleteRow>
          </Animated.View>
        ))}

        {/* Estado vacío */}
        {!loading && recipes.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color="#333" />
            <EliteText style={s.emptyTitle}>Sin recetas guardadas</EliteText>
            <EliteText style={s.emptySubtitle}>
              Crea recetas manuales o guarda comidas estimadas por ARGOS
            </EliteText>
          </View>
        )}

        {/* Hint */}
        {recipes.length > 0 && (
          <EliteText variant="caption" style={{ color: '#444', fontSize: 9, textAlign: 'center', marginTop: 4 }}>
            Desliza ← (o mantén presionado) para eliminar
          </EliteText>
        )}

        {/* Botón crear */}
        <AnimatedPressable onPress={() => { haptic.light(); setShowCreate(true); }} style={s.createBtn}>
          <Ionicons name="add-circle-outline" size={20} color={ATP_BRAND.amber} />
          <EliteText style={s.createBtnText}>Crear receta manual</EliteText>
        </AnimatedPressable>

        {/* B-5 (MB-12): las macros de recetas son estimación de IA */}
        <MedicalDisclaimer feature="nutrition" />
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Modal crear receta */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowCreate(false)}>
          <Pressable style={s.modalContent} onPress={() => {}}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20 }} />
            <EliteText style={s.modalTitle}>Nueva receta</EliteText>

            <EliteText variant="caption" style={s.inputLabel}>Nombre</EliteText>
            <TextInput style={s.input} value={newName} onChangeText={setNewName}
              placeholder="Ej: Omelette de 3 huevos con aguacate" placeholderTextColor="#555" autoFocus />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={s.inputLabel}>Calorías</EliteText>
                <TextInput style={s.input} value={newCalories} onChangeText={setNewCalories}
                  placeholder="0" placeholderTextColor="#555" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={s.inputLabel}>Proteína (g)</EliteText>
                <TextInput style={s.input} value={newProtein} onChangeText={setNewProtein}
                  placeholder="0" placeholderTextColor="#555" keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={s.inputLabel}>Carbs (g)</EliteText>
                <TextInput style={s.input} value={newCarbs} onChangeText={setNewCarbs}
                  placeholder="0" placeholderTextColor="#555" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={s.inputLabel}>Grasa (g)</EliteText>
                <TextInput style={s.input} value={newFat} onChangeText={setNewFat}
                  placeholder="0" placeholderTextColor="#555" keyboardType="decimal-pad" />
              </View>
            </View>

            {/* E.1 (MB-8): disabled explícito, no opacidad apilada */}
            <AnimatedPressable onPress={createRecipe} disabled={!newName.trim()}
              style={[s.saveBtn, !newName.trim() && { backgroundColor: SURFACES.cardLight }]}>
              <EliteText style={[s.saveBtnText, !newName.trim() && { color: TEXT_COLORS.muted }]}>GUARDAR RECETA</EliteText>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.md },

  // T5: filtros + lista de compra
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 17,
    backgroundColor: '#0a0a0a', borderWidth: 0.5, borderColor: '#1a1a1a',
  },
  filterPillOn: { backgroundColor: '#a8e02a', borderColor: '#a8e02a' },
  filterText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: '#666' },
  filterTextOn: { color: '#000' },
  shoppingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 17,
    borderWidth: 1, borderColor: 'rgba(168,224,42,0.35)',
  },
  shoppingText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: '#a8e02a' },

  recipeCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: ATP_BRAND.amber,
  },
  recipeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  recipeName: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: '#fff', flex: 1 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#ccc' },
  macroLabel: { fontSize: 9, color: '#666', marginTop: 1 },
  macroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },
  useRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  useText: { fontSize: FontSizes.xs, color: '#a8e02a', fontFamily: Fonts.semiBold },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, color: '#fff' },
  emptySubtitle: { fontSize: FontSizes.sm, color: '#666', textAlign: 'center' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, marginTop: Spacing.md,
    borderWidth: 1, borderColor: '#333', borderRadius: Radius.card, borderStyle: 'dashed',
  },
  createBtnText: { color: ATP_BRAND.amber, fontFamily: Fonts.semiBold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: '#fff', textAlign: 'center', marginBottom: Spacing.lg },
  inputLabel: { color: '#888', fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, marginBottom: 4 },
  input: {
    backgroundColor: '#1a1a1a', borderRadius: Radius.sm, color: '#fff',
    fontFamily: Fonts.regular, fontSize: FontSizes.md, padding: Spacing.md,
  },
  saveBtn: {
    backgroundColor: ATP_BRAND.amber, borderRadius: Radius.card, paddingVertical: Spacing.md,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  saveBtnText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.lg },
});
