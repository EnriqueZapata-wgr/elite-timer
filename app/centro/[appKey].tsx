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
  getInstallPrefs, installApp, installAppGridOnly, uninstallApp,
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
  getJournalReminder, setJournalReminderEnabled, setJournalReminderTime,
} from '@/src/services/journal-reminder-service';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { APP_SECTION_COLORS, ATP_BRAND, TEXT, ELEVATION, withOpacity } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

const WATER_PRESETS_ML = [1500, 2000, 2500, 3000, 3500];

// MB-22 P4: el copy de instalar Ciclo como acompañante dice TODA la verdad.
const CICLO_ACOMP_INSTALL_BODY =
  'Sigues el ciclo de otra persona: el calendario lo llevas tú, con lo que sabes. ' +
  'No se conecta con ninguna cuenta, no entra a tu Edad ATP ni a ARGOS, y no agrega fila en TAREAS.';

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
  // MB-22 P4: el modo efectivo del Ciclo — sin fila de modo, female = propio
  // (lo de siempre) y cualquier otro caso = acompañante.
  const cicloModoEfectivo: CycleMode | null = esCiclo
    ? (ciclo?.mode ?? (ciclo?.isFemale ? 'propio' : 'acompanante'))
    : null;
  const cicloAcomp = cicloModoEfectivo === 'acompanante';
  const creaFila = installCreatesRow(app.key) && !cicloAcomp;

  const doInstall = () => {
    if (!user?.id) return;
    const body = cicloAcomp ? CICLO_ACOMP_INSTALL_BODY : installAlertBody(app.key);
    Alert.alert(`Instalar ${app.label}`, body, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Instalar',
        onPress: async () => {
          setBusy(true);
          haptic.success();
          // Ciclo: el modo queda EXPLÍCITO al instalar. Para acompañante es
          // obligatorio (sin fila de modo, el gate no lo dejaría entrar);
          // para propio es backfill-friendly (female sin fila ya es propio).
          if (esCiclo && cicloModoEfectivo) {
            const mr = await setCycleAppMode(user.id, cicloModoEfectivo);
            if (!mr.ok && cicloAcomp) {
              setBusy(false);
              Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.');
              return;
            }
          }
          const r = cicloAcomp
            ? await installAppGridOnly(user.id, app.key)
            : await installApp(user.id, app.key);
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

        {/* MB-22.1 §5.2: el MODO va ANTES del botón de instalar. Una mujer
            que quiere seguir el ciclo de su hija, si instalara primero, se
            instalaría como propio y le nacería fila en TAREAS antes de poder
            corregir. Primero se decide de quién es el calendario. */}
        {esCiclo && (
          <ConfigCiclo
            userId={user?.id}
            info={ciclo}
            installed={state === 'instalada'}
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
          {state !== 'fija' && (
            <EliteText style={s.rowNote}>
              {creaFila
                ? 'Instalada, su hábito vive también en TAREAS.'
                : 'Su registro vive dentro de la app: no agrega fila en TAREAS.'}
            </EliteText>
          )}
          <EliteText style={s.dataNote}>
            Desinstalar nunca borra tu historial. Si la reinstalas, tu historia sigue ahí.
          </EliteText>
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
        {app.key === 'journal' && <ConfigJournal />}
        {app.key === 'suplementos' && (
          <ConfigLinkRow
            label="Fichas y horarios de toma"
            hint="Cada suplemento lleva su momento del día u hora exacta; se editan en su propia pantalla."
            onPress={() => { haptic.light(); router.push('/supplements'); }}
          />
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
 * MB-22 P4: el modo del Ciclo. Lo más delicado del run — cada transición
 * dice la verdad completa y ninguna borra datos:
 *  · → acompañante: nada del calendario entra a métricas de salud, y el
 *    hábito "Registrar ciclo" sale de TAREAS (uninstall+grid-only).
 *  · → propio (solo usuarias): TODO el calendario pasa a contar como su
 *    ciclo — se confirma explícito, porque es el cambio con dientes.
 */
function ConfigCiclo({ userId, info, installed, onChanged }: {
  userId?: string;
  info: { isFemale: boolean; mode: CycleMode | null } | null;
  installed: boolean;
  onChanged: () => void;
}) {
  if (!info) return null;
  const efectivo: CycleMode = info.mode ?? (info.isFemale ? 'propio' : 'acompanante');

  const cambiar = (destino: CycleMode) => {
    if (!userId || destino === efectivo) return;
    const aviso = destino === 'acompanante'
      ? 'El calendario es uno solo y tus registros no se borran. En modo acompañante nada de este calendario entra a tu Edad ATP, a ARGOS ni a tus métricas, y el hábito "Registrar ciclo" sale de TAREAS.'
      : 'Todo lo registrado en este calendario contará como TU ciclo: fases, predicción y tu contexto de salud. Confirma solo si este calendario es tuyo.';
    Alert.alert(destino === 'acompanante' ? 'Cambiar a acompañante' : 'Cambiar a propio', aviso, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cambiar',
        onPress: async () => {
          haptic.medium();
          const mr = await setCycleAppMode(userId, destino);
          if (!mr.ok) { Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.'); return; }
          if (installed) {
            // Reinstalar bajo el modo nuevo: acompañante apaga el electrón
            // (sin fila en TAREAS), propio lo vuelve a encender. El historial
            // no se toca jamás.
            await uninstallApp(userId, 'ciclo');
            if (destino === 'acompanante') await installAppGridOnly(userId, 'ciclo');
            else await installApp(userId, 'ciclo');
          }
          onChanged();
        },
      },
    ]);
  };

  const opciones: { value: CycleMode; label: string; desc: string }[] = [
    // Propio SOLO se ofrece a usuarias: el predicado de salud exige female.
    ...(info.isFemale
      ? [{ value: 'propio' as CycleMode, label: 'Propio', desc: 'Es mi ciclo. Entra a mis métricas y a mi contexto de salud, como siempre.' }]
      : []),
    { value: 'acompanante', label: 'Acompañante', desc: 'Sigo el ciclo de otra persona. Lo llevo yo, con lo que sé: sin conexión entre cuentas y fuera de mis métricas.' },
  ];

  return (
    <Animated.View entering={FadeInUp.delay(100).springify()}>
      <SectionTitleText>Modo</SectionTitleText>
      <View style={s.configCard}>
        {opciones.map((o) => {
          const activo = efectivo === o.value;
          return (
            <AnimatedPressable
              key={o.value}
              style={[s.modeRow, activo && s.modeRowActive]}
              onPress={() => cambiar(o.value)}
            >
              <Ionicons
                name={activo ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={activo ? ATP_BRAND.lime : TEXT.muted}
              />
              <View style={{ flex: 1 }}>
                <EliteText style={s.modeLabel}>{o.label}</EliteText>
                <EliteText style={s.modeDesc}>{o.desc}</EliteText>
              </View>
            </AnimatedPressable>
          );
        })}
        <EliteText style={s.configHint}>
          Lo que registras aquí lo registras tú. No se comparten datos entre
          cuentas: conectar cuentas no existe.
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

function ConfigJournal() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('21:00');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    getJournalReminder().then((r) => {
      setEnabled(r.enabled);
      setTime(r.time);
    });
  }, []);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    const r = await setJournalReminderEnabled(next, time);
    if (!r.ok) {
      Alert.alert('Permiso necesario', 'Necesitamos permiso de notificaciones para el recordatorio.');
      setEnabled(false);
      return;
    }
    if (next) haptic.success();
  };

  const confirmTime = async (date: Date) => {
    const t = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    setTime(t);
    setPickerOpen(false);
    await setJournalReminderTime(t, enabled);
    haptic.success();
  };

  return (
    <Animated.View entering={FadeInUp.delay(180).springify()}>
      <SectionTitleText>Recordatorio</SectionTitleText>
      <View style={s.configCard}>
        <View style={s.switchRow}>
          <EliteText style={s.switchLabel}>Recordatorio diario</EliteText>
          <Switch
            value={enabled}
            onValueChange={toggle}
            trackColor={{ true: ATP_BRAND.teal, false: '#333' }}
            thumbColor="#fff"
          />
        </View>
        <AnimatedPressable
          style={s.timeRow}
          onPress={() => { haptic.light(); setPickerOpen(true); }}
        >
          <EliteText style={s.switchLabel}>Hora</EliteText>
          <EliteText style={s.timeValue}>{time}</EliteText>
          <Ionicons name="chevron-forward" size={15} color={TEXT.muted} />
        </AnimatedPressable>
      </View>
      <TimeWheelPicker
        visible={pickerOpen}
        initialValue={(() => {
          const d = new Date();
          d.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0, 0);
          return d;
        })()}
        title="Hora del recordatorio"
        onConfirm={confirmTime}
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

  modeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  modeRowActive: { backgroundColor: 'rgba(168,224,42,0.06)' },
  modeLabel: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  modeDesc: { color: TEXT.tertiary, fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 16, marginTop: 1 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
