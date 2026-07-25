/**
 * Exercise Library — biblioteca MATRICEADA (MB-3 Track F).
 *
 * 212 ejercicios del catálogo exercise_matrix con buscador + filtros por los
 * ejes (músculo, patrón, nivel) y card editorial con poster. Tap → detalle.
 * Reemplaza la biblioteca de juguete (~26 filas de `exercises`); el registro
 * sigue viviendo en exercises/exercise_logs vía el runner de sesión.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { haptic } from '@/src/utils/haptics';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import { GRUPOS_MUSCULARES, PATRONES, type MatrixExercise } from '@/src/constants/exercise-matrix';
import { ATP_BRAND, TEXT, ELEVATION, withOpacity } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';

const GRUPOS = ['Todos', ...Object.keys(GRUPOS_MUSCULARES)];
const PATRONES_FILTRO = ['Todos', ...PATRONES];
const NIVELES_FILTRO = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

function normaliza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState<MatrixExercise[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState('Todos');
  const [patron, setPatron] = useState('Todos');
  const [nivel, setNivel] = useState('Todos');

  useEffect(() => {
    getExerciseMatrix().then(setCatalogo);
  }, []);

  const filtrados = useMemo(() => {
    if (!catalogo) return [];
    const q = normaliza(busqueda.trim());
    return catalogo.filter((e) => {
      if (grupo !== 'Todos') {
        const miembros = GRUPOS_MUSCULARES[grupo] ?? [];
        const enGrupo = miembros.includes(e.musculoPrincipal)
          || e.secundarios.some((sec) => miembros.some((m) => sec.startsWith(m)));
        if (!enGrupo) return false;
      }
      if (patron !== 'Todos' && e.patron !== patron) return false;
      if (nivel !== 'Todos' && e.nivel !== nivel) return false;
      if (q.length >= 2) {
        const hay = normaliza(`${e.nombre} ${e.musculoPrincipal} ${e.familia} ${e.equipo}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalogo, busqueda, grupo, patron, nivel]);

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Biblioteca" />

      {/* Buscador */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={TEXT.tertiary} />
        <TextInput
          style={s.searchInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar ejercicio, músculo, equipo…"
          placeholderTextColor={TEXT.tertiary}
          returnKeyType="search"
        />
        {busqueda.length > 0 && (
          <AnimatedPressable onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={16} color={TEXT.tertiary} />
          </AnimatedPressable>
        )}
      </View>

      {/* Filtros por ejes de la matriz */}
      <FilterPills options={GRUPOS} selected={grupo} onSelect={setGrupo} style={s.pillsRow} />
      <FilterPills options={PATRONES_FILTRO} selected={patron} onSelect={setPatron} style={s.pillsRow} />
      <FilterPills options={NIVELES_FILTRO} selected={nivel} onSelect={setNivel} style={s.pillsRow} />

      {/* Grid de cards con poster */}
      {catalogo === null ? (
        <View style={s.center}><Text style={s.metaText}>Cargando catálogo…</Text></View>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title="Nada con esos filtros"
          subtitle="Suelta un filtro o busca con otra palabra."
        />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(e) => e.slug}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md }}
          contentContainerStyle={{ gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: 120 }}
          ListHeaderComponent={<Text style={s.countText}>{filtrados.length} ejercicios</Text>}
          renderItem={({ item }) => (
            <AnimatedPressable
              style={s.card}
              onPress={() => {
                haptic.light();
                router.push({ pathname: '/exercise-detail', params: { slug: item.slug } });
              }}
            >
              {item.mediaUrl ? (
                <Image source={{ uri: item.mediaUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              ) : null}
              <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.88)']} style={StyleSheet.absoluteFill} />
              {item.benchmark.tier && (
                <View style={[s.tierBadge, item.benchmark.tier === 'A' ? s.tierA : s.tierB]}>
                  <Ionicons name="pulse" size={10} color={item.benchmark.tier === 'A' ? '#000' : '#fff'} />
                  <Text style={[s.tierText, item.benchmark.tier === 'A' && { color: '#000' }]}>EDAD ATP</Text>
                </View>
              )}
              <View style={s.cardBody}>
                <Text style={s.cardName} numberOfLines={2}>{item.nombre}</Text>
                <Text style={s.cardMeta} numberOfLines={1}>{item.musculoPrincipal} · {item.nivel}</Text>
              </View>
            </AnimatedPressable>
          )}
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 14 },
  countText: {
    color: TEXT.tertiary, fontFamily: Fonts.semiBold, fontSize: 11, letterSpacing: 1,
    paddingHorizontal: Spacing.md, marginBottom: 2,
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: '#0a0a0a', borderRadius: Radius.card,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  searchInput: { flex: 1, color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 14, padding: 0 },
  pillsRow: { marginBottom: Spacing.xs },

  card: {
    flex: 1, height: 150, borderRadius: Radius.card, overflow: 'hidden',
    backgroundColor: ELEVATION[1].bg, justifyContent: 'flex-end',
  },
  cardBody: { padding: Spacing.sm },
  cardName: { color: '#fff', fontFamily: Fonts.bold, fontSize: 13, lineHeight: 17 },
  cardMeta: { color: 'rgba(255,255,255,0.65)', fontFamily: Fonts.regular, fontSize: 10, marginTop: 2 },
  tierBadge: {
    position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: Radius.pill,
  },
  tierA: { backgroundColor: ATP_BRAND.lime },
  tierB: { backgroundColor: withOpacity(ATP_BRAND.teal, 0.85) },
  tierText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 8, letterSpacing: 0.5 },
});
