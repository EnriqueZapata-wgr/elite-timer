/**
 * MI PROGRAMA (25-sep-2026, APP_ELITE_DX): la evaluacion del cliente como
 * casa del servicio. Antes estaba a tres toques (Salud, un concepto entre 17,
 * un gate) y el plan de alimentacion y de entrenamiento no tenian puerta.
 * Aqui va todo en orden llano: en que semana va, el resumen de su
 * evaluacion, su plan, las secciones de su evaluacion, lo que va con su
 * medico y sus estudios.
 *
 * De donde sale cada cosa (sin lecturas nuevas):
 *  - La semana: <ProgramaHeader> (useProgramaElite).
 *  - La evaluacion: leerEvaluacionEliteVigente, la lectura compartida de HOY
 *    (cache de 60 s y verificacion ligera de version). No se abre otra.
 *  - Que filas se pintan y con que numeros: mi-programa-core (con test). Las
 *    secciones sin contenido en SU documento no salen como filas huecas.
 *
 * Estados (regla 13):
 *  - cargando: un hueco quieto del alto de la tarjeta, sin spinner.
 *  - error: "No pudimos leer tu evaluacion" + Reintentar. Nunca "no tienes
 *    evaluacion": quien lo lee acaba de pagar. Tope de 10 s como el hero.
 *  - sin evaluacion: "Tu evaluacion esta en preparacion con Enrique", sin
 *    nada que parezca falla. Tus estudios siguen abajo.
 *  - ok: todo.
 * Relee al volver a la pestana, con EVALUACION_ELITE_CHANGED_EVENT y al
 * jalar hacia abajo (forzado).
 *
 * 25-sep-2026 (revision en frio):
 *  - Una sola voz: el ProgramaHeader va con `soloAvance` (solo la semana) y
 *    esta tarjeta es la unica que dice "en preparacion" o "no se pudo leer".
 *    `recarga` sube con el pull-to-refresh y con Reintentar para que la
 *    semana se relea junto con la evaluacion.
 *  - "En preparacion con Enrique" solo a quien la contrato (useSubscription,
 *    misma regla que la pantalla de la evaluacion; caraSinEvaluacion).
 *  - Evolucion salio (su ruta caia en el hub viejo de SALUD) y entra
 *    "Tu expediente" con pantallas reales. Ninguna ruta de aqui es un
 *    <Redirect> a /salud (RUTAS_MI_PROGRAMA, con test).
 *  - 26-sep-2026 ("todo lo de ATP mas su programa"): Tu expediente suma Mi
 *    mapa funcional, Padecimientos y Linea de tiempo (FILAS_EXPEDIENTE).
 *  - 7-oct-2026 (Mi plan): TU PLAN abre con "Ver mi plan de la semana"
 *    (/mi-plan): el mismo plan, por dia y con lo que el cliente puede mover.
 *  - 8-oct-2026 (nivel 2): el documento puede ser un programa. Ceja, titulos
 *    de bloque, "lista", la etiqueta del resumen y la fila del documento
 *    completo salen de su voz (mi-programa-core); nunca dice "Elite" y los
 *    bloques sin contenido no salen. La ceja va neutra ("ATP") mientras no
 *    hay documento leido. Con un documento Elite, todo como antes.
 *
 * 14-oct-2026 (marca): useTintaMarca. Bordes neutros, íconos teal sobre
 * t.hundido, cejas grises. El resumen de la evaluacion es un HEROE (foto B/N
 * + degradado de marca + velo, FondoEditorial) y su cifra de Edad ATP es el
 * unico lima de la pantalla junto con la barra del programa.
 *
 * Tinta: tokens del scope. El <TabScreen themed> abre el <ThemeReady>, por
 * eso el contenido vive en un componente hijo (useSurfaceTokens arriba de el
 * devolveria el oscuro de siempre). Glifos por <AppIcon>; Ionicons solo
 * cromo (chevron, refresh). Cero em dashes en copy.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DeviceEventEmitter, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { ProgramaHeader } from '@/src/components/elite-dx/ProgramaHeader';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import type { EliteV3 } from '@/src/services/elite/elite-v3-core';
import type { SeccionUiKey } from '@/src/services/elite/evaluacion-elite-core';
import {
  bloquesMiPrograma, caraSinEvaluacion, cejaMiPrograma, documentoListo, estadoAlVencer, textosNoSePudoLeer,
  type TextosNoSePudoLeer,
  estudiosVisibles, etiquetaDocumentoConCoach, FILA_PLAN_SEMANA, FILAS_EXPEDIENTE, filaDocumentoCompleto,
  resumenEvaluacion, RUTAS_MI_PROGRAMA, siguienteEstado,
  type CaraSinEvaluacion, type EstadoMiPrograma, type EstudioKey, type ExpedienteKey, type LecturaParaPrograma,
  type MotivoFallo,
} from '@/src/services/elite/mi-programa-core';
import { lineaPidenAccion, TOPE_HERO_ELITE_MS } from '@/src/services/hoy/elite-hoy-core';
import { edadIntegralTexto, textoDeltaEdad } from '@/src/services/hoy/hero-laboratorios-core';
import { EVALUACION_ELITE_CHANGED_EVENT, leerEvaluacionEliteVigente } from '@/src/services/hoy/elite-hoy-service';
import { vozDeDocumento, vozParaTextos, VOZ_ELITE, type VozPrograma } from '@/src/services/elite/voz-programa-core';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, SECTION_TITLE, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { FondoEditorial } from '@/src/components/marca/FondoEditorial';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';

const RUTA_EVALUACION = RUTAS_MI_PROGRAMA.evaluacion;

/** Glifo de cada seccion. Solo nombres de app-icon-names (la ruta no se valida por string). */
const ICONO_SECCION: Record<SeccionUiKey, AppIconName> = {
  inicio: 'evaluaciones',
  conteo: 'reportes', // sin fila propia (la cubre el resumen); se deja por el Record completo
  edades: 'edad-atp',
  sistemas: 'diagnostico',
  contexto: 'historia-clinica',
  marcadores: 'labs',
  composicion: 'medidas',
  braverman: 'emociones',
  genetica: 'genetica',
  // 25-sep-2026 (revision en frio): 'salud-datos' ahora es "Tus datos".
  cruces: 'reportes',
  medico: 'salud-expediente',
  cierre: 'protocolos',
  alimentacion: 'comida',
  suplementos: 'suplementos',
  entrenamiento: 'entrenar',
};

