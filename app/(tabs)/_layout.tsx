/**
 * Tab Layout — Navegación principal con 3 tabs:
 * HOY | Yo | Kit
 *
 * Si el usuario es coach Y la pantalla es ancha (>1024px),
 * muestra el CoachPanelLayout en vez de las tabs normales.
 *
 * Las pantallas antiguas (biblioteca, progreso, perfil) siguen existiendo
 * como archivos para no romper rutas, pero están ocultas del tab bar.
 */
import { useState } from 'react';
import { useWindowDimensions, View, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { useCoachStatus } from '@/src/hooks/useCoachStatus';
import { CoachPanelLayout } from '@/src/screens/coach/CoachPanelLayout';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { ATP_BRAND, SURFACES, CATEGORY_COLORS } from '@/src/constants/brand';
import { FeedbackButton } from '@/src/components/FeedbackButton';

const COACH_PANEL_MIN_WIDTH = 1024;

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const { isCoach } = useCoachStatus();
  const [forceAthleteView, setForceAthleteView] = useState(false);

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
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopWidth: 0,
            elevation: 0,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.semiBold,
            fontSize: 11,
          },
        }}>
        {/* ── Tabs visibles ── */}
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
          name="yo"
          options={{
            title: 'Yo',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="kit"
          options={{
            title: 'Kit',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />

        {/* ── Tabs ocultas (siguen como rutas válidas pero no aparecen en el tab bar) ── */}
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

      <FeedbackButton />
    </View>
  );
}

const styles = StyleSheet.create({
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
