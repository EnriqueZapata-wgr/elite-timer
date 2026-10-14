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
 * Ronda de marca (14-oct-2026): cada tarjeta pinta su icono con el color de
 * la SECCION de la app (APP_SECTION_COLORS, las tres capas del mosaico de la
 * cuadricula: fondo al 10%, borde al 22%, icono al 100%), asi la misma app
 * se ve igual aqui y abajo. El rotulo es SECTION_TITLE, gris.
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
import { APP_SECTION_COLORS, SECTION_TITLE, withOpacity } from '@/src/constants/brand';
import { appsDelPlan } from '@/src/services/plan/plan-v4-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

export function AppsRecomendadas(): JSX.Element | null {
  const router = useRouter();
  const { t, borde } = useTintaPlan();
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
          const color = APP_SECTION_COLORS[app.section];
          return (
            <AnimatedPressable
              key={a.appKey}
              style={[s.tarjeta, { backgroundColor: t.card, borderColor: borde }]}
              onPress={() => { haptic.light(); router.push(app.route); }}
              accessibilityRole="button"
              accessibilityLabel={`${app.label}. ${a.motivo}${a.hoy ? '. Toca hoy' : ''}`}
            >
              <View style={[s.icono, { backgroundColor: withOpacity(color, 0.10), borderColor: withOpacity(color, 0.22) }]}>
                <AppIcon name={app.icon} size={22} color={color} />
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
    fontFamily: Fonts.semiBold, fontSize: SECTION_TITLE.fontSize, letterSpacing: SECTION_TITLE.letterSpacing,
    marginHorizontal: Spacing.md, marginBottom: SECTION_TITLE.marginBottom,
  },
  carrusel: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tarjeta: {
    width: 156, minHeight: 124, borderWidth: 0.5, borderRadius: Radius.card,
    padding: Spacing.md - Spacing.xs, gap: Spacing.xs,
  },
  icono: {
    width: 40, height: 40, borderRadius: Radius.card, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center',
  },
  nombre: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  motivo: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 16 },
});
