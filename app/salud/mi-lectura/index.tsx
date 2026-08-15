/**
 * CÓMO TE LEO — la lectura del expediente (NOCHE-3).
 *
 * QUÉ ES Y QUÉ NO ES.
 * No es otra pantalla de datos. La app ya tiene datos por todos lados: ATP Labs
 * tiene los marcadores, Mis Datos la composición, Reports la evolución. Esta
 * pantalla es la INTERPRETACIÓN: qué significan juntos y cuál manda sobre los
 * demás. Por eso aquí no se lista ni un solo valor crudo; cada lectura termina
 * en un enlace al lugar donde ese dato ya vive (doctrina: un dato, un lugar).
 *
 * De dónde sale el molde: el portal que el dueño entrega a sus clientes de
 * consultoría, cuya sección "cómo se conecta todo en ti" es lo que el cliente
 * paga. Se toma la ESTRUCTURA (hallazgo, lógica, convergencia, regla, bandera)
 * y la VOZ, no la hoja de estilos: aquí es móvil, editorial y de tres colores.
 *
 * TRES ESTADOS, TODOS HONESTOS:
 *   · sin material  → qué falta y dónde conseguirlo, con acción directa.
 *   · con material y sin cruces → se dice que no hay prioridad, no se inventa una.
 *   · con cruces    → en orden de impacto, con lo que falta al final.
 * Nunca queda en blanco y nunca queda en "Cargando..." (el servicio es
 * fail-soft por fuente, así que la carga siempre termina).
 */
import { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, UIManager, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { loadLectura } from '@/src/services/salud/lectura-service';
import { FUENTE_LABEL, type Cruce, type Faltante, type Lectura } from '@/src/services/salud/lectura-core';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LECTURA_VACIA: Lectura = {
  sintesis: [],
  cruces: [],
  faltantes: [],
  completitud: 0,
  completitudLabel: 'Sin material todavía',
  vacia: true,
};

function MiLecturaScreen() {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const router = useRouter();
  const [lectura, setLectura] = useState<Lectura>(LECTURA_VACIA);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) { setCargando(false); return; }
    const res = await loadLectura(user.id);
    setLectura(res);
    setCargando(false);
  }, [user?.id]);

  // El servicio no propaga fallos, pero el catch queda igual: una pantalla
  // colgada en "Cargando..." es el peor final posible para esta pantalla.
  useFocusEffect(useCallback(() => { load().catch(() => setCargando(false)); }, [load]));

  const alternar = (key: string) => {
    haptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAbierto((prev) => (prev === key ? null : key));
  };

  const ir = (route: string) => { haptic.medium(); router.push(route as Href); };

  return (
    <Screen themed>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Cómo te leo" />

        {cargando ? (
          <Animated.View entering={FadeInUp.springify()} style={s.cargando}>
            <EliteText style={s.cargandoTxt}>Cruzando lo que tenemos de ti...</EliteText>
          </Animated.View>
        ) : (
          <>
            {/* ── El protagonista: la síntesis ─────────────────────────────── */}
            {lectura.sintesis.length > 0 && (
              <Animated.View entering={FadeInUp.delay(50).springify()} style={s.hero}>
                <View style={s.heroTop}>
                  <EliteText style={s.kicker}>LECTURA INTEGRADA</EliteText>
                  <View style={s.chip}>
                    <EliteText style={s.chipTxt}>
                      {lectura.completitudLabel} · {lectura.completitud}%
                    </EliteText>
                  </View>
                </View>
                {lectura.sintesis.map((frase, i) => (
                  <EliteText key={i} style={i === 0 ? s.heroFrasePrincipal : s.heroFrase}>
                    {frase}
                  </EliteText>
                ))}
              </Animated.View>
            )}

            {/* ── Sin material: se dice qué falta, no se deja en blanco ────── */}
            {lectura.vacia && (
              <Animated.View entering={FadeInUp.delay(50).springify()}>
                <EmptyState
                  icon="information-circle-outline"
                  title="Todavía no tenemos con qué leerte"
                  subtitle="Esta pantalla cruza tus estudios, tu composición, tu química y tu historia. En cuanto exista una de esas piezas, aquí aparece la lectura."
                  color={ATP_BRAND.teal}
                />
              </Animated.View>
            )}

            {/* ── Los cruces ───────────────────────────────────────────────── */}
            {lectura.cruces.length > 0 && (
              <>
                <Animated.View entering={FadeInUp.delay(90).springify()}>
                  <EliteText style={s.seccion}>CÓMO SE CONECTA TODO EN TI</EliteText>
                  <EliteText style={s.seccionSub}>
                    En orden de impacto. Se trabajan en paralelo, no en fila.
                  </EliteText>
                </Animated.View>
                {lectura.cruces.map((c, i) => (
                  <CruceCard
                    key={c.key}
                    cruce={c}
                    orden={i + 1}
                    abierto={abierto === c.key}
                    onToggle={() => alternar(c.key)}
                    onIr={ir}
                    styles={s}
                    t={t}
                  />
                ))}
              </>
            )}

            {/* ── Con datos y sin cruces: tampoco se inventa una prioridad ─── */}
            {!lectura.vacia && lectura.cruces.length === 0 && (
              <Animated.View entering={FadeInUp.delay(90).springify()} style={s.notaCard}>
                <EliteText style={s.notaTitulo}>Nada pide prioridad hoy</EliteText>
                <EliteText style={s.notaTxt}>
                  Con lo que tenemos no aparece ningún patrón que ordene tu plan. Prefiero decírtelo
                  a inventarte un hallazgo. Entre más completa esté tu información, más fina se
                  vuelve esta lectura.
                </EliteText>
              </Animated.View>
            )}

            {/* ── Lo que falta ─────────────────────────────────────────────── */}
            {lectura.faltantes.length > 0 && (
              <>
                <Animated.View entering={FadeInUp.delay(120).springify()}>
                  <EliteText style={s.seccion}>PARA LEERTE COMPLETO</EliteText>
                  <EliteText style={s.seccionSub}>
                    Cada pieza que agregues enciende lecturas que hoy no puedo hacer.
                  </EliteText>
                </Animated.View>
                {lectura.faltantes.map((f, i) => (
                  <FaltanteRow key={f.key} faltante={f} idx={i} onIr={ir} styles={s} t={t} />
                ))}
              </>
            )}

            <ResultDisclaimerFooter />
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CruceCard({ cruce, orden, abierto, onToggle, onIr, styles: s, t }: {
  cruce: Cruce; orden: number; abierto: boolean; onToggle: () => void;
  onIr: (route: string) => void; styles: ReturnType<typeof makeStyles>; t: AppThemeTokens;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(100 + orden * 40).springify()}>
      <AnimatedPressable onPress={onToggle} style={s.cruceCard}>
        <View style={s.cruceHead}>
          <EliteText style={s.cruceOrden}>{String(orden).padStart(2, '0')}</EliteText>
          <View style={{ flex: 1 }}>
            <EliteText style={s.cruceTitular}>{cruce.titular}</EliteText>
            <View style={s.tagRow}>
              {cruce.fuentes.map((f) => (
                <View key={f} style={s.tag}>
                  <EliteText style={s.tagTxt}>{FUENTE_LABEL[f]}</EliteText>
                </View>
              ))}
            </View>
          </View>
          <Ionicons
            name={abierto ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={t.textoTenue}
          />
        </View>

        {abierto && (
          <View style={s.cruceBody}>
            <Bloque label="HALLAZGO" texto={cruce.hallazgo} s={s} />
            <Bloque label="LÓGICA" texto={cruce.logica} s={s} />
            <Bloque label="CONVERGENCIA" texto={cruce.convergencia} s={s} />
            <Bloque label="TU REGLA" texto={cruce.regla} s={s} destacado />
            {cruce.bandera && (
              <View style={s.bandera}>
                <Ionicons name="alert-circle-outline" size={14} color={ATP_BRAND.amber} />
                <EliteText style={s.banderaTxt}>{cruce.bandera}</EliteText>
              </View>
            )}
            <AnimatedPressable onPress={() => onIr(cruce.destino.route)} style={s.enlace}>
              <EliteText style={s.enlaceTxt}>{cruce.destino.label}</EliteText>
              <Ionicons name="chevron-forward" size={14} color={ATP_BRAND.teal} />
            </AnimatedPressable>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

function Bloque({ label, texto, s, destacado }: {
  label: string; texto: string; s: ReturnType<typeof makeStyles>; destacado?: boolean;
}) {
  return (
    <View style={s.bloque}>
      <EliteText style={s.bloqueLabel}>{label}</EliteText>
      <EliteText style={destacado ? s.bloqueTxtDestacado : s.bloqueTxt}>{texto}</EliteText>
    </View>
  );
}

function FaltanteRow({ faltante, idx, onIr, styles: s, t }: {
  faltante: Faltante; idx: number; onIr: (route: string) => void;
  styles: ReturnType<typeof makeStyles>; t: AppThemeTokens;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(140 + idx * 35).springify()}>
      <AnimatedPressable onPress={() => onIr(faltante.route)} style={s.faltanteCard}>
        <View style={{ flex: 1 }}>
          <EliteText style={s.faltanteTitulo}>{faltante.titulo}</EliteText>
          <EliteText style={s.faltantePorque}>{faltante.porque}</EliteText>
          <EliteText style={s.faltanteAccion}>{faltante.accionLabel}</EliteText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },

  cargando: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  cargandoTxt: { color: t.textoTenue, fontSize: FontSizes.sm, fontFamily: Fonts.regular },

  hero: {
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  kicker: { color: ATP_BRAND.teal, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 3 },
  chip: { backgroundColor: withOpacity(ATP_BRAND.teal, 0.12), borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  chipTxt: { color: t.textoSecundario, fontSize: 10, fontFamily: Fonts.semiBold },
  heroFrasePrincipal: { color: t.texto, fontSize: FontSizes.md, fontFamily: Fonts.semiBold, lineHeight: 24, marginBottom: Spacing.sm },
  heroFrase: { color: t.textoSecundario, fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 21, marginBottom: Spacing.sm },

  seccion: { color: t.textoTenue, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2, marginTop: Spacing.lg },
  seccionSub: { color: t.textoTenue, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 4, marginBottom: Spacing.sm },

  cruceCard: {
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cruceHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cruceOrden: { color: t.textoTenue, fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1, marginTop: 1 },
  cruceTitular: { color: t.texto, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { borderWidth: 0.5, borderColor: t.bordeMarcado, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { color: t.textoTenue, fontSize: 9, fontFamily: Fonts.semiBold, letterSpacing: 1 },

  cruceBody: { marginTop: Spacing.md, gap: Spacing.sm },
  bloque: { gap: 3 },
  bloqueLabel: { color: t.textoTenue, fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 2 },
  bloqueTxt: { color: t.textoSecundario, fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 20 },
  bloqueTxtDestacado: { color: t.texto, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, lineHeight: 20 },

  bandera: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: withOpacity(ATP_BRAND.amber, 0.1),
    borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 6,
  },
  banderaTxt: { flex: 1, color: t.textoSecundario, fontSize: FontSizes.xs, fontFamily: Fonts.regular, lineHeight: 17 },

  enlace: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  enlaceTxt: { color: ATP_BRAND.teal, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  notaCard: {
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm,
  },
  notaTitulo: { color: t.texto, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  notaTxt: { color: t.textoSecundario, fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 20, marginTop: 4 },

  faltanteCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  faltanteTitulo: { color: t.texto, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, lineHeight: 20 },
  faltantePorque: { color: t.textoSecundario, fontSize: FontSizes.xs, fontFamily: Fonts.regular, lineHeight: 18, marginTop: 3 },
  faltanteAccion: { color: ATP_BRAND.teal, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginTop: 6 },
});

export default function MiLecturaGated() {
  return (
    <MedicalDisclaimerGate>
      <MiLecturaScreen />
    </MedicalDisclaimerGate>
  );
}
