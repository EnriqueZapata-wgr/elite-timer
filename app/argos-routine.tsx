import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';
import { generateRoutine, type GeneratedRoutine } from '../src/services/argos-service';
import { saveRoutine as saveRoutineToDb, generateUUID } from '../src/services/routine-service';
import type { Block, Routine } from '../src/engine/types';

const GOALS = [
  { id: 'fuerza', label: 'Fuerza', icon: 'barbell-outline' as const, color: '#a8e02a' },
  { id: 'hipertrofia', label: 'Hipertrofia', icon: 'fitness-outline' as const, color: '#60a5fa' },
  { id: 'resistencia', label: 'Resistencia', icon: 'pulse-outline' as const, color: '#fb923c' },
  { id: 'full_body', label: 'Full Body', icon: 'body-outline' as const, color: '#c084fc' },
  { id: 'movilidad', label: 'Movilidad', icon: 'accessibility-outline' as const, color: '#34d399' },
];

const FOCUS = [
  { id: 'push', label: 'Push (pecho/hombro/trícep)' },
  { id: 'pull', label: 'Pull (espalda/bícep)' },
  { id: 'legs', label: 'Piernas' },
  { id: 'upper', label: 'Tren superior' },
  { id: 'glutes', label: 'Glúteos' },
  { id: 'full', label: 'Sin enfoque específico' },
];

const EQUIPMENT = [
  { id: 'barra', label: 'Barra' },
  { id: 'mancuernas', label: 'Mancuernas' },
  { id: 'maquinas', label: 'Máquinas' },
  { id: 'poleas', label: 'Poleas' },
  { id: 'cuerpo', label: 'Solo cuerpo' },
  { id: 'bandas', label: 'Bandas' },
  { id: 'kettlebell', label: 'Kettlebell' },
];

const DURATIONS = [30, 45, 60, 75, 90];

