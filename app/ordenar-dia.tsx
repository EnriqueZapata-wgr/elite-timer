/**
 * Ordenar mi día (MB-26 Pieza 4) — la salida al desmadre.
 *
 * Tres caminos, uno por pantalla: empezar de cero (todo a reposo),
 * quedarme con lo esencial (los hábitos del pack aplicado más reciente) y
 * que ARGOS proponga (adherencia real; PROPONE y el usuario acepta o
 * edita — nada se mueve solo). Además el estante: graduados y en reposo,
 * cada uno con su puerta de vuelta (única puerta de regreso para un
 * MANDATORY en reposo, que no aparece en Mis hábitos).
 *
 * ⚠️ Este flujo NO desinstala apps y NO borra nada: los hábitos solo
 * salen de la lista y conservan historial y racha. La decisión vive en
 * ordenar-core (puro); aquí solo se lee, se muestra y se ejecuta.
 */
import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { ArgosMark } from '@/src/components/argos/ArgosMark';
import { useAuth } from '@/src/contexts/auth-context';
import { getLocalToday } from '@/src/utils/date-helpers';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { PACK_BY_KEY } from '@/src/constants/packs';
import { getInstallPrefs } from '@/src/services/hoy/install-service';
import {
  getHabitStates, setHabitStates, reactivarHabitos,
} from '@/src/services/hoy/habit-states-service';
import {
  estadosPorKey, keysGraduadas, keysEnReposo, type HabitEstado,
} from '@/src/services/hoy/habit-states-core';
import { renglonesDeHoy } from '@/src/services/hoy/techo-core';
import { getHistorialBooleanos } from '@/src/services/hoy/graduacion-service';
import { ultimasFechas, type HistorialHabitos } from '@/src/services/hoy/graduacion-core';
import { getUserPacks } from '@/src/services/pack-service';
import type { UserPackRow } from '@/src/services/pack-core';
import {
  planCero, planEsencial, planArgos, packMasReciente, habitosDelPack,
  type CambioEstado,
} from '@/src/services/hoy/ordenar-core';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

type Paso = 'menu' | 'cero' | 'esencial' | 'argos' | 'listo';

const nombreDe = (key: string) => ELECTRON_WEIGHTS[key as ElectronSource]?.name ?? key;
const iconDe = (key: string) => (ELECTRON_WEIGHTS[key as ElectronSource]?.icon ?? 'sol') as never;

const ESTADO_LABEL: Record<HabitEstado, string> = {
  activo: 'Activo',
  graduado: 'Graduado',
  reposo: 'Reposo',
};
const SIGUIENTE_ESTADO: Record<HabitEstado, HabitEstado> = {
  activo: 'graduado',
  graduado: 'reposo',
  reposo: 'activo',
};