/**
 * Suplementos abre la pantalla del plan ("TU PLAN DE ENRIQUE", con sus tomas
 * de hoy), no la seccion del documento: es donde el cliente lo usa. Todo lo
 * demas cae en su seccion de la evaluacion (la pantalla lee `?seccion=`).
 */
function hrefDeSeccion(seccion: SeccionUiKey): Href {
  if (seccion === 'suplementos') return RUTAS_MI_PROGRAMA.suplementos;
  return { pathname: RUTA_EVALUACION, params: { seccion } };
}

interface Estudio {
  key: EstudioKey;
  titulo: string;
  icon: AppIconName;
  href: Href;
}

const ESTUDIOS: Record<EstudioKey, Estudio> = {
  labs: { key: 'labs', titulo: 'Laboratorios', icon: 'labs', href: RUTAS_MI_PROGRAMA.labs },
  genetica: { key: 'genetica', titulo: 'Genética', icon: 'genetica', href: RUTAS_MI_PROGRAMA.genetica },
};

/**
 * Glifos del expediente, los mismos que usa el hub de SALUD (padecimientos =
 * curita, para la ficha). 26-sep-2026: mapa, padecimientos y linea de tiempo
 * llevan el glifo de su puerta en SALUD (salud-puertas: 'diagnostico',
 * 'padecimientos', 'salud-expediente'). La curita queda en dos filas, la
 * ficha y Padecimientos: es el glifo del registro para las dos.
 */
const ICONO_EXPEDIENTE: Record<ExpedienteKey, AppIconName> = {
  mapa: 'diagnostico',
  historia: 'historia-clinica',
  sintomas: 'sintomas',
  padecimientos: 'padecimientos',
  datos: 'salud-datos',
  linea: 'salud-expediente',
  ficha: 'padecimientos',
};

function detalleEstudio(key: EstudioKey, e: EliteV3 | null): string {
  switch (key) {
    case 'labs': return 'Tus estudios de laboratorio';
    case 'genetica': {
      const n = e?.genetica.hallazgos.length ?? 0;
      return `${n} ${n === 1 ? 'hallazgo' : 'hallazgos'} en tu evaluación`;
    }
  }
}

