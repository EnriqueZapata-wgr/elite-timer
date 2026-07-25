/**
 * Exercise Library — biblioteca MATRICEADA (MB-3 Track F · MB-3.5 #9).
 *
 * 214 ejercicios del catálogo exercise_matrix con buscador arriba + filtros por
 * los ejes que el usuario piensa (músculo · equipo · patrón · nivel) en chips
 * con wrap (sin scroll escondido) y card editorial con poster. Tap → detalle.
 * Reemplaza la biblioteca de juguete (~26 filas de `exercises`); el registro
 * sigue viviendo en exercises/exercise_logs vía el runner de sesión.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { MetodosAtpInfo } from '@/src/components/training/MetodosAtpInfo';
import { haptic } from '@/src/utils/haptics';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import {
  GRUPOS_MUSCULARES, PATRONES, EQUIPO_TOKENS, NIVELES_EJERCICIO,
  musculosPrincipalesDe, posterDe, type MatrixExercise,
} from '@/src/constants/exercise-matrix';
import { ATP_BRAND, TEXT, TEXT_COLORS, ELEVATION, withOpacity } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';

// MB-3.5 #9: filtros por los ejes que el usuario realmente piensa.
const GRUPOS = ['Todos', ...Object.keys(GRUPOS_MUSCULARES)];
const EQUIPO_FILTRO = ['Todos', ...EQUIPO_TOKENS];
const PATRONES_FILTRO = ['Todos', ...PATRONES];
const NIVELES_FILTRO = ['Todos', ...NIVELES_EJERCICIO];

type EjeKey = 'musculo' | 'equipo' | 'patron' | 'nivel';

function normaliza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  // MB-3.6 §1.1: los métodos ATP viven aquí (antes /training-methods suelto) —
  // la teoría junto a los ejercicios, no como destino hermano.
  const [tab, setTab] = useState<'ejercicios' | 'metodos'>(params.tab === 'metodos' ? 'metodos' : 'ejercicios');
  const [catalogo, setCatalogo] = useState<MatrixExercise[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState('Todos');
  const [equipo, setEquipo] = useState('Todos');
  const [patron, setPatron] = useState('Todos');
  const [nivel, setNivel] = useState('Todos');
  // Un eje abierto a la vez: sus opciones se muestran en fila con wrap
  // (nada de scroll horizontal escondido).
  const [ejeAbierto, setEjeAbierto] = useState<EjeKey | null>(null);

  useEffect(() => {
    getExerciseMatrix().then(setCatalogo);
  }, []);

  const filtrados = useMemo(() => {
    if (!catalogo) return [];
    const q = normaliza(busqueda.trim());
    return catalogo.filter((e) => {
      if (grupo !== 'Todos') {
        const miembros = GRUPOS_MUSCULARES[grupo] ?? [];
        const principales = musculosPrincipalesDe(e.musculoPrincipal);
        const enGrupo = principales.some((p) => miembros.includes(p))
          || e.secundarios.some((sec) => miembros.some((m) => sec.startsWith(m)));
        if (!enGrupo) return false;
      }
      if (equipo !== 'Todos') {
        const tokens = e.equipoRequisitos.flat();
        const conEquipo = equipo === 'Peso corporal'
          ? tokens.length === 0 || tokens.every((t) => t === 'Peso corporal')
          : tokens.includes(equipo as (typeof tokens)[number]);
        if (!conEquipo) return false;
      }
      if (patron !== 'Todos' && e.patron !== patron) return false;
      if (nivel !== 'Todos' && e.nivel !== nivel) return false;
      if (q.length >= 2) {
        const hay = normaliza(`${e.nombre} ${e.musculoPrincipal} ${e.familia} ${e.equipo}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalogo, busqueda, grupo, equipo, patron, nivel]);

  const EJES: { key: EjeKey; label: string; valor: string; opciones: string[]; set: (v: string) => void }[] = [
    { key: 'musculo', label: 'Músculo', valor: grupo, opciones: GRUPOS, set: setGrupo },
    { key: 'equipo', label: 'Equipo', valor: equipo, opciones: EQUIPO_FILTRO, set: setEquipo },
    { key: 'patron', label: 'Patrón', valor: patron, opciones: PATRONES_FILTRO, set: setPatron },
    { key: 'nivel', label: 'Nivel', valor: nivel, opciones: NIVELES_FILTRO, set: setNivel },
  ];
  const ejeActivo = EJES.find((e) => e.key === ejeAbierto) ?? null;

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Biblioteca" />

      {/* Tabs: ejercicios | métodos ATP */}
      <View style={s.tabsRow}>
        {([
          { key: 'ejercicios' as const, label: 'EJERCICIOS' },
          { key: 'metodos' as const, label: 'MÉTODOS ATP' },
        ]).map((t) => (
          <AnimatedPressable
            key={t.key}
            onPress={() => { haptic.light(); setTab(t.key); }}
            style={[s.tabChip, tab === t.key && s.tabChipActivo]}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActivo]}>{t.label}</Text>
          </AnimatedPressable>
        ))}
      </View>

      {tab === 'metodos' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <MetodosAtpInfo />
        </ScrollView>
      ) : (
      <>
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

      {/* Fila de ejes: cada chip abre sus opciones (con wrap) debajo */}
      <View style={s.ejesRow}>
        {EJES.map((eje) => {
          const activo = eje.valor !== 'Todos';
          const abierto = ejeAbierto === eje.key;
          return (
            <AnimatedPressable
              key={eje.key}
              onPress={() => { haptic.light(); setEjeAbierto(abierto ? null : eje.key); }}
              style={[s.ejeChip, (activo || abierto) && s.ejeChipActivo]}
            >
              <Text style={[s.ejeChipText, (activo || abierto) && s.ejeChipTextActivo]}>
                {activo ? `${eje.label} · ${eje.valor}` : eje.label}
              </Text>
              <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={12} color={activo || abierto ? ATP_BRAND.lime : TEXT.tertiary} />
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Opciones del eje abierto — chips con wrap, sin scroll escondido */}
      {ejeActivo && (
        <View style={s.opcionesWrap}>
          {ejeActivo.opciones.map((op) => (
            <AnimatedPressable
              key={op}
              onPress={() => { haptic.light(); ejeActivo.set(op); setEjeAbierto(null); }}
              style={[s.opcionChip, ejeActivo.valor === op && s.opcionChipActiva]}
            >
              <Text style={[s.opcionText, ejeActivo.valor === op && s.opcionTextActiva]}>{op}</Text>
            </AnimatedPressable>
          ))}
        </View>
      )}

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
              {posterDe(item) ? (
                <Image source={{ uri: posterDe(item)! }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              ) : null}
              <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.88)']} style={StyleSheet.absoluteFill} />
              {item.benchmark.tier && (
                <View style={[s.tierBadge, item.benchmark.tier === 'A' ? s.tierA : s.tierB]}>
                  <Ionicons name="pulse" size={10} color={item.benchmark.tier === 'A' ? TEXT_COLORS.onAccent : TEXT.primary} />
                  <Text style={[s.tierText, item.benchmark.tier === 'A' && { color: TEXT_COLORS.onAccent }]}>EDAD ATP</Text>
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
      </>
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

  tabsRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  tabChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  tabChipActivo: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  tabText: { color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1.5 },
  tabTextActivo: { color: TEXT_COLORS.onAccent },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: '#0a0a0a', borderRadius: Radius.card,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  searchInput: { flex: 1, color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 14, padding: 0 },

  ejesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.xs,
  },
  ejeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  ejeChipActivo: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: withOpacity(ATP_BRAND.lime, 0.5) },
  ejeChipText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 12 },
  ejeChipTextActivo: { color: ATP_BRAND.lime },

  opcionesWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  opcionChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
  },
  opcionChipActiva: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  opcionText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 12 },
  opcionTextActiva: { color: TEXT_COLORS.onAccent },

  card: {
    flex: 1, height: 150, borderRadius: Radius.card, overflow: 'hidden',
    backgroundColor: ELEVATION[1].bg, justifyContent: 'flex-end',
  },
  cardBody: { padding: Spacing.sm },
  cardName: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 17 },
  cardMeta: { color: 'rgba(255,255,255,0.65)', fontFamily: Fonts.regular, fontSize: 10, marginTop: 2 },
  tierBadge: {
    position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: Radius.pill,
  },
  tierA: { backgroundColor: ATP_BRAND.lime },
  tierB: { backgroundColor: withOpacity(ATP_BRAND.teal, 0.85) },
  tierText: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 8, letterSpacing: 0.5 },
});
