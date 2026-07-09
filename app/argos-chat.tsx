import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  Keyboard, Platform, Alert,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Markdown from 'react-native-markdown-display';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { supabase } from '../src/lib/supabase';
import {
  chatWithArgosEx, saveConversation, loadConversations,
  loadConversation, type ArgosMessage,
} from '../src/services/argos-service';
import { speakArgos, stopSpeaking, getIsSpeaking } from '../src/services/argos-voice';
import { withPreflight, wasAborted } from '../src/services/economy/with-preflight';
import { VoiceButton } from '../src/components/VoiceButton';
import { generateUUID } from '../src/utils/uuid';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { TopBanner } from '@/src/components/global/TopBanner';
import { ArgosAvatar } from '@/src/components/argos/ArgosAvatar';
import { coerceScreen } from '@/src/hooks/argos-screen-context-core';

// Rule override de react-native-markdown-display: hace el texto seleccionable
// (la lib no expone selectable como prop directa).
const MARKDOWN_RULES = {
  text: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => (
    <Text key={node.key} selectable style={[inheritedStyles, styles.text]}>
      {node.content}
    </Text>
  ),
};

// F2.3 (#93): un punto del indicador "ARGOS está pensando..." — pulso con
// delay escalonado para el efecto de ola.
function TypingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.25);
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 320 }),
        withTiming(0.25, { duration: 320 }),
      ),
      -1,
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[{
      width: 6, height: 6, borderRadius: 3, backgroundColor: '#a8e02a',
    }, style]} />
  );
}