export function MiProgramaScreen() {
  // La barra de estado lee el tema GLOBAL (como el tab Salud): aqui arriba
  // todavia no hay <ThemeReady>.
  const tg = useAppTheme().tokens;
  return (
    <TabScreen themed>
      <StatusBar style={tg.kind === 'light' ? 'dark' : 'light'} />
      <Contenido />
    </TabScreen>
  );
}

/**
 * 8-oct-2026 (nivel 2, revision en frio): el encabezado vive aqui, junto al
 * documento y al nivel que deciden su ceja (cejaMiPrograma). Antes la ceja
 * subia por un efecto y el primer cuadro salia sin ella. Mismos tokens
 * globales que antes (useAppTheme), misma posicion.
 */
function Encabezado({ ceja }: { ceja: string }) {
  const tg = useAppTheme().tokens;
  // 14-oct-2026 (marca): la ceja es gris; el lima es del dato heroico.
  return (
    <View style={s.header}>
      <EliteText style={[s.eyebrow, { color: tg.textoSecundario }]} numberOfLines={1}>{ceja}</EliteText>
      <EliteText style={[s.title, { color: tg.texto }]}>MI PROGRAMA</EliteText>
    </View>
  );
}

function Contenido() {
  const { teal } = useTintaMarca();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const {
    esElite, tieneEvaluacionElite, nivelNoSePudoLeer, isLoading: nivelCargando, refresh: refrescarNivel, tier,
  } = useSubscription();

  const [estado, setEstado] = useState<EstadoMiPrograma>({ estado: 'cargando' });
  const [refrescando, setRefrescando] = useState(false);
  // Sube con pull-to-refresh y Reintentar: el ProgramaHeader se relee.
  const [recarga, setRecarga] = useState(0);
  const vivo = useRef(true);
  // Solo la ultima lectura escribe: foco, evento y Reintentar pueden cruzarse.
  const turno = useRef(0);
  const tope = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpiarTope = useCallback(() => {
    if (tope.current) { clearTimeout(tope.current); tope.current = null; }
  }, []);
  // Se re-enciende al montar (StrictMode/Fast Refresh corren el efecto dos veces).
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; limpiarTope(); }; }, [limpiarTope]);

  const cargar = useCallback(async (forzar = false) => {
    if (!userId) return;
    const mio = ++turno.current;
    // Mismo tope que el hero de HOY: una lectura colgada no deja la sala en
    // blanco para siempre; solo cae a error lo que seguia cargando.
    limpiarTope();
    tope.current = setTimeout(() => {
      tope.current = null;
      if (vivo.current) setEstado((prev) => estadoAlVencer(prev));
    }, TOPE_HERO_ELITE_MS);
    let r: LecturaParaPrograma;
    try {
      r = await leerEvaluacionEliteVigente(userId, { forzar });
    } catch {
      // El servicio es fail-soft; esto es solo por si algo lanza de todos modos.
      r = { ok: false, motivo: 'lectura' };
    }
    if (!vivo.current || mio !== turno.current) return;
    limpiarTope();
    setEstado((prev) => siguienteEstado(prev, r));
  }, [userId, limpiarTope]);

  const reintentar = useCallback(() => {
    haptic.light();
    setEstado((prev) => (prev.estado === 'error' ? { estado: 'cargando' } : prev));
    setRecarga((n) => n + 1);
    cargar(true);
  }, [cargar]);

  /** "No se pudo leer tu cuenta": se reintentan las dos lecturas, como en la evaluacion. */
  const reintentarCuenta = useCallback(() => {
    refrescarNivel();
    reintentar();
  }, [refrescarNivel, reintentar]);

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    setRecarga((n) => n + 1);
    // Forzado: salta la cache de 60 s.
    await cargar(true);
    if (vivo.current) setRefrescando(false);
  }, [cargar]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, (p?: { userId?: string }) => {
      if (p?.userId && userId && p.userId !== userId) return;
      cargar();
    });
    return () => sub.remove();
  }, [cargar, userId]);

  const ir = useCallback((href: Href) => { haptic.light(); router.push(href); }, [router]);
  const evaluacion = estado.estado === 'ok' ? estado.evaluacion : null;
  const voz = vozDeDocumento(evaluacion);
  const filaCompleta = filaDocumentoCompleto(voz);
  const ceja = cejaMiPrograma(estado, tier);
  // Sin documento leido (error, en preparacion): las palabras las da el nivel.
  const textosFallo = textosNoSePudoLeer(vozParaTextos({ documento: null, tier }));

  return (
    <>
    <Encabezado ceja={ceja} />
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={teal} colors={[teal]} />}
    >
      <ProgramaHeader userId={userId} soloAvance recarga={recarga} />

      {estado.estado === 'cargando' && <View style={s.hueco} />}
      {estado.estado === 'error' && <NoSePudoLeer motivo={estado.motivo} textos={textosFallo} onReintentar={reintentar} />}
      {estado.estado === 'sin_evaluacion' && (
        <SinEvaluacion
          cara={caraSinEvaluacion({ esElite, tieneEvaluacionElite, nivelNoSePudoLeer, nivelCargando })}
          onActualizar={reintentar}
          onReintentarCuenta={reintentarCuenta}
        />
      )}
      {evaluacion && (
        <>
          <Resumen e={evaluacion} voz={voz} ir={ir} />
          {bloquesMiPrograma(evaluacion).map((b, i) => (
            <Grupo key={b.key} titulo={b.titulo} delay={140 + i * 40}>
              {/* 7-oct-2026 (Mi plan): TU PLAN abre con la semana por dia
                  (/mi-plan). Las filas de abajo siguen siendo el plan por
                  tema. Nunca es la ultima: debajo van las tres de siempre. */}
              {b.key === 'plan' ? (
                <Fila
                  icon="protocolos"
                  titulo={FILA_PLAN_SEMANA.titulo}
                  detalle={FILA_PLAN_SEMANA.detalle}
                  ultima={b.filas.length === 0}
                  // El literal (y no FILA_PLAN_SEMANA.ruta) para que el censo de
                  // rutas vea esta fila como puerta; el test de mi-programa-core
                  // clava que los dos dicen lo mismo.
                  onPress={() => { haptic.light(); router.push('/mi-plan'); }}
                />
              ) : null}
              {b.filas.map((f, j) => (
                <Fila
                  key={f.seccion}
                  icon={ICONO_SECCION[f.seccion]}
                  titulo={f.titulo}
                  detalle={f.detalle}
                  ultima={j === b.filas.length - 1}
                  onPress={() => ir(hrefDeSeccion(f.seccion))}
                />
              ))}
            </Grupo>
          ))}
          <Grupo delay={260}>
            <Fila
              icon="evaluaciones"
              titulo={filaCompleta.titulo}
              detalle={filaCompleta.detalle}
              ultima
              onPress={() => ir(RUTA_EVALUACION)}
            />
          </Grupo>
        </>
      )}

      {/* Los estudios son del cliente, haya o no evaluacion: tambien van en
          cargando, error y sin evaluacion (Genetica solo con hallazgos). */}
      <Grupo titulo="TUS ESTUDIOS" delay={300}>
        {estudiosVisibles(evaluacion).map((k, j, arr) => (
          <Fila
            key={k}
            icon={ESTUDIOS[k].icon}
            titulo={ESTUDIOS[k].titulo}
            detalle={detalleEstudio(k, evaluacion)}
            ultima={j === arr.length - 1}
            onPress={() => ir(ESTUDIOS[k].href)}
          />
        ))}
      </Grupo>

      {/* 25-sep-2026 (revision en frio): el expediente es del cliente, haya o
          no evaluacion; antes solo se llegaba desde el hub de SALUD. */}
      <Grupo titulo="TU EXPEDIENTE" delay={340}>
        {FILAS_EXPEDIENTE.map((f, j) => (
          <Fila
            key={f.key}
            icon={ICONO_EXPEDIENTE[f.key]}
            titulo={f.titulo}
            detalle={f.detalle}
            ultima={j === FILAS_EXPEDIENTE.length - 1}
            onPress={() => ir(f.ruta)}
          />
        ))}
      </Grupo>
    </ScrollView>
    </>
  );
}

