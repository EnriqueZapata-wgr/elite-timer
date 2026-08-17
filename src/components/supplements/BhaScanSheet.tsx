/**
 * BhaScanSheet — flujo del scanner ATP Functional Score (Sprint Compliance 4;
 * antes sello BHA binario).
 *
 * Fases: intro → picking foto → scanning (LLM) → result
 * (score numérico 0-100 + desglose por atributos + summary objetivo). Si viene
 * con `supplement`, persiste el score en la ficha (functional_score +
 * bha_scan_summary); standalone (entrada de sección) muestra el resultado y
 * ofrece "Agregar a mi plan" (MB-2: crea la ficha CON su score de una, dedupe
 * por nombre contra fichas activas) — sirve también para comida empaquetada.
 *
 * Doctrina: registro, no recomendación — el score evalúa formulación (cero
 * marcas, cero adjetivos, privado al usuario); nunca sugiere comprar/tomar nada.
 *
 * PREMIUM (16-ago-2026): la primera fase se llamaba 'quote' y era literalmente
 * una cotización: precio del escaneo, saldo disponible y un pre-flight que
 * frenaba antes de tomar la foto si no alcanzaba. Ya no cuesta nada, así que la
 * hoja se queda con lo único que la persona necesitaba saber ahí: qué hace el
 * escaneo y qué NO hace.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, getScoreColor, getScoreLabel } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { persistFunctionalScore, runBhaScan } from '@/src/services/bha-service';
import { addSupplementToPlan } from '@/src/services/supplements-plan-service';
import type { FunctionalScoreResult } from '@/src/services/bha-core';

// Rojo de dominio (INGREDIENTES SEÑALADOS): en oscuro se queda igual; en
// claro cae a t.error (calibrado) para no gritar más que un biomarcador.
const RED = '#ef4444';

interface BhaTarget {
  id: string;
  name: string;
  brand?: string | null;
}

interface Props {
  visible: boolean;
  userId: string;
  /** Ficha destino del sello. null = scan standalone (ofrece agregar al plan). */
  supplement: BhaTarget | null;
  onClose: () => void;
  /** Se persistió score o se creó/actualizó ficha → el caller recarga la lista. */
  onSealPersisted?: () => void;
}

type Phase = 'intro' | 'scanning' | 'result';

