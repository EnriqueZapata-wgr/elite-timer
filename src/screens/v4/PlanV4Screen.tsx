/**
 * PLAN v4 (8-oct-2026 (v4), Fase A). La pestaña Plan de la v4
 * (R and D/ATP_V4_PLAN.md): tu programa, tus prioridades y tus cinco pilares,
 * cada uno con su porque (que lleva al Perfil) y lo de hoy (que lleva a Mi
 * plan). La semana por dia sigue en /mi-plan; lo esencial de MI PROGRAMA
 * (el documento completo, tu expediente y escribirle al coach) sigue aqui.
 *
 * Se monta dentro de <TabScreen themed> (la ruta `programa` en modo v4 pone
 * el TabScreen y la StatusBar): TabScreen no hace scroll, asi que el
 * ScrollView es de esta pantalla, y los tokens de adentro ya son los del
 * tema (useSurfaceTokens).
 *
 * De donde sale cada cosa (sin lecturas nuevas):
 *  - La semana: leerMiPlan via plan-v4-service (cache corta compartida con
 *    la hilera de Apps). Cada parte con su desenlace.
 *  - El programa: useProgramaElite (la misma lectura ligera de HOY).
 *  - Las palancas y los porques del documento: useLecturaDocumento (la
 *    lectura compartida de la evaluacion, cache de 60 s; la misma que ya hizo
 *    leerMiPlan, asi que no agrega viajes).
 *  - Que se dice y a donde lleva: plan-v4-core (con test).
 *
 * Estados (regla 13): cargando = huecos quietos con tope de 10 s; un pilar
 * que no se pudo leer dice "No se pudo leer" con Reintentar y relee SOLO sus
 * partes; sin documento no hay prioridades (no se inventan); un documento que
 * no se pudo leer se dice.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSystemReducedMotion } from '@/src/components/ui/useSystemReducedMotion';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { EscribirleCoach } from '@/src/components/elite-dx/EscribirleCoach';
import { useLecturaDocumento } from '@/src/components/elite-dx/useLecturaDocumento';
import {
  Aviso, BotonAncho, Etiqueta, Fila, Grupo, HeroPlan, Hueco, Prioridades, TarjetaPilar, useTintaPlan,
} from '@/src/components/v4/plan/PlanPiezas';
import { usePlanV4 } from '@/src/components/v4/plan/usePlanV4';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { useProgramaElite } from '@/src/hooks/useProgramaElite';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { leerEvaluacionEliteVigente } from '@/src/services/hoy/elite-hoy-service';
import { falloEvaluacionEsFatal, type NivelHoy } from '@/src/services/hoy/elite-hoy-core';
import { conMayuscula, vozDe, vozDeDocumento } from '@/src/services/elite/voz-programa-core';
import {
  FILAS_EXPEDIENTE, filaDocumentoCompleto, RUTAS_MI_PROGRAMA, type ExpedienteKey,
} from '@/src/services/elite/mi-programa-core';
import {
  avisoDeEvaluacion, coachesDeLaSemana, componerDia, PARTES_DE_SECCION, SIN_SESION,
} from '@/src/services/plan/mi-plan-core';
import {
  cabeceraDelPlan, extrasDelPlan, pilaresConPlan, pilaresDelPlan, prioridadesDelPlan, SECCION_DE_PILAR,
} from '@/src/services/plan/plan-v4-core';
import { Spacing } from '@/constants/theme';

/**
 * Glifos del expediente. Los mismos de MI PROGRAMA salvo el mapa, que aqui
 * lleva el de reportes: el nombre de su glifo de siempre es una palabra que
 * los archivos de la v4 no escriben.
 */
const ICONO_EXPEDIENTE: Record<ExpedienteKey, AppIconName> = {
  mapa: 'reportes',
  historia: 'historia-clinica',
  sintomas: 'sintomas',
  padecimientos: 'padecimientos',
  datos: 'salud-datos',
  linea: 'salud-expediente',
  ficha: 'padecimientos',
};

