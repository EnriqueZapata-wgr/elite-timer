/**
 * MI PLAN (7-oct-2026, Mi plan): que te toca cada dia de la semana y que
 * tanto se puede reprogramar. Se llega desde la tarjeta MI PLAN de HOY y desde
 * la primera fila de TU PLAN en MI PROGRAMA.
 *
 * POR QUE EXISTE. El dueno pidio un "ver mi plan" de manual, como se entregan
 * las plataformas: ver lo de cada dia y saber que puede mover la persona y que
 * no. Su decision sobre reprogramar (7-oct-2026): lo que es SUYO (horas y
 * dias de sus habitos y entrenamientos) lo mueve; lo que fijo el coach solo
 * se pausa o se platica con el coach; ARGOS propone y la persona acepta.
 *
 * Esta pantalla NO escribe nada. Cada fila dice de quien es y lleva al editor
 * que ya existe: /plan-entrenamiento y Mis rutinas (dias de entrenar), la
 * ficha de la practica o del habito (hora), Mis suplementos (momento, y la
 * pausa de una ficha del plan), /ordenar-dia (la propuesta de ARGOS).
 *
 * De donde sale cada cosa: mi-plan-service lee por partes y mi-plan-core (con
 * test) arma el dia. Sirve a los tres niveles de cuenta con lo que cada una
 * tenga; una seccion sin nada se omite o dice llano que falta y donde se arma.
 *
 * Estados (regla 13):
 *  - cargando: un hueco quieto, sin spinner. Tope de 10 s.
 *  - una seccion que no se pudo leer dice "No se pudo leer" con Reintentar y
 *    relee SOLO sus partes; las demas siguen en pantalla.
 *  - un fallo en una relectura no borra lo que ya se veia (fusionarInsumos).
 *
 * Cuando el dia elegido es HOY se monta la tarjeta de siempre con sus tres
 * acciones y su paloma (QueHacerHoy conserva su logica y su escritura), para
 * que al mudarla de HOY no se pierda nada. Su "Ver todo mi día" es el enlace
 * a la agenda; la pantalla ya no pone otro debajo.
 *
 * 8-oct-2026 (revisión en frío):
 *  - El dia que se mira sigue a HOY (elegida = null) hasta que la persona
 *    toca otro, y "hoy" se vuelve a leer al enfocar y al volver al frente:
 *    antes la pantalla abierta de noche seguia en ayer despues de las 12.
 *  - Sin sesion (enlace profundo sin cuenta) se dice, no se deja un hueco.
 *  - La evaluacion que esta version no entiende se dice sin Reintentar.
 *  - "Cómo se ajusta tu plan" solo explica la etiqueta del coach a quien
 *    tiene algo fijado por un coach en la semana.
 *
 * 8-oct-2026 (nivel 2): las practicas que el coach asigno desde el programa
 * salen como "Lo fijó Enrique" (mi-plan-core). Las palabras que nombran el
 * documento salen de su voz; si la evaluacion no se pudo leer, la voz sale
 * del tipo que ya conoce useProgramaElite, y si tampoco, se habla neutro.
 *
 * Tinta: tokens del tema (claro y oscuro); acento lima en oscuro y teal en
 * claro. Glifos por <AppIcon>; Ionicons solo cromo (chevron, refresh). Cero
 * em dashes en copy.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { QueHacerHoy } from '@/src/components/hoy/QueHacerHoy';
import { EscribirleCoach } from '@/src/components/elite-dx/EscribirleCoach';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { useProgramaElite } from '@/src/hooks/useProgramaElite';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { vozDe } from '@/src/services/elite/voz-programa-core';
import { INTERVENTIONS_CHANGED_EVENT } from '@/src/services/interventions/intervention-service';
import { EVALUACION_ELITE_CHANGED_EVENT } from '@/src/services/hoy/elite-hoy-service';
import { falloEvaluacionEsFatal, TOPE_HERO_ELITE_MS, type NivelHoy } from '@/src/services/hoy/elite-hoy-core';
import { leerMiPlan } from '@/src/services/plan/mi-plan-service';
import {
  alElegirDia, avisoDeEvaluacion, coachDelDia, coachesDeLaSemana, comoSeAjusta, componerDia, contactoCoach,
  diaVisible, fusionarInsumos, lineaSemanaPrograma, PARTES_DE_SECCION, PARTES_TODAS, partesVigentes, resumenDelDia,
  SIN_SESION, tiraSemana,
  tituloDia,
  type CtaPlan, type DestinoPlan, type DiaSemana, type DuenoPlan, type FilaPlan, type InsumosPlan,
  type ParteKey, type SeccionKey, type SeccionPlan,
} from '@/src/services/plan/mi-plan-core';
import { getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { useAppTheme, useSurfaceTokens } from '@/src/contexts/theme-context';

/** Glifo de cada seccion. Solo nombres de app-icon-names. */
const ICONO_SECCION: Record<SeccionKey, AppIconName> = {
  entrenamiento: 'entrenar',
  alimentacion: 'comida',
  suplementos: 'suplementos',
  practicas: 'protocolos',
  sueno: 'sueno',
};

