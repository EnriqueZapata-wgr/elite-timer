/**
 * Primera sesión · pantalla 4 de 6 — LA APP SE ARMA ENFRENTE.
 * Pivote limpio, 7 de septiembre de 2026 (sección 6 del plan).
 *
 * ESTE ES EL MOMENTO DE ENGANCHE, y es el que ninguna competencia hace: la
 * persona VE armarse su app. No es una barra de progreso con una palabra
 * genérica encima; es la lista concreta de lo que se instala, lo que se
 * enciende con su hora, las metas que se fijan, y sobre todo LO QUE NO SE
 * INSTALA Y POR QUÉ.
 *
 * `noInstala` es la fila que define un objetivo. Cualquiera hace una lista de
 * lo que ayuda; lo difícil es decidir qué se queda fuera aunque también
 * ayudaría. Ese campo existía en el registro sin pintarse en ninguna pantalla,
 * y aquí sale a la luz.
 *
 * EL PERMISO DE AVISOS SE PIDE AQUÍ, no en una pantalla suelta, porque aquí la
 * razón se ve sola: arriba está la lista de a qué hora te vamos a avisar. Y se
 * pide ANTES de aplicar, a propósito: `aplicarPack` enciende los avisos, y sin
 * permiso ese paso se marca fallido. Lo que falle igual queda anotado como
 * pendiente y el reconciliador lo reintenta al abrir la app, así que decir
 * "ahora no" ya no deja los avisos muertos para siempre.
 *
 * También aquí se siembra el día 1 (`sembrarDia1`) ANTES de aplicar: sin eso,
 * quien no tiene fila de preferencias hereda los 13 renglones por omisión y
 * abre HOY con una lista ajena. Después de aplicar ya no serviría de nada
 * porque la propia aplicación escribe esa columna.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';
import { useAuth } from '@/src/contexts/auth-context';
import {
  numeroDePantalla,
  TOTAL_PANTALLAS_PRIMERA_SESION,
} from '@/src/services/primera-sesion-core';
import { completarPaso, guardarHorarioDelDia } from '@/src/services/primera-sesion-service';
import { PACK_BY_KEY, habitosPorIntensidad } from '@/src/constants/packs';
import { buildPackPlan } from '@/src/services/pack-core';
import { aplicarPack, type ResultadoAplicacion } from '@/src/services/pack-service';
import { sembrarDia1 } from '@/src/services/hoy/install-service';
import { registerForPushNotificationsAsync } from '@/src/services/push-notification-service';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';

const nombreElectron = (key: string) => ELECTRON_WEIGHTS[key as ElectronSource]?.name ?? key;
const labelApp = (key: string) => APP_BY_KEY[key]?.label ?? key;

type Fase = 'plan' | 'armando' | 'resultado';

/**
 * Un bloque del armado. Vive a nivel de modulo y no dentro de la pantalla a
 * proposito: un componente declarado adentro se vuelve un tipo NUEVO en cada
 * render, React desmonta su subarbol y las entradas escalonadas se vuelven a
 * animar cada vez que cambia un estado. Aqui eso se veria como un parpadeo en
 * el momento mas importante de la primera sesion.
 */