// ─── Piezas ─────────────────────────────────────────────────────────────────

/** Ceja de las tarjetas planas: ícono teal sobre hundido y texto gris. */
function Cabecera({ texto }: { texto: string }) {
  const { t, teal } = useTintaMarca();
  return (
    <View style={s.cabecera}>
      <View style={[s.iconWrap, { backgroundColor: t.hundido }]}>
        <AppIcon name="evaluaciones" size={18} color={teal} />
      </View>
      <EliteText style={[s.eyebrowCard, { color: t.textoSecundario }]}>{texto}</EliteText>
    </View>
  );
}

/**
 * "TU EVALUACIÓN CON ENRIQUE". 8-oct-2026 (nivel 2): es la de la voz Elite;
 * la tarjeta del documento leido usa la de SU voz (etiquetaDocumentoConCoach),
 * que en Elite es esta misma.
 */
const ETIQUETA_EVALUACION = etiquetaDocumentoConCoach(VOZ_ELITE);

/**
 * Foto del heroe: blanco y negro, sin persona, del banco que ya usa PerfilHero
 * (hoy-extra/tu-dia/noche-02, saturacion media 0.000 medida con PIL).
 */
const FOTO_HERO_PROGRAMA = require('@/assets/images/hoy-extra/tu-dia/noche-02.webp');
/** Letra del heroe: blanca sobre la foto oscura en los dos temas. */
const BLANCO = ATP_BRAND.white;
const BLANCO_SUAVE = withOpacity(ATP_BRAND.white, 0.72);
const VIDRIO = withOpacity(ATP_BRAND.white, 0.12);

