/**
 * Primera sesión · pantalla 5 de 6 — TU PUNTO DE PARTIDA.
 * Pivote limpio, 7 de septiembre de 2026 (sección 6 del plan).
 *
 * LA PROMESA QUE SE ESTABA ROMPIENDO. El perfil del onboarding viejo decía
 * "estos datos alimentan tu Edad ATP desde el día 1", y no era verdad: sin
 * porcentaje de grasa la composición vale cero (ce-service) y con sexo, edad,
 * talla y peso la evaluación se queda muy por debajo del umbral con el que la
 * pantalla de Edad ATP habilita el cálculo. La persona daba doce datos y
 * recibía "necesitas más datos".
 *
 * Aquí se paga en la misma pantalla. Se piden cuatro datos y un toque más
 * (cuánto te mueves a la semana, que desde la corrección en frío del mismo día
 * es la palanca que de verdad mueve el número), y la cifra aparece abajo en el
 * mismo momento, sin cambiar de pantalla y sin esperar a un estudio. No es la Edad ATP y se dice con esas palabras: es una estimación
 * informativa, con qué la mueve y qué dato la volvería precisa
 * (estimacion-inicial-core).
 *
 * NO SE BAJÓ EL UMBRAL DEL CÁLCULO REAL, a propósito: son dos cosas distintas
 * y confundirlas mentiría en la otra dirección. Esta estimación tampoco se
 * guarda en ningún lado donde alguien la pueda confundir con la medida.
 *
 * CB-2 VIVE AQUÍ. Es la primera pantalla de la primera sesión que escribe dato
 * de salud, así que la puerta reutilizable se monta aquí y bloquea de verdad.
 * Quien diga "ahora no" no se queda encerrado: sigue a su día 1 sin número, y
 * lo puede dar cuando quiera.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OnboardingShell } from '@/src/components/onboarding/OnboardingShell';
import { useOnboardingTheme } from '@/src/components/onboarding/onboarding-theme';
import { AgeGateModal } from '@/src/components/onboarding/AgeGateModal';
import { usePuertaDatosSalud, BloquePuertaDatosSalud } from '@/src/components/legal/PuertaDatosSalud';
import { useAuth } from '@/src/contexts/auth-context';
import {
  numeroDePantalla,
  TOTAL_PANTALLAS_PRIMERA_SESION,
  horasDeVentanaDeSueno,
} from '@/src/services/primera-sesion-core';
import {
  leerPerfilBase, guardarPerfilBase, completarPaso, leerHorarioDelObjetivo,
} from '@/src/services/primera-sesion-service';
import {
  estimarPuntoDePartida, edadEnAnios, ETIQUETA_ESTIMACION,
  type EstimacionInicial,
} from '@/src/services/edad-atp/estimacion-inicial-core';
import { seedInitialApps } from '@/src/services/hoy/install-service';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { getLocalToday } from '@/src/utils/date-helpers';
import { ageFromDob, ageGateTier } from '@/src/utils/age-gate';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';

/**
 * Las cuatro opciones de movimiento. Los valores en horas son el punto medio
 * honesto de cada tramo, y los tramos son los del modulador de hábitos del
 * motor v2 (menos de 2, menos de 4, menos de 7, menos de 10). No son una
 * escala nueva: son la que ya estaba validada.
 */
const MOVIMIENTO = [
  { id: 'nada', texto: 'Casi nada', horas: 0 },
  { id: 'poco', texto: '1 a 3 horas', horas: 2 },
  { id: 'medio', texto: '4 a 6 horas', horas: 5 },
  { id: 'mucho', texto: '7 horas o más', horas: 8 },
] as const;

type Fase = 'cargando' | 'sin_lectura' | 'captura' | 'guardando' | 'resultado';

