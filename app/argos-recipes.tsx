import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Share,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';
import {
  generateRecipe, generateShoppingList,
  type GeneratedRecipe, type ShoppingList,
} from '../src/services/argos-service';

const MEAL_TYPES = [
  { id: 'desayuno', label: 'Desayuno', icon: 'sunny-outline' as const, color: '#fbbf24' },
  { id: 'comida', label: 'Comida', icon: 'restaurant-outline' as const, color: '#38bdf8' },
  { id: 'cena', label: 'Cena', icon: 'moon-outline' as const, color: '#c084fc' },
  { id: 'snack', label: 'Snack', icon: 'cafe-outline' as const, color: '#a8e02a' },
];

const GOALS = [
  { id: 'alta proteína', label: 'Alta proteína' },
  { id: 'bajo carb', label: 'Bajo en carbohidratos' },
  { id: 'cetogénica', label: 'Cetogénica' },
  { id: 'anti-inflamatoria', label: 'Anti-inflamatoria' },
  { id: 'rápida', label: 'Rápida (<15 min)' },
  { id: 'económica', label: 'Económica' },
];

export default function ArgosRecipesScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'menu' | 'generating' | 'recipe' | 'shoppingResult'>('menu');
  const [selectedMeal, setSelectedMeal] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('alta proteína');
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);

  async function handleGenerateRecipe() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setMode('generating');
    try {
      const result = await generateRecipe(user.id, {
        type: selectedMeal,
        goal: selectedGoal,
      });
      if (result) {
        setRecipe(result);
        setMode('recipe');
      } else {
        Alert.alert('Error', 'No se pudo generar la receta.');
        setMode('menu');
      }
    } catch (_) {
      Alert.alert('Error', 'Problema de conexión.');
      setMode('menu');
    }
  }

  async function handleShoppingList() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setMode('generating');
    try {
      const result = await generateShoppingList(user.id, 7);
      if (result) {
        setShoppingList(result);
        setMode('shoppingResult');
      } else {
        Alert.alert('Error', 'No se pudo generar la lista.');
        setMode('menu');
      }
    } catch (_) {
      Alert.alert('Error', 'Problema de conexión.');
      setMode('menu');
    }
  }

  async function shareShoppingList() {
    if (!shoppingList) return;
    const text = shoppingList.sections.map(s =>
      `${s.name}\n${s.items.map(i => `  - ${i.name} — ${i.quantity}`).join('\n')}`
    ).join('\n\n');
    await Share.share({ message: `Lista de super ATP (7 días)\n\n${text}\n\nGenerada por ARGOS` });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => mode === 'menu' ? router.back() : setMode('menu')} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View>
            <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ARGOS</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Nutrición inteligente</Text>
          </View>
        </View>
      </View>

      {/* Menu */}
      {mode === 'menu' && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Generar receta</Text>

          <Text style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>Tipo de comida</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {MEAL_TYPES.map(m => (
              <Pressable key={m.id} onPress={() => { setSelectedMeal(m.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <View style={{
                  alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
                  backgroundColor: selectedMeal === m.id ? `${m.color}20` : '#0a0a0a',
                  borderWidth: 1.5,
                  borderColor: selectedMeal === m.id ? m.color : '#1a1a1a',
                }}>
                  <Ionicons name={m.icon} size={20} color={selectedMeal === m.id ? m.color : '#666'} />
                  <Text style={{ color: selectedMeal === m.id ? '#fff' : '#666', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                    {m.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>Objetivo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {GOALS.map(g => (
              <Pressable key={g.id} onPress={() => { setSelectedGoal(g.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <View style={{
                  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                  backgroundColor: selectedGoal === g.id ? 'rgba(168,224,42,0.15)' : '#0a0a0a',
                  borderWidth: 1.5,
                  borderColor: selectedGoal === g.id ? '#a8e02a' : '#1a1a1a',
                }}>
                  <Text style={{ color: selectedGoal === g.id ? '#a8e02a' : '#999', fontSize: 12, fontWeight: '600' }}>
                    {g.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleGenerateRecipe} disabled={!selectedMeal} style={{
            backgroundColor: selectedMeal ? '#a8e02a' : '#1a1a1a', borderRadius: 16, padding: 16, alignItems: 'center',
            flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}>
            <Ionicons name="eye-outline" size={20} color={selectedMeal ? '#000' : '#444'} />
            <Text style={{ color: selectedMeal ? '#000' : '#444', fontSize: 16, fontWeight: '800' }}>GENERAR RECETA</Text>
          </Pressable>

          {/* Separador */}
          <View style={{ height: 1, backgroundColor: '#1a1a1a', marginVertical: 30 }} />

          {/* Lista de super */}
          <Pressable onPress={handleShoppingList} style={{
            backgroundColor: '#0a0a0a', borderRadius: 16, padding: 20,
            borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)',
            flexDirection: 'row', alignItems: 'center', gap: 14,
          }}>
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: 'rgba(56,189,248,0.12)',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="cart-outline" size={24} color="#38bdf8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Lista de super semanal</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>ARGOS genera tu lista optimizada para 7 días</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </Pressable>
        </View>
      )}

      {/* Generating */}
      {mode === 'generating' && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color="#a8e02a" />
          <Text style={{ color: '#a8e02a', fontSize: 16, fontWeight: '700', marginTop: 20 }}>ARGOS cocina ideas...</Text>
        </View>
      )}

      {/* Recipe result */}
      {mode === 'recipe' && recipe && (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{
            backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: 16, padding: 20, marginBottom: 16,
            borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
          }}>
            <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
              RECETA ARGOS
            </Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{recipe.name}</Text>
            <Text style={{ color: '#999', fontSize: 13, marginTop: 4 }}>{recipe.description}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
              <Text style={{ color: '#a8e02a', fontSize: 12 }}>{recipe.calories} kcal</Text>
              <Text style={{ color: '#60a5fa', fontSize: 12 }}>P{recipe.protein_g}g</Text>
              <Text style={{ color: '#fbbf24', fontSize: 12 }}>C{recipe.carbs_g}g</Text>
              <Text style={{ color: '#fb923c', fontSize: 12 }}>G{recipe.fat_g}g</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>{recipe.prepMinutes + recipe.cookMinutes} min</Text>
            </View>
          </View>

          <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
            INGREDIENTES
          </Text>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, paddingLeft: 8 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#fbbf24', marginTop: 7 }} />
              <Text style={{ color: '#ccc', fontSize: 14 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{ing.quantity}</Text> {ing.name}
                {ing.notes ? <Text style={{ color: '#666' }}> ({ing.notes})</Text> : null}
              </Text>
            </View>
          ))}

          <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 20, marginBottom: 10 }}>
            PREPARACIÓN
          </Text>
          {recipe.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 10, paddingLeft: 4 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: 'rgba(168,224,42,0.1)', justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: '#a8e02a', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={{ color: '#ccc', fontSize: 14, lineHeight: 21, flex: 1 }}>{s}</Text>
            </View>
          ))}

          {recipe.tips && (
            <View style={{ backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 12, padding: 14, marginTop: 16 }}>
              <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '600' }}>{recipe.tips}</Text>
            </View>
          )}

          <Pressable onPress={handleGenerateRecipe} style={{
            backgroundColor: '#0a0a0a', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 20,
            borderWidth: 1, borderColor: '#1a1a1a',
          }}>
            <Text style={{ color: '#999', fontSize: 14, fontWeight: '600' }}>Generar otra receta</Text>
          </Pressable>
        </View>
      )}

      {/* Shopping list result */}
      {mode === 'shoppingResult' && shoppingList && (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Lista de super</Text>
            <Pressable onPress={shareShoppingList} style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(56,189,248,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
            }}>
              <Ionicons name="share-outline" size={16} color="#38bdf8" />
              <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '600' }}>Compartir</Text>
            </Pressable>
          </View>

          {shoppingList.sections.map((section, i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
                {section.name.toUpperCase()}
              </Text>
              {section.items.map((item, j) => (
                <View key={j} style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: '#0a0a0a', borderRadius: 10, padding: 12, marginBottom: 4,
                }}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>{item.name}</Text>
                  <Text style={{ color: '#999', fontSize: 13 }}>{item.quantity}</Text>
                </View>
              ))}
            </View>
          ))}

          <Pressable onPress={handleShoppingList} style={{
            backgroundColor: '#0a0a0a', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 10,
            borderWidth: 1, borderColor: '#1a1a1a',
          }}>
            <Text style={{ color: '#999', fontSize: 14, fontWeight: '600' }}>Regenerar lista</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
