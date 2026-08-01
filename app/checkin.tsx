/**
 * Check-in emocional — Reconocer → Etiquetar → Entender (MB-15 · plano 12x12).
 *
 * La puerta de entrada es EL PLANO 12x12: la posición es el significado
 * (horizontal = agrado, vertical = energía), se recorre arrastrando y se
 * acerca con pinch. Celdas View + Text + Pressable, cero SVG, UNA
 * transformación nativa (MoodPlane; la rueda queda intacta para Exploración).
 * 2 pasos: plano (nombrar) → contexto, con el mapa corporal como paso opcional
 * SOLO tras emoción desagradable intensa (Pieza 2 MB-14). Nombrar ES la
 * primera intervención (Lieberman 2007): el aterrizaje lo dice en una línea.
 * Al cierre, una frase por cuadrante (Pieza 3 MB-14) — nunca sobre una señal
 * de crisis (tramo A MB-12).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, TextInput, DeviceEventEmitter, Linking, BackHandler, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, SlideInDown, SlideOutDown, SlideInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import {
  QUADRANTS, EMOTIONS, CONTEXT_WHERE, CONTEXT_WHO, CONTEXT_DOING,
  type QuadrantKey, type Emotion,
} from '@/src/data/emotions-library';
import { MoodPlane, type MoodPlaneHandle } from '@/src/components/checkin/MoodPlane';
import { BodyCheck } from '@/src/components/checkin/BodyCheck';
import { NAMING_MECHANISM_LINE } from '@/src/data/checkin-config';
import { GRID_HINT } from '@/src/data/emotion-grid-config';
import { shouldOfferBodyMap } from '@/src/services/emotion-grid-core';
import { closingPhraseForDate } from '@/src/data/checkin-closing-phrases';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { useArgosPresence } from '@/src/components/argos/ArgosPresenceContext';
import { searchEmotions } from '@/src/services/emotion-plane-core';
import { INVITE_TITLE, INVITE_SUBTEXT, INVITE_YES, INVITE_NO } from '@/src/data/emotion-navigation';
import { shareMood, unshareMood } from '@/src/services/community/mood-share-service';
import { isCrisisOrigin, isCrisisHotline, hasCrisisTrajectory } from '@/src/services/emotion-navigation-core';
import { saveCheckin, getRecentCheckins, type CheckinRecord, type CheckinEntryGate } from '@/src/services/checkin-service';
import { deriveCheckinAxes } from '@/src/services/checkin-axes-core';
import { shouldShowTribeBridge, TRIBE_BRIDGE_COPY, BRIDGE_WINDOW_DAYS } from '@/src/services/checkin-bridge-core';
import { promptForDate, buildCheckinJournalEntry } from '@/src/data/checkin-prompts';
import { computeJournalStreak } from '@/src/services/journal-logic';
import { toLocalDateString } from '@/src/utils/date-helpers';
import { toggleCompletion } from '@/src/services/protocol-service';
import { awardBooleanElectron } from '@/src/services/electron-service';
import { fireElectronAward } from '@/src/services/economy/electron-award-client';
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { vibrateMedium, haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { warn as logWarn } from '@/src/lib/logger';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { CrisisSupportBanner } from '@/src/components/global/CrisisSupportBanner';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, withOpacity, SKOOL_URL, ATP_BRAND } from '@/src/constants/brand';
import { Screen } from '@/src/components/ui/Screen';

export default function CheckinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ protocolItemId?: string; emotionId?: string; gate?: string }>();
  const analytics = useAnalytics();

  const [step, setStep] = useState(1);
  const [quadrant, setQuadrant] = useState<QuadrantKey | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  // MB-4 Bloque 1: hoja de definición (reemplaza el tooltip de long-press) + buscador.
  const [sheetEmotion, setSheetEmotion] = useState<Emotion | null>(null);
  // B.1 (MB-7): UNA emoción activa mientras navegas — la segunda solo se ofrece
  // tras CONTINUAR. addSecond = ya aceptó sumar otra; askSecond = hoja de oferta.
  const [addSecond, setAddSecond] = useState(false);
  const [askSecond, setAskSecond] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Pieza 2 (MB-14): el mapa corporal ya NO es puerta de entrada — es un paso
  // opcional entre nombrar y contexto, solo tras emoción desagradable intensa.
  const [bodyStepOpen, setBodyStepOpen] = useState(false);
  // Track E: por qué puerta se llegó a la palabra. Todas escriben el mismo
  // registro; esto solo etiqueta el camino (la última ayuda usada gana).
  // MB-14: 'rueda' etiqueta ahora la puerta DEFAULT (la cuadrícula) — el CHECK
  // de mig 238 no admite valores nuevos y hoy no se toca la base (OTA-only).
  const [entryGate, setEntryGate] = useState<CheckinEntryGate>(
    params.gate === 'mapa' ? 'mapa' : 'rueda',
  );
  const planeRef = useRef<MoodPlaneHandle>(null);
  const [ctxWhere, setCtxWhere] = useState<string | null>(null);
  const [ctxWho, setCtxWho] = useState<string | null>(null);
  const [ctxDoing, setCtxDoing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [pastCheckins, setPastCheckins] = useState<CheckinRecord[]>([]);
  // T4 MENTE: streak de días consecutivos con check-in (se calcula al guardar)
  const [checkinStreak, setCheckinStreak] = useState(0);
  // C5 COMUNIDAD: puente a la Tribu (Skool) si hay mood bajo sostenido ~3 semanas.
  const [showTribeBridge, setShowTribeBridge] = useState(false);
  // MB-4 Bloque 2: invitación a navegar tras el cierre. Un "no" la quita y no se insiste.
  const [navDeclined, setNavDeclined] = useState(false);
  // MB-4 Bloque 4: compartir es OPT-IN explícito por check-in. Nunca por defecto.
  const [savedCheckinId, setSavedCheckinId] = useState<string | null>(null);
  const [shareIncludeEmotion, setShareIncludeEmotion] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const dailyPrompt = promptForDate(getLocalToday());

  // #21: racha viva visible AL ENTRAR (no solo tras guardar). Mismo query que handleSave (DRY).
  const loadCheckinStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rows } = await supabase
        .from('emotional_checkins')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(400);
      const dates = (rows ?? []).map((r: any) => toLocalDateString(new Date(r.created_at)));
      setCheckinStreak(computeJournalStreak(dates));
    } catch { /* streak es decorativo */ }
  };

  useEffect(() => {
    // 21 días: ventana del trigger de la Tribu (C5). El historial visible ya no
    // vive aquí: la rueda es la protagonista; la historia vive en su pantalla.
    getRecentCheckins(BRIDGE_WINDOW_DAYS).then(setPastCheckins).catch(() => {});
    loadCheckinStreak();
  }, []);

  // Track D (MB-10): llegar desde Exploración con la emoción YA puesta —
  // mismo aterrizaje que todas las puertas, cero flujos paralelos.
  useEffect(() => {
    const preId = typeof params.emotionId === 'string' ? params.emotionId : undefined;
    if (!preId) return;
    const e = EMOTIONS.find(em => em.id === preId);
    if (!e) return;
    setSelectedEmotions([e.id]);
    setQuadrant(e.quadrant);
    setSheetEmotion(e);
    const t = setTimeout(() => planeRef.current?.focusEmotion(e.id), 120);
    return () => clearTimeout(t);
    // Solo al montar: el param no cambia dentro de la sesión de la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // #20: back consciente del paso — el cuerpo regresa a la cuadrícula y el
  // contexto también; nunca saca de la app. En la cuadrícula (o done) sale.
  const handleBack = () => {
    if (bodyStepOpen) setBodyStepOpen(false);
    else if (step === 2) setStep(1);
    else router.back();
  };

  // #20: hardware back de Android — consumir el evento en pasos intermedios.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (bodyStepOpen) {
        setBodyStepOpen(false);
        return true;
      }
      if (step === 2) {
        setStep(1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step, bodyStepOpen]);

  // B.7 (MB-7): con una hoja inferior abierta (o el paso del cuerpo en foco),
  // el orbe de ARGOS se retira — ese contenido es el principal del momento.
  const { setHidden: setArgosHidden } = useArgosPresence();
  const sheetOpen = sheetEmotion !== null || askSecond || bodyStepOpen;
  useEffect(() => {
    setArgosHidden(sheetOpen);
    return () => setArgosHidden(false);
  }, [sheetOpen, setArgosHidden]);

  const qd = quadrant ? QUADRANTS[quadrant] : null;
  const qColor = qd?.color ?? TEXT_COLORS.secondary;
  // A-1 (MB-12): crisis en DOS niveles. Nivel 1 rompe el flujo (acompañamiento,
  // sin celebración); nivel 2 además muestra la Línea de la Vida — por emoción
  // marcadora o por trayectoria (3+ check-ins con nivel 1 en 7 días), para que
  // el banner no salga con cualquier mal día y se aprenda a ignorar.
  const crisisSelected = selectedEmotions.some(isCrisisOrigin);
  const crisisEmotionId = selectedEmotions.find(isCrisisOrigin) ?? selectedEmotions[0];
  const hotlineVisible = crisisSelected && (
    selectedEmotions.some(isCrisisHotline) ||
    hasCrisisTrajectory(
      [
        { created_at: new Date().toISOString(), emotions: selectedEmotions },
        ...pastCheckins,
      ],
      getLocalToday(),
    )
  );

  // B.1 (MB-7, decisión de Enrique): UNA emoción activa que va switcheando
  // mientras navegas — tocar otra la reemplaza, tocar la MISMA la suelta (B.2).
  // Solo tras CONTINUAR se ofrece sumar una segunda (addSecond); entonces el
  // slot 2 es el que switchea. El cuadrante efectivo sigue a la primera elegida.
  const handleEmotionPress = useCallback((e: Emotion) => {
    const wasSelected = selectedEmotions.includes(e.id);
    let next: string[];
    if (wasSelected) next = selectedEmotions.filter(id => id !== e.id);
    else if (addSecond) next = selectedEmotions.length >= 2 ? [selectedEmotions[0], e.id] : [...selectedEmotions, e.id];
    else next = [e.id];
    setSelectedEmotions(next);
    const first = EMOTIONS.find(em => em.id === next[0]);
    if (first) setQuadrant(first.quadrant);
    setSheetEmotion(wasSelected ? null : e);
    setAskSecond(false);
  }, [selectedEmotions, addSecond]);

  // Pieza 2 (MB-14): entre nombrar y contexto, el cuerpo — SOLO si alguna
  // emoción elegida es de cuadrante desagradable con intensidad alta. En
  // cualquier otro caso se sigue de largo (a quien está bien, no le aplica).
  const proceedToContext = useCallback(() => {
    if (shouldOfferBodyMap(selectedEmotions)) setBodyStepOpen(true);
    else setStep(2);
  }, [selectedEmotions]);

  // B.1: CONTINUAR con una sola emoción abre la oferta de sumar una segunda;
  // con dos (o si ya la aceptó) sigue de largo al contexto.
  const handleContinue = useCallback(() => {
    haptic.medium();
    setSheetEmotion(null);
    if (selectedEmotions.length === 1 && !addSecond) {
      setAskSecond(true);
      return;
    }
    proceedToContext();
  }, [selectedEmotions.length, addSecond, proceedToContext]);

  const removeEmotion = (id: string) => {
    haptic.light();
    setSelectedEmotions(prev => {
      const next = prev.filter(e => e !== id);
      const first = EMOTIONS.find(em => em.id === next[0]);
      if (first) setQuadrant(first.quadrant);
      return next;
    });
    setSheetEmotion(null);
  };

  const handleSearchPick = (e: Emotion) => {
    haptic.light();
    setSearchOpen(false);
    setSearchQuery('');
    setEntryGate('busqueda');
    // El plano viaja hasta la celda de la palabra — se ve dónde vive.
    planeRef.current?.focusEmotion(e.id);
    handleEmotionPress(e);
  };

  // MB-4 Bloque 4: compartir este check-in con tu gente (opt-in explícito).
  const handleShare = async () => {
    if (!quadrant || sharing) return;
    haptic.medium();
    setSharing(true);
    const firstEmotion = EMOTIONS.find(e => e.id === selectedEmotions[0]);
    const id = await shareMood({
      checkinId: savedCheckinId,
      quadrant,
      emotionLabel: firstEmotion?.label ?? null,
      includeEmotion: shareIncludeEmotion,
    });
    setSharing(false);
    if (id) setSharedId(id);
  };

  const handleUnshare = async () => {
    if (!sharedId) return;
    haptic.light();
    const ok = await unshareMood(sharedId);
    if (ok) setSharedId(null);
  };

  // Glow ambiental: el color del CUADRANTE de la emoción activa tiñe el fondo.
  // MB-14: sale del cuadrante, no del punto del mapa — una familia cromática.
  const activeEmotion = selectedEmotions.length > 0
    ? EMOTIONS.find(e => e.id === selectedEmotions[selectedEmotions.length - 1])
    : null;
  const ambientColor = activeEmotion ? QUADRANTS[activeEmotion.quadrant].color : null;

  const handleSave = async () => {
    if (!quadrant || selectedEmotions.length === 0) return;
    setSaving(true);
    try {
      // MB-5: pleasantness/energy_level derivados del RULER (cuadrante + emociones).
      // Antes nunca se escribían → day-compiler leía null y perdía la señal de mood.
      const axes = deriveCheckinAxes(
        quadrant,
        selectedEmotions
          .map(id => EMOTIONS.find(e => e.id === id))
          .filter((e): e is Emotion => !!e)
          .map(e => ({ energy: e.energy, intensity: e.intensity })),
      );
      const newCheckinId = await saveCheckin({
        quadrant,
        emotions: selectedEmotions,
        energy_level: axes.energy_level,
        pleasantness: axes.pleasantness,
        context_where: ctxWhere ?? undefined,
        context_who: ctxWho ?? undefined,
        context_doing: ctxDoing ?? undefined,
        note: note.trim() || undefined,
        // Track E: la puerta viaja en el mismo registro (mig 238).
        entry_gate: entryGate,
      });
      // MB-4 Bloque 4: el id habilita el share opt-in del cierre.
      setSavedCheckinId(newCheckinId);
      if (params.protocolItemId) {
        try { await toggleCompletion(params.protocolItemId); } catch (e) { logWarn('[checkin] toggleCompletion failed', e); }
      }
      // T5 HARDENING: funnel core — check-in completado (cuadrante + puerta, sin nota).
      analytics.track(ATP_EVENTS.CHECKIN_COMPLETED, { quadrant, emotions: selectedEmotions.length, gate: entryGate });

      // C5 COMUNIDAD: ¿mood bajo sostenido ~3 semanas? → puente a la Tribu (Skool).
      // Lógica pura (checkin-bridge-core); incluye el check-in recién guardado.
      try {
        setShowTribeBridge(shouldShowTribeBridge([
          { created_at: new Date().toISOString(), quadrant },
          ...pastCheckins,
        ]));
      } catch { /* el puente es best-effort */ }

      // Electrón por check-in emocional
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await awardBooleanElectron(user.id, 'checkin');
          DeviceEventEmitter.emit('electrons_changed');
          DeviceEventEmitter.emit('day_changed');
          // Economía (fire-and-forget; no-op si flag OFF). Cap 1/día → key por día.
          fireElectronAward({
            habit_type: 'checkin_emotional', evidence_tier: 'evidence', local_date: getLocalToday(),
            idempotency_key: `checkin_emotional_${user.id}_${getLocalToday()}`,
          });

          // T4 MENTE: nota del check-in → mini entrada de journal (tag checkin).
          // Best-effort: si falla, el check-in ya quedó guardado.
          const journalRow = buildCheckinJournalEntry({
            userId: user.id,
            date: getLocalToday(),
            quadrant,
            emotionLabels: selectedEmotions
              .map(id => EMOTIONS.find(e => e.id === id)?.label)
              .filter((l): l is string => !!l),
            note,
            prompt: dailyPrompt,
          });
          if (journalRow) {
            const { error: jErr } = await supabase.from('journal_entries').insert(journalRow);
            if (jErr) logWarn('[checkin] journal bridge failed', jErr.message);
          }

          // T4 MENTE: streak de check-ins (días consecutivos, ancla hoy/ayer) — #21: helper DRY.
          await loadCheckinStreak();
        }
      } catch (e) { logWarn('[checkin] award electron failed', e); }

      vibrateMedium();
      setStep(3);
    } catch (e) {
      // MB-5: el fallo era invisible (solo logWarn) — el usuario se quedaba en
      // el paso 3 sin feedback y creía que guardó. Sus selecciones siguen en
      // memoria: puede reintentar con el mismo botón.
      logWarn('[checkin] save flow threw', e);
      Alert.alert(
        'No se pudo guardar',
        'Tu check-in no se registró. Revisa tu conexión e intenta de nuevo. Tus respuestas siguen aquí.',
      );
    }
    setSaving(false);
  };

  // === DONE ===
  if (step === 3) {
    return (
      <Screen keyboard>
        <Animated.View entering={FadeIn.duration(400)} style={styles.doneContainer}>
          <View style={[styles.donePulse, { backgroundColor: qColor + '20' }]}>
            <View style={[styles.doneDot, { backgroundColor: qColor }]} />
          </View>
          {/* A-3 (MB-12): sobre una crisis no se celebra — se reconoce sin
              analizar. El check-in ya quedó guardado (el dato importa). */}
          <EliteText style={[styles.doneTitle, { color: qColor }]}>
            {crisisSelected ? 'Queda registrado' : 'Check-in registrado'}
          </EliteText>
          <EliteText variant="caption" style={styles.doneSub}>
            {crisisSelected
              ? 'No tienes que hacer nada más ahora.'
              : selectedEmotions.map(id => EMOTIONS.find(e => e.id === id)?.label).join(' · ')}
          </EliteText>
          {/* Pieza 3 (MB-14): UNA frase al cierre, contextual al cuadrante y
              determinista por fecha. Con señal de crisis NO hay frase de
              ningún tipo (tramo A MB-12: a alguien en crisis no se le
              reencuadra nada) — el gate es crisisSelected. */}
          {!crisisSelected && quadrant && (
            <EliteText variant="body" style={styles.closingPhrase}>
              {closingPhraseForDate(quadrant, getLocalToday())}
            </EliteText>
          )}
          {/* T4 MENTE: streak de días consecutivos — nunca sobre una crisis (A-3) */}
          {!crisisSelected && checkinStreak > 1 && (
            <EliteText variant="caption" style={{ color: '#a8e02a', fontFamily: Fonts.bold, fontSize: FontSizes.md }}>
              🔥 {checkinStreak} días seguidos escuchándote
            </EliteText>
          )}
          {/* A-4 (MB-12): la Línea de la Vida es de NIVEL 2 (marcadores o trayectoria) */}
          {hotlineVisible && (
            <CrisisSupportBanner style={{ marginHorizontal: Spacing.lg }} />
          )}
          {/* A-2 (MB-12): con señal de crisis, /emotion-navigation ES el destino
              — su rama de acompañamiento ("ahora no toca analizar nada"), nunca
              la excepción. Se ofrece, no se impone. */}
          {crisisSelected && selectedEmotions.length > 0 && (
            <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.navInviteCard}>
              <EliteText variant="caption" style={styles.navInviteSub}>
                Si quieres, te acompañamos un momento. Sin analizar nada.
              </EliteText>
              <View style={styles.navInviteRow}>
                <Pressable
                  onPress={() => {
                    haptic.medium();
                    router.push({ pathname: '/emotion-navigation', params: { emotionId: crisisEmotionId } });
                  }}
                  style={[styles.navInviteYes, { backgroundColor: qColor }]}
                >
                  <EliteText style={styles.navInviteYesText}>ACOMPAÑAMIENTO</EliteText>
                </Pressable>
              </View>
            </Animated.View>
          )}
          {/* MB-4 Bloque 2: el check-in TERMINÓ (completo, con su electrón).
              Recién ahora la invitación a navegar — opcional, y un "no" se
              respeta. */}
          {!crisisSelected && !navDeclined && selectedEmotions.length > 0 && (
            <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.navInviteCard}>
              <EliteText variant="body" style={styles.navInviteTitle}>{INVITE_TITLE}</EliteText>
              <EliteText variant="caption" style={styles.navInviteSub}>{INVITE_SUBTEXT}</EliteText>
              <View style={styles.navInviteRow}>
                <Pressable onPress={() => { haptic.light(); setNavDeclined(true); }} style={styles.navInviteNo}>
                  <EliteText variant="caption" style={styles.navInviteNoText}>{INVITE_NO}</EliteText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    haptic.medium();
                    router.push({ pathname: '/emotion-navigation', params: { emotionId: selectedEmotions[0] } });
                  }}
                  style={[styles.navInviteYes, { backgroundColor: qColor }]}
                >
                  <EliteText style={styles.navInviteYesText}>{INVITE_YES}</EliteText>
                </Pressable>
              </View>
            </Animated.View>
          )}
          {/* MB-4 Bloque 4: compartir con tu gente — opt-in explícito y granular
              POR check-in. Nunca por defecto; se puede retirar. */}
          <Animated.View entering={FadeIn.delay(550).duration(400)} style={styles.shareCard}>
            {sharedId ? (
              <>
                <EliteText variant="caption" style={styles.shareDone}>
                  Compartido con tu gente ✓
                </EliteText>
                <Pressable onPress={handleUnshare} hitSlop={8}>
                  <EliteText variant="caption" style={styles.shareUndo}>Dejar de compartir</EliteText>
                </Pressable>
              </>
            ) : (
              <>
                <EliteText variant="caption" style={styles.shareTitle}>
                  ¿Compartir cómo estás con tu gente?
                </EliteText>
                <EliteText variant="caption" style={styles.shareSub}>
                  Solo tus amigos de ATP lo ven. Nada se comparte solo.
                </EliteText>
                <Pressable
                  onPress={() => { haptic.light(); setShareIncludeEmotion(v => !v); }}
                  style={styles.shareToggleRow}
                  hitSlop={6}
                >
                  <View style={[styles.shareCheck, shareIncludeEmotion && { backgroundColor: qColor, borderColor: qColor }]} />
                  <EliteText variant="caption" style={styles.shareToggleText}>
                    Incluir la emoción (si no, solo la zona)
                  </EliteText>
                </Pressable>
                {/* H.2 (MB-10): el estado ocupado lo dice el LABEL, no una capa
                    de opacidad encima (antipatrón "botón apagado"). */}
                <Pressable
                  onPress={handleShare}
                  disabled={sharing}
                  style={[styles.shareBtn, { borderColor: qColor + '50' }]}
                >
                  <EliteText variant="caption" style={[styles.shareBtnText, { color: qColor }]}>
                    {sharing ? 'Compartiendo…' : 'Compartir'}
                  </EliteText>
                </Pressable>
              </>
            )}
          </Animated.View>

          {/* C5 COMUNIDAD: mood bajo sostenido → puente cálido a la Tribu (Skool) */}
          {showTribeBridge && (
            <Animated.View entering={FadeIn.delay(600).duration(500)} style={styles.tribeCard}>
              <EliteText variant="body" style={styles.tribeCopy}>{TRIBE_BRIDGE_COPY}</EliteText>
              <Pressable
                onPress={() => { haptic.light(); Linking.openURL(SKOOL_URL).catch(() => {}); }}
                style={styles.tribeBtn}
              >
                <EliteText variant="body" style={styles.tribeBtnText}>Únete a la Tribu ATP</EliteText>
              </Pressable>
            </Animated.View>
          )}
          <Pressable onPress={() => { haptic.medium(); router.back(); }} style={[styles.doneBtn, { borderColor: qColor + '40' }]}>
            <EliteText variant="body" style={[styles.doneBtnText, { color: qColor }]}>Volver</EliteText>
          </Pressable>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* MB-4 Bloque 1: glow ambiental — el color de la emoción activa tiñe
          el fondo de la pantalla, detrás de todo. */}
      {ambientColor && (
        <Animated.View
          key={ambientColor}
          entering={FadeIn.duration(500)}
          style={styles.ambientGlow}
          pointerEvents="none"
        >
          <LinearGradient colors={[withOpacity(ambientColor, 0.24), 'transparent']} style={{ flex: 1 }} />
        </Animated.View>
      )}
      {/* I18 (V1.5): el teclado se maneja con insets nativos en el ScrollView
          del step 3 (el único con input) — scrollea al campo y restaura al
          cerrar; el KAV de Screen solo encogía sin scroll. */}
      <PillarHeader pillar="mind" title="Check-in" onBack={handleBack} />

      {/* Dots */}
      <View style={styles.dots}>
        {[1, 2].map(i => (
          <View key={i} style={[styles.dotIndicator, i <= step && { backgroundColor: qColor }]} />
        ))}
      </View>

      {/* ═══ PIEZA 2: EL CUERPO — paso opcional tras emoción negativa intensa ═══ */}
      {step === 1 && bodyStepOpen && (
        <BodyCheck
          color={qColor}
          onDone={() => { setBodyStepOpen(false); setStep(2); }}
        />
      )}

      {/* ═══ STEP 1: EL PLANO 12x12 — la posición es el significado ═══ */}
      {step === 1 && !bodyStepOpen && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.mapFlex}>
          <View style={styles.mapHeaderRow}>
            <View style={{ flex: 1 }}>
              <EliteText style={styles.wheelTitle}>¿Cómo te sientes?</EliteText>
              <EliteText variant="caption" style={styles.mapHint}>
                {GRID_HINT}
              </EliteText>
            </View>
            <Pressable onPress={() => { haptic.light(); setSearchOpen(o => !o); }} style={styles.mapTool} hitSlop={8}>
              <Ionicons name="search" size={18} color={TEXT_COLORS.secondary} />
            </Pressable>
          </View>

          {/* #21: racha viva visible al entrar */}
          {checkinStreak > 1 && (
            <EliteText variant="caption" style={styles.streakBadge}>
              🔥 {checkinStreak} días seguidos escuchándote
            </EliteText>
          )}

          {/* A-4 (MB-12): recurso de crisis en el flujo — solo nivel 2 */}
          {hotlineVisible && <CrisisSupportBanner style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.sm }} />}

          <View style={styles.mapCanvas}>
            <MoodPlane
              ref={planeRef}
              selectedIds={selectedEmotions}
              onEmotionPress={handleEmotionPress}
            />

            {/* Buscador por nombre */}
            {searchOpen && (
              <Animated.View entering={FadeIn.duration(180)} style={styles.searchOverlay}>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Busca una emoción…"
                  placeholderTextColor={TEXT_COLORS.muted}
                  autoFocus
                  autoCorrect={false}
                />
                {searchEmotions(EMOTIONS, searchQuery).map(e => (
                  // MB-14: el punto lleva el color del CUADRANTE — la misma
                  // familia cromática que la celda donde va a aterrizar.
                  <Pressable key={e.id} onPress={() => handleSearchPick(e)} style={styles.searchRow}>
                    <View style={[styles.searchDot, { backgroundColor: QUADRANTS[e.quadrant].color }]} />
                    <EliteText variant="body" style={styles.searchLabel}>{e.label}</EliteText>
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </View>

          {/* Pieza 2 (MB-14): la puerta del cuerpo salió del arranque — solo
              ofrecía estados negativos. Ahora es un paso condicional (arriba). */}

          {/* Hoja de definición: nombre en el color de su CUADRANTE + descripción */}
          {sheetEmotion && (() => {
            const sheetColor = QUADRANTS[sheetEmotion.quadrant].color;
            return (
              <Animated.View
                entering={SlideInDown.duration(260)}
                exiting={SlideOutDown.duration(200)}
                style={styles.defSheet}
              >
                <View style={styles.defHeader}>
                  <EliteText style={[styles.defName, { color: sheetColor }]}>{sheetEmotion.label}</EliteText>
                  <Pressable onPress={() => removeEmotion(sheetEmotion.id)} hitSlop={8}>
                    <EliteText variant="caption" style={styles.defRemove}>Quitar</EliteText>
                  </Pressable>
                </View>
                <EliteText variant="body" style={styles.defDesc}>{sheetEmotion.description}</EliteText>
                {/* A.6: el mecanismo, nombrado — no es copy motivacional, es
                    Lieberman (2007). Vive en checkin-config. */}
                <EliteText variant="caption" style={styles.defMechanism}>{NAMING_MECHANISM_LINE}</EliteText>
                {/* B.1: la segunda emoción ya no se ofrece aquí — CONTINUAR
                    abre la oferta (o sigue de largo si ya hay dos). */}
                <View style={styles.defActions}>
                  <Pressable
                    onPress={handleContinue}
                    style={[styles.defContinue, { backgroundColor: sheetColor }]}
                  >
                    <EliteText style={styles.defContinueText}>CONTINUAR</EliteText>
                  </Pressable>
                </View>
              </Animated.View>
            );
          })()}

          {/* B.1: oferta de segunda emoción — aparece al dar CONTINUAR con una */}
          {askSecond && (
            <Animated.View
              entering={SlideInDown.duration(260)}
              exiting={SlideOutDown.duration(200)}
              style={styles.defSheet}
            >
              <EliteText style={styles.askTitle}>¿Sumar una segunda emoción?</EliteText>
              <EliteText variant="caption" style={styles.askSub}>
                A veces conviven dos. Si con una basta, sigue.
              </EliteText>
              <View style={styles.defActions}>
                <Pressable
                  onPress={() => { haptic.light(); setAskSecond(false); setAddSecond(true); }}
                  style={styles.defSecondary}
                >
                  <EliteText variant="caption" style={styles.defSecondaryText}>Sumar otra</EliteText>
                </Pressable>
                <Pressable
                  onPress={() => { haptic.medium(); setAskSecond(false); proceedToContext(); }}
                  style={[styles.defContinue, { backgroundColor: qColor }]}
                >
                  <EliteText style={styles.defContinueText}>SEGUIR</EliteText>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Sin hoja abierta pero con selección: CTA para seguir */}
          {!sheetEmotion && !askSecond && selectedEmotions.length > 0 && (
            <Pressable onPress={handleContinue} style={[styles.nextBtn, { backgroundColor: qColor }]}>
              <EliteText style={styles.nextBtnText}>Siguiente</EliteText>
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* ═══ STEP 2: CONTEXTO ═══ */}
      {step === 2 && quadrant && (
        <Animated.View entering={SlideInRight.duration(250)} style={styles.stepFlex}>
          {/* V1.5.1 (#5): KeyboardAwareScrollView (keyboard-controller) — el
              input queda visible al escribir; insets nativos no bastaron. */}
          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={24}
          >
            {/* Emociones seleccionadas como recordatorio */}
            <View style={styles.selectedRow}>
              {selectedEmotions.map(id => {
                const e = EMOTIONS.find(em => em.id === id);
                return (
                  <View key={id} style={[styles.selectedPill, { backgroundColor: qColor + '25', borderColor: qColor + '40' }]}>
                    <EliteText variant="caption" style={[styles.selectedText, { color: qColor }]}>
                      {e?.label}
                    </EliteText>
                  </View>
                );
              })}
            </View>

            {/* A-4 (MB-12): el recurso de crisis acompaña el flujo — solo nivel 2 */}
            {hotlineVisible && <CrisisSupportBanner style={{ marginBottom: Spacing.md }} />}

            <ContextSection label="¿Dónde estás?" items={CONTEXT_WHERE} selected={ctxWhere} onSelect={v => { haptic.light(); setCtxWhere(ctxWhere === v ? null : v); }} color={qColor} />
            <ContextSection label="¿Con quién?" items={CONTEXT_WHO} selected={ctxWho} onSelect={v => { haptic.light(); setCtxWho(ctxWho === v ? null : v); }} color={qColor} />
            <ContextSection label="¿Qué estás haciendo?" items={CONTEXT_DOING} selected={ctxDoing} onSelect={v => { haptic.light(); setCtxDoing(ctxDoing === v ? null : v); }} color={qColor} />

            {/* T4 MENTE: prompt del día — rotativo, determinista por fecha.
                Si escribes algo, se guarda también como mini-entrada de journal. */}
            <View style={[styles.promptCard, { borderColor: qColor + '30' }]}>
              <EliteText variant="caption" style={styles.promptLabel}>PROMPT DEL DÍA</EliteText>
              <EliteText variant="body" style={styles.promptText}>{dailyPrompt}</EliteText>
            </View>

            {/* V1.5.1 (#4): sin scroll interno — el drag sobre el input scrollea la página. */}
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Respóndelo aquí si quieres — se guarda en tu journal"
              placeholderTextColor={Colors.textSecondary + '50'}
              multiline
              scrollEnabled={false}
              maxLength={500}
            />

            {/* B.9 (MB-7): CTA al molde editorial — degradado de marca, nunca
                color plano (doctrina §1). El glow lo tiñe el pilar Mente. */}
            {/* H.2 (MB-10): "Guardando…" ya comunica el estado — sin capa de
                opacidad apilada que lo deje viéndose apagado. */}
            <GradientCTA
              label={saving ? 'Guardando…' : 'REGISTRAR'}
              pillar="mind"
              disabled={saving}
              onPress={handleSave}
              style={styles.registerCta}
            />

            <View style={{ height: Spacing.xxl }} />
          </KeyboardAwareScrollView>
        </Animated.View>
      )}
    </Screen>
  );
}

// === CONTEXT SECTION ===

function ContextSection({ label, items, selected, onSelect, color }: {
  label: string; items: string[]; selected: string | null;
  onSelect: (v: string) => void; color: string;
}) {
  // B.9 (MB-7): los chips ENVUELVEN — el scroll horizontal cortaba opciones en
  // el borde ("Comp…", "D…") sin leerse como scroll. Press con spring, no plano.
  return (
    <View style={styles.ctxSection}>
      <EliteText variant="caption" style={styles.ctxLabel}>{label}</EliteText>
      <View style={styles.ctxWrap}>
        {items.map(item => {
          const sel = selected === item;
          return (
            <AnimatedPressable key={item} onPress={() => onSelect(item)}>
              <View style={[styles.ctxPill, sel && { backgroundColor: color + '22', borderColor: color + '55' }]}>
                <EliteText variant="caption" style={[styles.ctxText, sel && { color, fontFamily: Fonts.semiBold }]}>
                  {item}
                </EliteText>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingTop: Spacing.sm, marginBottom: Spacing.xs,
  },
  dotIndicator: { width: 8, height: 8, borderRadius: Radius.xs, backgroundColor: SURFACES.disabled },

  stepFlex: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  // #21: racha visible al entrar (mismo tono que el done screen)
  streakBadge: { color: '#a8e02a', fontFamily: Fonts.bold, fontSize: FontSizes.md, textAlign: 'center', marginTop: 2, marginBottom: Spacing.xs },

  // MB-4 Bloque 1: glow ambiental (detrás de todo, tercio superior)
  ambientGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 320, zIndex: 0,
  },

  // MB-4 Bloque 1: el plano
  mapFlex: { flex: 1 },
  mapHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  mapTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  wheelTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, color: Colors.textPrimary },
  mapHint: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  mapTool: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SURFACES.card, borderWidth: 0.5, borderColor: SURFACES.border,
  },
  // Full-bleed: los círculos se salen de los bordes (sensación de infinito).
  mapCanvas: { flex: 1 },

  // Buscador
  searchOverlay: {
    position: 'absolute', top: 0, left: Spacing.md, right: Spacing.md, zIndex: 20,
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: SURFACES.border, padding: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.black, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.textPrimary, fontFamily: Fonts.regular, fontSize: FontSizes.md,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
  searchDot: { width: 10, height: 10, borderRadius: 5 },
  searchLabel: { color: Colors.textPrimary, fontSize: FontSizes.md, flexShrink: 0 },

  // Hoja de definición
  defSheet: {
    backgroundColor: SURFACES.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    borderWidth: 0.5, borderColor: SURFACES.border,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg,
  },
  defHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  defName: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  defRemove: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  defDesc: { color: Colors.textPrimary, fontSize: FontSizes.md, lineHeight: 22, marginTop: Spacing.xs },
  // A.6: la línea del mecanismo (Lieberman) — voz baja, sin empalago.
  defMechanism: {
    color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 18,
    marginTop: Spacing.sm, fontStyle: 'italic',
  },
  defActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: Spacing.md, marginTop: Spacing.md,
  },
  defSecondary: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  defSecondaryText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  // B.1: oferta de segunda emoción (post-CONTINUAR)
  askTitle: { color: Colors.textPrimary, fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  askSub: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 20, marginTop: Spacing.xs },
  defContinue: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, borderRadius: Radius.pill,
  },
  defContinueText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.md, letterSpacing: 2 },

  nextBtn: {
    alignSelf: 'center', position: 'absolute', bottom: Spacing.lg,
    paddingHorizontal: Spacing.xl + Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  nextBtnText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.lg, letterSpacing: 2 },

  // Selected pills
  selectedRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  selectedPill: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  selectedText: { fontFamily: Fonts.bold, fontSize: FontSizes.md },

  // Context
  ctxSection: { marginBottom: Spacing.md },
  ctxLabel: {
    color: Colors.textSecondary, fontFamily: Fonts.bold, letterSpacing: 2,
    fontSize: FontSizes.sm, marginBottom: Spacing.sm,
  },
  ctxWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  ctxPill: {
    paddingHorizontal: Spacing.sm + 4, paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.pill, backgroundColor: SURFACES.card, borderWidth: 1, borderColor: SURFACES.border,
  },
  ctxText: { color: Colors.textSecondary, fontSize: FontSizes.md },

  noteInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    color: Colors.textPrimary, fontFamily: Fonts.regular, fontSize: FontSizes.md,
    marginTop: Spacing.sm, borderWidth: 0.5, borderColor: SURFACES.border,
    minHeight: 72, textAlignVertical: 'top',
  },
  // T4 MENTE: prompt del día
  promptCard: {
    backgroundColor: SURFACES.card, borderWidth: 1, borderRadius: Radius.md,
    padding: Spacing.md, marginTop: Spacing.sm, gap: 4,
  },
  promptLabel: {
    color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 2,
  },
  promptText: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, lineHeight: 24 },

  registerCta: { alignSelf: 'center', marginTop: Spacing.lg },

  // Done
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  donePulse: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  doneDot: { width: 32, height: 32, borderRadius: Radius.md },
  doneTitle: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  doneSub: { color: Colors.textSecondary, fontSize: FontSizes.md },
  // Pieza 3 (MB-14): la frase al cierre — editorial, voz baja, sin firma.
  closingPhrase: {
    color: Colors.textPrimary, fontSize: FontSizes.md, lineHeight: 22,
    textAlign: 'center', marginHorizontal: Spacing.xl, marginTop: Spacing.xs,
  },
  doneBtn: {
    borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, marginTop: Spacing.md,
  },
  doneBtnText: { fontFamily: Fonts.bold, letterSpacing: 2 },

  // MB-4 Bloque 2: invitación a navegar (post-cierre)
  navInviteCard: {
    alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg, padding: Spacing.md,
    backgroundColor: SURFACES.card, borderRadius: Radius.md,
    borderWidth: 0.5, borderColor: SURFACES.border,
  },
  navInviteTitle: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.lg, textAlign: 'center' },
  navInviteSub: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 19, textAlign: 'center' },
  navInviteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  navInviteNo: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  navInviteNoText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  navInviteYes: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  navInviteYesText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.md, letterSpacing: 1 },

  // MB-4 Bloque 4: compartir con tu gente (opt-in)
  shareCard: {
    alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs,
    marginHorizontal: Spacing.lg, padding: Spacing.md,
    backgroundColor: SURFACES.card, borderRadius: Radius.md,
    borderWidth: 0.5, borderColor: SURFACES.border,
  },
  shareTitle: { color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, textAlign: 'center' },
  shareSub: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  shareToggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  shareCheck: {
    width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: SURFACES.disabled,
  },
  shareToggleText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  shareBtn: {
    borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.xs,
  },
  shareBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  shareDone: { color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  shareUndo: { color: Colors.textSecondary, fontSize: FontSizes.sm },

  // C5 COMUNIDAD: puente a la Tribu (mood bajo sostenido)
  tribeCard: {
    alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg, padding: Spacing.md,
    backgroundColor: SURFACES.card, borderRadius: Radius.md,
    borderWidth: 0.5, borderColor: SURFACES.border,
  },
  tribeCopy: { color: TEXT_COLORS.primary, fontSize: FontSizes.md, textAlign: 'center', lineHeight: 22 },
  tribeBtn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  tribeBtnText: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
