import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  Keyboard, Platform, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { supabase } from '../src/lib/supabase';
import {
  chatWithArgosEx, saveConversation, loadConversations,
  loadConversation, type ArgosMessage,
} from '../src/services/argos-service';
import { speakArgos, stopSpeaking, getIsSpeaking } from '../src/services/argos-voice';
import { VoiceButton } from '../src/components/VoiceButton';

// Rule override de react-native-markdown-display: hace el texto seleccionable
// (la lib no expone selectable como prop directa).
const MARKDOWN_RULES = {
  text: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => (
    <Text key={node.key} selectable style={[inheritedStyles, styles.text]}>
      {node.content}
    </Text>
  ),
};

// Sugerencias rápidas
const QUICK_SUGGESTIONS = [
  { label: '¿Qué debería comer?', icon: 'restaurant-outline' as const },
  { label: '¿Cómo mejorar mi sueño?', icon: 'moon-outline' as const },
  { label: 'Genera una rutina para hoy', icon: 'barbell-outline' as const },
  { label: '¿Cómo va mi progreso?', icon: 'trending-up-outline' as const },
  { label: 'Interpreta mi glucosa', icon: 'analytics-outline' as const },
  { label: 'Receta alta en proteína', icon: 'nutrition-outline' as const },
];

export default function ArgosChat() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ArgosMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pastConversations, setPastConversations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
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
    if (userId) loadPastConversations();
    return () => { stopSpeaking(); };
  }, [userId]));

  async function loadPastConversations() {
    if (!userId) return;
    const convs = await loadConversations(userId, 10);
    setPastConversations(convs);

    // Auto-cargar la conversación más reciente si no hay una activa
    if (convs[0] && messages.length === 0 && !conversationId) {
      const msgs = await loadConversation(convs[0].id);
      setMessages(msgs);
      setConversationId(convs[0].id);
    }
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || !userId) return;

    // Detener si ARGOS estaba hablando
    if (getIsSpeaking()) await stopSpeaking();

    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userTurn: ArgosMessage = { role: 'user', content: messageText };
    const newMessages: ArgosMessage[] = [...messages, userTurn];
    setMessages(newMessages);
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    // ARG-1/ARG-8: filtrar turnos degradados ANTES de mandarlos al LLM —
    // un turno marcado como degraded (rate-limited, ambos providers caídos,
    // error de cliente) no debe volver a entrar al contexto del modelo.
    const cleanForLLM = newMessages.filter(m => !m.degraded);

    let finalMessages: ArgosMessage[] | null = null;
    let wasDegraded = false;
    try {
      const result = await chatWithArgosEx(userId, cleanForLLM, { conversationId });
      wasDegraded = result.degraded;

      const assistantTurn: ArgosMessage = wasDegraded
        ? { role: 'assistant', content: result.text, degraded: true }
        : { role: 'assistant', content: result.text };

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
        { role: 'assistant', content: 'Lo siento, tuve un problema al procesar tu consulta. Intenta de nuevo.', degraded: true },
      ];
      setMessages(errored);
      finalMessages = errored;
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
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

  async function openConversation(conv: any) {
    const msgs = await loadConversation(conv.id);
    setMessages(msgs);
    setConversationId(conv.id);
    setShowHistory(false);
  }

  function startNewConversation() {
    stopSpeaking();
    setMessages([]);
    setConversationId(null);
    setShowHistory(false);
  }

  function handleVoiceTranscript(text: string) {
    sendMessage(text);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12,
        borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => { stopSpeaking(); router.back(); }} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(168,224,42,0.15)',
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Ionicons name="eye-outline" size={20} color="#a8e02a" />
          </View>
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
          <Pressable onPress={() => setShowHistory(!showHistory)} hitSlop={12}>
            <Ionicons name="time-outline" size={22} color="#999" />
          </Pressable>
          <Pressable onPress={startNewConversation} hitSlop={12}>
            <Ionicons name="add-circle-outline" size={22} color="#a8e02a" />
          </Pressable>
        </View>
      </View>

      {/* Historial de conversaciones */}
      {showHistory && (
        <View style={{
          backgroundColor: '#0a0a0a', borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a',
          maxHeight: 200,
        }}>
          <ScrollView>
            {pastConversations.length === 0 ? (
              <Text style={{ color: '#666', fontSize: 13, padding: 16, textAlign: 'center' }}>
                Sin conversaciones anteriores
              </Text>
            ) : (
              pastConversations.map(conv => (
                <Pressable key={conv.id} onPress={() => openConversation(conv)} style={{
                  paddingVertical: 12, paddingHorizontal: 20,
                  borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a',
                }}>
                  <Text style={{ color: '#fff', fontSize: 14 }} numberOfLines={1}>
                    {conv.title}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                    {new Date(conv.updated_at).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Área de mensajes */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Estado vacío — sugerencias */}
        {messages.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: 'rgba(168,224,42,0.1)',
              justifyContent: 'center', alignItems: 'center', marginBottom: 16,
            }}>
              <Ionicons name="eye-outline" size={40} color="#a8e02a" />
            </View>
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
            {/* Burbuja del mensaje — selectable, sin tap-to-speak (TTS solo desde el toggle del header) */}
            <View
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
                    // Blockquote tematizado para dark mode (el default de la librería es casi blanco / ilegible)
                    blockquote: {
                      backgroundColor: '#111',
                      borderLeftColor: '#a8e02a',
                      borderLeftWidth: 3,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginVertical: 8,
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
            </View>
          </View>
        ))}

        {/* Indicador de carga */}
        {loading && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: '#0a0a0a', borderRadius: 18, borderBottomLeftRadius: 4,
            padding: 14, alignSelf: 'flex-start', maxWidth: '60%',
            borderWidth: 1, borderColor: '#1a1a1a',
          }}>
            <ActivityIndicator size="small" color="#a8e02a" />
            <Text style={{ color: '#999', fontSize: 13 }}>ARGOS analiza...</Text>
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
