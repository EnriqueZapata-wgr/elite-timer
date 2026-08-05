/**
 * ARGOS Chat — pantalla orquestadora (MB-21 Pieza 4).
 *
 * Era un archivo de 800 líneas con estilos a mano y hex crudos. Ahora:
 *  - Piezas de UI en src/components/argos/chat/ (burbuja, header, input,
 *    estado vacío, typing, menú de long-press).
 *  - La resolución del turno en argos-chat-core.ts (pura, con tests).
 *  - Lista virtualizada (FlatList inverted — el auto-scroll sale gratis).
 *  - Teclado con el patrón estándar de la app (KEY-1), no listener propio.
 *  - Sesiones (P2): abrir en frío = en blanco; mismo proceso = retoma.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../src/lib/supabase';
import {
  chatWithArgosEx, generateResponseStream, saveConversation, loadConversations,
  loadConversation, type ArgosMessage,
} from '../src/services/argos-service';
import { ArgosRateLimitError } from '../src/services/argos-stream-core';
import { speakArgos, stopSpeaking, getIsSpeaking } from '../src/services/argos-voice';
import { stopPlayback } from '../src/services/argos-tts';
import { withPreflight, wasAborted } from '../src/services/economy/with-preflight';
import { isOnline } from '../src/services/connectivity';
import { buildOfflineArgosMessage } from '../src/services/argos-offline-core';
import { generateUUID } from '../src/utils/uuid';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { TopBanner } from '@/src/components/global/TopBanner';
import { CrisisSupportBanner } from '@/src/components/global/CrisisSupportBanner';
import { detectCrisisContent } from '@/src/services/crisis-detection-core';
import { ArgosVoiceMode } from '@/src/components/argos/ArgosVoiceMode';
import { getArgosVoice } from '@/src/services/argos-voice-service';
import { ContextualConsentModal } from '@/src/components/legal/ContextualConsentModal';
import { logConsent, getConsentStatus } from '@/src/services/consent-log-service';
import { RateLimitCard } from '@/src/components/argos/RateLimitCard';
import { parseRateLimitInfo, type RateLimitInfo } from '@/src/services/argos-rate-limit-core';
import { coerceScreen } from '@/src/hooks/argos-screen-context-core';
import { getArgosSessionId, startNewArgosSession } from '@/src/services/argos-session';
import { shouldAttemptResume, resumeTarget } from '@/src/services/argos-session-core';
import {
  resolveTurn, persistPlan, filterForLLM, buildChatListItems, type ChatListItem,
} from '@/src/services/argos-chat-core';
import { buildTodaySuggestions, DEFAULT_SUGGESTIONS, type ChatSuggestion } from '@/src/services/argos-suggestions-core';
import { loadTodaySignals } from '@/src/services/argos-suggestions';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';
import { ChatHeader } from '@/src/components/argos/chat/ChatHeader';
import { ChatInput } from '@/src/components/argos/chat/ChatInput';
import { ChatEmptyState } from '@/src/components/argos/chat/ChatEmptyState';
import { MessageBubble } from '@/src/components/argos/chat/MessageBubble';
import { TypingIndicator } from '@/src/components/argos/chat/TypingIndicator';
import { MessageActionsMenu } from '@/src/components/argos/chat/MessageActionsMenu';
import { BG } from '@/src/constants/brand';

function ArgosChat() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  // N1: solo mostrar back-arrow si hay a dónde volver (deep link / push).
  const canGoBack = navigation.canGoBack();
  const params = useLocalSearchParams<{ conversationId?: string; new?: string; from?: string }>();
  // Guard de re-entrancy (#71): un ref (síncrono) atrapa el doble-tap/re-render
  // ANTES de que `loading` (state, async) actualice — 1ª línea de defensa del
  // doble cobro H+ (el server además es idempotente).
  const sendingRef = useRef(false);
  const analytics = useAnalytics();
  const [messages, setMessages] = useState<ArgosMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  // T5 MAGIA 2.0: rate limit contextual — card con boost H+ + orbe apagada.
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [boostJustActivated, setBoostJustActivated] = useState(false);
  // T2 MAGIA 2.0: true mientras llegan chunks del stream — orbe 'hablando'.
  const [streaming, setStreaming] = useState(false);
  // Bug #8: estado offline detectado en el último submit.
  const [offline, setOffline] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  // MB-4 J5: modo voz (full-screen) + voz elegida por el user.
  const [voiceMode, setVoiceMode] = useState(false);
  const [argosVoice, setArgosVoice] = useState<string | null>(null);
  // CB-6: consentimiento de voz — gate antes del modo voz.
  const [voiceConsented, setVoiceConsented] = useState(false);
  const [voiceConsentModal, setVoiceConsentModal] = useState(false);
  const [voiceConsentSaving, setVoiceConsentSaving] = useState(false);
  // C5-002: guardarraíl determinístico — banner Línea de la Vida fijo en la
  // sesión al detectar tema de crisis (no depende del LLM).
  const [crisisDetected, setCrisisDetected] = useState(false);
  // MB-21 P4.4: sugerencias del día para el estado vacío.
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>(DEFAULT_SUGGESTIONS);
  // MB-21 P4.4: menú propio de long-press (antes Alert nativo).
  const [selected, setSelected] = useState<ChatListItem | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Bug #8: nombre para el copy offline (metadata local, sin fetch extra).
        setUserName((user.user_metadata as any)?.full_name ?? null);
        getArgosVoice(user.id).then(setArgosVoice).catch(() => {});
        // CB-6: ¿ya consintió el tratamiento de voz?
        getConsentStatus(user.id)
          .then(st => setVoiceConsented(st['CB-6']?.action === 'accepted'))
          .catch(() => {});
        // Sugerencias de HOY (fail-soft: quedan los defaults).
        loadTodaySignals(user.id)
          .then(signals => setSuggestions(buildTodaySuggestions(signals)))
          .catch(() => {});
        if (params.conversationId) {
          const msgs = await loadConversation(params.conversationId);
          setMessages(msgs);
          setConversationId(params.conversationId);
        }
      }
    })();
  }, [params.conversationId]);

  // Detener TTS al salir de la pantalla + retomar por sesión al enfocar.
  useFocusEffect(useCallback(() => {
    if (userId) autoLoadRecent();
    // Leak fix (auditoría MB-4): stopSpeaking solo corta el TTS legacy del SO;
    // la voz nueva (expo-audio vía argos-tts) seguía sonando al salir.
    return () => { stopSpeaking(); stopPlayback().catch(() => {}); };
  }, [userId]));

  // MB-21 P2: una sesión de app es una conversación. Solo se retoma la más
  // reciente si pertenece a la sesión actual (ancla session_id, migración 253).
  async function autoLoadRecent() {
    if (!userId) return;
    if (!shouldAttemptResume({
      hasMessages: messages.length > 0,
      activeConversationId: conversationId,
      requestedNew: params.new === '1',
    })) return;
    const convs = await loadConversations(userId, 1);
    const targetId = resumeTarget(convs[0] ?? null, getArgosSessionId());
    if (targetId) {
      const msgs = await loadConversation(targetId);
      setMessages(msgs);
      setConversationId(targetId);
    }
  }

  /**
   * T2: corre el turno en modo STREAMING (typing effect real, orbe hablando).
   * Devuelve el texto completo, o null si el stream no está disponible —
   * el caller cae al modo no-stream. ArgosRateLimitError se propaga (T5).
   */
  async function tryStreamingTurn(cleanForLLM: ArgosMessage[], idempotencyKey: string): Promise<string | null> {
    if (!userId) return null;
    let full = '';
    let appended = false;
    try {
      const stream = generateResponseStream(userId, cleanForLLM, {
        conversationId,
        idempotencyKey,
        screenContext: coerceScreen(params.from),
      });
      for await (const chunk of stream) {
        full += chunk;
        if (!appended) {
          appended = true;
          setLoading(false);   // sale "pensando" → entra "hablando"
          setStreaming(true);
          const first: ArgosMessage = { role: 'assistant', content: full, ts: Date.now() };
          setMessages(prev => [...prev, first]);
        } else {
          const snapshot = full;
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: snapshot };
            return copy;
          });
        }
      }
      return full || null;
    } catch (e) {
      // Limpiar el parcial (si hubo) — el turno se resuelve por otra vía.
      if (appended) setMessages(prev => prev.slice(0, -1));
      if (e instanceof ArgosRateLimitError) throw e;
      console.warn('[ARGOS] stream no disponible, fallback no-stream:', (e as Error)?.message);
      return null;
    } finally {
      setStreaming(false);
    }
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || !userId) return;
    // #71: atrapar doble-tap/re-render de forma SÍNCRONA (antes del primer await).
    if (sendingRef.current) return;
    sendingRef.current = true;
    // C5-002: se evalúa ANTES de cualquier red/LLM — funciona incluso offline.
    if (detectCrisisContent(messageText)) setCrisisDetected(true);
    // Una sola idempotency_key para TODO este turno (incluye retries internos).
    const idempotencyKey = generateUUID();

    // Bug #8: submit sin conexión no daba NINGÚN feedback. Ping fail-fast en
    // paralelo con el preflight de economía.
    const [online, gate] = await Promise.all([
      isOnline(),
      // Economía: pre-flight H+ (no-op si LAB_ECONOMY_ENABLED=false). El proxy
      // igual responde 402 como guard real server-side.
      withPreflight('chat', async () => true),
    ]);
    const base = messages;
    const userTurn: ArgosMessage = { role: 'user', content: messageText, ts: Date.now() };
    if (!online) {
      sendingRef.current = false;
      setOffline(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setInput('');
      // Ambos turnos degraded: no se persisten ni entran al contexto del LLM.
      setMessages(resolveTurn(base, userTurn, {
        kind: 'reply', text: buildOfflineArgosMessage(userName), degraded: true,
      }, Date.now()).messages);
      return;
    }
    if (offline) setOffline(false);
    if (wasAborted(gate)) { sendingRef.current = false; return; }

    // Detener si ARGOS estaba hablando
    if (getIsSpeaking()) await stopSpeaking();

    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMessages: ArgosMessage[] = [...base, userTurn];
    setMessages(newMessages);
    // T5 HARDENING: funnel core — mensaje enviado (sin contenido, solo metadata).
    analytics.track(ATP_EVENTS.ARGOS_MESSAGE_SENT, { turn_index: newMessages.length });
    setLoading(true);
    // T5: nuevo intento limpia el estado de rate limit anterior
    setRateLimit(null);
    setBoostJustActivated(false);

    // ARG-1/ARG-8: turnos degradados fuera del contexto del modelo.
    const cleanForLLM = filterForLLM(newMessages);

    let resolved: ReturnType<typeof resolveTurn> | null = null;
    try {
      // T2: primero STREAMING; null = no disponible → fallback no-stream.
      const streamedText = await tryStreamingTurn(cleanForLLM, idempotencyKey);

      if (streamedText !== null) {
        resolved = resolveTurn(base, userTurn, { kind: 'streamed', text: streamedText }, Date.now());
        setMessages(resolved.messages);
        if (autoSpeak) speakArgos(streamedText);
      } else {
        setLoading(true); // el intento de stream pudo haber apagado el indicador
        const result = await chatWithArgosEx(userId, cleanForLLM, {
          conversationId,
          idempotencyKey,
          // T4: si el chat se abrió desde una pantalla, ARGOS lo sabe.
          screenContext: coerceScreen(params.from),
        });
        if (result.rateLimit) {
          // T5: rate limit → RateLimitCard (boost H+) en vez de burbuja genérica.
          resolved = resolveTurn(base, userTurn, { kind: 'rate_limited' }, Date.now());
          setMessages(resolved.messages);
          setRateLimit(result.rateLimit);
        } else {
          resolved = resolveTurn(base, userTurn, {
            kind: 'reply', text: result.text, degraded: result.degraded,
          }, Date.now());
          setMessages(resolved.messages);
          if (!result.degraded && autoSpeak) speakArgos(result.text);
        }
      }
    } catch (e) {
      if (e instanceof ArgosRateLimitError) {
        // T5: rate limit detectado durante el stream — misma UX que no-stream.
        const info = parseRateLimitInfo(e.payload);
        resolved = resolveTurn(base, userTurn, { kind: 'rate_limited' }, Date.now());
        setMessages(resolved.messages);
        if (info) setRateLimit(info);
      } else {
        console.error('ARGOS chat error:', e);
        resolved = resolveTurn(base, userTurn, { kind: 'client_error' }, Date.now());
        setMessages(resolved.messages);
      }
    } finally {
      setLoading(false);
      sendingRef.current = false; // #71: liberar el guard al terminar el turno
      // T5 HARDENING: respuesta recibida (degraded=true si fue rate limit/error).
      analytics.track(ATP_EVENTS.ARGOS_MESSAGE_RECEIVED, { degraded: resolved?.wasDegraded ?? true });
      // F2.3: feedback háptico sutil al terminar de "pensar"
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // ARG-2: persistir SOLO turnos limpios (persistPlan decide).
    if (resolved) {
      const plan = persistPlan(resolved.messages, resolved.wasDegraded);
      if (plan.persist) {
        try {
          const id = await saveConversation(userId, plan.clean, conversationId, getArgosSessionId());
          if (id) setConversationId(id);
        } catch (e) {
          console.warn('ARGOS saveConversation error:', e);
        }
      }
    }
  }

  function startNewConversation() {
    stopSpeaking();
    setMessages([]);
    setConversationId(null);
    // MB-21 P2: cerrar DE VERDAD. Rotar el ancla de sesión hace que la
    // conversación anterior deje de ser retomable por foco. No se borra nada.
    startNewArgosSession();
  }

  /** MB-21 P4.4: el dictado DEPOSITA el texto en el input; el usuario decide. */
  function handleVoiceTranscript(text: string) {
    setInput(prev => (prev.trim() ? `${prev.trim()} ${text}` : text));
  }

  function handleCopy() {
    if (!selected) return;
    Clipboard.setStringAsync(selected.msg.content)
      .then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
      .catch(() => {});
    setSelected(null);
  }

  function handleEditResend() {
    if (!selected) return;
    // Truncar desde este turno: al reenviar, saveConversation sobreescribe
    // la conversación con el historial editado (mismo conversationId).
    setMessages(messages.slice(0, selected.index));
    setInput(selected.msg.content);
    setSelected(null);
  }

  // Lista invertida: el más nuevo primero (los separadores se calculan en el
  // orden cronológico dentro del core).
  const listItems = useMemo(() => buildChatListItems(messages), [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: BG.screen }}>
      {/* #23: banner contextual flotante (debajo del header de ARGOS) */}
      <TopBanner offset={60} />
      <ChatHeader
        topInset={insets.top}
        canGoBack={canGoBack}
        onBack={() => { stopSpeaking(); router.back(); }}
        orbState={streaming ? 'hablando' : loading ? 'pensando' : 'idle'}
        orbDimmed={!!rateLimit && !boostJustActivated}
        onVoiceMode={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          stopSpeaking();
          if (voiceConsented) setVoiceMode(true);
          else setVoiceConsentModal(true);
        }}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => {
          setAutoSpeak(!autoSpeak);
          if (getIsSpeaking()) stopSpeaking();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onHistory={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/argos/conversations', params: conversationId ? { current: conversationId } : {} });
        }}
        onNewConversation={startNewConversation}
      />

      {/* C5-002: banner fijo Línea de la Vida al detectar tema de crisis */}
      {crisisDetected && (
        <CrisisSupportBanner style={{ marginHorizontal: 16, marginTop: 8 }} />
      )}

      {/* KEY-1: el contenido se desplaza con la curva nativa del teclado (iOS);
          Android ya redimensiona (softwareKeyboardLayoutMode resize). */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 && !loading ? (
          <View style={{ flex: 1 }}>
            <ChatEmptyState suggestions={suggestions} onPick={(label) => sendMessage(label)} />
            <View style={{ paddingHorizontal: 20 }}>
              {rateLimit && (
                <RateLimitCard info={rateLimit} onBoostActivated={() => setBoostJustActivated(true)} />
              )}
              {/* B-5 (MB-12): disclaimer ARGOS — copy de fuente única */}
              <MedicalDisclaimer feature="argos" compact />
            </View>
          </View>
        ) : (
          <FlatList
            inverted
            data={listItems}
            keyExtractor={(item) => String(item.index)}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="handled"
            // 4.2: virtualizada — cien mensajes hacen scroll fluido. Inverted
            // resuelve el auto-scroll sin el truco de onContentSizeChange.
            renderItem={({ item }) => (
              <MessageBubble
                msg={item.msg}
                showTimestamp={item.showTimestamp}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setSelected(item);
                }}
              />
            )}
            // Con inverted, el header de la lista es el borde INFERIOR (lo más nuevo).
            ListHeaderComponent={
              <View>
                {rateLimit && (
                  <RateLimitCard info={rateLimit} onBoostActivated={() => setBoostJustActivated(true)} />
                )}
                {loading && <TypingIndicator />}
                <MedicalDisclaimer feature="argos" compact />
              </View>
            }
          />
        )}

        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={() => sendMessage()}
          loading={loading}
          offline={offline}
          bottomInset={insets.bottom}
          onVoiceTranscript={handleVoiceTranscript}
        />
      </KeyboardAvoidingView>

      {/* MB-21 P4.4: menú propio de long-press (Copiar / Editar y reenviar) */}
      <MessageActionsMenu
        visible={selected != null}
        canEdit={selected?.msg.role === 'user' && !loading}
        onCopy={handleCopy}
        onEdit={handleEditResend}
        onClose={() => setSelected(null)}
      />

      {/* MB-4 J5: modo voz full-screen */}
      <ArgosVoiceMode
        visible={voiceMode}
        onClose={() => setVoiceMode(false)}
        userId={userId ?? undefined}
        voice={argosVoice}
        history={messages.map(m => ({ role: m.role, content: m.content }))}
        onTurnComplete={(userText, argosText) => {
          // C5-002: los turnos de voz también pasan por el guardarraíl.
          if (detectCrisisContent(userText)) setCrisisDetected(true);
          const next: ArgosMessage[] = [
            ...messages,
            { role: 'user', content: userText, ts: Date.now() },
            { role: 'assistant', content: argosText, ts: Date.now() },
          ];
          setMessages(next);
          // M5 (re-auditoría MB-4): los turnos de voz también se persisten.
          if (userId) {
            saveConversation(userId, next.filter(m => !m.degraded), conversationId, getArgosSessionId())
              .then((id) => { if (id) setConversationId(id); })
              .catch((e) => console.warn('ARGOS saveConversation (voz) error:', e));
          }
        }}
      />

      {/* CB-6 · consentimiento contextual de voz (primera activación) */}
      <ContextualConsentModal
        visible={voiceConsentModal}
        checkboxId="CB-6"
        title="Tu voz, bajo tu control"
        saving={voiceConsentSaving}
        onAccept={async () => {
          if (!userId) { setVoiceConsentModal(false); return; }
          setVoiceConsentSaving(true);
          try {
            await logConsent(userId, ['CB-6'], 'accepted');
            setVoiceConsented(true);
            setVoiceConsentModal(false);
            setVoiceMode(true);
          } finally {
            setVoiceConsentSaving(false);
          }
        }}
        onDecline={() => setVoiceConsentModal(false)}
      />
    </View>
  );
}

// #42: gate de disclaimers médicos — modal en primera visita (o bump de versión).
export default function ArgosChatGated() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  return (
    <MedicalDisclaimerGate>
      <ArgosChat />
    </MedicalDisclaimerGate>
  );
}