/** El destino del core, en la forma que el router entiende. */
function hrefDe(d: DestinoPlan): Href {
  switch (d.tipo) {
    case 'ruta': return d.ruta;
    case 'evaluacion': return { pathname: '/salud/evaluacion-elite', params: { seccion: d.seccion } };
    case 'habito': return `/centro/${d.appKey}`;
    case 'practica': return `/salud/intervenciones/${d.key}`;
  }
}

function useTinta() {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const borde = dark ? withOpacity(ATP_BRAND.lime, 0.2) : t.bordeEditorial;
  return { t, dark, acento, borde };
}

export function MiPlanScreen() {
  // La pantalla sigue el tema global (<Screen themed>): estos tokens son los
  // mismos que useSurfaceTokens entrega a las piezas de adentro.
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const router = useRouter();
  const { user, loading: sesionCargando } = useAuth();
  const userId = user?.id;
  const sub = useSubscription();
  // El mismo objeto que arma HOY, para que la tarjeta de hoy se comporte igual aqui.
  const nivel: NivelHoy = useMemo(() => ({
    tier: sub.tier,
    cargando: sub.isLoading,
    noSePudoLeer: sub.nivelNoSePudoLeer,
    tieneEvaluacionElite: sub.tieneEvaluacionElite,
    evaluacionEliteNoSePudoLeer: sub.evaluacionEliteNoSePudoLeer,
  }), [sub.tier, sub.isLoading, sub.nivelNoSePudoLeer, sub.tieneEvaluacionElite, sub.evaluacionEliteNoSePudoLeer]);
  // La semana del programa solo existe para quien tiene evaluacion cargada;
  // sin ella (o si no se pudo leer) la cabecera no dice ninguna semana.
  const { programa } = useProgramaElite(userId);
  const semanaPrograma = programa.estado === 'ok' ? lineaSemanaPrograma(programa.avance) : null;
  // 8-oct-2026 (nivel 2): el tipo del documento segun la lectura ligera del
  // inicio. Solo se usa si el documento completo no se pudo leer; null = no se sabe.
  const programaTipo = programa.estado === 'ok' ? programa.tipo : null;
  const programaNombre = programa.estado === 'ok' ? programa.nombre : null;
  const vozConocida = useMemo(
    () => (programaTipo ? vozDe({ tipo: programaTipo, nombre: programaNombre }) : null),
    [programaTipo, programaNombre],
  );

  // 8-oct-2026 (revisión en frío): "hoy" es estado y se vuelve a leer al
  // enfocar y al volver al frente (alDia). El dia elegido arranca en null =
  // "seguir a hoy": antes se guardaba la fecha de hoy al montar y, con la
  // pantalla abierta al cruzar la medianoche, se seguia viendo ayer.
  const [hoy, setHoy] = useState(() => getLocalToday());
  const [elegida, setElegida] = useState<string | null>(null);
  const [insumos, setInsumos] = useState<InsumosPlan | null>(null);
  const [vencido, setVencido] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  // Que se esta releyendo por un Reintentar (una seccion, 'evaluacion' o
  // 'todo'): su boton lo dice en vez de quedarse mudo mientras llega.
  const [releyendo, setReleyendo] = useState<readonly string[]>([]);
  const vivo = useRef(true);
  const tope = useRef<ReturnType<typeof setTimeout> | null>(null);
  // La primera lectura completa ya llego. Antes de eso un evento no relee una
  // sola parte: pintaria un plan de una seccion mientras llega el resto.
  const yaCargo = useRef(false);
  // La cuenta vigente, para que una lectura que venia en camino de la cuenta
  // anterior no escriba su plan sobre la nueva.
  const cuenta = useRef(userId);
  cuenta.current = userId;
  // El turno de cada lectura y cual fue la ultima que pidio cada parte
  // (partesVigentes): una lectura vieja no pinta encima de una mas nueva.
  const turno = useRef(0);
  const ultimoTurno = useRef<Partial<Record<ParteKey, number>>>({});

  const limpiarTope = useCallback(() => {
    if (tope.current) { clearTimeout(tope.current); tope.current = null; }
  }, []);
  // Se re-enciende al montar (StrictMode y Fast Refresh corren el efecto dos veces).
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; limpiarTope(); }; }, [limpiarTope]);
  // Otra cuenta en el mismo telefono no hereda el plan de la anterior.
  useEffect(() => {
    setInsumos(null);
    setVencido(false);
    setElegida(null);
    setReleyendo([]);
    yaCargo.current = false;
    ultimoTurno.current = {};
  }, [userId]);

  /**
   * Lee las partes pedidas (todas si no se dice) y las junta con lo visto.
   * Cada lectura trae SOLO sus partes y fusionarInsumos nunca cambia una buena
   * por una fallida. 8-oct-2026 (segunda revisión en frío): ademas cada
   * lectura toma un turno por parte, y al llegar solo escribe las partes que
   * nadie volvio a pedir despues (una completa lenta ya no pisa la relectura
   * de una seccion que llego antes).
   */
  const cargar = useCallback(async (partes?: readonly ParteKey[], forzar = false) => {
    if (!userId) return;
    if (!partes) {
      limpiarTope();
      tope.current = setTimeout(() => {
        tope.current = null;
        if (vivo.current) setVencido(true);
      }, TOPE_HERO_ELITE_MS);
    }
    const mio = ++turno.current;
    for (const k of partes ?? PARTES_TODAS) ultimoTurno.current[k] = mio;
    // leerMiPlan nunca rechaza: cada parte llega con su propio desenlace.
    const leido = await leerMiPlan(userId, { partes, forzar });
    if (!vivo.current || cuenta.current !== userId) return;
    if (!partes) { limpiarTope(); setVencido(false); yaCargo.current = true; }
    const vigente = partesVigentes(leido, ultimoTurno.current, mio);
    setInsumos((prev) => fusionarInsumos(prev ?? {}, vigente));
  }, [userId, limpiarTope]);

  /** Vuelve a leer la fecha local; si no cambio, no se toca el estado. */
  const alDia = useCallback(() => {
    const ahora = getLocalToday();
    setHoy((prev) => (prev === ahora ? prev : ahora));
  }, []);
  useFocusEffect(useCallback(() => { alDia(); cargar(); }, [alDia, cargar]));
  useEffect(() => {
    // La app vuelve al frente con esta pantalla puesta: el foco no se dispara.
    const subA = AppState.addEventListener('change', (estado) => { if (estado === 'active') alDia(); });
    return () => subA.remove();
  }, [alDia]);
  useEffect(() => {
    // Encender o pausar una practica (aqui mismo, en HOY TE TOCA) cambia la lista.
    const subP = DeviceEventEmitter.addListener(INTERVENTIONS_CHANGED_EVENT, () => {
      if (yaCargo.current) cargar(['practicas']);
    });
    const subE = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, (p?: { userId?: string }) => {
      if (p?.userId && userId && p.userId !== userId) return;
      if (yaCargo.current) cargar(['evaluacion']);
    });
    return () => { subP.remove(); subE.remove(); };
  }, [cargar, userId]);

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargar(undefined, true);
    if (vivo.current) setRefrescando(false);
  }, [cargar]);

  const ir = useCallback((d: DestinoPlan) => { haptic.light(); router.push(hrefDe(d)); }, [router]);
  /** Relee `partes` marcando `marca` como ocupada mientras llega. */
  const reintentar = useCallback(async (marca: string, partes?: readonly ParteKey[]) => {
    haptic.light();
    setReleyendo((prev) => (prev.includes(marca) ? prev : [...prev, marca]));
    await cargar(partes, true);
    if (vivo.current) setReleyendo((prev) => prev.filter((m) => m !== marca));
  }, [cargar]);
  const reintentarTodo = useCallback(() => {
    setVencido(false);
    reintentar('todo');
  }, [reintentar]);

  const tira = useMemo(() => tiraSemana(hoy, insumos?.rutinas), [hoy, insumos?.rutinas]);
  // Sin eleccion se ve hoy; un dia elegido que ya no cae en la semana de hoy
  // (se cruzo el domingo) tambien vuelve a hoy en vez de quedar sin boton.
  const fecha = diaVisible(elegida, hoy);
  const evaluacionEsperada = falloEvaluacionEsFatal(nivel);
  const dia = useMemo(
    () => (insumos
      ? componerDia(insumos, fecha, hoy, { coachElite: NOMBRE_COACH_ELITE, evaluacionEsperada, voz: vozConocida })
      : null),
    [insumos, fecha, hoy, evaluacionEsperada, vozConocida],
  );
  const esHoy = fecha === hoy;
  const diaElegido = tira.find((d) => d.fecha === fecha);
  const resumen = dia ? resumenDelDia(dia, esHoy ? 'Hoy' : diaElegido?.nombre ?? 'Ese día') : null;
  const contacto = dia ? contactoCoach(dia, NOMBRE_COACH_ELITE) : null;
  const avisoEval = dia?.avisoEvaluacion ? avisoDeEvaluacion(dia.avisoEvaluacion, dia.voz) : null;
  // La leyenda explica las etiquetas de la SEMANA: una rutina del coach del
  // lunes tambien cuenta cuando se mira el martes. Vacio = nada fijado por un
  // coach (o todavia sin leer) y su linea no se pinta.
  const coachesSemana = useMemo(
    () => (insumos ? coachesDeLaSemana(insumos, hoy, { coachElite: NOMBRE_COACH_ELITE }) : []),
    [insumos, hoy],
  );
  const fullName: unknown = user?.user_metadata?.full_name;
  const nombre = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null;

  return (
    <Screen themed edges={[]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Mi plan" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={acento} colors={[acento]} />}
      >
        <View style={s.cabecera}>
          {semanaPrograma ? (
            <EliteText style={[s.semanaPrograma, { color: acento }]}>{semanaPrograma.toUpperCase()}</EliteText>
          ) : null}
          <EliteText style={[s.tituloDia, { color: t.texto }]}>{tituloDia(fecha, hoy)}</EliteText>
          {resumen?.tipo === 'linea' ? (
            <EliteText style={[s.resumen, { color: t.textoSecundario }]}>{resumen.texto}</EliteText>
          ) : null}
        </View>

        <View style={s.tira}>
          {tira.map((d) => (
            <DiaBoton
              key={d.fecha}
              dia={d}
              elegido={d.fecha === fecha}
              // Tocar HOY no lo congela: vuelve a "seguir a hoy".
              onPress={() => { haptic.light(); setElegida(alElegirDia(d.fecha, hoy)); }}
            />
          ))}
        </View>

        {/* Sin sesion (enlace profundo sin cuenta) no hay nada que leer: se
            dice. Mientras la sesion carga se espera quieto, sin afirmarlo. */}
        {!userId && !sesionCargando ? (
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
            <EliteText style={[s.cuerpo, { color: t.texto }]}>{SIN_SESION.titulo}</EliteText>
            <EliteText style={[s.cuerpoApoyo, { color: t.textoSecundario }]}>{SIN_SESION.cuerpo}</EliteText>
          </View>
        ) : null}

        {avisoEval ? (
          <Aviso
            texto={avisoEval.texto}
            ocupado={releyendo.includes('evaluacion')}
            // 'formato': releer la misma fila con la misma app da lo mismo. Sin boton.
            onReintentar={avisoEval.reintentar ? () => reintentar('evaluacion', ['evaluacion']) : undefined}
          />
        ) : null}

        {/* Las tres acciones con paloma que vivian en HOY: la misma tarjeta,
            con su logica y su escritura, solo cuando el dia elegido es hoy. Su
            "Ver todo mi día" ya abre la agenda: aqui no se repite el enlace. */}
        {esHoy && userId ? (
          <View>
            <Etiqueta texto="HOY TE TOCA" />
            <QueHacerHoy userId={userId} nivel={nivel} />
          </View>
        ) : null}

        {userId && !dia && !vencido ? <View style={s.hueco} /> : null}
        {!userId && sesionCargando ? <View style={s.hueco} /> : null}
        {userId && !dia && vencido ? (
          <Aviso
            texto="No pudimos leer tu plan. Revisa tu conexión y vuelve a intentar."
            ocupado={releyendo.includes('todo')}
            onReintentar={reintentarTodo}
          />
        ) : null}

        {dia?.secciones.map((sec) => (
          <Seccion
            key={sec.key}
            seccion={sec}
            ocupada={releyendo.includes(sec.key)}
            onIr={ir}
            onReintentar={() => reintentar(sec.key, PARTES_DE_SECCION[sec.key])}
          />
        ))}

        {contacto?.tipo === 'elite' ? <EscribirleCoach nombre={nombre} /> : null}
        {contacto?.tipo === 'otro' ? (
          <EliteText style={[s.contactoTexto, { color: t.textoSecundario }]}>{contacto.texto}</EliteText>
        ) : null}

        <ComoSeAjusta coach={coachDelDia({ coaches: coachesSemana })} hayDeCoach={coachesSemana.length > 0} />
      </ScrollView>
    </Screen>
  );
}

