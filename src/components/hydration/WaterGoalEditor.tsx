/**
 * WaterGoalEditor — Modal bottom sheet para editar meta diaria de agua.
 * Usado desde protocol-config, hydration.tsx, nutrition.tsx.
 */
import { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, DeviceEventEmitter } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getUserWaterGoal, setUserWaterGoal } from '@/src/services/hydration-service';

const PRESETS_ML = [2000, 2500, 3000, 3500, 4000];

interface Props {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onSaved?: (newGoalMl: number) => void;
}

export function WaterGoalEditor({ userId, visible, onClose, onSaved }: Props) {
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
              placeholderTextColor="#666"
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

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 13, marginBottom: 20 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  preset: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#1a1a1a' },
  presetActive: { backgroundColor: 'rgba(56,189,248,0.15)', borderColor: '#38bdf8' },
  presetText: { color: '#ccc', fontSize: 14, fontWeight: '700' },
  presetTextActive: { color: '#38bdf8' },
  customRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 16, color: '#fff', fontSize: 14 },
  saveBtn: { backgroundColor: '#a8e02a', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#666', fontSize: 13 },
});
