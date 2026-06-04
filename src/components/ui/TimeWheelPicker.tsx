import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Modal } from 'react-native';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5; // wheel muestra 5 items, centro destacado
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface TimeWheelPickerProps {
  visible: boolean;
  initialValue: Date;
  maxDate?: Date;
  minDate?: Date;
  title?: string;
  presets?: Array<{ label: string; getDate: () => Date }>;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

/**
 * Scroll-wheel picker custom para fecha + hora.
 * - 3 columnas: Día (7 días atrás + hoy), Hora (00-23), Minuto (intervalos de 5).
 * - Snap-to-item con haptics ligero al cambiar.
 * - Presets rápidos arriba que llenan las 3 wheels al instante.
 * - Modal nativo, cerrarse con backdrop o botón Cancelar.
 *
 * Reemplaza @react-native-community/datetimepicker mode="datetime" (que no
 * existe en Android y crashea con "Cannot read property 'dismiss' of undefined").
 *
 * Reutilizable en supplements, sleep, cualquier flow que necesite fecha+hora.
 */
export function TimeWheelPicker({
  visible,
  initialValue,
  maxDate,
  minDate,
  title = 'Selecciona fecha y hora',
  presets = [],
  onConfirm,
  onCancel,
}: TimeWheelPickerProps) {
  // Estado interno de la wheel (no se commitea hasta Aceptar)
  const [draftDate, setDraftDate] = React.useState(initialValue);

  useEffect(() => {
    if (visible) setDraftDate(initialValue);
  }, [visible, initialValue]);

  // Generación de opciones para cada wheel
  const dayOptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const opts: Array<{ label: string; value: Date }> = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      let label = '';
      if (i === 0) label = 'Hoy';
      else if (i === 1) label = 'Ayer';
      else label = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
      opts.push({ label, value: d });
    }
    return opts;
  }, []);

  const hourOptions = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({ label: String(i).padStart(2, '0'), value: i })), []);

  const minuteOptions = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({ label: String(i * 5).padStart(2, '0'), value: i * 5 })), []);

  // Índices iniciales basados en draftDate
  const dayIdx = useMemo(() => {
    const draftDay = new Date(draftDate);
    draftDay.setHours(0, 0, 0, 0);
    return dayOptions.findIndex(o => o.value.getTime() === draftDay.getTime());
  }, [draftDate, dayOptions]);

  const hourIdx = draftDate.getHours();
  const minuteIdx = Math.round(draftDate.getMinutes() / 5);

  // Refs para scroll programático en presets
  const dayRef = useRef<FlatList>(null);
  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);

  // Aplica preset llenando las 3 wheels al instante
  const applyPreset = (getDate: () => Date) => {
    const newDate = getDate();
    if (maxDate && newDate > maxDate) return;
    if (minDate && newDate < minDate) return;
    setDraftDate(newDate);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Scroll cada wheel a su nuevo índice
    requestAnimationFrame(() => {
      const newDay = new Date(newDate);
      newDay.setHours(0, 0, 0, 0);
      const newDayIdx = dayOptions.findIndex(o => o.value.getTime() === newDay.getTime());
      try {
        if (newDayIdx >= 0) dayRef.current?.scrollToIndex({ index: newDayIdx, animated: true });
        hourRef.current?.scrollToIndex({ index: newDate.getHours(), animated: true });
        minuteRef.current?.scrollToIndex({ index: Math.round(newDate.getMinutes() / 5), animated: true });
      } catch { /* índice fuera de rango — el snap manual lo corrige */ }
    });
  };

  const handleDayChange = (idx: number) => {
    const day = dayOptions[idx]?.value;
    if (!day) return;
    const newDate = new Date(draftDate);
    newDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    if (maxDate && newDate > maxDate) return;
    if (minDate && newDate < minDate) return;
    setDraftDate(newDate);
    Haptics.selectionAsync();
  };
  const handleHourChange = (h: number) => {
    const newDate = new Date(draftDate);
    newDate.setHours(h);
    if (maxDate && newDate > maxDate) return;
    if (minDate && newDate < minDate) return;
    setDraftDate(newDate);
    Haptics.selectionAsync();
  };
  const handleMinuteChange = (mIdx: number) => {
    const newDate = new Date(draftDate);
    newDate.setMinutes(mIdx * 5);
    if (maxDate && newDate > maxDate) return;
    if (minDate && newDate < minDate) return;
    setDraftDate(newDate);
    Haptics.selectionAsync();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          {/* Presets */}
          {presets.length > 0 && (
            <View style={styles.presetsRow}>
              {presets.map((p) => (
                <Pressable
                  key={p.label}
                  style={styles.presetBtn}
                  onPress={() => applyPreset(p.getDate)}
                >
                  <Text style={styles.presetText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* 3 wheels */}
          <View style={styles.wheelsRow}>
            <Wheel
              ref={dayRef}
              data={dayOptions.map(o => o.label)}
              initialIndex={dayIdx}
              onIndexChange={handleDayChange}
              flexWeight={2}
            />
            <Wheel
              ref={hourRef}
              data={hourOptions.map(o => o.label)}
              initialIndex={hourIdx}
              onIndexChange={handleHourChange}
              flexWeight={1}
            />
            <Text style={styles.separator}>:</Text>
            <Wheel
              ref={minuteRef}
              data={minuteOptions.map(o => o.label)}
              initialIndex={minuteIdx}
              onIndexChange={handleMinuteChange}
              flexWeight={1}
            />
          </View>

          {/* Indicador central */}
          <View pointerEvents="none" style={styles.centerIndicator} />

          {/* Botones */}
          <View style={styles.btnRow}>
            <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.confirmBtn]}
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onConfirm(draftDate); }}
            >
              <Text style={styles.confirmText}>Aceptar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface WheelProps {
  data: string[];
  initialIndex: number;
  onIndexChange: (idx: number) => void;
  flexWeight: number;
}

const Wheel = React.forwardRef<FlatList, WheelProps>(({ data, initialIndex, onIndexChange, flexWeight }, ref) => {
  return (
    <View style={[wheelStyles.container, { flex: flexWeight }]}>
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(item, idx) => `${item}-${idx}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, idx) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * idx, index: idx })}
        initialScrollIndex={Math.max(0, initialIndex)}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          onIndexChange(idx);
        }}
        renderItem={({ item }) => (
          <View style={wheelStyles.item}>
            <Text style={wheelStyles.itemText}>{item}</Text>
          </View>
        )}
      />
    </View>
  );
});
Wheel.displayName = 'Wheel';

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 16 },
  title: { color: '#a8e02a', fontSize: 13, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1a2a0a', borderRadius: 20, borderWidth: 1, borderColor: '#a8e02a55' },
  presetText: { color: '#a8e02a', fontSize: 13, fontWeight: '600' },
  wheelsRow: { flexDirection: 'row', height: WHEEL_HEIGHT, alignItems: 'center', position: 'relative' },
  separator: { color: '#fff', fontSize: 22, fontWeight: '700', paddingHorizontal: 4 },
  centerIndicator: {
    position: 'absolute', left: 16, right: 16,
    top: WHEEL_HEIGHT / 2 + 60, // 60 = title + presets approximate height
    height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#a8e02a',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#1a1a1a' },
  confirmBtn: { backgroundColor: '#a8e02a' },
  cancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
  confirmText: { color: '#000', fontSize: 15, fontWeight: '700' },
});

const wheelStyles = StyleSheet.create({
  container: { height: WHEEL_HEIGHT },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemText: { color: '#fff', fontSize: 18, fontWeight: '500' },
});
