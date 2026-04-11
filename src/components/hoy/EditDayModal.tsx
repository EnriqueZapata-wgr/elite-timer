/**
 * EditDayModal — Editar electrones activos y acciones de la agenda.
 *
 * Permite al usuario:
 * - Activar/desactivar electrones booleanos y cuantitativos
 * - Agregar acciones custom a la agenda
 * - Eliminar acciones existentes
 */
import { useState } from 'react';
import { View, Text, Modal, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export interface ElectronOption {
  key: string;
  name: string;
  icon: string;
  color: string;
  weight: number;
}

export interface AgendaAction {
  id: string;
  name: string;
  time: string;
  category?: string;
  completed?: boolean;
}

// Todos los electrones disponibles (el usuario elige cuáles trackear)
export const ALL_BOOLEAN_OPTIONS: ElectronOption[] = [
  { key: 'sunlight',     name: 'Luz solar',     icon: 'sunny-outline',   color: '#fbbf24', weight: 1.5 },
  { key: 'meditation',   name: 'Meditación',    icon: 'flower-outline',  color: '#c084fc', weight: 2.5 },
  { key: 'supplements',  name: 'Suplementos',   icon: 'medical-outline', color: '#a8e02a', weight: 1.0 },
  { key: 'cold_shower',  name: 'Baño frío',     icon: 'snow-outline',    color: '#38bdf8', weight: 3.0 },
  { key: 'grounding',    name: 'Grounding',     icon: 'leaf-outline',    color: '#34d399', weight: 1.5 },
  { key: 'no_alcohol',   name: 'Sin alcohol',   icon: 'wine-outline',    color: '#f87171', weight: 1.0 },
  { key: 'strength',     name: 'Fuerza',        icon: 'barbell-outline', color: '#a8e02a', weight: 3.0 },
  { key: 'breathwork',   name: 'Breathwork',    icon: 'cloud-outline',   color: '#60a5fa', weight: 1.0 },
  { key: 'red_glasses',  name: 'Lentes rojos',  icon: 'glasses-outline', color: '#f87171', weight: 1.0 },
  { key: 'period_log',   name: 'Registrar ciclo', icon: 'calendar-outline', color: '#fb7185', weight: 1.0 },
];

export const ALL_QUANT_OPTIONS: ElectronOption[] = [
  { key: 'protein', name: 'Proteína', icon: 'restaurant-outline', color: '#a6c8ff', weight: 2.0 },
  { key: 'steps',   name: 'Pasos',    icon: 'footsteps-outline',  color: '#ffc54c', weight: 3.0 },
  { key: 'water',   name: 'Agua',     icon: 'water-outline',      color: '#60a5fa', weight: 1.5 },
  { key: 'sleep',   name: 'Sueño',    icon: 'moon-outline',       color: '#818cf8', weight: 3.0 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  activeBooleans: string[];
  activeQuantitatives: string[];
  agendaActions: AgendaAction[];
  onSave: (booleans: string[], quantitatives: string[], actions: AgendaAction[]) => void;
}

export function EditDayModal({ visible, onClose, activeBooleans, activeQuantitatives, agendaActions, onSave }: Props) {
  const [booleans, setBooleans] = useState(activeBooleans);
  const [quantitatives, setQuantitatives] = useState(activeQuantitatives);
  const [actions, setActions] = useState(agendaActions);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('');

  const toggleBoolean = (key: string) => {
    haptic.light();
    setBooleans(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleQuant = (key: string) => {
    haptic.light();
    setQuantitatives(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const removeAction = (idx: number) => {
    haptic.medium();
    setActions(prev => prev.filter((_, i) => i !== idx));
  };

  const addAction = () => {
    if (!newName.trim()) return;
    haptic.light();
    setActions(prev => [
      ...prev,
      { id: `custom-${Date.now()}`, name: newName.trim(), time: newTime || '09:00', category: 'custom', completed: false },
    ].sort((a, b) => a.time.localeCompare(b.time)));
    setNewName('');
    setNewTime('');
    setShowAdd(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>Editar mi día</Text>
              <AnimatedPressable onPress={onClose}>
                <Ionicons name="close" size={24} color="#999" />
              </AnimatedPressable>
            </View>

            {/* Electrones booleanos */}
            <Text style={s.sectionLabel}>HÁBITOS</Text>
            <Text style={s.sectionHint}>Elige qué hábitos trackear hoy</Text>
            <View style={s.chipGrid}>
              {ALL_BOOLEAN_OPTIONS.map(el => {
                const active = booleans.includes(el.key);
                return (
                  <AnimatedPressable key={el.key} onPress={() => toggleBoolean(el.key)}>
                    <View style={[s.chip, active && { backgroundColor: `${el.color}20`, borderColor: `${el.color}40` }]}>
                      <Ionicons name={el.icon as any} size={14} color={active ? el.color : '#666'} />
                      <Text style={[s.chipText, active && { color: el.color }]}>{el.name}</Text>
                      <Text style={[s.chipWeight, active && { color: '#999' }]}>⚡{el.weight}</Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* Electrones cuantitativos */}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>METAS DIARIAS</Text>
            <View style={s.chipGrid}>
              {ALL_QUANT_OPTIONS.map(el => {
                const active = quantitatives.includes(el.key);
                return (
                  <AnimatedPressable key={el.key} onPress={() => toggleQuant(el.key)}>
                    <View style={[s.chip, active && { backgroundColor: `${el.color}20`, borderColor: `${el.color}40` }]}>
                      <Ionicons name={el.icon as any} size={14} color={active ? el.color : '#666'} />
                      <Text style={[s.chipText, active && { color: el.color }]}>{el.name}</Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* Agenda */}
            <View style={s.agendaHeader}>
              <Text style={s.sectionLabel}>AGENDA</Text>
              <AnimatedPressable onPress={() => setShowAdd(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add-circle-outline" size={16} color="#a8e02a" />
                  <Text style={{ color: '#a8e02a', fontSize: 12, fontFamily: Fonts.bold }}>Agregar</Text>
                </View>
              </AnimatedPressable>
            </View>

            {actions.map((action, idx) => (
              <View key={action.id} style={s.actionRow}>
                <Text style={s.actionTime}>{action.time || '--:--'}</Text>
                <Text style={s.actionName} numberOfLines={1}>{action.name}</Text>
                <AnimatedPressable onPress={() => removeAction(idx)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </AnimatedPressable>
              </View>
            ))}

            {actions.length === 0 && (
              <Text style={s.emptyText}>Sin acciones en la agenda. Toca "Agregar".</Text>
            )}

            {/* Agregar acción custom */}
            {showAdd && (
              <View style={s.addBox}>
                <TextInput
                  placeholder="Nombre de la acción"
                  placeholderTextColor="#666"
                  value={newName}
                  onChangeText={setNewName}
                  style={s.addInput}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    placeholder="Hora (ej: 08:00)"
                    placeholderTextColor="#666"
                    value={newTime}
                    onChangeText={setNewTime}
                    style={[s.addInput, { flex: 1 }]}
                  />
                  <AnimatedPressable onPress={addAction} style={s.addBtn}>
                    <Ionicons name="checkmark" size={20} color="#000" />
                  </AnimatedPressable>
                </View>
              </View>
            )}

            {/* Guardar */}
            <AnimatedPressable
              onPress={() => { haptic.success(); onSave(booleans, quantitatives, actions); onClose(); }}
              style={s.saveBtn}
            >
              <Text style={s.saveBtnText}>GUARDAR CAMBIOS</Text>
            </AnimatedPressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { color: '#fff', fontSize: 20, fontFamily: Fonts.extraBold },

  sectionLabel: {
    color: '#a8e02a',
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  sectionHint: {
    color: '#666',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginBottom: 12,
  },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipText: { color: '#666', fontSize: 12, fontFamily: Fonts.semiBold },
  chipWeight: { color: '#444', fontSize: 10, fontFamily: Fonts.regular },

  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  actionTime: { color: '#a8e02a', fontSize: 12, fontFamily: Fonts.bold, width: 50 },
  actionName: { color: '#fff', fontSize: 14, fontFamily: Fonts.regular, flex: 1 },
  emptyText: { color: '#666', fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  addBox: { backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginTop: 8, gap: 8 },
  addInput: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.regular,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  addBtn: {
    backgroundColor: '#a8e02a',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },

  saveBtn: {
    backgroundColor: '#a8e02a',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#000', fontSize: 16, fontFamily: Fonts.extraBold },
});