// ─── Piezas ─────────────────────────────────────────────────────────────────

function DiaBoton({ dia, elegido, onPress }: { dia: DiaSemana; elegido: boolean; onPress: () => void }) {
  const { t, acento } = useTinta();
  const partes = [`${dia.nombre} ${dia.numero}`];
  if (dia.esHoy) partes.push('hoy');
  if (dia.entrena) partes.push('con entrenamiento');
  return (
    <AnimatedPressable
      style={[
        s.diaBoton,
        { borderColor: elegido ? acento : t.borde, backgroundColor: elegido ? withOpacity(acento, 0.16) : t.card },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: elegido }}
      accessibilityLabel={partes.join(', ')}
    >
      <EliteText style={[s.diaInicial, { color: dia.esHoy ? acento : t.textoSecundario }]}>{dia.inicial}</EliteText>
      <EliteText style={[s.diaNumero, { color: t.texto }]}>{dia.numero}</EliteText>
      {/* El punto dice "ese dia entrenas" solo cuando se sabe; sin lectura no se pinta ni se niega. */}
      <View style={[s.diaPunto, { backgroundColor: dia.entrena ? acento : 'transparent' }]} />
    </AnimatedPressable>
  );
}

function Etiqueta({ texto }: { texto: string }) {
  const { t } = useTinta();
  return <EliteText style={[s.etiquetaSeccion, { color: t.textoSecundario }]}>{texto}</EliteText>;
}

