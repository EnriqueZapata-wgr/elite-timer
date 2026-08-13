/**
 * Log Cardio (MB-3.6 Bloque 3.1) — la casa COMPLETA del cardio (Ola 2
 * Fitness PR2, ANEXO_B_FITNESS §1): registro manual ULTRA-fácil + PRs por
 * distancia de la disciplina elegida + fase de importación Health
 * (?fase=importar, ex /cardio-import).
 *
 * 2 taps para el caso común: disciplina + duración → GUARDAR. Todo lo demás
 * (distancia, FC, RPE, notas) es opcional y vive plegado en "Más detalles".
 * La última sesión de la disciplina prellena la sugerencia — nada de
 * formularios largos. PRs solo se chequean si hay distancia (honesto).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput, Alert,
  KeyboardAvoidingView, Platform, DeviceEventEmitter,
  LayoutAnimation, UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, withOpacity, brandGradient } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import {
  logCardioSession,
  getLastCardioSessions,
  getCardioRecordsByDiscipline,
  formatPace,
  formatDuration,
  type CardioDiscipline,
  type CardioSession,
  type CardioRecord,
} from '@/src/services/fitness-service';
import { CardioImportFlow } from '@/src/components/training/CardioImportFlow';
import { autoSyncSiActiva } from '@/src/services/fitness/health-import-service';
import { useAuth } from '@/src/contexts/auth-context';
import { awardBooleanElectron } from '@/src/services/electron-service';
import { warn as logWarn } from '@/src/lib/logger';
import { userErrorMessage } from '@/src/utils/user-error';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DISCIPLINES: { key: CardioDiscipline; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'running',  name: 'Correr',   icon: 'walk-outline' },
  { key: 'cycling',  name: 'Ciclismo', icon: 'bicycle-outline' },
  { key: 'swimming', name: 'Natación', icon: 'water-outline' },
  { key: 'rowing',   name: 'Remo',     icon: 'boat-outline' },
];

/** Presets de duración (min) — el segundo tap del caso común. */
const DURACIONES = [15, 20, 30, 45, 60, 90];

