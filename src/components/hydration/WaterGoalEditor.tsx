/**
 * WaterGoalEditor — Modal bottom sheet para editar meta diaria de agua.
 * Usado desde protocol-config, hydration.tsx, nutrition.tsx.
 */
import { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, DeviceEventEmitter } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getUserWaterGoal, setUserWaterGoal } from '@/src/services/hydration-service';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

const PRESETS_ML = [2000, 2500, 3000, 3500, 4000];
// Domain color de hidratación (espejo de hydration.tsx). Como relleno/borde
// se queda en los dos temas; como texto chico en claro cae a t.info (calibrado).
const WATER_COLOR = '#38bdf8';

interface Props {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onSaved?: (newGoalMl: number) => void;
}

export function WaterGoalEditor({ userId, visible, onClose, onSaved }: Props) {
  // Componente compartido (src/components/**): tokens del scope, no del tema global.
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const [current, setCurrent] = useState(2500);
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    getUserWaterGoal(userId).then(setCurrent);
  }, [visible, userId]);

  async function handleSave(ml: number) {
    if (ml <= 0 || ml > 10000) return;
    setSaving(true);
    try {
      await setUserWaterGoal(userId, ml);
      // Sync HOY: la meta de agua afecta compileDay (crash test F36.4).
      DeviceEventEmitter.emit('day_changed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.(ml);
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <Text style={s.title}>Meta diaria de agua</Text>
          <Text style={s.subtitle}>Actual: {(current / 1000).toFixed(1)}L</Text>

          <View style={s.presets}>
            {PRESETS_ML.map(ml => (
              <Pressable
                key={ml}
                style={[s.preset, current === ml && s.presetActive]}
                onPress={() => handleSave(ml)}
                disabled={saving}
              >
                <Text style={[s.presetText, current === ml && s.presetTextActive]}>
                  {(ml / 1000).toFixed(1)}L
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={s.customRow}>
            <TextInput
              style={s.input}
              placeholder="Custom (ml)"
              placeholderTextColor={t.sinDatos}
              keyboardType="numeric"
              value={custom}
              onChangeText={setCustom}
            />
            <Pressable
              style={s.saveBtn}
              onPress={() => {
                const n = Number(custom);
                if (n > 0) handleSave(n);
              }}
              disabled={saving || !custom}
            >
              <Text style={s.saveBtnText}>Guardar</Text>
            </Pressable>
          </View>

          <Pressable style={s.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={s.cancelText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// MB-31B: tokens del tema (patrón makeStyles). El velo y las superficies
// siguen la doctrina de color; el azul de hidratación es dominio (rule 5) y
// solo cambia como TEXTO chico (presetTextActive) para no perder contraste.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: t.kind === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: { backgroundColor: t.hundido, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: t.bordeMarcado, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { color: t.texto, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: t.textoSecundario, fontSize: 13, marginBottom: 20 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  preset: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: t.flotante, borderWidth: 1, borderColor: t.flotante },
  presetActive: { backgroundColor: 'rgba(56,189,248,0.15)', borderColor: WATER_COLOR },
  presetText: { color: t.textoSecundario, fontSize: 14, fontWeight: '700' },
  presetTextActive: { color: t.kind === 'dark' ? WATER_COLOR : t.info },
  customRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: t.flotante, borderRadius: 12, paddingHorizontal: 16, color: t.texto, fontSize: 14 },
  saveBtn: { backgroundColor: ATP_BRAND.lime, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  saveBtnText: { color: t.textoSobreLima, fontWeight: '800', fontSize: 13 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: t.textoSecundario, fontSize: 13 },
});