function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  const { acento } = useTinta();
  return (
    <AnimatedPressable style={s.enlace} onPress={onPress} accessibilityRole="button" accessibilityLabel={texto}>
      <EliteText style={[s.enlaceTexto, { color: acento }]}>{texto}</EliteText>
      <Ionicons name="chevron-forward" size={14} color={acento} />
    </AnimatedPressable>
  );
}

/** Reintentar. Mientras relee lo dice y no acepta otro toque: nunca un boton mudo. */
function BotonReintentar({ ocupado, onPress }: { ocupado: boolean; onPress: () => void }) {
  const { t } = useTinta();
  const texto = ocupado ? 'Leyendo...' : 'Reintentar';
  return (
    <AnimatedPressable
      style={[s.btnQuieto, { borderColor: t.bordeMarcado }, ocupado && s.btnOcupado]}
      onPress={onPress}
      disabled={ocupado}
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: ocupado, busy: ocupado }}
    >
      <Ionicons name="refresh" size={14} color={t.texto} />
      <EliteText style={[s.btnQuietoTexto, { color: t.texto }]}>{texto}</EliteText>
    </AnimatedPressable>
  );
}

/**
 * Un aviso: lo que no se pudo leer y, cuando reintentar puede servir,
 * Reintentar. Sin `onReintentar` no hay boton (8-oct-2026: una evaluacion que
 * esta version no entiende no se arregla volviendo a leer).
 */
