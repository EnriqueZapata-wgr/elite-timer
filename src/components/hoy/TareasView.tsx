/**
 * TareasView — el checklist del día con dos lentes (MB-20 Pieza 1).
 *
 * TAREAS: bloques mañana/tarde/noche con progreso por bloque y global.
 * AGENDA: la MISMA lista ordenada por hora. Nunca dos listas, nunca dos
 * fuentes: todo sale de CompiledDay vía tareas-core.
 *
 * Los horarios finos y las notificaciones por evento se editan en /agenda
 * (la puerta vive en la lente AGENDA).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, Pressable, StyleSheet, Alert, LayoutChangeEvent } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { useSystemReducedMotion } from '@/src/components/ui/useSystemReducedMotion';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { TareaRow } from '@/src/components/hoy/TareaRow';
import { TareaCard } from '@/src/components/hoy/TareaCard';
import { TareaHechaRow } from '@/src/components/hoy/TareaHechaRow';
import { tareaImage } from '@/src/components/hoy/tarea-images';
import { MomentoBanda } from '@/src/components/hoy/MomentoBanda';
import { SmartCheckModal } from '@/src/components/hoy/SmartCheckModal';
import { OrbCard } from '@/src/components/hoy/OrbCard';
import {
  buildTareas, agendaLens, repartoTareas, pickFocusMomento, EXPERIENCIA_REGISTRO,
  type Tarea, type Momento,
} from '@/src/services/hoy/tareas-core';
import {
  seccionForTarea, datoForTarea, datoCierreForTarea, pickHeroTarea,
} from '@/src/services/hoy/tareas-editorial-core';
import {
  persistBooleanToggle, registrarExperiencia, type ExperienciaExterna,
} from '@/src/services/hoy/tarea-actions';
import { addWater } from '@/src/services/hydration-service';
import { canShowNudge, markNudgeShown, NUDGE_THRESHOLD } from '@/src/services/hoy/nudge-store';
import type { CompiledDay } from '@/src/services/day-compiler';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { APP_SECTION_COLORS, ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';

type Lens = 'tareas' | 'agenda';

interface UvMini {
  current: number;
  vitaminD?: string;
}

interface Props {
  day: CompiledDay;
  userId?: string;
  uvMini?: UvMini | null;
  /** Auto-foco: pide al scroll padre posicionarse en el bloque actual. */
  onRequestScroll?: (yWithinView: number) => void;
}

