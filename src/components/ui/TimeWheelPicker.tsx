import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

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
  // MB-31B: hoja flotante del scope (oscuro de siempre fuera de <ThemeReady>).
  // El lima como texto solo en oscuro; en claro los presets pasan a relleno
  // sólido con negro y el título al teal calibrado (regla 1 del manual 3.6).
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  /**
   * 4EP 28-ago: la rueda de minutos solo tiene 12 posiciones (0,5,...,55). Con
   * 58 o 59 minutos, Math.round(m/5) daba 12 — fuera de rango — y la rueda abria
   * descentrada. Ademas el draft guardaba 58 mientras la rueda ensenaba 55: otra
   * forma de confirmar algo distinto de lo que se ve. Se acota el indice y se
   * pega el draft a la rejilla desde el arranque.
   */
  const idxMinuto = (d: Date) => Math.min(11, Math.round(d.getMinutes() / 5));
  const pegarARejilla = (d: Date) => {
    const out = new Date(d);
    out.setMinutes(idxMinuto(d) * 5, 0, 0);
    return out;
  };

  // Estado interno de la wheel (no se commitea hasta Aceptar)
  const [draftDate, setDraftDate] = React.useState(() => pegarARejilla(initialValue));

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
  const minuteIdx = idxMinuto(draftDate);

  // Refs para scroll programático en presets
  const dayRef = useRef<FlatList>(null);
  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);

  // Al abrir el modal: reset del draft + scroll programático de cada wheel a su
  // índice inicial. initialScrollIndex de FlatList es flakey con getItemLayout +
  // padding → centramos manualmente (bug 2: "Hoy" salía al final del wheel).
  /**
   * 4EP 28-ago GRAVE: este efecto tenia `initialValue` en las deps, y varios
   * llamadores le pasan `new Date()` en linea — un objeto NUEVO en cada render
   * del padre. La pantalla de ayuno re-renderiza cada 30 s por el cronometro,
   * asi que el efecto volvia a correr con el modal ABIERTO, tiraba la eleccion
   * del usuario y recorria las tres ruedas solo. Quien ajustaba la hora a la que
   * rompio el ayuno veia como se le deshacia, y si el tick caia justo antes de
   * Aceptar, cerraba con la hora equivocada sin un solo aviso.
   *
   * Ahora el reset ocurre SOLO en el flanco de apertura. Con el modal abierto,
   * lo que el usuario giro es sagrado.
   */
  const estabaAbierto = useRef(false);
  useEffect(() => {
    if (!visible) { estabaAbierto.current = false; return; }
    if (estabaAbierto.current) return;
    estabaAbierto.current = true;
    const base = pegarARejilla(initialValue);
    setDraftDate(base);
    requestAnimationFrame(() => {
      const newDay = new Date(base);
      newDay.setHours(0, 0, 0, 0);
      const dIdx = dayOptions.findIndex(o => o.value.getTime() === newDay.getTime());
      try {
        if (dIdx >= 0) dayRef.current?.scrollToIndex({ index: dIdx, animated: false });
        hourRef.current?.scrollToIndex({ index: base.getHours(), animated: false });
        minuteRef.current?.scrollToIndex({ index: idxMinuto(base), animated: false });
      } catch { /* onScrollToIndexFailed en cada Wheel maneja el reintento */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, dayOptions]);

  // Aplica preset llenando las 3 wheels al instante
  /** Recoloca las tres ruedas sobre una fecha dada. */
  const reposicionar = (d: Date, animado: boolean) => {
    requestAnimationFrame(() => {
      const dia = new Date(d);
      dia.setHours(0, 0, 0, 0);
      const dIdx = dayOptions.findIndex(o => o.value.getTime() === dia.getTime());
      try {
        if (dIdx >= 0) dayRef.current?.scrollToIndex({ index: dIdx, animated: animado });
        hourRef.current?.scrollToIndex({ index: d.getHours(), animated: animado });
        minuteRef.current?.scrollToIndex({ index: idxMinuto(d), animated: animado });
      } catch { /* onScrollToIndexFailed en cada Wheel maneja el reintento */ }
    });
  };

  /**
   * 4EP 28-ago GRAVE: los tres manejadores hacían `return` cuando el candidato
   * caía fuera de [minDate, maxDate]. Pero la rueda YA se había movido, y como el
   * draft no cambiaba, nadie la regresaba a su sitio: la pantalla enseñaba una
   * hora y Aceptar mandaba otra.
   *
   * Caso real del ayuno: inicio ayer 20:00, ahora 12:00. Quien quería "ayer
   * 22:00" movía el día (rechazado en silencio), movía la hora (rechazado en
   * silencio), leía "Ayer 22:00" en pantalla y cerraba con HOY 12:00. Registraba
   * 16 h donde quiso 2, en una app de salud, sin un mensaje.
   *
   * Ahora se ACOTA al límite en vez de rechazar, y las ruedas se recolocan sobre
   * el valor real. Lo que se ve es siempre lo que se confirma.
   */
  const acotar = (d: Date): Date => {
    if (maxDate && d > maxDate) return pegarARejilla(maxDate);
    if (minDate && d < minDate) return pegarARejilla(minDate);
    return d;
  };
  const fijarDraft = (candidato: Date, animado: boolean) => {
    const bueno = acotar(candidato);
    setDraftDate(bueno);
    if (bueno.getTime() !== candidato.getTime()) reposicionar(bueno, animado);
  };

  const applyPreset = (getDate: () => Date) => {
    const newDate = pegarARejilla(getDate());
    const bueno = acotar(newDate);
    setDraftDate(bueno);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reposicionar(bueno, true);
  };

  const handleDayChange = (idx: number) => {
    const day = dayOptions[idx]?.value;
    if (!day) return;
    const newDate = new Date(draftDate);
    newDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    fijarDraft(newDate, true);
    Haptics.selectionAsync();
  };
  const handleHourChange = (h: number) => {
    const newDate = new Date(draftDate);
    newDate.setHours(h);
    fijarDraft(newDate, true);
    Haptics.selectionAsync();
  };
  const handleMinuteChange = (mIdx: number) => {
    const newDate = new Date(draftDate);
    newDate.setMinutes(Math.min(11, mIdx) * 5, 0, 0);
    fijarDraft(newDate, true);
    Haptics.selectionAsync();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: dark ? 'rgba(0,0,0,0.65)' : 'rgba(15,21,24,0.35)' }]}
        onPress={onCancel}
      >
        <Pressable style={[styles.sheet, { backgroundColor: dark ? t.hundido : t.flotante }]} onPress={() => {}}>
          <Text style={[styles.title, { color: dark ? ATP_BRAND.lime : t.tealTexto }]}>{title}</Text>

          {/* Presets */}
          {presets.length > 0 && (
            <View style={styles.presetsRow}>
              {presets.map((p) => (
                <Pressable
                  key={p.label}
                  style={[styles.presetBtn, !dark && { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime }]}
                  onPress={() => applyPreset(p.getDate)}
                >
                  <Text style={[styles.presetText, !dark && { color: t.textoSobreLima }]}>{p.label}</Text>
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
            <Text style={[styles.separator, { color: t.texto }]}>:</Text>
            <Wheel
              ref={minuteRef}
              data={minuteOptions.map(o => o.label)}
              initialIndex={minuteIdx}
              onIndexChange={handleMinuteChange}
              flexWeight={1}
            />
            {/* Indicador central — hijo del wheelsRow para que su top sea relativo a éste */}
            <View pointerEvents="none" style={styles.centerIndicator} />
          </View>

          {/* Botones */}
          <View style={styles.btnRow}>
            <Pressable style={[styles.btn, { backgroundColor: dark ? t.flotante : t.hundido }]} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: t.textoSecundario }]}>Cancelar</Text>
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
  const itemColor = useSurfaceTokens().texto;
  const internalRef = useRef<FlatList>(null);
  // Expone la ref interna a los padres (que hacen scroll programático).
  React.useImperativeHandle(ref, () => internalRef.current as FlatList, []);

  // Scroll programático al mount + cuando cambia initialIndex. initialScrollIndex
  // de FlatList es notoriamente flakey con getItemLayout + padding → usamos esto.
  useEffect(() => {
    if (initialIndex < 0) return;
    const t = setTimeout(() => {
      try {
        internalRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      } catch { /* data no lista — onScrollToIndexFailed maneja el reintento */ }
    }, 50);
    return () => clearTimeout(t);
  }, [initialIndex]);

  return (
    <View style={[wheelStyles.container, { flex: flexWeight }]}>
      <FlatList
        ref={internalRef}
        data={data}
        keyExtractor={(item, idx) => `${item}-${idx}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, idx) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * idx, index: idx })}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll por offset calculado (flag #1 del buzón).
          internalRef.current?.scrollToOffset({ offset: info.index * ITEM_HEIGHT, animated: false });
        }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          onIndexChange(idx);
        }}
        onScrollEndDrag={(e) => {
          // Fallback (bug 3): si el drag termina sin momentum, onMomentumScrollEnd
          // no dispara. Commiteamos el item donde cayó el scroll.
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          onIndexChange(idx);
        }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              // tap-to-select: centra el item tappeado y lo commitea (bug 3).
              try { internalRef.current?.scrollToIndex({ index, animated: true }); } catch { /* noop */ }
              onIndexChange(index);
              Haptics.selectionAsync();
            }}
            style={wheelStyles.item}
          >
            <Text style={[wheelStyles.itemText, { color: itemColor }]}>{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
});
Wheel.displayName = 'Wheel';

// MB-31B: solo layout + acentos de marca; superficies/texto entran inline.
const styles = StyleSheet.create({
  // El velo entra inline: en claro el negro al 65% apaga la pantalla entera.
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 16 },
  title: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1a2a0a', borderRadius: 20, borderWidth: 1, borderColor: '#a8e02a55' },
  presetText: { color: ATP_BRAND.lime, fontSize: 13, fontWeight: '600' },
  wheelsRow: { flexDirection: 'row', height: WHEEL_HEIGHT, alignItems: 'center', position: 'relative' },
  separator: { fontSize: 22, fontWeight: '700', paddingHorizontal: 4 },
  centerIndicator: {
    // Hijo de wheelsRow (position:relative). El item central ocupa la franja
    // [(WHEEL_HEIGHT - ITEM_HEIGHT)/2, (WHEEL_HEIGHT + ITEM_HEIGHT)/2].
    position: 'absolute', left: 0, right: 0,
    top: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
    height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: ATP_BRAND.lime,
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmBtn: { backgroundColor: ATP_BRAND.lime },
  cancelText: { fontSize: 15, fontWeight: '600' },
  confirmText: { color: TEXT_COLORS.onAccent, fontSize: 15, fontWeight: '700' },
});

const wheelStyles = StyleSheet.create({
  container: { height: WHEEL_HEIGHT },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 18, fontWeight: '500' },
});
