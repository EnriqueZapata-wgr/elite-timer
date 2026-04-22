/**
 * Mis Recetas — Guardar y reusar comidas personalizadas sin re-estimar.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, TextInput, Modal, Pressable, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, SURFACES } from '@/src/constants/brand';

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
}

export default function MyRecipesScreen() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
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
    const { data } = await supabase
      .from('user_recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRecipes((data as Recipe[]) ?? []);
    setLoading(false);
  }

  async function useRecipe(recipe: Recipe) {
    if (!user?.id) return;
    haptic.medium();
    const today = getLocalToday();
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    try {
      await supabase.from('food_logs').insert({
        user_id: user.id,
        date: today,
        meal_time: now,
        meal_type: recipe.meal_type || 'snack_am',
        description: recipe.name,
        calories: recipe.total_calories,
        protein_g: recipe.total_protein,
        carbs_g: recipe.total_carbs,
        fat_g: recipe.total_fat,
        notes: JSON.stringify({ source: 'recipe', recipe_id: recipe.id }),
      });
      DeviceEventEmitter.emit('day_changed');
      haptic.success();
      Alert.alert('Registrado', `"${recipe.name}" agregado a tu registro de hoy.`);
    } catch {
      Alert.alert('Error', 'No se pudo registrar la receta.');
    }
  }

  async function deleteRecipe(recipe: Recipe) {
    haptic.heavy();
    Alert.alert('Eliminar receta', `¿Eliminar "${recipe.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('user_recipes').delete().eq('id', recipe.id);
          haptic.success();
          loadRecipes();
        },
      },
    ]);
  }

  async function createRecipe() {
    if (!user?.id || !newName.trim()) return;
    haptic.medium();
    try {
      await supabase.from('user_recipes').insert({
        user_id: user.id,
        name: newName.trim(),
        total_calories: parseInt(newCalories) || 0,
        total_protein: parseFloat(newProtein) || 0,
        total_carbs: parseFloat(newCarbs) || 0,
        total_fat: parseFloat(newFat) || 0,
      });
      haptic.success();
      setShowCreate(false);
      setNewName(''); setNewCalories(''); setNewProtein(''); setNewCarbs(''); setNewFat('');
      loadRecipes();
    } catch {
      Alert.alert('Error', 'No se pudo crear la receta.');
    }
  }

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Mis Recetas" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <EliteText variant="caption" style={s.subtitle}>
          Guarda tus comidas frecuentes para registrar con un toque
        </EliteText>

        {/* Lista de recetas */}
        {recipes.map((recipe, idx) => (
          <Animated.View key={recipe.id} entering={FadeInUp.delay(idx * 50).springify()}>
            <AnimatedPressable onPress={() => useRecipe(recipe)} onLongPress={() => deleteRecipe(recipe)}>
              <View style={s.recipeCard}>
                <View style={s.recipeHeader}>
                  <Ionicons name="bookmark" size={16} color="#fbbf24" />
                  <EliteText style={s.recipeName} numberOfLines={1}>{recipe.name}</EliteText>
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
          <EliteText variant="caption" style={{ color: '#333', fontSize: 9, textAlign: 'center', marginTop: 4 }}>
            Mantén presionado para eliminar
          </EliteText>
        )}

        {/* Botón crear */}
        <AnimatedPressable onPress={() => { haptic.light(); setShowCreate(true); }} style={s.createBtn}>
          <Ionicons name="add-circle-outline" size={20} color="#fbbf24" />
          <EliteText style={s.createBtnText}>Crear receta manual</EliteText>
        </AnimatedPressable>

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
              placeholder="Ej: Bullet Proof Coffee" placeholderTextColor="#555" autoFocus />

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

            <AnimatedPressable onPress={createRecipe} disabled={!newName.trim()}
              style={[s.saveBtn, !newName.trim() && { opacity: 0.4 }]}>
              <EliteText style={s.saveBtnText}>GUARDAR RECETA</EliteText>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg },

  recipeCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: '#fbbf24',
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
  createBtnText: { color: '#fbbf24', fontFamily: Fonts.semiBold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: '#fff', textAlign: 'center', marginBottom: Spacing.lg },
  inputLabel: { color: '#888', fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, marginBottom: 4 },
  input: {
    backgroundColor: '#1a1a1a', borderRadius: Radius.sm, color: '#fff',
    fontFamily: Fonts.regular, fontSize: FontSizes.md, padding: Spacing.md,
  },
  saveBtn: {
    backgroundColor: '#fbbf24', borderRadius: Radius.card, paddingVertical: Spacing.md,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  saveBtnText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.lg },
});
