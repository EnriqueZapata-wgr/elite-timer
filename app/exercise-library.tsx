/**
 * Biblioteca de ejercicios — Explorar, buscar y navegar a log.
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: 'grid-outline' as const },
  { id: 'benchmark', label: 'Benchmarks', icon: 'star-outline' as const },
  { id: 'variant', label: 'Variantes', icon: 'git-branch-outline' as const },
];

export default function ExerciseLibrary() {
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadExercises(); }, []);

  async function loadExercises() {
    setLoading(true);
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('name_es');
    setExercises(data || []);
    setLoading(false);
  }

  const filtered = exercises.filter(ex => {
    const matchSearch = !search ||
      (ex.name_es || ex.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'all' ||
      (selectedCategory === 'benchmark' && ex.is_benchmark) ||
      (selectedCategory === 'variant' && !ex.is_benchmark);
    return matchSearch && matchCat;
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View>
            <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>EXPLORAR</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Biblioteca de ejercicios</Text>
          </View>
        </View>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: '#0a0a0a', borderRadius: 14, paddingHorizontal: 14,
          marginTop: 16, borderWidth: 1, borderColor: '#1a1a1a',
        }}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar ejercicio..."
            placeholderTextColor="#444"
            style={{ flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </Pressable>
          )}
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => { setSelectedCategory(cat.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
                backgroundColor: selectedCategory === cat.id ? 'rgba(168,224,42,0.15)' : '#0a0a0a',
                borderWidth: 1,
                borderColor: selectedCategory === cat.id ? '#a8e02a' : '#1a1a1a',
              }}
            >
              <Ionicons name={cat.icon} size={14} color={selectedCategory === cat.id ? '#a8e02a' : '#666'} />
              <Text style={{
                color: selectedCategory === cat.id ? '#a8e02a' : '#999',
                fontSize: 12, fontWeight: '600',
              }}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Exercise list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        ListHeaderComponent={() => (
          <Text style={{ color: '#666', fontSize: 11, marginBottom: 8 }}>
            {filtered.length} ejercicios
          </Text>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="search-outline" size={48} color="#333" />
            <Text style={{ color: '#666', fontSize: 14, marginTop: 12 }}>
              {loading ? 'Cargando...' : 'No se encontraron ejercicios'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/log-exercise', params: { exerciseId: item.id } } as any);
            }}
            style={{
              backgroundColor: '#0a0a0a', borderRadius: 14, padding: 14, marginBottom: 6,
              borderWidth: 1, borderColor: '#1a1a1a',
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: item.is_benchmark ? 'rgba(251,191,36,0.1)' : 'rgba(168,224,42,0.06)',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons
                name={item.is_benchmark ? 'star' : 'barbell-outline'}
                size={18}
                color={item.is_benchmark ? '#fbbf24' : '#a8e02a'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                {item.name_es || item.name}
              </Text>
              {item.muscle_groups && Array.isArray(item.muscle_groups) && item.muscle_groups.length > 0 && (
                <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                  {item.muscle_groups.join(' · ')}
                </Text>
              )}
            </View>
            {item.is_benchmark && (
              <View style={{ backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: '#fbbf24', fontSize: 8, fontWeight: '800' }}>BENCHMARK</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color="#333" />
          </Pressable>
        )}
      />
    </View>
  );
}
