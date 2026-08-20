/**
 * ChatEmptyState — el arranque en blanco del chat (MB-21 Pieza 4.4).
 * Las sugerencias ya no son seis chips fijos: proponen algo de HOY
 * (argos-suggestions-core decide; la pantalla carga las señales).
 */
import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { CAPABILITY_SUGGESTIONS, type ChatSuggestion } from '@/src/services/argos-suggestions-core';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import {
  ORB_TOUR_DONE_KEY,
  ORB_TOUR_RESTART_EVENT,
} from '@/src/components/tour/orb-tour-core';

interface Props {
  suggestions: ChatSuggestion[];
  onPick: (label: string) => void;
}

export function ChatEmptyState({ suggestions, onPick }: Props) {
  // MB-31B remate: componente compartido — lee el scope, no el tema global
  // (regla de tránsito: fuera de <ThemeReady> sigue oscuro).
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const pathname = usePathname();

  // L-17: un chip con action dispara algo real en vez de hablarle al modelo.
  // 'tour' limpia la marca, avisa a la carcasa de tabs y aterriza en HOY.
  // Desde el TAB /argos las tabs ya están montadas: cambiar de tab con
  // '/(tabs)' no las desmonta y el tour sale de inmediato. Desde /argos-chat
  // (empujado sobre tabs) replace('/') es el mismo camino que Ajustes ›
  // Experiencia › Volver a ver el tour.
  const ejecutar = async (sg: ChatSuggestion) => {
    if (sg.action === 'tour') {
      await AsyncStorage.removeItem(ORB_TOUR_DONE_KEY).catch(() => {});
      DeviceEventEmitter.emit(ORB_TOUR_RESTART_EVENT);
      router.replace(pathname === '/argos' ? '/(tabs)' : '/');
      return;
    }
    onPick(sg.label);
  };
  return (
    <View style={s.wrap}>
      <ArgosOrb state="idle" size={80} style={{ marginBottom: 16 }} />
      <Text style={s.title}>Hola, soy ARGOS</Text>
      <Text style={s.subtitle}>
        Tu sistema de inteligencia en salud funcional. Conozco tu historial, tus datos y tus objetivos. Pregúntame lo que quieras.
      </Text>

      {/* MENU-1: las capacidades primero, con su propio trato visual. Son
          las funciones de la orbe, no temas: el usuario descubre aquí que
          ARGOS explica pantallas y dice qué sabe hacer. */}
      <View style={s.chips}>
        {CAPABILITY_SUGGESTIONS.map((sg) => (
          <Pressable key={sg.label} onPress={() => ejecutar(sg)} style={[s.chip, s.chipCapacidad]}>
            <Ionicons name={sg.icon as any} size={14} color={ATP_BRAND.lime} />
            <Text style={s.chipText}>{sg.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.chips}>
        {suggestions.map((sg) => (
          <Pressable key={sg.label} onPress={() => onPick(sg.label)} style={s.chip}>
            <Ionicons name={sg.icon as any} size={14} color={ATP_BRAND.lime} />
            <Text style={s.chipText}>{sg.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40 },
  title: {
    color: t.texto, fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, marginBottom: 4,
  },
  subtitle: {
    color: t.textoSecundario, fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    textAlign: 'center', marginBottom: 24, paddingHorizontal: 20, lineHeight: 19,
  },
  chips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: t.hundido, borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: t.borde,
  },
  // MENU-1: la capacidad se distingue del tema por el borde, no por otro
  // color de fondo: un acento sutil, dentro de la regla del lima como
  // micro-acento.
  chipCapacidad: {
    borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    marginBottom: 2,
  },
  chipText: {
    color: withOpacity(t.texto, 0.8), fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    flexShrink: 1,
  },
});