export function PlanV4Screen(): JSX.Element {
  // El jalon de refrescar va en teal: el lima queda para la barra del heroe.
  const { teal } = useTintaPlan();
  // 14-oct-2026 (ronda de marca): los pilares entran escalonados (40 ms
  // cada uno); con "reducir movimiento" del sistema, quietos.
  const movimientoReducido = useSystemReducedMotion();
  const router = useRouter();
  const { user, loading: sesionCargando } = useAuth();
  const userId = user?.id;
  const sub = useSubscription();
  const nivel: NivelHoy = useMemo(() => ({
    tier: sub.tier,
    cargando: sub.isLoading,
    noSePudoLeer: sub.nivelNoSePudoLeer,
    tieneEvaluacionElite: sub.tieneEvaluacionElite,
    evaluacionEliteNoSePudoLeer: sub.evaluacionEliteNoSePudoLeer,
  }), [sub.tier, sub.isLoading, sub.nivelNoSePudoLeer, sub.tieneEvaluacionElite, sub.evaluacionEliteNoSePudoLeer]);
  const evaluacionEsperada = falloEvaluacionEsFatal(nivel);

  const { programa, recargar: recargarPrograma } = useProgramaElite(userId);
  const lectura = useLecturaDocumento(userId);
  const documento = lectura && lectura.ok ? lectura.evaluacion : null;
  const plan = usePlanV4(userId);
  const { insumos, hoy, ahoraMin } = plan;
  const [releyendoDoc, setReleyendoDoc] = useState(false);
  // 8-oct-2026 (v4, revisión en frío): un Reintentar que llega con la
  // pantalla ya desmontada no escribe estado.
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  // La voz que ya se conoce del tipo de documento (lectura ligera del
  // programa); el documento leido manda dentro de componerDia.
  const programaTipo = programa.estado === 'ok' ? programa.tipo : null;
  const programaNombre = programa.estado === 'ok' ? programa.nombre : null;
  const vozConocida = useMemo(
    () => (programaTipo ? vozDe({ tipo: programaTipo, nombre: programaNombre }) : null),
    [programaTipo, programaNombre],
  );
  const ctx = useMemo(
    () => ({ coachElite: NOMBRE_COACH_ELITE, evaluacionEsperada, voz: vozConocida }),
    [evaluacionEsperada, vozConocida],
  );
  const dia = useMemo(() => (insumos ? componerDia(insumos, hoy, hoy, ctx) : null), [insumos, hoy, ctx]);
  const coachesSemana = useMemo(
    () => (insumos ? coachesDeLaSemana(insumos, hoy, { coachElite: NOMBRE_COACH_ELITE }) : []),
    [insumos, hoy],
  );
  const cab = cabeceraDelPlan({ programa, coachesSemana });
  const pilares = useMemo(
    () => (insumos && dia ? pilaresDelPlan({ ins: insumos, dia, hoy, documento, ahoraMin }) : null),
    [insumos, dia, hoy, documento, ahoraMin],
  );
  const prioridades = useMemo(
    () => (documento && pilares && insumos ? prioridadesDelPlan(documento, pilaresConPlan(pilares), extrasDelPlan(insumos)) : []),
    [documento, pilares, insumos],
  );
  const avisoEval = dia?.avisoEvaluacion ? avisoDeEvaluacion(dia.avisoEvaluacion, dia.voz) : null;
  const filaDoc = documento ? filaDocumentoCompleto(vozDeDocumento(documento)) : null;
  const fullName: unknown = user?.user_metadata?.full_name;
  const nombre = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null;

  // Las rutas salen del core (con test); algunas llevan parametro (?marcador=).
  const ir = useCallback((ruta: string) => { router.push(ruta as Href); }, [router]);

  const releerDocumento = useCallback(async () => {
    if (!userId) return;
    setReleyendoDoc(true);
    // Forzado: si llega bien despues de un fallo, la lectura compartida avisa
    // (EVALUACION_ELITE_CHANGED_EVENT) y todo lo que la usa se relee.
    try { await leerEvaluacionEliteVigente(userId, { forzar: true }); } catch { /* fail-soft */ }
    if (vivo.current) setReleyendoDoc(false);
  }, [userId]);

  const onRefresh = useCallback(async () => {
    recargarPrograma();
    await plan.refrescar();
  }, [plan, recargarPrograma]);

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={plan.refrescando} onRefresh={onRefresh} tintColor={teal} colors={[teal]} />}
      >
        <HeroPlan c={cab} ocupado={false} onReintentar={recargarPrograma} />

        {!userId && !sesionCargando ? (
          <Aviso texto={`${SIN_SESION.titulo}. ${SIN_SESION.cuerpo}`} />
        ) : null}

        {avisoEval ? (
          <Aviso
            texto={avisoEval.texto}
            ocupado={plan.releyendo.includes('evaluacion')}
            onReintentar={avisoEval.reintentar ? () => plan.reintentar('evaluacion', ['evaluacion']) : undefined}
          />
        ) : null}

        {/* Tus prioridades: solo con documento. Leyendo, un hueco; sin leer, se dice. */}
        {userId && lectura === null ? <Hueco alto={150} /> : null}
        {lectura && !lectura.ok ? (
          <View>
            <Etiqueta texto="TUS PRIORIDADES" />
            <Aviso texto="No se pudieron leer tus prioridades." ocupado={releyendoDoc} onReintentar={releerDocumento} />
          </View>
        ) : null}
        {prioridades.length > 0 ? (
          <View style={s.seccion}>
            <Etiqueta texto="TUS PRIORIDADES" />
            <Prioridades lista={prioridades} onIr={ir} />
          </View>
        ) : null}

        <View style={s.seccion}>
          <Etiqueta texto="TUS PILARES" />
          {userId && !pilares && !plan.vencido ? (
            <>
              <Hueco alto={110} />
              <Hueco alto={110} />
              <Hueco alto={110} />
            </>
          ) : null}
          {userId && !pilares && plan.vencido ? (
            <Aviso
              texto="No pudimos leer tu plan. Revisa tu conexión y vuelve a intentar."
              ocupado={plan.releyendo.includes('todo')}
              onReintentar={() => plan.reintentar('todo')}
            />
          ) : null}
          {pilares?.map((p, i) => (
            <Animated.View key={p.key} entering={movimientoReducido ? undefined : FadeInDown.delay(i * 40)}>
              <TarjetaPilar
                p={p}
                ocupado={plan.releyendo.includes(p.key)}
                onIr={ir}
                onReintentar={() => plan.reintentar(p.key, PARTES_DE_SECCION[SECCION_DE_PILAR[p.key]])}
              />
            </Animated.View>
          ))}
        </View>

        <BotonAncho
          texto="Tu semana completa"
          detalle="Lo que te toca cada día y qué puedes mover"
          onPress={() => router.push('/mi-plan')}
        />

        {filaDoc ? (
          <Grupo titulo="TU PROGRAMA">
            <Fila
              icon="evaluaciones"
              titulo={conMayuscula(filaDoc.titulo.replace(/^Ver /, ''))}
              detalle={filaDoc.detalle}
              ultima
              onPress={() => router.push(RUTAS_MI_PROGRAMA.evaluacion)}
            />
          </Grupo>
        ) : null}

        <Grupo titulo="TU EXPEDIENTE">
          {FILAS_EXPEDIENTE.map((f, j) => (
            <Fila
              key={f.key}
              icon={ICONO_EXPEDIENTE[f.key]}
              titulo={f.titulo}
              detalle={f.detalle}
              ultima={j === FILAS_EXPEDIENTE.length - 1}
              onPress={() => router.push(f.ruta)}
            />
          ))}
        </Grupo>

        <View style={s.coach}>
          <EscribirleCoach nombre={nombre} />
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 120 },
  seccion: { marginBottom: Spacing.lg },
  coach: { marginTop: Spacing.sm },
});
