/**
 * Mis hábitos del HOY (MB-12 · E-3) — la puerta perdida de los electrones.
 *
 * Aquí el usuario decide qué hábitos booleanos y cuantitativos trackea su
 * HOY (incluye el opt-in de N-Back). Escribe user_day_preferences vía
 * electron-prefs-service (el writer que no existía: todo usuario quedaba
 * clavado en los 6 defaults de la migración 043). Los MANDATORY son core y
 * no se apagan — se muestran como fijos.
 */
import { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

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
import { getHabitStates, reactivarHabitos } from '@/src/services/hoy/habit-states-service';
import { estadosPorKey, estadoDe, type HabitEstado } from '@/src/services/hoy/habit-states-core';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
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
  // MB-31B remate: pantalla sin dueño en el reparto — tokens del tema.
  const { kind: themeKind, tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
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

    // MB-27 V3 (doctrina): el techo murió como límite — encender es
    // encender, cero fricción. El conteo vive en HOY como información
    // siempre visible y la salida en /ordenar-dia.
    //
    // MB-27 menor 5 (VIVE: es doctrina de graduación, no de techo):
    // reactivar un GRADUADO pierde graduated_at — en una pantalla cuyo
    // gesto natural es prender y apagar, eso no puede irse en un toque.
    // Confirmación explícita; el reposo sí es de un toque.
    if (active && estadoDe(option.key, estados) === 'graduado') {
      Alert.alert(
        `${option.name} está graduado`,
        'Graduado no es archivado: se sigue midiendo sin ocupar renglón. ¿Lo regresas a tu día como hábito activo?',
        [
          { text: 'Dejarlo graduado', style: 'cancel' },
          { text: 'Volverlo a activo', onPress: () => { ejecutar(); } },
        ],
      );
      return;
    }
    await ejecutar();
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
            color={active ? ATP_BRAND.lime : t.textoTenue}
          />
        </AnimatedPressable>
      </Animated.View>
    );
  };

  return (
    <Screen themed edges={[]}>
      <StatusBar style={themeKind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Mis hábitos" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <EliteText variant="caption" style={s.intro}>
          Elige qué hábitos trackea tu HOY. Lo que apagues deja de contar en tu
          ATP Score de mañana en adelante; tu historial no se toca.
        </EliteText>

        {loadFailed && (
          <View style={s.row}>
            <Ionicons name="cloud-offline-outline" size={18} color={t.textoSecundario} />
            <EliteText variant="caption" style={{ color: t.textoSecundario, flex: 1 }}>
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

// MB-31B remate: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  intro: { color: t.textoSecundario, lineHeight: 19, marginBottom: Spacing.sm },
  sectionTitle: {
    // Regla 1 del manual: el lima nunca es texto en claro → teal calibrado.
    color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto,
    fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 3, marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: t.card, borderRadius: Radius.card,
    borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  rowName: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  rowWeight: { color: t.textoTenue, marginTop: 1 },
  mandatoryNote: { color: t.textoSecundario, lineHeight: 19 },
});