export default function PuntoDePartidaScreen() {
  const router = useRouter();
  const { user, signOut, loading: cargandoSesion } = useAuth();
  const th = useOnboardingTheme();
  const puerta = usePuertaDatosSalud(user?.id);
  const { despertar, dormir } = useLocalSearchParams<{ despertar?: string; dormir?: string }>();

  const [fase, setFase] = useState<Fase>('cargando');
  const [intento, setIntento] = useState(0);
  const [sexo, setSexo] = useState<'male' | 'female' | null>(null);
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [talla, setTalla] = useState('');
  const [peso, setPeso] = useState('');
  const [movimiento, setMovimiento] = useState<(typeof MOVIMIENTO)[number] | null>(null);
  const [estimacion, setEstimacion] = useState<EstimacionInicial | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [menorDeEdad, setMenorDeEdad] = useState(false);
  const [avanzando, setAvanzando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  // El horario real es el que quedó GUARDADO al aplicar el objetivo. Los
  // parámetros de la URL son solo el respaldo para el paso normal, sin
  // reinicio de app de por medio. Si no hay ninguno de los dos, la ventana de
  // sueño queda en null y la pantalla lo dice: no se inventa un 7 a 11.
  const [horarioGuardado, setHorarioGuardado] = useState<{ despertar: string; dormir: string } | null>(null);
  const horasSueno = horasDeVentanaDeSueno(
    horarioGuardado?.despertar ?? (typeof despertar === 'string' ? despertar : null),
    horarioGuardado?.dormir ?? (typeof dormir === 'string' ? dormir : null),
  );

  // Prellenado: a nadie se le vuelve a pedir un dato que ya entregó. Importa
  // por los perfiles que existen desde antes del pivote.
  useEffect(() => {
    const userId = user?.id;
    if (!userId || !puerta.puedeEscribir) return;
    let vivo = true;
    setFase('cargando');
    (async () => {
      const [lectura, horario] = await Promise.all([
        leerPerfilBase(userId),
        leerHorarioDelObjetivo(userId),
      ]);
      if (!vivo) return;
      if (horario) setHorarioGuardado(horario);
      if (!lectura.ok) { setFase('sin_lectura'); return; }
      const p = lectura.perfil;
      if (p.sexo) setSexo(p.sexo);
      if (p.fechaNacimiento) {
        const [a, m, d] = p.fechaNacimiento.split('-');
        if (a && m && d) { setAnio(a); setMes(m); setDia(d); }
      }
      if (p.tallaCm != null) setTalla(String(p.tallaCm));
      if (p.pesoKg != null) setPeso(String(p.pesoKg));
      setFase('captura');
    })();
    return () => { vivo = false; };
  }, [user?.id, puerta.puedeEscribir, intento]);

  const tallaNum = parseDecimalInput(talla);
  const pesoNum = parseDecimalInput(peso);
  // El movimiento es OBLIGATORIO, y no por capricho. Desde la corrección en
  // frío del 7-sep-2026, la ventana en cama solo puntúa cuando ya no alcanza
  // para dormir seis horas, así que para la mayoría de la gente el movimiento
  // es la única palanca que queda. Sin ella no hay número, y esta pantalla
  // promete un número: pedir un toque más es mejor que prometer y no cumplir.
  const completo = !!sexo && !!dia && !!mes && !!anio && movimiento != null
    && tallaNum != null && tallaNum >= 100 && tallaNum <= 250
    && pesoNum != null && pesoNum >= 25 && pesoNum <= 300;

  /** 'AAAA-MM-DD' si la fecha existe de verdad, null si no. */
  const fechaValida = useMemo((): string | null => {
    const d = parseInt(dia, 10);
    const m = parseInt(mes, 10);
    const a = parseInt(anio, 10);
    if (!d || !m || !a || d < 1 || d > 31 || m < 1 || m > 12 || a < 1900) return null;
    const fecha = new Date(a, m - 1, d);
    if (fecha.getDate() !== d || fecha.getMonth() !== m - 1) return null;
    return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }, [dia, mes, anio]);

  const verMiNumero = async () => {
    const userId = user?.id;
    if (!userId || !completo || !fechaValida || !sexo || tallaNum == null || pesoNum == null) return;
    if (!puerta.puedeEscribir) return;
    // La verificación de edad se sostiene con la fecha, no solo con la casilla
    // que se firmó en el registro.
    if (ageGateTier(ageFromDob(fechaValida, getLocalToday())) === 'blocked') {
      haptic.error();
      setMenorDeEdad(true);
      return;
    }
    setFase('guardando');
    setErrorGuardado(null);
    const guardado = await guardarPerfilBase(userId, {
      sexo,
      fechaNacimiento: fechaValida,
      tallaCm: tallaNum,
      pesoKg: pesoNum,
    });
    if (!guardado.ok) {
      setErrorGuardado(guardado.detalle ?? 'No se pudieron guardar tus datos.');
      setFase('captura');
      haptic.warning();
      return;
    }
    // Ahora que se sabe el sexo biológico, la sala se siembra bien (a una
    // usuaria le toca su Ciclo). Fail-soft: la cuadrícula se vuelve a sembrar
    // sola al abrir la sala si esto no entra.
    try {
      await seedInitialApps(userId, sexo === 'female');
    } catch (e) {
      logWarn('[primera-sesion] siembra de la sala falló', e);
    }
    setEstimacion(estimarPuntoDePartida({
      edadAnios: edadEnAnios(fechaValida, getLocalToday()),
      sexo,
      pesoKg: pesoNum,
      tallaCm: tallaNum,
      horasVentanaSueno: horasSueno,
      horasMovimientoSemana: movimiento?.horas ?? null,
    }));
    haptic.success();
    setFase('resultado');
  };

  const continuar = async () => {
    const userId = user?.id;
    if (!userId || avanzando) return;
    setAvanzando(true);
    setErrorCierre(null);
    haptic.medium();
    try {
      const paso = await completarPaso(userId, 'punto-de-partida');
      if (!paso.ok) { setErrorCierre(paso.detalle); return; }
      router.replace('/primera-sesion/dia-1');
    } finally {
      setAvanzando(false);
    }
  };

  // Sesión vencida: sin usuario, `usePuertaDatosSalud` se queda en verificando
  // para siempre y la pantalla gira sin decir nada. A iniciar sesión.
  if (!cargandoSesion && !user?.id) return <Redirect href="/login" />;

  // ─── La puerta de datos de salud (CB-2) ───
  if (!puerta.puedeEscribir) {
    return (
      <OnboardingShell step={numeroDePantalla('punto-de-partida')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          {puerta.estado === 'verificando' ? (
            <ActivityIndicator size="large" color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
          ) : (
            <>
              <BloquePuertaDatosSalud puerta={puerta} />
              {/* Nadie se queda encerrado por decir que no. */}
              <AnimatedPressable style={s.saltar} onPress={continuar} disabled={avanzando} hitSlop={8}>
                <EliteText style={[s.saltarTexto, th.sub]}>
                  Seguir sin esto por ahora
                </EliteText>
              </AnimatedPressable>
            </>
          )}
        </View>
      </OnboardingShell>
    );
  }

  if (fase === 'cargando') {
    return (
      <OnboardingShell step={numeroDePantalla('punto-de-partida')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <ActivityIndicator size="large" color={th.dark ? ATP_BRAND.lime : th.tokens.tealTexto} />
        </View>
      </OnboardingShell>
    );
  }

  // No se pudo LEER lo que ya había. No es "no hay nada": si se pintara el
  // formulario vacío, la persona volvería a capturar algo que ya dio.
  if (fase === 'sin_lectura') {
    return (
      <OnboardingShell step={numeroDePantalla('punto-de-partida')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <View style={s.centro}>
          <Ionicons name="cloud-offline-outline" size={28} color={th.tokens.textoSecundario} />
          <EliteText style={[s.titulo, th.titulo, s.centrado]}>No pudimos leer tus datos</EliteText>
          <EliteText style={[s.subtitulo, th.sub, s.centrado]}>
            Casi siempre es la conexión. Nada se perdió y nada se tocó.
          </EliteText>
          <AnimatedPressable style={s.cta} onPress={() => { haptic.light(); setIntento((n) => n + 1); }}>
            <EliteText style={s.ctaTexto}>Reintentar</EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={s.saltar} onPress={continuar} disabled={avanzando} hitSlop={8}>
            <EliteText style={[s.saltarTexto, th.sub]}>Seguir sin esto por ahora</EliteText>
          </AnimatedPressable>
        </View>
      </OnboardingShell>
    );
  }

  // ─── El número ───
  if (fase === 'resultado' && estimacion) {
    return (
      <OnboardingShell step={numeroDePantalla('punto-de-partida')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText style={[s.antetitulo, th.sub]}>TU PUNTO DE PARTIDA</EliteText>
            {estimacion.ok && estimacion.edadEstimada != null ? (
              <>
                <View style={s.numeroFila}>
                  <EliteText style={[s.numero, { color: th.dark ? ATP_BRAND.lime : th.tokens.tealTexto }]}>
                    {estimacion.edadEstimada}
                  </EliteText>
                  <EliteText style={[s.numeroUnidad, th.sub]}>años</EliteText>
                </View>
                <EliteText style={[s.etiqueta, th.sub]}>{ETIQUETA_ESTIMACION}</EliteText>
                {/* Con el número acotado por el piso del motor, la diferencia
                    contra la edad de calendario deja de ser la lectura de tus
                    hábitos y pasa a ser el efecto del piso. Se dice el piso, no
                    se pinta el delta. */}
                <EliteText style={[s.subtitulo, th.titulo]}>
                  {estimacion.acotada
                    ? `El rango de este motor empieza en ${estimacion.edadEstimada} años, así que tu estimación se muestra en su piso. Tu edad de calendario es ${estimacion.edadCronologica}.`
                    : estimacion.delta === 0
                      ? `Igual que tu edad de calendario, que es ${estimacion.edadCronologica}.`
                      : estimacion.delta != null && estimacion.delta < 0
                        ? `${Math.abs(estimacion.delta)} por debajo de tu edad de calendario, que es ${estimacion.edadCronologica}.`
                        : `${estimacion.delta} por encima de tu edad de calendario, que es ${estimacion.edadCronologica}.`}
                </EliteText>
              </>
            ) : (
              <>
                <EliteText style={[s.subtitulo, th.titulo]}>
                  Todavía no podemos darte un número. Nos falta {(estimacion.falta ?? 'un dato').toLowerCase()}.
                </EliteText>
                <EliteText style={[s.nota, th.sub]}>
                  Preferimos decirlo a inventarte una cifra. Lo que ya diste
                  quedó guardado y alimenta tu Edad ATP.
                </EliteText>
              </>
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(140).springify()}>
            <EliteText style={[s.seccion, th.sub]}>QUÉ LA MUEVE</EliteText>
            <View style={[s.tarjeta, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
              {estimacion.palancas.map((p) => (
                <View key={p.clave} style={s.palanca}>
                  <View style={s.palancaFila}>
                    <EliteText style={[s.texto, th.titulo]}>{p.titulo}</EliteText>
                    <EliteText style={[s.palancaValor, th.sub]}>{p.valor ?? 'Sin dato'}</EliteText>
                  </View>
                  <EliteText style={[s.nota, th.sub]}>{p.nota}</EliteText>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <EliteText style={[s.seccion, th.sub]}>QUÉ LA VOLVERÍA PRECISA</EliteText>
            <View style={[s.tarjeta, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde }]}>
              {estimacion.paraSerPrecisa.map((d) => (
                <View key={d} style={s.palancaFila}>
                  <Ionicons name="add-circle-outline" size={15} color={th.tokens.textoSecundario} />
                  <EliteText style={[s.texto, th.titulo, { flex: 1 }]}>{d}</EliteText>
                </View>
              ))}
              <EliteText style={[s.nota, th.sub]}>
                Con esos dos, tu Edad ATP se calcula completa y vive en su propia
                app. Este número no la sustituye ni se guarda como si lo fuera.
              </EliteText>
            </View>
          </Animated.View>
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>

        <View style={s.barraInferior}>
          {errorCierre && (
            <EliteText style={[s.nota, { color: th.tokens.error }]}>{errorCierre}</EliteText>
          )}
          <AnimatedPressable style={s.cta} onPress={continuar} disabled={avanzando}>
            <EliteText style={s.ctaTexto}>
              {avanzando ? 'Un momento' : errorCierre ? 'Reintentar' : 'Ver mi día 1'}
            </EliteText>
            {!avanzando && !errorCierre && (
              <Ionicons name="arrow-forward" size={18} color={TEXT_COLORS.onAccent} />
            )}
          </AnimatedPressable>
        </View>
      </OnboardingShell>
    );
  }

  // ─── La captura ───
  return (
    <OnboardingShell step={numeroDePantalla('punto-de-partida')} totalSteps={TOTAL_PANTALLAS_PRIMERA_SESION}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)}>
            <EliteText style={[s.titulo, th.titulo]}>Tu punto de partida</EliteText>
            <EliteText style={[s.subtitulo, th.sub]}>
              Cinco respuestas y te damos tu número en esta misma pantalla. No
              hay que esperar a ningún estudio.
            </EliteText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(80).springify()}>
            <EliteText style={[s.campoLabel, th.sub]}>SEXO BIOLÓGICO</EliteText>
            <View style={s.filaSexo}>
              {(['male', 'female'] as const).map((v) => (
                <AnimatedPressable
                  key={v}
                  style={[
                    s.botonSexo,
                    { backgroundColor: th.tokens.hundido, borderColor: th.tokens.borde },
                    sexo === v && s.botonSexoActivo,
                  ]}
                  onPress={() => { haptic.light(); setSexo(v); }}
                >
                  <Ionicons
                    name={v === 'male' ? 'man-outline' : 'woman-outline'}
                    size={22}
                    color={sexo === v ? TEXT_COLORS.onAccent : th.tokens.textoSecundario}
                  />
                  <EliteText style={[s.botonSexoTexto, th.sub, sexo === v && { color: TEXT_COLORS.onAccent }]}>
                    {v === 'male' ? 'Hombre' : 'Mujer'}
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(140).springify()}>
            <EliteText style={[s.campoLabel, th.sub]}>FECHA DE NACIMIENTO</EliteText>
            <View style={s.filaFecha}>
              <TextInput
                style={[s.campo, th.input, s.campoFecha]} placeholder="DD" placeholderTextColor={th.tokens.textoTenue}
                value={dia} onChangeText={(t) => setDia(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad" maxLength={2}
              />
              <TextInput
                style={[s.campo, th.input, s.campoFecha]} placeholder="MM" placeholderTextColor={th.tokens.textoTenue}
                value={mes} onChangeText={(t) => setMes(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad" maxLength={2}
              />
              <TextInput
                style={[s.campo, th.input, s.campoAnio]} placeholder="AAAA" placeholderTextColor={th.tokens.textoTenue}
                value={anio} onChangeText={(t) => setAnio(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad" maxLength={4}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <View style={s.filaMedidas}>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.campoLabel, th.sub]}>ESTATURA (CM)</EliteText>
                <TextInput
                  style={[s.campo, th.input]} placeholder="170" placeholderTextColor={th.tokens.textoTenue}
                  value={talla} onChangeText={(t) => setTalla(t.replace(/[^\d.,]/g, '').slice(0, 5))}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.campoLabel, th.sub]}>PESO (KG)</EliteText>
                <TextInput
                  style={[s.campo, th.input]} placeholder="70" placeholderTextColor={th.tokens.textoTenue}
                  value={peso} onChangeText={(t) => setPeso(t.replace(/[^\d.,]/g, '').slice(0, 5))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(260).springify()}>
            <EliteText style={[s.campoLabel, th.sub]}>¿CUÁNTO TE MUEVES A LA SEMANA?</EliteText>
            <View style={s.filaMovimiento}>
              {MOVIMIENTO.map((m) => {
                const activo = movimiento?.id === m.id;
                return (
                  <AnimatedPressable
                    key={m.id}
                    style={[
                      s.chip,
                      { backgroundColor: th.tokens.hundido, borderColor: activo ? ATP_BRAND.lime : th.tokens.borde },
                    ]}
                    onPress={() => { haptic.light(); setMovimiento(m); }}
                  >
                    <EliteText style={[s.chipTexto, activo ? th.titulo : th.sub]}>{m.texto}</EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
            <EliteText style={[s.nota, th.sub]}>
              Contando caminatas. Es la palanca que mueve tu número, así que sin
              ella no podemos dártelo.
            </EliteText>
          </Animated.View>

          {errorGuardado && (
            <View style={[s.tarjeta, { backgroundColor: th.tokens.card, borderColor: th.tokens.borde, marginTop: Spacing.md }]}>
              <EliteText style={[s.texto, { color: th.tokens.error }]}>{errorGuardado}</EliteText>
            </View>
          )}
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>

        <View style={s.barraInferior}>
          <AnimatedPressable
            style={[s.cta, !completo && th.ctaDisabled]}
            onPress={verMiNumero}
            disabled={!completo || fase === 'guardando'}
          >
            <EliteText style={[s.ctaTexto, !completo && { opacity: 0.4 }]}>
              {fase === 'guardando' ? 'Un momento' : 'Ver mi punto de partida'}
            </EliteText>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>

      {/* Menor de 18: bloqueo duro. CB-4 se firmó en el registro, pero la
          fecha es la que lo sostiene, y aquí es donde por fin existe. */}
      {menorDeEdad && (
        <AgeGateModal
          visible
          onExit={async () => {
            setMenorDeEdad(false);
            try { await signOut(); } catch { /* igual navegamos */ }
            router.replace('/login');
          }}
          onDismiss={() => setMenorDeEdad(false)}
        />
      )}
    </OnboardingShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.md },
  centrado: { textAlign: 'center' },

  antetitulo: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2, marginTop: 24 },
  titulo: { fontSize: 26, lineHeight: 32, fontFamily: Fonts.bold, marginTop: 20 },
  subtitulo: { fontSize: FontSizes.sm, lineHeight: 21, fontFamily: Fonts.regular, marginTop: 10 },

  numeroFila: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  numero: { fontSize: 68, lineHeight: 76, fontFamily: Fonts.extraBold },
  numeroUnidad: { fontSize: FontSizes.lg, fontFamily: Fonts.semiBold },
  etiqueta: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, marginTop: 2 },

  seccion: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2, marginTop: Spacing.lg, marginBottom: 8 },
  tarjeta: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, gap: 10 },
  texto: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20 },
  nota: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 17, marginTop: 4 },
  palanca: { gap: 2 },
  palancaFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  palancaValor: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  campoLabel: { fontFamily: Fonts.semiBold, fontSize: 10, letterSpacing: 2, marginTop: Spacing.lg, marginBottom: 8 },
  campo: {
    borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: FontSizes.md, fontFamily: Fonts.regular, borderWidth: 0.5,
  },
  filaFecha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campoFecha: { flex: 1, textAlign: 'center' },
  campoAnio: { flex: 1.5, textAlign: 'center' },
  filaMedidas: { flexDirection: 'row', gap: 12 },
  filaSexo: { flexDirection: 'row', gap: 12 },
  botonSexo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Radius.lg, paddingVertical: 15, borderWidth: 1,
  },
  botonSexoActivo: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  botonSexoTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  filaMovimiento: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  chipTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },

  barraInferior: { paddingHorizontal: Spacing.md, paddingBottom: 28, paddingTop: Spacing.xs },
  cta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaTexto: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
  saltar: { paddingVertical: 12, alignItems: 'center' },
  saltarTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
});
