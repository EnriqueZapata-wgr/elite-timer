/**
 * OLA3 · Generar receta con ARGOS — el cuerpo útil de argos-recipes.
 *
 * Conserva los tipos de comida, los objetivos de COMIDA (no de macro), el
 * toggle de personalización avanzada (#96: labs + alergias + objetivo +
 * ciclo), el manejo honesto del rate limit y el guardado a user_recipes con
 * ingredientes.
 *
 * Lo que MURIÓ aquí: generateShoppingList. Era un segundo productor de listas
 * que vivía en memoria y se evaporaba al compartir, en paralelo a la tabla
 * shopping_list_items. Hoy el camino es uno solo:
 *   ARGOS genera receta → user_recipes → sendRecipeToList → la lista.
 */
import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { generateRecipe, type GeneratedRecipe } from '@/src/services/argos-service';
import { buildRecipeAdvancedContext } from '@/src/services/recipe-context-service';
import { sendRecipeToList } from '@/src/services/shopping-list-service';
import { EliteToggle } from '@/components/elite-toggle';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

const MEAL_TYPES = [
  { id: 'desayuno', label: 'Desayuno', icon: 'sunny-outline' as const, color: '#fbbf24' },
  { id: 'comida', label: 'Comida', icon: 'restaurant-outline' as const, color: '#38bdf8' },
  { id: 'cena', label: 'Cena', icon: 'moon-outline' as const, color: '#c084fc' },
  { id: 'snack', label: 'Snack', icon: 'cafe-outline' as const, color: '#a8e02a' },
];

// E-6 (MB-12): objetivos de COMIDA, no de macro — ATP es comida limpia y
// flexibilidad metabólica; el macro es consecuencia, no objetivo.
const GOALS = [
  { id: 'comida real y sin procesar', label: 'Comida real' },
  { id: 'densa en nutrientes', label: 'Densa en nutrientes' },
  { id: 'anti-inflamatoria', label: 'Anti-inflamatoria' },
  { id: 'saciante y ligera para la noche', label: 'Ligera y saciante' },
  { id: 'rápida', label: 'Rápida (<15 min)' },
  { id: 'económica', label: 'Económica' },
];

interface Props {
  /** Se guardó una receta nueva → la pestaña de recetas se recarga. */
  onRecipeSaved: () => void;
  /** Volver al listado de recetas. */
  onClose: () => void;
}