/**
 * Edad ATP contra la real, cuantos piden accion y la version. Solo lo que trae el documento.
 * 14-oct-2026 (marca): es el heroe de la pantalla (FondoEditorial). La cifra de
 * Edad ATP es el dato heroico: lima en los dos temas, porque la superficie del
 * heroe siempre es oscura (la regla "en claro el lima nunca es letra" es sobre
 * fondo claro). Igual que la Edad ATP del Perfil v4. La edad
 * real y el delta van en blanco: el delta ya dice en palabras si es mejor o peor.
 */
function Resumen({ e, voz, ir }: { e: EliteV3; voz: VozPrograma; ir: (h: Href) => void }) {
  const { dark, borde } = useTintaMarca();
  const r = resumenEvaluacion(e);
  const destinoPiden = r.destinoPiden;
  // El héroe es oscuro en los dos temas: la cifra va en lima siempre, igual
  // que la Edad ATP del Perfil v4 (una sola regla para el dato heroico).
  const cifra = ATP_BRAND.lime;

  return (
    <Animated.View
      entering={FadeInUp.delay(100).springify()}
      style={[s.hero, !dark && { borderWidth: 1, borderColor: borde }]}
    >
      <FondoEditorial imagen={FOTO_HERO_PROGRAMA} />
      <View style={s.heroCuerpo}>
        <EliteText style={s.heroCeja}>{etiquetaDocumentoConCoach(voz)}</EliteText>

        {r.edad ? (
          <AnimatedPressable
            style={s.edadRow}
            onPress={() => ir(hrefDeSeccion(r.destinoEdad))}
            accessibilityRole="button"
            accessibilityLabel={`Edad ATP ${edadIntegralTexto(r.edad)}, edad real ${r.edad.cronologica}. ${textoDeltaEdad(r.edad)}`}
          >
            <View>
              <EliteText style={[s.edadGrande, { color: cifra }]}>{edadIntegralTexto(r.edad)}</EliteText>
              <EliteText style={s.edadEtiqueta}>EDAD ATP</EliteText>
            </View>
            <View>
              <EliteText style={s.edadReal}>{r.edad.cronologica}</EliteText>
              <EliteText style={s.edadEtiqueta}>EDAD REAL</EliteText>
            </View>
            <EliteText style={s.delta}>{textoDeltaEdad(r.edad)}</EliteText>
            <Ionicons name="chevron-forward" size={16} color={BLANCO_SUAVE} />
          </AnimatedPressable>
        ) : (
          <EliteText style={s.heroTitulo}>{documentoListo(voz)}</EliteText>
        )}

        {r.piden !== null && destinoPiden !== null && (
          <AnimatedPressable
            style={[s.pidenRow, { backgroundColor: VIDRIO }]}
            onPress={() => ir(hrefDeSeccion(destinoPiden))}
            accessibilityRole="button"
            accessibilityLabel={lineaPidenAccion(r.piden)}
          >
            <EliteText style={s.pidenTexto}>{lineaPidenAccion(r.piden)}</EliteText>
            <Ionicons name="chevron-forward" size={14} color={BLANCO_SUAVE} />
          </AnimatedPressable>
        )}

        <EliteText style={s.pie}>{r.version}</EliteText>
      </View>
    </Animated.View>
  );
}

