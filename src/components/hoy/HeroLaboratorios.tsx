/**
 * HeroLaboratorios (ATP 3.0, 6-sep-2026, ruta 2.1): lo primero que se ve en
 * HOY bajo el saludo. Una sola dirección para quien llega (subir su estudio)
 * y, para quien ya lo subió, su Edad ATP, su edad real, el delta sin juicio
 * y los tres marcadores de mayor impacto con semáforo.
 *
 * Cuatro estados (regla 13): cargando, "no se pudo leer" con reintentar,
 * sin estudio, con estudio. La decisión vive en hero-laboratorios-core.ts.
 *
 * Tinta: tokens del scope (useTintaMarca: HOY monta <ThemeReady>). 14-oct-2026
 * (marca): las tarjetas planas van con borde neutro, ceja gris e ícono teal
 * sobre t.hundido; el lima se queda en el CTA de la tarjeta editorial.
 * Glifos de función por <AppIcon>; Ionicons solo cromo (refresh). (Hasta el
 * 7-oct-2026 aquí se pintaba un semáforo por marcador; ver la nota de abajo.)
 *
 * 20-sep-2026 (cliente Elite): este hero ahora sabe que existe la evaluacion
 * Elite. Si hay `elite_v3` vigente pinta HeroEvaluacionElite (la Edad ATP y
 * los marcadores que Enrique puso); si el cliente es Elite y no hay
 * evaluacion, dice que viene en camino sin pedirle que suba nada; si no es
 * Elite, todo lo de abajo sigue igual que siempre. La decision es pura
 * (decidirHeroElite, elite-hoy-core). El nivel llega por props desde HOY
 * (una sola lectura para toda la pantalla) y la evaluacion por la lectura
 * compartida de elite-hoy-service.
 *
 * 7-oct-2026 (Hoy editorial): palabras del dueño al abrir su pantalla
 * principal: "lo primero que sale es mi Edad ATP, muy bien, pero salen mis
 * laboratorios en rojo, los puntos rojos. No es necesario poner ese dato en
 * una primera instancia. Vamos a dejarlo como un resumen con una imagen
 * editorial bonita y ya si te quieres meter a ver los valores, te metes."
 * Los tres estados felices (con estudio, con evaluación Elite, sin estudio)
 * son ahora UNA tarjeta editorial (HoyResumenCard: imagen, una línea, un
 * CTA). Salen de aquí las filas de marcadores, los puntos de color y las
 * etiquetas del semáforo ("Pide atención"). Los valores no se perdieron: el
 * CTA lleva a /edad-atp, que tiene a un toque ATP Labs (/edad-atp/labs, los
 * laboratorios con su estado), Comparar estudios y el detalle del resultado.
 * top3Marcadores y ETIQUETA_ESTADO_HERO se quedan en hero-laboratorios-core
 * con sus tests (no se borra nada), aunque desde hoy ninguna pantalla los
 * monta.
 * "Comparar con mi estudio anterior" se queda como renglón callado bajo la
 * tarjeta, con su candado de venta de siempre. Los estados que NO son felices
 * (leyendo, "No pudimos leer tus laboratorios" con Reintentar, las caras
 * Elite de espera y de fallo) siguen siendo las tarjetas planas de antes: un
 * fallo de lectura no se viste de tarjeta bonita. Qué estado toca y qué dice
 * la tarjeta lo decide hoy-resumen-core (decidirVistaHoyAtp, con test).
 * El retrato de él o de ella solo se usa con el sexo del perfil conocido; sin
 * él, la imagen neutra (nunca se asume).
 *
 * 8-oct-2026 (revisión en frío): lo leído (datos, sexo, evaluación, fallo,
 * cargando, tope) ya no son useState sueltos. Sobrevivían a un cambio de
 * `userId` sin desmontar (cambio de cuenta) y la lectura del sexo escribía
 * sin mirar de quién era: la cuenta B podía ver el retrato o el número de la
 * A. Ahora todo vive en un solo estado con su dueña (LecturasHoyAtp, en
 * hoy-resumen-core, con test): si la cuenta cambia se empieza de cero ANTES
 * de pintar, y una lectura que llega tarde, de otra cuenta, se descarta.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { HoyResumenCard } from '@/src/components/hoy/HoyResumenCard';
import { SUBSCRIPTION_CHANGED_EVENT } from '@/src/hooks/useSubscription';
import { candadoDeVentaCierra } from '@/src/services/subscription/limites-free-core';
import { warn as logWarn } from '@/src/lib/logger';
import { cargarHeroLaboratorios, leerSexoYLabs } from '@/src/services/hoy/hero-laboratorios-service';
import { decidirEstadoHero } from '@/src/services/hoy/hero-laboratorios-core';
import {
  decidirVistaHoyAtp, escribirLectura, lecturasDe, lecturasIniciales, type CambioLecturas, type LecturasHoyAtp,
} from '@/src/services/hoy/hoy-resumen-core';
import { decidirHeroElite, TOPE_HERO_ELITE_MS, type NivelHoy } from '@/src/services/hoy/elite-hoy-core';
import { leerEvaluacionEliteVigente } from '@/src/services/hoy/elite-hoy-service';
import {
  HeroEliteCargando, HeroEliteEnCamino, HeroEliteNoSePudoLeer, HeroEvaluacionElite, NotaEvaluacionEnCamino,
} from '@/src/components/hoy/HeroEvaluacionElite';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ELEVATION, SECTION_TITLE } from '@/src/constants/brand';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';

interface Props {
  userId?: string;
  /** El nivel, leido una sola vez en HOY (useSubscription) y compartido. */
  nivel: NivelHoy;
}

