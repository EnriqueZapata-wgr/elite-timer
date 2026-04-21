/**
 * Onboarding Block 6 — Resumen y activacion (step 7).
 * Muestra perfil consolidado, issues detectados, protocolos recomendados.
 * Boton CTA para activar plan, crear trial 7 dias y generar plan diario.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { recommendProtocols } from '@/src/services/onboarding-service';
import { generateDailyPlan } from '@/src/services/protocol-builder-service';
import { haptic } from '@/src/utils/haptics';
import type { FunctionalIssue } from '@/src/types/onboarding';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';

// === TIPOS LOCALES ===

interface ProfileData {
  name: string;
  chronotype: string;
  chronotypeEmoji: string;
  primaryGoal: string;
  fitnessLevel: string;
  detectedIssues: { key: string; label: string; severity: 'low' | 'medium' | 'high' }[];
  recommendedProtocols: string[];
}

const CHRONO_META: Record<string, { emoji: string; label: string }> = {
  lion:    { emoji: '\uD83E\uDD81', label: 'Leon' },
  bear:    { emoji: '\uD83D\uDC3B', label: 'Oso' },
  wolf:    { emoji: '\uD83D\uDC3A', label: 'Lobo' },
  dolphin: { emoji: '\uD83D\uDC2C', label: 'Delfin' },
};

const GOAL_LABELS: Record<string, string> = {
  energy: 'Mas energia y rendimiento',
  fat_loss: 'Perder grasa',
  stress: 'Reducir estres',
  longevity: 'Longevidad',
  muscle: 'Ganar musculo',
};

const ISSUE_LABELS: Record<string, string> = {
  insulin_resistance: 'Posible resistencia a insulina',
  adrenal_fatigue: 'Fatiga adrenal',
  gut_dysbiosis: 'Disbiosis intestinal',
  chronic_inflammation: 'Inflamacion cronica',
  high_stress: 'Estres elevado',
  sleep_disruption: 'Sueno interrumpido',
  hormonal_imbalance: 'Desbalance hormonal',
};

const PROTOCOL_LABELS: Record<string, string> = {
  protocolo_metabolico_basico: 'Protocolo Metabolico Basico',
  protocolo_energia_vitalidad: 'Protocolo Energia y Vitalidad',
  protocolo_digestivo: 'Protocolo Digestivo',
  protocolo_antiinflamatorio: 'Protocolo Antiinflamatorio',
  protocolo_antiestres: 'Protocolo Antiestres',
  protocolo_sueno_profundo: 'Protocolo Sueno Profundo',
  protocolo_optimizacion_hormonal: 'Protocolo Optimizacion Hormonal',
};

// === MENSAJES DE BUILDING ===

const BUILD_MESSAGES = [
  'Analizando tu perfil biologico...',
  'Seleccionando protocolos...',
  'Ajustando a tu cronotipo...',
  'Creando tu timeline personalizado...',
  'Listo!',
];

// SVG progreso
const CIRCLE_SIZE = 100;
const CIRCLE_STROKE = 5;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// === COMPONENTE PRINCIPAL ===

export default function OnboardingSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'summary' | 'building'>('summary');
  const [buildMsg, setBuildMsg] = useState(0);
  const [buildProgress, setBuildProgress] = useState(0);

  // Cargar datos del perfil al montar
  useEffect(() => {
    if (user?.id) loadProfile();
  }, [user?.id]);

  async function loadProfile() {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Cargar client_profiles
      const { data: cp } = await supabase
        .from('client_profiles')
        .select('primary_goal, functional_flags, detected_issues, equipment_access, time_available_min')
        .eq('user_id', user.id)
        .maybeSingle();

      // Cargar cronotipo
      const { data: chrono } = await supabase
        .from('user_chronotype')
        .select('chronotype')
        .eq('user_id', user.id)
        .maybeSingle();

      // Cargar nombre del profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const chronoType = chrono?.chronotype || 'bear';
      const chronoMeta = CHRONO_META[chronoType] || CHRONO_META.bear;
      const detectedKeys = (cp?.detected_issues as string[]) ?? [];
      const flags = (cp?.functional_flags as Record<string, number>) ?? {};

      // Reconstruir issues con severidad
      const issues = detectedKeys.map(key => {
        const score = flags[key] ?? 0;
        const severity: 'low' | 'medium' | 'high' = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
        return {
          key,
          label: ISSUE_LABELS[key] || key,
          severity,
        };
      }).sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
      });

      // Recomendar protocolos basado en issues detectados
      const protocols = recommendProtocols(detectedKeys as FunctionalIssue[]);

      setProfile({
        name: prof?.full_name || 'Atleta',
        chronotype: chronoMeta.label,
        chronotypeEmoji: chronoMeta.emoji,
        primaryGoal: GOAL_LABELS[cp?.primary_goal as string] || cp?.primary_goal || 'No definido',
        fitnessLevel: formatFitnessLevel(cp?.time_available_min, cp?.equipment_access),
        detectedIssues: issues,
        recommendedProtocols: protocols,
      });
    } catch (e) {
      console.warn('Error loading summary profile:', e);
    }
    setLoading(false);
  }

  function formatFitnessLevel(timeMin?: number, equipment?: string[]): string {
    const time = timeMin ? `${timeMin} min/dia` : 'No definido';
    const equip = (equipment as string[])?.length
      ? (equipment as string[]).length + ' tipos de equipo'
      : 'Sin equipo';
    return `${time} | ${equip}`;
  }

  // === ACTIVAR PLAN ===

  const handleActivate = useCallback(async () => {
    if (!user?.id || !profile) return;
    haptic.medium();
    setPhase('building');

    try {
      // Paso 1: Analizando
      setBuildMsg(0);
      setBuildProgress(0.15);
      await delay(700);

      // Paso 2: Seleccionando protocolos — activar protocolos recomendados
      setBuildMsg(1);
      setBuildProgress(0.35);
      try {
        // Buscar templates por protocol_key y asignarlos
        for (const protocolKey of profile.recommendedProtocols) {
          const { data: template } = await supabase
            .from('protocol_templates')
            .select('id')
            .eq('protocol_key', protocolKey)
            .limit(1)
            .maybeSingle();

          if (template?.id) {
            // Verificar que no este ya activo
            const { data: existing } = await supabase
              .from('user_protocols')
              .select('id')
              .eq('user_id', user.id)
              .eq('template_id', template.id)
              .eq('status', 'active')
              .maybeSingle();

            if (!existing) {
              await supabase.from('user_protocols').insert({
                user_id: user.id,
                template_id: template.id,
                assigned_by: null,
                name: PROTOCOL_LABELS[protocolKey] || protocolKey,
                status: 'active',
                current_phase: 1,
                source: 'onboarding',
              });
            }
          }
        }
      } catch { /* protocolos pueden no existir aun */ }
      await delay(600);

      // Paso 3: Ajustando cronotipo
      setBuildMsg(2);
      setBuildProgress(0.6);
      await delay(600);

      // Paso 4: Generar plan diario
      setBuildMsg(3);
      setBuildProgress(0.8);
      try {
        await generateDailyPlan(user.id, undefined, true);
      } catch { /* falla silenciosa — plan se genera en home */ }
      await delay(500);

      // Crear trial de 7 dias Standard
      try {
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingSub) {
          const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('user_subscriptions').insert({
            user_id: user.id,
            tier: 'standard',
            status: 'trialing',
            trial_end: trialEnd,
            current_period_start: new Date().toISOString(),
            current_period_end: trialEnd,
          });
        }
      } catch { /* tabla puede no existir aun */ }

      // Paso 5: Listo
      setBuildMsg(4);
      setBuildProgress(1);
      haptic.success();
      await delay(500);

      // Marcar onboarding como completado
      await supabase.from('profiles').update({ onboarding_step: 'completed' }).eq('id', user.id);

      router.replace('/(tabs)' as any);
    } catch (e) {
      console.warn('Error activating plan:', e);
      // En caso de error, igual intentar navegar
      try {
        await supabase.from('profiles').update({ onboarding_step: 'completed' }).eq('id', user.id);
      } catch { /* silenciar */ }
      router.replace('/(tabs)' as any);
    }
  }, [user?.id, profile, router]);

  // === BUILDING PHASE ===
  if (phase === 'building') {
    const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - buildProgress);

    return (
      <View style={styles.buildContainer}>
        <View style={styles.buildContent}>
          {/* Logo */}
          <Animated.View entering={FadeInUp.duration(500)}>
            <EliteText style={styles.buildLogo}>ATP</EliteText>
          </Animated.View>

          {/* Circulo de progreso */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.circleWrap}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_RADIUS}
                stroke="#1a1a1a"
                strokeWidth={CIRCLE_STROKE}
                fill="none"
              />
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_RADIUS}
                stroke={ATP_BRAND.lime}
                strokeWidth={CIRCLE_STROKE}
                fill="none"
                strokeDasharray={`${CIRCLE_CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.circleIcon}>
              <Ionicons
                name={buildMsg >= BUILD_MESSAGES.length - 1 ? 'checkmark' : 'flash'}
                size={28}
                color={ATP_BRAND.lime}
              />
            </View>
          </Animated.View>

          {/* Titulo */}
          <EliteText style={styles.buildTitle}>Generando tu plan...</EliteText>

          {/* Mensaje actual */}
          <Animated.View entering={FadeIn.duration(300)} key={buildMsg}>
            <EliteText style={styles.buildMessage}>
              {BUILD_MESSAGES[buildMsg]}
            </EliteText>
          </Animated.View>
        </View>
      </View>
    );
  }

  // === LOADING ===
  if (loading) {
    return (
      <OnboardingShell step={7}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a8e02a" />
          <EliteText style={styles.loadingText}>Preparando tu resumen...</EliteText>
        </View>
      </OnboardingShell>
    );
  }

  // === SUMMARY PHASE ===
  const p = profile;
  const severityColors = { high: '#ef4444', medium: '#fbbf24', low: '#666' };

  return (
    <OnboardingShell step={7}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo ATP */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.logoWrap}>
          <EliteText style={styles.logo}>ATP</EliteText>
        </Animated.View>

        {/* Titulo */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <EliteText style={styles.title}>Tu perfil ATP</EliteText>
          <EliteText style={styles.subtitle}>
            Todo lo que ARGOS necesita para crear tu plan personalizado.
          </EliteText>
        </Animated.View>

        {/* Card: Cronotipo */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <EliteText style={styles.cardLabel}>CRONOTIPO</EliteText>
              <EliteText style={styles.cardValue}>
                {p?.chronotypeEmoji} {p?.chronotype}
              </EliteText>
            </View>
          </View>
        </Animated.View>

        {/* Card: Objetivo */}
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <EliteText style={styles.cardLabel}>OBJETIVO</EliteText>
              <EliteText style={styles.cardValue}>{p?.primaryGoal}</EliteText>
            </View>
          </View>
        </Animated.View>

        {/* Card: Fitness */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <EliteText style={styles.cardLabel}>DISPONIBILIDAD</EliteText>
              <EliteText style={styles.cardValue}>{p?.fitnessLevel}</EliteText>
            </View>
          </View>
        </Animated.View>

        {/* Detected Issues */}
        {p && p.detectedIssues.length > 0 && (
          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <EliteText style={styles.sectionTitle}>SENALES DETECTADAS</EliteText>
            <View style={styles.card}>
              {p.detectedIssues.map((issue, idx) => (
                <View
                  key={issue.key}
                  style={[
                    styles.issueRow,
                    idx < p.detectedIssues.length - 1 && styles.issueRowBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: severityColors[issue.severity] },
                    ]}
                  />
                  <EliteText style={styles.issueText}>{issue.label}</EliteText>
                  <EliteText
                    style={[
                      styles.severityLabel,
                      { color: severityColors[issue.severity] },
                    ]}
                  >
                    {issue.severity === 'high' ? 'ALTO' : issue.severity === 'medium' ? 'MEDIO' : 'BAJO'}
                  </EliteText>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Recommended Protocols */}
        {p && p.recommendedProtocols.length > 0 && (
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <EliteText style={styles.sectionTitle}>PROTOCOLOS RECOMENDADOS</EliteText>
            <View style={styles.card}>
              {p.recommendedProtocols.map((proto, idx) => (
                <View
                  key={proto}
                  style={[
                    styles.protoRow,
                    idx < p.recommendedProtocols.length - 1 && styles.issueRowBorder,
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#a8e02a" />
                  <EliteText style={styles.protoText}>
                    {PROTOCOL_LABELS[proto] || proto.replace(/_/g, ' ')}
                  </EliteText>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* No issues message */}
        {p && p.detectedIssues.length === 0 && p.recommendedProtocols.length === 0 && (
          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <View style={styles.card}>
              <View style={styles.noIssuesRow}>
                <Ionicons name="checkmark-circle" size={22} color="#a8e02a" />
                <EliteText style={styles.noIssuesText}>
                  Tus indicadores lucen bien. ARGOS optimizara tu plan para mantener tu rendimiento.
                </EliteText>
              </View>
            </View>
          </Animated.View>
        )}

        {/* CTA Button */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <AnimatedPressable onPress={handleActivate} style={styles.ctaBtn}>
            <Ionicons name="flash" size={20} color="#000" />
            <EliteText style={styles.ctaBtnText}>ACTIVAR MI PLAN PERSONALIZADO</EliteText>
          </AnimatedPressable>
          <EliteText style={styles.trialNote}>
            7 dias de prueba gratuita. Cancela cuando quieras.
          </EliteText>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </OnboardingShell>
  );
}

// === HELPERS ===

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// === ESTILOS ===

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#666',
  },

  // Summary
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: 16,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: '#a8e02a',
    letterSpacing: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#888',
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 8,
  },

  // Cards
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    padding: 16,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#666',
    letterSpacing: 1.5,
  },
  cardValue: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: '#fff',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },

  // Issues
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  issueRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#1a1a1a',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  issueText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#ccc',
  },
  severityLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
    marginLeft: 8,
  },

  // Protocols
  protoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  protoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#ccc',
  },

  // No issues
  noIssuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noIssuesText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999',
    lineHeight: 18,
  },

  // CTA
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#a8e02a',
    borderRadius: Radius.lg,
    paddingVertical: 18,
    marginTop: 24,
  },
  ctaBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
  trialNote: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },

  // Building phase
  buildContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildContent: {
    alignItems: 'center',
    gap: 24,
  },
  buildLogo: {
    fontSize: 32,
    fontFamily: Fonts.extraBold,
    color: '#a8e02a',
    letterSpacing: 4,
  },
  circleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
  buildMessage: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#666',
  },
});
