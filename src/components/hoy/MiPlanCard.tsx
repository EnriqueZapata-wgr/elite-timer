/**
 * MiPlanCard (7-oct-2026, Mi plan): la tarjeta "MI PLAN" de HOY, donde antes
 * iba "Que hacer hoy".
 *
 * POR QUE CAMBIO. El dueno probo los tres habitos elegidos por marcadores
 * fuera de ventana y pidio otra cosa en ese lugar: un resumen de manual, como
 * se entregan las plataformas, con "Mi plan / Ver mi plan". Las tres acciones
 * con paloma no se perdieron: viven dentro de /mi-plan, en "HOY TE TOCA".
 *
 * Que pinta: el molde editorial de siempre (EditorialCard, foto
 * disciplina-semanal), el titulo MI PLAN, UNA linea real de hoy armada solo
 * con las partes que existen ("Hoy: Pierna y empuje · 4 suplementos · 3
 * prácticas") y el boton VER MI PLAN. La regla de la linea vive en
 * mi-plan-core (resumenDelDia, tarjetaMiPlan), con test.
 *
 * Estados (regla 13, nunca una tarjeta feliz y vacia):
 *  - cargando: la tarjeta quieta, sin linea y sin spinner. Tope de 10 s como
 *    el hero: una lectura colgada no la deja muda para siempre.
 *  - no se pudo leer: "No pudimos leer tu plan" + Reintentar.
 *  - sin nada armado (y TODO leido): lo dice y lleva a donde se arma
 *    (/packs/armar); no promete un plan que no existe.
 *  - con plan: la linea y VER MI PLAN. Si una parte no se pudo leer, la linea
 *    va sin ella (nunca como cero) y una segunda linea lo dice.
 *
 * Lee solo lo que la linea necesita (PARTES_RESUMEN): ni sueno ni evaluacion.
 * Sirve igual a los tres niveles de cuenta porque sale de las mismas tablas;
 * por eso `nivel` se recibe (contrato con HOY, el mismo de la tarjeta
 * anterior) y hoy no cambia nada de lo que se pinta.
 *
 * Relee al volver a HOY (se regresa de un editor con el plan cambiado) y
 * cuando una practica se enciende o se pausa. Un fallo no borra la linea que
 * ya se veia (fusionarInsumos).
 *
 * 8-oct-2026 (revisión en frío): la misma guarda de cuenta que la pantalla.
 * Una lectura que salio para la cuenta A y llega cuando ya esta la B no
 * escribe: antes podia pintar en la tarjeta de B la linea del plan de A (el
 * `turno` no la paraba, porque la lectura de B todavia no habia salido).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { DEGRADADO_MARCA } from '@/src/components/marca/FondoEditorial';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { INTERVENTIONS_CHANGED_EVENT } from '@/src/services/interventions/intervention-service';
import { TOPE_HERO_ELITE_MS, type NivelHoy } from '@/src/services/hoy/elite-hoy-core';
import { leerMiPlan } from '@/src/services/plan/mi-plan-service';
import {
  componerDia, fusionarInsumos, PARTES_RESUMEN, resumenDelDia, tarjetaMiPlan,
  type DestinoPlan, type InsumosPlan,
} from '@/src/services/plan/mi-plan-core';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Spacing } from '@/constants/theme';

/**
 * require() estatico: Metro necesita la ruta literal. Un calendario con una pluma, en blanco y negro.
 * 14-oct-2026 (marca): la original (disciplina-semanal.webp) medía 0.079 de saturación
 * media, arriba del 0.05 del manual. Esta es la misma foto en escala de grises (0.0001).
 * La original sigue en su lugar para quien ya la usa (yo-image-picker).
 */
const IMAGEN_PLAN = require('@/assets/images/yo/disciplina-semanal-bn.webp');

/**
 * 14-oct-2026 (marca): el degradado de marca (lima a teal), no el lima plano de
 * fitness: la tarjeta es de todo el plan, no de un pilar.
 */
const DEGRADADO: [string, string] = [DEGRADADO_MARCA[0], DEGRADADO_MARCA[1]];

interface Props {
  userId?: string;
  /** El nivel leido UNA vez en HOY. Se recibe por contrato; la tarjeta sale de las tablas y no ramifica por nivel. */
  nivel?: NivelHoy;
}