export function HeroLaboratorios({ userId, nivel }: Props) {
  const { t, borde } = useTintaMarca();
  const { tier, cargando: nivelCargando, noSePudoLeer: nivelNoSePudoLeer } = nivel;
  // Candado solo cuando SABEMOS que es free (fail-open: ante la duda se abre).
  // 7-sep-2026 (VENTA_AL_PUBLICO): el candado de venta lo decide una sola
  // función. Con la venta al público apagada nunca cierra. Se lee `tier` en vez
  // de `esMiembro` para usar el mismo juez que las otras cuatro superficies.
  const compararConCandado = !nivelCargando && candadoDeVentaCierra(tier, nivelNoSePudoLeer);

  // 8-oct-2026 (revisión en frío): un solo estado, con su dueña. Lo guardado
  // de otra cuenta no se usa ni en este render (lecturasDe empieza de cero) y
  // se reemplaza de inmediato: React repinta antes de enseñar nada (ajuste de
  // estado durante el render). Nunca el retrato ni el número de otra cuenta.
  //  - `sexo` (7-oct-2026): el del perfil, solo para elegir el retrato de la
  //    tarjeta (él, ella o la imagen neutra). null = no se sabe: neutra.
  //  - `elite` (20-sep-2026): la evaluación Elite, leída en paralelo a los
  //    labs. Una evaluación ya vista gana a un fallo de recarga (como `datos`).
  //  - `vencido` (20-sep-2026, A8): tope de 10 s. Vencido, lo que siga en
  //    vuelo (la lectura Elite, el nivel, los labs) se trata como fallo y la
  //    pantalla se suelta con Reintentar; si algo llega tarde, se usa igual.
  const [guardado, setGuardado] = useState<LecturasHoyAtp>(() => lecturasIniciales(userId));
  const lecturas = lecturasDe(guardado, userId);
  if (lecturas !== guardado) setGuardado(lecturas);
  const { datos, cargando, fallo, sexo, elite, vencido } = lecturas;
  // Cada lectura escribe a nombre de la cuenta que la inició (`de`). Si para
  // entonces lo guardado es de otra cuenta, llegó tarde y no se escribe.
  const escribir = useCallback((de: string, cambio: (previo: LecturasHoyAtp) => CambioLecturas | null) => {
    setGuardado((previo) => escribirLectura(previo, de, cambio));
  }, []);

  const topeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armarTope = useCallback((de: string) => {
    if (topeRef.current) clearTimeout(topeRef.current);
    escribir(de, () => ({ vencido: false }));
    topeRef.current = setTimeout(() => { topeRef.current = null; escribir(de, () => ({ vencido: true })); }, TOPE_HERO_ELITE_MS);
  }, [escribir]);
  useEffect(() => () => { if (topeRef.current) clearTimeout(topeRef.current); }, []);

  const cargar = useCallback(async (forzar = false) => {
    if (!userId) return;
    // La cuenta que inicia esta lectura: todo lo que traiga se escribe a su nombre.
    const de = userId;
    escribir(de, () => ({ cargando: true }));
    armarTope(de);
    const lecturaElite = leerEvaluacionEliteVigente(de, { forzar }).then((r) => {
      escribir(de, (previo) => {
        if (r.ok) return { elite: { estado: 'ok', evaluacion: r.evaluacion } };
        return previo.elite.estado === 'ok' && previo.elite.evaluacion ? null : { elite: { estado: 'fallo', motivo: r.motivo } };
      });
    });
    try {
      const lecturaLabs = cargarHeroLaboratorios(de, { forzar });
      // 7-oct-2026 (Hoy editorial): sin viaje nuevo a la base. La línea de
      // arriba ya dejó en vuelo la lectura compartida de sexo y labs
      // (leerSexoYLabs comparte la promesa); aquí solo se toma el sexo de esa
      // misma promesa. Si falla, se queda el último conocido de ESTA cuenta:
      // el fallo ya lo reporta `lecturaLabs`, y sin sexo la tarjeta usa la
      // imagen neutra.
      leerSexoYLabs(de).then((r) => escribir(de, () => ({ sexo: r.sexo }))).catch(() => {});
      const d = await lecturaLabs;
      escribir(de, () => ({ datos: d, fallo: false }));
    } catch (e) {
      logWarn('[hero-labs] no se pudo leer', e);
      escribir(de, () => ({ fallo: true }));
    } finally {
      await lecturaElite.catch(() => {});
      escribir(de, () => ({ cargando: false }));
    }
  }, [userId, armarTope, escribir]);
  const reintentar = useCallback(() => {
    // Si lo que se colgo es el nivel (useSubscription, en HOY), se le pide
    // que relea tambien; si no, el boton solo repetiria lo que ya resolvio.
    if (nivelCargando) DeviceEventEmitter.emit(SUBSCRIPTION_CHANGED_EVENT);
    cargar(true);
  }, [cargar, nivelCargando]);

  // Al volver a HOY (después de subir un estudio o calcular la edad) se relee.
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SUBSCRIPTION_CHANGED_EVENT, () => { cargar(); });
    return () => sub.remove();
  }, [cargar]);

  // Vencido el tope, unos labs que siguen en vuelo son un fallo con Reintentar.
  const estado = decidirEstadoHero(datos, cargando, fallo || (vencido && cargando));
  // 20-sep-2026: primero decide lo Elite; solo 'labs' cae al hero de siempre.
  const estadoElite = decidirHeroElite(elite, nivel, { vencido });
  // 7-oct-2026 (Hoy editorial): el orden de la decisión no cambió, solo se
  // mudó a hoy-resumen-core para poder probarlo (mientras la evaluación se
  // lee no se pinta lo de laboratorios; "en camino" solo con labs leídos y sin
  // estudio; un fallo de SUS labs se muestra como tal). Lo que cambió es la
  // salida de los estados felices: una tarjeta editorial en vez de la ficha
  // con marcadores.
  const vista = decidirVistaHoyAtp({
    estadoElite,
    eliteEnVuelo: elite.estado === 'cargando',
    evaluacion: elite.estado === 'ok' ? elite.evaluacion : null,
    estadoLabs: estado,
    datos,
    sexo,
  });

  if (vista.vista === 'elite_no_se_pudo_leer') {
    return (
      <HeroEliteNoSePudoLeer
        onReintentar={reintentar}
        formato={elite.estado === 'fallo' && elite.motivo === 'formato'}
        // El copy del tope solo cuando de verdad hay algo en vuelo (la
        // lectura Elite o el nivel), no por el reloj solo.
        tope={vencido && (elite.estado === 'cargando' || nivelCargando)}
      />
    );
  }
  if (vista.vista === 'elite_cargando') return <HeroEliteCargando />;
  if (vista.vista === 'elite_en_camino') return <HeroEliteEnCamino onActualizar={reintentar} />;

  const card = [s.card, { backgroundColor: t.card, borderColor: borde }];

  if (vista.vista === 'labs_cargando') {
    return (
      <View style={card}>
        <Cabecera texto="TUS LABORATORIOS" />
        <EliteText style={[s.body, { color: t.textoSecundario }]}>Leyendo tus laboratorios...</EliteText>
      </View>
    );
  }

  if (vista.vista === 'labs_no_se_pudo_leer') {
    return (
      <View style={card}>
        <Cabecera texto="TUS LABORATORIOS" />
        <EliteText style={[s.titulo, { color: t.texto }]}>No pudimos leer tus laboratorios</EliteText>
        <EliteText style={[s.body, { color: t.textoSecundario }]}>
          Revisa tu conexión. Tus datos siguen aquí.
        </EliteText>
        <AnimatedPressable
          style={[s.btnQuiet, { borderColor: t.bordeMarcado }]}
          onPress={() => { haptic.light(); reintentar(); }}
        >
          <Ionicons name="refresh" size={14} color={t.texto} />
          <EliteText style={[s.btnQuietText, { color: t.texto }]}>Reintentar</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  // Estados felices: la tarjeta editorial. Sin filas de marcadores, sin puntos
  // de color, sin etiquetas de semáforo: eso vive a un toque, tras el CTA.
  if (vista.tarjeta.key === 'evaluacion') return <HeroEvaluacionElite tarjeta={vista.tarjeta} />;
  return (
    <HoyResumenCard tarjeta={vista.tarjeta} compararConCandado={compararConCandado}>
      {/* Cliente Elite con labs propios y evaluación sin cargar: conserva lo
          suyo y sabe que lo del coach viene (misma nota de siempre). */}
      {vista.notaEvaluacionEnCamino ? <NotaEvaluacionEnCamino /> : null}
    </HoyResumenCard>
  );
}

function Cabecera({ texto }: { texto: string }) {
  const { t, teal } = useTintaMarca();
  return (
    <View style={s.headerRow}>
      <View style={[s.iconWrap, { backgroundColor: t.hundido }]}>
        <AppIcon name="labs" size={18} color={teal} />
      </View>
      <EliteText style={[s.label, { color: t.textoSecundario }]}>{texto}</EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.semiBold, fontSize: SECTION_TITLE.fontSize, letterSpacing: SECTION_TITLE.letterSpacing },
  titulo: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  body: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 6 },
  btnQuiet: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderColor: ELEVATION[2].border, borderRadius: Radius.card,
    paddingVertical: 11, marginTop: Spacing.sm,
  },
  btnQuietText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