function Grupo({ titulo, delay, children }: { titulo?: string; delay: number; children: ReactNode }) {
  const { t, borde } = useTintaMarca();
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={s.grupo}>
      {titulo ? <EliteText style={[s.label, { color: t.textoSecundario }]}>{titulo}</EliteText> : null}
      <View style={[s.lista, { backgroundColor: t.card, borderColor: borde }]}>{children}</View>
    </Animated.View>
  );
}

function Fila({ icon, titulo, detalle, ultima, onPress }: {
  icon: AppIconName;
  titulo: string;
  detalle: string | null;
  ultima: boolean;
  onPress: () => void;
}) {
  const { t, teal } = useTintaMarca();
  return (
    <AnimatedPressable
      style={[s.fila, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.borde }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${titulo}: ${detalle}` : titulo}
    >
      <View style={[s.iconWrap, { backgroundColor: t.hundido }]}>
        <AppIcon name={icon} size={18} color={teal} />
      </View>
      <View style={s.filaTextos}>
        <EliteText style={[s.filaTitulo, { color: t.texto }]} numberOfLines={1}>{titulo}</EliteText>
        {detalle ? (
          <EliteText style={[s.filaDetalle, { color: t.textoSecundario }]} numberOfLines={1}>{detalle}</EliteText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
    </AnimatedPressable>
  );
}

/**
 * No se pudo leer. `formato`: la fila existe y esta version de la app no la
 * entiende (pedir actualizar, no revisar la conexion). `tope`: nada fallo
 * todavia, tardo demasiado. No se afirma que "sigue guardada": en esta sala
 * tambien entra quien aun no la tiene y la lectura no llego a saberlo.
 */
function NoSePudoLeer({ motivo, textos, onReintentar }: { motivo: MotivoFallo; textos: TextosNoSePudoLeer; onReintentar: () => void }) {
  const { t, borde } = useTintaMarca();
  // 8-oct-2026 (nivel 2): "tu evaluación" o "tu programa" segun el nivel (textosNoSePudoLeer).
  const cuerpo = motivo === 'formato'
    ? textos.formato
    : motivo === 'tope'
      ? 'La lectura tardó más de lo normal. Revisa tu conexión y vuelve a intentar.'
      : 'Revisa tu conexión y vuelve a intentar.';
  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: borde }]}>
      <Cabecera texto={textos.etiqueta} />
      <EliteText style={[s.tituloCard, { color: t.texto }]}>{textos.titulo}</EliteText>
      <EliteText style={[s.cuerpo, { color: t.textoSecundario }]}>{cuerpo}</EliteText>
      <BotonQuieto texto="Reintentar" onPress={onReintentar} />
    </View>
  );
}

/**
 * La lectura funciono y no hay evaluacion. No es falla ni candado.
 * 25-sep-2026 (revision en frio): la cara la decide caraSinEvaluacion
 * (misma regla que la pantalla de la evaluacion). Solo a quien la contrato
 * se le promete que Enrique la prepara; sin nivel legible se dice que no se
 * pudo leer la cuenta; a los demas, una linea neutra sin promesa ni venta.
 */
function SinEvaluacion({ cara, onActualizar, onReintentarCuenta }: {
  cara: CaraSinEvaluacion;
  onActualizar: () => void;
  onReintentarCuenta: () => void;
}) {
  const { t, borde } = useTintaMarca();
  if (cara === 'cargando') return <View style={s.hueco} />;
  const tarjeta = [s.card, { backgroundColor: t.card, borderColor: borde }];
  if (cara === 'cuenta_no_leida') {
    return (
      <View style={tarjeta}>
        <Cabecera texto="TU EVALUACIÓN" />
        <EliteText style={[s.tituloCard, { color: t.texto }]}>No pudimos leer tu cuenta</EliteText>
        <EliteText style={[s.cuerpo, { color: t.textoSecundario }]}>Revisa tu conexión. Nada se perdió.</EliteText>
        <BotonQuieto texto="Reintentar" onPress={onReintentarCuenta} />
      </View>
    );
  }
  if (cara === 'neutral') {
    return (
      <Animated.View entering={FadeInUp.delay(100).springify()} style={tarjeta}>
        <Cabecera texto="TU EVALUACIÓN" />
        <EliteText style={[s.cuerpo, { color: t.textoSecundario }]}>Aún no tienes una evaluación cargada.</EliteText>
        {/* Tambien relee el nivel: quien acaba de canjear su codigo pasa a "en preparacion". */}
        <BotonQuieto texto="Actualizar" onPress={onReintentarCuenta} />
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={FadeInUp.delay(100).springify()} style={tarjeta}>
      <Cabecera texto={ETIQUETA_EVALUACION} />
      <EliteText style={[s.tituloCard, { color: t.texto }]}>
        {`Tu evaluación está en preparación con ${NOMBRE_COACH_ELITE}`}
      </EliteText>
      <EliteText style={[s.cuerpo, { color: t.textoSecundario }]}>
        Cuando la cargue, aquí vas a ver tu plan, tu evaluación y lo que va con tu médico. No necesitas subir nada.
      </EliteText>
      <BotonQuieto texto="Actualizar" onPress={onActualizar} />
    </Animated.View>
  );
}

function BotonQuieto({ texto, onPress }: { texto: string; onPress: () => void }) {
  const { t } = useTintaMarca();
  return (
    <AnimatedPressable
      style={[s.btnQuieto, { borderColor: t.bordeMarcado }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texto}
    >
      <Ionicons name="refresh" size={14} color={t.texto} />
      <EliteText style={[s.btnQuietoTexto, { color: t.texto }]}>{texto}</EliteText>
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  // 14-oct-2026 (marca): ceja de seccion (11 / 600 / 2) y titulo hero Bold sin
  // espaciado de logo (letterSpacing 3 es solo del logo).
  eyebrow: { fontSize: SECTION_TITLE.fontSize, fontFamily: Fonts.semiBold, letterSpacing: SECTION_TITLE.letterSpacing },
  title: { fontSize: FontSizes.hero, fontFamily: Fonts.bold, marginTop: Spacing.xs },
  scroll: { paddingTop: Spacing.sm, paddingBottom: 120 },
  // Mismo alto aproximado que el resumen: al llegar la lectura no brinca todo.
  hueco: { height: 150, marginHorizontal: Spacing.md, marginBottom: Spacing.lg },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 0.5,
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  eyebrowCard: { fontFamily: Fonts.semiBold, fontSize: SECTION_TITLE.fontSize, letterSpacing: SECTION_TITLE.letterSpacing },
  tituloCard: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  cuerpo: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20, marginTop: Spacing.xs },
  // El heroe: FondoEditorial va adentro; aqui solo la caja y el radio.
  hero: { marginHorizontal: Spacing.md, marginBottom: Spacing.lg, borderRadius: Radius.card, overflow: 'hidden' },
  heroCuerpo: { padding: Spacing.lg, paddingTop: Spacing.xl },
  heroCeja: { fontFamily: Fonts.semiBold, fontSize: SECTION_TITLE.fontSize, letterSpacing: SECTION_TITLE.letterSpacing, color: ATP_BRAND.white },
  heroTitulo: { fontFamily: Fonts.bold, fontSize: FontSizes.xxl, color: BLANCO, marginTop: Spacing.sm },
  edadRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  edadGrande: { fontFamily: Fonts.extraBold, fontSize: FontSizes.mega, lineHeight: 46 },
  edadReal: { fontFamily: Fonts.bold, fontSize: FontSizes.hero, lineHeight: 46, color: BLANCO },
  edadEtiqueta: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, letterSpacing: SECTION_TITLE.letterSpacing, color: BLANCO_SUAVE },
  delta: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: BLANCO },
  pidenRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, marginTop: Spacing.md,
  },
  pidenTexto: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, lineHeight: 18, color: BLANCO },
  pie: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: Spacing.sm, color: BLANCO_SUAVE },
  grupo: { marginHorizontal: Spacing.md, marginBottom: Spacing.lg },
  label: {
    fontFamily: Fonts.semiBold, fontSize: SECTION_TITLE.fontSize, letterSpacing: SECTION_TITLE.letterSpacing,
    marginBottom: Spacing.sm, marginLeft: Spacing.xs,
  },
  lista: { borderWidth: 0.5, borderRadius: Radius.card, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  filaTextos: { flex: 1, gap: 1 },
  filaTitulo: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  filaDetalle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  btnQuieto: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderRadius: Radius.card, paddingVertical: 12, marginTop: Spacing.sm,
  },
  btnQuietoTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
