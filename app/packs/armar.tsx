/**
 * Ármala por mí — la entrada de dos preguntas (MB-25 Pieza 3, en etapas
 * desde MB-26 Pieza 7).
 *
 * Dos preguntas y la app queda armada para TU dolor:
 *   1. ¿Qué quieres cambiar primero?  → elige el pack.
 *   2. ¿A qué hora despiertas y a qué hora te duermes? → ancla TODAS las
 *      horas del pack a tu vida (como regla: viajar o cambiar tu horario
 *      las recorre solas).
 *
 * La pregunta de intensidad murió (menos decisiones): el pack entra POR
 * ETAPAS — aplicar enciende sus 3 hábitos base y los demás llegan cuando
 * los sostienes 14 de 21 días, o antes si los adelantas en la ficha.
 * MB-27 V3 (doctrina): el techo murió como límite — aplicar es aplicar,
 * sin aviso; el conteo vive en HOY y la salida en /ordenar-dia.
 *
 * Una acción por pantalla. Al confirmar, el resumen dice lo que DE VERDAD
 * pasó (pack-service reporta paso por paso): esto se instaló, esto se
 * encendió, así te avisamos — y lo que no entró, también.
 *
 * Se llega desde el Centro (sección de packs), desde la ficha de un pack
 * (?pack= deja la pregunta 1 contestada) y desde el final del onboarding
 * (?origen=onboarding sale hacia /argos/meet, el mismo destino de siempre).
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { TimeWheelPicker } from '@/src/components/ui/TimeWheelPicker';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import {
  PACKS, PACK_BY_KEY, habitosPorIntensidad,
  type PackDef,
} from '@/src/constants/packs';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import { normalizarHora } from '@/src/services/pack-core';
import { aplicarPack, type ResultadoAplicacion } from '@/src/services/pack-service';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, ELEVATION, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

type Paso = 'pack' | 'horario' | 'resumen';

const nombreElectron = (key: string) =>
  ELECTRON_WEIGHTS[key as ElectronSource]?.name ?? key;

const labelApp = (key: string) => APP_BY_KEY[key]?.label ?? key;

/** 'HH:MM[:SS]' de la base → 'HH:MM' de la UI, o null si no sirve.
 *  MB-27 0.1: normaliza — un cronotipo con '7:00' entra como '07:00',
 *  nunca llega crudo al CHECK de user_packs. */
function horaDeDb(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  return normalizarHora(v.split(':').slice(0, 2).join(':'));
}