export function BhaScanSheet({ visible, userId, supplement, onClose, onSealPersisted }: Props) {
  const insets = useSafeAreaInsets();
  // Componente compartido: tokens del scope (oscuro fuera de <ThemeReady>).
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const tealTx = dark ? '#1D9E75' : t.tealTexto;
  const errorTx = dark ? RED : t.error;
  const { track } = useAnalytics();
  const [phase, setPhase] = useState<Phase>('intro');
  const [result, setResult] = useState<FunctionalScoreResult | null>(null);
  // MB-2 standalone: alta al plan desde el resultado (evalúa + agrega en uno)
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [addedName, setAddedName] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPhase('intro');
    setResult(null);
    setAddingToPlan(false);
    setAddedName(null);
  }, [visible]);

  const scan = useCallback(async (photoBase64: string) => {
    setPhase('scanning');
    const outcome = await runBhaScan(userId, photoBase64, {
      productName: supplement?.name,
      brand: supplement?.brand,
    });
    if (outcome.status === 'illegible' || outcome.status === 'error') {
      haptic.warning();
      setPhase('intro');
      Alert.alert('No se pudo escanear', 'La etiqueta no se pudo interpretar. Intenta con una foto más clara y con buena luz.');
      return;
    }
    setResult(outcome.result);
    setPhase('result');
    haptic.success();
    track(ATP_EVENTS.BHA_SCAN_COMPLETED, {
      score: outcome.result.score,
      has_supplement: !!supplement,
      flagged_count: outcome.result.flagged_ingredients.length,
    });
    if (supplement) {
      const persisted = await persistFunctionalScore(supplement.id, outcome.result);
      if (persisted.success) onSealPersisted?.();
    }
  }, [userId, supplement, track, onSealPersisted]);

  /** MB-2: "Agregar al plan" desde el scan standalone — crea la ficha con su
   * functional_score de una; si ya existe (dedupe por nombre normalizado)
   * ofrece actualizar el score de la ficha existente. */
  const addToPlan = useCallback(async () => {
    if (!result || result.illegible || addingToPlan) return;
    haptic.light();
    setAddingToPlan(true);
    const name = result.product_name?.trim() || 'Suplemento escaneado';
    const outcome = await addSupplementToPlan(userId, { name }, result);
    setAddingToPlan(false);
    if (outcome.status === 'created') {
      setAddedName(name);
      haptic.success();
      onSealPersisted?.();
      return;
    }
    if (outcome.status === 'duplicate') {
      Alert.alert(
        'Ya está en tu plan',
        `Ya tienes una ficha de ${outcome.existingName}. ¿Actualizar su ATP Functional Score con este escaneo?`,
        [
          { text: 'Ahora no', style: 'cancel' },
          {
            text: 'Actualizar score',
            onPress: async () => {
              const persisted = await persistFunctionalScore(outcome.existingId, result);
              if (persisted.success) {
                setAddedName(outcome.existingName);
                haptic.success();
                onSealPersisted?.();
              } else {
                Alert.alert('No se pudo actualizar', 'Revisa tu conexión e intenta de nuevo.');
              }
            },
          },
        ],
      );
      return;
    }
    Alert.alert('No se pudo agregar', 'Revisa tu conexión e intenta de nuevo.');
  }, [result, addingToPlan, userId, onSealPersisted]);

  const pick = useCallback(async (source: 'camera' | 'library') => {
    // PREMIUM (16-ago-2026): aquí iba el pre-flight de saldo, para no dejar que
    // alguien tomara la foto y hasta entonces se enterara de que no le
    // alcanzaba. Sin costo no hay nada que revisar antes de abrir la cámara.
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
  }, [scan]);

  const scoreColor = result ? getScoreColor(result.score) : t.textoSecundario;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: dark ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={phase === 'scanning' ? undefined : onClose} />
        <View style={{
          backgroundColor: t.flotante, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderWidth: 1, borderColor: t.bordeMarcado,
          padding: 24, paddingBottom: insets.bottom + 24, maxHeight: '85%',
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.bordeMarcado, alignSelf: 'center', marginBottom: 16 }} />

          {/* ── Fase 1: qué hace el escaneo + tomar foto ── */}
          {phase === 'intro' && (
            <View>
              <Text style={{ color: t.texto, fontSize: 18, fontWeight: '800' }}>
                ATP Functional Score
              </Text>
              <Text style={{ color: t.textoSecundario, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
                Toma una foto de la etiqueta{supplement ? ` de ${supplement.name}` : ' (suplemento o comida empaquetada)'} y
                obtén un score de 0 a 100 de la formulación por atributos: formas y
                biodisponibilidad, colorantes y endulzantes, excipientes y transparencia.
              </Text>
              <Text style={{ color: t.textoTenue, fontSize: 11, marginTop: 10, lineHeight: 16 }}>
                Evaluación educativa de la formulación, privada para ti. No evalúa marcas,
                no es recomendación de compra ni consejo médico.
              </Text>

              {/* PREMIUM (16-ago-2026): aquí iba la caja de "Costo del escaneo"
                  con su precio en H+ y el renglón del balance debajo. */}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <Pressable
                  onPress={() => pick('camera')}
                  style={{
                    flex: 1, backgroundColor: ATP_BRAND.lime, borderRadius: 14, padding: 15,
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Ionicons name="camera-outline" size={18} color={t.textoSobreLima} />
                  <Text style={{ color: t.textoSobreLima, fontSize: 14, fontWeight: '800' }}>TOMAR FOTO</Text>
                </Pressable>
                <Pressable
                  onPress={() => pick('library')}
                  style={{
                    backgroundColor: t.hundido, borderRadius: 14, padding: 15, paddingHorizontal: 18,
                    alignItems: 'center', borderWidth: 1, borderColor: t.bordeMarcado,
                  }}
                >
                  <Ionicons name="images-outline" size={18} color={t.textoSecundario} />
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Fase 2: escaneando ── */}
          {phase === 'scanning' && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={acento} />
              <Text style={{ color: t.texto, fontSize: 15, fontWeight: '700', marginTop: 16 }}>
                Analizando etiqueta…
              </Text>
              <Text style={{ color: t.textoTenue, fontSize: 12, marginTop: 6 }}>
                Leyendo ingredientes y formas químicas
              </Text>
            </View>
          )}

          {/* ── Fase 3: resultado (score numérico por atributos) ── */}
          {phase === 'result' && result && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{
                  width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${scoreColor}1F`,
                  borderWidth: 2, borderColor: scoreColor,
                }}>
                  <Text style={{ color: scoreColor, fontSize: 34, fontWeight: '800' }}>{result.score}</Text>
                </View>
                {/* MB-17: etiqueta de nivel — el estado nunca es solo color. */}
                <Text style={{ color: scoreColor, fontSize: 12, fontWeight: '800', marginTop: 8, letterSpacing: 1.5 }}>
                  {getScoreLabel(result.score)}
                </Text>
                <Text style={{ color: t.texto, fontSize: 16, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 }}>
                  ATP FUNCTIONAL SCORE
                </Text>
                {supplement && (
                  <Text style={{ color: t.textoTenue, fontSize: 12, marginTop: 4 }}>
                    Score guardado en la ficha de {supplement.name}
                  </Text>
                )}
                {!supplement && !!result.product_name && (
                  <Text style={{ color: t.textoTenue, fontSize: 12, marginTop: 4 }}>
                    {result.product_name}
                  </Text>
                )}
              </View>

              {!!result.summary && (
                <Text style={{ color: t.texto, fontSize: 14, lineHeight: 21, marginBottom: 14 }}>
                  {result.summary}
                </Text>
              )}

              {result.attributes.length > 0 && (
                <View style={{
                  backgroundColor: t.hundido, borderRadius: 12, padding: 14, marginBottom: 10,
                  borderWidth: 1, borderColor: t.borde,
                }}>
                  <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 }}>
                    ATRIBUTOS
                  </Text>
                  {result.attributes.map((a) => (
                    <View key={a.key} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: t.textoSecundario, fontSize: 12, fontWeight: '600' }}>{a.label}</Text>
                        <Text style={{ color: getScoreColor(a.score), fontSize: 12, fontWeight: '800' }}>{a.score}</Text>
                      </View>
                      <View style={{ height: 5, borderRadius: 3, backgroundColor: t.flotante, overflow: 'hidden' }}>
                        <View style={{
                          width: `${a.score}%`, height: '100%', borderRadius: 3,
                          backgroundColor: getScoreColor(a.score),
                        }} />
                      </View>
                      {!!a.note && (
                        <Text style={{ color: t.textoTenue, fontSize: 11, lineHeight: 15, marginTop: 3 }}>
                          {a.note}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {result.flagged_ingredients.length > 0 && (
                <View style={{
                  backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 12, padding: 14, marginBottom: 10,
                  borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
                }}>
                  <Text style={{ color: errorTx, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 }}>
                    INGREDIENTES SEÑALADOS
                  </Text>
                  {result.flagged_ingredients.map((f, i) => (
                    <Text key={i} style={{ color: t.textoSecundario, fontSize: 13, lineHeight: 19, marginBottom: 4 }}>
                      •  {f}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={{ color: t.sinDatos, fontSize: 10, lineHeight: 15, marginBottom: 16, textAlign: 'center' }}>
                Esto es tu registro. No es recomendación. Es responsabilidad de quien te lo indicó.
              </Text>

              {/* MB-2: standalone → agregar al plan con el score de una (dedupe
                  por nombre). Con ficha destino el score ya se persistió. */}
              {!supplement && (addedName ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: 'rgba(29,158,117,0.1)', borderRadius: 14, padding: 14, marginBottom: 10,
                  borderWidth: 1, borderColor: 'rgba(29,158,117,0.3)',
                }}>
                  <Ionicons name="checkmark-circle" size={18} color={tealTx} />
                  <Text style={{ color: tealTx, fontSize: 13, fontWeight: '700', flexShrink: 1 }}>
                    {addedName} está en tu plan con este score
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={addToPlan}
                  disabled={addingToPlan}
                  style={{
                    backgroundColor: ATP_BRAND.lime, borderRadius: 14, padding: 15, alignItems: 'center',
                    marginBottom: 10, opacity: addingToPlan ? 0.6 : 1,
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                  }}
                >
                  {addingToPlan
                    ? <ActivityIndicator size="small" color={t.textoSobreLima} />
                    : <Ionicons name="add-circle-outline" size={18} color={t.textoSobreLima} />}
                  <Text style={{ color: t.textoSobreLima, fontSize: 14, fontWeight: '800' }}>AGREGAR A MI PLAN</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => { haptic.light(); onClose(); }}
                style={{
                  backgroundColor: !supplement && !addedName ? t.hundido : ATP_BRAND.lime,
                  borderWidth: !supplement && !addedName ? 1 : 0,
                  borderColor: t.bordeMarcado,
                  borderRadius: 14, padding: 15, alignItems: 'center',
                }}
              >
                <Text style={{
                  color: !supplement && !addedName ? t.textoSecundario : t.textoSobreLima,
                  fontSize: 14, fontWeight: '800',
                }}>LISTO</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
