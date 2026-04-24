/**
 * Feedback Dashboard — Vista admin para gestionar reportes de testers.
 * Solo accesible por admin (90a55e74-...).
 * Filtros por status, cambio de prioridad y estado inline.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';

const ADMIN_UID = '90a55e74-0e3d-477a-9ac5-2b339f7c40af';

const STATUS_OPTIONS = [
  { id: 'new', label: 'Nuevo', color: '#60a5fa' },
  { id: 'reviewing', label: 'Revisando', color: '#fbbf24' },
  { id: 'in_progress', label: 'En progreso', color: '#fb923c' },
  { id: 'fixed', label: 'Arreglado', color: '#22c55e' },
  { id: 'wont_fix', label: 'No se hará', color: '#666' },
  { id: 'duplicate', label: 'Duplicado', color: '#999' },
];

const SEVERITY_COLORS: Record<string, string> = {
  red: '#ef4444',
  yellow: '#fbbf24',
  green: '#22c55e',
};

const SEVERITY_EMOJIS: Record<string, string> = {
  red: '🔴',
  yellow: '🟡',
  green: '🟢',
};

export default function FeedbackDashboard() {
  const insets = useSafeAreaInsets();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('new');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(user?.id === ADMIN_UID);
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    if (isAdmin) loadFeedback();
  }, [isAdmin, filter]));

  async function loadFeedback() {
    let query = supabase
      .from('beta_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setFeedback(data || []);
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from('beta_feedback')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    loadFeedback();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function updatePriority(id: string, priority: number) {
    await supabase.from('beta_feedback')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', id);
    loadFeedback();
  }

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666', fontSize: 16 }}>Acceso restringido</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View>
            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ADMIN</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Feedback Beta</Text>
          </View>
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          {[{ id: 'all', label: 'Todos' }, ...STATUS_OPTIONS].map(s => (
            <Pressable
              key={s.id}
              onPress={() => setFilter(s.id)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
                backgroundColor: filter === s.id ? 'rgba(168,224,42,0.15)' : '#0a0a0a',
                borderWidth: 1,
                borderColor: filter === s.id ? '#a8e02a' : '#1a1a1a',
              }}
            >
              <Text style={{ color: filter === s.id ? '#a8e02a' : '#999', fontSize: 12, fontWeight: '600' }}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Lista de feedback */}
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ color: '#666', fontSize: 11, marginBottom: 12 }}>{feedback.length} reportes</Text>

        {feedback.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#22c55e" />
            <Text style={{ color: '#666', fontSize: 14, marginTop: 12 }}>Sin reportes en este filtro</Text>
          </View>
        )}

        {feedback.map(item => (
          <View key={item.id} style={{
            backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: 10,
            borderLeftWidth: 3, borderLeftColor: SEVERITY_COLORS[item.severity] || '#666',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>{SEVERITY_EMOJIS[item.severity]}</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                    {item.user_name || item.user_email?.split('@')[0] || 'Anónimo'}
                  </Text>
                  <Text style={{ color: '#444', fontSize: 11 }}>·</Text>
                  <Text style={{ color: '#666', fontSize: 11 }}>
                    {item.screen_name || '?'}
                  </Text>
                </View>
                <Text style={{ color: '#444', fontSize: 10, marginTop: 2 }}>
                  {new Date(item.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{item.category}
                  {item.device_info ? ` · ${item.device_info}` : ''}
                </Text>
              </View>

              {/* Priority toggle */}
              <Pressable onPress={() => {
                const next = ((item.priority || 0) + 1) % 4;
                updatePriority(item.id, next);
              }}>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                  backgroundColor: item.priority === 3 ? 'rgba(239,68,68,0.15)' : item.priority === 2 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                }}>
                  <Text style={{
                    color: item.priority === 3 ? '#ef4444' : item.priority === 2 ? '#fbbf24' : item.priority === 1 ? '#999' : '#444',
                    fontSize: 10, fontWeight: '700',
                  }}>
                    {item.priority === 3 ? 'P1' : item.priority === 2 ? 'P2' : item.priority === 1 ? 'P3' : '—'}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Contenido */}
            <Text style={{ color: '#ccc', fontSize: 14, lineHeight: 21, marginBottom: 6 }}>
              {item.description}
            </Text>

            {item.expected && (
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>
                Esperaba: {item.expected}
              </Text>
            )}

            {item.screenshot_url && (
              <Text style={{ color: '#60a5fa', fontSize: 11, marginBottom: 6 }}>
                Screenshot adjunto
              </Text>
            )}

            {/* Status buttons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {STATUS_OPTIONS.map(s => (
                <Pressable
                  key={s.id}
                  onPress={() => updateStatus(item.id, s.id)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginRight: 6,
                    backgroundColor: item.status === s.id ? `${s.color}20` : '#111',
                    borderWidth: 1,
                    borderColor: item.status === s.id ? s.color : '#1a1a1a',
                  }}
                >
                  <Text style={{
                    color: item.status === s.id ? s.color : '#666',
                    fontSize: 10, fontWeight: '600',
                  }}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
