/**
 * Protocol Config — Configuración central del protocolo activo.
 *
 * 5 secciones:
 * 1. Protocolo activo (cambiar/desactivar)
 * 2. Electrones en HOY (toggles)
 * 3. Metas diarias (proteína, agua, ayuno, entrenamiento)
 * 4. Horarios (wake/sleep del cronotipo)
 * 5. Resumen de impacto
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';

const ALL_ELECTRONS = [
  { source: 'cold_shower', name: 'Baño frío', icon: 'snow-outline' as const, weight: 3.0, description: 'Proteínas de choque térmico + dopamina' },
  { source: 'strength', name: 'Entrenamiento', icon: 'barbell-outline' as const, weight: 3.0, description: 'Se activa al loguear ejercicio' },
  { source: 'meditation', name: 'Meditación', icon: 'flower-outline' as const, weight: 2.5, description: 'Reduce cortisol + fortalece prefrontal' },
  { source: 'checkin', name: 'Check-in emocional', icon: 'heart-outline' as const, weight: 2.0, description: 'Registra tu estado emocional' },
  { source: 'sunlight', name: 'Luz solar', icon: 'sunny-outline' as const, weight: 1.5, description: 'Sincroniza ritmo circadiano + vitamina D' },
  { source: 'grounding', name: 'Grounding', icon: 'earth-outline' as const, weight: 1.5, description: 'Contacto directo con la tierra' },
  { source: 'no_alcohol', name: 'Sin alcohol', icon: 'wine-outline' as const, weight: 1.0, description: 'Protege hígado + calidad de sueño' },
  { source: 'supplements', name: 'Suplementos', icon: 'flask-outline' as const, weight: 1.0, description: 'Completa tu protocolo de suplementación' },
  { source: 'breathwork', name: 'Breathwork', icon: 'leaf-outline' as const, weight: 1.0, description: 'Activa nervio vago + calma SNS' },
  { source: 'red_glasses', name: 'Lentes rojos', icon: 'glasses-outline' as const, weight: 1.0, description: 'Protege melatonina de luz azul nocturna' },
];

const FASTING_PROTOCOLS = [
  { hours: 0, label: 'Sin ayuno' },
  { hours: 12, label: '12:12' },
  { hours: 14, label: '14:10' },
  { hours: 16, label: '16:8' },
  { hours: 18, label: '18:6' },
  { hours: 20, label: '20:4' },
  { hours: 24, label: 'OMAD (24h)' },
];

const DEFAULT_BOOLEANS = ['sunlight', 'meditation', 'supplements', 'cold_shower', 'grounding', 'no_alcohol'];

export default function ProtocolConfig() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [activeProtocol, setActiveProtocol] = useState<any>(null);
  const [availableProtocols, setAvailableProtocols] = useState<any[]>([]);
  const [enabledElectrons, setEnabledElectrons] = useState<string[]>(DEFAULT_BOOLEANS);
  const [proteinGoal, setProteinGoal] = useState(150);
  const [waterGoal, setWaterGoal] = useState(3000);
  const [fastingHours, setFastingHours] = useState(16);
  const [trainingDays, setTrainingDays] = useState(4);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    if (userId) {
      loadActiveProtocol();
      loadAvailableProtocols();
      loadPreferences();
    }
  }, [userId]));

  async function loadActiveProtocol() {
    const { data } = await supabase
      .from('user_protocols')
      .select('*, template:protocol_templates(name, description, category)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveProtocol(data);
  }

  async function loadAvailableProtocols() {
    const { data } = await supabase
      .from('protocol_templates')
      .select('*')
      .order('name');
    setAvailableProtocols(data || []);
  }

  async function loadPreferences() {
    // user_day_preferences (active_boolean_electrons, active_quantitative_electrons)
    const { data: prefs } = await supabase
      .from('user_day_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefs?.active_boolean_electrons) {
      setEnabledElectrons(prefs.active_boolean_electrons);
    }

    // Cronotipo (wake/sleep)
    const { data: chrono } = await supabase
      .from('user_chronotype')
      .select('schedule')
      .eq('user_id', userId)
      .maybeSingle();

    if (chrono?.schedule) {
      if (chrono.schedule.wake_time) setWakeTime(chrono.schedule.wake_time);
      if (chrono.schedule.sleep_time) setSleepTime(chrono.schedule.sleep_time);
    }
  }

  function toggleElectron(source: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabledElectrons(prev =>
      prev.includes(source) ? prev.filter(e => e !== source) : [...prev, source]
    );
    setHasChanges(true);
  }

  async function savePreferences() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    await supabase.from('user_day_preferences').upsert({
      user_id: userId,
      active_boolean_electrons: enabledElectrons,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    setHasChanges(false);
    DeviceEventEmitter.emit('day_changed');
    DeviceEventEmitter.emit('electrons_changed');
    Alert.alert('Guardado', 'Tu configuración se aplicó. HOY se actualizará.');
  }

  async function changeProtocol(templateId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (activeProtocol) {
      await supabase.from('user_protocols')
        .update({ status: 'inactive' })
        .eq('id', activeProtocol.id);
    }

    const template = availableProtocols.find(p => p.id === templateId);
    if (!template) return;

    const { data } = await supabase.from('user_protocols').insert({
      user_id: userId,
      template_id: templateId,
      name: template.name,
      status: 'active',
      started_at: new Date().toISOString(),
    }).select().single();

    if (data) {
      setActiveProtocol(data);
      // Limpiar plan del día para que se regenere con el nuevo protocolo
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('daily_plans').delete().eq('user_id', userId).eq('date', today);
      DeviceEventEmitter.emit('day_changed');
    }
  }

  async function deactivateProtocol() {
    if (!activeProtocol) return;
    Alert.alert('Desactivar protocolo', '¿Desactivar tu protocolo actual? Tu agenda se vaciará.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar', style: 'destructive',
        onPress: async () => {
          await supabase.from('user_protocols')
            .update({ status: 'inactive' })
            .eq('id', activeProtocol.id);
          setActiveProtocol(null);
          DeviceEventEmitter.emit('day_changed');
        },
      },
    ]);
  }

  const maxElectrons = ALL_ELECTRONS
    .filter(e => enabledElectrons.includes(e.source))
    .reduce((s, e) => s + e.weight, 0);

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
              <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP</Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>CONFIGURACIÓN</Text>
            </View>
          </View>
          {hasChanges && (
            <Pressable onPress={savePreferences} style={{
              backgroundColor: '#a8e02a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8,
            }}>
              <Text style={{ color: '#000', fontSize: 13, fontWeight: '800' }}>GUARDAR</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 1 — PROTOCOLO ACTIVO
      ══════════════════════════════════════════════════════════════ */}
      <Section label="PROTOCOLO ACTIVO">
        {activeProtocol ? (
          <View style={{
            backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: 16, padding: 18,
            borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#a8e02a', fontSize: 16, fontWeight: '800' }}>
                  {activeProtocol.name || activeProtocol.template?.name || 'Protocolo'}
                </Text>
                <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                  Activo desde {new Date(activeProtocol.started_at || activeProtocol.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Pressable onPress={deactivateProtocol}>
                <Ionicons name="close-circle-outline" size={22} color="#666" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{
            backgroundColor: '#0a0a0a', borderRadius: 16, padding: 18,
            borderWidth: 1, borderColor: '#1a1a1a', alignItems: 'center',
          }}>
            <Ionicons name="alert-circle-outline" size={24} color="#666" />
            <Text style={{ color: '#999', fontSize: 13, marginTop: 8 }}>Sin protocolo activo</Text>
            <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>Tu agenda estará vacía</Text>
          </View>
        )}

        {availableProtocols.length > 0 && (
          <>
            <Text style={{ color: '#666', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 16, marginBottom: 8 }}>
              CAMBIAR PROTOCOLO
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableProtocols.map(p => {
                const isActive = activeProtocol?.template_id === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => !isActive && changeProtocol(p.id)}
                    style={{
                      backgroundColor: isActive ? 'rgba(168,224,42,0.1)' : '#0a0a0a',
                      borderRadius: 14, padding: 14, marginRight: 8, width: 160,
                      borderWidth: 1.5,
                      borderColor: isActive ? '#a8e02a' : '#1a1a1a',
                    }}
                  >
                    <Text style={{ color: isActive ? '#a8e02a' : '#fff', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }} numberOfLines={2}>
                      {p.description || p.category || ''}
                    </Text>
                    {isActive && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#a8e02a" />
                        <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '600' }}>ACTIVO</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 2 — ELECTRONES EN HOY
      ══════════════════════════════════════════════════════════════ */}
      <Section label="ELECTRONES EN HOY" subtitle="Activa los que quieras trackear diariamente">
        {ALL_ELECTRONS.map(electron => {
          const enabled = enabledElectrons.includes(electron.source);
          return (
            <Pressable
              key={electron.source}
              onPress={() => toggleElectron(electron.source)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 12, paddingHorizontal: 4,
                borderBottomWidth: 0.5, borderBottomColor: '#111',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: enabled ? 'rgba(168,224,42,0.1)' : '#0a0a0a',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name={electron.icon} size={18} color={enabled ? '#a8e02a' : '#333'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: enabled ? '#fff' : '#666', fontSize: 14, fontWeight: '600' }}>
                  {electron.name}
                </Text>
                <Text style={{ color: '#444', fontSize: 10 }}>{electron.description}</Text>
              </View>
              <Text style={{ color: enabled ? '#a8e02a' : '#333', fontSize: 11, fontWeight: '700', marginRight: 8 }}>
                ⚡{electron.weight}
              </Text>
              <Switch
                value={enabled}
                onValueChange={() => toggleElectron(electron.source)}
                trackColor={{ true: '#a8e02a', false: '#1a1a1a' }}
                thumbColor="#fff"
              />
            </Pressable>
          );
        })}
      </Section>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 3 — METAS DIARIAS
      ══════════════════════════════════════════════════════════════ */}
      <Section label="METAS DIARIAS">
        <GoalRow
          icon="nutrition-outline" color="#60a5fa" label="Meta de proteína"
          value={`${proteinGoal}g`} valueColor="#a8e02a"
          onMinus={() => { setProteinGoal(Math.max(50, proteinGoal - 10)); setHasChanges(true); }}
          onPlus={() => { setProteinGoal(proteinGoal + 10); setHasChanges(true); }}
        />
        <GoalRow
          icon="water-outline" color="#38bdf8" label="Meta de agua"
          value={`${(waterGoal / 1000).toFixed(1)}L`} valueColor="#38bdf8"
          onMinus={() => { setWaterGoal(Math.max(1000, waterGoal - 250)); setHasChanges(true); }}
          onPlus={() => { setWaterGoal(waterGoal + 250); setHasChanges(true); }}
        />
        <GoalRow
          icon="timer-outline" color="#f59e0b" label="Protocolo de ayuno"
          value={FASTING_PROTOCOLS.find(p => p.hours === fastingHours)?.label || '16:8'} valueColor="#f59e0b"
          onMinus={() => {
            const idx = FASTING_PROTOCOLS.findIndex(p => p.hours === fastingHours);
            setFastingHours(FASTING_PROTOCOLS[Math.max(0, idx - 1)].hours);
            setHasChanges(true);
          }}
          onPlus={() => {
            const idx = FASTING_PROTOCOLS.findIndex(p => p.hours === fastingHours);
            setFastingHours(FASTING_PROTOCOLS[Math.min(FASTING_PROTOCOLS.length - 1, idx + 1)].hours);
            setHasChanges(true);
          }}
        />
        <GoalRow
          icon="barbell-outline" color="#a8e02a" label="Días de entrenamiento"
          value={`${trainingDays}`} valueColor="#a8e02a"
          onMinus={() => { setTrainingDays(Math.max(1, trainingDays - 1)); setHasChanges(true); }}
          onPlus={() => { setTrainingDays(Math.min(7, trainingDays + 1)); setHasChanges(true); }}
        />
      </Section>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 4 — HORARIOS
      ══════════════════════════════════════════════════════════════ */}
      <Section label="HORARIOS" subtitle="Basados en tu cronotipo — afectan tu agenda">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: '#0a0a0a', borderRadius: 14, padding: 14, alignItems: 'center' }}>
            <Ionicons name="sunny-outline" size={20} color="#fbbf24" />
            <Text style={{ color: '#999', fontSize: 10, marginTop: 6 }}>Despertar</Text>
            <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: '800', marginTop: 4 }}>{wakeTime}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#0a0a0a', borderRadius: 14, padding: 14, alignItems: 'center' }}>
            <Ionicons name="moon-outline" size={20} color="#818cf8" />
            <Text style={{ color: '#999', fontSize: 10, marginTop: 6 }}>Dormir</Text>
            <Text style={{ color: '#818cf8', fontSize: 22, fontWeight: '800', marginTop: 4 }}>{sleepTime}</Text>
          </View>
        </View>
        <Text style={{ color: '#444', fontSize: 10, textAlign: 'center', marginTop: 8 }}>
          Estos horarios se toman de tu cronotipo. Repite el quiz para cambiarlos.
        </Text>
      </Section>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN 5 — RESUMEN
      ══════════════════════════════════════════════════════════════ */}
      <Section label="RESUMEN">
        <View style={{
          backgroundColor: 'rgba(168,224,42,0.06)', borderRadius: 16, padding: 18,
          borderWidth: 1, borderColor: 'rgba(168,224,42,0.1)',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#a8e02a', fontSize: 24, fontWeight: '900' }}>{enabledElectrons.length}</Text>
              <Text style={{ color: '#666', fontSize: 10 }}>Electrones</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#1a1a1a' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#a8e02a', fontSize: 24, fontWeight: '900' }}>{maxElectrons.toFixed(1)}</Text>
              <Text style={{ color: '#666', fontSize: 10 }}>⚡ Max diarios</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#1a1a1a' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#a8e02a', fontSize: 24, fontWeight: '900' }}>{proteinGoal}g</Text>
              <Text style={{ color: '#666', fontSize: 10 }}>Proteína</Text>
            </View>
          </View>
        </View>
      </Section>

      {/* Guardar (bottom) */}
      {hasChanges && (
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Pressable onPress={savePreferences} style={{
            backgroundColor: '#a8e02a', borderRadius: 18, paddingVertical: 18, alignItems: 'center',
          }}>
            <Text style={{ color: '#000', fontSize: 18, fontWeight: '900' }}>GUARDAR CAMBIOS</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// ═══ Sub-components ═══

function Section({ label, subtitle, children }: { label: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
      <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: subtitle ? 4 : 12 }}>
        {label}
      </Text>
      {subtitle && <Text style={{ color: '#666', fontSize: 11, marginBottom: 12 }}>{subtitle}</Text>}
      {children}
    </View>
  );
}

function GoalRow({ icon, color, label, value, valueColor, onMinus, onPlus }: {
  icon: string; color: string; label: string; value: string; valueColor: string;
  onMinus: () => void; onPlus: () => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#0a0a0a', borderRadius: 14, padding: 14, marginBottom: 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name={icon as any} size={18} color={color} />
        <Text style={{ color: '#ccc', fontSize: 14 }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable onPress={onMinus}>
          <Ionicons name="remove-circle-outline" size={22} color="#666" />
        </Pressable>
        <Text style={{ color: valueColor, fontSize: 18, fontWeight: '800', minWidth: 50, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable onPress={onPlus}>
          <Ionicons name="add-circle-outline" size={22} color={valueColor} />
        </Pressable>
      </View>
    </View>
  );
}
