/**
 * DEV Tools — menú de herramientas internas (Step COACH 7.1/N).
 *
 * Accesible vía router.push('/dev'). Lista las pantallas de validación/debug.
 * Expo Router trata `_dev/` como folder privado (no routeable) → usamos `dev/`.
 */
import { router } from 'expo-router';
import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DEV Tools</Text>
        <Text style={styles.subtitle}>Herramientas internas para validación y debugging.</Text>
      </View>
      {DEV_TOOLS.map((tool) => (
        <Pressable key={tool.id} style={styles.toolCard} onPress={() => router.push(tool.route)}>
          <Ionicons name={tool.icon as any} size={24} color="#a3e635" />
          <View style={styles.toolText}>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDesc}>{tool.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 4 },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    gap: 12,
  },
  toolText: { flex: 1 },
  toolTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toolDesc: { color: '#888', fontSize: 12, marginTop: 2 },
});