function Aviso({ texto, ocupado, onReintentar }: { texto: string; ocupado: boolean; onReintentar?: () => void }) {
  const { t, borde } = useTinta();
  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: borde }]}>
      <EliteText style={[s.cuerpo, { color: t.texto }]}>{texto}</EliteText>
      {onReintentar ? <BotonReintentar ocupado={ocupado} onPress={onReintentar} /> : null}
    </View>
  );
}

/** De quien es. Tres tratamientos y el texto siempre dice cual: el color nunca es lo unico que distingue. */
function ChipDueno({ dueno, texto }: { dueno: DuenoPlan; texto: string }) {
  const { t, acento } = useTinta();
  const estilo = dueno === 'tuyo'
    ? { backgroundColor: withOpacity(acento, 0.14), borderColor: 'transparent' }
    : dueno === 'argos'
      ? { backgroundColor: 'transparent', borderColor: acento }
      : { backgroundColor: t.hundido, borderColor: t.bordeMarcado };
  const color = dueno === 'coach' ? t.texto : acento;
  return (
    <View style={[s.chip, estilo]}>
      <EliteText style={[s.chipTexto, { color }]}>{texto}</EliteText>
    </View>
  );
}

function Fila({ fila, ultima, onIr }: { fila: FilaPlan; ultima: boolean; onIr: (d: DestinoPlan) => void }) {
  const { t, acento } = useTinta();
  const destino = fila.destino;
  const leido = [fila.cuando, fila.titulo, fila.detalle, fila.etiqueta, fila.accion].filter(Boolean).join('. ');
  return (
    <AnimatedPressable
      style={[s.fila, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.borde }]}
      onPress={destino ? () => onIr(destino) : undefined}
      disabled={!destino}
      accessibilityRole="button"
      accessibilityLabel={leido}
    >
      <View style={s.filaTextos}>
        {fila.cuando ? <EliteText style={[s.filaCuando, { color: acento }]}>{fila.cuando}</EliteText> : null}
        <EliteText style={[s.filaTitulo, { color: t.texto }]}>{fila.titulo}</EliteText>
        {fila.detalle ? (
          <EliteText style={[s.filaDetalle, { color: t.textoSecundario }]}>{fila.detalle}</EliteText>
        ) : null}
        <View style={s.filaPie}>
          {fila.dueno && fila.etiqueta ? <ChipDueno dueno={fila.dueno} texto={fila.etiqueta} /> : null}
          {fila.accion ? (
            <EliteText style={[s.filaAccion, { color: t.textoSecundario }]}>{fila.accion}</EliteText>
          ) : null}
        </View>
      </View>
      {destino ? <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} /> : null}
    </AnimatedPressable>
  );
}

