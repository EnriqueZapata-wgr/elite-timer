/**
 * OLA3 · Pestaña RECETAS de /cocina — fusión de my-recipes y argos-recipes.
 *
 * Conserva el CRUD, las favoritas, "traer de mis registros" (dedupe por
 * nombre en el servicio), el registro con un toque a food_logs vía saveFoodLog
 * y el generador de ARGOS con su personalización avanzada.
 *
 * user_recipes tiene un dueño: esta pestaña. Todo lo que ARGOS genera entra
 * por aquí, y de aquí sale a la lista por sendRecipeToList — nunca en memoria.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, TextInput, Modal, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SwipeToDeleteRow } from '@/src/components/ui/SwipeToDeleteRow';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { saveFoodLog } from '@/src/services/food-log-service';
import {
  saveMealAsRecipe, fetchRecentLogsForRecipe, type RecentLogForRecipe,
} from '@/src/services/recipe-save-service';
import { defaultMealTypeByHour } from '@/src/services/meal-times-core';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { GeneradorArgos } from './GeneradorArgos';

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

interface Props {
  /** Saltar a la pestaña Lista (la dueña de shopping_list_items). */
  onIrALista: () => void;
}

export function RecetasTab({ onIrALista }: Props) {
  const { user } = useAuth();
  // MB-31B3: lima y ámbar iban como TEXTO (ilegibles en claro); en claro caen
  // al teal calibrado / texto según rol. En oscuro nada cambia. Componente
  // compartido → useSurfaceTokens (oscuro fuera de <ThemeReady>).
  const t = useSurfaceTokens();
  const kind = t.kind;
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const ambarTx = kind === 'dark' ? ATP_BRAND.amber : t.tealTexto;
  const azulTx = kind === 'dark' ? '#38bdf8' : t.info;
  const suave = t.texto;
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
  // P2 (MB-28B): traer una comida ya registrada como receta, sin re-teclear.
  const [showFromLogs, setShowFromLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFailed, setLogsFailed] = useState(false);
  const [recentLogs, setRecentLogs] = useState<RecentLogForRecipe[]>([]);
  const [savingLogId, setSavingLogId] = useState<string | null>(null);
  // El generador de ARGOS vive dentro de la pestaña, no en otra ruta.
  const [generando, setGenerando] = useState(false);

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
    if (error) logWarn('[cocina:recetas] load failed:', error.message);
    else setRecipes((data as Recipe[]) ?? []);
    setLoading(false);
  }

  async function registerRecipe(recipe: Recipe) {
    if (!user?.id) return;
    haptic.medium();
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    // Track A (MB-8): guardado unificado + chequeo real de error.
    const result = await saveFoodLog({
      userId: user.id,
      mealTime: now,
      // B7: sin tipo en la receta, el default es por hora.
      mealType: recipe.meal_type || defaultMealTypeByHour(),
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
            logWarn('[cocina:recetas] delete failed:', error?.message ?? 'no rows');
            Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
            return;
          }
          haptic.success();
          loadRecipes();
        },
      },
    ]);
  }

  // P2 (MB-28B): abre el selector de registros recientes.
  async function openFromLogs() {
    if (!user?.id) return;
    haptic.light();
    setShowFromLogs(true);
    setLogsLoading(true);
    const res = await fetchRecentLogsForRecipe(user.id);
    setLogsLoading(false);
    if (!res.ok) { setLogsFailed(true); return; }
    setLogsFailed(false);
    setRecentLogs(res.logs);
  }

  // P2 (MB-28B): un registro → una receta (dedupe por nombre en el servicio).
  async function createFromLog(log: RecentLogForRecipe) {
    if (!user?.id || savingLogId) return;
    haptic.medium();
    setSavingLogId(log.id);
    const res = await saveMealAsRecipe(user.id, {
      name: log.description,
      calories: log.calories,
      proteinG: log.proteinG,
      carbsG: log.carbsG,
      fatG: log.fatG,
      mealType: log.mealType,
      ingredients: log.ingredients,
    });
    setSavingLogId(null);
    if (res.status === 'created') {
      haptic.success();
      setShowFromLogs(false);
      loadRecipes();
      Alert.alert('Receta creada', `"${log.description}" ya está en tus recetas.`);
    } else if (res.status === 'duplicate') {
      Alert.alert('Ya la tienes', `"${res.existingName}" ya está en tus recetas: no se creó un duplicado.`);
    } else {
      Alert.alert('No se pudo crear', 'Revisa tu conexión e intenta de nuevo.');
    }
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
      logWarn('[cocina:recetas] create failed:', error.message);
      Alert.alert('Error', 'No se pudo crear la receta.');
      return;
    }
    haptic.success();
    setShowCreate(false);
    setNewName(''); setNewCalories(''); setNewProtein(''); setNewCarbs(''); setNewFat('');
    loadRecipes();
  }

  if (generando) {
    return (
      <GeneradorArgos
        onRecipeSaved={loadRecipes}
        onClose={() => setGenerando(false)}
      />
    );
  }

  return (
    <View>
      <EliteText variant="caption" style={[s.subtitle, { color: t.textoSecundario }]}>
        Guarda tus comidas frecuentes para registrar con un toque
      </EliteText>

      {/* T5 (#56): filtro Todas | Favoritas + acceso a la lista */}
      <View style={s.filterRow}>
        {([['all', 'Todas'], ['favorites', '❤️ Favoritas']] as const).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => { haptic.light(); setFilter(id); }}
            style={[s.filterPill, { backgroundColor: t.hundido, borderColor: t.borde }, filter === id && s.filterPillOn]}
          >
            <EliteText style={[s.filterText, { color: t.textoSecundario }, filter === id && s.filterTextOn]}>{label}</EliteText>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { haptic.light(); onIrALista(); }} style={s.shoppingBtn}>
          <Ionicons name="basket-outline" size={14} color={acento} />
          <EliteText style={[s.shoppingText, { color: acento }]}>Mi lista</EliteText>
        </Pressable>
      </View>

      {/* Generar con ARGOS — antes una ruta aparte que además armaba listas */}
      <AnimatedPressable
        onPress={() => { haptic.medium(); setGenerando(true); }}
        style={[s.argosBtn, { backgroundColor: t.hundido }]}
      >
        <Ionicons name="sparkles" size={18} color={acento} />
        <View style={{ flex: 1 }}>
          <EliteText style={[s.argosTitle, { color: t.texto }]}>Generar receta con ARGOS</EliteText>
          <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.xs }}>
            Cocina según tu objetivo, tus alergias y tus labs
          </EliteText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.textoSecundario} />
      </AnimatedPressable>

      {recipes.length > 0 && (
        <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: 11, marginBottom: 8 }}>
          Desliza ← o mantén presionado para eliminar
        </EliteText>
      )}

      {/* Lista de recetas (filtrada) */}
      {recipes.filter(r => filter === 'all' || r.is_favorite).map((recipe, idx) => (
        <Animated.View key={recipe.id} entering={FadeInUp.delay(idx * 50).springify()}>
          <SwipeToDeleteRow onConfirmDelete={() => deleteRecipe(recipe)}>
            <AnimatedPressable onPress={() => registerRecipe(recipe)} onLongPress={() => deleteRecipe(recipe)}>
              <View style={[s.recipeCard, { backgroundColor: t.card }]}>
                <View style={s.recipeHeader}>
                  <Ionicons name="bookmark" size={16} color={ATP_BRAND.amber} />
                  <EliteText style={[s.recipeName, { color: t.texto }]} numberOfLines={1}>{recipe.name}</EliteText>
                  {/* T5: corazón de favorito */}
                  <Pressable onPress={() => toggleFavorite(recipe)} hitSlop={10}>
                    <Ionicons
                      name={recipe.is_favorite ? 'heart' : 'heart-outline'}
                      size={20}
                      color={recipe.is_favorite ? '#fb7185' : t.sinDatos}
                    />
                  </Pressable>
                </View>
                <View style={s.macroRow}>
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: suave }]}>{recipe.total_calories}</EliteText>
                    <EliteText style={[s.macroLabel, { color: t.textoSecundario }]}>kcal</EliteText>
                  </View>
                  <View style={[s.macroDivider, { backgroundColor: t.borde }]} />
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: azulTx }]}>{recipe.total_protein}g</EliteText>
                    <EliteText style={[s.macroLabel, { color: t.textoSecundario }]}>prot</EliteText>
                  </View>
                  <View style={[s.macroDivider, { backgroundColor: t.borde }]} />
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: suave }]}>{recipe.total_carbs}g</EliteText>
                    <EliteText style={[s.macroLabel, { color: t.textoSecundario }]}>carbs</EliteText>
                  </View>
                  <View style={[s.macroDivider, { backgroundColor: t.borde }]} />
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: suave }]}>{recipe.total_fat}g</EliteText>
                    <EliteText style={[s.macroLabel, { color: t.textoSecundario }]}>grasa</EliteText>
                  </View>
                </View>
                <View style={[s.useRow, { borderTopColor: t.borde }]}>
                  <Ionicons name="add-circle" size={16} color={acento} />
                  <EliteText style={[s.useText, { color: acento }]}>Toca para registrar hoy</EliteText>
                </View>
              </View>
            </AnimatedPressable>
          </SwipeToDeleteRow>
        </Animated.View>
      ))}

      {/* Estado vacío */}
      {!loading && recipes.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="bookmark-outline" size={48} color={t.bordeMarcado} />
          <EliteText style={[s.emptyTitle, { color: t.texto }]}>Sin recetas guardadas</EliteText>
          <EliteText style={[s.emptySubtitle, { color: t.textoSecundario }]}>
            Trae una comida de tus registros, crea una manual o pídele una a ARGOS
          </EliteText>
        </View>
      )}

      {/* P2 (MB-28B): el camino natural — comes algo dos veces y a la tercera
          lo traes de tus registros, sin volver a teclear. */}
      <AnimatedPressable onPress={openFromLogs} style={[s.createBtn, { borderColor: t.bordeMarcado }]}>
        <Ionicons name="time-outline" size={20} color={ambarTx} />
        <EliteText style={[s.createBtnText, { color: ambarTx }]}>Desde mis registros</EliteText>
      </AnimatedPressable>

      {/* Botón crear */}
      <AnimatedPressable onPress={() => { haptic.light(); setShowCreate(true); }} style={[s.createBtn, { borderColor: t.bordeMarcado }]}>
        <Ionicons name="add-circle-outline" size={20} color={ambarTx} />
        <EliteText style={[s.createBtnText, { color: ambarTx }]}>Crear receta manual</EliteText>
      </AnimatedPressable>

      {/* B-5 (MB-12): las macros de recetas son estimación de IA */}
      <MedicalDisclaimer feature="nutrition" />

      {/* P2 (MB-28B): modal de registros recientes → receta con un toque */}
      <Modal visible={showFromLogs} transparent animationType="slide" onRequestClose={() => setShowFromLogs(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowFromLogs(false)}>
          <Pressable style={[s.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.bordeMarcado, alignSelf: 'center', marginBottom: 20 }} />
            <EliteText style={[s.modalTitle, { color: t.texto }]}>Desde mis registros</EliteText>
            <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.sm, textAlign: 'center', marginBottom: Spacing.md }}>
              Toca una comida registrada y queda como receta, sin volver a capturar.
            </EliteText>

            {logsLoading && (
              <EliteText style={{ color: t.textoSecundario, textAlign: 'center', paddingVertical: Spacing.lg }}>
                Cargando tus registros...
              </EliteText>
            )}
            {/* MB-8 Track B: un fallo de red no es "sin registros". */}
            {!logsLoading && logsFailed && (
              <EliteText style={{ color: t.textoSecundario, textAlign: 'center', paddingVertical: Spacing.lg }}>
                Tus registros no se pudieron leer. Revisa tu conexión y vuelve a intentar.
              </EliteText>
            )}
            {!logsLoading && !logsFailed && recentLogs.length === 0 && (
              <EliteText style={{ color: t.textoSecundario, textAlign: 'center', paddingVertical: Spacing.lg }}>
                Todavía no tienes comidas registradas. Registra una y aparece aquí.
              </EliteText>
            )}

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {recentLogs.map((log) => (
                <AnimatedPressable
                  key={log.id}
                  onPress={() => createFromLog(log)}
                  disabled={!!savingLogId}
                  style={[s.logRow, { backgroundColor: t.flotante }]}
                >
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.logName, { color: t.texto }]} numberOfLines={1}>{log.description}</EliteText>
                    <EliteText variant="caption" style={[s.logMeta, { color: t.textoSecundario }]}>
                      {log.calories != null ? `${log.calories} kcal` : 'sin macros'}
                      {log.ingredients.length > 0 ? ` · ${log.ingredients.length} ingredientes` : ''}
                    </EliteText>
                  </View>
                  {savingLogId === log.id ? (
                    <EliteText variant="caption" style={{ color: t.textoSecundario }}>...</EliteText>
                  ) : (
                    <Ionicons name="add-circle" size={22} color={ATP_BRAND.amber} />
                  )}
                </AnimatedPressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal crear receta */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowCreate(false)}>
          <Pressable style={[s.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.bordeMarcado, alignSelf: 'center', marginBottom: 20 }} />
            <EliteText style={[s.modalTitle, { color: t.texto }]}>Nueva receta</EliteText>

            <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Nombre</EliteText>
            <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newName} onChangeText={setNewName}
              placeholder="Ej: Omelette de 3 huevos con aguacate" placeholderTextColor={t.textoTenue} autoFocus />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Calorías</EliteText>
                <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newCalories} onChangeText={setNewCalories}
                  placeholder="0" placeholderTextColor={t.textoTenue} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Proteína (g)</EliteText>
                <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newProtein} onChangeText={setNewProtein}
                  placeholder="0" placeholderTextColor={t.textoTenue} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Carbs (g)</EliteText>
                <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newCarbs} onChangeText={setNewCarbs}
                  placeholder="0" placeholderTextColor={t.textoTenue} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Grasa (g)</EliteText>
                <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newFat} onChangeText={setNewFat}
                  placeholder="0" placeholderTextColor={t.textoTenue} keyboardType="decimal-pad" />
              </View>
            </View>

            {/* E.1 (MB-8): disabled explícito, no opacidad apilada */}
            <AnimatedPressable onPress={createRecipe} disabled={!newName.trim()}
              style={[s.saveBtn, !newName.trim() && { backgroundColor: t.bordeMarcado }]}>
              <EliteText style={[s.saveBtnText, !newName.trim() && { color: t.textoSecundario }]}>GUARDAR RECETA</EliteText>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  subtitle: { fontSize: FontSizes.sm, marginBottom: Spacing.md },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 17,
    borderWidth: 0.5,
  },
  // Relleno lima con negro encima: correcto en los dos temas (manual 3.6).
  filterPillOn: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  filterText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  filterTextOn: { color: ATP_BRAND.black },
  shoppingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 17,
    borderWidth: 1, borderColor: 'rgba(168,224,42,0.35)',
  },
  shoppingText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  argosBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(168,224,42,0.25)',
  },
  argosTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold },

  recipeCard: {
    borderRadius: Radius.card,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: ATP_BRAND.amber,
  },
  recipeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  recipeName: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, flex: 1 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  macroLabel: { fontSize: 9, marginTop: 1 },
  macroDivider: { width: 1, height: 28 },
  useRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8, borderTopWidth: 0.5 },
  useText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.semiBold },
  emptySubtitle: { fontSize: FontSizes.sm, textAlign: 'center' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, marginTop: Spacing.md,
    borderWidth: 1, borderRadius: Radius.card, borderStyle: 'dashed',
  },
  // Hallazgo MB-31B3: ámbar como TEXTO (ilegible en claro) — color inline.
  createBtnText: { fontFamily: Fonts.semiBold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, textAlign: 'center', marginBottom: Spacing.lg },
  inputLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, marginBottom: 4 },
  input: {
    borderRadius: Radius.sm,
    fontFamily: Fonts.regular, fontSize: FontSizes.md, padding: Spacing.md,
  },
  saveBtn: {
    backgroundColor: ATP_BRAND.amber, borderRadius: Radius.card, paddingVertical: Spacing.md,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  saveBtnText: { color: ATP_BRAND.black, fontFamily: Fonts.bold, fontSize: FontSizes.lg },

  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: 6,
  },
  logName: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  logMeta: { fontSize: FontSizes.xs, marginTop: 2 },
});
