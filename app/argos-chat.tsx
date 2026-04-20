import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { supabase } from '../src/lib/supabase';
import {
  chatWithArgos, saveConversation, loadConversations,
  loadConversation, type ArgosMessage,
} from '../src/services/argos-service';
import { speakArgos, stopSpeaking, getIsSpeaking } from '../src/services/argos-voice';
import { VoiceButton } from '../src/components/VoiceButton';

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
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ArgosMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pastConversations, setPastConversations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  // Detener TTS al salir de la pantalla
  useFocusEffect(useCallback(() => {
    if (userId) loadPastConversations();
    return () => { stopSpeaking(); };
  }, [userId]));

  async function loadPastConversations() {
    if (!userId) return;
    const convs = await loadConversations(userId, 10);
    setPastConversations(convs);
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || !userId) return;

    // Detener si ARGOS estaba hablando
    if (getIsSpeaking()) await stopSpeaking();

    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMessages: ArgosMessage[] = [
      ...messages,
      { role: 'user', content: messageText },
    ];
    setMessages(newMessages);
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await chatWithArgos(userId, newMessages);
      const updatedMessages: ArgosMessage[] = [
        ...newMessages,
        { role: 'assistant', content: response },
      ];
      setMessages(updatedMessages);

      // ARGOS habla la respuesta si auto-speak está activo
      if (autoSpeak) {
        speakArgos(response);
      }

      // Guardar conversación
      const id = await saveConversation(userId, updatedMessages, conversationId);
      if (id) setConversationId(id);
    } catch (e) {
      console.error('ARGOS chat error:', e);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Lo siento, tuve un problema al procesar tu consulta. Intenta de nuevo.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
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
            {/* Tap en burbuja de ARGOS = leer en voz alta */}
            <Pressable
              onPress={msg.role === 'assistant' ? () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (getIsSpeaking()) { stopSpeaking(); } else { speakArgos(msg.content); }
              } : undefined}
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
                <Markdown style={{
                  body: { color: '#e2e2e2', fontSize: 14, lineHeight: 21 },
                  heading2: { color: '#a8e02a', fontSize: 16, fontWeight: '800', marginTop: 12, marginBottom: 6 },
                  heading3: { color: '#a8e02a', fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 4 },
                  strong: { color: '#fff', fontWeight: '700' },
                  bullet_list: { marginLeft: 8 },
                  list_item: { color: '#e2e2e2', marginBottom: 4 },
                  hr: { backgroundColor: '#333', height: 0.5, marginVertical: 12 },
                  em: { color: '#ccc', fontStyle: 'italic' },
                  paragraph: { color: '#e2e2e2', fontSize: 14, lineHeight: 21, marginBottom: 8 },
                }}>
                  {msg.content}
                </Markdown>
              ) : (
                <Text style={{ color: '#000', fontSize: 14, lineHeight: 21 }}>
                  {msg.content}
                </Text>
              )}
            </Pressable>
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
        paddingBottom: insets.bottom + 12,
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
    </KeyboardAvoidingView>
  );
}
