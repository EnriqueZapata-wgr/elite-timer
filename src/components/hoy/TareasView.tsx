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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Alert, LayoutChangeEvent } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { useSystemReducedMotion } from '@/src/components/ui/useSystemReducedMotion';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { TareaRow } from '@/src/components/hoy/TareaRow';
import { SmartCheckModal } from '@/src/components/hoy/SmartCheckModal';
import { OrbCard } from '@/src/components/hoy/OrbCard';
import {
  buildTareas, agendaLens, type Tarea, type Momento,
} from '@/src/services/hoy/tareas-core';
import {
  persistBooleanToggle, registrarExperiencia, type ExperienciaExterna,
} from '@/src/services/hoy/tarea-actions';
import { addWater } from '@/src/services/hydration-service';
import { canShowNudge, markNudgeShown, NUDGE_THRESHOLD } from '@/src/services/hoy/nudge-store';
import type { CompiledDay } from '@/src/services/day-compiler';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';

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

  // ── Auto-foco en el bloque actual (una sola vez) ──
  const blockYs = useRef<Partial<Record<Momento, number>>>({});
  const focusedRef = useRef(false);
  const captureBlockY = (momento: Momento) => (e: LayoutChangeEvent) => {
    blockYs.current[momento] = e.nativeEvent.layout.y;
    if (!focusedRef.current && momento === result.focusMomento && lens === 'tareas') {
      focusedRef.current = true;
      // Solo si el bloque actual no es el primero (nada que scrollear si sí).
      if (result.blocks[0]?.momento !== result.focusMomento) {
        onRequestScroll?.(e.nativeEvent.layout.y);
      }
    }
  };

  // ── Recordatorio contextual del tap largo (1.4) ──
  const tapNavRef = useRef<{ key: string; completedAtNav: number } | null>(null);
  const bounceCountRef = useRef(0);
  const completedNow = result.global.done;
  useFocusEffect(useCallback(() => {
    const pending = tapNavRef.current;
    tapNavRef.current = null;
    if (!pending) return;
    if (completedNow > pending.completedAtNav) { bounceCountRef.current = 0; return; }
    bounceCountRef.current += 1;
    if (bounceCountRef.current >= NUDGE_THRESHOLD) {
      bounceCountRef.current = 0;
      canShowNudge().then((can) => {
        if (!can) return;
        markNudgeShown();
        setNudgeVisible(true);
        setTimeout(() => setNudgeVisible(false), 8000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedNow]));

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
    reducedMotion,
    onNavigate: handleNavigate,
    onPalomear: handlePalomear,
    onExperiencia: setSmartTarea,
    onInline: handleInline,
  };

  const pctGlobal = result.global.total > 0 ? result.global.done / result.global.total : 0;

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
        <>
          {result.blocks.map((b) => (
            <View key={b.momento} onLayout={captureBlockY(b.momento)}>
              <View style={s.blockHeader}>
                <EliteText style={s.blockLabel}>{b.label}</EliteText>
                <EliteText style={s.blockCount}>{b.done} de {b.total}</EliteText>
              </View>
              {b.items.map((t) => (
                <TareaRow key={t.key} tarea={t} lens="tareas" {...rowProps} />
              ))}
            </View>
          ))}
        </>
      ) : (
        <>
          {agendaItems.map((t) => (
            <TareaRow key={t.key} tarea={t} lens="agenda" {...rowProps} />
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