export default function OrdenarDiaScreen() {
  // MB-31B remate: pantalla sin dueño en el reparto — tokens del tema.
  const { kind, tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();

  const [paso, setPaso] = useState<Paso>('menu');
  const [renglones, setRenglones] = useState<string[]>([]);
  const [estados, setEstados] = useState<Record<string, HabitEstado>>({});
  const [historial, setHistorial] = useState<HistorialHabitos | null>(null);
  const [quantKeys, setQuantKeys] = useState<string[]>([]);
  const [packRow, setPackRow] = useState<UserPackRow | null>(null);
  const [propuesta, setPropuesta] = useState<CambioEstado[]>([]);
  const [resultado, setResultado] = useState<{ aplicados: number; fallidos: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const hoy = getLocalToday();
    const [prefs, stateRows, hist, packs] = await Promise.all([
      getInstallPrefs(user.id),
      getHabitStates(user.id),
      getHistorialBooleanos(user.id, ultimasFechas(hoy, 35)[0]),
      getUserPacks(user.id),
    ]);
    const est = estadosPorKey(stateRows);
    setEstados(est);
    setHistorial(hist);
    setPackRow(packMasReciente(packs));
    if (prefs) {
      setRenglones(renglonesDeHoy(prefs, est));
      setQuantKeys(prefs.quants);
    }
  }, [user?.id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const ejecutar = async (cambios: CambioEstado[]) => {
    if (!user?.id || busy) return;
    setBusy(true);
    haptic.medium();
    const r = await setHabitStates(user.id, cambios);
    setBusy(false);
    setResultado({
      aplicados: r.ok ? cambios.length : cambios.length - r.fallidos.length,
      fallidos: r.fallidos.length,
    });
    if (r.ok) haptic.success();
    setPaso('listo');
    refresh();
  };

  const traerDeVuelta = async (key: string) => {
    if (!user?.id) return;
    haptic.light();
    await reactivarHabitos(user.id, [key]);
    refresh();
  };

  const graduados = keysGraduadas(estados);
  const enReposo = keysEnReposo(estados);

  // ─── Menú: el estante y los tres caminos ───

  const renderMenu = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={FadeInUp.delay(40).springify()}>
        <EliteText style={s.intro}>
          Hoy tienes {renglones.length} hábitos activos. Aquí decides qué se
          queda, qué ya es parte de ti y qué descansa. Nada se desinstala y
          nada se borra: tus apps y tu historial no se tocan.
        </EliteText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80).springify()}>
        <AnimatedPressable style={s.camino} onPress={() => { haptic.light(); setPaso('cero'); }}>
          <View style={s.caminoIcon}>
            <Ionicons name="refresh-outline" size={20} color={t.textoSecundario} />
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={s.caminoTitulo}>Empezar de cero</EliteText>
            <EliteText style={s.caminoDesc}>
              Todo a reposo y reconstruyes tu día desde ahí.
            </EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.sinDatos} />
        </AnimatedPressable>

        <AnimatedPressable
          style={[s.camino, !packRow && s.caminoOff]}
          onPress={() => {
            if (!packRow) return;
            haptic.light();
            setPaso('esencial');
          }}
          disabled={!packRow}
        >
          <View style={s.caminoIcon}>
            <Ionicons name="cube-outline" size={20} color={t.textoSecundario} />
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={s.caminoTitulo}>Quedarme con lo esencial</EliteText>
            <EliteText style={s.caminoDesc}>
              {packRow && PACK_BY_KEY[packRow.pack_key]
                ? `Quedan activos los hábitos de ${PACK_BY_KEY[packRow.pack_key].nombre}. El resto descansa.`
                : 'Necesita un pack aplicado. Aún no has aplicado ninguno.'}
            </EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.sinDatos} />
        </AnimatedPressable>

        <AnimatedPressable
          style={s.camino}
          onPress={() => {
            if (!user?.id) return;
            haptic.light();
            const sinLedger = new Set(quantKeys);
            setPropuesta(planArgos(renglones, historial ?? {}, getLocalToday(), sinLedger));
            setPaso('argos');
          }}
        >
          <View style={s.caminoIcon}>
            <ArgosMark size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={s.caminoTitulo}>Que ARGOS proponga</EliteText>
            <EliteText style={s.caminoDesc}>
              Lee tu adherencia real y sugiere qué graduar, qué dejar y qué
              descansar. Tú aceptas o editas.
            </EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.sinDatos} />
        </AnimatedPressable>
      </Animated.View>

      {graduados.length > 0 && (
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <EliteText style={s.seccion}>YA SON PARTE DE TI</EliteText>
          <View style={s.grupo}>
            {graduados.map((k, i) => (
              <View key={k} style={[s.fila, i < graduados.length - 1 && s.filaDivider]}>
                <AppIcon name={iconDe(k)} size={16} color={ATP_BRAND.lime} />
                <EliteText style={s.filaNombre}>{nombreDe(k)}</EliteText>
                <AnimatedPressable onPress={() => traerDeVuelta(k)}>
                  <EliteText style={s.filaAccion}>Traer de vuelta</EliteText>
                </AnimatedPressable>
              </View>
            ))}
          </View>
          <EliteText style={s.nota}>
            Graduado no es archivado: se sigue contando su actividad real y
            libera un renglón de tu día.
          </EliteText>
        </Animated.View>
      )}

      {enReposo.length > 0 && (
        <Animated.View entering={FadeInUp.delay(160).springify()}>
          <EliteText style={s.seccion}>EN REPOSO</EliteText>
          <View style={s.grupo}>
            {enReposo.map((k, i) => (
              <View key={k} style={[s.fila, i < enReposo.length - 1 && s.filaDivider]}>
                <AppIcon name={iconDe(k)} size={16} color={t.textoTenue} />
                <EliteText style={s.filaNombre}>{nombreDe(k)}</EliteText>
                <AnimatedPressable onPress={() => traerDeVuelta(k)}>
                  <EliteText style={s.filaAccion}>Volver a activar</EliteText>
                </AnimatedPressable>
              </View>
            ))}
          </View>
          <EliteText style={s.nota}>
            Su historial y su racha siguen ahí. Vuelven cuando tú digas.
          </EliteText>
        </Animated.View>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );

  // ─── Camino 1: de cero ───

  const renderCero = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={FadeInUp.delay(40).springify()}>
        <EliteText style={s.pregunta}>Empezar de cero</EliteText>
        <EliteText style={s.intro}>
          Tus {renglones.length} hábitos activos pasan a reposo. Nada se
          desinstala y nada se borra: todos conservan su historial y su racha,
          y los regresas uno por uno cuando quieras, desde aquí o al elegir
          tus hábitos. Tus apps siguen instaladas.
        </EliteText>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <AnimatedPressable
          style={s.cta}
          onPress={() => ejecutar(planCero(renglones))}
          disabled={busy || renglones.length === 0}
        >
          <EliteText style={s.ctaText}>Mandar todo a reposo</EliteText>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );

  // ─── Camino 2: lo esencial ───

  const renderEsencial = () => {
    if (!packRow || !PACK_BY_KEY[packRow.pack_key]) return null;
    const delPack = habitosDelPack(packRow);
    const seQuedan = delPack;
    const descansan = renglones.filter((k) => !delPack.includes(k));
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.pregunta}>Quedarme con lo esencial</EliteText>
          <EliteText style={s.intro}>
            Tu pack aplicado más reciente es {PACK_BY_KEY[packRow.pack_key].nombre}.
            Sus hábitos quedan activos y el resto pasa a reposo, con su
            historial intacto.
          </EliteText>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <EliteText style={s.seccion}>SE QUEDAN</EliteText>
          <View style={s.grupo}>
            {seQuedan.map((k, i) => (
              <View key={k} style={[s.fila, i < seQuedan.length - 1 && s.filaDivider]}>
                <AppIcon name={iconDe(k)} size={16} color={ATP_BRAND.lime} />
                <EliteText style={s.filaNombre}>{nombreDe(k)}</EliteText>
              </View>
            ))}
          </View>
          {descansan.length > 0 && (
            <>
              <EliteText style={s.seccion}>DESCANSAN</EliteText>
              <View style={s.grupo}>
                {descansan.map((k, i) => (
                  <View key={k} style={[s.fila, i < descansan.length - 1 && s.filaDivider]}>
                    <AppIcon name={iconDe(k)} size={16} color={t.textoTenue} />
                    <EliteText style={s.filaNombre}>{nombreDe(k)}</EliteText>
                  </View>
                ))}
              </View>
            </>
          )}
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <AnimatedPressable
            style={s.cta}
            onPress={() => ejecutar(planEsencial(renglones, delPack))}
            disabled={busy}
          >
            <EliteText style={s.ctaText}>Quedarme con lo esencial</EliteText>
          </AnimatedPressable>
        </Animated.View>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    );
  };

  // ─── Camino 3: la propuesta de ARGOS, editable ───

  const renderArgos = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={FadeInUp.delay(40).springify()}>
        <EliteText style={s.pregunta}>La propuesta</EliteText>
        <EliteText style={s.intro}>
          Sale de tu adherencia real de las últimas semanas. Toca un estado
          para cambiarlo: tú decides, nada se mueve solo.
        </EliteText>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(80).springify()} style={s.grupo}>
        {propuesta.map((c, i) => (
          <View key={c.key} style={[s.fila, i < propuesta.length - 1 && s.filaDivider]}>
            <AppIcon name={iconDe(c.key)} size={16} color={t.textoSecundario} />
            <EliteText style={s.filaNombre}>{nombreDe(c.key)}</EliteText>
            <AnimatedPressable
              style={[s.estadoPill, c.state === 'activo' && s.estadoPillActivo,
                c.state === 'graduado' && s.estadoPillGraduado]}
              onPress={() => {
                haptic.light();
                setPropuesta((prev) => prev.map((p) =>
                  p.key === c.key ? { ...p, state: SIGUIENTE_ESTADO[p.state] } : p,
                ));
              }}
            >
              <EliteText style={s.estadoPillText}>{ESTADO_LABEL[c.state]}</EliteText>
            </AnimatedPressable>
          </View>
        ))}
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(120).springify()}>
        <AnimatedPressable
          style={s.cta}
          onPress={() => ejecutar(propuesta)}
          disabled={busy || propuesta.length === 0}
        >
          <EliteText style={s.ctaText}>Aplicar</EliteText>
        </AnimatedPressable>
      </Animated.View>
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );

  // ─── Listo: lo que DE VERDAD pasó ───

  const renderListo = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={FadeInUp.delay(40).springify()}>
        <EliteText style={s.pregunta}>
          {resultado && resultado.fallidos === 0 ? 'Tu día quedó ordenado' : 'Casi: algo no entró'}
        </EliteText>
        <EliteText style={s.intro}>
          {resultado && resultado.fallidos === 0
            ? `Se acomodaron ${resultado.aplicados} hábitos. Tus apps siguen instaladas y tu historial no se tocó.`
            : 'No se pudo guardar el orden completo. Nada se borró; intenta de nuevo en un momento.'}
        </EliteText>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <AnimatedPressable
          style={s.cta}
          onPress={() => {
            haptic.light();
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
        >
          <EliteText style={s.ctaText}>Listo</EliteText>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );

  return (
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader
        title="Ordenar mi día"
        onBack={paso === 'menu' || paso === 'listo'
          ? () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }
          : () => setPaso('menu')}
      />
      {paso === 'menu' && renderMenu()}
      {paso === 'cero' && renderCero()}
      {paso === 'esencial' && renderEsencial()}
      {paso === 'argos' && renderArgos()}
      {paso === 'listo' && renderListo()}
    </Screen>
  );
}

