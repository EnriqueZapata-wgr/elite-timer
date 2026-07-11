/**
 * BhaScanSheet — flujo del scanner BHA (Biohacker Approved).
 * Sprint SUPS+BHA, Bloque 4.
 *
 * Fases: quote (pre-flight H+) → picking foto → scanning (LLM) → result
 * (sello grande ✅/❌ + reasons + summary). Si viene con `supplement`, persiste
 * el sello en la ficha (bha_status/bha_scan_summary); standalone (entrada de
 * sección) solo muestra el resultado — sirve también para comida empaquetada.
 *
 * Doctrina: registro, no recomendación — el sello evalúa formulación, nunca
 * sugiere comprar/tomar nada.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/src/utils/haptics';
import { ELEVATION, TEXT } from '@/src/constants/brand';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { getBhaScanQuote, persistBhaSeal, runBhaScan } from '@/src/services/bha-service';
import type { BhaScanResult } from '@/src/services/bha-core';

const GREEN = '#4ade80';
const RED = '#ef4444';

interface BhaTarget {
  id: string;
  name: string;
  brand?: string | null;
}

interface Props {
  visible: boolean;
  userId: string;
  /** Ficha destino del sello. null = scan standalone (no persiste). */
  supplement: BhaTarget | null;
  onClose: () => void;
  /** Se llamó persistBhaSeal con éxito → el caller recarga la lista. */
  onSealPersisted?: () => void;
}

type Phase = 'quote' | 'scanning' | 'result';

