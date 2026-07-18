/**
 * ARGOS — Historial de conversaciones (F2.2 #93).
 * Lista argos_conversations (título + preview + fecha), tap → carga esa
 * conversación en el chat; "Nueva conversación" arranca en blanco (new=1
 * evita el auto-load de la más reciente); eliminar con confirmación.
 */
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { loadConversations, deleteConversation } from '@/src/services/argos-service';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

interface ConvRow {
  id: string;
  title: string;
  messages: { role: string; content: string }[];
  updated_at: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Hoy · ${time}`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ` · ${time}`;
}

export default function ArgosConversationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const rows = await loadConversations(user.id, 50);
    setConvs(rows as ConvRow[]);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openConv = (id: string) => {
    haptic.light();
    router.replace({ pathname: '/argos-chat', params: { conversationId: id } });
  };

  const confirmDelete = (conv: ConvRow) => {
    haptic.warning();
    Alert.alert(
      'Eliminar conversación',
      `"${conv.title}" se eliminará para siempre.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteConversation(conv.id);
            if (ok) { haptic.success(); reload(); }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: ELEVATION[0].bg }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Conversaciones</Text>
          <Text style={s.subtitle}>Tu historial con ARGOS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}>
        <AnimatedPressable
          style={s.newBtn}
          onPress={() => {
            haptic.medium();
            router.replace({ pathname: '/argos-chat', params: { new: '1' } });
          }}
        >
          <Ionicons name="add" size={18} color="#000" />
          <Text style={s.newBtnText}>NUEVA CONVERSACIÓN</Text>
        </AnimatedPressable>

        {loading && convs.length === 0 && (
          <Text style={s.empty}>Cargando…</Text>
        )}
        {!loading && convs.length === 0 && (
          <Text style={s.empty}>
            Aún no hay conversaciones. Pregúntale algo a ARGOS y aparecerá aquí.
          </Text>
        )}

        {convs.map((conv, i) => {
          const last = conv.messages?.[conv.messages.length - 1];
          return (
            <Animated.View key={conv.id} entering={FadeInUp.delay(Math.min(i * 30, 300)).springify()}>
              <Pressable onPress={() => openConv(conv.id)} style={s.row}>
                <View style={s.rowIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={ATP_BRAND.lime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle} numberOfLines={1}>{conv.title}</Text>
                  {last && (
                    <Text style={s.rowPreview} numberOfLines={1}>
                      {last.role === 'user' ? 'Tú: ' : 'ARGOS: '}{last.content}
                    </Text>
                  )}
                  <Text style={s.rowDate}>{fmtDate(conv.updated_at)}</Text>
                </View>
                <Pressable onPress={() => confirmDelete(conv)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={16} color={TEXT.tertiary} />
                </Pressable>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a',
  },
  title: { color: TEXT.primary, fontSize: FontSizes.xl, fontFamily: Fonts.bold },
  subtitle: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 13, marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  newBtnText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1 },
  empty: {
    color: TEXT.muted, fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: Spacing.xl, lineHeight: 20,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { color: TEXT.primary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  rowPreview: { color: TEXT.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  rowDate: { color: TEXT.muted, fontSize: 10, fontFamily: Fonts.regular, marginTop: 3 },
});
