/**
 * Glucose Log — Registro de glucosa en sangre con contexto y rangos visuales.
 *
 * Permite registrar valor mg/dL, contexto (ayuno/pre/post/random/bedtime),
 * relacionar con tipo de comida, y ver historial de hoy con colores semánticos.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert, DeviceEventEmitter } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { haptic } from '@/src/utils/haptics';
import { warn as logWarn } from '@/src/lib/logger';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { ORB_SAFE_BOTTOM } from '@/src/components/argos/ArgosFloatingButton';
import { awardBooleanElectron } from '@/src/services/electron-service';
import { userErrorMessage } from '@/src/utils/user-error';
import { resumenVentana, gki, type ResumenVentana } from '@/src/services/salud/metabolic-stats-core';
import {
  classifyGlucose, glucoseContextName, parseGlucoseInput,
  GLUCOSE_MIN_MG_DL, GLUCOSE_MAX_MG_DL, type GlucoseEstado, type GlucoseContextId,
} from '@/src/services/salud/glucose-core';
import {
  fetchGlucoseLogsForDate, fetchGlucoseWindowPoints, fetchBloodKetoneForDate,
  insertGlucoseLog, type GlucoseLogRow,
} from '@/src/services/salud/glucose-service';

// Solo el icono es presentación: el nombre visible de cada contexto vive en
// glucose-core (GLUCOSE_CONTEXT_NAMES), que es la fuente única.
const CONTEXT_ICONS: { id: GlucoseContextId; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'fasting',       icon: 'moon-outline' },
  { id: 'pre_meal',      icon: 'restaurant-outline' },
  { id: 'post_meal_1h',  icon: 'timer-outline' },
  { id: 'post_meal_2h',  icon: 'time-outline' },
  { id: 'random',        icon: 'shuffle-outline' },
  { id: 'bedtime',       icon: 'bed-outline' },
];

// El criterio clínico vive en glucose-core; aquí solo se le pone color.
// Mismos hexes de siempre: bajo/alto en rojo, elevado en ámbar, normal en lima.
const ESTADO_COLOR: Record<GlucoseEstado, string> = {
  bajo:    '#ef4444',
  normal:  '#a8e02a',
  elevado: '#fbbf24',
  alto:    '#ef4444',
};

function getGlucoseStatus(value: number, context: string) {
  const { estado, label } = classifyGlucose(value, context);
  return { label, color: ESTADO_COLOR[estado] };
}

export default function GlucoseLogScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-31B2: tokens del tema (oscuro idéntico al de siempre; claro = acero).
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);

  const [value, setValue] = useState('');
  const [context, setContext] = useState('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [todayLogs, setTodayLogs] = useState<GlucoseLogRow[]>([]);
  // MB-29 P5: la bitácora devuelve — ventanas de 7/30 días + GKI del día.
  const [stats7, setStats7] = useState<ResumenVentana | null>(null);
  const [stats30, setStats30] = useState<ResumenVentana | null>(null);
  const [ketoneHoy, setKetoneHoy] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    const today = getLocalToday();
    const uid = user.id;
    // MB-8 Track B: un 400 no es "sin mediciones" — el fail-soft vive en el servicio.
    fetchGlucoseLogsForDate(uid, today).then(setTodayLogs);
    // MB-29 P5: 30 días para las ventanas; sin stats ≠ sin registro.
    fetchGlucoseWindowPoints(uid, today, 30).then((puntos) => {
      setStats7(resumenVentana(puntos, 7, today));
      setStats30(resumenVentana(puntos, 30, today));
    });
    // GKI del día: la última cetona en SANGRE de hoy (la glucosa sale de
    // todayLogs al render). Sin cetonas de hoy, el GKI no se inventa.
    fetchBloodKetoneForDate(uid, today).then(setKetoneHoy);
  }, [user?.id]));

  const handleSave = async () => {
    const numValue = parseGlucoseInput(value);
    if (numValue === null) {
      Alert.alert('Valor inválido', `Ingresa un valor entre ${GLUCOSE_MIN_MG_DL} y ${GLUCOSE_MAX_MG_DL} mg/dL`);
      return;
    }
    if (!user?.id) return;
    const uid = user.id;

    setSaving(true);
    try {
      // REG-7: fecha local (regla técnica #3). `now.toISOString().split('T')[0]`
      // devuelve la fecha en UTC — en zonas horarias negativas un registro
      // de la noche se persiste como el día siguiente. La hora SÍ se deriva
      // de la hora local del dispositivo (localTimeHHMMSS en el core).
      const today = getLocalToday();
      await insertGlucoseLog({
        userId: uid,
        date: today,
        value: numValue,
        context,
        notes: notes || null,
      });

      haptic.success();
      setValue('');
      setNotes('');

      // Electrón
      try { await awardBooleanElectron(uid, 'glucose_log'); DeviceEventEmitter.emit('electrons_changed'); } catch (e) { logWarn('[glucose-log] award electron failed', e); }

      // Refresh (misma fecha local).
      setTodayLogs(await fetchGlucoseLogsForDate(uid, today));
    } catch (err: any) {
      Alert.alert('Error', userErrorMessage(err, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const numVal = parseInt(value, 10) || 0;
  const previewStatus = numVal > 0 ? getGlucoseStatus(numVal, context) : null;

  return (
    <Screen keyboard themed>
      <PillarHeader pillar="nutrition" title="Glucosa" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Valor */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.card}>
          <EliteText style={s.label}>VALOR (mg/dL)</EliteText>
          <View style={s.valueRow}>
            <TextInput
              style={s.valueInput}
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              placeholder="95"
              placeholderTextColor={t.sinDatos}
              maxLength={3}
            />
            {previewStatus && (
              /* Manual 3.9: en claro el semáforo es RELLENO con negro encima
                 (el lima/ámbar como letra sobre acero no se leen); en oscuro
                 sigue el tinte translúcido de siempre. */
              <View style={[s.statusBadge, t.kind === 'dark'
                ? { backgroundColor: `${previewStatus.color}20`, borderColor: `${previewStatus.color}40` }
                : { backgroundColor: previewStatus.color, borderColor: previewStatus.color }]}>
                <EliteText style={[s.statusText, { color: t.kind === 'dark' ? previewStatus.color : TEXT_COLORS.onAccent }]}>{previewStatus.label}</EliteText>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Contexto */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={s.card}>
          <EliteText style={s.label}>CONTEXTO</EliteText>
          <View style={s.contextRow}>
            {CONTEXT_ICONS.map(c => (
              <AnimatedPressable
                key={c.id}
                onPress={() => { haptic.light(); setContext(c.id); }}
                style={[s.contextPill, context === c.id && s.contextPillActive]}
              >
                <Ionicons name={c.icon} size={14} color={context === c.id ? TEXT_COLORS.onAccent : t.textoSecundario} />
                <EliteText style={[s.contextText, context === c.id && s.contextTextActive]}>{glucoseContextName(c.id)}</EliteText>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        {/* Notas */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={s.card}>
          <EliteText style={s.label}>NOTAS (opcional)</EliteText>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Después de tacos..."
            placeholderTextColor={t.sinDatos}
            multiline
          />
        </Animated.View>

        {/* Guardar */}
        <AnimatedPressable onPress={handleSave} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.5 }]}>
          <EliteText style={s.saveBtnText}>{saving ? 'GUARDANDO…' : 'GUARDAR'}</EliteText>
        </AnimatedPressable>

        {/* Historial de hoy */}
        {todayLogs.length > 0 && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={{ marginTop: Spacing.lg }}>
            <SectionTitle>HISTORIAL DE HOY</SectionTitle>
            {todayLogs.map((log) => {
              const st = getGlucoseStatus(log.value_mg_dl, log.context ?? 'random');
              const ctxName = glucoseContextName(log.context);
              return (
                <View key={log.id} style={s.logRow}>
                  <EliteText style={s.logTime}>{log.time?.substring(0, 5)}</EliteText>
                  <EliteText style={s.logCtx}>{ctxName}</EliteText>
                  {/* En claro el color viaja en el punto (relleno), no en la letra. */}
                  <EliteText style={[s.logValue, { color: t.kind === 'dark' ? st.color : t.texto }]}>{log.value_mg_dl} mg/dL</EliteText>
                  <View style={[s.logDot, { backgroundColor: st.color }]} />
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* MB-29 P5: tendencia, no bitácora — ventanas 7/30d + GKI del día. */}
        {(stats7 || stats30) && (
          <Animated.View entering={FadeInUp.delay(250).springify()} style={{ marginTop: Spacing.lg }}>
            <SectionTitle>TU TENDENCIA</SectionTitle>
            <View style={s.card}>
              {stats7 && (
                <View style={s.trendRow}>
                  <EliteText style={s.trendLabel}>7 días</EliteText>
                  <EliteText style={s.trendValue}>{stats7.avg} mg/dL</EliteText>
                  <EliteText style={s.trendMeta}>{stats7.min} a {stats7.max} · {stats7.n} lecturas</EliteText>
                </View>
              )}
              {stats30 && (
                <View style={s.trendRow}>
                  <EliteText style={s.trendLabel}>30 días</EliteText>
                  <EliteText style={s.trendValue}>{stats30.avg} mg/dL</EliteText>
                  <EliteText style={s.trendMeta}>{stats30.min} a {stats30.max} · {stats30.n} lecturas</EliteText>
                </View>
              )}
              {(() => {
                const g = gki(todayLogs[0]?.value_mg_dl ?? null, ketoneHoy);
                return g != null ? (
                  <View style={[s.trendRow, { borderBottomWidth: 0 }]}>
                    <EliteText style={s.trendLabel}>GKI hoy</EliteText>
                    <EliteText style={s.trendValue}>{g}</EliteText>
                    <EliteText style={s.trendMeta}>glucosa entre cetonas, con tus registros de hoy</EliteText>
                  </View>
                ) : null;
              })()}
            </View>
            {/* Decisión del recorrido (#19): la intención a la vista, sin fecha. */}
            <EliteText style={s.cgmSoon}>Monitor continuo de glucosa: próximamente.</EliteText>
          </Animated.View>
        )}

        <View style={{ height: 80 }} />
        <MedicalDisclaimer feature="glucose" />
      </ScrollView>
    </Screen>
  );
}

// MB-31B2: los estilos leen los tokens del tema (patrón buildVariants de
// EliteText). En oscuro los valores compuestos quedan como siempre.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: ORB_SAFE_BOTTOM },

  card: {
    backgroundColor: t.hundido,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  // MB-29 P5: filas de tendencia (7/30 días + GKI)
  trendRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.borde,
  },
  trendLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: t.textoSecundario,
    letterSpacing: 2,
  },
  trendValue: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: t.texto,
    marginTop: 2,
  },
  trendMeta: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: t.textoSecundario,
    marginTop: 1,
  },
  cgmSoon: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: t.textoTenue,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  label: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: t.textoSecundario,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  valueInput: {
    flex: 1,
    fontSize: 48,
    fontFamily: Fonts.extraBold,
    color: t.texto,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },

  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    // Vidrio del kit (Card glass): translúcido claro sobre acero.
    backgroundColor: t.kind === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)',
    borderWidth: 0.5,
    borderColor: t.kind === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,21,24,0.08)',
  },
  contextPillActive: {
    backgroundColor: '#fb923c',
    borderColor: '#fb923c',
  },
  contextText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: t.textoSecundario,
  },
  contextTextActive: { color: TEXT_COLORS.onAccent },

  notesInput: {
    color: t.texto,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    minHeight: 48,
    textAlignVertical: 'top',
  },

  saveBtn: {
    backgroundColor: '#fb923c',
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.onAccent,
    letterSpacing: 2,
  },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: t.borde,
  },
  logTime: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: t.textoTenue,
    width: 40,
  },
  logCtx: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: t.textoSecundario,
    flex: 1,
  },
  logValue: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