export function TareasView({ day, userId, uvMini, onRequestScroll }: Props) {
  const router = useRouter();
  const reducedMotion = useSystemReducedMotion();
  const [lens, setLens] = useState<Lens>('tareas');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [smartTarea, setSmartTarea] = useState<Tarea | null>(null);
  const [nudgeVisible, setNudgeVisible] = useState(false);

  // ── Fuente única + overrides optimistas ──
  const result = useMemo(() => {
    const boolWithOverrides = day.booleanElectrons.map((e) =>
      overrides[e.source] != null ? { ...e, completed: overrides[e.source] } : e,
    );
    return buildTareas(
      {
        booleanElectrons: boolWithOverrides,
        quantitativeElectrons: day.quantitativeElectrons,
        agendaItems: day.agendaItems,
      },
      new Date().getHours(),
    );
  }, [day, overrides]);

  // Los overrides se sueltan cuando el compilado los alcanza.
  useEffect(() => {
    setOverrides((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const e of day.booleanElectrons) {
        if (next[e.source] != null && next[e.source] === e.completed) {
          delete next[e.source];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [day]);

  const agendaItems = useMemo(() => agendaLens(result), [result]);

  // ── MB-20.1 · 2.1: el héroe de AGENDA — lo que importa ahora, por hora ──
  const heroTarea = useMemo(() => {
    const now = new Date();
    return pickHeroTarea(agendaItems, now.getHours() * 60 + now.getMinutes());
  }, [agendaItems]);

  // ── MB-20.1: el muro encoge — hechas arriba como cinta, bloques solo con
  // pendientes. La fuente sigue siendo la misma (result); esto es reparto
  // puro en tareas-core (MB-20.2 · 1.3, con test). ──
  const { hechas, pendingBlocks } = useMemo(
    () => repartoTareas(agendaItems, result.blocks),
    [agendaItems, result.blocks],
  );

  // ── Auto-foco (una sola vez, MB-20.2 · 1.1/1.2) ──
  // El consumidor (index.tsx) espera una `y` relativa a la RAÍZ de esta vista,
  // pero los bloques viven dentro de un <View> interno que tiene encima las
  // lentes, la fila global, el nudge y OrbCard: hay que sumar la `y` de ese
  // contenedor. Los dos onLayout llegan en orden no garantizado, así que el
  // que llega primero deja el dato y el segundo dispara el scroll.
  const focusTarget = useMemo(
    () => pickFocusMomento(pendingBlocks.map((b) => b.momento), result.focusMomento),
    [pendingBlocks, result.focusMomento],
  );
  const focusedRef = useRef(false);
  const containerYRef = useRef<number | null>(null);
  const pendingFocusYRef = useRef<number | null>(null);
  const captureContainerY = (e: LayoutChangeEvent) => {
    containerYRef.current = e.nativeEvent.layout.y;
    if (pendingFocusYRef.current != null) {
      const blockY = pendingFocusYRef.current;
      pendingFocusYRef.current = null;
      onRequestScroll?.(containerYRef.current + blockY);
    }
  };
  const captureBlockY = (momento: Momento) => (e: LayoutChangeEvent) => {
    if (!focusedRef.current && momento === focusTarget && lens === 'tareas') {
      focusedRef.current = true;
      // HECHAS vive arriba y nunca recibe el foco. Se scrollea si hay cinta
      // encima o si el bloque del foco no es el que abre la lista.
      if (hechas.length > 0 || pendingBlocks[0]?.momento !== focusTarget) {
        if (containerYRef.current != null) {
          onRequestScroll?.(containerYRef.current + e.nativeEvent.layout.y);
        } else {
          pendingFocusYRef.current = e.nativeEvent.layout.y;
        }
      }
    }
  };

  // ── Recordatorio contextual del tap largo (1.4) ──
  // NOCTURNO-FIX 7.4: al recuperar foco el compilado AÚN es el viejo (loadDay
  // es async), así que comparar ahí contaba "regresó sin hacer nada" aunque
  // sí hubiera hecho. El foco solo ARMA la evaluación; se decide cuando llega
  // el compile fresco (cambia `day`).
  const tapNavRef = useRef<{ key: string; completedAtNav: number } | null>(null);
  const pendingEvalRef = useRef<{ key: string; completedAtNav: number } | null>(null);
  const bounceCountRef = useRef(0);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedNow = result.global.done;
  useFocusEffect(useCallback(() => {
    if (tapNavRef.current) {
      pendingEvalRef.current = tapNavRef.current;
      tapNavRef.current = null;
    }
  }, []));
  useEffect(() => {
    const pending = pendingEvalRef.current;
    if (!pending) return;
    pendingEvalRef.current = null;
    if (result.global.done > pending.completedAtNav) { bounceCountRef.current = 0; return; }
    bounceCountRef.current += 1;
    if (bounceCountRef.current >= NUDGE_THRESHOLD) {
      bounceCountRef.current = 0;
      canShowNudge().then((can) => {
        if (!can) return;
        markNudgeShown();
        setNudgeVisible(true);
        if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = setTimeout(() => setNudgeVisible(false), 8000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);
  useEffect(() => () => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
  }, []);

  // ── Handlers de gesto ──
  const handleNavigate = useCallback((t: Tarea) => {
    if (!t.route) return;
    if (t.gesto === 'palomear' || t.gesto === 'experiencia') {
      tapNavRef.current = { key: t.key, completedAtNav: completedNow };
    }
    router.push(t.route as never);
  }, [router, completedNow]);

  const handlePalomear = useCallback((t: Tarea) => {
    if (!userId) return;
    const next = !t.completed;
    setOverrides((prev) => ({ ...prev, [t.key]: next }));
    const currentStates: Record<string, boolean> = {};
    for (const e of day.booleanElectrons) currentStates[e.source] = e.completed;
    persistBooleanToggle(userId, t.key, next, currentStates).catch((e) => {
      setOverrides((prev) => ({ ...prev, [t.key]: t.completed }));
      logWarn('[TareasView] palomeo failed, reverted', e);
      Alert.alert('No se pudo guardar', 'Inténtalo de nuevo en un momento.');
    });
  }, [userId, day]);

  // SÍ de una experiencia sin captura: directo a su pantalla de registro real.
  // No cuenta para el nudge: quien llegó aquí ya usa el tap largo.
  const handleIrRegistro = useCallback((t: Tarea) => {
    const route = EXPERIENCIA_REGISTRO[t.key];
    if (!route) return;
    router.push(route as never);
  }, [router]);

  const handleRegistrar = useCallback(async (t: Tarea, minutes: number) => {
    if (!userId) return false;
    const res = await registrarExperiencia(userId, t.key as ExperienciaExterna, minutes);
    if (!res.ok) {
      Alert.alert('No se pudo registrar', 'Inténtalo de nuevo en un momento.');
      return false;
    }
    return true;
  }, [userId]);

  const handleInline = useCallback(async (t: Tarea) => {
    if (!userId || t.key !== 'water') return;
    try {
      const r = await addWater(userId, 250);
      if (r === null) throw new Error('addWater returned null');
    } catch (e) {
      logWarn('[TareasView] addWater failed', e);
      Alert.alert('No se pudo registrar', 'Inténtalo de nuevo en un momento.');
    }
  }, [userId]);

  const rowProps = {
    onNavigate: handleNavigate,
    onPalomear: handlePalomear,
    onExperiencia: setSmartTarea,
    onInline: handleInline,
  };

  const pctGlobal = result.global.total > 0 ? result.global.done / result.global.total : 0;

  // ── MB-20.1 · Pieza 1: la lente TAREAS con piel editorial ──
  // Al palomear, la card encoge hasta su renglón y VIAJA al bloque de hechas
  // con la transición de layout de la sala ATP. Para que reanimated anime el
  // viaje, todos los elementos viven PLANOS bajo un mismo padre con llave
  // estable (un wrapper por bloque rompería la continuidad del instance).
  // Con reduce motion NO hay transición de layout (undefined), no "una más
  // sobria": LinearTransition pelón seguía animando 300 ms y el código decía
  // una cosa haciendo otra (nota del audit MB-20.2).
  const rowLayout = reducedMotion ? undefined : LinearTransition.springify().damping(18);
  const hoy = getLocalToday();
  const seedBase = `${userId ?? ''}-${hoy}`;
  const colorDeSeccion = (t: Tarea) => APP_SECTION_COLORS[seccionForTarea(t.key)];

  const tareasChildren: ReactNode[] = [];
  if (lens === 'tareas') {
    if (hechas.length > 0) {
      tareasChildren.push(
        <Animated.View key="header-hechas" layout={rowLayout} style={s.blockHeader}>
          <EliteText style={s.blockLabel}>HECHAS</EliteText>
          <EliteText style={s.blockCount}>{hechas.length}</EliteText>
        </Animated.View>,
      );
      for (const t of hechas) {
        tareasChildren.push(
          <Animated.View key={t.key} layout={rowLayout}>
            <TareaHechaRow
              tarea={t}
              sectionColor={colorDeSeccion(t)}
              dato={datoCierreForTarea(t, day.datosVivos, hoy)}
              onNavigate={handleNavigate}
              onPalomear={handlePalomear}
              onExperiencia={setSmartTarea}
            />
          </Animated.View>,
        );
      }
    }
    for (const b of pendingBlocks) {
      tareasChildren.push(
        <Animated.View
          key={`header-${b.momento}`}
          layout={rowLayout}
          onLayout={captureBlockY(b.momento)}
          style={s.blockHeader}
        >
          <EliteText style={s.blockLabel}>{b.label}</EliteText>
          <EliteText style={s.blockCount}>{b.done} de {b.total}</EliteText>
        </Animated.View>,
      );
      for (const t of b.pending) {
        tareasChildren.push(
          <Animated.View key={t.key} layout={rowLayout}>
            <TareaCard
              tarea={t}
              sectionColor={colorDeSeccion(t)}
              image={tareaImage(t.key, `${seedBase}-${t.key}`)}
              dato={datoForTarea(t, uvMini, day.datosVivos, hoy)}
              onNavigate={handleNavigate}
              onPalomear={handlePalomear}
              onExperiencia={setSmartTarea}
              onInline={handleInline}
            />
          </Animated.View>,
        );
      }
    }
  }

  return (
    <View>
      {/* Lentes */}
      <View style={s.lensRow}>
        {(['tareas', 'agenda'] as Lens[]).map((l) => (
          <Pressable
            key={l}
            onPress={() => { haptic.light(); setLens(l); }}
            style={[s.lensPill, lens === l && s.lensPillOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: lens === l }}
          >
            <EliteText style={[s.lensText, lens === l && s.lensTextOn]}>
              {l === 'tareas' ? 'Tareas' : 'Agenda'}
            </EliteText>
          </Pressable>
        ))}
      </View>

      {/* Progreso global */}
      <View style={s.globalRow}>
        <View style={s.globalTrack}>
          <View style={[s.globalFill, { width: `${Math.round(pctGlobal * 100)}%` }]} />
        </View>
        <EliteText style={s.globalText}>
          {result.global.done} de {result.global.total}
        </EliteText>
      </View>

      {/* Burbuja del gesto (1.4) */}
      {nudgeVisible && (
        <View style={s.nudge}>
          <ArgosOrb size={18} reducedMotion />
          <EliteText style={s.nudgeText}>Para palomear un hábito, mantén presionado.</EliteText>
        </View>
      )}

      <OrbCard userId={userId} />

      {lens === 'tareas' ? (
        <View onLayout={captureContainerY}>{tareasChildren}</View>
      ) : (
        <>
          {/* El héroe editorial: una sola card grande que cambia con la hora. */}
          {heroTarea ? (
            <TareaCard
              tarea={heroTarea}
              sectionColor={colorDeSeccion(heroTarea)}
              image={tareaImage(heroTarea.key, `${seedBase}-${heroTarea.key}`)}
              dato={datoForTarea(heroTarea, uvMini, day.datosVivos, hoy)}
              badge="AHORA"
              onNavigate={handleNavigate}
              onPalomear={handlePalomear}
              onExperiencia={setSmartTarea}
              onInline={handleInline}
            />
          ) : null}
          {/* Bandas editoriales por bloque; las filas se quedan compactas.
              MB-20.2 · 3.1: la tarea del héroe NO se repite como fila — dos
              superficies palomeables para lo mismo era un bug de honestidad.
              El contador de la banda sí la incluye (es progreso real). */}
          {result.blocks.map((b) => (
            <View key={b.momento}>
              <MomentoBanda momento={b.momento} label={b.label} done={b.done} total={b.total} />
              {b.items
                .filter((t) => t.key !== heroTarea?.key)
                .map((t) => (
                  <TareaRow key={t.key} tarea={t} lens="agenda" accentColor={colorDeSeccion(t)} {...rowProps} />
                ))}
            </View>
          ))}
          <Pressable
            onPress={() => { haptic.light(); router.push('/agenda'); }}
            style={({ pressed }) => [s.agendaLink, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="notifications-outline" size={13} color={ATP_BRAND.lime} />
            <EliteText style={s.agendaLinkText}>Horarios y notificaciones</EliteText>
            <Ionicons name="chevron-forward" size={12} color={ATP_BRAND.lime} />
          </Pressable>
        </>
      )}

      {/* Pie: UV ahora + agregar hábito */}
      <View style={s.footerRow}>
        {uvMini ? (
          <Pressable
            onPress={() => { haptic.light(); router.push('/solar'); }}
            style={({ pressed }) => [s.uvChip, pressed && { opacity: 0.6 }]}
          >
            <EliteText style={s.uvText}>
              UV {uvMini.current} ahora{uvMini.vitaminD ? ` · ${uvMini.vitaminD}` : ''}
            </EliteText>
          </Pressable>
        ) : <View />}
        <Pressable
          onPress={() => { haptic.light(); router.push({ pathname: '/kit', params: { agregar: '1' } }); }}
          style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.6 }]}
          accessibilityLabel="Agregar hábito"
        >
          <Ionicons name="add" size={14} color={ATP_BRAND.lime} />
          <EliteText style={s.addText}>agregar</EliteText>
        </Pressable>
      </View>

      <SmartCheckModal
        tarea={smartTarea}
        onClose={() => setSmartTarea(null)}
        onNavigate={handleNavigate}
        onRegistrar={handleRegistrar}
        onIrRegistro={handleIrRegistro}
      />
    </View>
  );
}

const s = StyleSheet.create({
  lensRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  lensPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  lensPillOn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    borderColor: ATP_BRAND.lime,
  },
  lensText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  lensTextOn: { color: ATP_BRAND.lime },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  globalTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  globalFill: { height: '100%', borderRadius: 3, backgroundColor: ATP_BRAND.lime },
  globalText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.md,
  },
  nudgeText: {
    flex: 1,
    color: '#fff',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: 8,
  },
  blockLabel: {
    color: TEXT.secondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  blockCount: {
    color: TEXT.muted,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
  agendaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
  },
  agendaLinkText: {
    color: ATP_BRAND.lime,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  uvChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  uvText: {
    color: TEXT.secondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.4),
  },
  addText: {
    color: ATP_BRAND.lime,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
});
