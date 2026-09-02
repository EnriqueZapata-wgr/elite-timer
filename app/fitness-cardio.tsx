/**
 * Tu perfil de cardio: zonas de frecuencia cardiaca, VO2max estimado y tu semana.
 * Desde aquí registras sesiones a mano o las importas de tu app de salud.
 *
 * BETA (31-ago-2026): la pantalla VIVA del cardio. Antes era un redirect a
 * /log-cardio (Ola 2 PR3); el registro y la importación siguen viviendo allá,
 * aquí vive lo que ninguna otra pantalla decía: qué significa tu cardio.
 *
 *   Arriba:  perfil (FC máxima estimada, FC en reposo, zonas, VO2max
 *            estimado con su método y su fuente).
 *   Medio:   la semana (sesiones, minutos, km) y minutos por zona.
 *   Abajo:   registrar, importar de tu app de salud, test de Cooper.
 *
 * Cada número que sale de una fórmula lleva la palabra "estimado" y el
 * método; las fórmulas y sus citas viven en cardio-core.ts (PENDIENTE FIRMA
 * MARIANA). Esta pantalla no calcula nada: pinta lo que el servicio trae y
 * dice qué dato falta cuando algo no se puede estimar.
 */
import { useCallback, useState } from 'react';
import {
  View, ScrollView, StyleSheet, ActivityIndicator, Pressable, TextInput,
  RefreshControl, DeviceEventEmitter,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, colorNivel } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { useAuth } from '@/src/contexts/auth-context';
import { formatLocalDate } from '@/src/utils/date-helpers';
import {
  cargarPerfilCardio, guardarFcReposo,
  type PerfilCardio, type FuenteFcReposo,
} from '@/src/services/fitness/cardio-perfil-service';
import { FUENTES_CARDIO, type MinutosPorZona } from '@/src/services/fitness/cardio-core';

const FUENTE_FC: Record<FuenteFcReposo, string> = {
  manual: 'capturada a mano',
  edad_atp: 'capturada en Edad ATP',
  healthkit: 'de Apple Salud',
  health_connect: 'de Health Connect',
  otra: 'de tu app de salud',
};

const ESTADO_VO2 = {
  optimo: 'Óptimo',
  aceptable: 'Aceptable',
  atencion: 'Atención',
} as const;

const DISCIPLINA: Record<string, string> = {
  running: 'Correr', cycling: 'Ciclismo', swimming: 'Natación', rowing: 'Remo', other: 'Otro',
};

