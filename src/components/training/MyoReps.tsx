/**
 * Myo Reps — Activación 20 reps + mini sets de 5 con 5 seg descanso hasta fallar.
 *
 * Fases: activación → descanso 5s → sobrecarga → repetir hasta fallo.
 * Feedback de peso basado en cuántas sobrecargas logró.
 */
import { View, Text, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  exerciseName: string;
  onComplete: (result: { activationReps: number; overloadSets: number[]; failedAt: number; weightFeedback: string }) => void;
  /** Cue de voz opcional (el host decide si habla). { hito } = se habla también en modo 'solo hitos'. */
  onCue?: (text: string, opts?: { hito?: boolean }) => void;
}

// MB-31B: rojo de MYO REPS = señal de dominio (doctrina), se queda
// hardcodeado como relleno/icono en los dos temas. Como TEXTO chico en claro
// no alcanza contraste (3.19:1) — se oscurece solo ahí.
const MYO_RED = '#ef4444';
const myoRedText = (dark: boolean) => (dark ? MYO_RED : '#C0392B');

export function MyoReps({ exerciseName, onComplete, onCue }: Props) {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const [phase, setPhase] = useState<'activation' | 'rest' | 'overload' | 'done'>('activation');
  const [overloadSets, setOverloadSets] = useState<number[]>([]);
  const [restTimer, setRestTimer] = useState(5);
  // MB-3.5 #2: tocar reps SELECCIONA (corregible); la sobrecarga cierra con CONFIRMAR.
  const [seleccion, setSeleccion] = useState<number | null>(null);

  // 5 second rest timer
  useEffect(() => {
    if (phase !== 'rest') return;
    if (restTimer <= 0) {
      setPhase('overload');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onCue?.(`Sobrecarga ${overloadSets.length + 1}. 5 repeticiones.`);
      return;
    }
    const t = setTimeout(() => setRestTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, restTimer]);

  function completeActivation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('rest');
    setRestTimer(5);
    onCue?.('Activación completa. 5 segundos de descanso.');
  }

  function completeOverload(reps: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const setNumber = overloadSets.length + 1;
    const updated = [...overloadSets, reps];
    setOverloadSets(updated);

    if (reps < 5) {
      // FALLO — feedback basado en cuántas sobrecargas logró.
      // Fallo en 10+ = llegó más allá de la ventana ideal (6-9) ⇒ peso bajo
      // (fix P3 METODOS_ATP_AUTOAJUSTABLES.md — antes decía "Peso OK").
      let weightFeedback = '';
      if (setNumber <= 5) weightFeedback = 'Peso alto. Baja la próxima sesión.';
      else if (setNumber <= 9) weightFeedback = 'Peso perfecto. Mantén este peso.';
      else weightFeedback = 'Peso bajo. Sube la próxima sesión.';

      setPhase('done');
      onCue?.(weightFeedback, { hito: true });
      onComplete({ activationReps: 20, overloadSets: updated, failedAt: setNumber, weightFeedback });
    } else if (setNumber >= 10) {
      // Llegó a 10 sin fallar
      setPhase('done');
      onCue?.('Peso bajo. Sube la próxima sesión.', { hito: true });
      onComplete({
        activationReps: 20, overloadSets: updated, failedAt: 0,
        weightFeedback: 'Peso bajo. Sube la próxima sesión.',
      });
    } else {
      // Siguiente overload
      setPhase('rest');
      setRestTimer(5);
    }
  }

  /** Cierre explícito de la sobrecarga (la regla de fallo no cambia). */
  function confirmarSobrecarga() {
    if (seleccion == null) return;
    const reps = seleccion;
    setSeleccion(null);
    completeOverload(reps);
  }

  return (
    <View style={{ padding: 20 }}>
      {/* Header */}
      <View style={{ backgroundColor: dark ? 'rgba(239,68,68,0.1)' : 'rgba(192,57,43,0.10)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="flame" size={18} color={MYO_RED} />
          <Text style={{ color: myoRedText(dark), fontSize: 15, fontWeight: '800' }}>MYO REPS</Text>
        </View>
        <Text style={{ color: t.textoSecundario, fontSize: 13, lineHeight: 20 }}>
          Activación: 20 reps{'\n'}
          Sobrecargas: 5 reps con 5 seg descanso hasta fallar{'\n'}
          Elige un peso con el que puedas hacer 20 reps.
        </Text>
      </View>

      {/* ACTIVATION */}
      {phase === 'activation' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: t.texto, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>SET DE ACTIVACIÓN</Text>
          <Text style={{ color: t.textoSecundario, fontSize: 14, marginBottom: 24 }}>Haz 20 reps con tu peso elegido</Text>
          <Pressable
            onPress={completeActivation}
            style={{ backgroundColor: MYO_RED, borderRadius: 20, padding: 18, paddingHorizontal: 40 }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>COMPLETÉ 20 REPS</Text>
          </Pressable>
        </View>
      )}

      {/* REST */}
      {phase === 'rest' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#38bdf8', fontSize: 64, fontWeight: '900' }}>{restTimer}</Text>
          <Text style={{ color: t.textoSecundario, fontSize: 14 }}>segundos de descanso</Text>
          <Text style={{ color: dark ? t.textoTenue : t.textoSecundario, fontSize: 12, marginTop: 8 }}>
            Siguiente: Sobrecarga {overloadSets.length + 1}
          </Text>
        </View>
      )}

      {/* OVERLOAD */}
      {phase === 'overload' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: t.texto, fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
            SOBRECARGA {overloadSets.length + 1}
          </Text>
          <Text style={{ color: t.textoSecundario, fontSize: 13, marginBottom: 20 }}>
            Haz 5 reps. Menos de 5 = fallo controlado (fin del método).
          </Text>
          {/* Tap = seleccionar (corregible); CONFIRMAR cierra la sobrecarga */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3, 4, 5].map((r) => (
              <Pressable
                key={r}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSeleccion(r); }}
                style={{
                  width: 50, height: 50, borderRadius: 25,
                  backgroundColor: seleccion === r ? (r === 5 ? ATP_BRAND.lime : MYO_RED) : t.flotante,
                  justifyContent: 'center', alignItems: 'center',
                  borderWidth: 1, borderColor: seleccion === r ? (r === 5 ? ATP_BRAND.lime : MYO_RED) : t.bordeMarcado,
                }}
              >
                <Text style={{ color: seleccion === r ? (r === 5 ? t.textoSobreLima : '#fff') : t.texto, fontSize: 17, fontWeight: '800' }}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: dark ? t.textoTenue : t.textoSecundario, fontSize: 11, marginTop: 10 }}>
            {seleccion == null ? 'Tocar selecciona. Confirma para cerrar.'
              : seleccion === 5 ? '5 reps completas. Confirma para seguir.'
                : `${seleccion} reps = fallo controlado. Confirma para cerrar.`}
          </Text>
          {seleccion != null && (
            <Pressable
              onPress={confirmarSobrecarga}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
                backgroundColor: seleccion === 5 ? ATP_BRAND.lime : MYO_RED,
                borderRadius: 16, padding: 14, paddingHorizontal: 32,
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color={seleccion === 5 ? t.textoSobreLima : '#fff'} />
              <Text style={{ color: seleccion === 5 ? t.textoSobreLima : '#fff', fontSize: 15, fontWeight: '800' }}>
                CONFIRMAR
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Ionicons name="checkmark-circle" size={48} color={ATP_BRAND.lime} />
          <Text style={{ color: dark ? ATP_BRAND.lime : t.tealTexto, fontSize: 20, fontWeight: '800', marginTop: 8 }}>MYO REPS COMPLETADO</Text>
          <Text style={{ color: t.textoSecundario, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            20 activación + {overloadSets.length} sobrecargas
          </Text>
        </View>
      )}

      {/* Sets log */}
      {overloadSets.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: dark ? t.textoTenue : t.textoSecundario, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>PROGRESO</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: ATP_BRAND.lime, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: t.textoSobreLima, fontSize: 9, fontWeight: '700' }}>A</Text>
            </View>
            <Text style={{ color: dark ? ATP_BRAND.lime : t.tealTexto, fontSize: 12 }}>Activación: 20 reps</Text>
          </View>
          {overloadSets.map((reps, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: reps === 5 ? ATP_BRAND.lime : MYO_RED,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: reps === 5 ? t.textoSobreLima : '#fff', fontSize: 9, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={{ color: reps === 5 ? (dark ? ATP_BRAND.lime : t.tealTexto) : myoRedText(dark), fontSize: 12 }}>
                Sobrecarga: {reps} reps {reps < 5 ? '(FALLO)' : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
