/**
 * Food Preferences — Cuestionario de preferencias alimenticias.
 * Dieta, alergias, alimentos no deseados, estilo de cocina.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { userErrorMessage } from '@/src/utils/user-error';

const DIET_TYPES = [
  { id: 'omnivore', name: 'Omnívoro', icon: 'restaurant-outline' },
  { id: 'vegetarian', name: 'Vegetariano', icon: 'leaf-outline' },
  { id: 'vegan', name: 'Vegano', icon: 'flower-outline' },
  { id: 'keto', name: 'Keto', icon: 'flame-outline' },
  { id: 'paleo', name: 'Paleo', icon: 'fish-outline' },
  { id: 'gluten_free', name: 'Sin gluten', icon: 'ban-outline' },
];

const ALLERGY_OPTIONS = ['Lácteos', 'Gluten', 'Mariscos', 'Frutos secos', 'Huevo', 'Soya', 'Ninguna'];

const COOKING_STYLES = [
  { id: 'elaborate', name: 'Cocino elaborado', icon: 'bonfire-outline' },
  { id: 'simple', name: 'Rápido y simple', icon: 'flash-outline' },
  { id: 'both', name: 'Un poco de ambos', icon: 'swap-horizontal-outline' },
];

export default function FoodPreferencesScreen() {
  const { user } = useAuth();
  const [diet, setDiet] = useState('omnivore');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState('');
  const [cookingStyle, setCookingStyle] = useState('both');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase.from('food_preferences').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        // MB-8 Track B (G5): un 400 no es "sin preferencias".
        if (error) { logWarn('[food-preferences] load failed:', error.message); return; }
        if (data) {
          setDiet(data.diet_type ?? 'omnivore');
          setAllergies(data.allergies ?? []);
          setDislikes(data.dislikes ?? '');
          setCookingStyle(data.cooking_style ?? 'both');
        }
      });
  }, [user?.id]));

  const toggleAllergy = (a: string) => {
    haptic.light();
    if (a === 'Ninguna') { setAllergies([]); return; }
    setAllergies(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev.filter(x => x !== 'Ninguna'), a]);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    // MB-8 Track B (G5): el try/catch no atrapa 4xx (supabase-js no lanza) —
    // antes mostraba "Guardado" aunque el upsert fallara.
    const { error } = await supabase.from('food_preferences').upsert({
      user_id: user.id, diet_type: diet, allergies,
      dislikes: dislikes || null, cooking_style: cookingStyle,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) {
      logWarn('[food-preferences] save failed:', error.message);
      Alert.alert('Error', userErrorMessage(error, 'No se pudo guardar.'));
    } else {
      haptic.success();
      Alert.alert('Guardado', 'Preferencias actualizadas.');
    }
    setSaving(false);
  };

  return (
    <Screen keyboard>
      <PillarHeader pillar="nutrition" title="Preferencias" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Dieta */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <SectionTitle>¿QUÉ TIPO DE ALIMENTACIÓN SIGUES?</SectionTitle>
          <View style={s.chipGrid}>
            {DIET_TYPES.map(d => (
              <AnimatedPressable key={d.id} onPress={() => { haptic.light(); setDiet(d.id); }}>
                <View style={[s.chip, diet === d.id && s.chipActive]}>
                  <Ionicons name={d.icon as any} size={16} color={diet === d.id ? '#000' : '#888'} />
                  <EliteText style={[s.chipText, diet === d.id && { color: '#000' }]}>{d.name}</EliteText>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        {/* Alergias */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={{ marginTop: Spacing.lg }}>
          <SectionTitle>¿ALERGIAS O INTOLERANCIAS?</SectionTitle>
          <View style={s.chipGrid}>
            {ALLERGY_OPTIONS.map(a => {
              const active = a === 'Ninguna' ? allergies.length === 0 : allergies.includes(a);
              return (
                <AnimatedPressable key={a} onPress={() => toggleAllergy(a)}>
                  <View style={[s.chip, active && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}>
                    <EliteText style={[s.chipText, active && { color: '#fff' }]}>{a}</EliteText>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Dislikes */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={{ marginTop: Spacing.lg }}>
          <SectionTitle>¿ALIMENTOS QUE NO TE GUSTAN?</SectionTitle>
          <TextInput
            style={s.input}
            value={dislikes}
            onChangeText={setDislikes}
            placeholder="hígado, natto, berenjenas..."
            placeholderTextColor="#666"
            multiline
          />
        </Animated.View>

        {/* Cooking style */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={{ marginTop: Spacing.lg }}>
          <SectionTitle>¿CÓMO COCINAS?</SectionTitle>
          <View style={s.chipGrid}>
            {COOKING_STYLES.map(c => (
              <AnimatedPressable key={c.id} onPress={() => { haptic.light(); setCookingStyle(c.id); }}>
                <View style={[s.chip, cookingStyle === c.id && s.chipActive]}>
                  <Ionicons name={c.icon as any} size={16} color={cookingStyle === c.id ? '#000' : '#888'} />
                  <EliteText style={[s.chipText, cookingStyle === c.id && { color: '#000' }]}>{c.name}</EliteText>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        {/* E.1 (MB-8): CTA heroico = degradado del sistema, sin opacidad apilada */}
        <GradientCTA
          label={saving ? 'GUARDANDO…' : 'GUARDAR'}
          pillar="nutrition"
          disabled={saving}
          onPress={handleSave}
          style={{ marginTop: Spacing.xl }}
        />

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: { backgroundColor: '#a8e02a', borderColor: '#a8e02a' },
  chipText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#888' },
  input: {
    backgroundColor: '#0a0a0a', borderRadius: Radius.card, padding: Spacing.md,
    color: '#fff', fontFamily: Fonts.regular, fontSize: FontSizes.md, minHeight: 60,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
});
