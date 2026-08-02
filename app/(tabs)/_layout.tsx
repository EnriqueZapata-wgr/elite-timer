/**
 * Tab Layout — la carcasa de la arquitectura V2 (MB-19 PIEZA 4).
 *
 *   ┌──────┬─────┬───────┬───────┬───────┐
 *   │ HOY  │ ATP │ ORBE  │ SALUD │ TRIBU │
 *   └──────┴─────┴───────┴───────┴───────┘
 *
 * La ORBE es ARGOS. Va al centro, SIN palabra, y respira. No es un tab más:
 * es la presencia del coach, siempre a un toque, en cualquier sala. Reacciona
 * pasando a 'alerta' cuando tiene algo que decir (calma con presencia: nunca
 * parpadea rápido ni se pone roja).
 *
 * Los tabs viejos (yo, biblioteca, progreso, perfil) NO se borran: pasan a
 * href: null y siguen siendo rutas válidas para deep links. Su contenido se
 * repartió: lo de YO vive en SALUD y en Ajustes, y lo que era KIT es la sala
 * ATP. `npm run censo` verifica que nada quedó sin puerta.
 *
 * Si el usuario es coach Y la pantalla es ancha (>1024px), muestra el
 * CoachPanelLayout en vez de las tabs normales.
 */
import { useState } from 'react';
import { useWindowDimensions, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { useCoachStatus } from '@/src/hooks/useCoachStatus';
import { useAuth } from '@/src/contexts/auth-context';
import { isAdmin } from '@/src/constants/admin-config';
import { CoachPanelLayout } from '@/src/screens/coach/CoachPanelLayout';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { ATP_BRAND, SURFACES, CATEGORY_COLORS } from '@/src/constants/brand';
import { FeedbackButton } from '@/src/components/FeedbackButton';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { useArgosPresence } from '@/src/components/argos/ArgosPresenceContext';

const COACH_PANEL_MIN_WIDTH = 1024;

/**
 * El icono de la ORBE. Vive aquí y no en ArgosOrb porque lo específico del tab
 * bar es el tamaño y el que NO lleve palabra debajo; la esfera es la misma que
 * usa el modo de voz.
 *
 * Un poco más grande que los demás iconos y con el hueco de la etiqueta que no
 * tiene: así queda ópticamente centrada en la fila.
 */
function OrbTabIcon() {
  const { orbState } = useArgosPresence();
  return (
    <View style={styles.orbSlot}>
      <ArgosOrb state={orbState} size={ORB_TAB_SIZE} />
    </View>
  );
}

// 19.1: 42 y no 46 — la orbe ahora respira al doble de amplitud y el hueco
// útil de la barra es 48 px: 42 × 1.12 (alerta en su punto más ancho) = 47.
const ORB_TAB_SIZE = 42;

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const { isCoach } = useCoachStatus();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [forceAthleteView, setForceAthleteView] = useState(false);
  // N3: la burbuja de feedback solo en DEV (no en build de producción ni para admins).
  const showFeedback = __DEV__;

  const showCoachPanel = width >= COACH_PANEL_MIN_WIDTH && isCoach && !forceAthleteView;

  if (showCoachPanel) {
    return (
      <CoachPanelLayout onSwitchToAthlete={() => setForceAthleteView(true)} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {forceAthleteView && width >= COACH_PANEL_MIN_WIDTH && isCoach && (
        <Pressable
          onPress={() => setForceAthleteView(false)}
          style={styles.coachBanner}
        >
          <Ionicons name="desktop-outline" size={14} color={CATEGORY_COLORS.metrics} />
          <EliteText variant="caption" style={styles.coachBannerText}>
            Volver al Panel Coach
          </EliteText>
        </Pressable>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ATP_BRAND.lime,
          tabBarInactiveTintColor: Colors.textMuted,
          // N4: respetar el safe-area inferior. En Android con botones de navegación del SO
          // (o iPhone con home bar) insets.bottom > 0 → el tab bar queda por encima. En gesture
          // nav (insets.bottom = 0) no agrega padding de más.
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopWidth: 0,
            elevation: 0,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.semiBold,
            fontSize: 11,
          },
        }}>
        {/* ── Los cinco ── */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Hoy',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'flash' : 'flash-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="kit"
          options={{
            title: 'ATP',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        {/* La ORBE. Sin etiqueta a propósito: no se nombra lo que se reconoce.
            El icono lo dibuja ArgosOrb, que respira solo. */}
        <Tabs.Screen
          name="argos"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarAccessibilityLabel: 'ARGOS',
            tabBarIcon: () => <OrbTabIcon />,
          }}
        />
        <Tabs.Screen
          name="salud"
          options={{
            title: 'Salud',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pulse-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tribu"
          options={{
            title: 'Tribu',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />

        {/* ── Retiradas del tab bar, vivas como rutas ──
            Su contenido se repartió; los archivos se quedan para no romper
            deep links. Ver el encabezado de este archivo. */}
        <Tabs.Screen
          name="yo"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="biblioteca"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="progreso"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="perfil"
          options={{ href: null }}
        />
      </Tabs>

      {showFeedback && <FeedbackButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  // 19.1: sin marginTop — con tabBarLabel: () => null no hay hueco de etiqueta
  // que compensar, y esos 6 px eran justo lo que sacaba a la orbe de la barra
  // al respirar con más amplitud.
  orbSlot: {
    width: ORB_TAB_SIZE,
    height: ORB_TAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: CATEGORY_COLORS.metrics + '15',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: CATEGORY_COLORS.metrics + '30',
  },
  coachBannerText: {
    color: CATEGORY_COLORS.metrics,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
});