export default function LogCardioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ discipline?: string; fase?: string }>();
  const { user } = useAuth();
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: tk } = useAppTheme();
  // Regla 1 de la guía: lima como TEXTO no sobrevive el claro → teal calibrado.
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
  const secTxt = { color: tk.textoSecundario };
  const initialDiscipline = (DISCIPLINES.find(d => d.key === params.discipline)?.key ?? 'running') as CardioDiscipline;

  const [discipline, setDiscipline] = useState<CardioDiscipline>(initialDiscipline);
  const [duracionMin, setDuracionMin] = useState<number | null>(null);
  const [customDur, setCustomDur] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  // Plegado: distancia + FC + RPE + notas
  const [masDetalles, setMasDetalles] = useState(false);
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState<'km' | 'm'>('km');
  const [hr, setHr] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [ultimas, setUltimas] = useState<Record<CardioDiscipline, CardioSession | null> | null>(null);
  // Ola 2 PR2: la fase de importación Health vive aquí (?fase=importar).
  const [modoImportar, setModoImportar] = useState(params.fase === 'importar');

  // Ola 2 PR2 (ex fitness-cardio): PRs por distancia — dato que no vive en
  // ningún otro lado.
  const [records, setRecords] = useState<Record<CardioDiscipline, CardioRecord[]> | null>(null);

  // Prellenado: la última sesión de la disciplina como sugerencia visible.
  useEffect(() => {
    getLastCardioSessions().then(setUltimas).catch(() => {});
  }, []);

  const cargarRecords = useCallback(() => {
    getCardioRecordsByDiscipline().then(setRecords).catch(() => {});
  }, []);

  // Ola 2 PR2 (ex fitness-cardio): PRs al focus + auto-sync SOLO si el
  // usuario activó el opt-in en Importar (MB-3.6 §3.2).
  useFocusEffect(useCallback(() => {
    cargarRecords();
    if (user) {
      autoSyncSiActiva(user.id).then((n) => { if (n > 0) cargarRecords(); }).catch(() => {});
    }
  }, [cargarRecords, user]));

  const ultima = ultimas?.[discipline] ?? null;

  const totalSeconds = useMemo(() => {
    if (customDur) {
      const h = parseInt(hours, 10) || 0;
      const m = parseInt(minutes, 10) || 0;
      const sec = parseInt(seconds, 10) || 0;
      return h * 3600 + m * 60 + sec;
    }
    return (duracionMin ?? 0) * 60;
  }, [customDur, duracionMin, hours, minutes, seconds]);

  const distanceMeters = useMemo(() => {
    const num = parseFloat(distance.replace(',', '.'));
    if (isNaN(num) || num <= 0) return 0;
    return unit === 'km' ? num * 1000 : num;
  }, [distance, unit]);

  const paceText = useMemo(() => {
    if (distanceMeters <= 0 || totalSeconds <= 0) return null;
    return formatPace(Math.round(totalSeconds / (distanceMeters / 1000)));
  }, [distanceMeters, totalSeconds]);

  function usarUltima() {
    if (!ultima?.duration_seconds) return;
    haptic.light();
    const min = Math.round(ultima.duration_seconds / 60);
    if (DURACIONES.includes(min)) {
      setCustomDur(false);
      setDuracionMin(min);
    } else {
      setCustomDur(true);
      setHours(String(Math.floor(ultima.duration_seconds / 3600) || ''));
      setMinutes(String(Math.floor((ultima.duration_seconds % 3600) / 60)));
      setSeconds(String(ultima.duration_seconds % 60 || ''));
    }
    if (ultima.distance_meters) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMasDetalles(true);
      if (ultima.distance_meters >= 1000) {
        setUnit('km');
        setDistance(String(Math.round((ultima.distance_meters / 1000) * 100) / 100));
      } else {
        setUnit('m');
        setDistance(String(Math.round(ultima.distance_meters)));
      }
    }
  }

  const handleSave = async () => {
    if (totalSeconds <= 0) {
      Alert.alert('Falta la duración', 'Elige cuánto duró la sesión.');
      return;
    }
    try {
      setSaving(true);
      const result = await logCardioSession({
        discipline,
        duration_seconds: totalSeconds,
        distance_meters: distanceMeters > 0 ? distanceMeters : null,
        avg_heart_rate: hr ? parseInt(hr, 10) : null,
        perceived_effort: rpe,
        notes: notes || null,
      });

      haptic.success();

      // #v13e 3.A.3: electrón de cardio + refrescar HOY (idempotente ≥1 sesión hoy).
      try {
        await awardBooleanElectron(result.session.user_id, 'cardio');
        DeviceEventEmitter.emit('electrons_changed');
        DeviceEventEmitter.emit('day_changed');
      } catch (e) {
        logWarn('[log-cardio] award electron failed', e);
      }

      if (result.newPRs.length > 0) {
        const prMsg = result.newPRs
          .map(pr => `${pr.distance_label}: ${formatTime(pr.time_seconds)}`)
          .join('\n');
        Alert.alert('¡Nuevo PR!', `Rompiste tu marca personal:\n\n${prMsg}`, [
          { text: 'Genial', onPress: () => router.back() },
        ]);
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', userErrorMessage(err, 'No se pudo guardar la sesión.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Fase de importación (Ola 2 PR2: ex /cardio-import, íntegra) ──
  if (modoImportar) {
    return <CardioImportFlow onManual={() => setModoImportar(false)} />;
  }

  return (
    <ThemeReady>
    <View style={[s.screen, { backgroundColor: tk.fondo }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Registrar Cardio" />

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1er tap: disciplina — MB-5 Bloque 3: chip activo con degradado editorial */}
          <Animated.View entering={FadeInUp.delay(40).springify()}>
            <EliteText style={[s.label, secTxt]}>DISCIPLINA</EliteText>
            <View style={s.chipsRow}>
              {DISCIPLINES.map(d => {
                const active = d.key === discipline;
                return (
                  <AnimatedPressable
                    key={d.key}
                    onPress={() => { haptic.light(); setDiscipline(d.key); }}
                    style={[s.discBtn, { backgroundColor: tk.card, borderColor: tk.borde }, active && s.chipActivoGrad]}
                  >
                    {active && (
                      <LinearGradient colors={brandGradient()} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    )}
                    <Ionicons name={d.icon} size={18} color={active ? TEXT_COLORS.onAccent : tk.textoSecundario} />
                    <EliteText style={[s.discText, secTxt, active && s.discTextActive]}>{d.name}</EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Ola 2 PR2 (ex fitness-cardio): los PRs por distancia de la
              disciplina elegida. Se quedan aquí: no viven en otro lado. */}
          {(records?.[discipline]?.length ?? 0) > 0 && (
            <Animated.View entering={FadeInUp.delay(60).springify()}>
              <EliteText style={[s.sublabel, { color: tk.textoTenue }]}>TUS RÉCORDS POR DISTANCIA</EliteText>
              <View style={s.prsRow}>
                {records![discipline].slice(0, 5).map(pr => (
                  <View key={pr.id} style={s.prChip}>
                    <EliteText style={[s.prChipLabel, secTxt]}>{pr.distance_label}</EliteText>
                    <EliteText style={[s.prChipValue, { color: acento }]}>{formatDuration(pr.best_time_seconds)}</EliteText>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Sugerencia: la última sesión de esta disciplina */}
          {ultima?.duration_seconds ? (
            <Animated.View entering={FadeInUp.delay(70).springify()}>
              <AnimatedPressable onPress={usarUltima} style={s.lastCard}>
                <Ionicons name="repeat-outline" size={16} color={ATP_BRAND.teal} />
                <EliteText style={[s.lastText, { color: tk.texto }]}>
                  La última vez: {formatDuration(ultima.duration_seconds)}
                  {ultima.distance_meters ? ` · ${(ultima.distance_meters / 1000).toFixed(2)} km` : ''} · tocar para repetir
                </EliteText>
              </AnimatedPressable>
            </Animated.View>
          ) : null}

          {/* 2º tap: duración — MB-5 Bloque 4.1: el tiempo exacto SIEMPRE
              visible (antes vivía escondido tras "Otra" y nadie lo encontraba).
              Escribir en las cajas deselecciona el preset; tocar un preset
              limpia las cajas. */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <EliteText style={[s.label, secTxt]}>DURACIÓN</EliteText>
            <View style={s.chipsRow}>
              {DURACIONES.map(min => {
                const active = !customDur && duracionMin === min;
                return (
                  <AnimatedPressable
                    key={min}
                    onPress={() => {
                      haptic.light();
                      setCustomDur(false);
                      setDuracionMin(min);
                      setHours(''); setMinutes(''); setSeconds('');
                    }}
                    style={[s.durBtn, { backgroundColor: tk.card, borderColor: tk.borde }, active && s.chipActivoGrad]}
                  >
                    {active && (
                      <LinearGradient colors={brandGradient()} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    )}
                    <EliteText style={[s.durText, secTxt, active && s.durTextActive]}>{min}′</EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>

            <EliteText style={[s.sublabel, { color: tk.textoTenue }]}>O ESCRIBE EL TIEMPO EXACTO</EliteText>
            <View style={s.timeRow}>
              <TimeBox value={hours} onChange={(v) => { setCustomDur(true); setDuracionMin(null); setHours(v); }} label="HRS" />
              <EliteText style={[s.timeColon, secTxt]}>:</EliteText>
              <TimeBox value={minutes} onChange={(v) => { setCustomDur(true); setDuracionMin(null); setMinutes(v); }} label="MIN" />
              <EliteText style={[s.timeColon, secTxt]}>:</EliteText>
              <TimeBox value={seconds} onChange={(v) => { setCustomDur(true); setDuracionMin(null); setSeconds(v); }} label="SEG" />
            </View>
          </Animated.View>

          {/* Plegado: más detalles (todo opcional) */}
          <Animated.View entering={FadeInUp.delay(140).springify()}>
            <AnimatedPressable
              onPress={() => {
                haptic.light();
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setMasDetalles(!masDetalles);
              }}
              style={[s.moreRow, { borderTopColor: tk.borde }]}
            >
              <EliteText style={[s.moreText, secTxt]}>MÁS DETALLES (OPCIONAL)</EliteText>
              <Ionicons name={masDetalles ? 'chevron-up' : 'chevron-down'} size={16} color={tk.textoSecundario} />
            </AnimatedPressable>

            {masDetalles && (
              <View>
                {/* Distancia */}
                <EliteText style={[s.sublabel, { color: tk.textoTenue }]}>DISTANCIA: con ella detectamos PRs</EliteText>
                <View style={s.row}>
                  <TextInput
                    style={[s.input, { color: tk.texto, backgroundColor: tk.hundido, borderColor: tk.borde, flex: 2 }]}
                    value={distance}
                    onChangeText={setDistance}
                    keyboardType="decimal-pad"
                    placeholder={ultima?.distance_meters ? `${(ultima.distance_meters / 1000).toFixed(2)}` : '0.00'}
                    placeholderTextColor={tk.sinDatos}
                  />
                  <View style={s.unitRow}>
                    {(['km', 'm'] as const).map(u => (
                      <AnimatedPressable
                        key={u}
                        style={[s.unitBtn, { backgroundColor: tk.hundido, borderColor: tk.borde }, unit === u && s.unitBtnActive]}
                        onPress={() => { haptic.light(); setUnit(u); }}
                      >
                        <EliteText style={[s.unitText, secTxt, unit === u && s.unitTextActive]}>{u.toUpperCase()}</EliteText>
                      </AnimatedPressable>
                    ))}
                  </View>
                </View>
                {paceText && (
                  <View style={s.paceRow}>
                    <Ionicons name="speedometer-outline" size={14} color={ATP_BRAND.lime} />
                    <EliteText style={[s.paceText, { color: acento }]}>Pace: {paceText}</EliteText>
                  </View>
                )}

                {/* FC */}
                <EliteText style={[s.sublabel, { color: tk.textoTenue }]}>FRECUENCIA CARDIACA MEDIA</EliteText>
                <View style={s.row}>
                  <TextInput
                    style={[s.input, { color: tk.texto, backgroundColor: tk.hundido, borderColor: tk.borde, flex: 1 }]}
                    value={hr}
                    onChangeText={setHr}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor={tk.sinDatos}
                    maxLength={3}
                  />
                  <EliteText style={[s.unitSuffix, secTxt]}>BPM</EliteText>
                </View>

                {/* RPE */}
                <EliteText style={[s.sublabel, { color: tk.textoTenue }]}>ESFUERZO PERCIBIDO (RPE 1-10)</EliteText>
                <View style={s.rpeRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                    <AnimatedPressable
                      key={v}
                      onPress={() => { haptic.light(); setRpe(rpe === v ? null : v); }}
                      style={[s.rpeBtn, { backgroundColor: tk.hundido, borderColor: tk.borde }, rpe === v && s.rpeBtnActive]}
                    >
                      <EliteText style={[s.rpeText, secTxt, rpe === v && s.rpeTextActive]}>{v}</EliteText>
                    </AnimatedPressable>
                  ))}
                </View>
                {rpe != null && <EliteText style={[s.rpeHint, secTxt]}>{rpeLabel(rpe)}</EliteText>}

                {/* Notas */}
                <EliteText style={[s.sublabel, { color: tk.textoTenue }]}>NOTAS</EliteText>
                <TextInput
                  style={[s.input, { color: tk.texto, backgroundColor: tk.hundido, borderColor: tk.borde }, s.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="¿Cómo te sentiste?"
                  placeholderTextColor={tk.sinDatos}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            )}
          </Animated.View>

          {/* Ola 2 PR2: la puerta a la fase de importación Health (MB-3.6
              §3.2: Strava, Garmin, Samsung y Google Fit escriben ahí). */}
          <Animated.View entering={FadeInUp.delay(180).springify()}>
            <AnimatedPressable
              style={[s.importRow, { borderColor: tk.borde }]}
              onPress={() => { haptic.light(); setModoImportar(true); }}
            >
              <Ionicons name="download-outline" size={18} color={acento} />
              <EliteText style={[s.importText, { color: acento }]}>IMPORTAR DE TU APP DE SALUD</EliteText>
            </AnimatedPressable>
          </Animated.View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Guardar — habilitado con solo disciplina + duración */}
        <View style={[s.footer, { backgroundColor: tk.fondo, borderTopColor: tk.borde }]}>
          <GradientCTA
            label={saving ? 'GUARDANDO…' : 'GUARDAR SESIÓN'}
            pillar="fitness"
            icon="checkmark"
            disabled={saving || totalSeconds <= 0}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
    </ThemeReady>
  );
}

function TimeBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  // MB-31B3: tokens del tema global (vive dentro de <ThemeReady>).
  const { tokens: tk } = useAppTheme();
  return (
    <View style={s.timeInputBox}>
      <TextInput
        style={[s.timeInput, { color: tk.texto, backgroundColor: tk.hundido, borderColor: tk.borde }]}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="00"
        placeholderTextColor={tk.sinDatos}
        maxLength={2}
      />
      <EliteText style={[s.timeLabel, { color: tk.textoSecundario }]}>{label}</EliteText>
    </View>
  );
}

// === HELPERS ===

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function rpeLabel(rpe: number): string {
  if (rpe <= 2) return 'Muy ligero: recuperación activa';
  if (rpe <= 4) return 'Ligero: calentamiento, easy run';
  if (rpe <= 6) return 'Moderado: zona aeróbica';
  if (rpe <= 7) return 'Algo duro: tempo';
  if (rpe <= 8) return 'Duro: umbral';
  if (rpe <= 9) return 'Muy duro: VO2 max';
  return 'Máximo: esfuerzo absoluto';
}

// === ESTILOS ===

const s = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },

  label: {
    fontSize: 11, fontFamily: Fonts.bold,
    letterSpacing: 2, marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  sublabel: {
    fontSize: 10, fontFamily: Fonts.bold,
    letterSpacing: 1.5, marginTop: Spacing.md, marginBottom: Spacing.xs,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // Disciplina
  discBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  // MB-5 Bloque 3: chip activo = degradado molécula (overflow clip al pill).
  chipActivoGrad: { borderColor: 'transparent', overflow: 'hidden' },
  discText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  discTextActive: { color: TEXT_COLORS.onAccent },

  // Última sesión (sugerencia)
  lastCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: withOpacity(ATP_BRAND.teal, 0.08), borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10, marginTop: Spacing.sm,
  },
  lastText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, flex: 1 },

  // Duración
  durBtn: {
    minWidth: 52, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  durText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'] },
  durTextActive: { color: TEXT_COLORS.onAccent },

  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: Spacing.md,
  },
  timeInputBox: { alignItems: 'center', gap: 4 },
  timeInput: {
    width: 64, height: 56, borderRadius: Radius.md,
    borderWidth: 0.5,
    fontFamily: Fonts.bold, fontSize: FontSizes.xxl, textAlign: 'center',
  },
  timeLabel: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1 },
  timeColon: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, paddingBottom: 16 },

  // Más detalles
  moreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.xl, paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreText: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: {
    borderRadius: Radius.md, borderWidth: 0.5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontFamily: Fonts.bold, fontSize: FontSizes.lg,
  },
  unitRow: { flexDirection: 'row', gap: 6 },
  unitBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm,
    borderWidth: 0.5,
  },
  unitBtnActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  unitText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  unitTextActive: { color: TEXT_COLORS.onAccent },
  unitSuffix: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1 },

  paceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  paceText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 0.5 },

  rpeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rpeBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  rpeBtnActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  rpeText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  rpeTextActive: { color: TEXT_COLORS.onAccent },
  rpeHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 6, fontStyle: 'italic' },

  notesInput: { minHeight: 64, fontSize: FontSizes.sm, fontFamily: Fonts.regular, paddingTop: Spacing.sm },

  footer: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
  },

  // Ola 2 PR2 (ex fitness-cardio): chips de PRs por distancia.
  prsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  prChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1), alignItems: 'center',
  },
  prChipLabel: { fontSize: 9, fontFamily: Fonts.semiBold, letterSpacing: 1 },
  prChipValue: { fontSize: FontSizes.sm, fontFamily: Fonts.bold },

  // Ola 2 PR2: puerta a la fase de importación (ex fitness-cardio ghost CTA).
  importRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderWidth: 1, paddingVertical: 12,
    borderRadius: Radius.md, marginTop: Spacing.xl,
  },
  importText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1.5 },
});
