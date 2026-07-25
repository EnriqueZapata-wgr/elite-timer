/**
 * Routine Generator — 2 puertas sobre el motor determinista (MB-3 Track F).
 *
 * Doctrina guiado-no-prisionero:
 *  · AUTO (default): objetivo + enfoque + equipo + tiempo → GENERAR.
 *  · EXPLORAR (opt-in, Akinator): mismos filtros paso a paso VIENDO el pool
 *    encogerse en vivo, y "Generar" sobre ese pool.
 *
 * El esqueleto es algorítmico y gratis ($0 runtime, offline, determinista por
 * día+usuario); ARGOS es la capa premium encima — este flujo no la toca.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';
import { getLocalToday } from '@/src/utils/date-helpers';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import { ayerFueSesionPesada, getSlugsRecientes } from '@/src/services/fitness/workout-session-service';
import {
  generarRutina,
  filtrarPool,
  type GeneratorInput,
  type GeneratedRoutine,
  type Objetivo,
  type EnfoquePatron,
} from '@/src/services/fitness/routine-generator-core';
import {
  EQUIPO_TOKENS,
  GRUPOS_MUSCULARES,
  CONTRAINDICACIONES,
  NIVELES_USUARIO,
  type MatrixExercise,
  type NivelUsuario,
} from '@/src/constants/exercise-matrix';
import { ATP_BRAND, TEXT, ELEVATION, withOpacity } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';

const PREFS_KEY = 'fitness_generator_prefs_v1';

const OBJETIVOS: { key: Objetivo; label: string }[] = [
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'hipertrofia', label: 'Hipertrofia' },
  { key: 'metabolico', label: 'Metabólico' },
];

const ENFOQUES: { key: EnfoquePatron; label: string }[] = [
  { key: 'full_body', label: 'Full body' },
  { key: 'tren_superior', label: 'Tren superior' },
  { key: 'empuje', label: 'Empuje' },
  { key: 'traccion', label: 'Tracción' },
  { key: 'pierna_empuje', label: 'Pierna empuje' },
  { key: 'pierna_traccion', label: 'Pierna tracción' },
];

const NIVEL_LABELS: Record<NivelUsuario, string> = {
  principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado', atleta: 'Atleta',
};

const SLOT_LABELS: Record<string, string> = {
  multi_pesado: 'Fuerza pesada',
  multi_metabolico: 'Metabólico',
  especifico_fuerza: 'Fuerza específica',
  especifico_metabolico: 'Metabólico específico',
  multi_sarcomerico: 'Hipertrofia',
  especifico_sarcomerico: 'Hipertrofia específica',
  unilateral_fuerza: 'Unilateral · fuerza',
  unilateral_metabolico: 'Unilateral · metabólico',
  unilateral_sarcomerico: 'Unilateral · hipertrofia',
  recovery: 'Recovery / prehab',
};

// ── Chips reutilizables ──

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={() => { haptic.light(); onPress(); }}
      style={[c.chip, active && c.chipActive]}
    >
      <Text style={[c.chipText, active && c.chipTextActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

const c = StyleSheet.create({
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  chipActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.15), borderColor: ATP_BRAND.lime },
  chipText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 12 },
  chipTextActive: { color: ATP_BRAND.lime },
});

// ── Pantalla ──

export default function RoutineGeneratorScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [puerta, setPuerta] = useState<'auto' | 'explorar'>('auto');
  const [catalogo, setCatalogo] = useState<MatrixExercise[]>([]);
  const [objetivo, setObjetivo] = useState<Objetivo>('hipertrofia');
  const [enfoque, setEnfoque] = useState<EnfoquePatron>('full_body');
  const [broSplit, setBroSplit] = useState(false);
  const [musculos, setMusculos] = useState<string[]>([]);
  const [equipo, setEquipo] = useState<string[]>(['Mancuerna']);
  const [nivel, setNivel] = useState<NivelUsuario>('intermedio');
  const [senior, setSenior] = useState(false);
  const [tiempoMin, setTiempoMin] = useState(45);
  const [flags, setFlags] = useState<string[]>([]);
  const [regen, setRegen] = useState(0);
  const [contexto, setContexto] = useState<{ ayerPesado: boolean; recientes: string[] }>({ ayerPesado: false, recientes: [] });
  const [rutina, setRutina] = useState<GeneratedRoutine | null>(null);

  // Catálogo + prefs persistidas + contexto de rotación.
  useEffect(() => {
    getExerciseMatrix().then(setCatalogo);
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p.equipo)) setEquipo(p.equipo);
        if (p.nivel && (NIVELES_USUARIO as readonly string[]).includes(p.nivel)) setNivel(p.nivel);
        if (typeof p.senior === 'boolean') setSenior(p.senior);
        if (typeof p.tiempoMin === 'number') setTiempoMin(p.tiempoMin);
        if (Array.isArray(p.flags)) setFlags(p.flags);
      } catch { /* prefs corruptas → defaults */ }
    });
    if (user) {
      ayerFueSesionPesada(user.id).then((ayerPesado) => setContexto((prev) => ({ ...prev, ayerPesado })));
      getSlugsRecientes(user.id).then((recientes) => setContexto((prev) => ({ ...prev, recientes })));
    }
  }, [user]);

  // Persistir prefs (equipo/nivel/senior/tiempo/flags — lo que no cambia a diario).
  useEffect(() => {
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ equipo, nivel, senior, tiempoMin, flags })).catch(() => {});
  }, [equipo, nivel, senior, tiempoMin, flags]);

  const input = useMemo((): GeneratorInput | null => {
    if (catalogo.length === 0) return null;
    return {
      catalogo,
      objetivo,
      enfoque: broSplit && musculos.length > 0
        ? { kind: 'musculos', musculos }
        : { kind: 'patron', enfoque },
      equipo,
      nivel,
      senior,
      tiempoMin,
      contraindicaciones: flags,
      seed: `${user?.id ?? 'anon'}|${getLocalToday()}|${regen}`,
      slugsRecientes: contexto.recientes,
      ayerFuePesado: contexto.ayerPesado,
    };
  }, [catalogo, objetivo, enfoque, broSplit, musculos, equipo, nivel, senior, tiempoMin, flags, user, regen, contexto]);

  // Akinator: el pool encogiéndose EN VIVO con los filtros actuales.
  const pool = useMemo(() => (input ? filtrarPool(input) : []), [input]);

  function generar() {
    if (!input) return;
    haptic.medium();
    setRutina(generarRutina(input));
  }

  function empezar() {
    if (!rutina) return;
    haptic.success();
    router.push({
      pathname: '/strength-session',
      params: { plan: JSON.stringify(rutina), name: 'Sesión de hoy' },
    });
  }

  const toggle = (arr: string[], set: (v: string[]) => void, item: string) =>
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Generador" />
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

        {/* 2 puertas */}
        <View style={s.doorRow}>
          {(['auto', 'explorar'] as const).map((p) => (
            <AnimatedPressable key={p} onPress={() => { haptic.light(); setPuerta(p); }} style={[s.door, puerta === p && s.doorActive]}>
              <Ionicons name={p === 'auto' ? 'flash' : 'search'} size={15} color={puerta === p ? '#000' : TEXT.secondary} />
              <Text style={[s.doorText, puerta === p && s.doorTextActive]}>{p === 'auto' ? 'AUTO' : 'EXPLORAR'}</Text>
            </AnimatedPressable>
          ))}
        </View>

        {/* Contador de pool (corazón del modo Explorar, visible siempre en él) */}
        {puerta === 'explorar' && (
          <Animated.View entering={FadeInDown.duration(250)} style={s.poolCard}>
            <Text style={s.poolCount}>{pool.filter((e) => e.patron !== 'Estiramiento').length}</Text>
            <Text style={s.poolLabel}>ejercicios ejecutables con tus filtros</Text>
          </Animated.View>
        )}

        {/* Objetivo */}
        <Text style={s.sectionLabel}>OBJETIVO</Text>
        <View style={s.chipsRow}>
          {OBJETIVOS.map((o) => (
            <Chip key={o.key} label={o.label} active={objetivo === o.key} onPress={() => setObjetivo(o.key)} />
          ))}
        </View>

        {/* Enfoque (patrón default · bro-split opt-in) */}
        <Text style={s.sectionLabel}>ENFOQUE</Text>
        <View style={s.chipsRow}>
          {ENFOQUES.map((e) => (
            <Chip key={e.key} label={e.label} active={!broSplit && enfoque === e.key} onPress={() => { setBroSplit(false); setEnfoque(e.key); }} />
          ))}
          <Chip label="Por músculo" active={broSplit} onPress={() => setBroSplit(!broSplit)} />
        </View>
        {broSplit && (
          <View style={[s.chipsRow, { marginTop: Spacing.xs }]}>
            {Object.keys(GRUPOS_MUSCULARES).map((g) => (
              <Chip key={g} label={g} active={musculos.includes(g)} onPress={() => toggle(musculos, setMusculos, g)} />
            ))}
          </View>
        )}

        {/* Equipo (filtro duro) */}
        <Text style={s.sectionLabel}>EQUIPO DISPONIBLE</Text>
        <Text style={s.sectionHint}>Peso corporal siempre cuenta. Marca lo que tienes hoy.</Text>
        <View style={s.chipsRow}>
          {EQUIPO_TOKENS.filter((t) => t !== 'Peso corporal').map((t) => (
            <Chip key={t} label={t} active={equipo.includes(t)} onPress={() => toggle(equipo, setEquipo, t)} />
          ))}
        </View>

        {/* Tiempo */}
        <Text style={s.sectionLabel}>TIEMPO</Text>
        <View style={s.timeRow}>
          <AnimatedPressable onPress={() => { haptic.light(); setTiempoMin((t) => Math.max(15, t - 5)); }} style={s.timeBtn}>
            <Text style={s.timeBtnText}>−</Text>
          </AnimatedPressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.timeValue}>{tiempoMin}</Text>
            <Text style={s.timeUnit}>minutos</Text>
          </View>
          <AnimatedPressable onPress={() => { haptic.light(); setTiempoMin((t) => Math.min(150, t + 5)); }} style={s.timeBtn}>
            <Text style={s.timeBtnText}>+</Text>
          </AnimatedPressable>
        </View>

        {/* Nivel + senior */}
        <Text style={s.sectionLabel}>NIVEL</Text>
        <View style={s.chipsRow}>
          {NIVELES_USUARIO.map((n) => (
            <Chip key={n} label={NIVEL_LABELS[n]} active={nivel === n} onPress={() => setNivel(n)} />
          ))}
          <Chip label="Senior" active={senior} onPress={() => setSenior(!senior)} />
        </View>

        {/* Contraindicaciones */}
        <Text style={s.sectionLabel}>CUIDA DE</Text>
        <View style={s.chipsRow}>
          {CONTRAINDICACIONES.map((f) => (
            <Chip key={f} label={f} active={flags.includes(f)} onPress={() => toggle(flags, setFlags, f)} />
          ))}
        </View>

        {/* Pool en Explorar: lista viva (se encoge con cada filtro) */}
        {puerta === 'explorar' && pool.length > 0 && (
          <View style={{ marginTop: Spacing.md }}>
            <Text style={s.sectionLabel}>EL POOL</Text>
            {pool.filter((e) => e.patron !== 'Estiramiento').slice(0, 12).map((e) => (
              <View key={e.slug} style={s.poolRow}>
                <Text style={s.poolRowName} numberOfLines={1}>{e.nombre}</Text>
                <Text style={s.poolRowMeta}>{e.musculoPrincipal}</Text>
              </View>
            ))}
            {pool.filter((e) => e.patron !== 'Estiramiento').length > 12 && (
              <Text style={s.poolMore}>… y {pool.filter((e) => e.patron !== 'Estiramiento').length - 12} más</Text>
            )}
          </View>
        )}

        {/* Generar */}
        <View style={{ marginTop: Spacing.xl }}>
          <GradientCTA
            label={rutina ? 'GENERAR OTRA' : 'GENERAR'}
            pillar="fitness"
            icon="flash"
            disabled={!input}
            onPress={() => { setRegen((r) => (rutina ? r + 1 : r)); generar(); }}
          />
        </View>

        {/* Preview de la rutina */}
        {rutina && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: Spacing.lg }}>
            {rutina.avisos.map((a) => (
              <View key={a} style={s.avisoCard}>
                <Ionicons name="information-circle" size={16} color={ATP_BRAND.teal} />
                <Text style={s.avisoText}>{a}</Text>
              </View>
            ))}
            {rutina.bloques.length > 0 && (
              <>
                <View style={s.previewHeader}>
                  <Text style={s.sectionLabel}>TU SESIÓN · ~{Math.round(rutina.tiempoTotalSeg / 60)} MIN</Text>
                </View>
                {rutina.bloques.map((b, i) => (
                  <View key={`${b.slug}-${i}`} style={s.bloqueRow}>
                    <View style={s.bloqueNum}><Text style={s.bloqueNumText}>{i + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bloqueName} numberOfLines={1}>{b.nombre}</Text>
                      <Text style={s.bloqueMeta}>
                        {SLOT_LABELS[b.slot]} · {b.series}×{b.reps}{b.esIsometrico ? ' s' : ''}
                        {b.metodo !== 'Estándar' ? ` · ${b.metodo}` : ''}
                      </Text>
                    </View>
                    <Text style={s.bloqueTime}>{Math.round(b.tiempoSeg / 60)}′</Text>
                  </View>
                ))}
                {rutina.recoveryExtraMin > 0 && (
                  <Text style={s.extraText}>
                    +{rutina.recoveryExtraMin} min de tu tiempo van a movilidad/recovery libre (por encima de tu techo de hoy).
                  </Text>
                )}
                <View style={{ marginTop: Spacing.md }}>
                  <GradientCTA label="EMPEZAR SESIÓN" pillar="fitness" icon="play" onPress={empezar} />
                </View>
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  doorRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  door: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  doorActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  doorText: { color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1 },
  doorTextActive: { color: '#000' },

  poolCard: {
    alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 1, borderRadius: Radius.card,
  },
  poolCount: { color: ATP_BRAND.lime, fontFamily: Fonts.extraBold, fontSize: 40, fontVariant: ['tabular-nums'] },
  poolLabel: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12 },
  poolRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ELEVATION[1].border, gap: Spacing.sm,
  },
  poolRowName: { color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 13, flex: 1 },
  poolRowMeta: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 11 },
  poolMore: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12, marginTop: 6 },

  sectionLabel: {
    color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  sectionHint: { color: TEXT.tertiary, fontFamily: Fonts.regular, fontSize: 12, marginTop: -6, marginBottom: Spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  timeBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  timeBtnText: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 22 },
  timeValue: { color: TEXT.primary, fontFamily: Fonts.extraBold, fontSize: 36, fontVariant: ['tabular-nums'] },
  timeUnit: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 11 },

  avisoCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: withOpacity(ATP_BRAND.teal, 0.08), borderRadius: Radius.card,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  avisoText: { color: TEXT.primary, fontFamily: Fonts.regular, fontSize: 13, flex: 1, lineHeight: 19 },

  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bloqueRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.xs,
  },
  bloqueNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    alignItems: 'center', justifyContent: 'center',
  },
  bloqueNumText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: 12 },
  bloqueName: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: 14 },
  bloqueMeta: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },
  bloqueTime: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  extraText: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 12, marginTop: Spacing.xs, lineHeight: 18 },
});