/** F2.3: etiqueta del separador temporal entre mensajes (>5 min de gap). */
function timestampLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · ${time}`;
}

const TIMESTAMP_GAP_MS = 5 * 60 * 1000;

// Sugerencias rápidas
const QUICK_SUGGESTIONS = [
  { label: '¿Qué debería comer?', icon: 'restaurant-outline' as const },
  { label: '¿Cómo mejorar mi sueño?', icon: 'moon-outline' as const },
  { label: 'Genera una rutina para hoy', icon: 'barbell-outline' as const },
  { label: '¿Cómo va mi progreso?', icon: 'trending-up-outline' as const },
  { label: 'Interpreta mi glucosa', icon: 'analytics-outline' as const },
  { label: 'Receta alta en proteína', icon: 'nutrition-outline' as const },
];

function ArgosChat() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  // N1: solo mostrar back-arrow si hay a dónde volver (deep link / push). Como tab raíz
  // no hay historial → canGoBack() es false y se oculta. En main ARGOS es ruta pusheada
  // (canGoBack true → back visible, sin cambio); el guard ya queda correcto para cuando
  // ARGOS pase a ser tab (p8). DRY: una sola pantalla sirve a ambos accesos.
  const canGoBack = navigation.canGoBack();
  // F2.2: `new=1` (desde el historial) arranca en blanco sin auto-cargar la última conversación.
  const params = useLocalSearchParams<{ conversationId?: string; new?: string; from?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  // Guard de re-entrancy (#71): un ref (síncrono) atrapa el doble-tap/re-render ANTES de que
  // `loading` (state, async) actualice. Sin esto, dos taps a 42ms disparaban 2 requests → doble
  // cobro H+. El server además es idempotente (spend_protons v2), esto es la 1ª línea de defensa.
  const sendingRef = useRef(false);
  const [messages, setMessages] = useState<ArgosMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        if (params.conversationId) {
          const msgs = await loadConversation(params.conversationId);
          setMessages(msgs);
          setConversationId(params.conversationId);
        }
      }
    })();
  }, [params.conversationId]);

  // Detener TTS al salir de la pantalla
  useFocusEffect(useCallback(() => {
    if (userId) autoLoadRecent();
    return () => { stopSpeaking(); };
  }, [userId]));

  // Auto-cargar la conversación más reciente si no hay una activa
  // (salvo que se haya pedido conversación nueva desde el historial: new=1).
  async function autoLoadRecent() {
    if (!userId || params.new === '1') return;
    if (messages.length > 0 || conversationId) return;
    const convs = await loadConversations(userId, 1);
    if (convs[0]) {
      const msgs = await loadConversation(convs[0].id);
      setMessages(msgs);
      setConversationId(convs[0].id);
    }
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || !userId) return;
    // #71: atrapar doble-tap/re-render de forma SÍNCRONA (antes del primer await).
    if (sendingRef.current) return;
    sendingRef.current = true;
    // Una sola idempotency_key para TODO este turno (incluye los retries internos de callAnthropic).
    const idempotencyKey = generateUUID();

    // Economía: pre-flight H+ (no-op + byte-idéntico si LAB_ECONOMY_ENABLED=false). Si no
    // alcanza, aborta ANTES del update optimista (ofrece ir a la tienda). El proxy igual
    // responde 402 como guard real server-side.
    const gate = await withPreflight('chat', async () => true);
    if (wasAborted(gate)) { sendingRef.current = false; return; }

    // Detener si ARGOS estaba hablando
    if (getIsSpeaking()) await stopSpeaking();

    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userTurn: ArgosMessage = { role: 'user', content: messageText, ts: Date.now() };
    const newMessages: ArgosMessage[] = [...messages, userTurn];
    setMessages(newMessages);
    setLoading(true);
    // Auto-scroll: lo maneja onContentSizeChange del ScrollView (F2.1)

    // ARG-1/ARG-8: filtrar turnos degradados ANTES de mandarlos al LLM —
    // un turno marcado como degraded (rate-limited, ambos providers caídos,
    // error de cliente) no debe volver a entrar al contexto del modelo.
    const cleanForLLM = newMessages.filter(m => !m.degraded);

    let finalMessages: ArgosMessage[] | null = null;
    let wasDegraded = false;
    try {
      const result = await chatWithArgosEx(userId, cleanForLLM, {
        conversationId,
        idempotencyKey,
        // T4: si el chat se abrió desde una pantalla (floating button), ARGOS lo sabe.
        screenContext: coerceScreen(params.from),
      });
      wasDegraded = result.degraded;

      const assistantTurn: ArgosMessage = wasDegraded
        ? { role: 'assistant', content: result.text, degraded: true, ts: Date.now() }
        : { role: 'assistant', content: result.text, ts: Date.now() };

      if (wasDegraded) {
        // ARG-2: una respuesta degradada NO debe ensuciar contexto futuro.
        // Marcamos AMBOS turnos (pregunta + respuesta) como degraded → quedan
        // visibles en la UI pero el filtro de cleanForLLM y de cleanForSave
        // los excluye en próximos turnos y al persistir.
        const baseMessages = newMessages.slice(0, -1);
        finalMessages = [
          ...baseMessages,
          { ...userTurn, degraded: true },
          assistantTurn,
        ];
        setMessages(finalMessages);
        // No invocar speakArgos en respuestas degradadas — son mensajes de error.
      } else {
        finalMessages = [...newMessages, assistantTurn];
        setMessages(finalMessages);
        if (autoSpeak) {
          speakArgos(result.text);
        }
      }
    } catch (e) {
      console.error('ARGOS chat error:', e);
      // Excepción real (no devolución degradada): marcar también como degraded
      // para no persistir/reenviar este turno fallido.
      const baseMessages = newMessages.slice(0, -1);
      const errored: ArgosMessage[] = [
        ...baseMessages,
        { ...userTurn, degraded: true },
        { role: 'assistant', content: 'Lo siento, tuve un problema al procesar tu consulta. Intenta de nuevo.', degraded: true, ts: Date.now() },
      ];
      setMessages(errored);
      finalMessages = errored;
    } finally {
      setLoading(false);
      sendingRef.current = false; // #71: liberar el guard al terminar el turno
      // F2.3: feedback háptico sutil al terminar de "pensar"
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // ARG-2: persistir SOLO los turnos no degradados. Si todo el turno fue
    // degradado, finalMessages.filter(!degraded) puede no haber cambiado
    // respecto a `messages` (state previo) — saveConversation funciona igual.
    if (finalMessages) {
      const cleanForSave = finalMessages.filter(m => !m.degraded);
      // Solo guardar si hay al menos un par válido (no guardar conversación vacía).
      if (cleanForSave.length > 0 && !wasDegraded) {
        try {
          const id = await saveConversation(userId, cleanForSave, conversationId);
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
  }

  function handleVoiceTranscript(text: string) {
    sendMessage(text);
  }

  /** F2.3: long-press en burbuja → copiar / (user) editar y reenviar. */
  function handleMessageLongPress(msg: ArgosMessage, index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const actions: { text: string; onPress?: () => void; style?: 'cancel' }[] = [
      {
        text: 'Copiar',
        onPress: async () => {
          await Clipboard.setStringAsync(msg.content);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ];
    if (msg.role === 'user' && !loading) {
      actions.push({
        text: 'Editar y reenviar',
        onPress: () => {
          // Truncar desde este turno: al reenviar, saveConversation sobreescribe
          // la conversación con el historial editado (mismo conversationId).
          setMessages(messages.slice(0, index));
          setInput(msg.content);
        },
      });
    }
    actions.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Mensaje', undefined, actions);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* #23: banner contextual flotante (debajo del header de ARGOS) */}
      <TopBanner offset={60} />
      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12,
        borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {canGoBack && (
            <Pressable onPress={() => { stopSpeaking(); router.back(); }} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          )}
          <ArgosAvatar state={loading ? 'thinking' : 'idle'} size={36} />
          <View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>ARGOS</Text>
            <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>
              SALUD FUNCIONAL
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Toggle auto-speak */}
          <Pressable
            onPress={() => {
              setAutoSpeak(!autoSpeak);
              if (getIsSpeaking()) stopSpeaking();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={12}
          >
            <Ionicons
              name={autoSpeak ? 'volume-high-outline' : 'volume-mute-outline'}
              size={22}
              color={autoSpeak ? '#a8e02a' : '#666'}
            />
          </Pressable>
          {/* F2.2: historial → pantalla dedicada */}
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/argos/conversations' as any); }} hitSlop={12}>
            <Ionicons name="time-outline" size={22} color="#999" />
          </Pressable>
          <Pressable onPress={startNewConversation} hitSlop={12}>
            <Ionicons name="add-circle-outline" size={22} color="#a8e02a" />
          </Pressable>
        </View>
      </View>

      {/* Área de mensajes — F2.1: auto-scroll al crecer el contenido (mensaje
          nuevo, indicador de typing o conversación cargada del historial) */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (messages.length > 0 || loading) scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {/* Estado vacío — sugerencias */}
        {messages.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ArgosAvatar state="idle" size={80} variant="full" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
              Hola, soy ARGOS
            </Text>
            <Text style={{ color: '#999', fontSize: 13, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
              Tu sistema de inteligencia en salud funcional. Conozco tu historial, tus datos y tus objetivos. Pregúntame lo que quieras.
            </Text>

            {/* Sugerencias rápidas */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {QUICK_SUGGESTIONS.map(s => (
                <Pressable
                  key={s.label}
                  onPress={() => sendMessage(s.label)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: '#0a0a0a', borderRadius: 20,
                    paddingVertical: 10, paddingHorizontal: 14,
                    borderWidth: 1, borderColor: '#1a1a1a',
                  }}
                >
                  <Ionicons name={s.icon} size={14} color="#a8e02a" />
                  <Text style={{ color: '#ccc', fontSize: 12 }}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Burbujas de mensajes */}
        {messages.map((msg, index) => (
          <View key={index} style={{
            marginBottom: 12,
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {/* F2.3: separador temporal discreto cuando el gap es >5 min */}
            {msg.ts != null && (index === 0 || (messages[index - 1]?.ts != null && msg.ts - messages[index - 1].ts! > TIMESTAMP_GAP_MS)) && (
              <Text style={{
                alignSelf: 'center', color: '#555', fontSize: 10,
                letterSpacing: 1, marginVertical: 8,
              }}>
                {timestampLabel(msg.ts)}
              </Text>
            )}
            {msg.role === 'assistant' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: 'rgba(168,224,42,0.15)',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Ionicons name="eye" size={10} color="#a8e02a" />
                </View>
                <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700' }}>ARGOS</Text>
              </View>
            )}
            {/* Burbuja del mensaje — selectable; long-press → copiar / editar y reenviar (F2.3) */}
            <Pressable
              onLongPress={() => handleMessageLongPress(msg, index)}
              delayLongPress={350}
              style={{
                maxWidth: '85%',
                backgroundColor: msg.role === 'user' ? '#a8e02a' : '#0a0a0a',
                borderRadius: 18,
                borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 18,
                padding: 14,
                borderWidth: msg.role === 'assistant' ? 1 : 0,
                borderColor: '#1a1a1a',
              }}
            >
              {msg.role === 'assistant' ? (
                <Markdown
                  style={{
                    body: { color: '#e2e2e2', fontSize: 14, lineHeight: 21 },
                    heading2: { color: '#a8e02a', fontSize: 16, fontWeight: '800', marginTop: 12, marginBottom: 6 },
                    heading3: { color: '#a8e02a', fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 4 },
                    strong: { color: '#fff', fontWeight: '700' },
                    bullet_list: { marginLeft: 8 },
                    list_item: { color: '#e2e2e2', marginBottom: 4 },
                    hr: { backgroundColor: '#333', height: 0.5, marginVertical: 12 },
                    em: { color: '#ccc', fontStyle: 'italic' },
                    paragraph: { color: '#e2e2e2', fontSize: 14, lineHeight: 21, marginBottom: 8 },
                    // Dark-mode para TODO elemento con default claro de la librería
                    // (blockquote, code y fences renderizan caja casi blanca / ilegible por defecto).
                    blockquote: {
                      backgroundColor: '#111',
                      borderLeftColor: '#a8e02a',
                      borderLeftWidth: 3,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginVertical: 8,
                    },
                    code_inline: {
                      backgroundColor: '#1a1a1a',
                      color: '#e2e2e2',
                      borderWidth: 0,
                      fontSize: 13,
                    },
                    code_block: {
                      backgroundColor: '#111',
                      color: '#e2e2e2',
                      borderColor: '#1f1f1f',
                      borderWidth: 0.5,
                      borderRadius: 8,
                      padding: 12,
                    },
                    fence: {
                      backgroundColor: '#111',
                      color: '#e2e2e2',
                      borderColor: '#1f1f1f',
                      borderWidth: 0.5,
                      borderRadius: 8,
                      padding: 12,
                    },
                  }}
                  rules={MARKDOWN_RULES}
                >
                  {msg.content}
                </Markdown>
              ) : (
                <Text selectable style={{ color: '#000', fontSize: 14, lineHeight: 21 }}>
                  {msg.content}
                </Text>
              )}
            </Pressable>
          </View>
        ))}

        {/* F2.3: indicador "ARGOS está pensando..." con dots animados */}
        {loading && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: '#0a0a0a', borderRadius: 18, borderBottomLeftRadius: 4,
            padding: 14, alignSelf: 'flex-start', maxWidth: '70%',
            borderWidth: 1, borderColor: '#1a1a1a',
          }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TypingDot delay={0} />
              <TypingDot delay={160} />
              <TypingDot delay={320} />
            </View>
            <Text style={{ color: '#999', fontSize: 13 }}>ARGOS está pensando...</Text>
          </View>
        )}
      </ScrollView>

      {/* Área de input */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12,
        paddingBottom: keyboardHeight > 0 ? keyboardHeight + 12 : insets.bottom + 12,
        borderTopWidth: 0.5, borderTopColor: '#1a1a1a',
        backgroundColor: '#000',
      }}>
        {/* Mic button */}
        <VoiceButton onTranscript={handleVoiceTranscript} variant="inline" />

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Pregunta a ARGOS..."
          placeholderTextColor="#444"
          multiline
          maxLength={1000}
          style={{
            flex: 1, backgroundColor: '#0a0a0a', color: '#fff',
            fontSize: 15, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12,
            maxHeight: 100, borderWidth: 1, borderColor: '#1a1a1a',
          }}
        />
        <Pressable
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: input.trim() && !loading ? '#a8e02a' : '#1a1a1a',
            justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Ionicons name="arrow-up" size={22} color={input.trim() && !loading ? '#000' : '#444'} />
        </Pressable>
      </View>
    </View>
  );
}

// #42: gate de disclaimers médicos — modal en primera visita (o bump de versión).
export default function ArgosChatGated() {
  return (
    <MedicalDisclaimerGate>
      <ArgosChat />
    </MedicalDisclaimerGate>
  );
}