// MB-31B remate: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  intro: {
    color: t.textoSecundario,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  pregunta: {
    color: t.texto,
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    marginTop: Spacing.sm,
    marginBottom: 8,
  },

  camino: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderWidth: 0.5,
    borderColor: t.borde,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: 10,
  },
  caminoOff: { opacity: 0.7 },
  caminoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    // Era un velo blanco al 5% sobre la card: rol = card sobre card.
    backgroundColor: t.flotante,
    borderWidth: 0.5,
    borderColor: t.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caminoTitulo: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  caminoDesc: {
    color: t.textoSecundario,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 2,
  },

  seccion: {
    color: t.textoTenue,
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  grupo: {
    backgroundColor: t.card,
    borderWidth: 0.5,
    borderColor: t.borde,
    borderRadius: 14,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  filaDivider: { borderBottomWidth: 0.5, borderBottomColor: t.borde },
  filaNombre: { flex: 1, color: t.texto, fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  // Regla 1 del manual: el lima nunca es texto en claro → teal calibrado.
  filaAccion: {
    color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto,
    fontFamily: Fonts.semiBold, fontSize: FontSizes.xs,
  },
  nota: {
    color: t.textoTenue,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 6,
  },

  estadoPill: {
    borderWidth: 0.5,
    borderColor: t.bordeMarcado,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 86,
    alignItems: 'center',
  },
  estadoPillActivo: {
    borderColor: withOpacity(ATP_BRAND.lime, 0.5),
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.10),
  },
  estadoPillGraduado: {
    borderColor: withOpacity(ATP_BRAND.teal, 0.6),
    backgroundColor: withOpacity(ATP_BRAND.teal, 0.10),
  },
  estadoPillText: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },

  cta: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  ctaText: { color: t.textoSobreLima, fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },
});