export default function ArgosRoutineScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [focus, setFocus] = useState('full');
  const [equipment, setEquipment] = useState<string[]>(['barra', 'mancuernas', 'maquinas']);
  const [duration, setDuration] = useState(60);
  const [routine, setRoutine] = useState<GeneratedRoutine | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setStep(4);
    setLoading(true);

    try {
      const result = await generateRoutine(user.id, {
        goal,
        duration,
        equipment,
        focus: focus !== 'full' ? focus : undefined,
        level: 'intermediate',
      });
      if (result) {
        setRoutine(result);
        setStep(5);
      } else {
        Alert.alert('Error', 'ARGOS no pudo generar la rutina. Intenta de nuevo.');
        setStep(3);
      }
    } catch (_) {
      Alert.alert('Error', 'Hubo un problema de conexión.');
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!routine) return;

    // Convertir GeneratedRoutine a Routine del engine (Block tree)
    const routineId = generateUUID();
    const allExercises = [
      ...routine.warmup.map((ex, i) => ({ ...ex, phase: 'warmup', order: i })),
      ...routine.main.map((ex, i) => ({ ...ex, phase: 'main', order: routine.warmup.length + i })),
      ...routine.cooldown.map((ex, i) => ({ ...ex, phase: 'cooldown', order: routine.warmup.length + routine.main.length + i })),
    ];

    if (allExercises.length === 0) {
      Alert.alert('Error', 'La rutina generada no tiene ejercicios.');
      return;
    }

    const blocks: Block[] = allExercises.map((ex, i) => ({
      id: generateUUID(),
      parent_block_id: null,
      sort_order: i,
      type: 'work' as const,
      label: ex.name,
      duration_seconds: null,
      rounds: Number(ex.sets) || 3,
      rest_between_seconds: Number(ex.rest_seconds) || 90,
      color: null,
      sound_start: 'bell',
      sound_end: 'bell',
      notes: [
        `${ex.reps} reps`,
        ex.method && ex.method !== 'standard' ? `Método: ${ex.method}` : '',
        ex.notes || '',
        `Fase: ${ex.phase}`,
      ].filter(Boolean).join(' · '),
      suggested_rest_seconds: Number(ex.rest_seconds) || 90,
      children: [],
    }));

    const routineObj: Routine = {
      id: routineId,
      name: routine.name,
      description: routine.description,
      category: goal,
      mode: 'routine',
      blocks,
    };

    try {
      await saveRoutineToDb(routineObj);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Guardada', `"${routine.name}" guardada en Mis Rutinas`, [
        { text: 'Ver rutinas', onPress: () => router.push('/my-routines') },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar la rutina.');
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => step > 0 && step < 4 ? setStep(step - 1) : router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View>
            <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ARGOS</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Generar Rutina</Text>
          </View>
        </View>

        {/* Progress dots */}
        {step < 4 && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                backgroundColor: i <= step ? '#a8e02a' : '#1a1a1a',
              }} />
            ))}
          </View>
        )}
      </View>

      {/* Step 0: Objetivo */}
      {step === 0 && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
            ¿Cuál es tu objetivo hoy?
          </Text>
          <View style={{ gap: 10 }}>
            {GOALS.map(g => (
              <Pressable key={g.id} onPress={() => { setGoal(g.id); setStep(1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: '#0a0a0a', borderRadius: 16, padding: 18,
                  borderWidth: 1, borderColor: '#1a1a1a',
                }}>
                  <Ionicons name={g.icon} size={24} color={g.color} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{g.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Step 1: Enfoque */}
      {step === 1 && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
            ¿Qué zona trabajamos?
          </Text>
          <View style={{ gap: 8 }}>
            {FOCUS.map(f => (
              <Pressable key={f.id} onPress={() => { setFocus(f.id); setStep(2); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <View style={{
                  backgroundColor: '#0a0a0a', borderRadius: 14, padding: 16,
                  borderWidth: 1, borderColor: '#1a1a1a',
                }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{f.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Step 2: Equipamiento */}
      {step === 2 && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
            ¿Qué equipo tienes?
          </Text>
          <Text style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Selecciona todo lo disponible</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {EQUIPMENT.map(eq => {
              const isSelected = equipment.includes(eq.id);
              return (
                <Pressable key={eq.id} onPress={() => {
                  setEquipment(prev => isSelected ? prev.filter(e => e !== eq.id) : [...prev, eq.id]);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}>
                  <View style={{
                    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
                    backgroundColor: isSelected ? 'rgba(168,224,42,0.15)' : '#0a0a0a',
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#a8e02a' : '#1a1a1a',
                  }}>
                    <Text style={{ color: isSelected ? '#a8e02a' : '#999', fontSize: 13, fontWeight: '600' }}>
                      {eq.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => setStep(3)} style={{
            backgroundColor: '#a8e02a', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24,
          }}>
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>SIGUIENTE</Text>
          </Pressable>
        </View>
      )}

      {/* Step 3: Duración */}
      {step === 3 && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
            ¿Cuánto tiempo tienes?
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
            {DURATIONS.map(d => (
              <Pressable key={d} onPress={() => { setDuration(d); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <View style={{
                  width: 60, height: 60, borderRadius: 30,
                  backgroundColor: duration === d ? '#a8e02a' : '#0a0a0a',
                  justifyContent: 'center', alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: duration === d ? '#a8e02a' : '#1a1a1a',
                }}>
                  <Text style={{ color: duration === d ? '#000' : '#fff', fontSize: 16, fontWeight: '800' }}>{d}</Text>
                  <Text style={{ color: duration === d ? '#000' : '#666', fontSize: 9 }}>min</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={handleGenerate} style={{
            backgroundColor: '#a8e02a', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 30,
            flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}>
            <Ionicons name="eye-outline" size={20} color="#000" />
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>ARGOS, GENERA MI RUTINA</Text>
          </Pressable>
        </View>
      )}

      {/* Step 4: Generando */}
      {step === 4 && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color="#a8e02a" />
          <Text style={{ color: '#a8e02a', fontSize: 16, fontWeight: '700', marginTop: 20 }}>
            ARGOS diseña tu rutina...
          </Text>
          <Text style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
            Analizando tu nivel, PRs y objetivos
          </Text>
        </View>
      )}

      {/* Step 5: Resultado */}
      {step === 5 && routine && (
        <View style={{ paddingHorizontal: 20 }}>
          {/* Nombre + descripción */}
          <View style={{
            backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: 16, padding: 20, marginBottom: 16,
            borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="eye" size={16} color="#a8e02a" />
              <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
                GENERADA POR ARGOS
              </Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{routine.name}</Text>
            <Text style={{ color: '#999', fontSize: 13, marginTop: 4 }}>{routine.description}</Text>
            <Text style={{ color: '#a8e02a', fontSize: 12, marginTop: 8 }}>~{routine.estimatedMinutes} min</Text>
          </View>

          {/* Secciones */}
          {([
            { title: 'CALENTAMIENTO', items: routine.warmup, color: '#fbbf24' },
            { title: 'PRINCIPAL', items: routine.main, color: '#a8e02a' },
            { title: 'ENFRIAMIENTO', items: routine.cooldown, color: '#60a5fa' },
          ] as const).map(section => section.items.length > 0 && (
            <View key={section.title} style={{ marginBottom: 16 }}>
              <Text style={{ color: section.color, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
                {section.title}
              </Text>
              {section.items.map((ex, i) => (
                <View key={i} style={{
                  backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, marginBottom: 6,
                  borderLeftWidth: 3, borderLeftColor: section.color,
                }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{ex.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <Text style={{ color: '#999', fontSize: 12 }}>{ex.sets} series</Text>
                    <Text style={{ color: '#999', fontSize: 12 }}>{ex.reps} reps</Text>
                    <Text style={{ color: '#999', fontSize: 12 }}>{ex.rest_seconds}s descanso</Text>
                    {ex.method && ex.method !== 'standard' && (
                      <View style={{ backgroundColor: 'rgba(168,224,42,0.1)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '600' }}>
                          {ex.method.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  {ex.notes && <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{ex.notes}</Text>}
                </View>
              ))}
            </View>
          ))}

          {/* Acciones */}
          <View style={{ gap: 10, marginTop: 10 }}>
            <Pressable onPress={handleSave} style={{
              backgroundColor: '#a8e02a', borderRadius: 16, padding: 16, alignItems: 'center',
            }}>
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>GUARDAR EN MIS RUTINAS</Text>
            </Pressable>
            <Pressable onPress={handleGenerate} style={{
              backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, alignItems: 'center',
              borderWidth: 1, borderColor: '#1a1a1a',
            }}>
              <Text style={{ color: '#999', fontSize: 14, fontWeight: '600' }}>Generar otra</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
