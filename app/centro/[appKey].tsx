/**
 * La ficha de cada app (MB-22 Pieza 3) — la pantalla que no existía.
 *
 * Arriba: qué es y para qué sirve (description del registro — honesta, del
 * cuerpo, sin promesas). En medio: instalar o desinstalar, con el copy que
 * sale de installCreatesRow() — las apps sin fila no pueden prometerla, y
 * desinstalar NUNCA borra historial. Abajo: su configuración — SOLO ajustes
 * que ya existían en pantallas sueltas, movidos aquí (meta de agua, meta de
 * ayuno, recordatorio de journal, enlace a horarios de suplementos). Cero
 * ajustes inventados.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { TimeWheelPicker } from '@/src/components/ui/TimeWheelPicker';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { APP_BY_KEY, SECTION_LABELS } from '@/src/constants/app-registry';
import { FASTING_PROTOCOLS } from '@/src/constants/fasting-protocols';
import {
  getInstallPrefs, installApp, uninstallApp,
} from '@/src/services/hoy/install-service';
import { getCycleAppMode, setCycleAppMode } from '@/src/services/app-mode-service';
import type { CycleMode } from '@/src/services/cycle/cycle-access-core';
import {
  appInstallState, installAlertBody, uninstallAlertBody, installCreatesRow,
  type InstallPrefs, type InstallState,
} from '@/src/services/hoy/install-core';
import { getUserWaterGoal, setUserWaterGoal } from '@/src/services/hydration-service';
import { getFastingGoalHours, setFastingGoalHours } from '@/src/services/fasting-service';
import {
  getProteinGoalG, setProteinGoalG,
  PROTEIN_GOAL_MIN_G, PROTEIN_GOAL_MAX_G, PROTEIN_GOAL_STEP_G,
} from '@/src/services/protein-goal-service';
import { getHabitTime, setHabitTime } from '@/src/services/hoy/habit-times-service';
import { TAREA_TIME, MOMENTO_LABELS, momentoForHour, minutesFromMidnight } from '@/src/services/hoy/tareas-core';
import { electronsForApp } from '@/src/constants/electron-app-bridge';
import {
  getAppAviso, updateAppAviso, AVISO_APP_KEYS, type AvisoAppKey,
} from '@/src/services/app-avisos-service';
import type { AppAvisoPref } from '@/src/services/notification-prefs-core';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { APP_SECTION_COLORS, ATP_BRAND, TEXT, ELEVATION, withOpacity } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

const WATER_PRESETS_ML = [1500, 2000, 2500, 3000, 3500];

// MB-23 P2: el copy con dientes del paso a propio — ya existía en MB-22 y es
// la única puerta por la que un calendario acompañante se vuelve TU ciclo.
const CICLO_A_PROPIO_BODY =
  'Todo lo registrado en este calendario contará como TU ciclo: fases, predicción y tu contexto de salud. Confirma solo si este calendario es tuyo.';

export default function FichaAppScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { appKey } = useLocalSearchParams<{ appKey: string }>();
  const app = typeof appKey === 'string' ? APP_BY_KEY[appKey] : undefined;

  const [installPrefs, setInstallPrefs] = useState<InstallPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  // MB-22 P4: solo para la ficha de Ciclo — sexo + modo deciden el flujo.
  const [ciclo, setCiclo] = useState<{ isFemale: boolean; mode: CycleMode | null } | null>(null);

  const esCiclo = app?.key === 'ciclo';

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setInstallPrefs(await getInstallPrefs(user.id));
    if (esCiclo) {
      try {
        const [{ data }, mode] = await Promise.all([
          supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle(),
          getCycleAppMode(user.id),
        ]);
        setCiclo({ isFemale: (data as any)?.biological_sex === 'female', mode });
      } catch {
        setCiclo({ isFemale: false, mode: null });
      }
    }
  }, [user?.id, esCiclo]);
  useEffect(() => { refresh(); }, [refresh]);

  // Llave desconocida (deep link viejo o typo): fuera, sin inventar pantalla.
  useEffect(() => {
    if (appKey && !app) {
      if (router.canGoBack()) router.back();
      else router.replace('/centro');
    }
  }, [appKey, app, router]);

  if (!app) return <Screen><StatusBar style="light" /></Screen>;

  const color = APP_SECTION_COLORS[app.section];
  const state: InstallState = installPrefs ? appInstallState(app.key, installPrefs) : 'no';
  // MB-23 P2: el modo acompañante se retiró — Ciclo se instala SOLO en modo
  // propio, y propio exige perfil femenino (el predicado de salud). La fila
  // 'acompanante' que dejó MB-22 se respeta: detecta el estado legacy.
  const cicloAcompLegacy = esCiclo
    ? (ciclo?.mode ?? (ciclo?.isFemale ? 'propio' : 'acompanante')) === 'acompanante'
    : false;
  const cicloInstalable = !esCiclo || (ciclo?.isFemale ?? false);
  const creaFila = installCreatesRow(app.key) && !(cicloAcompLegacy && state === 'instalada');

  const doInstall = async () => {
    if (!user?.id) return;
    // MB-27 V3 (doctrina): el techo murió como límite — instalar es
    // instalar, cero fricción. El conteo de renglones vive en HOY como
    // información siempre visible y la salida en /ordenar-dia. (B2 sigue
    // vivo en el CONTEO: habitosQueEnciende es la lista que se enciende.)
    confirmarInstalar();
  };

  const confirmarInstalar = () => {
    if (!user?.id) return;
    // Ciclo con fila acompañante heredada: instalar ES pasar a propio, y ese
    // cambio tiene dientes — usa el copy de siempre y exige confirmación.
    const body = esCiclo && cicloAcompLegacy ? CICLO_A_PROPIO_BODY : installAlertBody(app.key);
    Alert.alert(`Instalar ${app.label}`, body, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Instalar',
        onPress: async () => {
          setBusy(true);
          haptic.success();
          // Ciclo: el modo queda EXPLÍCITO al instalar. Si venía de
          // acompañante, el paso a propio debe quedar escrito ANTES de
          // encender el electrón; para female sin fila es backfill-friendly.
          if (esCiclo) {
            const mr = await setCycleAppMode(user.id, 'propio');
            if (!mr.ok && cicloAcompLegacy) {
              setBusy(false);
              Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.');
              return;
            }
          }
          const r = await installApp(user.id, app.key);
          setBusy(false);
          if (!r.ok) { Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.'); return; }
          refresh();
        },
      },
    ]);
  };

  const doUninstall = () => {
    if (!user?.id) return;
    Alert.alert(`Desinstalar ${app.label}`, uninstallAlertBody(app.key), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desinstalar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          haptic.medium();
          const r = await uninstallApp(user.id, app.key);
          setBusy(false);
          if (!r.ok) { Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.'); return; }
          refresh();
        },
      },
    ]);
  };

  return (
    <Screen>
      <StatusBar style="light" />
      <ScreenHeader title={app.label} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Qué es y para qué sirve */}
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.hero}>
          <View style={[s.heroIcon, { backgroundColor: withOpacity(color, 0.10), borderColor: withOpacity(color, 0.22) }]}>
            <AppIcon name={app.icon} size={34} color={color} />
          </View>
          <View style={s.heroBody}>
            <EliteText style={s.heroTitle}>{app.label}</EliteText>
            <EliteText style={[s.heroSection, { color }]}>
              {SECTION_LABELS[app.section].toUpperCase()}
            </EliteText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).springify()}>
          {app.description ? (
            <EliteText style={s.description}>{app.description}</EliteText>
          ) : (
            // Honestidad antes que relleno: sin copy aprobado no se inventa.
            <EliteText style={s.descriptionMissing}>Descripción en camino.</EliteText>
          )}
        </Animated.View>

        {/* MB-23 P2: el modo acompañante se retiró — dos registros del mismo
            cuerpo y el tecleado a mano siempre va a estar mal. Quien lo tenía
            instalado conserva TODOS sus registros y ve dos puertas: usarlo
            como su ciclo (solo usuarias, con confirmación) o desinstalar. */}
        {esCiclo && cicloAcompLegacy && state === 'instalada' && (
          <CicloRetiroAcomp
            userId={user?.id}
            isFemale={ciclo?.isFemale ?? false}
            onChanged={refresh}
          />
        )}

        {/* Instalar / desinstalar */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          {state === 'fija' ? (
            <View style={s.fijaCard}>
              <Ionicons name="lock-closed-outline" size={15} color={TEXT.tertiary} />
              <EliteText style={s.fijaText}>
                Parte del núcleo: siempre está en tu cuadrícula.
              </EliteText>
            </View>
          ) : state === 'instalada' ? (
            <AnimatedPressable style={s.uninstallBtn} onPress={doUninstall} disabled={busy || !installPrefs}>
              <EliteText style={s.uninstallText}>Desinstalar</EliteText>
            </AnimatedPressable>
          ) : !cicloInstalable ? (
            // Ciclo sin perfil femenino: no hay nada que instalar. El registro
            // de ciclo es de quien lo vive; asomarse al de otra persona, con
            // su permiso, es otro proyecto — aquí no se promete.
            <View style={s.fijaCard}>
              <Ionicons name="information-circle-outline" size={15} color={TEXT.tertiary} />
              <EliteText style={s.fijaText}>
                Ciclo se instala solo para registrar tu propio ciclo.
              </EliteText>
            </View>
          ) : (
            <AnimatedPressable
              style={[s.installBtn, { backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderColor: withOpacity(ATP_BRAND.lime, 0.4) }]}
              onPress={doInstall}
              disabled={busy || !installPrefs}
            >
              <Ionicons name="add" size={16} color={ATP_BRAND.lime} />
              <EliteText style={s.installText}>Instalar en mi cuadrícula</EliteText>
            </AnimatedPressable>
          )}
          {/* La verdad por clase de app: cuatro no generan fila y no la prometen. */}
          {state !== 'fija' && (state === 'instalada' || cicloInstalable) && (
            <EliteText style={s.rowNote}>
              {creaFila
                ? 'Instalada, su hábito vive también en TAREAS.'
                : 'Su registro vive dentro de la app: no agrega fila en TAREAS.'}
            </EliteText>
          )}
          {(state === 'instalada' || cicloInstalable) && (
            <EliteText style={s.dataNote}>
              Desinstalar nunca borra tu historial. Si la reinstalas, tu historia sigue ahí.
            </EliteText>
          )}
        </Animated.View>

        {/* Abrir */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <AnimatedPressable
            style={s.openRow}
            onPress={() => { haptic.light(); router.push(app.route); }}
          >
            <Ionicons name="open-outline" size={16} color={TEXT.secondary} />
            <EliteText style={s.openText}>Abrir {app.label}</EliteText>
            <Ionicons name="chevron-forward" size={15} color={TEXT.muted} />
          </AnimatedPressable>
        </Animated.View>

        {/* Configuración — solo lo que ya existía, movido aquí. */}
        {app.key === 'hidratacion' && <ConfigHidratacion userId={user?.id} />}
        {app.key === 'ayuno' && <ConfigAyuno userId={user?.id} />}
        {/* MB-23 P4: la meta de proteína perdió su editor cuando murió ATP
            PROTOCOLOS (2026-07-14) — vuelve aquí, sobre la misma fuente
            (goals.protein_goal_g) que leen HOY y adherencia. */}
        {app.key === 'comida' && <ConfigProteina userId={user?.id} />}
        {app.key === 'suplementos' && (
          <ConfigLinkRow
            label="Fichas y horarios de toma"
            hint="Cada suplemento lleva su momento del día u hora exacta; se editan en su propia pantalla. Sus avisos de toma viajan con la agenda."
            onPress={() => { haptic.light(); router.push('/supplements'); }}
          />
        )}

        {/* MB-23 P4: en qué momento del día vive el hábito — la hora canónica
            estaba en el código y nadie podía moverla. Solo apps cuyo hábito
            es UN electrón con hora canónica. */}
        {(() => {
          const conHora = electronsForApp(app.key).filter((src) => TAREA_TIME[src]);
          return conHora.length === 1
            ? <ConfigHorario userId={user?.id} source={conHora[0]} />
            : null;
        })()}

        {/* MB-23 P3: los avisos de la ficha — si avisa, a qué hora y bajo qué
            condición. V1: hora fija + "solo si no lo has hecho hoy", para las
            apps cuyo hecho/no-hecho es un electrón del día. */}
        {(AVISO_APP_KEYS as string[]).includes(app.key) && (
          <ConfigAviso userId={user?.id} appKey={app.key as AvisoAppKey} />
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración por app — cada bloque lee y escribe LA MISMA fuente que la
// pantalla original (hydration-service, fasting-service, journal-reminder).
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitleText({ children }: { children: string }) {
  return <EliteText style={s.configTitle}>{children.toUpperCase()}</EliteText>;
}

/**
 * MB-23 P2: el modo acompañante se retiró. Este bloque existe SOLO para quien
 * ya lo tenía instalado, y no borra nada:
 *  · Usuarias: pueden reclamar el calendario como propio — con el copy con
 *    dientes de siempre y confirmación explícita. Confirmar reinstala en
 *    propio (enciende el electrón de TAREAS).
 *  · Si el calendario no es suyo, la salida es Desinstalar (el botón de
 *    siempre): la app sale de la cuadrícula y los registros quedan intactos.
 * La fila de user_app_modes NO se toca al desinstalar: la usará el proyecto
 * de permisos, y los blindajes (canAccessCycle, period_log, getCycleReport)
 * siguen protegiendo mientras diga 'acompanante'.
 */
function CicloRetiroAcomp({ userId, isFemale, onChanged }: {
  userId?: string;
  isFemale: boolean;
  onChanged: () => void;
}) {
  const usarComoPropio = () => {
    if (!userId) return;
    Alert.alert('Usar como mi ciclo', CICLO_A_PROPIO_BODY, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Es mi ciclo',
        onPress: async () => {
          haptic.medium();
          const mr = await setCycleAppMode(userId, 'propio');
          if (!mr.ok) { Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.'); return; }
          // Reinstalar en propio enciende el electrón de TAREAS. El
          // historial no se toca jamás.
          await uninstallApp(userId, 'ciclo');
          await installApp(userId, 'ciclo');
          onChanged();
        },
      },
    ]);
  };

  return (
    <Animated.View entering={FadeInUp.delay(100).springify()}>
      <SectionTitleText>Modo acompañante</SectionTitleText>
      <View style={s.configCard}>
        <EliteText style={s.modeDesc}>
          El modo acompañante se retiró: llevar a mano el calendario de otra
          persona duplica un registro que no es tuyo. Todos tus registros se
          conservan tal cual.
        </EliteText>
        {isFemale && (
          <AnimatedPressable style={s.claimBtn} onPress={usarComoPropio}>
            <EliteText style={s.claimText}>Usar como mi ciclo</EliteText>
          </AnimatedPressable>
        )}
        <EliteText style={s.configHint}>
          {isFemale
            ? 'Si este calendario no es tuyo, desinstala la app: nada se borra.'
            : 'Para dejarlo, desinstala la app: nada se borra.'}
        </EliteText>
      </View>
    </Animated.View>
  );
}

function ConfigHidratacion({ userId }: { userId?: string }) {
  const [goal, setGoal] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    getUserWaterGoal(userId).then(setGoal);
  }, [userId]);

  const apply = async (ml: number) => {
    if (!userId) return;
    haptic.light();
    setGoal(ml);
    try {
      await setUserWaterGoal(userId, ml);
    } catch {
      Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.');
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(180).springify()}>
      <SectionTitleText>Meta de agua</SectionTitleText>
      <View style={s.configCard}>
        <EliteText style={s.configValue}>
          {goal != null ? `${goal} ml al día` : '…'}
        </EliteText>
        <View style={s.chipRow}>
          {WATER_PRESETS_ML.map((ml) => (
            <AnimatedPressable
              key={ml}
              style={[s.chip, goal === ml && s.chipActive]}
              onPress={() => apply(ml)}
            >
              <EliteText style={[s.chipText, goal === ml && s.chipTextActive]}>
                {ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`}
              </EliteText>
            </AnimatedPressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function ConfigAyuno({ userId }: { userId?: string }) {
  const [hours, setHours] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    getFastingGoalHours(userId).then(setHours);
  }, [userId]);

  const apply = async (h: number) => {
    if (!userId) return;
    haptic.light();
    setHours(h);
    const ok = await setFastingGoalHours(userId, h);
    if (!ok) Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.');
  };

  return (
    <Animated.View entering={FadeInUp.delay(180).springify()}>
      <SectionTitleText>Meta de ayuno</SectionTitleText>
      <View style={s.configCard}>
        <EliteText style={s.configValue}>
          {hours != null
            ? `${FASTING_PROTOCOLS.find((p) => p.hours === hours)?.label ?? `${hours} h`} · ${hours} horas`
            : '…'}
        </EliteText>
        <View style={s.chipRow}>
          {FASTING_PROTOCOLS.map((p) => (
            <AnimatedPressable
              key={p.id}
              style={[s.chip, hours === p.hours && s.chipActive]}
              onPress={() => apply(p.hours)}
            >
              <EliteText style={[s.chipText, hours === p.hours && s.chipTextActive]}>
                {p.label}
              </EliteText>
            </AnimatedPressable>
          ))}
        </View>
        <EliteText style={s.configHint}>
          Es la meta con la que arranca tu próximo ayuno. Un ayuno en curso se
          ajusta desde su timer, que corre el chequeo de seguridad.
        </EliteText>
      </View>
    </Animated.View>
  );
}

/**
 * MB-23 P3: la sección de avisos de la ficha — si avisa, a qué hora y bajo
 * qué condición. La decisión final NO vive aquí: el interruptor general y
 * las horas de silencio de Ajustes mandan (planAppAviso, core con test).
 * Para journal reemplaza al viejo ConfigJournal (el recordatorio legacy se
 * importa solo, una vez, en el primer sync).
 */
function ConfigAviso({ userId, appKey }: { userId?: string; appKey: AvisoAppKey }) {
  const [pref, setPref] = useState<AppAvisoPref | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getAppAviso(userId, appKey).then(setPref);
  }, [userId, appKey]);

  if (!pref) return null;

  const apply = async (patch: Partial<AppAvisoPref>) => {
    if (!userId) return;
    const prev = pref;
    setPref({ ...pref, ...patch });
    const r = await updateAppAviso(userId, appKey, patch);
    if (!r.ok) {
      setPref(prev);
      Alert.alert(
        r.reason === 'permission' ? 'Permiso necesario' : 'No se pudo',
        r.reason === 'permission'
          ? 'Necesitamos permiso de notificaciones para avisarte.'
          : 'Inténtalo de nuevo en un momento.',
      );
      return;
    }
    haptic.success();
  };

  return (
    <Animated.View entering={FadeInUp.delay(180).springify()}>
      <SectionTitleText>Avisos</SectionTitleText>
      <View style={s.configCard}>
        <View style={s.switchRow}>
          <EliteText style={s.switchLabel}>Aviso diario</EliteText>
          <Switch
            value={pref.enabled}
            onValueChange={(v) => apply({ enabled: v })}
            trackColor={{ true: ATP_BRAND.teal, false: '#333' }}
            thumbColor="#fff"
          />
        </View>
        {pref.enabled && (
          <>
            <AnimatedPressable
              style={s.timeRow}
              onPress={() => { haptic.light(); setPickerOpen(true); }}
            >
              <EliteText style={s.switchLabel}>Hora</EliteText>
              <EliteText style={s.timeValue}>{pref.time}</EliteText>
              <Ionicons name="chevron-forward" size={15} color={TEXT.muted} />
            </AnimatedPressable>
            <View style={[s.switchRow, s.timeRow]}>
              <EliteText style={s.switchLabel}>Solo si no lo has hecho</EliteText>
              <Switch
                value={pref.condition === 'not_done_today'}
                onValueChange={(v) => apply({ condition: v ? 'not_done_today' : 'always' })}
                trackColor={{ true: ATP_BRAND.teal, false: '#333' }}
                thumbColor="#fff"
              />
            </View>
          </>
        )}
        <EliteText style={s.configHint}>
          El interruptor general y las horas de silencio de Ajustes mandan:
          si están apagados o en silencio, este aviso también se calla.
        </EliteText>
      </View>
      <TimeWheelPicker
        visible={pickerOpen}
        initialValue={(() => {
          const d = new Date();
          d.setHours(parseInt(pref.time.split(':')[0]), parseInt(pref.time.split(':')[1]), 0, 0);
          return d;
        })()}
        title="Hora del aviso"
        onConfirm={(date: Date) => {
          const t = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          setPickerOpen(false);
          apply({ time: t });
        }}
        onCancel={() => setPickerOpen(false)}
      />
    </Animated.View>
  );
}

/**
 * MB-23 P4: el editor de la meta de proteína — el stepper del viejo
 * protocol-config (±10 g, piso 50), sobre la fuente de siempre
 * (goals.protein_goal_g). setProteinGoalG emite day_changed: HOY la refleja.
 */
function ConfigProteina({ userId }: { userId?: string }) {
  const [grams, setGrams] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    getProteinGoalG(userId).then(setGrams);
  }, [userId]);

  const apply = async (next: number) => {
    if (!userId || grams == null) return;
    const clamped = Math.max(PROTEIN_GOAL_MIN_G, Math.min(PROTEIN_GOAL_MAX_G, next));
    if (clamped === grams) return;
    haptic.light();
    const prev = grams;
    setGrams(clamped);
    const ok = await setProteinGoalG(userId, clamped);
    if (!ok) {
      setGrams(prev);
      Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.');
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(180).springify()}>
      <SectionTitleText>Meta de proteína</SectionTitleText>
      <View style={s.configCard}>
        <View style={s.stepperRow}>
          <AnimatedPressable
            style={[s.stepBtn, grams != null && grams <= PROTEIN_GOAL_MIN_G && { opacity: 0.35 }]}
            onPress={() => grams != null && apply(grams - PROTEIN_GOAL_STEP_G)}
          >
            <Ionicons name="remove" size={18} color={TEXT.primary} />
          </AnimatedPressable>
          <EliteText style={s.stepperValue}>
            {grams != null ? `${grams} g al día` : '…'}
          </EliteText>
          <AnimatedPressable
            style={[s.stepBtn, grams != null && grams >= PROTEIN_GOAL_MAX_G && { opacity: 0.35 }]}
            onPress={() => grams != null && apply(grams + PROTEIN_GOAL_STEP_G)}
          >
            <Ionicons name="add" size={18} color={TEXT.primary} />
          </AnimatedPressable>
        </View>
        <EliteText style={s.configHint}>
          La meta que ves en HOY y en tu adherencia. Se registra en la app,
          aquí solo se ajusta el objetivo.
        </EliteText>
      </View>
    </Animated.View>
  );
}

/**
 * MB-23 P4: en qué momento del día vive el hábito. La hora manda: moverla
 * cambia el bloque (mañana/tarde/noche) de su fila en TAREAS y su lugar en
 * la lente AGENDA. Override en goals.habit_times; sin él, la canónica.
 */
function ConfigHorario({ userId, source }: { userId?: string; source: string }) {
  const [time, setTime] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getHabitTime(userId, source).then(setTime);
  }, [userId, source]);

  if (!time) return null;

  const momento = momentoForHour(Math.floor(minutesFromMidnight(time) / 60));

  const confirm = async (date: Date) => {
    if (!userId) return;
    const t = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    setPickerOpen(false);
    const prev = time;
    setTime(t);
    const ok = await setHabitTime(userId, source, t);
    if (!ok) {
      setTime(prev);
      Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.');
      return;
    }
    haptic.success();
  };

  return (
    <Animated.View entering={FadeInUp.delay(180).springify()}>
      <SectionTitleText>Momento del día</SectionTitleText>
      <View style={s.configCard}>
        <AnimatedPressable
          style={s.switchRow}
          onPress={() => { haptic.light(); setPickerOpen(true); }}
        >
          <EliteText style={s.switchLabel}>Hora</EliteText>
          <EliteText style={s.timeValue}>{time} · {MOMENTO_LABELS[momento]}</EliteText>
          <Ionicons name="chevron-forward" size={15} color={TEXT.muted} style={{ marginLeft: 8 }} />
        </AnimatedPressable>
        <EliteText style={s.configHint}>
          Mueve la hora y su tarea cambia de bloque en HOY y de lugar en la
          agenda del día.
        </EliteText>
      </View>
      <TimeWheelPicker
        visible={pickerOpen}
        initialValue={(() => {
          const d = new Date();
          d.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0, 0);
          return d;
        })()}
        title="Momento del día"
        onConfirm={confirm}
        onCancel={() => setPickerOpen(false)}
      />
    </Animated.View>
  );
}

function ConfigLinkRow({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInUp.delay(180).springify()}>
      <SectionTitleText>Configuración</SectionTitleText>
      <AnimatedPressable style={s.configCard} onPress={onPress}>
        <View style={s.switchRow}>
          <EliteText style={s.switchLabel}>{label}</EliteText>
          <Ionicons name="chevron-forward" size={15} color={TEXT.muted} />
        </View>
        <EliteText style={s.configHint}>{hint}</EliteText>
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Spacing.md },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: { flex: 1 },
  heroTitle: { color: TEXT.primary, fontFamily: Fonts.extraBold, fontSize: 22 },
  heroSection: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 2, marginTop: 2 },

  description: {
    color: TEXT.secondary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  descriptionMissing: {
    color: TEXT.muted,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },

  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  installText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  uninstallBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  uninstallText: { color: '#ef4444', fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  fijaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: 14,
    padding: 12,
  },
  fijaText: { flex: 1, color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, lineHeight: 17 },
  rowNote: {
    color: TEXT.tertiary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
    lineHeight: 17,
  },
  dataNote: {
    color: TEXT.muted,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    marginTop: 4,
    lineHeight: 17,
  },

  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: Spacing.md,
  },
  openText: { flex: 1, color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  configTitle: {
    color: TEXT.tertiary,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  configCard: {
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: 14,
    padding: 12,
  },
  configValue: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.sm, marginBottom: 10 },
  configHint: {
    color: TEXT.muted,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 0.5,
    backgroundColor: ELEVATION[2].bg,
    borderColor: ELEVATION[2].border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: 'rgba(168,224,42,0.14)', borderColor: 'rgba(168,224,42,0.45)' },
  chipText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  chipTextActive: { color: ATP_BRAND.lime },

  modeDesc: { color: TEXT.tertiary, fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 16, marginTop: 1 },
  claimBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
    borderWidth: 0.5,
    marginTop: 12,
    backgroundColor: 'rgba(168,224,42,0.14)',
    borderColor: 'rgba(168,224,42,0.4)',
  },
  claimText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.sm },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ELEVATION[2].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[2].border,
  },
  stepperValue: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.md, fontVariant: ['tabular-nums'] },
  switchLabel: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: ELEVATION[1].border,
  },
  timeValue: { marginLeft: 'auto', color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