export default function ArmarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pack: packParam, origen } = useLocalSearchParams<{ pack?: string; origen?: string }>();
  const desdeOnboarding = origen === 'onboarding';

  // MB-31B: pantalla migrada — parches de tema reutilizados en los 3 pasos.
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const thTexto = { color: tokens.texto };
  const thSec = { color: tokens.textoSecundario };
  const thTenue = { color: dark ? tokens.textoTenue : tokens.textoSecundario };
  const thCard = { backgroundColor: tokens.card, borderColor: tokens.borde };
  const thIcono = dark ? null : { backgroundColor: tokens.hundido, borderColor: tokens.borde };

  const packInicial = typeof packParam === 'string' ? PACK_BY_KEY[packParam] ?? null : null;
  const [pack, setPack] = useState<PackDef | null>(packInicial);
  const [paso, setPaso] = useState<Paso>(packInicial ? 'horario' : 'pack');
  const [despertar, setDespertar] = useState('07:00');
  const [dormir, setDormir] = useState('23:00');
  const [picker, setPicker] = useState<'despertar' | 'dormir' | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAplicacion | null>(null);

  // Pregunta 2 con ventaja: si ya hay cronotipo, sus horas son el punto de
  // partida y el usuario solo confirma o ajusta.
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('user_chronotype')
          .select('wake_time, sleep_time')
          .eq('user_id', user.id)
          .maybeSingle();
        const w = horaDeDb(data?.wake_time);
        const s = horaDeDb(data?.sleep_time);
        if (w) setDespertar(w);
        if (s) setDormir(s);
      } catch { /* defaults */ }
    })();
  }, [user?.id]);

  const salir = () => {
    // Desde el onboarding no hay stack al que volver: se sigue el camino
    // de siempre hacia el primer contacto con ARGOS.
    if (desdeOnboarding) router.replace('/argos/meet');
    else if (router.canGoBack()) router.back();
    else router.replace('/centro');
  };

  const atras = () => {
    if (paso === 'horario' && !packInicial) setPaso('pack');
    else salir();
  };

  // Aplicar = etapa 1: los 3 core del pack. Los demás llegan al sostenerlos
  // 14 de 21 días (o antes, desde la ficha). Los packs se acumulan: aplicar
  // uno jamás toca lo que otro dejó.
  const ejecutar = async () => {
    if (!user?.id || !pack || busy) return;
    setBusy(true);
    try {
      const r = await aplicarPack(user.id, pack.key, { intensidad: 'suave', despertar, dormir });
      setResultado(r);
      setPaso('resumen');
      if (r.ok) haptic.success();
    } finally {
      setBusy(false);
    }
  };

  // MB-27 V3 (doctrina): el techo murió como límite — aplicar es aplicar,
  // cero fricción. El conteo de renglones vive en HOY como información
  // siempre visible, y la salida (reposo/graduación) en /ordenar-dia.
  const confirmarAplicar = () => {
    if (!user?.id || !pack || busy) return;
    haptic.medium();
    ejecutar();
  };

  // ─── Paso 1 · el pack ───

  const renderPack = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={FadeInUp.delay(40).springify()}>
        <EliteText style={[s.pregunta, thTexto]}>¿Qué quieres cambiar primero?</EliteText>
        <EliteText style={[s.hint, thSec]}>
          Elige un pack y armamos tu app para eso: apps, hábitos con su hora,
          metas y avisos. Todo se puede ajustar después.
        </EliteText>
      </Animated.View>
      {PACKS.map((p, i) => (
        <Animated.View key={p.key} entering={FadeInUp.delay(80 + i * 40).springify()}>
          <AnimatedPressable
            style={[s.packCard, thCard]}
            onPress={() => { haptic.light(); setPack(p); setPaso('horario'); }}
          >
            <View style={[s.packIcon, thIcono]}>
              <AppIcon name={p.icon} size={22} color={tokens.textoSecundario} />
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={[s.packNombre, thTexto]}>{p.nombre}</EliteText>
              <EliteText style={[s.packParaQuien, thSec]}>{p.paraQuien}</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.sinDatos} />
          </AnimatedPressable>
        </Animated.View>
      ))}
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );

  // ─── Paso 2 · el horario ───

  const renderHorario = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={FadeInUp.delay(40).springify()}>
        <EliteText style={[s.pregunta, thTexto]}>¿A qué hora despiertas y a qué hora te duermes?</EliteText>
        <EliteText style={[s.hint, thSec]}>
          Con esto anclamos cada hábito y cada aviso del pack a tu día real.
          Es la diferencia entre un recordatorio útil y uno que se ignora.
        </EliteText>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(100).springify()} style={[s.grupo, thCard]}>
        <AnimatedPressable
          style={[s.horaRow, s.rowDivider, { borderBottomColor: tokens.borde }]}
          onPress={() => { haptic.light(); setPicker('despertar'); }}
        >
          <AppIcon name="sol" size={18} color={tokens.textoSecundario} />
          <EliteText style={[s.horaLabel, thTexto]}>Despierto a las</EliteText>
          {/* La hora es dato: en claro el lima no es texto (regla 1). */}
          <EliteText style={[s.horaValor, !dark && { color: tokens.tealTexto }]}>{despertar}</EliteText>
        </AnimatedPressable>
        <AnimatedPressable
          style={s.horaRow}
          onPress={() => { haptic.light(); setPicker('dormir'); }}
        >
          <AppIcon name="sueno" size={18} color={tokens.textoSecundario} />
          <EliteText style={[s.horaLabel, thTexto]}>Me duermo a las</EliteText>
          <EliteText style={[s.horaValor, !dark && { color: tokens.tealTexto }]}>{dormir}</EliteText>
        </AnimatedPressable>
      </Animated.View>
      {pack && (
        <Animated.View entering={FadeInUp.delay(130).springify()}>
          <EliteText style={[s.etapaNota, thTenue]}>
            Se encienden los {habitosPorIntensidad(pack, 'suave').length} hábitos
            base: {habitosPorIntensidad(pack, 'suave').map((h) => nombreElectron(h.electron)).join(' · ')}.
            Los demás llegan cuando los sostengas 14 de 21 días, o antes si
            los adelantas desde la ficha del pack.
          </EliteText>
        </Animated.View>
      )}
      <Animated.View entering={FadeInUp.delay(140).springify()}>
        <AnimatedPressable
          style={s.cta}
          onPress={() => confirmarAplicar()}
          disabled={busy}
        >
          <EliteText style={s.ctaText}>Aplicar pack</EliteText>
        </AnimatedPressable>
      </Animated.View>
      {busy && (
        <View style={s.busyRow}>
          <ActivityIndicator color={dark ? ATP_BRAND.lime : tokens.tealTexto} />
          <EliteText style={[s.busyText, thSec]}>Armando tu app…</EliteText>
        </View>
      )}
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );

  // ─── El resumen: lo que DE VERDAD pasó ───

  const renderResumen = () => {
    if (!pack || !resultado) return null;
    const plan = resultado.plan;
    const fallas = resultado.pasos.filter((p) => !p.ok);
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[s.pregunta, thTexto]}>
            {resultado.ok ? 'Tu app quedó armada' : 'Casi: algo no entró'}
          </EliteText>
          <EliteText style={[s.hint, thSec]}>
            {resultado.ok
              ? `${pack.nombre} quedó aplicado. Esto fue lo que se configuró:`
              : 'Esto fue lo que sí entró y lo que faltó. Puedes intentar de nuevo cuando quieras.'}
          </EliteText>
        </Animated.View>

        {fallas.length > 0 && (
          <Animated.View entering={FadeInUp.delay(80).springify()} style={s.fallasCard}>
            {fallas.map((f) => (
              <View key={f.paso} style={s.fallaRow}>
                <Ionicons name="alert-circle-outline" size={15} color={tokens.error} />
                <EliteText style={[s.fallaText, thTexto]}>{f.detalle ?? f.paso}</EliteText>
              </View>
            ))}
          </Animated.View>
        )}

        {plan && (
          <>
            <Animated.View entering={FadeInUp.delay(120).springify()}>
              <EliteText style={[s.seccion, thTenue]}>SE INSTALÓ EN TU SALA</EliteText>
              <View style={[s.resumenCard, thCard]}>
                <EliteText style={[s.resumenTexto, thTexto]}>
                  {[...plan.installFull, ...plan.installGrid].map(labelApp).join(' · ')}
                </EliteText>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(160).springify()}>
              <EliteText style={[s.seccion, thTenue]}>SE ENCENDIÓ EN TAREAS</EliteText>
              <View style={[s.resumenCard, thCard]}>
                {plan.encendidos.map((e) => (
                  <View key={e} style={s.resumenRow}>
                    <EliteText style={[s.resumenTexto, thTexto]}>{nombreElectron(e)}</EliteText>
                    {plan.habitTimes[e] && (
                      <EliteText style={[s.resumenHora, thSec]}>{plan.habitTimes[e]}</EliteText>
                    )}
                  </View>
                ))}
                {plan.enModulo.length > 0 && (
                  <EliteText style={[s.resumenNota, thTenue]}>
                    {plan.enModulo.map(nombreElectron).join(' · ')}: se registran en su
                    momento, dentro de su app.
                  </EliteText>
                )}
                {plan.habitReglas.sunlight?.ancla === 'uv' && (
                  <EliteText style={[s.resumenNota, thTenue]}>
                    Luz solar se ancla cada día a tu ventana buena de UV. Sin
                    dato de ubicación cae a media hora después de despertar.
                  </EliteText>
                )}
                {pack.enciende.some((h) => !h.core) && (
                  <EliteText style={[s.resumenNota, thTenue]}>
                    Los demás hábitos del pack llegan cuando sostengas estos
                    14 de 21 días. Puedes adelantarlos en la ficha del pack.
                  </EliteText>
                )}
              </View>
            </Animated.View>

            {plan.metas.length > 0 && (
              <Animated.View entering={FadeInUp.delay(200).springify()}>
                <EliteText style={[s.seccion, thTenue]}>TUS METAS</EliteText>
                <View style={[s.resumenCard, thCard]}>
                  {plan.metas.map((m) => (
                    <EliteText key={m.tipo} style={[s.resumenTexto, thTexto]}>
                      {m.tipo === 'proteina_g' ? `Proteína ${m.valor} g` :
                       m.tipo === 'agua_ml' ? `Agua ${m.valor} ml` :
                       `Ayuno ${m.valor} h`}
                    </EliteText>
                  ))}
                </View>
              </Animated.View>
            )}

            <Animated.View entering={FadeInUp.delay(240).springify()}>
              <EliteText style={[s.seccion, thTenue]}>ASÍ TE AVISAMOS</EliteText>
              <View style={[s.resumenCard, thCard]}>
                {plan.avisos.length === 0 ? (
                  <EliteText style={[s.resumenNota, thTenue]}>
                    Este pack no configura avisos. Los de tus apps siguen como
                    los tengas.
                  </EliteText>
                ) : (
                  plan.avisos.map((a) => (
                    <View key={a.app} style={s.resumenRow}>
                      <EliteText style={[s.resumenTexto, thTexto]}>
                        {labelApp(a.app)}, solo si no lo has hecho
                      </EliteText>
                      <EliteText style={[s.resumenHora, thSec]}>{a.time}</EliteText>
                    </View>
                  ))
                )}
                <EliteText style={[s.resumenNota, thTenue]}>
                  El interruptor general de notificaciones siempre manda.
                </EliteText>
              </View>
            </Animated.View>
          </>
        )}

        <Animated.View entering={FadeInUp.delay(280).springify()}>
          <AnimatedPressable style={s.cta} onPress={() => { haptic.light(); salir(); }}>
            <EliteText style={s.ctaText}>Listo</EliteText>
          </AnimatedPressable>
        </Animated.View>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    );
  };

  return (
    <Screen themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScreenHeader
        title={pack ? pack.nombre : 'Ármala por mí'}
        onBack={paso === 'resumen' ? undefined : atras}
      />
      {paso === 'pack' && renderPack()}
      {paso === 'horario' && renderHorario()}
      {paso === 'resumen' && renderResumen()}

      <TimeWheelPicker
        visible={picker !== null}
        initialValue={(() => {
          const t = picker === 'dormir' ? dormir : despertar;
          const d = new Date();
          d.setHours(parseInt(t.split(':')[0], 10), parseInt(t.split(':')[1], 10), 0, 0);
          return d;
        })()}
        title={picker === 'dormir' ? 'Me duermo a las' : 'Despierto a las'}
        onConfirm={(date: Date) => {
          const t = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          if (picker === 'dormir') setDormir(t);
          else setDespertar(t);
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  pregunta: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    marginTop: Spacing.sm,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: Spacing.lg,
  },

  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0.5,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: 10,
  },
  packIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: withOpacity(ATP_BRAND.white, 0.05),
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packNombre: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  packParaQuien: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 2,
  },

  grupo: {
    borderWidth: 0.5,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  horaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  rowDivider: { borderBottomWidth: 0.5 },
  horaLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  horaValor: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.md },

  etapaNota: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },

  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: Spacing.md,
  },
  busyText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },

  seccion: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  resumenCard: {
    borderWidth: 0.5,
    borderRadius: 14,
    padding: Spacing.md,
    gap: 6,
  },
  resumenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resumenTexto: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  resumenHora: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  resumenNota: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 4,
  },

  fallasCard: {
    backgroundColor: withOpacity(SEMANTIC.error, 0.08),
    borderWidth: 0.5,
    borderColor: withOpacity(SEMANTIC.error, 0.3),
    borderRadius: 14,
    padding: Spacing.md,
    gap: 8,
    marginBottom: Spacing.xs,
  },
  fallaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  fallaText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
  },

  cta: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  ctaText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },
});
