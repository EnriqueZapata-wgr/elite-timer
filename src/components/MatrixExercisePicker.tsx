/**
 * MatrixExercisePicker (MB-5 Bloque 2.1) — selector de ejercicios del catálogo
 * matriceado (exercise_matrix, 214 ejercicios) para el constructor.
 *
 * Mismo buscador y ejes de filtro que la biblioteca (Músculo · Equipo ·
 * Patrón · Nivel, chips con wrap — MB-3.5 #9), cards editoriales con poster y
 * badge de clip. Devuelve el MatrixExercise completo: el constructor persiste
 * matrix_slug, la traza por la que la rutina hereda clip en ejecución,
 * métodos ATP y benchmark de edad.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TextInput, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { haptic } from '@/src/utils/haptics';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import {
  GRUPOS_MUSCULARES, PATRONES, EQUIPO_TOKENS, NIVELES_EJERCICIO,
  musculosPrincipalesDe, posterDe, clipDe, type MatrixExercise,
} from '@/src/constants/exercise-matrix';
import { ATP_BRAND, TEXT, TEXT_COLORS, BG, ELEVATION, withOpacity, brandGradient } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';

const GRUPOS = ['Todos', ...Object.keys(GRUPOS_MUSCULARES)];
const EQUIPO_FILTRO = ['Todos', ...EQUIPO_TOKENS];
const PATRONES_FILTRO = ['Todos', ...PATRONES];
const NIVELES_FILTRO = ['Todos', ...NIVELES_EJERCICIO];

type EjeKey = 'musculo' | 'equipo' | 'patron' | 'nivel';

function normaliza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: MatrixExercise) => void;
}

export function MatrixExercisePicker({ visible, onClose, onSelect }: Props) {
  const [catalogo, setCatalogo] = useState<MatrixExercise[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState('Todos');
  const [equipo, setEquipo] = useState('Todos');
  const [patron, setPatron] = useState('Todos');
  const [nivel, setNivel] = useState('Todos');
  const [ejeAbierto, setEjeAbierto] = useState<EjeKey | null>(null);

  useEffect(() => {
    if (visible && catalogo === null) {
      getExerciseMatrix().then(setCatalogo).catch(() => setCatalogo([]));
    }
  }, [visible, catalogo]);

  function handleClose() {
    setBusqueda('');
    setEjeAbierto(null);
    onClose();
  }

  function handleSelect(ex: MatrixExercise) {
    haptic.medium();
    onSelect(ex);
    handleClose();
  }

  // Mismo criterio de filtrado que la biblioteca (exercise-library.tsx).
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
  // Molécula lime→teal (sin pilar): fill brillante legible con texto onAccent.
  const gradSel = brandGradient();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>EJERCICIOS DE LA BIBLIOTECA</Text>
            <AnimatedPressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={TEXT.secondary} />
            </AnimatedPressable>
          </View>

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

          {/* Ejes de filtro (mismos que la biblioteca) */}
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

          {ejeActivo && (
            <View style={s.opcionesWrap}>
              {ejeActivo.opciones.map((op) => {
                const activa = ejeActivo.valor === op;
                return (
                  <AnimatedPressable
                    key={op}
                    onPress={() => { haptic.light(); ejeActivo.set(op); setEjeAbierto(null); }}
                    style={[s.opcionChip, activa && { borderColor: 'transparent', overflow: 'hidden' }]}
                  >
                    {activa && (
                      <LinearGradient colors={gradSel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    )}
                    <Text style={[s.opcionText, activa && s.opcionTextActiva]}>{op}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          )}

          {/* Grid de resultados */}
          {catalogo === null ? (
            <View style={s.center}><Text style={s.metaText}>Cargando catálogo…</Text></View>
          ) : filtrados.length === 0 ? (
            <EmptyState icon="barbell-outline" title="Nada con esos filtros" subtitle="Suelta un filtro o busca con otra palabra." />
          ) : (
            <FlatList
              data={filtrados}
              keyExtractor={(e) => e.slug}
              numColumns={2}
              keyboardShouldPersistTaps="handled"
              columnWrapperStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md }}
              contentContainerStyle={{ gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: Spacing.xl }}
              ListHeaderComponent={<Text style={s.countText}>{filtrados.length} ejercicios</Text>}
              renderItem={({ item }) => (
                <AnimatedPressable style={s.card} onPress={() => handleSelect(item)}>
                  {posterDe(item) ? (
                    <Image source={{ uri: posterDe(item)! }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                  ) : null}
                  <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.88)']} style={StyleSheet.absoluteFill} />
                  {clipDe(item) && (
                    <View style={s.clipBadge}>
                      <Ionicons name="play" size={9} color={TEXT_COLORS.onAccent} />
                      <Text style={s.clipText}>CLIP</Text>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: BG.screen, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    height: '88%', paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: ELEVATION[1].border,
    marginBottom: Spacing.sm,
  },
  title: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 14 },
  countText: {
    color: TEXT.tertiary, fontFamily: Fonts.semiBold, fontSize: 11, letterSpacing: 1,
    paddingHorizontal: Spacing.md, marginBottom: 2,
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card,
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
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.xs,
  },
  opcionChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
  },
  opcionText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 12 },
  opcionTextActiva: { color: TEXT_COLORS.onAccent },

  card: {
    flex: 1, height: 140, borderRadius: Radius.card, overflow: 'hidden',
    backgroundColor: ELEVATION[1].bg, justifyContent: 'flex-end',
  },
  cardBody: { padding: Spacing.sm },
  cardName: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 17 },
  cardMeta: { color: 'rgba(255,255,255,0.65)', fontFamily: Fonts.regular, fontSize: 10, marginTop: 2 },
  clipBadge: {
    position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: ATP_BRAND.lime,
  },
  clipText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: 8, letterSpacing: 0.5 },
});
