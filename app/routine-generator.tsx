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
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';
import { getLocalToday } from '@/src/utils/date-helpers';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import { ayerFueSesionPesada, getSlugsRecientes } from '@/src/services/fitness/workout-session-service';
import { getFitnessLevel, setFitnessLevel } from '@/src/services/fitness/fitness-profile-service';
import { loadGeneratorPrefs, saveGeneratorPrefs } from '@/src/services/fitness/generator-prefs';
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
  EQUIPO_CON_UNIDADES,
  type MatrixExercise,
  type NivelUsuario,
} from '@/src/constants/exercise-matrix';
import { ATP_BRAND, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/src/contexts/theme-context';

const OBJETIVOS: { key: Objetivo; label: string }[] = [
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'hipertrofia', label: 'Hipertrofia' },
  { key: 'metabolico', label: 'Metabólico' },
  { key: 'movilidad', label: 'Movilidad' },
];

const ENFOQUES: { key: EnfoquePatron; label: string }[] = [
  { key: 'full_body', label: 'Cuerpo completo' },
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
  movilidad: 'Movilidad',
};

// ── Chips reutilizables ──

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  // MB-31B3: tokens del tema global (la pantalla vive dentro de <Screen themed>).
  const { kind, tokens: tk } = useAppTheme();
  // Regla 1 de la guía: lima como TEXTO no sobrevive el claro → teal calibrado.
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
  return (
    <AnimatedPressable
      onPress={() => { haptic.light(); onPress(); }}
      style={[c.chip, { backgroundColor: tk.card, borderColor: tk.borde }, active && c.chipActive]}
    >
      <Text style={[c.chipText, { color: active ? acento : tk.textoSecundario }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const c = StyleSheet.create({
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.15), borderColor: ATP_BRAND.lime },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 12 },
});

// ── Pantalla ──

