/**
 * FeedbackButton — Botón flotante + modal para reportar bugs/sugerencias.
 * Auto-detecta pantalla actual. Sube screenshots a Supabase Storage.
 */
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { usePathname } from 'expo-router';

const SEVERITIES = [
  { id: 'red', label: 'Roto / Crashea', color: '#ef4444', emoji: '🔴' },
  { id: 'yellow', label: 'Confuso / Feo', color: '#fbbf24', emoji: '🟡' },
  { id: 'green', label: 'Sugerencia', color: '#22c55e', emoji: '🟢' },
];

const CATEGORIES = [
  { id: 'bug', label: 'Bug' },
  { id: 'ux', label: 'Diseño/UX' },
  { id: 'content', label: 'Contenido' },
  { id: 'suggestion', label: 'Idea nueva' },
  { id: 'performance', label: 'Lento' },
];

export function FeedbackButton() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [severity, setSeverity] = useState('yellow');
  const [category, setCategory] = useState('bug');
  const [description, setDescription] = useState('');
  const [expected, setExpected] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        setUserName(profile?.full_name || '');
      }
    })();
  }, []);

  function open() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVisible(true);
    setSeverity('yellow');
    setCategory('bug');
    setDescription('');
    setExpected('');
    setScreenshotUri(null);
  }

  async function pickScreenshot() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  }

  async function submit() {
    if (!description.trim()) {
      Alert.alert('', 'Describe qué pasó');
      return;
    }

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      let screenshotUrl = null;
      if (screenshotUri) {
        const filename = `${userId}/${Date.now()}.jpg`;
        const response = await fetch(screenshotUri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(filename, blob, { contentType: 'image/jpeg' });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('feedback-screenshots')
            .getPublicUrl(filename);
          screenshotUrl = urlData?.publicUrl;
        }
      }

      const { error } = await supabase.from('beta_feedback').insert({
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        screen_name: pathname || 'unknown',
        severity,
        category,
        description: description.trim(),
        expected: expected.trim() || null,
        screenshot_url: screenshotUrl,
        device_info: `${Platform.OS} ${Platform.Version}`,
        app_version: Constants.expoConfig?.version || 'unknown',
        status: 'new',
      });

      if (error) throw error;

      setVisible(false);
      Alert.alert('¡Gracias! 🙏', 'Tu feedback se envió. Lo revisaremos pronto.');
    } catch (e) {
      console.error('Feedback submit error:', e);
      Alert.alert('Error', 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Botón flotante — esquina inferior izquierda */}
      <Pressable
        onPress={open}
        style={{
          position: 'absolute',
          bottom: 100,
          left: 16,
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.08)',
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          zIndex: 90,
        }}
      >
        <Ionicons name="chatbox-ellipses-outline" size={18} color="#999" />
      </Pressable>

      {/* Modal de feedback */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}
          onPress={() => setVisible(false)}
        >
          <Pressable onPress={() => {}} style={{
            backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40, maxHeight: '85%',
          }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 16 }} />

              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
                Reportar feedback
              </Text>
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 20 }}>
                Pantalla: {pathname || 'desconocida'}
              </Text>

              {/* Severidad */}
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                ¿QUÉ TAN GRAVE ES?
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {SEVERITIES.map(s => (
                  <Pressable
                    key={s.id}
                    onPress={() => { setSeverity(s.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14,
                      backgroundColor: severity === s.id ? `${s.color}15` : '#111',
                      borderWidth: 1.5,
                      borderColor: severity === s.id ? s.color : '#1a1a1a',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
                    <Text style={{
                      color: severity === s.id ? s.color : '#666',
                      fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center',
                    }}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Categoría */}
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                CATEGORÍA
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {CATEGORIES.map(c => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
                      backgroundColor: category === c.id ? 'rgba(168,224,42,0.15)' : '#111',
                      borderWidth: 1,
                      borderColor: category === c.id ? '#a8e02a' : '#1a1a1a',
                    }}
                  >
                    <Text style={{
                      color: category === c.id ? '#a8e02a' : '#999',
                      fontSize: 12, fontWeight: '600',
                    }}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Descripción */}
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                ¿QUÉ PASÓ? *
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe el problema o sugerencia..."
                placeholderTextColor="#444"
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 14,
                  padding: 14, marginBottom: 14, minHeight: 100, textAlignVertical: 'top',
                  borderWidth: 1, borderColor: '#1a1a1a',
                }}
              />

              {/* Esperado (opcional) */}
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                ¿QUÉ ESPERABAS? (opcional)
              </Text>
              <TextInput
                value={expected}
                onChangeText={setExpected}
                placeholder="Qué debería haber pasado..."
                placeholderTextColor="#444"
                multiline
                numberOfLines={2}
                style={{
                  backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 14,
                  padding: 14, marginBottom: 14, minHeight: 60, textAlignVertical: 'top',
                  borderWidth: 1, borderColor: '#1a1a1a',
                }}
              />

              {/* Screenshot */}
              <Pressable onPress={pickScreenshot} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 20,
                borderWidth: 1, borderColor: screenshotUri ? '#a8e02a' : '#1a1a1a',
              }}>
                <Ionicons
                  name={screenshotUri ? 'checkmark-circle' : 'image-outline'}
                  size={20}
                  color={screenshotUri ? '#a8e02a' : '#666'}
                />
                <Text style={{ color: screenshotUri ? '#a8e02a' : '#999', fontSize: 13 }}>
                  {screenshotUri ? 'Screenshot adjunto' : 'Adjuntar screenshot (opcional)'}
                </Text>
              </Pressable>

              {/* Enviar */}
              <Pressable
                onPress={submit}
                disabled={!description.trim() || sending}
                style={{
                  backgroundColor: description.trim() && !sending ? '#a8e02a' : '#333',
                  borderRadius: 16, padding: 16, alignItems: 'center',
                }}
              >
                <Text style={{
                  color: description.trim() && !sending ? '#000' : '#666',
                  fontSize: 16, fontWeight: '800',
                }}>
                  {sending ? 'ENVIANDO...' : 'ENVIAR FEEDBACK'}
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