export function BhaScanSheet({ visible, userId, supplement, onClose, onSealPersisted }: Props) {
  const insets = useSafeAreaInsets();
  const { track } = useAnalytics();
  const [phase, setPhase] = useState<Phase>('quote');
  const [quote, setQuote] = useState<{ cost: number; balance: number } | null>(null);
  const [result, setResult] = useState<BhaScanResult | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPhase('quote');
    setResult(null);
    setQuote(null);
    getBhaScanQuote(userId).then(setQuote).catch(() => setQuote(null));
  }, [visible, userId]);

  const insufficientAlert = useCallback((required: number, balance: number) => {
    Alert.alert(
      'Te faltan H+',
      `El escaneo BHA usa ${required} H+ y tienes ${balance}. Recarga o gana más completando tu día.`,
      [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Conseguir H+', onPress: () => { onClose(); router.push('/economy/shop' as any); } },
      ],
    );
  }, [onClose]);

  const scan = useCallback(async (photoBase64: string) => {
    setPhase('scanning');
    const outcome = await runBhaScan(userId, photoBase64, {
      productName: supplement?.name,
      brand: supplement?.brand,
    });
    if (outcome.status === 'insufficient_h_plus') {
      haptic.warning();
      setPhase('quote');
      insufficientAlert(quote?.cost ?? 500, quote?.balance ?? 0);
      return;
    }
    if (outcome.status === 'error') {
      haptic.warning();
      setPhase('quote');
      Alert.alert('No se pudo escanear', 'La etiqueta no se pudo interpretar. Intenta con una foto más clara y con buena luz.');
      return;
    }
    setResult(outcome.result);
    setPhase('result');
    haptic.success();
    track(ATP_EVENTS.BHA_SCAN_COMPLETED, {
      verdict: outcome.result.verdict,
      has_supplement: !!supplement,
      flagged_count: outcome.result.flagged_ingredients.length,
    });
    if (supplement) {
      const persisted = await persistBhaSeal(supplement.id, outcome.result);
      if (persisted.success) onSealPersisted?.();
    }
  }, [userId, supplement, quote, insufficientAlert, track, onSealPersisted]);

  const pick = useCallback(async (source: 'camera' | 'library') => {
    // Pre-flight H+ (patrón DX): no dejar llegar al 402 con foto ya tomada.
    if (quote && quote.balance < quote.cost) {
      haptic.warning();
      insufficientAlert(quote.cost, quote.balance);
      return;
    }
    haptic.light();
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara para escanear.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
      if (!res.canceled && res.assets[0]?.base64) scan(res.assets[0].base64);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true, mediaTypes: ['images'] });
      if (!res.canceled && res.assets[0]?.base64) scan(res.assets[0].base64);
    }
  }, [quote, insufficientAlert, scan]);

  const approved = result?.verdict === 'approved';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={phase === 'scanning' ? undefined : onClose} />
        <View style={{
          backgroundColor: ELEVATION[2].bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderWidth: 1, borderColor: ELEVATION[2].border,
          padding: 24, paddingBottom: insets.bottom + 24, maxHeight: '85%',
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 16 }} />

          {/* ── Fase 1: quote + tomar foto ── */}
          {phase === 'quote' && (
            <View>
              <Text style={{ color: TEXT.primary, fontSize: 18, fontWeight: '800' }}>
                Escanear con BHA
              </Text>
              <Text style={{ color: TEXT.secondary, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
                Toma una foto de la etiqueta{supplement ? ` de ${supplement.name}` : ' (suplemento o comida empaquetada)'} y
                el sello Biohacker Approved evalúa la formulación: colorantes, endulzantes
                artificiales, formas baratas vs biodisponibles y rellenos innecesarios.
              </Text>
              <Text style={{ color: TEXT.tertiary, fontSize: 11, marginTop: 10, lineHeight: 16 }}>
                El sello evalúa calidad de formulación. No es recomendación de compra ni consejo médico.
              </Text>

              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, marginTop: 16,
                borderWidth: 1, borderColor: ELEVATION[1].border,
              }}>
                <Text style={{ color: TEXT.secondary, fontSize: 12, fontWeight: '600' }}>Costo del escaneo</Text>
                <Text style={{ color: '#EF9F27', fontSize: 14, fontWeight: '800' }}>
                  {quote ? `${quote.cost} H+` : '…'}
                </Text>
              </View>
              {quote && (
                <Text style={{ color: quote.balance >= quote.cost ? TEXT.tertiary : '#f97316', fontSize: 11, marginTop: 6 }}>
                  Tu balance: {quote.balance} H+
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <Pressable
                  onPress={() => pick('camera')}
                  style={{
                    flex: 1, backgroundColor: '#a8e02a', borderRadius: 14, padding: 15,
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Ionicons name="camera-outline" size={18} color="#000" />
                  <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>TOMAR FOTO</Text>
                </Pressable>
                <Pressable
                  onPress={() => pick('library')}
                  style={{
                    backgroundColor: '#0a0a0a', borderRadius: 14, padding: 15, paddingHorizontal: 18,
                    alignItems: 'center', borderWidth: 1, borderColor: ELEVATION[2].border,
                  }}
                >
                  <Ionicons name="images-outline" size={18} color={TEXT.secondary} />
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Fase 2: escaneando ── */}
          {phase === 'scanning' && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#a8e02a" />
              <Text style={{ color: TEXT.primary, fontSize: 15, fontWeight: '700', marginTop: 16 }}>
                Analizando etiqueta…
              </Text>
              <Text style={{ color: TEXT.tertiary, fontSize: 12, marginTop: 6 }}>
                Leyendo ingredientes y formas químicas
              </Text>
            </View>
          )}

          {/* ── Fase 3: resultado ── */}
          {phase === 'result' && result && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{
                  width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: approved ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
                  borderWidth: 2, borderColor: approved ? GREEN : RED,
                }}>
                  <Ionicons name={approved ? 'checkmark' : 'close'} size={48} color={approved ? GREEN : RED} />
                </View>
                <Text style={{ color: approved ? GREEN : RED, fontSize: 20, fontWeight: '800', marginTop: 12 }}>
                  {approved ? 'BIOHACKER APPROVED' : 'NO APROBADO'}
                </Text>
                {supplement && (
                  <Text style={{ color: TEXT.tertiary, fontSize: 12, marginTop: 4 }}>
                    Sello guardado en la ficha de {supplement.name}
                  </Text>
                )}
              </View>

              {!!result.summary && (
                <Text style={{ color: TEXT.primary, fontSize: 14, lineHeight: 21, marginBottom: 14 }}>
                  {result.summary}
                </Text>
              )}

              {result.reasons.length > 0 && (
                <View style={{
                  backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, marginBottom: 10,
                  borderWidth: 1, borderColor: ELEVATION[1].border,
                }}>
                  <Text style={{ color: TEXT.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 }}>
                    RAZONES
                  </Text>
                  {result.reasons.map((r, i) => (
                    <Text key={i} style={{ color: TEXT.secondary, fontSize: 13, lineHeight: 19, marginBottom: 4 }}>
                      •  {r}
                    </Text>
                  ))}
                </View>
              )}

              {result.flagged_ingredients.length > 0 && (
                <View style={{
                  backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 12, padding: 14, marginBottom: 10,
                  borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
                }}>
                  <Text style={{ color: RED, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 }}>
                    INGREDIENTES SEÑALADOS
                  </Text>
                  {result.flagged_ingredients.map((f, i) => (
                    <Text key={i} style={{ color: TEXT.secondary, fontSize: 13, lineHeight: 19, marginBottom: 4 }}>
                      •  {f}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={{ color: TEXT.muted, fontSize: 10, lineHeight: 15, marginBottom: 16, textAlign: 'center' }}>
                Esto es tu registro. No es recomendación. Es responsabilidad de quien te lo indicó.
              </Text>

              <Pressable
                onPress={() => { haptic.light(); onClose(); }}
                style={{ backgroundColor: '#a8e02a', borderRadius: 14, padding: 15, alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>LISTO</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
