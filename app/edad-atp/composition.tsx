/**
 * Edad ATP — captura manual de composición corporal. Sprint 2.
 * FFMI se auto-calcula y muestra (no editable).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { saveBodyComposition } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const num = (s: string): number | undefined => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

export default function CompositionCapture() {
  const { user } = useAuth();
  const [v, setV] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  // FFMI = masa libre de grasa / talla².
  const weight = num(v.weight_kg ?? '');
  const height = num(v.height_cm ?? '');
  const bodyFat = num(v.body_fat_pct ?? '');
  const ffmi =
    weight != null && height != null && bodyFat != null && height > 0
      ? (weight * (1 - bodyFat / 100)) / Math.pow(height / 100, 2)
      : undefined;

  async function handleSave() {
    if (!user?.id) return;
    const comp = {
      weight_kg: weight,
      height_cm: height,
      body_fat_pct: bodyFat,
      skeletal_muscle_pct: num(v.skeletal_muscle_pct ?? ''),
      visceral_fat: num(v.visceral_fat ?? ''),
      grip_strength_kg: num(v.grip_strength_kg ?? ''),
      ffmi: ffmi != null ? Math.round(ffmi * 10) / 10 : undefined,
    };
    if (Object.values(comp).every((x) => x === undefined)) {
      Alert.alert('Sin datos', 'Ingresa al menos un valor.');
      return;
    }
    setSaving(true);
    const result = await saveBodyComposition(user.id, comp);
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
      return;
    }
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Composición" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <NumberInputRow label="Peso" unit="kg" value={v.weight_kg ?? ''} onChangeText={(x) => set('weight_kg', x)} />
          <NumberInputRow label="Altura" unit="cm" value={v.height_cm ?? ''} onChangeText={(x) => set('height_cm', x)} />
          <NumberInputRow label="% Grasa corporal" unit="%" value={v.body_fat_pct ?? ''} onChangeText={(x) => set('body_fat_pct', x)} />
          <NumberInputRow label="% Músculo esquelético" unit="%" value={v.skeletal_muscle_pct ?? ''} onChangeText={(x) => set('skeletal_muscle_pct', x)} />
          <NumberInputRow label="Grasa visceral" value={v.visceral_fat ?? ''} onChangeText={(x) => set('visceral_fat', x)} helper="Índice típico 1–30" />
          <NumberInputRow label="Fuerza de agarre" unit="kg" value={v.grip_strength_kg ?? ''} onChangeText={(x) => set('grip_strength_kg', x)} helper="Dinamómetro Camry EH101 (~$25)" />
          <NumberInputRow label="Tu FFMI" value={ffmi != null ? (Math.round(ffmi * 10) / 10).toString() : ''} readOnly placeholder="auto" />
        </View>

        <EliteText variant="caption" style={styles.note}>
          Pesa por la mañana en ayunas, sin ropa. Si tienes báscula inteligente, copia los valores.
        </EliteText>

        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