export default function RoutineGeneratorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: tk } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
  const secTxt = { color: tk.textoSecundario };
  // MB-3.6 Bloque 2: la evaluación de movilidad entra con ?objetivo=movilidad.
  // MB-27 P2: la asignación del día entra con ?enfoque= (Entrenar contesta
  // "hoy te toca X" y este deep-link trae el enfoque ya elegido).
  const params = useLocalSearchParams<{ objetivo?: string; enfoque?: string }>();
  const objetivoParam = OBJETIVOS.some((o) => o.key === params.objetivo)
    ? (params.objetivo as Objetivo)
    : null;
  const enfoqueParam = ENFOQUES.some((e) => e.key === params.enfoque)
    ? (params.enfoque as EnfoquePatron)
    : null;

  const [puerta, setPuerta] = useState<'auto' | 'explorar'>('auto');
  const [catalogo, setCatalogo] = useState<MatrixExercise[]>([]);
  // MB-3.5 #4: el catálogo con estado explícito — sin él, el CTA quedaba
  // "apagado" (opacity 0.4) para siempre si la red fallaba, sin explicación.
  const [catalogoError, setCatalogoError] = useState(false);
  const [objetivo, setObjetivo] = useState<Objetivo>(objetivoParam ?? 'hipertrofia');
  const [enfoque, setEnfoque] = useState<EnfoquePatron>(enfoqueParam ?? 'full_body');
  const [broSplit, setBroSplit] = useState(false);
  const [musculos, setMusculos] = useState<string[]>([]);
  const [equipo, setEquipo] = useState<string[]>(['Mancuerna']);
  // MB-3.5 #11: candado de cantidad — cuántas mancuernas/KB tiene (1 o par).
  const [unidades, setUnidades] = useState<Partial<Record<string, '1' | 'par'>>>({});
  const [nivel, setNivel] = useState<NivelUsuario>('intermedio');
  const [senior, setSenior] = useState(false);
  const [tiempoMin, setTiempoMin] = useState(45);
  const [flags, setFlags] = useState<string[]>([]);
  const [regen, setRegen] = useState(0);
  // MB-3.5 #5: ejercicios vetados a mano en Explorar (alimentan el generado).
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [contexto, setContexto] = useState<{ ayerPesado: boolean; recientes: string[] }>({ ayerPesado: false, recientes: [] });
  const [rutina, setRutina] = useState<GeneratedRoutine | null>(null);

  function cargarCatalogo() {
    setCatalogoError(false);
    getExerciseMatrix().then((all) => {
      setCatalogo(all);
      setCatalogoError(all.length === 0);
    });
  }

  // Evita persistir antes de haber cargado (pisaría las prefs con defaults).
  const prefsListasRef = useRef(false);
  // Audit B5 (relacionado): lo que llegó por deep-link NO es una elección
  // del usuario — abrir "hoy te toca Empuje" desde el plan no reescribe la
  // pref del generador. Solo tocar un chip aquí la vuelve elección.
  const prefsCargadasRef = useRef<{ objetivo: Objetivo; enfoque: EnfoquePatron } | null>(null);
  const eligioEnfoqueRef = useRef(false);
  const eligioObjetivoRef = useRef(false);

  // Catálogo + prefs persistidas + nivel del PERFIL (224: la fuente de verdad)
  // + contexto de rotación.
  useEffect(() => {
    cargarCatalogo();
    (async () => {
      const p = await loadGeneratorPrefs();
      if (p) {
        setEquipo(p.equipo);
        if (p.nivel) setNivel(p.nivel);
        setSenior(p.senior);
        setTiempoMin(p.tiempoMin);
        setFlags(p.flags);
        setUnidades(p.unidades);
        prefsCargadasRef.current = { objetivo: p.objetivo, enfoque: p.enfoque };
        // El deep-link (?objetivo= / ?enfoque=) manda sobre la última pref.
        if (!objetivoParam) {
          // Audit B5: movilidad ignora el enfoque en el motor — con un
          // enfoque deep-linkeado, anunciar "Empuje" y armar movilidad de
          // cuerpo completo es traicionar el hero. El día asignado genera
          // hipertrofia; la pref de objetivo NO se reescribe (refs abajo).
          if (enfoqueParam && p.objetivo === 'movilidad') setObjetivo('hipertrofia');
          else setObjetivo(p.objetivo);
        }
        if (!enfoqueParam) setEnfoque(p.enfoque);
      }
      // El perfil manda sobre la pref legacy.
      if (user) {
        const nivelPerfil = await getFitnessLevel(user.id);
        if (nivelPerfil) setNivel(nivelPerfil);
      }
      prefsListasRef.current = true;
    })();
    if (user) {
      ayerFueSesionPesada(user.id).then((ayerPesado) => setContexto((prev) => ({ ...prev, ayerPesado })));
      getSlugsRecientes(user.id).then((recientes) => setContexto((prev) => ({ ...prev, recientes })));
    }
  }, [user, objetivoParam, enfoqueParam]);

  // Persistir prefs (equipo/senior/tiempo/flags/unidades/objetivo/enfoque + nivel
  // como caché legacy — el hub regenera "hoy" con esto).
  // Audit B5: en sesión deep-linkeada, objetivo/enfoque persisten la PREF
  // CARGADA mientras el usuario no toque sus chips — mirar no es elegir.
  useEffect(() => {
    if (!prefsListasRef.current) return;
    const cargadas = prefsCargadasRef.current;
    // La congelación SOLO aplica en sesión deep-linkeada por enfoque; el
    // uso normal del generador persiste lo que el usuario tenga en pantalla.
    const enDeepLink = !!enfoqueParam && !!cargadas;
    const objetivoAPersistir =
      !enDeepLink || objetivoParam || eligioObjetivoRef.current ? objetivo : cargadas.objetivo;
    const enfoqueAPersistir =
      !enDeepLink || eligioEnfoqueRef.current ? enfoque : cargadas.enfoque;
    saveGeneratorPrefs({
      equipo, nivel, senior, tiempoMin, flags, unidades,
      objetivo: objetivoAPersistir, enfoque: enfoqueAPersistir,
    });
  }, [equipo, nivel, senior, tiempoMin, flags, unidades, objetivo, enfoque, objetivoParam, enfoqueParam]);

  const input = useMemo((): GeneratorInput | null => {
    if (catalogo.length === 0) return null;
    return {
      catalogo,
      objetivo,
      enfoque: broSplit && musculos.length > 0
        ? { kind: 'musculos', musculos }
        : { kind: 'patron', enfoque },
      equipo,
      equipoUnidades: unidades,
      nivel,
      senior,
      tiempoMin,
      contraindicaciones: flags,
      seed: `${user?.id ?? 'anon'}|${getLocalToday()}|${regen}`,
      slugsRecientes: contexto.recientes,
      ayerFuePesado: contexto.ayerPesado,
    };
  }, [catalogo, objetivo, enfoque, broSplit, musculos, equipo, unidades, nivel, senior, tiempoMin, flags, user, regen, contexto]);

  // Akinator: el pool encogiéndose EN VIVO con los filtros actuales.
  // (SIN los vetos manuales — así el usuario puede re-incluir lo vetado.)
  const pool = useMemo(() => (input ? filtrarPool(input) : []), [input]);
  // Con objetivo movilidad los estiramientos SON el pool ejecutable.
  const poolEjecutable = useMemo(
    () => (objetivo === 'movilidad' ? pool : pool.filter((e) => e.patron !== 'Estiramiento')),
    [pool, objetivo],
  );
  const activos = poolEjecutable.filter((e) => !excluidos.has(e.slug)).length;

  function generar() {
    if (!input) return;
    haptic.medium();
    // Los vetos de Explorar alimentan el generado como filtro duro extra.
    setRutina(generarRutina({ ...input, slugsExcluidos: [...excluidos] }));
  }

  function toggleExcluido(slug: string) {
    haptic.light();
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
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
    <Screen themed edges={[]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Generador" />
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

        {/* 2 puertas */}
        <View style={s.doorRow}>
          {(['auto', 'explorar'] as const).map((p) => (
            <AnimatedPressable key={p} onPress={() => { haptic.light(); setPuerta(p); }} style={[s.door, { backgroundColor: tk.card, borderColor: tk.borde }, puerta === p && s.doorActive]}>
              <Ionicons name={p === 'auto' ? 'flash' : 'search'} size={15} color={puerta === p ? TEXT_COLORS.onAccent : tk.textoSecundario} />
              <Text style={[s.doorText, secTxt, puerta === p && s.doorTextActive]}>{p === 'auto' ? 'AUTO' : 'EXPLORAR'}</Text>
            </AnimatedPressable>
          ))}
        </View>

        {/* Contador de pool (corazón del modo Explorar, visible siempre en él) */}
        {puerta === 'explorar' && (
          <Animated.View entering={FadeInDown.duration(250)} style={[s.poolCard, { backgroundColor: tk.card, borderColor: tk.borde }]}>
            <Text style={[s.poolCount, { color: acento }]}>{activos}</Text>
            <Text style={[s.poolLabel, secTxt]}>
              ejercicios ejecutables con tus filtros
              {excluidos.size > 0 ? ` (${excluidos.size} vetado${excluidos.size === 1 ? '' : 's'} por ti)` : ''}
            </Text>
          </Animated.View>
        )}

        {/* Objetivo */}
        <Text style={[s.sectionLabel, secTxt]}>OBJETIVO</Text>
        <View style={s.chipsRow}>
          {OBJETIVOS.map((o) => (
            <Chip key={o.key} label={o.label} active={objetivo === o.key} onPress={() => { eligioObjetivoRef.current = true; setObjetivo(o.key); }} />
          ))}
        </View>

        {/* Enfoque (patrón default · bro-split opt-in) — movilidad es cuerpo
            completo: sin enfoque que recorte. */}
        {objetivo === 'movilidad' ? (
          <>
            <Text style={[s.sectionLabel, secTxt]}>ENFOQUE</Text>
            <Text style={[s.sectionHint, { color: tk.textoTenue }]}>Sesión de movilidad de cuerpo completo: estiramientos, movilidad y estabilidad de tu matriz.</Text>
          </>
        ) : (
          <>
            <Text style={[s.sectionLabel, secTxt]}>ENFOQUE</Text>
            <View style={s.chipsRow}>
              {ENFOQUES.map((e) => (
                <Chip key={e.key} label={e.label} active={!broSplit && enfoque === e.key} onPress={() => { eligioEnfoqueRef.current = true; setBroSplit(false); setEnfoque(e.key); }} />
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
          </>
        )}

        {/* Equipo (filtro duro) */}
        <Text style={[s.sectionLabel, secTxt]}>EQUIPO DISPONIBLE</Text>
        <Text style={[s.sectionHint, { color: tk.textoTenue }]}>Peso corporal siempre cuenta. Marca lo que tienes hoy.</Text>
        <View style={s.chipsRow}>
          {EQUIPO_TOKENS.filter((t) => t !== 'Peso corporal').map((t) => (
            <Chip key={t} label={t} active={equipo.includes(t)} onPress={() => toggle(equipo, setEquipo, t)} />
          ))}
        </View>

        {/* Candado de cantidad (MB-3.5 #11): ¿1 pieza o par? Filtro duro del motor. */}
        {EQUIPO_CON_UNIDADES.filter((t) => equipo.includes(t)).map((t) => (
          <View key={t} style={s.unidadesRow}>
            <Text style={[s.unidadesLabel, secTxt]}>{t === 'Mancuerna' ? 'Mancuernas' : 'Kettlebells'}: ¿cuántas tienes?</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="Solo 1" active={unidades[t] === '1'} onPress={() => setUnidades((u) => ({ ...u, [t]: '1' }))} />
              <Chip label="Par" active={(unidades[t] ?? 'par') === 'par'} onPress={() => setUnidades((u) => ({ ...u, [t]: 'par' }))} />
            </View>
          </View>
        ))}

        {/* Tiempo */}
        <Text style={[s.sectionLabel, secTxt]}>TIEMPO</Text>
        <View style={s.timeRow}>
          <AnimatedPressable onPress={() => { haptic.light(); setTiempoMin((t) => Math.max(15, t - 5)); }} style={[s.timeBtn, { backgroundColor: tk.card, borderColor: tk.borde }]}>
            <Text style={[s.timeBtnText, { color: tk.texto }]}>−</Text>
          </AnimatedPressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={[s.timeValue, { color: tk.texto }]}>{tiempoMin}</Text>
            <Text style={[s.timeUnit, secTxt]}>minutos</Text>
          </View>
          <AnimatedPressable onPress={() => { haptic.light(); setTiempoMin((t) => Math.min(150, t + 5)); }} style={[s.timeBtn, { backgroundColor: tk.card, borderColor: tk.borde }]}>
            <Text style={[s.timeBtnText, { color: tk.texto }]}>+</Text>
          </AnimatedPressable>
        </View>

        {/* Nivel + senior — el nivel vive en el PERFIL (224); cambiarlo aquí lo actualiza allá. */}
        <Text style={[s.sectionLabel, secTxt]}>NIVEL</Text>
        <View style={s.chipsRow}>
          {NIVELES_USUARIO.map((n) => (
            <Chip
              key={n}
              label={NIVEL_LABELS[n]}
              active={nivel === n}
              onPress={() => {
                setNivel(n);
                if (user) setFitnessLevel(user.id, n);
              }}
            />
          ))}
          <Chip label="Senior" active={senior} onPress={() => setSenior(!senior)} />
        </View>

        {/* Contraindicaciones */}
        <Text style={[s.sectionLabel, secTxt]}>CUIDA DE</Text>
        <View style={s.chipsRow}>
          {CONTRAINDICACIONES.map((f) => (
            <Chip key={f} label={f} active={flags.includes(f)} onPress={() => toggle(flags, setFlags, f)} />
          ))}
        </View>

        {/* Pool en Explorar (MB-3.5 #5): lista COMPLETA, cada ejercicio se puede
            vetar/re-incluir con estado visible — la selección alimenta el generado. */}
        {puerta === 'explorar' && poolEjecutable.length > 0 && (
          <View style={{ marginTop: Spacing.md }}>
            <Text style={[s.sectionLabel, secTxt]}>EL POOL · TOCA PARA VETAR / INCLUIR</Text>
            {poolEjecutable.map((e) => {
              const vetado = excluidos.has(e.slug);
              return (
                <AnimatedPressable key={e.slug} onPress={() => toggleExcluido(e.slug)} style={[s.poolRow, { borderBottomColor: tk.borde }]}>
                  <Ionicons
                    name={vetado ? 'close-circle' : 'checkmark-circle'}
                    size={18}
                    color={vetado ? tk.textoTenue : ATP_BRAND.lime}
                  />
                  <Text style={[s.poolRowName, { color: vetado ? tk.textoTenue : tk.texto }, vetado && s.poolRowNameVetado]} numberOfLines={1}>{e.nombre}</Text>
                  <Text style={[s.poolRowMeta, secTxt]}>{e.musculoPrincipal}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        )}

        {/* Generar — con estado explícito del catálogo (MB-3.5 #4: nada de CTA
            "apagado" sin explicación si la red falló). */}
        <View style={{ marginTop: Spacing.xl }}>
          {catalogoError ? (
            <View style={s.avisoCard}>
              <Ionicons name="cloud-offline-outline" size={16} color={ATP_BRAND.teal} />
              <Text style={[s.avisoText, { color: tk.texto }]}>No se pudo cargar el catálogo de ejercicios.</Text>
              <AnimatedPressable onPress={() => { haptic.light(); cargarCatalogo(); }}>
                <Text style={[s.retryText, { color: acento }]}>Reintentar</Text>
              </AnimatedPressable>
            </View>
          ) : catalogo.length === 0 ? (
            <View style={s.avisoCard}>
              <Ionicons name="hourglass-outline" size={16} color={ATP_BRAND.teal} />
              <Text style={[s.avisoText, { color: tk.texto }]}>Cargando catálogo de ejercicios…</Text>
            </View>
          ) : (
            <GradientCTA
              label={rutina ? 'GENERAR OTRA' : 'GENERAR'}
              pillar="fitness"
              icon="flash"
              onPress={() => { setRegen((r) => (rutina ? r + 1 : r)); generar(); }}
            />
          )}
        </View>

        {/* Preview de la rutina */}
        {rutina && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: Spacing.lg }}>
            {rutina.avisos.map((a) => (
              <View key={a} style={s.avisoCard}>
                <Ionicons name="information-circle" size={16} color={ATP_BRAND.teal} />
                <Text style={[s.avisoText, { color: tk.texto }]}>{a}</Text>
              </View>
            ))}
            {rutina.bloques.length > 0 && (
              <>
                <View style={s.previewHeader}>
                  <Text style={[s.sectionLabel, secTxt]}>TU SESIÓN · ~{Math.round(rutina.tiempoTotalSeg / 60)} MIN</Text>
                </View>
                {rutina.bloques.map((b, i) => (
                  <View key={`${b.slug}-${i}`} style={[s.bloqueRow, { backgroundColor: tk.card, borderColor: tk.borde }]}>
                    <View style={s.bloqueNum}><Text style={[s.bloqueNumText, { color: acento }]}>{i + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.bloqueName, { color: tk.texto }]} numberOfLines={1}>{b.nombre}</Text>
                      <Text style={[s.bloqueMeta, secTxt]}>
                        {SLOT_LABELS[b.slot]} · {b.series}×{b.reps}{b.esIsometrico ? ' s' : ''}
                        {b.metodo !== 'Estándar' ? ` · ${b.metodo}` : ''}
                      </Text>
                    </View>
                    <Text style={[s.bloqueTime, secTxt]}>{Math.round(b.tiempoSeg / 60)}′</Text>
                  </View>
                ))}
                {rutina.recoveryExtraMin > 0 && (
                  <Text style={[s.extraText, secTxt]}>
                    +{rutina.recoveryExtraMin} min de tu tiempo van a movilidad/recovery libre (por encima de tu techo de hoy).
                  </Text>
                )}
                <View style={{ marginTop: Spacing.md }}>
                  <GradientCTA label="EMPEZAR SESIÓN" pillar="fitness" icon="play" onPress={empezar} />
                </View>
                {/* MB-3.6 §1.1: ARGOS RETIRADO de Fitness — hoy /argos-routine
                    genera desde cero ignorando este esqueleto, así que "ARGOS,
                    ajústala" era promesa a medias. Vuelve cuando ARGOS tome el
                    output del generador como input real. */}
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
    borderWidth: 1,
  },
  doorActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  doorText: { fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1 },
  doorTextActive: { color: TEXT_COLORS.onAccent },

  poolCard: {
    alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.card,
  },
  poolCount: { fontFamily: Fonts.extraBold, fontSize: 40, fontVariant: ['tabular-nums'] },
  poolLabel: { fontFamily: Fonts.regular, fontSize: 12 },
  poolRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, gap: Spacing.sm,
  },
  poolRowName: { fontFamily: Fonts.regular, fontSize: 13, flex: 1 },
  poolRowNameVetado: { textDecorationLine: 'line-through' },
  poolRowMeta: { fontFamily: Fonts.regular, fontSize: 11 },

  unidadesRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap',
  },
  unidadesLabel: { fontFamily: Fonts.regular, fontSize: 13 },
  retryText: { fontFamily: Fonts.semiBold, fontSize: 13 },

  sectionLabel: {
    fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  sectionHint: { fontFamily: Fonts.regular, fontSize: 12, marginTop: -6, marginBottom: Spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  timeBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  timeBtnText: { fontFamily: Fonts.bold, fontSize: 22 },
  timeValue: { fontFamily: Fonts.extraBold, fontSize: 36, fontVariant: ['tabular-nums'] },
  timeUnit: { fontFamily: Fonts.regular, fontSize: 11 },

  avisoCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: withOpacity(ATP_BRAND.teal, 0.08), borderRadius: Radius.card,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  avisoText: { fontFamily: Fonts.regular, fontSize: 13, flex: 1, lineHeight: 19 },

  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bloqueRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.xs,
  },
  bloqueNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    alignItems: 'center', justifyContent: 'center',
  },
  bloqueNumText: { fontFamily: Fonts.bold, fontSize: 12 },
  bloqueName: { fontFamily: Fonts.semiBold, fontSize: 14 },
  bloqueMeta: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },
  bloqueTime: { fontFamily: Fonts.semiBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  extraText: { fontFamily: Fonts.regular, fontSize: 12, marginTop: Spacing.xs, lineHeight: 18 },
});
