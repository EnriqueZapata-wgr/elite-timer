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
import { captureScreen } from 'react-native-view-shot';
import { supabase } from '../lib/supabase';
import { usePathname } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

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
  const t = useSurfaceTokens();
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

  async function open() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Auto-captura ANTES de abrir el modal
    let capturedUri: string | null = null;
    try {
      capturedUri = await captureScreen({ format: 'jpg', quality: 0.6 });
    } catch (e) {
      console.warn('Screenshot auto-capture failed:', e);
    }

    setSeverity('yellow');
    setCategory('bug');
    setDescription('');
    setExpected('');
    setScreenshotUri(capturedUri);
    setVisible(true);
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
          backgroundColor: t.kind === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 1, borderColor: t.kind === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,21,24,0.08)',
          zIndex: 90,
        }}
      >
        <Ionicons name="chatbox-ellipses-outline" size={18} color={t.textoSecundario} />
      </Pressable>

      {/* Modal de feedback */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: t.kind === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)', justifyContent: 'flex-end' }}
          onPress={() => setVisible(false)}
        >
          <Pressable onPress={() => {}} style={{
            backgroundColor: t.flotante, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40, maxHeight: '85%',
          }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.bordeMarcado, alignSelf: 'center', marginBottom: 16 }} />

              <Text style={{ color: t.texto, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
                Reportar feedback
              </Text>
              <Text style={{ color: t.textoSecundario, fontSize: 12, marginBottom: 20 }}>
                Pantalla: {pathname || 'desconocida'}
              </Text>

              {/* Severidad */}
              <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                ¿QUÉ TAN GRAVE ES?
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {SEVERITIES.map(s => (
                  <Pressable
                    key={s.id}
                    onPress={() => { setSeverity(s.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14,
                      backgroundColor: severity === s.id ? `${s.color}15` : t.hundido,
                      borderWidth: 1.5,
                      borderColor: severity === s.id ? s.color : t.borde,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
                    {/* El color de severidad ya viaja en el emoji, el borde y el tinte;
                        como letra en claro varios no alcanzan contraste (amber sobre todo). */}
                    <Text style={{
                      color: severity === s.id ? (t.kind === 'dark' ? s.color : t.texto) : t.textoSecundario,
                      fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center',
                    }}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Categoría */}
              <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                CATEGORÍA
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {CATEGORIES.map(c => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
                      backgroundColor: category === c.id ? 'rgba(168,224,42,0.15)' : t.hundido,
                      borderWidth: 1,
                      borderColor: category === c.id ? '#a8e02a' : t.borde,
                    }}
                  >
                    <Text style={{
                      // Regla 3 del claro: el lima jamás es letra en claro.
                      color: category === c.id ? (t.kind === 'dark' ? '#a8e02a' : t.tealTexto) : t.textoSecundario,
                      fontSize: 12, fontWeight: '600',
                    }}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Descripción */}
              <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                ¿QUÉ PASÓ? *
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe el problema o sugerencia..."
                placeholderTextColor={t.sinDatos}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: t.hundido, color: t.texto, fontSize: 15, borderRadius: 14,
                  padding: 14, marginBottom: 14, minHeight: 100, textAlignVertical: 'top',
                  borderWidth: 1, borderColor: t.borde,
                }}
              />

              {/* Esperado (opcional) */}
              <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                ¿QUÉ ESPERABAS? (opcional)
              </Text>
              <TextInput
                value={expected}
                onChangeText={setExpected}
                placeholder="Qué debería haber pasado..."
                placeholderTextColor={t.sinDatos}
                multiline
                numberOfLines={2}
                style={{
                  backgroundColor: t.hundido, color: t.texto, fontSize: 15, borderRadius: 14,
                  padding: 14, marginBottom: 14, minHeight: 60, textAlignVertical: 'top',
                  borderWidth: 1, borderColor: t.borde,
                }}
              />

              {/* Screenshot */}
              <Pressable onPress={pickScreenshot} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: t.hundido, borderRadius: 14, padding: 14, marginBottom: 20,
                borderWidth: 1, borderColor: screenshotUri ? '#a8e02a' : t.borde,
              }}>
                <Ionicons
                  name={screenshotUri ? 'checkmark-circle' : 'image-outline'}
                  size={20}
                  color={screenshotUri ? '#a8e02a' : t.textoSecundario}
                />
                <Text style={{ color: screenshotUri ? (t.kind === 'dark' ? '#a8e02a' : t.tealTexto) : t.textoSecundario, fontSize: 13 }}>
                  {screenshotUri ? 'Screenshot capturado (toca para cambiar)' : 'Adjuntar screenshot (opcional)'}
                </Text>
              </Pressable>

              {/* Enviar */}
              <Pressable
                onPress={submit}
                disabled={!description.trim() || sending}
                style={{
                  backgroundColor: description.trim() && !sending ? '#a8e02a' : t.bordeMarcado,
                  borderRadius: 16, padding: 16, alignItems: 'center',
                }}
              >
                <Text style={{
                  color: description.trim() && !sending ? t.textoSobreLima : t.textoSecundario,
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
