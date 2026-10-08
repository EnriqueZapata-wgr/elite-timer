/**
 * AppsRecomendadas (8-oct-2026 (v4), Fase A): la hilera "Recomendadas por tu
 * plan" arriba de la sala de Apps. Hoy lleva a las apps que el plan abre:
 * suplementos si hay plan de suplementos, Entrenar si el coach asigno
 * rutinas, Ayuno si hay ventana, la app de cada practica y la de cada habito.
 *
 * Que y en que orden lo decide appsDelPlan (plan-v4-core, con test): solo
 * apps del registro que esta cuenta ve sin candado, sin repetir, maximo
 * cuatro, lo de hoy primero. La semana sale de la misma lectura que PLAN
 * (plan-v4-service, cache corta compartida): abrir Apps despues de Plan no
 * vuelve a pedir todo.
 *
 * Devuelve null mientras lee, si no hay nada que recomendar o si nada se pudo
 * leer: nunca una fila inventada ni un hueco que parezca vacio.
 *
 * Candados: misma regla que la sala (kit.tsx). Con el nivel sin leer no se
 * cierra nada a quien pago. El Ciclo no necesita compuerta aqui: un habito
 * del ciclo solo llega a la lista si ya paso la de HOY (mi-plan-core), y sin
 * sexo conocido no pasa. Nunca se supone.
 */
import { useMemo, type JSX } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { useTintaPlan } from '@/src/components/v4/plan/PlanPiezas';
import { usePlanV4 } from '@/src/components/v4/plan/usePlanV4';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { APP_BY_KEY, visibleApps } from '@/src/constants/app-registry';
import { appsDelPlan } from '@/src/services/plan/plan-v4-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

export function AppsRecomendadas(): JSX.Element | null {
  const router = useRouter();
  const { t, teal, borde } = useTintaPlan();
  const { user } = useAuth();
  const { insumos, hoy, ahoraMin } = usePlanV4(user?.id);
  const {
    tier, tieneEvaluacionElite, evaluacionEliteNoSePudoLeer, isLoading: nivelCargando, nivelNoSePudoLeer,
  } = useSubscription();
  const nivelIncierto = nivelCargando || nivelNoSePudoLeer;
  const apps = useMemo(
    () => visibleApps(true, nivelIncierto ? 'elite' : tier, tieneEvaluacionElite || evaluacionEliteNoSePudoLeer),
    [nivelIncierto, tier, tieneEvaluacionElite, evaluacionEliteNoSePudoLeer],
  );
  const lista = useMemo(
    () => (insumos ? appsDelPlan({ ins: insumos, hoy, apps, ahoraMin }) : []),
    [insumos, hoy, apps, ahoraMin],
  );
  if (lista.length === 0) return null;

  return (
    <View style={s.bloque}>
      <EliteText style={[s.titulo, { color: t.textoSecundario }]} accessibilityRole="header">
        RECOMENDADAS POR TU PLAN
      </EliteText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carrusel}>
        {lista.map((a) => {
          const app = APP_BY_KEY[a.appKey];
          if (!app) return null;
          return (
            <AnimatedPressable
              key={a.appKey}
              style={[s.tarjeta, { backgroundColor: t.card, borderColor: borde }]}
              onPress={() => { haptic.light(); router.push(app.route); }}
              accessibilityRole="button"
              accessibilityLabel={`${app.label}. ${a.motivo}${a.hoy ? '. Toca hoy' : ''}`}
            >
              <View style={[s.icono, { backgroundColor: t.hundido }]}>
                <AppIcon name={app.icon} size={22} color={teal} />
              </View>
              <EliteText style={[s.nombre, { color: t.texto }]} numberOfLines={1}>{app.label}</EliteText>
              <EliteText style={[s.motivo, { color: t.textoSecundario }]} numberOfLines={2}>{a.motivo}</EliteText>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bloque: { marginBottom: Spacing.md },
  titulo: {
    fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 2,
    marginHorizontal: Spacing.md + 2, marginBottom: 10,
  },
  carrusel: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tarjeta: { width: 156, minHeight: 124, borderWidth: 0.5, borderRadius: Radius.md, padding: 12, gap: 6 },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  motivo: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 16 },
});