function Seccion({ seccion, ocupada, onIr, onReintentar }: {
  seccion: SeccionPlan;
  /** Se esta releyendo por un Reintentar. */
  ocupada: boolean;
  onIr: (d: DestinoPlan) => void;
  onReintentar: () => void;
}) {
  const { t, acento, borde } = useTinta();
  const cabecera = (
    <View style={s.seccionCabecera}>
      <View style={[s.iconWrap, { backgroundColor: withOpacity(acento, 0.14) }]}>
        <AppIcon name={ICONO_SECCION[seccion.key]} size={16} color={acento} />
      </View>
      <EliteText style={[s.seccionTitulo, { color: t.textoSecundario }]}>{seccion.titulo}</EliteText>
    </View>
  );
  if (seccion.estado === 'error') {
    return (
      <View style={s.seccion}>
        {cabecera}
        <View style={[s.lista, s.listaConPadding, { backgroundColor: t.card, borderColor: borde }]}>
          <EliteText style={[s.cuerpo, { color: t.texto }]}>No se pudo leer</EliteText>
          <BotonReintentar ocupado={ocupada} onPress={onReintentar} />
        </View>
      </View>
    );
  }
  const { filas, nota, cta, parcial } = seccion;
  return (
    <View style={s.seccion}>
      {cabecera}
      <View style={[s.lista, { backgroundColor: t.card, borderColor: borde }]}>
        {filas.map((f, i) => (
          <Fila key={f.id} fila={f} ultima={i === filas.length - 1 && !nota && !parcial} onIr={onIr} />
        ))}
        {nota ? <Nota texto={nota} cta={cta} onIr={onIr} /> : null}
        {parcial ? (
          <View style={s.listaConPadding}>
            <EliteText style={[s.cuerpo, { color: t.texto }]}>{parcial}</EliteText>
            <BotonReintentar ocupado={ocupada} onPress={onReintentar} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Lo que falta, dicho llano, con la puerta para armarlo cuando existe. */
function Nota({ texto, cta, onIr }: { texto: string; cta: CtaPlan | null; onIr: (d: DestinoPlan) => void }) {
  const { t } = useTinta();
  return (
    <View style={s.listaConPadding}>
      <EliteText style={[s.cuerpo, { color: t.textoSecundario }]}>{texto}</EliteText>
      {cta ? <Enlace texto={cta.texto} onPress={() => onIr(cta.destino)} /> : null}
    </View>
  );
}

/** Una linea por etiqueta que la cuenta puede ver (la del coach, solo si tiene algo fijado por un coach). */
function ComoSeAjusta({ coach, hayDeCoach }: { coach: string | null; hayDeCoach: boolean }) {
  const { t, borde } = useTinta();
  const lineas = comoSeAjusta(coach, hayDeCoach);
  return (
    <View style={s.seccion}>
      <Etiqueta texto="CÓMO SE AJUSTA TU PLAN" />
      <View style={[s.lista, { backgroundColor: t.card, borderColor: borde }]}>
        {lineas.map((l, i) => (
          <View
            key={l.dueno}
            style={[
              s.ajuste,
              i < lineas.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.borde },
            ]}
          >
            <ChipDueno dueno={l.dueno} texto={l.etiqueta} />
            <EliteText style={[s.ajusteTexto, { color: t.textoSecundario }]}>{l.texto}</EliteText>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: Spacing.sm, paddingBottom: 120 },
  cabecera: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  semanaPrograma: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 2, marginBottom: 2 },
  tituloDia: { fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  resumen: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 18, marginTop: 4 },
  tira: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  diaBoton: {
    flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: Radius.card,
    paddingVertical: 8, minHeight: 56,
  },
  diaInicial: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
  diaNumero: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, marginTop: 1 },
  diaPunto: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
  // Mismo alto aproximado que una seccion: al llegar la lectura no brinca todo.
  hueco: { height: 160, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  card: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 0.5, borderRadius: Radius.md,
    padding: Spacing.md,
  },
  cuerpo: { fontFamily: Fonts.regular, fontSize: FontSizes.md, lineHeight: 20 },
  cuerpoApoyo: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 18, marginTop: 4 },
  etiquetaSeccion: {
    fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 2,
    marginHorizontal: Spacing.md + 2, marginBottom: 8, marginTop: 6,
  },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  enlaceTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  btnQuieto: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderRadius: 12, paddingVertical: 11, marginTop: Spacing.sm,
  },
  btnQuietoTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  btnOcupado: { opacity: 0.6 },
  seccion: { marginBottom: Spacing.sm, marginTop: 6 },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, marginBottom: 8 },
  seccionTitulo: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 2 },
  iconWrap: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  lista: { marginHorizontal: Spacing.md, borderWidth: 0.5, borderRadius: Radius.md, overflow: 'hidden' },
  listaConPadding: { padding: Spacing.md },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  filaTextos: { flex: 1, gap: 2 },
  filaCuando: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 0.5 },
  filaTitulo: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, lineHeight: 20 },
  filaDetalle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 17 },
  filaPie: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  filaAccion: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  chip: { borderWidth: 0.5, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  chipTexto: { fontFamily: Fonts.semiBold, fontSize: 11 },
  contactoTexto: {
    fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 18,
    marginHorizontal: Spacing.md + 2, marginBottom: Spacing.sm,
  },
  ajuste: { paddingVertical: 12, paddingHorizontal: 14, gap: 6, alignItems: 'flex-start' },
  ajusteTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 18 },
});
