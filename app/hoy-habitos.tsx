/**
 * Mis hábitos del HOY (MB-12 · E-3) — la puerta perdida de los electrones.
 *
 * Aquí el usuario decide qué hábitos booleanos y cuantitativos trackea su
 * HOY (incluye el opt-in de N-Back). Escribe user_day_preferences vía
 * electron-prefs-service (el writer que no existía: todo usuario quedaba
 * clavado en los 6 defaults de la migración 043). Los MANDATORY son core y
 * no se apagan — se muestran como fijos.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import {
  ALL_BOOLEAN_OPTIONS, ALL_QUANT_OPTIONS, MANDATORY_BOOLEANS,
  FEMALE_ONLY_ELECTRONS, type ElectronOption,
} from '@/src/services/hoy/day-booleans';
import {
  getElectronPrefs, setElectronPrefs, applyElectronToggle, type ElectronPrefs,
} from '@/src/services/hoy/electron-prefs-service';
import { getHabitStates, reactivarHabitos, setHabitState } from '@/src/services/hoy/habit-states-service';
import { estadosPorKey, estadoDe, type HabitEstado } from '@/src/services/hoy/habit-states-core';
import { evaluarTechoEncendido, type AvisoTecho } from '@/src/services/hoy/techo-service';
import { ELEVATION, TEXT, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

// Sin fuente hasta wearables (mismo filtro que day-compiler).
const QUANTS_SIN_FUENTE = new Set(['steps', 'sleep']);

const MANDATORY_LABELS: Record<string, string> = {
  journal: 'Journal',
  no_processed_foods: 'Sin procesados',
  screen_time_cutoff: 'Off pantallas',
  cardio: 'Cardio',
  checkin: 'Check-in',
};

export default function HoyHabitosScreen() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ElectronPrefs | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bioSex, setBioSex] = useState<string | null>(null);
  // MB-27 0.3: los tres estados del hábito llegan a esta pantalla. Sin fila
  // = activo; si la lectura falla, {} y todo se comporta como hoy (fail-open,
  // igual que MB-26).
  const [estados, setEstados] = useState<Record<string, HabitEstado>>({});

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!user?.id) return () => { alive = false; };
    getElectronPrefs(user.id).then((p) => {
      if (!alive) return;
      if (p === null) { setLoadFailed(true); return; }
      setLoadFailed(false);
      setPrefs(p);
    });
    getHabitStates(user.id).then((rows) => {
      if (alive) setEstados(estadosPorKey(rows));
    });
    supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (alive) setBioSex((data as any)?.biological_sex ?? null); }, () => {});
    return () => { alive = false; };
  }, [user?.id]));

  async function toggle(kind: 'booleans' | 'quants', option: ElectronOption, active: boolean) {
    if (!user?.id || !prefs) return;
    haptic.light();
    const userId = user.id;
    const canonical = (kind === 'booleans' ? ALL_BOOLEAN_OPTIONS : ALL_QUANT_OPTIONS).map((o) => o.key);
    const next: ElectronPrefs = {
      ...prefs,
      [kind]: applyElectronToggle(prefs[kind], option.key, active, canonical),
    };
    const prev = prefs;

    const ejecutar = async () => {
      setPrefs(next); // optimista
      // MB-26 P1: encender un hábito graduado o en reposo lo regresa a activo
      // ANTES de escribir prefs (que emite el recompile). Sin esto, el filtro
      // de estados seguiría quitando su card: toggle silencioso clase checkin.
      if (active) {
        await reactivarHabitos(userId, [option.key]);
        // MB-27 0.3: la fila refleja el estado nuevo sin esperar otro focus.
        setEstados((e) => ({ ...e, [option.key]: 'activo' }));
      }
      const res = await setElectronPrefs(userId, next);
      if (!res.ok) {
        setPrefs(prev); // revertir — nunca confirmar en falso
        Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.');
      }
    };

    // MB-26 P3: el techo del día. Encender el noveno avisa y ofrece qué
    // mandar a reposo; el usuario puede pasarse si insiste (guiado, no
    // prisionero). Apagar nunca avisa.
    const aviso: AvisoTecho | null = active
      ? await evaluarTechoEncendido(userId, [option.key])
      : null;
    if (!aviso) {
      await ejecutar();
      return;
    }
    const sugerido = aviso.candidatos[0] ?? null;
    Alert.alert(
      'Tu día ya está lleno',
      `Con ${option.name} quedarías en ${aviso.total} hábitos activos y el techo que protege tu día es ${aviso.techo}. ` +
        'Puedes mandar algo a reposo: nada se borra y vuelve cuando quieras.' +
        (aviso.candidatos.length > 0
          ? ` Lo que más te ha costado: ${aviso.candidatos.map((c) => c.name).join(', ')}.`
          : ''),
      [
        { text: 'Cancelar', style: 'cancel' },
        ...(sugerido
          ? [{
              text: `Reposar ${sugerido.name}`,
              onPress: async () => {
                await setHabitState(userId, sugerido.key, 'reposo');
                setEstados((e) => ({ ...e, [sugerido.key]: 'reposo' }));
                await ejecutar();
              },
            }]
          : []),
        { text: 'Encender igual', onPress: () => { ejecutar(); } },
      ],
    );
  }

  const booleanOptions = ALL_BOOLEAN_OPTIONS.filter(
    (o) => !FEMALE_ONLY_ELECTRONS.has(o.key) || bioSex === 'female',
  );
  const quantOptions = ALL_QUANT_OPTIONS.filter((o) => !QUANTS_SIN_FUENTE.has(o.key));

  const renderRow = (kind: 'booleans' | 'quants', o: ElectronOption, idx: number) => {
    const enPrefs = prefs?.[kind].includes(o.key) ?? false;
    // MB-27 0.3: encendido de verdad = en prefs Y activo. Un hábito mandado
    // a reposo por /ordenar-dia o por el Alert del techo se ve en reposo
    // aquí; tocarlo lo enciende (reactivar), no lo apaga.
    const estado = estadoDe(o.key, estados);
    const active = enPrefs && estado === 'activo';
    const estadoLabel = enPrefs && estado === 'reposo' ? 'En reposo'
      : enPrefs && estado === 'graduado' ? 'Graduado' : null;
    return (
      <Animated.View key={o.key} entering={FadeInUp.delay(40 + idx * 30).springify()}>
        <AnimatedPressable
          onPress={() => toggle(kind, o, !active)}
          disabled={!prefs}
          style={[s.row, active && { borderColor: withOpacity(o.color, 0.5) }]}
        >
          <View style={[s.iconWrap, { backgroundColor: withOpacity(o.color, 0.14) }]}>
            {/* MB-19.2: el hábito se dibuja desde el registro de iconos, no a mano. */}
            <AppIcon name={o.icon} size={18} color={o.color} />
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={s.rowName}>{o.name}</EliteText>
            <EliteText variant="caption" style={s.rowWeight}>
              {estadoLabel ? `Peso ${o.weight} e- · ${estadoLabel}` : `Peso ${o.weight} e-`}
            </EliteText>
          </View>
          <Ionicons
            name={active ? 'checkmark-circle' : estadoLabel === 'En reposo' ? 'moon-outline' : estadoLabel === 'Graduado' ? 'ribbon-outline' : 'ellipse-outline'}
            size={22}
            color={active ? ATP_BRAND.lime : TEXT.tertiary}
          />
        </AnimatedPressable>
      </Animated.View>
    );
  };

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Mis hábitos" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <EliteText variant="caption" style={s.intro}>
          Elige qué hábitos trackea tu HOY. Lo que apagues deja de contar en tu
          ATP Score de mañana en adelante; tu historial no se toca.
        </EliteText>

        {loadFailed && (
          <View style={s.row}>
            <Ionicons name="cloud-offline-outline" size={18} color={TEXT.secondary} />
            <EliteText variant="caption" style={{ color: TEXT.secondary, flex: 1 }}>
              Tu configuración no se pudo leer. Revisa tu conexión y vuelve a entrar.
            </EliteText>
          </View>
        )}

        {!loadFailed && (
          <>
            <EliteText style={s.sectionTitle}>HÁBITOS SÍ / NO</EliteText>
            {booleanOptions.map((o, i) => renderRow('booleans', o, i))}

            <EliteText style={s.sectionTitle}>METAS DEL DÍA</EliteText>
            {quantOptions.map((o, i) => renderRow('quants', o, i))}

            <EliteText style={s.sectionTitle}>SIEMPRE ACTIVOS</EliteText>
            {/* MB-27 0.3: un MANDATORY en reposo (Ordenar mi día) se dice
                aquí también — esta pantalla ya no miente sobre el día. */}
            <EliteText variant="caption" style={s.mandatoryNote}>
              Estos son el núcleo del sistema y no se apagan desde aquí:{' '}
              {MANDATORY_BOOLEANS.map((k) => {
                const label = MANDATORY_LABELS[k] ?? k;
                const est = estadoDe(k, estados);
                return est === 'reposo' ? `${label} (en reposo)`
                  : est === 'graduado' ? `${label} (graduado)` : label;
              }).join(' · ')}.
            </EliteText>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  intro: { color: TEXT.secondary, lineHeight: 19, marginBottom: Spacing.sm },
  sectionTitle: {
    color: ATP_BRAND.lime, fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 3, marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card,
    borderWidth: 1, borderColor: ELEVATION[1].border,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  rowName: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  rowWeight: { color: TEXT.tertiary, marginTop: 1 },
  mandatoryNote: { color: TEXT.secondary, lineHeight: 19 },
});