function Seccion({ titulo, retraso, th, children }: {
  titulo: string;
  retraso: number;
  th: ReturnType<typeof useOnboardingTheme>;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(retraso).springify()}>
      <EliteText style={[s.seccion, { color: th.tokens.textoSecundario }]}>{titulo}</EliteText>
      <View style={[s.tarjeta, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
        {children}
      </View>
    </Animated.View>
  );
}

export default function ArmadoScreen() {
  const router = useRouter();
  const { user, loading: cargandoSesion } = useAuth();
  const th = useOnboardingTheme();
  const { objetivo: objetivoKey, despertar, dormir } = useLocalSearchParams<{
    objetivo?: string; despertar?: string; dormir?: string;
  }>();

  const [fase, setFase] = useState<Fase>('plan');
  const [resultado, setResultado] = useState<ResultadoAplicacion | null>(null);
  const [avanzando, setAvanzando] = useState(false);
  // Qué se pidió y qué se llegó a tocar. Sin esto, la pantalla no puede
  // distinguir "lo omitiste tú" de "falló", ni "no se tocó nada" de
  // "se escribió a medias". Las dos distinciones son de honestidad, no de UI.
  const [pidioAvisos, setPidioAvisos] = useState(true);
  const [seEscribioAlgo, setSeEscribioAlgo] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  const objetivo = typeof objetivoKey === 'string' ? PACK_BY_KEY[objetivoKey] ?? null : null;
  const horaDespertar = typeof despertar === 'string' ? despertar : '07:00';
  const horaDormir = typeof dormir === 'string' ? dormir : '23:00';

  // El plan es determinista y puro: mismo objetivo, misma etapa y mismo
  // horario dan siempre el mismo plan. Por eso se puede enseñar ANTES de
  // escribir nada, y lo que se enseña es lo que va a pasar.
  const plan = useMemo(() => {
    if (!objetivo) return null;
    try {
      return buildPackPlan(objetivo.key, 'suave', horaDespertar, horaDormir);
    } catch (e) {
      logWarn('[primera-sesion] no se pudo armar el plan', e);
      return null;
    }
  }, [objetivo, horaDespertar, horaDormir]);

  useEffect(() => { haptic.light(); }, []);

  const armar = async (conAvisos: boolean) => {
    if (!user?.id || !objetivo || fase === 'armando') return;
    setPidioAvisos(conAvisos);
    setSeEscribioAlgo(false);
    setFase('armando');
    try {
      if (conAvisos) {
        // El diálogo del sistema, con la razón ya vista arriba. Si la persona
        // dice que no, el objetivo se aplica igual: lo que no entre queda
        // anotado como pendiente y se reintenta solo.
        await registerForPushNotificationsAsync(user.id, { prompt: true });
      }
      // PRIMERO el horario, y en el lugar donde el compilador del día lo lee.
      // Sin esta línea, las horas de las pantallas 4 y 6 no son las que HOY
      // pinta: la promesa en letra grande se rompía en silencio.
      const horarioOk = await guardarHorarioDelDia(user.id, horaDespertar, horaDormir);
      if (horarioOk) setSeEscribioAlgo(true);
      else logWarn('[primera-sesion] el horario del día no se pudo guardar');
      // Después la siembra, para que HOY no arranque con 13 renglones ajenos.
      // Fail-soft: si truena, el objetivo se aplica igual.
      try {
        const sembro = await sembrarDia1(
          user.id,
          habitosPorIntensidad(objetivo, 'suave').map((h) => h.electron as string),
        );
        if (sembro) setSeEscribioAlgo(true);
      } catch (e) {
        logWarn('[primera-sesion] siembra del día 1 falló', e);
      }
      const r = await aplicarPack(user.id, objetivo.key, {
        intensidad: 'suave',
        despertar: horaDespertar,
        dormir: horaDormir,
      });
      // aplicarPack solo llega a tocar algo si pasó de sus lecturas previas,
      // y eso se ve en que reporta más de un paso o un plan.
      if (r.plan != null || r.pasos.some((p) => p.ok)) setSeEscribioAlgo(true);
      if (!horarioOk) {
        r.pasos.push({
          paso: 'horas',
          ok: false,
          detalle: 'No pudimos guardar tu horario, así que tus tareas de HOY pueden aparecer a otra hora. Se puede reintentar.',
        });
      }
      setResultado(r);
      setFase('resultado');
      if (r.ok && horarioOk) haptic.success();
      else haptic.warning();
    } catch (e) {
      logWarn('[primera-sesion] armado falló', e);
      setResultado(null);
      setFase('resultado');
      haptic.warning();
    }
  };

  const continuar = async () => {
    if (!user?.id || avanzando) return;
    setAvanzando(true);
    setErrorCierre(null);
    haptic.medium();
    try {
      const paso = await completarPaso(user.id, 'armado');
      if (!paso.ok) { setErrorCierre(paso.detalle); return; }
      router.replace({
        pathname: '/primera-sesion/punto-de-partida',
        params: { objetivo: objetivo?.key ?? '', despertar: horaDespertar, dormir: horaDormir },
      });
    } finally {
      setAvanzando(false);
    }
  };

  // Sesión vencida: sin usuario esta pantalla no puede escribir nada y sus dos
  // botones quedarían muertos sin decir por qué. A iniciar sesión.
  if (!cargandoSesion && !user?.id) return <Redirect href="/login" />;

  // Estado vacío / no se pudo preparar: sin objetivo o sin plan no hay nada
  // que armar, y la salida es volver a elegir, no una pantalla muda.
  if (!objetivo || !plan) {
    return (
      <OnboardingShell step={numeroDePantalla('armado')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <EliteText style={[s.titulo, th.titulo, { textAlign: 'center' }]}>
            No pudimos preparar tu app
          </EliteText>
          <EliteText style={[s.subtitulo, th.sub, { textAlign: 'center' }]}>
            Nada se tocó. Vuelve a elegir tu objetivo y lo intentamos otra vez.
          </EliteText>
          <AnimatedPressable
            style={s.cta}
            onPress={() => { haptic.light(); router.replace('/primera-sesion/preguntas'); }}
          >
            <EliteText style={s.ctaTexto}>Elegir mi objetivo</EliteText>
          </AnimatedPressable>
        </View>
      </OnboardingShell>
    );
  }

  if (fase === 'armando') {
    return (
      <OnboardingShell step={numeroDePantalla('armado')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <ActivityIndicator size="large" color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
          <EliteText style={[s.subtitulo, th.sub, { textAlign: 'center' }]}>
            Armando tu app para {objetivo.nombre.toLowerCase()}
          </EliteText>
        </View>
      </OnboardingShell>
    );
  }

  if (fase === 'resultado') {
    // "Armar sin avisos por ahora" es una opción que la app ofrece, no un
    // fallo. `aplicarPack` marca el paso de avisos como fallido cuando no hay
    // permiso, y pintarlo en rojo le ponía cara de error a la elección de la
    // persona, justo en el momento de enganche. Se separa: omitido arriba,
    // fallas de verdad abajo.
    const todasLasFallas = resultado?.pasos.filter((p) => !p.ok) ?? [];
    const avisosOmitidos = !pidioAvisos && todasLasFallas.some((f) => f.paso === 'avisos');
    const fallas = avisosOmitidos
      ? todasLasFallas.filter((f) => f.paso !== 'avisos')
      : todasLasFallas;
    const seArmo = resultado != null && fallas.length === 0;
    return (
      <OnboardingShell step={numeroDePantalla('armado')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText style={[s.titulo, th.titulo]}>
              {seArmo ? 'Tu app quedó armada' : 'Casi: algo no entró'}
            </EliteText>
            <EliteText style={[s.subtitulo, th.sub]}>
              {seArmo
                ? `${objetivo.nombre} ya está en tu app, con sus horas puestas.`
                : 'Esto es lo que sí entró y lo que faltó.'}
            </EliteText>
          </Animated.View>

          {avisosOmitidos && (
            <Animated.View entering={FadeInUp.delay(60).springify()}>
              <View style={[s.tarjeta, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde, marginTop: Spacing.md }]}>
                <EliteText style={[s.texto, th.titulo]}>
                  No configuramos avisos porque así lo pediste. Se pueden
                  encender cuando quieras desde cada app.
                </EliteText>
              </View>
            </Animated.View>
          )}

          {fallas.length > 0 && (
            <Animated.View entering={FadeInUp.delay(80).springify()} style={s.fallas}>
              {fallas.map((f) => (
                <View key={f.paso} style={s.filaFalla}>
                  <Ionicons name="alert-circle-outline" size={15} color={th.tokens.error} />
                  <EliteText style={[s.textoFalla, th.titulo]}>{f.detalle ?? f.paso}</EliteText>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Una excepción a media aplicación NO es lo mismo que un fallo de
              registro. Si ya se escribió el horario o la siembra, decir "nada
              se tocó" sería falso, y la persona tomaría una decisión con
              información inventada. */}
          {resultado === null && (
            <Animated.View entering={FadeInUp.delay(80).springify()} style={s.fallas}>
              <View style={s.filaFalla}>
                <Ionicons name="alert-circle-outline" size={15} color={th.tokens.error} />
                <EliteText style={[s.textoFalla, th.titulo]}>
                  {seEscribioAlgo
                    ? 'Se interrumpió a medio armado. Parte de tu configuración ya se guardó y el resto no. Intentar de nuevo la completa sin duplicar nada.'
                    : 'No pudimos empezar a armar tu app. Nada se tocó.'}
                </EliteText>
              </View>
            </Animated.View>
          )}

          {resultado?.plan && (
            <>
              <Seccion titulo="SE INSTALÓ EN TU SALA" retraso={120} th={th}>
                <EliteText style={[s.texto, th.titulo]}>
                  {[...resultado.plan.installFull, ...resultado.plan.installGrid].map(labelApp).join(' · ')}
                </EliteText>
              </Seccion>
              <Seccion titulo="SE ENCENDIÓ EN TU DÍA" retraso={160} th={th}>
                {resultado.plan.encendidos.length === 0 ? (
                  <EliteText style={[s.nota, th.sub]}>
                    Este objetivo no enciende hábitos nuevos: los suyos ya estaban en tu día.
                  </EliteText>
                ) : (
                  resultado.plan.encendidos.map((e) => (
                    <View key={e} style={s.fila}>
                      <EliteText style={[s.texto, th.titulo]}>{nombreElectron(e)}</EliteText>
                      <EliteText style={[s.hora, th.sub]}>{resultado.plan?.habitTimes[e] ?? '·'}</EliteText>
                    </View>
                  ))
                )}
                {resultado.plan.habitReglas.sunlight?.ancla === 'uv' && (
                  <EliteText style={[s.nota, th.sub]}>
                    Luz solar se ancla cada día a tu ventana buena de sol, así
                    que su hora se mueve.
                  </EliteText>
                )}
              </Seccion>
            </>
          )}

          {errorCierre && (
            <Animated.View entering={FadeInUp.springify()} style={s.fallas}>
              <View style={s.filaFalla}>
                <Ionicons name="alert-circle-outline" size={15} color={th.tokens.error} />
                <EliteText style={[s.textoFalla, th.titulo]}>{errorCierre}</EliteText>
              </View>
            </Animated.View>
          )}
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>

        {/* La jerarquía de los botones sigue al resultado, no al guion. Si el
            armado no entró, el principal es reintentar: avanzar dejaría a la
            persona en un día 1 vacío al que ya no se puede volver, y la
            pantalla 6 le diría "tu app ya quedó lista", que sería mentirle. */}
        <View style={s.barraInferior}>
          {seArmo ? (
            <AnimatedPressable style={s.cta} onPress={continuar} disabled={avanzando}>
              <EliteText style={s.ctaTexto}>{avanzando ? 'Un momento' : 'Continuar'}</EliteText>
              {!avanzando && <Ionicons name="arrow-forward" size={18} color={TEXT_COLORS.onAccent} />}
            </AnimatedPressable>
          ) : (
            <>
              <AnimatedPressable
                style={s.cta}
                onPress={() => { haptic.light(); setErrorCierre(null); setFase('plan'); }}
                disabled={avanzando}
              >
                <EliteText style={s.ctaTexto}>Intentar de nuevo</EliteText>
              </AnimatedPressable>
              <AnimatedPressable style={s.saltar} onPress={continuar} disabled={avanzando} hitSlop={8}>
                <EliteText style={[s.saltarTexto, th.sub]}>
                  {avanzando ? 'Un momento' : 'Seguir así de todos modos'}
                </EliteText>
              </AnimatedPressable>
            </>
          )}
        </View>
      </OnboardingShell>
    );
  }

  const instala = [...plan.installFull, ...plan.installGrid];

  return (
    <OnboardingShell step={numeroDePantalla('armado')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <EliteText style={[s.titulo, th.titulo]}>Así te va a quedar la app</EliteText>
          <EliteText style={[s.subtitulo, th.sub]}>
            Esto es lo que se va a configurar para {objetivo.nombre.toLowerCase()}.
            Todo se puede ajustar después.
          </EliteText>
        </Animated.View>

        <Seccion titulo="SE INSTALA EN TU SALA" retraso={100} th={th}>
          <View style={s.chips}>
            {instala.map((k) => (
              <View key={k} style={[s.chip, { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde }]}>
                <EliteText style={[s.chipTexto, th.titulo]}>{labelApp(k)}</EliteText>
              </View>
            ))}
          </View>
        </Seccion>

        <Seccion titulo="SE ENCIENDE EN TU DÍA, CON SU HORA" retraso={160} th={th}>
          {plan.encendidos.length === 0 ? (
            <EliteText style={[s.nota, th.sub]}>
              Este objetivo no enciende hábitos nuevos.
            </EliteText>
          ) : (
            plan.encendidos.map((e) => (
              <View key={e} style={s.fila}>
                <EliteText style={[s.texto, th.titulo]}>{nombreElectron(e)}</EliteText>
                <EliteText style={[s.hora, th.sub]}>{plan.habitTimes[e] ?? '·'}</EliteText>
              </View>
            ))
          )}
          {plan.enModulo.length > 0 && (
            <EliteText style={[s.nota, th.sub]}>
              {plan.enModulo.map(nombreElectron).join(' · ')}: se registran en su
              momento, dentro de su app.
            </EliteText>
          )}
          {/* La única hora de esta lista que NO va a ser exactamente esta. Se
              dice aquí, y no después, porque prometer una hora fija para el sol
              y luego moverla es el mismo tipo de mentira que el resto de esta
              pantalla existe para evitar. */}
          {plan.habitReglas.sunlight?.ancla === 'uv' && (
            <EliteText style={[s.nota, th.sub]}>
              Luz solar se ancla cada día a tu ventana buena de sol, así que su
              hora se mueve. Sin dato de ubicación cae a media hora después de
              despertar.
            </EliteText>
          )}
        </Seccion>

        {plan.metas.length > 0 && (
          <Seccion titulo="TUS METAS" retraso={220} th={th}>
            {plan.metas.map((m) => (
              <EliteText key={m.tipo} style={[s.texto, th.titulo]}>
                {m.tipo === 'proteina_g' ? `Proteína ${m.valor} g al día`
                  : m.tipo === 'agua_ml' ? `Agua ${m.valor} ml al día`
                  : `Ayuno ${m.valor} h`}
              </EliteText>
            ))}
          </Seccion>
        )}

        <Seccion titulo="ASÍ TE VAMOS A AVISAR" retraso={270} th={th}>
          {plan.avisos.length === 0 ? (
            <EliteText style={[s.nota, th.sub]}>
              Este objetivo no configura avisos. Los de tus apps se quedan como
              los tengas.
            </EliteText>
          ) : (
            plan.avisos.map((a) => (
              <View key={a.app} style={s.fila}>
                <EliteText style={[s.texto, th.titulo]}>
                  {labelApp(a.app)}, solo si no lo has hecho
                </EliteText>
                <EliteText style={[s.hora, th.sub]}>{a.time}</EliteText>
              </View>
            ))
          )}
          <EliteText style={[s.nota, th.sub]}>
            Para que esas horas existan, el teléfono nos tiene que dar permiso.
            Se pide al armar y lo puedes apagar cuando quieras.
          </EliteText>
        </Seccion>

        {/* La fila que define el objetivo. Solo cosas que de verdad ayudarían:
            listar lo irrelevante no le sirve a nadie. */}
        <Seccion titulo="LO QUE NO SE INSTALA, Y POR QUÉ" retraso={330} th={th}>
          {objetivo.noInstala.map((f) => (
            <View key={f.que} style={s.fuera}>
              <View style={s.fueraTitulo}>
                {/* Marca de "fuera", que es chrome y no una función: lo que se
                    deja fuera viene como texto libre y no tiene llave de app
                    que resolver a un glifo del mapa. */}
                <Ionicons name="remove-circle-outline" size={15} color={th.tokens.textoSecundario} />
                <EliteText style={[s.texto, th.titulo]}>{f.que}</EliteText>
              </View>
              <EliteText style={[s.nota, th.sub]}>{f.porque}</EliteText>
            </View>
          ))}
        </Seccion>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <View style={s.barraInferior}>
        <AnimatedPressable style={s.cta} onPress={() => armar(true)}>
          <EliteText style={s.ctaTexto}>Armar mi app</EliteText>
          <Ionicons name="arrow-forward" size={18} color={TEXT_COLORS.onAccent} />
        </AnimatedPressable>
        <AnimatedPressable style={s.saltar} onPress={() => armar(false)} hitSlop={8}>
          <EliteText style={[s.saltarTexto, th.sub]}>Armar sin avisos por ahora</EliteText>
        </AnimatedPressable>
      </View>
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: Spacing.lg },

  titulo: { fontSize: 26, lineHeight: 32, fontFamily: Fonts.bold, marginTop: 20 },
  subtitulo: { fontSize: FontSizes.sm, lineHeight: 20, fontFamily: Fonts.regular, marginTop: 8 },

  seccion: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2, marginTop: Spacing.lg, marginBottom: 8 },
  tarjeta: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  texto: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20 },
  hora: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  nota: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 17, marginTop: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  chipTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },

  fuera: { gap: 3, marginBottom: 4 },
  fueraTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  fallas: {
    backgroundColor: withOpacity(SEMANTIC.error, 0.08),
    borderWidth: 0.5, borderColor: withOpacity(SEMANTIC.error, 0.3),
    borderRadius: Radius.lg, padding: Spacing.md, gap: 8, marginTop: Spacing.md,
  },
  filaFalla: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  textoFalla: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 17 },

  barraInferior: { paddingHorizontal: Spacing.md, paddingBottom: 28, paddingTop: Spacing.xs, gap: 4 },
  cta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaTexto: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
  saltar: { paddingVertical: 12, alignItems: 'center' },
  saltarTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
});
