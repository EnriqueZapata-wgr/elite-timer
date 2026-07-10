/**
 * TopBanner (#23, sprint polish V1.3) — banner contextual flotante para
 * HOY y ARGOS (solo esas dos pantallas; NO Ajustes/onboarding).
 *
 * Variantes rotativas (cambia cada 15s):
 *   - 🔔 notificaciones sin leer (≥5 = CRÍTICA: gana y no rota)
 *   - 🔥 racha activa (>3 días)
 *   - +H⁺ protones ganados hoy
 *   - 💡 insight ARGOS del día
 *   - [trial countdown: el sistema de trial/subscription NO existe aún —
 *      hook marcado con TODO(#23) para cuando RevenueCat aterrice]
 *
 * Dismissable: se oculta el resto del DÍA (AsyncStorage @atp/top_banner_dismissed).
 * Editorial: pill flotante ELEVATION[2], acento mínimo.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getCurrentStreak } from '@/src/services/adherence-service';
import { countUnreadInbox } from '@/src/services/user-notifications-service';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Fonts, FontSizes, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT } from '@/src/constants/brand';

const DISMISS_KEY = '@atp/top_banner_dismissed';
const ROTATE_MS = 15_000;
const RELOAD_MS = 60_000;
// Umbral de criticidad para el inbox: con >=5 sin leer, la variante gana y no rota.
const UNREAD_CRITICAL = 5;

interface BannerVariant {
  id: string;
  icon: string;
  text: string;
  cta?: string;
  route?: string;
  critical?: boolean;
}

interface Props {
  /** Desplazamiento vertical extra bajo el safe-area (para no tapar headers). */
  offset?: number;
}

export function TopBanner({ offset = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [variants, setVariants] = useState<BannerVariant[]>([]);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(true); // arranca oculto hasta verificar
  const lastLoadRef = useRef(0);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const now = Date.now();
    if (now - lastLoadRef.current < RELOAD_MS) return;
    lastLoadRef.current = now;

    // Dismiss del día
    const dismissedDate = await AsyncStorage.getItem(DISMISS_KEY).catch(() => null);
    const today = getLocalToday();
    if (dismissedDate === today) { setDismissed(true); return; }
    setDismissed(false);

    const [streakRes, unreadRes, protonsRes, insightRes, labsRes] = await Promise.allSettled([
      getCurrentStreak(user.id),
      countUnreadInbox(user.id),
      supabase.from('proton_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gt('amount', 0)
        .gte('created_at', `${today}T00:00:00`),
      supabase.from('argos_daily_insights')
        .select('insight')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      // Sprint LABS GUÍA: ¿ya subió algún estudio? (0 = candidato a la guía)
      supabase.from('lab_uploads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    const next: BannerVariant[] = [];

    // TODO(#23): variante de trial countdown cuando exista el sistema de
    // subscription (RevenueCat, sprint siguiente): crítica si quedan <3 días.

    const unread = unreadRes.status === 'fulfilled' ? unreadRes.value : 0;
    if (unread > 0) {
      next.push({
        id: 'unread',
        icon: 'notifications-outline',
        text: `${unread} notificaci${unread === 1 ? 'ón' : 'ones'} sin leer`,
        cta: 'Ver',
        route: '/notifications',
        critical: unread >= UNREAD_CRITICAL,
      });
    }

    const streak = streakRes.status === 'fulfilled' ? streakRes.value : 0;
    if (streak > 3) {
      next.push({ id: 'streak', icon: 'flame-outline', text: `🔥 Racha de ${streak} días` });
    }

    if (protonsRes.status === 'fulfilled' && protonsRes.value.data) {
      const earned = protonsRes.value.data.reduce((a: number, t: any) => a + Number(t.amount), 0);
      if (earned > 0) {
        next.push({
          id: 'protons',
          icon: 'flash-outline',
          text: `+${earned} H⁺ hoy`,
          cta: 'Ver Shop',
          route: '/economy/shop',
        });
      }
    }

    if (insightRes.status === 'fulfilled' && insightRes.value?.data?.insight) {
      next.push({
        id: 'insight',
        icon: 'bulb-outline',
        text: '💡 Insight de hoy listo',
        cta: 'Ver',
        route: '/notifications',
      });
    }

    // Sprint LABS GUÍA (trigger post-onboarding): sin estudios subidos →
    // invitar a la guía. count === 0 estricto: si la query falla no molestamos.
    if (labsRes.status === 'fulfilled' && labsRes.value.count === 0) {
      next.push({
        id: 'labs_guide',
        icon: 'flask-outline',
        text: '¿No sabes qué labs hacerte?',
        cta: 'Guía',
        route: '/labs-guide',
      });
    }

    setVariants(next);
    setIndex(0);
  }, [user?.id]);

  // Cargar al enfocar la pantalla que lo hospeda
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Rotación cada 15s — si hay una variante CRÍTICA, esa gana y NO rota.
  useEffect(() => {
    if (variants.length <= 1) return;
    const critical = variants.findIndex(v => v.critical);
    if (critical >= 0) { setIndex(critical); return; }
    const t = setInterval(() => setIndex(i => (i + 1) % variants.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [variants]);

  const dismiss = async () => {
    haptic.light();
    setDismissed(true);
    await AsyncStorage.setItem(DISMISS_KEY, getLocalToday()).catch(() => {});
  };

  if (dismissed || variants.length === 0) return null;
  const v = variants[Math.min(index, variants.length - 1)];

  return (
    <Animated.View
      key={v.id}
      entering={FadeInDown.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[s.wrap, { top: insets.top + offset }]}
      pointerEvents="box-none"
    >
      <View style={s.pill}>
        <Ionicons name={v.icon as any} size={14} color={v.critical ? '#fbbf24' : ATP_BRAND.lime} />
        <Text style={s.text} numberOfLines={1}>{v.text}</Text>
        {v.route && (
          <Pressable
            onPress={() => { haptic.light(); router.push(v.route as any); }}
            hitSlop={8}
            style={s.cta}
          >
            <Text style={s.ctaText}>{v.cta ?? 'Ver'}</Text>
          </Pressable>
        )}
        <Pressable onPress={dismiss} hitSlop={10}>
          <Ionicons name="close" size={14} color={TEXT.tertiary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '92%',
    backgroundColor: 'rgba(26,26,26,0.96)', // ELEVATION[2] con leve translucidez
    borderWidth: 0.5,
    borderColor: ELEVATION[2].border,
    borderRadius: Radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: {
    color: '#ddd',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    flexShrink: 1,
  },
  cta: {
    backgroundColor: 'rgba(168,224,42,0.14)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ctaText: {
    color: ATP_BRAND.lime,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
  },
});