export default function FitnessCardioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilCardio | null>(null);

  const cargar = useCallback(async () => {
    if (!user) { setFallo('No se pudo leer tu cardio.'); setCargando(false); return; }
    const r = await cargarPerfilCardio(user.id);
    if (r.error || !r.perfil) {
      setFallo(r.error ?? 'No se pudo leer tu cardio.');
    } else {
      setFallo(null);
      setPerfil(r.perfil);
    }
    setCargando(false);
    setRefrescando(false);
  }, [user]);

  // Al volver de registrar o importar, la semana cambia: se relee al focus.
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  return (
    <ThemeReady>
    <View style={[s.screen, { backgroundColor: t.fondo }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader
        title="Cardio"
        rightAction={(
          <View style={[s.beta, { borderColor: t.bordeMarcado }]}>
            <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: 10, letterSpacing: 1 }}>BETA</EliteText>
          </View>
        )}
      />

      {cargando ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={acento} />
        </View>
      ) : fallo ? (
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={t.textoSecundario} />
          <EliteText variant="body" style={[s.centerTitle, { color: t.texto }]}>{fallo}</EliteText>
          <EliteText variant="caption" style={[s.centerSub, { color: t.textoSecundario }]}>
            Tus sesiones siguen guardadas. Revisa tu conexión.
          </EliteText>
          <Pressable
            onPress={() => { setCargando(true); cargar(); }}
            style={[s.reintentar, { borderColor: t.bordeMarcado }]}
          >
            <EliteText variant="caption" style={{ color: t.texto, fontWeight: '700', letterSpacing: 1 }}>REINTENTAR</EliteText>
          </Pressable>
        </View>
      ) : perfil ? (
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={(
            <RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} tintColor={acento} />
          )}
        >
          <Animated.View entering={FadeInUp.delay(40).springify()}>
            <EliteText variant="caption" style={[s.betaNota, { color: t.textoSecundario }]}>
              Beta. Lo marcado como estimado sale de una fórmula publicada, no de una medición. Cada una dice su método.
            </EliteText>
          </Animated.View>

          {/* ── Perfil ── */}
          <Animated.View entering={FadeInUp.delay(80).springify()}>
            <EliteText style={[s.label, { color: t.textoSecundario }]}>TU PERFIL</EliteText>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              <PerfilFila
                titulo="FC máxima estimada"
                valor={perfil.fcMax != null ? `${perfil.fcMax}` : null}
                unidad="bpm"
                detalle={perfil.fcMax != null && perfil.edad != null
                  ? `Tanaka 2001 (208 menos 0.7 por edad) con tu edad: ${perfil.edad} años`
                  : perfil.edad == null
                    ? (perfil.lecturasFallidas.includes('perfil') ? 'No se pudo leer tu perfil' : 'Falta tu fecha de nacimiento en tu perfil')
                    : 'La fórmula de Tanaka cubre de 18 a 81 años; fuera de ahí no estimamos'}
                accion={perfil.edad == null && !perfil.lecturasFallidas.includes('perfil') ? { label: 'Completar perfil', onPress: () => router.push('/profile') } : undefined}
                acento={acento}
              />
              <View style={[s.sep, { backgroundColor: t.borde }]} />
              <FcReposoFila perfil={perfil} userId={user?.id ?? null} acento={acento} onGuardada={cargar} />
            </View>
          </Animated.View>

          {/* ── Zonas ── */}
          <Animated.View entering={FadeInUp.delay(120).springify()}>
            <EliteText style={[s.label, { color: t.textoSecundario }]}>ZONAS DE FC ESTIMADAS</EliteText>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              {perfil.zonas ? (
                <>
                  {perfil.zonas.map((z) => (
                    <View key={z.zona} style={s.zonaRow}>
                      <View style={[s.zonaPunto, { backgroundColor: colorNivel(z.zona - 1, kind) }]} />
                      <EliteText style={[s.zonaNombre, { color: t.texto }]}>Z{z.zona} · {z.nombre}</EliteText>
                      <EliteText style={[s.zonaPct, { color: t.textoSecundario }]}>{z.pctDesde} a {z.pctHasta} %</EliteText>
                      <EliteText style={[s.zonaBpm, { color: t.texto }]}>{z.desde} a {z.zona === 5 ? z.hasta : z.hasta - 1}</EliteText>
                    </View>
                  ))}
                  <EliteText variant="caption" style={[s.pie, { color: t.textoSecundario }]}>
                    Karvonen: FC reposo más un porcentaje de tu FC de reserva (FC máxima menos FC reposo). Los cinco cortes (50, 60, 70, 80 y 90 %) son una convención de la app, no de la publicación; ACSM 2018 usa otros. Pendiente de validación.
                  </EliteText>
                </>
              ) : (
                <EliteText variant="caption" style={{ color: t.textoSecundario, lineHeight: 18 }}>
                  {perfil.fcMax == null && perfil.fcReposo == null
                    ? 'Para tus zonas hacen falta dos datos: tu edad (FC máxima) y tu FC en reposo.'
                    : perfil.fcMax == null
                      ? 'Para tus zonas falta tu FC máxima estimada, que sale de tu edad.'
                      : 'Para tus zonas falta tu FC en reposo. Captúrala arriba: es una caja.'}
                </EliteText>
              )}
            </View>
          </Animated.View>

          {/* ── VO2max ── */}
          <Animated.View entering={FadeInUp.delay(160).springify()}>
            <EliteText style={[s.label, { color: t.textoSecundario }]}>VO2MAX</EliteText>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              {perfil.vo2 ? (
                <>
                  <View style={s.vo2Row}>
                    <EliteText style={[s.vo2Valor, { color: acento }]}>{perfil.vo2.valor.toFixed(1)}</EliteText>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[s.vo2Unidad, { color: t.textoSecundario }]}>ml/kg/min · estimado</EliteText>
                      <EliteText variant="caption" style={{ color: t.texto, marginTop: 2 }}>{perfil.vo2.detalle}</EliteText>
                      {perfil.vo2.fecha ? <EliteText variant="caption" style={{ color: t.textoSecundario }}>{fechaCorta(perfil.vo2.fecha)}</EliteText> : null}
                    </View>
                  </View>
                  {perfil.clasificacionVo2 ? (
                    <>
                      <EliteText variant="caption" style={[s.pie, { color: colorEstado(perfil.clasificacionVo2.estado, t) }]}>
                        {ESTADO_VO2[perfil.clasificacionVo2.estado]} según la matriz de salud funcional ATP: tu valor cae en la banda {perfil.clasificacionVo2.banda.lo != null ? `${perfil.clasificacionVo2.banda.lo} a ${perfil.clasificacionVo2.banda.hi}` : `hasta ${perfil.clasificacionVo2.banda.hi}`} ml/kg/min.
                      </EliteText>
                      <EliteText variant="caption" style={{ color: t.textoSecundario, lineHeight: 17, marginTop: 4 }}>
                        La matriz ATP usa una sola banda para todas las edades y sexos; pendiente de validación clínica.
                      </EliteText>
                    </>
                  ) : (
                    <EliteText variant="caption" style={[s.pie, { color: t.textoSecundario }]}>
                      {perfil.sexo == null
                        ? (perfil.sexoRegistrado
                          ? 'Clasificación pendiente: la matriz ATP solo tiene bandas para hombre y mujer.'
                          : 'Clasificación pendiente: falta tu sexo biológico en tu perfil.')
                        : 'Clasificación pendiente de validación clínica.'}
                    </EliteText>
                  )}
                  {perfil.vo2Alternativas.length > 1 ? (
                    <View style={{ marginTop: Spacing.sm }}>
                      {perfil.vo2Alternativas.slice(1).map((alt) => (
                        <EliteText key={alt.metodo} variant="caption" style={{ color: t.textoSecundario, lineHeight: 18 }}>
                          También: {alt.valor.toFixed(1)} estimado por {alt.detalle}.
                        </EliteText>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <EliteText variant="caption" style={{ color: t.textoSecundario, lineHeight: 18 }}>
                  {perfil.fcMax != null && perfil.fcReposo == null
                    ? 'Con tu FC en reposo estimamos tu VO2max por el método de Uth (2004). O haz el test de Cooper.'
                    : perfil.fcMax == null && perfil.fcReposo != null
                      ? 'Para estimar por Uth falta tu FC máxima (tu edad). O haz el test de Cooper.'
                      : 'Sin FC máxima ni FC en reposo no hay estimación. El test de Cooper te da un VO2max con solo correr 12 minutos.'}
                </EliteText>
              )}
              <Pressable onPress={() => { haptic.light(); router.push('/tests/run/cooper'); }} style={s.linkRow}>
                <EliteText variant="caption" style={{ color: acento, fontWeight: '700', letterSpacing: 0.5 }}>TEST DE COOPER 12 MIN</EliteText>
                <Ionicons name="chevron-forward" size={14} color={acento} />
              </Pressable>
            </View>
          </Animated.View>

          {/* ── La semana ── */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <EliteText style={[s.label, { color: t.textoSecundario }]}>ÚLTIMOS 7 DÍAS</EliteText>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              {perfil.semana.sesiones === 0 ? (
                <EliteText variant="caption" style={{ color: t.textoSecundario, lineHeight: 18 }}>
                  {perfil.ventana28.sesiones === 0
                    ? 'Sin sesiones en los últimos 28 días. Registra una o importa las de tu app de salud.'
                    : `Sin sesiones esta semana. En 28 días llevas ${perfil.ventana28.sesiones} (${perfil.ventana28.totalMin} min).`}
                </EliteText>
              ) : (
                <>
                  <View style={s.statsRow}>
                    <Stat valor={String(perfil.semana.sesiones)} label={perfil.semana.sesiones === 1 ? 'sesión' : 'sesiones'} acento={acento} tenue={t.textoSecundario} />
                    <Stat valor={String(perfil.semana.totalMin)} label="min" acento={acento} tenue={t.textoSecundario} />
                    <Stat valor={perfil.semana.km > 0 ? perfil.semana.km.toFixed(1) : '—'} label="km" acento={acento} tenue={t.textoSecundario} />
                    <Stat valor={`${perfil.semana.conFC}/${perfil.semana.sesiones}`} label="con FC" acento={acento} tenue={t.textoSecundario} />
                  </View>
                  <EliteText variant="caption" style={{ color: t.textoSecundario, marginTop: Spacing.xs }}>
                    En 28 días: {perfil.ventana28.sesiones} sesiones, {perfil.ventana28.totalMin} min{perfil.ventana28.km > 0 ? `, ${perfil.ventana28.km.toFixed(1)} km` : ''}.
                  </EliteText>
                </>
              )}
            </View>
          </Animated.View>

          {/* ── Minutos por zona ── */}
          <Animated.View entering={FadeInUp.delay(240).springify()}>
            <EliteText style={[s.label, { color: t.textoSecundario }]}>MINUTOS POR ZONA (7 DÍAS)</EliteText>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              <CargaPorZona carga={perfil.cargaSemana} zonasListas={perfil.zonas != null} kind={kind} />
            </View>
          </Animated.View>

          {/* ── Sesiones recientes ── */}
          {perfil.sesiones28.length > 0 ? (
            <Animated.View entering={FadeInUp.delay(280).springify()}>
              <EliteText style={[s.label, { color: t.textoSecundario }]}>SESIONES RECIENTES</EliteText>
              <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
                {perfil.sesiones28.slice(0, 5).map((ses, i) => (
                  <View key={`${ses.date}-${i}`} style={[s.sesRow, i > 0 && { borderTopColor: t.borde, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <EliteText variant="caption" style={{ color: t.textoSecundario, width: 78 }}>{fechaCorta(ses.date)}</EliteText>
                    <EliteText variant="caption" style={{ color: t.texto, flex: 1 }}>{DISCIPLINA[ses.discipline] ?? ses.discipline}</EliteText>
                    <EliteText variant="caption" style={{ color: t.texto }}>
                      {ses.duration_seconds != null ? `${Math.round(ses.duration_seconds / 60)} min` : '—'}
                      {ses.distance_meters != null ? ` · ${(ses.distance_meters / 1000).toFixed(1)} km` : ''}
                      {ses.avg_heart_rate != null ? ` · ${ses.avg_heart_rate} bpm` : ''}
                    </EliteText>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* ── Accesos ── */}
          <Animated.View entering={FadeInUp.delay(320).springify()} style={{ marginTop: Spacing.md }}>
            <GradientCTA
              label="REGISTRAR SESIÓN"
              pillar="fitness"
              icon="add"
              onPress={() => { haptic.light(); router.push('/log-cardio'); }}
            />
            <AnimatedPressable
              style={[s.importRow, { borderColor: t.borde }]}
              onPress={() => { haptic.light(); router.push('/log-cardio?fase=importar'); }}
            >
              <Ionicons name="download-outline" size={18} color={acento} />
              <EliteText style={[s.importText, { color: acento }]}>IMPORTAR DE TU APP DE SALUD</EliteText>
            </AnimatedPressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(360).springify()}>
            <EliteText variant="caption" style={[s.fuentes, { color: t.textoSecundario }]}>
              Fuentes: {FUENTES_CARDIO.tanaka2001} {FUENTES_CARDIO.karvonen1957} {FUENTES_CARDIO.uth2004} {FUENTES_CARDIO.cooper1968}
            </EliteText>
          </Animated.View>

          <View style={{ height: 32 }} />
        </ScrollView>
      ) : null}
    </View>
    </ThemeReady>
  );
}

// ── Piezas ──

function PerfilFila({ titulo, valor, unidad, detalle, accion, acento }: {
  titulo: string; valor: string | null; unidad: string; detalle: string;
  accion?: { label: string; onPress: () => void }; acento: string;
}) {
  const { tokens: t } = useAppTheme();
  return (
    <View style={s.perfilFila}>
      <View style={{ flex: 1 }}>
        <EliteText style={[s.perfilTitulo, { color: t.textoSecundario }]}>{titulo}</EliteText>
        <EliteText variant="caption" style={{ color: t.texto, marginTop: 2, lineHeight: 17 }}>{detalle}</EliteText>
        {accion ? (
          <Pressable onPress={() => { haptic.light(); accion.onPress(); }} style={s.linkRow}>
            <EliteText variant="caption" style={{ color: acento, fontWeight: '700', letterSpacing: 0.5 }}>{accion.label.toUpperCase()}</EliteText>
            <Ionicons name="chevron-forward" size={14} color={acento} />
          </Pressable>
        ) : null}
      </View>
      <View style={s.perfilValorCol}>
        <EliteText style={[s.perfilValor, { color: valor != null ? acento : t.textoSecundario }]}>{valor ?? '—'}</EliteText>
        <EliteText variant="caption" style={{ color: t.textoSecundario }}>{unidad}</EliteText>
      </View>
    </View>
  );
}

/** FC en reposo: se muestra la leída (con fuente y fecha) y siempre se puede
 *  capturar a mano. Va a health_measurements.resting_hr de HOY, la misma
 *  columna que /edad-atp/vitals (no se toca app/medidas.tsx esta noche). */
function FcReposoFila({ perfil, userId, acento, onGuardada }: {
  perfil: PerfilCardio; userId: string | null; acento: string; onGuardada: () => void;
}) {
  const { tokens: t } = useAppTheme();
  const [editando, setEditando] = useState(false);
  const [bpm, setBpm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!userId) return;
    const n = parseInt(bpm, 10);
    setGuardando(true);
    setError(null);
    const r = await guardarFcReposo(userId, n);
    setGuardando(false);
    if (r.error) { setError(r.error); return; }
    haptic.success();
    setEditando(false);
    setBpm('');
    // Edad ATP y el score leen la misma fila: que se enteren.
    DeviceEventEmitter.emit('day_changed');
    onGuardada();
  };

  const fc = perfil.fcReposo;
  return (
    <View style={s.perfilFila}>
      <View style={{ flex: 1 }}>
        <EliteText style={[s.perfilTitulo, { color: t.textoSecundario }]}>FC en reposo</EliteText>
        <EliteText variant="caption" style={{ color: t.texto, marginTop: 2, lineHeight: 17 }}>
          {fc
            ? `${FUENTE_FC[fc.fuente]} el ${fechaCorta(fc.fecha)}`
            : perfil.lecturasFallidas.includes('medidas')
              ? 'No se pudieron leer tus medidas'
              : perfil.lecturasFallidas.includes('wearable')
                ? 'No se pudo leer tu app de salud. Puedes capturarla a mano.'
                : 'Sin dato. Tómala al despertar, antes de levantarte.'}
        </EliteText>
        {editando ? (
          <View style={{ marginTop: Spacing.sm }}>
            <View style={s.fcInputRow}>
              <TextInput
                style={[s.fcInput, { color: t.texto, backgroundColor: t.hundido, borderColor: t.borde }]}
                value={bpm}
                onChangeText={setBpm}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={t.textoTenue}
                maxLength={3}
                autoFocus
              />
              <EliteText variant="caption" style={{ color: t.textoSecundario }}>bpm</EliteText>
              <Pressable
                onPress={guardar}
                disabled={guardando || bpm.length === 0}
                style={[s.fcGuardar, { backgroundColor: bpm.length === 0 ? t.hundido : ATP_BRAND.lime }]}
              >
                <EliteText variant="caption" style={{ color: bpm.length === 0 ? t.textoSecundario : t.textoSobreLima, fontWeight: '700', letterSpacing: 0.5 }}>
                  {guardando ? 'GUARDANDO' : 'GUARDAR'}
                </EliteText>
              </Pressable>
              <Pressable onPress={() => { setEditando(false); setError(null); }} hitSlop={8}>
                <Ionicons name="close" size={18} color={t.textoSecundario} />
              </Pressable>
            </View>
            {error ? <EliteText variant="caption" style={{ color: t.critico, marginTop: 4 }}>{error}</EliteText> : null}
          </View>
        ) : (
          <Pressable onPress={() => { haptic.light(); setEditando(true); }} style={s.linkRow}>
            <EliteText variant="caption" style={{ color: acento, fontWeight: '700', letterSpacing: 0.5 }}>{fc ? 'ACTUALIZAR' : 'CAPTURAR'}</EliteText>
            <Ionicons name="chevron-forward" size={14} color={acento} />
          </Pressable>
        )}
      </View>
      <View style={s.perfilValorCol}>
        <EliteText style={[s.perfilValor, { color: fc ? acento : t.textoSecundario }]}>{fc ? String(fc.bpm) : '—'}</EliteText>
        <EliteText variant="caption" style={{ color: t.textoSecundario }}>bpm</EliteText>
      </View>
    </View>
  );
}

function Stat({ valor, label, acento, tenue }: { valor: string; label: string; acento: string; tenue: string }) {
  return (
    <View style={s.stat}>
      <EliteText style={[s.statValor, { color: acento }]}>{valor}</EliteText>
      <EliteText variant="caption" style={{ color: tenue }}>{label}</EliteText>
    </View>
  );
}

function CargaPorZona({ carga, zonasListas, kind }: { carga: MinutosPorZona | null; zonasListas: boolean; kind: 'dark' | 'light' }) {
  const { tokens: t } = useAppTheme();
  if (!zonasListas || !carga) {
    return (
      <EliteText variant="caption" style={{ color: t.textoSecundario, lineHeight: 18 }}>
        Sin zonas no hay reparto: completa FC máxima y FC en reposo arriba.
      </EliteText>
    );
  }
  if (carga.sesiones === 0) {
    return <EliteText variant="caption" style={{ color: t.textoSecundario, lineHeight: 18 }}>Sin sesiones esta semana.</EliteText>;
  }
  const max = Math.max(1, ...carga.minutos, carga.bajoZona1);
  return (
    <View>
      {carga.minutos.map((min, i) => (
        <View key={i} style={s.barraRow}>
          <EliteText variant="caption" style={{ color: t.texto, width: 26 }}>Z{i + 1}</EliteText>
          <View style={[s.barraPista, { backgroundColor: t.hundido }]}>
            <View style={[s.barra, { width: `${Math.round((min / max) * 100)}%`, backgroundColor: colorNivel(i, kind) }]} />
          </View>
          <EliteText variant="caption" style={{ color: t.texto, width: 54, textAlign: 'right' }}>{min} min</EliteText>
        </View>
      ))}
      {carga.bajoZona1 > 0 ? (
        <EliteText variant="caption" style={{ color: t.textoSecundario, marginTop: 4 }}>Por debajo de Z1: {carga.bajoZona1} min.</EliteText>
      ) : null}
      {carga.sinFC > 0 ? (
        <EliteText variant="caption" style={{ color: t.textoSecundario, marginTop: 4 }}>
          Sin FC media: {carga.sinFC} min ({carga.sesiones - carga.sesionesConFC} {carga.sesiones - carga.sesionesConFC === 1 ? 'sesión' : 'sesiones'}). Agrega la FC al registrar para ubicarlas.
        </EliteText>
      ) : null}
      <EliteText variant="caption" style={[s.pie, { color: t.textoSecundario }]}>
        Cada sesión entera cuenta en la zona de su FC media. Una sesión con intervalos tiene una media que no vivió en ninguna zona: es una aproximación.
      </EliteText>
    </View>
  );
}

/** "31 de agosto": fecha local YYYY-MM-DD en español, sin año (siempre son días recientes). */
function fechaCorta(fecha: string): string {
  try {
    return formatLocalDate(fecha, { day: 'numeric', month: 'long' });
  } catch {
    return fecha;
  }
}

function colorEstado(estado: 'optimo' | 'aceptable' | 'atencion', t: { exito: string; advertencia: string; critico: string }): string {
  return estado === 'optimo' ? t.exito : estado === 'aceptable' ? t.advertencia : t.critico;
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  centerTitle: { marginTop: Spacing.md, textAlign: 'center' },
  centerSub: { marginTop: Spacing.xs, textAlign: 'center' },
  reintentar: { marginTop: 20, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1 },
  beta: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  betaNota: { lineHeight: 18, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  label: {
    fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1.5,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.sm },
  perfilFila: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  perfilTitulo: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 0.3 },
  perfilValorCol: { alignItems: 'flex-end', minWidth: 56 },
  perfilValor: { fontFamily: Fonts.bold, fontSize: 30, lineHeight: 34, fontVariant: ['tabular-nums'] },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: Spacing.sm, alignSelf: 'flex-start' },
  fcInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fcInput: {
    width: 72, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 10,
    fontFamily: Fonts.bold, fontSize: FontSizes.lg, textAlign: 'center',
  },
  fcGuardar: { borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 14 },
  zonaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  zonaPunto: { width: 10, height: 10, borderRadius: 5 },
  zonaNombre: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  zonaPct: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, width: 64, textAlign: 'right' },
  zonaBpm: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, width: 84, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pie: { marginTop: Spacing.sm, lineHeight: 17 },
  vo2Row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  vo2Valor: { fontFamily: Fonts.bold, fontSize: 40, lineHeight: 44, fontVariant: ['tabular-nums'] },
  vo2Unidad: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValor: { fontFamily: Fonts.bold, fontSize: FontSizes.xl, fontVariant: ['tabular-nums'] },
  barraRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  barraPista: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barra: { height: 10, borderRadius: 5 },
  sesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8 },
  importRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    marginTop: Spacing.md, paddingVertical: 12, borderRadius: Radius.lg, borderWidth: 1,
  },
  importText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
  fuentes: { marginTop: Spacing.lg, lineHeight: 16, fontSize: 10 },
});