export function MiPlanCard({ userId }: Props) {
  const router = useRouter();
  const [insumos, setInsumos] = useState<InsumosPlan | null>(null);
  // La primera lectura tardo mas del tope: se deja de esperar en silencio.
  const [vencido, setVencido] = useState(false);
  const vivo = useRef(true);
  // Solo la ultima lectura escribe: foco, evento y Reintentar pueden cruzarse.
  const turno = useRef(0);
  const tope = useRef<ReturnType<typeof setTimeout> | null>(null);
  // La cuenta vigente, para que una lectura que venia en camino de la cuenta
  // anterior no escriba su linea sobre la nueva.
  const cuenta = useRef(userId);
  cuenta.current = userId;

  const limpiarTope = useCallback(() => {
    if (tope.current) { clearTimeout(tope.current); tope.current = null; }
  }, []);
  // Se re-enciende al montar (StrictMode y Fast Refresh corren el efecto dos veces).
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; limpiarTope(); }; }, [limpiarTope]);

  // Otra cuenta en el mismo telefono no hereda la linea de la anterior. El
  // tope de la lectura anterior tambien se suelta: era de la otra cuenta.
  useEffect(() => { limpiarTope(); setInsumos(null); setVencido(false); }, [userId, limpiarTope]);

  const cargar = useCallback(async (forzar = false) => {
    if (!userId) return;
    const mio = ++turno.current;
    limpiarTope();
    tope.current = setTimeout(() => {
      tope.current = null;
      if (vivo.current) setVencido(true);
    }, TOPE_HERO_ELITE_MS);
    // leerMiPlan nunca rechaza: cada parte llega con su propio desenlace.
    const leido = await leerMiPlan(userId, { partes: PARTES_RESUMEN, forzar });
    if (!vivo.current || mio !== turno.current || cuenta.current !== userId) return;
    limpiarTope();
    setVencido(false);
    setInsumos((prev) => fusionarInsumos(prev ?? {}, leido));
  }, [userId, limpiarTope]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(INTERVENTIONS_CHANGED_EVENT, () => { cargar(); });
    return () => sub.remove();
  }, [cargar]);

  const ir = useCallback((d: DestinoPlan) => {
    // La tarjeta solo abre rutas fijas (Mi plan o donde se arma).
    if (d.tipo === 'ruta') router.push(d.ruta);
  }, [router]);

  const reintentar = useCallback(() => {
    setVencido(false);
    cargar(true);
  }, [cargar]);

  const hoy = getLocalToday();
  // Sin lectura todavia: quieta mientras se espera; pasado el tope, se dice.
  const tarjeta = insumos
    ? tarjetaMiPlan(resumenDelDia(componerDia(insumos, hoy, hoy, { coachElite: NOMBRE_COACH_ELITE })))
    : vencido ? tarjetaMiPlan({ tipo: 'error' }) : null;
  const cta = tarjeta?.cta ?? null;

  return (
    <View style={s.wrap}>
      <EditorialCard
        cardKey="mi_plan"
        icon="protocolos"
        iconName="protocolos"
        title="MI PLAN"
        subtitle={tarjeta?.linea}
        message={tarjeta?.mensaje ?? undefined}
        gradient={DEGRADADO}
        imageBn={IMAGEN_PLAN}
        ctaLabel={cta?.texto}
        quickActions={tarjeta?.reintentar ? [{ label: 'Reintentar', onTap: reintentar }] : undefined}
        // El molde ya da el toque haptico; aqui solo se decide a donde va.
        onTap={() => {
          if (cta) ir(cta.destino);
          // No pudo leer: tocar la tarjeta tambien reintenta.
          else if (tarjeta?.reintentar) reintentar();
          // Todavia cargando: la pantalla hace su propia lectura, no hay que esperar aqui.
          // El literal va aqui (y no la constante del core) para que el censo de
          // rutas vea ESTA tarjeta como la puerta de /mi-plan.
          else router.push('/mi-plan');
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  // Los mismos margenes laterales que traia la tarjeta anterior: HOY la monta
  // suelta, fuera de un contenedor con padding.
  wrap: { marginHorizontal: Spacing.md },
});
