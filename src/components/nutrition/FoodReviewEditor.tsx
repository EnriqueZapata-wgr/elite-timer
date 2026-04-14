/**
 * FoodReviewEditor — Pantalla de revisión/edición de alimentos antes de guardar.
 *
 * Siempre se muestra después de que la IA estima (por texto o foto).
 * Permite editar ingredientes, cantidades, unidades y macros.
 */
import { useState, useMemo } from 'react';
import { View, ScrollView, TextInput, Pressable, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { findEquivalence, UNIT_CYCLE, type FoodUnit } from '@/src/constants/food-units';
import { validateFoodEstimate, type ValidationResult } from '@/src/utils/food-validation';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

// === TIPOS ===

export interface ReviewItem {
  name: string;
  quantity: number;
  unit: FoodUnit;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface ReviewTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface ReviewState {
  description: string;
  items: ReviewItem[];
  totals: ReviewTotals;
}

interface Props {
  initialState: ReviewState;
  onSave: (state: ReviewState) => void;
  onCancel: () => void;
}

// === HELPERS ===

/** Parsear resultado de IA a ReviewState con unidades naturales */
export function parseAIToReview(aiResult: any): ReviewState {
  const rawItems = aiResult?.ingredients || aiResult?.items || [];
  const items: ReviewItem[] = rawItems.map((item: any) => {
    const name = item.name || item.food || '';
    const equiv = findEquivalence(name);
    if (equiv && item.grams) {
      const naturalQty = Math.round((item.grams / equiv.gramsPerUnit) * 10) / 10;
      return {
        name,
        quantity: naturalQty || equiv.defaultQuantity,
        unit: equiv.naturalUnit,
        calories: item.calories,
        protein_g: item.protein_g ?? item.protein,
        carbs_g: item.carbs_g ?? item.carbs,
        fat_g: item.fat_g ?? item.fat,
      };
    }
    return {
      name,
      quantity: item.grams || item.quantity || 100,
      unit: (item.unit as FoodUnit) || 'g',
      calories: item.calories,
      protein_g: item.protein_g ?? item.protein,
      carbs_g: item.carbs_g ?? item.carbs,
      fat_g: item.fat_g ?? item.fat,
    };
  });

  return {
    description: aiResult?.food_identified || aiResult?.description || '',
    items,
    totals: {
      calories: aiResult?.estimated_calories ?? aiResult?.totals?.calories ?? items.reduce((s: number, i: ReviewItem) => s + (i.calories || 0), 0),
      protein_g: aiResult?.estimated_protein ?? aiResult?.totals?.protein ?? items.reduce((s: number, i: ReviewItem) => s + (i.protein_g || 0), 0),
      carbs_g: aiResult?.estimated_carbs ?? aiResult?.totals?.carbs ?? items.reduce((s: number, i: ReviewItem) => s + (i.carbs_g || 0), 0),
      fat_g: aiResult?.estimated_fat ?? aiResult?.totals?.fat ?? items.reduce((s: number, i: ReviewItem) => s + (i.fat_g || 0), 0),
    },
  };
}

// === COMPONENTE ===

export function FoodReviewEditor({ initialState, onSave, onCancel }: Props) {
  const [review, setReview] = useState<ReviewState>(initialState);

  const validation: ValidationResult = useMemo(
    () => validateFoodEstimate({
      ...review.totals,
      items: review.items.map(i => ({
        name: i.name,
        protein_g: i.protein_g,
        quantity: i.quantity,
      })),
    }),
    [review.totals, review.items],
  );

  function updateItem(index: number, field: string, value: any) {
    setReview(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function removeItem(index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReview(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function addItem() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReview(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, unit: 'pzas' as FoodUnit }],
    }));
  }

  function cycleUnit(index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReview(prev => {
      const items = [...prev.items];
      const current = items[index].unit;
      items[index] = { ...items[index], unit: UNIT_CYCLE[current] || 'g' };
      return { ...prev, items };
    });
  }

  function applyAutoFixes() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReview(prev => {
      let totals = { ...prev.totals };
      for (const fix of validation.autoFixes) {
        if (fix.field === 'calories') totals.calories = fix.fixed;
      }
      return { ...prev, totals };
    });
  }

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(review);
  }

  const MACROS = [
    { key: 'calories' as const, label: 'Calorías', unit: 'kcal', color: '#a8e02a' },
    { key: 'protein_g' as const, label: 'Proteína', unit: 'g', color: '#60a5fa' },
    { key: 'carbs_g' as const, label: 'Carbos', unit: 'g', color: '#fbbf24' },
    { key: 'fat_g' as const, label: 'Grasa', unit: 'g', color: '#fb923c' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#999" />
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 16, fontFamily: Fonts.bold }}>REVISAR ALIMENTO</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Descripción editable */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ color: '#666', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 6 }}>DESCRIPCIÓN</Text>
        <TextInput
          value={review.description}
          onChangeText={v => setReview(prev => ({ ...prev, description: v }))}
          style={{
            backgroundColor: '#0a0a0a', color: '#fff', padding: 14,
            borderRadius: 12, fontSize: 15, fontFamily: Fonts.regular,
            borderWidth: 1, borderColor: '#1a1a1a',
          }}
          multiline
          placeholderTextColor="#444"
          placeholder="Describe tu comida"
        />
      </View>

      {/* Ingredientes editables */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ color: '#666', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 10 }}>INGREDIENTES</Text>

        {review.items.map((item, index) => (
          <View key={index} style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: '#0a0a0a', borderRadius: 12, padding: 12, marginBottom: 8,
          }}>
            <TextInput
              value={item.name}
              onChangeText={v => updateItem(index, 'name', v)}
              placeholder="Ingrediente"
              placeholderTextColor="#444"
              style={{ color: '#fff', fontSize: 14, fontFamily: Fonts.regular, flex: 1 }}
            />
            <TextInput
              value={String(item.quantity)}
              onChangeText={v => updateItem(index, 'quantity', parseFloat(v) || 0)}
              keyboardType="decimal-pad"
              style={{
                color: '#a8e02a', fontSize: 14, fontFamily: Fonts.bold,
                width: 50, textAlign: 'right',
              }}
            />
            <Pressable onPress={() => cycleUnit(index)}>
              <View style={{
                backgroundColor: 'rgba(168,224,42,0.1)', paddingHorizontal: 8,
                paddingVertical: 4, borderRadius: 8,
              }}>
                <Text style={{ color: '#a8e02a', fontSize: 12, fontFamily: Fonts.semiBold }}>
                  {item.unit}
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={() => removeItem(index)} hitSlop={8}>
              <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
            </Pressable>
          </View>
        ))}

        <Pressable onPress={addItem} style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 6, paddingVertical: 12, borderWidth: 1, borderColor: '#1a1a1a',
          borderRadius: 12, borderStyle: 'dashed',
        }}>
          <Ionicons name="add-circle-outline" size={18} color="#a8e02a" />
          <Text style={{ color: '#a8e02a', fontSize: 13, fontFamily: Fonts.semiBold }}>Agregar ingrediente</Text>
        </Pressable>
      </View>

      {/* Warnings IA */}
      {validation.warnings.length > 0 && (
        <View style={{
          backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12,
          padding: 14, marginHorizontal: 20, marginBottom: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="warning-outline" size={18} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 13, fontFamily: Fonts.bold }}>Posibles errores detectados</Text>
          </View>
          {validation.warnings.map((w, i) => (
            <Text key={i} style={{ color: '#ccc', fontSize: 12, marginBottom: 4, lineHeight: 18 }}>• {w}</Text>
          ))}
          {validation.autoFixes.length > 0 && (
            <Pressable onPress={applyAutoFixes} style={{ marginTop: 8 }}>
              <Text style={{ color: '#a8e02a', fontSize: 12, fontFamily: Fonts.semiBold }}>
                Aplicar correcciones sugeridas →
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Macros editables */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ color: '#666', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 10 }}>MACROS</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {MACROS.map(macro => (
            <View key={macro.key} style={{
              width: '47%', backgroundColor: '#0a0a0a',
              borderRadius: 12, padding: 12,
            }}>
              <Text style={{ color: '#999', fontSize: 10, fontFamily: Fonts.bold, marginBottom: 4 }}>{macro.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  value={String(Math.round(review.totals[macro.key]))}
                  onChangeText={v => setReview(prev => ({
                    ...prev,
                    totals: { ...prev.totals, [macro.key]: parseFloat(v) || 0 },
                  }))}
                  keyboardType="decimal-pad"
                  style={{ color: macro.color, fontSize: 22, fontFamily: Fonts.extraBold, minWidth: 40 }}
                />
                <Text style={{ color: '#666', fontSize: 12 }}>{macro.unit}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          marginTop: 12, backgroundColor: 'rgba(251,191,36,0.08)',
          borderRadius: 12, padding: 12,
        }}>
          <Ionicons name="alert-circle-outline" size={18} color="#fbbf24" />
          <Text style={{ color: '#999', fontSize: 12, flex: 1 }}>
            Los macros son estimados por IA. Ajusta si notas errores.
          </Text>
        </View>
      </View>

      {/* Guardar */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Pressable onPress={handleSave} style={{
          backgroundColor: '#a8e02a', borderRadius: 16, padding: 16, alignItems: 'center',
        }}>
          <Text style={{ color: '#000', fontSize: 16, fontFamily: Fonts.extraBold, letterSpacing: 1 }}>GUARDAR</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
