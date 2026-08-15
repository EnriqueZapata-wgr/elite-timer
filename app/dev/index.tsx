/**
 * DEV Tools — menú de herramientas internas (Step COACH 7.1/N).
 *
 * Accesible vía router.push('/dev'). Lista las pantallas de validación/debug.
 * Expo Router trata `_dev/` como folder privado (no routeable) → usamos `dev/`.
 */
import { useMemo } from 'react';
import { router, Redirect } from 'expo-router';
import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/auth-context';
import { isAdmin } from '@/src/constants/admin-config';
import { useAppTheme } from '@/src/contexts/theme-context';
import type { AppThemeTokens } from '@/src/constants/brand';

const DEV_TOOLS = [
  {
    id: 'goal-tree-smoke',
    title: 'Goal Tree Smoke Test',
    description: 'Valida que el LLM descomponga objetivos en árbol JSON parseable.',
    route: '/dev/goal-tree-smoke' as const,
    icon: 'git-branch-outline',
  },
];

export default function DevToolsIndex() {
  const { user } = useAuth();
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);

  // E-4 (MB-12): mismo gate que settings/dev — un deep link dejaba a
  // cualquier founder disparando llamadas al LLM con costo.
  if (!__DEV__ && !isAdmin(user?.id)) {
    return <Redirect href="/settings" />;
  }

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>DEV Tools</Text>
        <Text style={s.subtitle}>Herramientas internas para validación y debugging.</Text>
      </View>
      {DEV_TOOLS.map((tool) => (
        <Pressable key={tool.id} style={s.toolCard} onPress={() => router.push(tool.route)}>
          <Ionicons name={tool.icon as any} size={24} color="#a3e635" />
          <View style={s.toolText}>
            <Text style={s.toolTitle}>{tool.title}</Text>
            <Text style={s.toolDesc}>{tool.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textoSecundario} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.fondo },
  header: { padding: 20 },
  title: { color: t.texto, fontSize: 28, fontWeight: '700' },
  subtitle: { color: t.textoSecundario, fontSize: 14, marginTop: 4 },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: t.card,
    borderRadius: 12,
    gap: 12,
  },
  toolText: { flex: 1 },
  toolTitle: { color: t.texto, fontSize: 16, fontWeight: '600' },
  toolDesc: { color: t.textoSecundario, fontSize: 12, marginTop: 2 },
});
