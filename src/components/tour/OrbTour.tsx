/**
 * OrbTour — el tour guiado por la orbe (MB-20 Pieza 4).
 *
 * Reemplaza al carrusel de 7 pantallas: la orbe recorre la app pantalla por
 * pantalla, con una burbuja sobre el contenido REAL. La capa no bloquea el
 * toque (pointerEvents box-none): el usuario puede probar el gesto del paso
 * ahí mismo. En TODOS los pasos hay "Terminar tour": nadie queda atrapado.
 *
 * V1 sin recorte de spotlight: la burbuja señala con palabras y vive anclada
 * sobre la barra de tabs, junto a la orbe que lo narra.
 *
 * NOCTURNO-FIX P5: el tour no secuestra. Si el usuario navega por su cuenta a
 * otra pantalla, el tour SE PAUSA (la burbuja se esconde y queda una pastilla
 * discreta para seguir). Jamás lo regresa a la fuerza; volver a la pantalla
 * del paso también reanuda solo.
 */
import { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { haptic } from '@/src/utils/haptics';
import { ATP_EVENTS, useAnalytics } from '@/src/lib/analytics';
import {
  ORB_TOUR_STEPS,
  ORB_TOUR_DONE_KEY,
} from '@/src/components/tour/orb-tour-core';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

interface Props {
  /** Espacio inferior (alto de la tab bar) para no taparla. */
  bottomOffset: number;
  onDone: () => void;
}

export function OrbTour({ bottomOffset, onDone }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { track } = useAnalytics();
  const [index, setIndex] = useState(0);
  // El usuario se fue por su cuenta: burbuja escondida, pastilla para seguir.
  const [paused, setPaused] = useState(false);
  // Ruta que el TOUR pidió y aún no se refleja en pathname: ese desfase no es
  // navegación del usuario y no debe pausar.
  const navTargetRef = useRef<string | null>(null);
  const step = ORB_TOUR_STEPS[index];

  useEffect(() => {
    track(ATP_EVENTS.TOUR_STARTED);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al entrar a un paso, el tour lleva al usuario a la pantalla del paso.
  useEffect(() => {
    if (!step) return;
    track(ATP_EVENTS.TOUR_STEP_VIEWED, { step: step.id, index });
    navTargetRef.current = step.route;
    try {
      router.navigate(step.route as never);
    } catch {
      // La burbuja sigue siendo válida aunque no navegue, pero el desfase
      // deja de ser nuestro: que el watcher decida con la ruta real.
      navTargetRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // El watcher del secuestro: si la ruta actual dejó de ser la del paso y no
  // fue el tour quien navegó, se pausa. Volver a la ruta del paso reanuda.
  useEffect(() => {
    if (!step) return;
    if (pathname === step.route) {
      navTargetRef.current = null;
      setPaused(false);
      return;
    }
    if (navTargetRef.current === step.route) return; // navegación nuestra en vuelo
    setPaused(true);
  }, [pathname, step]);

  function resume() {
    haptic.light();
    if (!step) return;
    setPaused(false);
    navTargetRef.current = step.route;
    try {
      router.navigate(step.route as never);
    } catch { navTargetRef.current = null; }
  }

  function finish(completed: boolean) {
    AsyncStorage.setItem(ORB_TOUR_DONE_KEY, 'true').catch(() => {});
    track(completed ? ATP_EVENTS.TOUR_COMPLETED : ATP_EVENTS.TOUR_SKIPPED, {
      lastStep: step?.id,
    });
    onDone();
  }

  function next() {
    haptic.light();
    if (index >= ORB_TOUR_STEPS.length - 1) { finish(true); return; }
    setIndex(index + 1);
  }

  if (!step) return null;

  if (paused) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          style={[s.pausedWrap, { bottom: bottomOffset + 10 }]}
        >
          <Pressable onPress={resume} style={s.pausedPill} accessibilityRole="button">
            <ArgosOrb size={20} reducedMotion />
            <EliteText style={s.pausedText}>Seguir tour</EliteText>
          </Pressable>
          <Pressable
            onPress={() => { haptic.light(); finish(false); }}
            hitSlop={10}
            style={s.pausedClose}
            accessibilityLabel="Terminar tour"
          >
            <Ionicons name="close" size={14} color={TEXT.secondary} />
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        key={step.id}
        entering={FadeInDown.springify().damping(18)}
        style={[s.bubbleWrap, { bottom: bottomOffset + 10 }]}
      >
        <View style={s.bubble}>
          <View style={s.bubbleHeader}>
            <ArgosOrb size={26} state="hablando" />
            <EliteText style={s.kicker}>{step.kicker}</EliteText>
            <EliteText style={s.progress}>{index + 1} de {ORB_TOUR_STEPS.length}</EliteText>
          </View>
          <EliteText style={s.copy}>{step.copy}</EliteText>
          <View style={s.btnRow}>
            <Pressable onPress={() => { haptic.light(); finish(false); }} hitSlop={8}>
              <EliteText style={s.endText}>Terminar tour</EliteText>
            </Pressable>
            <Pressable
              onPress={next}
              style={({ pressed }) => [s.nextBtn, pressed && { opacity: 0.7 }]}
            >
              <EliteText style={s.nextText}>
                {index >= ORB_TOUR_STEPS.length - 1 ? 'LISTO' : 'SIGUIENTE'}
              </EliteText>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  bubbleWrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
  },
  // ACERO (22-ago-2026): las tres superficies del tour estaban en #0d0d0d, un
  // hex huérfano que no correspondía a ningún nivel de la escala. Con el
  // lienzo en negro puro pasaba desapercibido; con el lienzo en acero
  // (#0F1114) quedaba MÁS OSCURO que la pantalla sobre la que flota y el tour
  // se leía hundido en vez de encima. Pasan a ELEVATION[1], que es lo que
  // siempre quisieron ser: una card flotando sobre el contenido real.
  bubble: {
    backgroundColor: ELEVATION[1].bg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    flex: 1,
    color: ATP_BRAND.lime,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  progress: {
    color: TEXT.muted,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
  copy: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    lineHeight: 21,
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  endText: {
    color: TEXT.secondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    textDecorationLine: 'underline',
  },
  nextBtn: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  nextText: {
    color: '#000',
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  pausedWrap: {
    position: 'absolute',
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pausedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: ELEVATION[1].bg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pausedText: {
    color: ATP_BRAND.lime,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  pausedClose: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
