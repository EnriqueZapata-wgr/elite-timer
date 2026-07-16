/**
 * ATP SOL — Exposición solar consciente.
 *
 * Filosofía:
 *  - El sol es necesario (vitamina D)
 *  - Exposición controlada es buena
 *  - Protección física primero (sombra, ropa, sombrero, lentes)
 *  - Filosofía: exposición solar inteligente como primera opción. Si se usa protector, preferir mineral.
 *  - ARGOS integra UV con el resto de la salud.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../src/lib/supabase';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import {
  fetchUVData,
  getCurrentLocation,
  getBurnTimeMinutes,
  getUVLevel,
  getProtectionAdvice,
  FITZPATRICK_TYPES,
  type UVData,
} from '../src/services/uv-service';

export default function Solar() {
  const insets = useSafeAreaInsets();
  const [uvData, setUvData] = useState<UVData | null>(null);
  const [skinType, setSkinType] = useState(3);
  const [loading, setLoading] = useState(true);
  const [showSkinPicker, setShowSkinPicker] = useState(false);
  const [showHourly, setShowHourly] = useState(false);
  const [showProtection, setShowProtection] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // #v13d 2.3: distinguir el fallo de ubicación (permiso/timeout GPS) del fallo de red (UV API).
  const [errorState, setErrorState] = useState<null | 'location' | 'fetch'>(null);

  // A.1 megahotfix 3ra pasada: profiles.skin_type es la fuente única del fototipo,
  // pero esta pantalla solo la leía al montar → quedaba stale (Tipo 4 vs Tipo 5)
  // si el cuestionario Fitzpatrick escribía con SOL ya montada en el stack.
  // Ahora relee en 'fototipo_changed' (mismo patrón que la card UV del HOY).
  const loadSkinType = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from('profiles')
      .select('skin_type')
      .eq('id', user.id)
      .maybeSingle();
    if (data?.skin_type) setSkinType(data.skin_type);
  }, []);

  useEffect(() => {
    loadSkinType();
    const sub = DeviceEventEmitter.addListener('fototipo_changed', loadSkinType);
    return () => sub.remove();
  }, [loadSkinType]);

  useFocusEffect(useCallback(() => { loadUV(); }, []));

  async function loadUV() {
    setLoading(true);
    setErrorState(null);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        // Ubicación denegada o timeout GPS (8s) → UI de reintentar, no loading infinito.
        setErrorState('location');
        setLoading(false);
        return;
      }
      const data = await fetchUVData(loc.latitude, loc.longitude);
      if (data) {
        setUvData(data);
        // Electrón de consciencia solar (1x al día)
        try {
          if (userId) {
            const { awardBooleanElectron } = await import('../src/services/electron-service');
            await awardBooleanElectron(userId, 'sun_awareness' as any);
            const { DeviceEventEmitter } = require('react-native');
            DeviceEventEmitter.emit('electrons_changed');
          }
        } catch (e) { /* opcional */ }
      } else {
        // fetchUVData devolvió null (red caída o timeout 10s) → UI de reintentar.
        setErrorState('fetch');
      }
    } catch (e) {
      console.error('UV error:', e);
      setErrorState('fetch');
    } finally {
      setLoading(false);
    }
  }

  async function saveSkin(type: number) {
    setSkinType(type);
    setShowSkinPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userId) await supabase.from('profiles').update({ skin_type: type }).eq('id', userId);
    // #v13f 2.2: avisar a la card UV del HOY que el fototipo cambió → refresh inmediato del
    // tiempo de exposición segura (sin esperar a recompilar al volver).
    DeviceEventEmitter.emit('fototipo_changed');
  }

  const level = uvData ? getUVLevel(uvData.currentUV) : null;
  const burnTime = uvData ? getBurnTimeMinutes(uvData.currentUV, skinType) : null;
  const protection = uvData ? getProtectionAdvice(uvData.currentUV) : [];
  const fitz = FITZPATRICK_TYPES.find(t => t.type === skinType)!;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP SOL</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Exposición Solar</Text>
          </View>
          <Pressable
            onPress={() => { setShowSkinPicker(!showSkinPicker); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{ backgroundColor: 'rgba(251,191,36,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)' }}
          >
            <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '700' }}>{fitz.emoji} Tipo {skinType}</Text>
          </Pressable>
        </View>
        {/* Sprint 1.5 A: CTA SIEMPRE visible al tipo de piel (antes el selector vivía
            dentro del branch uvData → sin GPS/red no había entry point al cuestionario). */}
        {!showSkinPicker && (
          <Pressable
            onPress={() => { setShowSkinPicker(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
              backgroundColor: 'rgba(251,191,36,0.06)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)',
              borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
            }}
          >
            <Text style={{ fontSize: 14 }}>🧬</Text>
            <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '700', flex: 1 }}>Actualizar tipo de piel</Text>
            <Text style={{ color: '#666', fontSize: 11 }}>cuestionario o manual</Text>
            <Ionicons name="chevron-down" size={14} color="#fbbf24" />
          </Pressable>
        )}
      </View>

      {/* SELECTOR DE PIEL — Sprint 1.5 A: fuera del branch uvData, disponible siempre
          (con UV cargando, sin GPS o sin red el cuestionario sigue accesible). */}
      {showSkinPicker && (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>Tu tipo de piel</Text>
            <Text style={{ color: '#999', fontSize: 12, marginBottom: 16 }}>Escala Fitzpatrick — determina tu tiempo de quemadura</Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/historia-clinica/fitzpatrick' as any); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12,
                marginBottom: 12, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
              }}
            >
              <Text style={{ fontSize: 20 }}>🧬</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '700' }}>Descúbrelo con el cuestionario</Text>
                <Text style={{ color: '#999', fontSize: 11 }}>6 preguntas · ATP calcula tu fototipo exacto</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#fbbf24" />
            </Pressable>
            <Text style={{ color: '#666', fontSize: 11, fontWeight: '600', marginBottom: 8, letterSpacing: 1 }}>O ELÍGELO MANUALMENTE</Text>
            {FITZPATRICK_TYPES.map(type => (
              <Pressable key={type.type} onPress={() => saveSkin(type.type)}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 4,
                  backgroundColor: skinType === type.type ? 'rgba(251,191,36,0.08)' : 'transparent',
                  borderWidth: skinType === type.type ? 1 : 0, borderColor: '#fbbf24',
                }}>
                  <Text style={{ fontSize: 24 }}>{type.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{type.label}</Text>
                    <Text style={{ color: '#999', fontSize: 11 }}>{type.description}</Text>
                  </View>
                  {skinType === type.type && <Ionicons name="checkmark-circle" size={20} color="#fbbf24" />}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 80 }}>
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text style={{ color: '#999', fontSize: 13, marginTop: 12 }}>Obteniendo datos UV...</Text>
        </View>
      ) : uvData ? (
        <View style={{ paddingHorizontal: 20 }}>

          {/* HERO: UV ACTUAL */}
          <LinearGradient
            colors={[`${level?.color}15`, 'transparent']}
            style={{ borderRadius: 20, padding: 28, marginBottom: 16, borderWidth: 1, borderColor: `${level?.color}25`, alignItems: 'center' }}
          >
            <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>ÍNDICE UV AHORA</Text>
            <Text style={{ color: level?.color, fontSize: 72, fontWeight: '900', lineHeight: 80 }}>{uvData.currentUV}</Text>
            <Text style={{ color: level?.color, fontSize: 20, fontWeight: '800' }}>{level?.level}</Text>
            <Text style={{ color: '#ccc', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{level?.advice}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#666', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>MÁX HOY</Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{uvData.maxUV}</Text>
                <Text style={{ color: '#666', fontSize: 11 }}>a las {uvData.maxUVTime}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#666', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>AMANECER</Text>
                <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '600' }}>{uvData.sunrise}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#666', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>ATARDECER</Text>
                <Text style={{ color: '#fb923c', fontSize: 16, fontWeight: '600' }}>{uvData.sunset}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* VENTANA DE VITAMINA D */}
          {uvData.vitaminDWindow ? (
            <View style={{ backgroundColor: 'rgba(251,191,36,0.06)', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.12)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Ionicons name="sunny" size={18} color="#fbbf24" />
                <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>VENTANA DE VITAMINA D</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>{uvData.vitaminDWindow.start} — {uvData.vitaminDWindow.end}</Text>
              <Text style={{ color: '#ccc', fontSize: 13, marginTop: 6, lineHeight: 20 }}>
                Exponte 10-15 min sin protección en este horario para sintetizar vitamina D3. Brazos y piernas al sol.
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: 'rgba(96,165,250,0.06)', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(96,165,250,0.12)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="moon-outline" size={18} color="#60a5fa" />
                <Text style={{ color: '#60a5fa', fontSize: 13, fontWeight: '600' }}>
                  {uvData.currentUV === 0 ? 'Sin UV ahora — revisa mañana para tu ventana de vitamina D' : 'UV insuficiente para sintetizar vitamina D hoy'}
                </Text>
              </View>
            </View>
          )}

          {/* TIEMPO DE QUEMADURA */}
          <View style={{ backgroundColor: '#0a0a0a', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1a1a1a' }}>
            <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>TU TIEMPO SIN PROTECCIÓN</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{
                color: burnTime && burnTime < 30 ? '#ef4444' : burnTime && burnTime < 60 ? '#fbbf24' : '#22c55e',
                fontSize: 48, fontWeight: '900',
              }}>
                {burnTime && burnTime < 999 ? burnTime : '∞'}
              </Text>
              <Text style={{ color: '#999', fontSize: 16 }}>minutos</Text>
            </View>
            <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>Basado en {fitz.emoji} {fitz.label} · UV actual: {uvData.currentUV}</Text>
            {burnTime && burnTime < 60 && (
              <Text style={{ color: '#fb7185', fontSize: 12, marginTop: 8 }}>Después de {burnTime} min, busca sombra o cubre tu piel</Text>
            )}
          </View>

          {/* PROTECCIÓN INTELIGENTE (colapsable) */}
          <Pressable onPress={() => { setShowProtection(!showProtection); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <View style={{ backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: showProtection ? 0 : 12, borderWidth: 1, borderColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#22c55e" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Protección inteligente</Text>
              </View>
              <Ionicons name={showProtection ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </View>
          </Pressable>
          {showProtection && (
            <View style={{ backgroundColor: '#0a0a0a', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1a1a1a' }}>
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>PRIORIDAD (MÁS A MENOS)</Text>
              {protection.map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}>{item.priority}</Text>
                  </View>
                  <Ionicons name={item.icon as any} size={20} color="#22c55e" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{item.text}</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>{item.sub}</Text>
                  </View>
                </View>
              ))}
              {uvData.currentUV > 7 && (
                <View style={{ backgroundColor: 'rgba(251,191,36,0.06)', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.1)' }}>
                  <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Si optas por protector solar</Text>
                  <Text style={{ color: '#999', fontSize: 11, lineHeight: 18 }}>
                    Si decides usar protector, ATP sugiere ingredientes minerales (óxido de zinc, dióxido de titanio).{'\n'}
                    Algunos estudios cuestionan ciertos ingredientes químicos comunes; consulta con tu dermatólogo lo que mejor te convenga.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* VENTANA PELIGROSA */}
          {uvData.dangerousFrom && (
            <View style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.12)' }}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 }}>PROTECCIÓN NECESARIA</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{uvData.dangerousFrom} — {uvData.dangerousUntil || uvData.sunset}</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>UV ≥ 3 — protégete con métodos físicos</Text>
            </View>
          )}

          {/* UV HORARIO (colapsable) */}
          <Pressable onPress={() => { setShowHourly(!showHourly); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <View style={{ backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: showHourly ? 0 : 12, borderWidth: 1, borderColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="bar-chart-outline" size={18} color="#fbbf24" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>UV por hora</Text>
              </View>
              <Ionicons name={showHourly ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </View>
          </Pressable>
          {showHourly && (
            <View style={{ backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1a1a1a' }}>
              {uvData.hourlyUV
                .filter(h => { const hr = parseInt(h.time.split(':')[0]); return hr >= 6 && hr <= 20; })
                .map((h, i) => {
                  const lvl = getUVLevel(h.uv);
                  const width = Math.min((h.uv / Math.max(uvData.maxUV, 1)) * 100, 100);
                  const isNow = parseInt(h.time.split(':')[0]) === new Date().getHours();
                  return (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3,
                        backgroundColor: isNow ? 'rgba(251,191,36,0.06)' : 'transparent',
                        borderRadius: 8, padding: isNow ? 4 : 0, paddingHorizontal: isNow ? 6 : 0,
                      }}
                    >
                      <Text style={{ color: isNow ? '#fbbf24' : '#666', fontSize: 11, width: 38, textAlign: 'right', fontWeight: isNow ? '700' : '400' }}>{h.time}</Text>
                      <View style={{ flex: 1, height: 14, backgroundColor: '#111', borderRadius: 7, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.max(width, 2)}%`, height: '100%', backgroundColor: lvl.color, borderRadius: 7 }} />
                      </View>
                      <Text style={{ color: lvl.color, fontSize: 11, width: 26, textAlign: 'right', fontWeight: '600' }}>{h.uv}</Text>
                      {isNow && <Text style={{ color: '#fbbf24', fontSize: 9, fontWeight: '700' }}>AHORA</Text>}
                    </View>
                  );
                })}
            </View>
          )}

          {/* ARGOS LINK */}
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/argos-chat'); }}>
            <View style={{ backgroundColor: 'rgba(168,224,42,0.06)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(168,224,42,0.12)', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="eye-outline" size={20} color="#a8e02a" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#a8e02a', fontSize: 13, fontWeight: '600' }}>Pregunta a ARGOS sobre tu sol</Text>
                <Text style={{ color: '#666', fontSize: 11 }}>"¿A qué hora debo tomar sol hoy para vitamina D?"</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </View>
          </Pressable>

          <Pressable onPress={() => { loadUV(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: '#444', fontSize: 11 }}>Toca para actualizar UV</Text>
          </Pressable>
        </View>
      ) : errorState === 'fetch' ? (
        // #v13d 2.3: fallo de red / timeout 10s → reintentar (no quedar en loading forever).
        <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#fb923c" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>No pudimos obtener datos UV</Text>
          <Text style={{ color: '#999', fontSize: 13, textAlign: 'center', marginTop: 8 }}>Revisa tu conexión e inténtalo de nuevo</Text>
          <Pressable onPress={loadUV} style={{ backgroundColor: '#fbbf24', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginTop: 20 }}>
            <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>REINTENTAR</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
          <Ionicons name="location-outline" size={48} color="#fbbf24" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>Necesitamos tu ubicación</Text>
          <Text style={{ color: '#999', fontSize: 13, textAlign: 'center', marginTop: 8 }}>Para mostrar el índice UV de tu zona</Text>
          <Pressable onPress={loadUV} style={{ backgroundColor: '#fbbf24', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginTop: 20 }}>
            <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>PERMITIR UBICACIÓN</Text>
          </Pressable>
        </View>
      )}
      <MedicalDisclaimer feature="solar" />
    </ScrollView>
  );
}
