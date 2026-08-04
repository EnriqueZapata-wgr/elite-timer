/**
 * SmartCheckModal — la paloma inteligente (MB-20 Pieza 1.3).
 *
 * Palomear una experiencia no regala el check: pregunta primero.
 *   Con captura externa (meditar, respirar, cardio):
 *     SÍ → captura de minutos → se registra la sesión de verdad.
 *     NO → navega a la función.
 *   Sin captura externa (Entrenar, Journal, N-Back):
 *     SÍ → navega a su pantalla de registro real (el check honesto nace de la
 *     actividad, no de la declaración).
 *     NO → cierra sin más.
 * Nunca un solo botón: un gesto que no ofrece opción no debería preguntar.
 */
import { useState } from 'react';
import { Modal, View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';
import { EXPERIENCIA_CAPTURA, type Tarea } from '@/src/services/hoy/tareas-core';

const PREGUNTAS: Record<string, string> = {
  meditation: '¿Ya meditaste?',
  breathwork: '¿Ya hiciste tu respiración?',
  cardio: '¿Ya hiciste cardio?',
  strength: '¿Ya entrenaste?',
  journal: '¿Ya escribiste en tu journal?',
  nback: '¿Ya jugaste tu N-Back?',
};

const MINUTOS = [5, 10, 15, 20, 30, 45, 60];

interface Props {
  tarea: Tarea | null;
  onClose: () => void;
  /** NO de una capturable: ir a la función. */
  onNavigate: (t: Tarea) => void;
  /** SÍ con captura: registrar la sesión externa. */
  onRegistrar: (t: Tarea, minutes: number) => Promise<boolean>;
  /** SÍ sin captura: ir a la pantalla de registro real (EXPERIENCIA_REGISTRO). */
  onIrRegistro: (t: Tarea) => void;
  /** Backdrop / botón atrás: se descartó la pregunta SIN elegir. Alimenta la
   * burbuja contextual del gesto (MB-20.4): quien huye de la pregunta
   * probablemente quería abrir la función, no palomearla. Contestar NO es
   * elegir y no pasa por aquí. */
  onDismissSinElegir?: () => void;
}

export function SmartCheckModal({
  tarea, onClose, onNavigate, onRegistrar, onIrRegistro, onDismissSinElegir,
}: Props) {
  const [fase, setFase] = useState<'pregunta' | 'minutos'>('pregunta');
  const [minutos, setMinutos] = useState(15);
  const [saving, setSaving] = useState(false);

  if (!tarea) return null;
  const capturable = (EXPERIENCIA_CAPTURA as readonly string[]).includes(tarea.key);

  function reset() {
    setFase('pregunta');
    setMinutos(15);
    setSaving(false);
  }

  function close() { reset(); onClose(); }

  /** Cierre por backdrop / botón atrás: sin elección. */
  function dismiss() { close(); onDismissSinElegir?.(); }

  async function registrar() {
    if (!tarea || saving) return;
    setSaving(true);
    const ok = await onRegistrar(tarea, minutos);
    setSaving(false);
    if (ok) { haptic.success(); close(); }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={s.backdrop} onPress={dismiss}>
        <Pressable style={s.card} onPress={() => {}}>
          {fase === 'pregunta' ? (
            <>
              <EliteText style={s.title}>{PREGUNTAS[tarea.key] ?? `¿Ya hiciste ${tarea.name}?`}</EliteText>
              <EliteText style={s.subtitle}>
                {capturable
                  ? 'Si lo hiciste por fuera, se registra igual: el check es honesto.'
                  : 'El check nace de la actividad real: SÍ te lleva directo a registrarla.'}
              </EliteText>
              <View style={s.rowBtns}>
                {capturable ? (
                  <Pressable
                    style={({ pressed }) => [s.btn, s.btnQuiet, pressed && s.pressed]}
                    onPress={() => { haptic.light(); const t = tarea; close(); onNavigate(t); }}
                  >
                    <EliteText style={s.btnQuietText}>NO, VOY</EliteText>
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [s.btn, s.btnQuiet, pressed && s.pressed]}
                    onPress={() => { haptic.light(); close(); }}
                  >
                    <EliteText style={s.btnQuietText}>NO</EliteText>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [s.btn, s.btnLime, pressed && s.pressed]}
                  onPress={() => {
                    haptic.light();
                    if (capturable) { setFase('minutos'); return; }
                    const t = tarea;
                    close();
                    onIrRegistro(t);
                  }}
                >
                  <EliteText style={s.btnLimeText}>SÍ</EliteText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <EliteText style={s.title}>¿Cuántos minutos?</EliteText>
              <View style={s.minutosWrap}>
                {MINUTOS.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => { haptic.light(); setMinutos(m); }}
                    style={[s.minutoChip, minutos === m && s.minutoChipOn]}
                  >
                    <EliteText style={[s.minutoText, minutos === m && s.minutoTextOn]}>{m}</EliteText>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={({ pressed }) => [s.btn, s.btnLime, { marginTop: Spacing.md }, pressed && s.pressed]}
                onPress={registrar}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#000" />
                  : <EliteText style={s.btnLimeText}>REGISTRAR {minutos} MIN</EliteText>}
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111',
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: Spacing.lg,
  },
  title: {
    color: '#fff',
    fontSize: FontSizes.xl,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
  subtitle: {
    color: TEXT.secondary,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.lg,
  },
  btn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnQuiet: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btnQuietText: { color: '#fff', fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1 },
  btnLime: { backgroundColor: ATP_BRAND.lime },
  btnLimeText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1 },
  pressed: { opacity: 0.7 },
  minutosWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  minutoChip: {
    width: 52,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  minutoChipOn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.18),
    borderColor: ATP_BRAND.lime,
  },
  minutoText: { color: TEXT.secondary, fontSize: FontSizes.md, fontFamily: Fonts.bold },
  minutoTextOn: { color: ATP_BRAND.lime },
});
