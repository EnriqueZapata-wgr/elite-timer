/**
 * Goal Tree LLM Smoke Test (DEV) — Step COACH 7/N.
 *
 * Pantalla de desarrollo para validar manualmente que GoalTree.decomposeGoal
 * llama al LLM y retorna un árbol JSON parseable. NO está enlazada en ninguna
 * navegación de producción; se accede con router.push('/goal-tree-smoke').
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { GoalTree } from '@/src/lib/coach-engine';
import { supabase } from '@/src/lib/supabase';
import { Colors, Spacing, Radius, FontSizes, Fonts } from '@/constants/theme';

export default function GoalTreeSmokeScreen() {
  const [goal, setGoal] = useState('correr un maratón en 6 meses');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDecompose() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario con sesión iniciada.');

      const decomp = await GoalTree.decomposeGoal({ userId: user.id, goalText: goal, depth: 3 });
      setResult(JSON.stringify(decomp, null, 2));
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (result) await Clipboard.setStringAsync(result);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="subtitle" style={styles.heading}>
          Goal Tree LLM Smoke Test (DEV)
        </EliteText>

        <EliteText variant="label" style={styles.label}>
          Objetivo
        </EliteText>
        <TextInput
          style={styles.input}
          value={goal}
          onChangeText={setGoal}
          placeholder="Escribe un objetivo grande…"
          placeholderTextColor={Colors.textSecondary}
          multiline
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleDecompose}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textOnGreen} />
          ) : (
            <EliteText variant="label" style={styles.buttonText}>
              Decompose
            </EliteText>
          )}
        </Pressable>

        {error && (
          <View style={styles.errorBox}>
            <EliteText variant="body" style={styles.errorText}>
              ⚠️ {error}
            </EliteText>
          </View>
        )}

        {result && (
          <>
            <Pressable style={styles.copyButton} onPress={handleCopy}>
              <EliteText variant="caption" style={styles.copyText}>
                Copiar JSON
              </EliteText>
            </Pressable>
            <View style={styles.resultBox}>
              <EliteText variant="caption" style={styles.resultText}>
                {result}
              </EliteText>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  heading: {
    marginBottom: Spacing.sm,
  },
  label: {
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    minHeight: 60,
  },
  button: {
    backgroundColor: Colors.neonGreen,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textOnGreen,
    fontFamily: Fonts.bold,
  },
  copyButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  copyText: {
    color: Colors.neonGreen,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: {
    color: '#ef4444',
  },
  resultBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  resultText: {
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
  },
});
