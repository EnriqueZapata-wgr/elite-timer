/**
 * Ayuno — Rediseño estilo ZERO.
 *
 * 3 estados: IDLE (selector + preview), ACTIVE (ring timer + zonas), HISTORY.
 * Columnas DB: fast_start, target_hours, actual_hours, status, date.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Dimensions, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../src/lib/supabase';
import { getLocalToday } from '../src/utils/date-helpers';
import { awardBooleanElectron } from '../src/services/electron-service';
import { getFastingTier } from '../src/constants/electrons';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.65;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Protocolos de ayuno
const FASTING_PROTOCOLS = [
  { id: '12:12', hours: 12, label: '12:12', description: 'Principiante — 12h ayuno, 12h alimentación', color: '#22c55e' },
  { id: '14:10', hours: 14, label: '14:10', description: 'Intermedio — 14h ayuno, 10h alimentación', color: '#38bdf8' },
  { id: '16:8', hours: 16, label: '16:8', description: 'Popular — 16h ayuno, 8h alimentación', color: '#a8e02a' },
  { id: '18:6', hours: 18, label: '18:6', description: 'Avanzado — 18h ayuno, 6h alimentación', color: '#f59e0b' },
  { id: '20:4', hours: 20, label: '20:4', description: 'Warrior — 20h ayuno, 4h alimentación', color: '#f97316' },
  { id: '24:0', hours: 24, label: 'OMAD', description: 'Una comida al día — 24h de ayuno', color: '#ef4444' },
  { id: '36:0', hours: 36, label: '36h', description: 'Ayuno extendido — 36 horas', color: '#c084fc' },
  { id: '72:0', hours: 72, label: '72h', description: 'Ayuno prolongado — 72 horas', color: '#ec4899' },
];

// Zonas biológicas del ayuno
const FASTING_ZONES = [
  { hours: 0, label: 'Fase alimentada', description: 'Digestión y absorción de nutrientes', color: '#22c55e', icon: 'restaurant-outline' as const },
  { hours: 4, label: 'Postabsorción', description: 'Glucosa en sangre baja, empieza a usar reservas', color: '#38bdf8', icon: 'trending-down-outline' as const },
  { hours: 8, label: 'Glucogenólisis', description: 'Tu hígado libera glucógeno almacenado', color: '#60a5fa', icon: 'flash-outline' as const },
  { hours: 12, label: 'Cetosis temprana', description: 'Empiezas a quemar grasa como combustible', color: '#a8e02a', icon: 'flame-outline' as const },
  { hours: 16, label: 'Autofagia', description: 'Tus células reciclan componentes dañados', color: '#f59e0b', icon: 'refresh-outline' as const },
  { hours: 24, label: 'Autofagia profunda', description: 'Reparación celular intensa + hormona de crecimiento', color: '#f97316', icon: 'shield-outline' as const },
  { hours: 36, label: 'Reparación inmune', description: 'Sistema inmune se regenera', color: '#c084fc', icon: 'medkit-outline' as const },
  { hours: 48, label: 'Reset metabólico', description: 'Sensibilidad a insulina se restaura profundamente', color: '#ec4899', icon: 'nuclear-outline' as const },
];

function getCurrentZone(hours: number) {
  let zone = FASTING_ZONES[0];
  for (const z of FASTING_ZONES) {
    if (hours >= z.hours) zone = z;
  }
  return zone;
}

function getNextZone(hours: number) {
  for (const z of FASTING_ZONES) {
    if (z.hours > hours) return z;
  }
  return null;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function FastingScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [activeFast, setActiveFast] = useState<any>(null);
  const [selectedProtocol, setSelectedProtocol] = useState(FASTING_PROTOCOLS[2]); // 16:8
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showProtocols, setShowProtocols] = useState(false);
  const [elapsed, setElapsed] = useState(0); // minutos
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    if (userId) {
      loadActiveFast();
      loadHistory();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [userId]));

  // Timer tick cada 30 segundos
  useEffect(() => {
    if (activeFast) {
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 30000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [activeFast]);

  function updateElapsed() {
    if (!activeFast?.fast_start) return;
    const start = new Date(activeFast.fast_start);
    setElapsed((Date.now() - start.getTime()) / (1000 * 60));
  }

  async function loadActiveFast() {
    const { data } = await supabase
      .from('fasting_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('fast_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveFast(data);
    if (data?.target_hours) {
      const protocol = FASTING_PROTOCOLS.find(p => p.hours === data.target_hours) || FASTING_PROTOCOLS[2];
      setSelectedProtocol(protocol);
    }
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('fasting_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('fast_start', { ascending: false })
      .limit(20);
    setHistory(data || []);
  }

  async function startFast() {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const now = new Date();
    const dateStr = getLocalToday();
    const { data, error } = await supabase.from('fasting_logs').insert({
      user_id: userId,
      fast_start: now.toISOString(),
      target_hours: selectedProtocol.hours,
      status: 'active',
      date: dateStr,
    }).select().single();

    if (!error && data) {
      setActiveFast(data);
      DeviceEventEmitter.emit('day_changed');
    }
  }

  async function breakFast() {
    if (!activeFast) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const actualHours = elapsed / 60;

    await supabase.from('fasting_logs').update({
      actual_hours: Math.round(actualHours * 10) / 10,
      status: 'completed',
    }).eq('id', activeFast.id);

    // Electrón por tier de ayuno
    try {
      const tier = getFastingTier(actualHours);
      if (tier) {
        await awardBooleanElectron(userId, tier);
        DeviceEventEmitter.emit('electrons_changed');
      }
    } catch { /* opcional */ }

    setActiveFast(null);
    setElapsed(0);
    loadHistory();
    DeviceEventEmitter.emit('day_changed');
  }

  async function cancelFast() {
    if (!activeFast) return;
    Alert.alert('Cancelar ayuno', '¿Eliminar este ayuno sin registrarlo?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('fasting_logs').delete().eq('id', activeFast.id);
          setActiveFast(null);
          setElapsed(0);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  async function deleteFast(id: string) {
    Alert.alert('Eliminar registro', '¿Eliminar este ayuno del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('fasting_logs').delete().eq('id', id);
          loadHistory();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  // === CÁLCULOS ===
  const elapsedHours = elapsed / 60;
  const targetMinutes = selectedProtocol.hours * 60;
  const progress = Math.min(elapsed / targetMinutes, 1);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const currentZone = getCurrentZone(elapsedHours);
  const nextZone = getNextZone(elapsedHours);
  const timeToNext = nextZone ? (nextZone.hours * 60 - elapsed) : 0;
  const remainingMinutes = Math.max(targetMinutes - elapsed, 0);

  // === RENDER ===
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <View>
              <Text style={{ color: '#5B9BD5', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP</Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>AYUNO</Text>
            </View>
          </View>
          <Pressable onPress={() => setShowHistory(!showHistory)} hitSlop={12}>
            <Ionicons name={showHistory ? 'timer-outline' : 'time-outline'} size={24} color="#999" />
          </Pressable>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════
          HISTORIAL
      ════════════════════════════════════════════════════════════════ */}
      {showHistory ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 16 }}>
            HISTORIAL ({history.length})
          </Text>

          {history.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="hourglass-outline" size={40} color="#333" />
              <Text style={{ color: '#666', fontSize: 14, marginTop: 12 }}>Aún no tienes ayunos completados</Text>
            </View>
          ) : (
            history.map(fast => {
              const date = new Date(fast.fast_start);
              const hours = fast.actual_hours || 0;
              const zone = getCurrentZone(hours);
              return (
                <Pressable
                  key={fast.id}
                  onLongPress={() => deleteFast(fast.id)}
                  style={{
                    backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: 8,
                    borderLeftWidth: 3, borderLeftColor: zone.color,
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                  }}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: `${zone.color}15`,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color: zone.color, fontSize: 16, fontWeight: '900' }}>
                      {Math.round(hours)}h
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                      Ayuno de {Math.round(hours * 10) / 10} horas
                    </Text>
                    <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                      {date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{zone.label}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: zone.color, fontSize: 11, fontWeight: '600' }}>
                      {fast.target_hours}h objetivo
                    </Text>
                    <Text style={{ color: hours >= fast.target_hours ? '#22c55e' : '#f59e0b', fontSize: 10, marginTop: 2 }}>
                      {hours >= fast.target_hours ? '✓ Completado' : 'Parcial'}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
          <Text style={{ color: '#444', fontSize: 9, textAlign: 'center', marginTop: 8 }}>
            Mantén presionado para eliminar
          </Text>
        </View>

      ) : activeFast ? (
        /* ════════════════════════════════════════════════════════════════
           AYUNANDO — Timer activo
        ════════════════════════════════════════════════════════════════ */
        <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
          {/* Ring timer */}
          <View style={{ width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center', marginVertical: 20 }}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
                stroke="#1a1a1a" strokeWidth={STROKE_WIDTH} fill="transparent"
              />
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
                stroke={currentZone.color} strokeWidth={STROKE_WIDTH} fill="transparent"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>

            {/* Center content */}
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                {formatDuration(elapsed)}
              </Text>
              <Text style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
                de {selectedProtocol.hours}h objetivo
              </Text>
              {remainingMinutes > 0 ? (
                <Text style={{ color: currentZone.color, fontSize: 12, fontWeight: '600', marginTop: 8 }}>
                  Faltan {formatDuration(remainingMinutes)}
                </Text>
              ) : (
                <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '800', marginTop: 8 }}>
                  ¡OBJETIVO ALCANZADO!
                </Text>
              )}
            </View>
          </View>

          {/* Zona actual */}
          <View style={{
            backgroundColor: `${currentZone.color}10`, borderRadius: 16, padding: 16,
            width: '100%', marginBottom: 12,
            borderWidth: 1, borderColor: `${currentZone.color}25`,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={currentZone.icon} size={20} color={currentZone.color} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: currentZone.color, fontSize: 14, fontWeight: '700' }}>
                  {currentZone.label}
                </Text>
                <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                  {currentZone.description}
                </Text>
              </View>
            </View>
          </View>

          {/* Siguiente zona */}
          {nextZone && (
            <View style={{
              backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, width: '100%', marginBottom: 20,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <Ionicons name="arrow-forward-outline" size={16} color="#666" />
              <Text style={{ color: '#666', fontSize: 12, flex: 1 }}>
                Siguiente: <Text style={{ color: nextZone.color, fontWeight: '600' }}>{nextZone.label}</Text> en {formatDuration(timeToNext)}
              </Text>
            </View>
          )}

          {/* Hora de inicio */}
          <Text style={{ color: '#666', fontSize: 12, marginBottom: 20 }}>
            Iniciaste a las {formatTime(new Date(activeFast.fast_start))}
          </Text>

          {/* Botones */}
          <Pressable
            onPress={() => {
              Alert.alert(
                'Romper ayuno',
                `Has ayunado ${formatDuration(elapsed)}. ¿Registrar y terminar?`,
                [
                  { text: 'Seguir ayunando', style: 'cancel' },
                  { text: 'Romper ayuno', onPress: breakFast },
                ]
              );
            }}
            style={{
              backgroundColor: '#a8e02a', borderRadius: 18, paddingVertical: 18,
              width: '100%', alignItems: 'center', marginBottom: 12,
            }}
          >
            <Text style={{ color: '#000', fontSize: 18, fontWeight: '800' }}>ROMPER AYUNO</Text>
          </Pressable>

          <Pressable onPress={cancelFast}>
            <Text style={{ color: '#666', fontSize: 13 }}>Cancelar y eliminar</Text>
          </Pressable>
        </View>

      ) : (
        /* ════════════════════════════════════════════════════════════════
           IDLE — Iniciar ayuno
        ════════════════════════════════════════════════════════════════ */
        <View style={{ paddingHorizontal: 20 }}>
          {/* Selector de protocolo */}
          <Pressable onPress={() => setShowProtocols(!showProtocols)}>
            <LinearGradient
              colors={[`${selectedProtocol.color}12`, `${selectedProtocol.color}04`]}
              style={{
                borderRadius: 18, padding: 20, marginBottom: 20,
                borderWidth: 1, borderColor: `${selectedProtocol.color}25`,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>PROTOCOLO</Text>
                  <Text style={{ color: selectedProtocol.color, fontSize: 32, fontWeight: '900', marginTop: 4 }}>
                    {selectedProtocol.label}
                  </Text>
                  <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    {selectedProtocol.description}
                  </Text>
                </View>
                <Ionicons name={showProtocols ? 'chevron-up' : 'chevron-down'} size={22} color="#666" />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Lista de protocolos expandible */}
          {showProtocols && (
            <View style={{ marginBottom: 20, gap: 6 }}>
              {FASTING_PROTOCOLS.map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setSelectedProtocol(p);
                    setShowProtocols(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: selectedProtocol.id === p.id ? `${p.color}10` : '#0a0a0a',
                    borderRadius: 14, padding: 14,
                    borderWidth: 1,
                    borderColor: selectedProtocol.id === p.id ? `${p.color}30` : '#1a1a1a',
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: `${p.color}15`,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color: p.color, fontSize: 12, fontWeight: '900' }}>{p.hours}h</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{p.label}</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>{p.description}</Text>
                  </View>
                  {selectedProtocol.id === p.id && (
                    <Ionicons name="checkmark-circle" size={20} color={p.color} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Ring preview */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: RING_SIZE * 0.8, height: RING_SIZE * 0.8, justifyContent: 'center', alignItems: 'center' }}>
              <Svg width={RING_SIZE * 0.8} height={RING_SIZE * 0.8}>
                <Circle
                  cx={RING_SIZE * 0.4} cy={RING_SIZE * 0.4} r={RADIUS * 0.8}
                  stroke="#1a1a1a" strokeWidth={STROKE_WIDTH - 2} fill="transparent"
                  strokeDasharray="4 8"
                />
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: '#333', fontSize: 36, fontWeight: '900' }}>0:00</Text>
                <Text style={{ color: '#444', fontSize: 12 }}>de {selectedProtocol.hours}h</Text>
              </View>
            </View>
          </View>

          {/* Zonas biológicas preview */}
          <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
            ZONAS QUE ALCANZARÁS
          </Text>
          {FASTING_ZONES.filter(z => z.hours <= selectedProtocol.hours && z.hours > 0).map(zone => (
            <View key={zone.hours} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 8, paddingHorizontal: 4, opacity: 0.7,
            }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: `${zone.color}15`,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name={zone.icon} size={14} color={zone.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ccc', fontSize: 13, fontWeight: '600' }}>{zone.label}</Text>
                <Text style={{ color: '#666', fontSize: 11 }}>{zone.description}</Text>
              </View>
              <Text style={{ color: zone.color, fontSize: 12, fontWeight: '700' }}>{zone.hours}h</Text>
            </View>
          ))}

          {/* BOTÓN INICIAR */}
          <Pressable
            onPress={startFast}
            style={{
              backgroundColor: selectedProtocol.color, borderRadius: 20, paddingVertical: 20,
              alignItems: 'center', marginTop: 24,
              shadowColor: selectedProtocol.color,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 12,
            }}
          >
            <Text style={{ color: '#000', fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>
              INICIAR AYUNO
            </Text>
          </Pressable>

          {/* Historial rápido */}
          {history.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
                  RECIENTES
                </Text>
                <Pressable onPress={() => setShowHistory(true)}>
                  <Text style={{ color: '#a8e02a', fontSize: 11, fontWeight: '600' }}>Ver todo</Text>
                </Pressable>
              </View>
              {history.slice(0, 3).map(fast => {
                const hours = fast.actual_hours || 0;
                const zone = getCurrentZone(hours);
                return (
                  <View key={fast.id} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: '#0a0a0a', borderRadius: 12, padding: 12, marginBottom: 6,
                  }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: `${zone.color}15`,
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <Text style={{ color: zone.color, fontSize: 12, fontWeight: '900' }}>{Math.round(hours)}h</Text>
                    </View>
                    <Text style={{ color: '#ccc', fontSize: 13, flex: 1 }}>{zone.label}</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>
                      {new Date(fast.fast_start).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