export function GeneradorArgos({ onRecipeSaved, onClose }: Props) {
  // MB-31B3: reglas del manual en claro (lima/ámbar no son texto). Componente
  // compartido → useSurfaceTokens (oscuro fuera de <ThemeReady>).
  const t = useSurfaceTokens();
  const kind = t.kind;
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const ambarTx = kind === 'dark' ? '#fbbf24' : t.texto;
  const suave = kind === 'dark' ? t.texto : t.texto;

  const [mode, setMode] = useState<'menu' | 'generating' | 'recipe'>('menu');
  const [selectedMeal, setSelectedMeal] = useState('');
  // E-6 (MB-12): sin macro preseleccionado — arranca en comida real.
  const [selectedGoal, setSelectedGoal] = useState('comida real y sin procesar');
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeSaved, setRecipeSaved] = useState(false);
  const [sendingToList, setSendingToList] = useState(false);
  const [listSummary, setListSummary] = useState<string | null>(null);
  // #96: cross-módulo (labs + preferencias + objetivo + ciclo) — opt-in
  const [advancedMode, setAdvancedMode] = useState(false);

  async function handleGenerateRecipe() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setMode('generating');
    try {
      // #96: si el toggle está ON, junta contexto real del usuario.
      // Best-effort: si falla, la receta se genera con el flujo normal.
      let advancedContext: string | null = null;
      if (advancedMode) {
        advancedContext = await buildRecipeAdvancedContext(user.id).catch(() => null);
      }
      const result = await generateRecipe(user.id, {
        type: selectedMeal,
        goal: selectedGoal,
        advancedContext,
      });
      if (result) {
        setRecipe(result);
        setRecipeSaved(false);
        setListSummary(null);
        setMode('recipe');
      } else {
        Alert.alert('Error', 'No se pudo generar la receta.');
        setMode('menu');
      }
    } catch {
      // PREMIUM (16-ago-2026): aquí se separaba el límite diario del plan ("no
      // es tu conexión, es tu cuota") del fallo de red. Sin cuota, lo único que
      // queda es el fallo de red.
      Alert.alert('Error', 'Problema de conexión.');
      setMode('menu');
    }
  }

  // E-7 (MB-12): escribe la receta generada a user_recipes — mismo esquema que
  // el alta manual, más los ingredientes (la lista los lee de ahí).
  async function handleSaveRecipe() {
    if (!recipe || savingRecipe || recipeSaved) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    haptic.medium();
    setSavingRecipe(true);
    const { error } = await supabase.from('user_recipes').insert({
      user_id: user.id,
      name: recipe.name,
      total_calories: Math.round(recipe.calories) || 0,
      total_protein: recipe.protein_g || 0,
      total_carbs: recipe.carbs_g || 0,
      total_fat: recipe.fat_g || 0,
      ingredients: recipe.ingredients ?? [],
    });
    setSavingRecipe(false);
    if (error) {
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.');
      return;
    }
    haptic.success();
    setRecipeSaved(true);
    onRecipeSaved();
  }

  /** La única puerta receta→lista: shopping-list-service, bulk idempotente. */
  async function handleSendToList() {
    if (!recipe || sendingToList) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    haptic.medium();
    setSendingToList(true);
    const res = await sendRecipeToList(user.id, { name: recipe.name, ingredients: recipe.ingredients });
    setSendingToList(false);
    if (!res.ok) {
      Alert.alert('No se pudo mandar', 'Revisa tu conexión e intenta de nuevo.');
      return;
    }
    haptic.success();
    const parts: string[] = [];
    if (res.added > 0) parts.push(`${res.added} a tu lista`);
    if (res.merged > 0) parts.push(`${res.merged} ya estaba${res.merged > 1 ? 'n' : ''}`);
    if (res.inPantry.length > 0) parts.push(`en tu despensa: ${res.inPantry.join(', ')}`);
    setListSummary(parts.length > 0 ? parts.join(' · ') : 'sin ingredientes nuevos');
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Pressable onPress={() => (mode === 'menu' ? onClose() : setMode('menu'))} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={t.texto} />
        </Pressable>
        <View>
          <Text style={{ color: acento, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ARGOS</Text>
          <Text style={{ color: t.texto, fontSize: 18, fontWeight: '800' }}>Generar receta</Text>
        </View>
      </View>

      {/* Menu */}
      {mode === 'menu' && (
        <View>
          <Text style={{ color: t.textoSecundario, fontSize: 12, marginBottom: 8 }}>Tipo de comida</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {MEAL_TYPES.map(m => (
              <Pressable key={m.id} onPress={() => { setSelectedMeal(m.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <View style={{
                  alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
                  backgroundColor: selectedMeal === m.id ? `${m.color}20` : t.hundido,
                  borderWidth: 1.5,
                  borderColor: selectedMeal === m.id ? m.color : t.borde,
                }}>
                  <Ionicons name={m.icon} size={20} color={selectedMeal === m.id ? m.color : t.textoSecundario} />
                  <Text style={{ color: selectedMeal === m.id ? t.texto : t.textoSecundario, fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                    {m.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: t.textoSecundario, fontSize: 12, marginBottom: 8 }}>Objetivo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {GOALS.map(g => (
              <Pressable key={g.id} onPress={() => { setSelectedGoal(g.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <View style={{
                  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                  backgroundColor: selectedGoal === g.id ? 'rgba(168,224,42,0.15)' : t.hundido,
                  borderWidth: 1.5,
                  borderColor: selectedGoal === g.id ? ATP_BRAND.lime : t.borde,
                }}>
                  <Text style={{ color: selectedGoal === g.id ? acento : t.textoSecundario, fontSize: 12, fontWeight: '600' }}>
                    {g.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* #96: cross-módulo — labs + preferencias + objetivo + ciclo en el prompt */}
          <View style={{ marginBottom: 16 }}>
            <EliteToggle
              label="Personalización avanzada"
              description="ARGOS cruza tus labs, alergias, objetivo y ciclo. Tarda un poco más."
              value={advancedMode}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAdvancedMode(v); }}
            />
          </View>

          <Pressable onPress={handleGenerateRecipe} disabled={!selectedMeal} style={{
            backgroundColor: selectedMeal ? ATP_BRAND.lime : t.bordeMarcado, borderRadius: 16, padding: 16, alignItems: 'center',
            flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}>
            <Ionicons name="sparkles" size={20} color={selectedMeal ? ATP_BRAND.black : t.textoSecundario} />
            <Text style={{ color: selectedMeal ? ATP_BRAND.black : t.textoSecundario, fontSize: 16, fontWeight: '800' }}>
              {advancedMode ? 'GENERAR RECETA · AVANZADA' : 'GENERAR RECETA'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Generating */}
      {mode === 'generating' && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color={kind === 'dark' ? ATP_BRAND.lime : t.tealTexto} />
          <Text style={{ color: acento, fontSize: 16, fontWeight: '700', marginTop: 20 }}>ARGOS cocina ideas...</Text>
        </View>
      )}

      {/* Recipe result */}
      {mode === 'recipe' && recipe && (
        <View>
          <View style={{
            backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: 16, padding: 20, marginBottom: 16,
            borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
          }}>
            <Text style={{ color: acento, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
              RECETA ARGOS
            </Text>
            <Text style={{ color: t.texto, fontSize: 22, fontWeight: '800' }}>{recipe.name}</Text>
            <Text style={{ color: t.textoSecundario, fontSize: 13, marginTop: 4 }}>{recipe.description}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
              <Text style={{ color: acento, fontSize: 12 }}>{recipe.calories} kcal</Text>
              <Text style={{ color: kind === 'dark' ? '#60a5fa' : t.info, fontSize: 12 }}>P{recipe.protein_g}g</Text>
              <Text style={{ color: ambarTx, fontSize: 12 }}>C{recipe.carbs_g}g</Text>
              <Text style={{ color: kind === 'dark' ? '#fb923c' : t.texto, fontSize: 12 }}>G{recipe.fat_g}g</Text>
              <Text style={{ color: t.textoSecundario, fontSize: 12 }}>{recipe.prepMinutes + recipe.cookMinutes} min</Text>
            </View>
          </View>

          <Text style={{ color: ambarTx, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
            INGREDIENTES
          </Text>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, paddingLeft: 8 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#fbbf24', marginTop: 7 }} />
              <Text style={{ color: suave, fontSize: 14 }}>
                <Text style={{ color: t.texto, fontWeight: '600' }}>{ing.quantity}</Text> {ing.name}
                {ing.notes ? <Text style={{ color: t.textoSecundario }}> ({ing.notes})</Text> : null}
              </Text>
            </View>
          ))}

          <Text style={{ color: acento, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 20, marginBottom: 10 }}>
            PREPARACIÓN
          </Text>
          {recipe.steps.map((st, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 10, paddingLeft: 4 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: 'rgba(168,224,42,0.1)', justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: acento, fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={{ color: suave, fontSize: 14, lineHeight: 21, flex: 1 }}>{st}</Text>
            </View>
          ))}

          {recipe.tips && (
            <View style={{ backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 12, padding: 14, marginTop: 16 }}>
              <Text style={{ color: ambarTx, fontSize: 12, fontWeight: '600' }}>{recipe.tips}</Text>
            </View>
          )}

          <Pressable onPress={handleSaveRecipe} disabled={savingRecipe} style={{
            backgroundColor: 'rgba(168,224,42,0.12)', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 20,
            borderWidth: 1, borderColor: 'rgba(168,224,42,0.3)', opacity: savingRecipe ? 0.6 : 1,
          }}>
            <Text style={{ color: acento, fontSize: 14, fontWeight: '700' }}>
              {savingRecipe ? 'Guardando…' : recipeSaved ? 'Guardada en Mis recetas ✓' : 'Guardar en Mis recetas'}
            </Text>
          </Pressable>

          {/* La lista deja de armarse en memoria: los ingredientes van a
              shopping_list_items por la puerta única, sin duplicar. */}
          <Pressable onPress={handleSendToList} disabled={sendingToList} style={{
            backgroundColor: t.hundido, borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 10,
            borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}>
            <Ionicons name="basket-outline" size={18} color={kind === 'dark' ? '#38bdf8' : t.info} />
            <Text style={{ color: kind === 'dark' ? '#38bdf8' : t.info, fontSize: 14, fontWeight: '700' }}>
              {sendingToList ? 'Mandando…' : 'Mandar ingredientes a mi lista'}
            </Text>
          </Pressable>
          {listSummary && (
            <Text style={{ color: ambarTx, fontSize: 12, marginTop: 8, textAlign: 'center' }}>{listSummary}</Text>
          )}

          <Pressable onPress={handleGenerateRecipe} style={{
            backgroundColor: t.hundido, borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 10,
            borderWidth: 1, borderColor: t.borde,
          }}>
            <Text style={{ color: t.textoSecundario, fontSize: 14, fontWeight: '600' }}>Generar otra receta</Text>
          </Pressable>
        </View>
      )}

      {/* B-5 (MB-12): las recetas y sus macros son estimación de IA */}
      <MedicalDisclaimer feature="nutrition" />
    </View>
  );
}
