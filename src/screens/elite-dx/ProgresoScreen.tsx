/**
 * ProgresoScreen: la sala PROGRESO de la app Elite DX (25-sep-2026, APP_ELITE_DX).
 * La monta app/(tabs)/progreso.tsx con la bandera encendida.
 *
 * Qué responde: "¿cómo voy?". Tres cosas, en este orden:
 *  1. TU CONSTANCIA: el mismo número que Enrique ve en su consola (misma
 *     función, mismas lecturas; ver mi-constancia-service). Si no hay número,
 *     el motivo en voz del cliente. Nunca un 0% de relleno.
 *  2. CUERPO: peso, cintura y grasa más recientes, con su cambio contra el
 *     primer registro. Con un solo registro no hay cambio que inventar.
 *  3. Las puertas a lo que ya existe: fuerza, sueño, laboratorios, reportes.
 *
 * Estados (regla 13): cargando callado (un hueco, sin spinner); error = "No se
 * pudo leer" + Reintentar, jamás pintado como cero o vacío; vacío honesto.
 * Se relee al volver a la sala (useFocusEffect) SIN volver a "cargando": lo
 * último leído se queda en pantalla mientras llega lo nuevo.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon, type AppIconName } from '@/src/components/ui/AppIcon';
import { useColchonOrbe } from '@/src/components/argos/useColchonOrbe';
import { paddingBottomConColchon } from '@/src/components/argos/argos-floating-core';
import { useAuth } from '@/src/contexts/auth-context';
import { useAppTheme } from '@/src/contexts/theme-context';
import { leerMiConstancia, leerMisMedidas, type LecturaMedidas } from '@/src/services/elite-dx/mi-constancia-service';
import { resumenCuerpo, vistaConstancia, fechaCorta, type LecturaConstancia } from '@/src/services/elite-dx/progreso-core';
import { getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

type Estado<T> = T | { estado: 'cargando' };

interface Puerta {
  key: string;
  icon: AppIconName;
  titulo: string;
  linea: string;
  ruta: Href;
}

/**
 * 25-sep-2026 (APP_ELITE_DX): las puertas a pantallas que ya existen.
 *
 * 25-sep-2026 (revisión en frío): Laboratorios iba a /salud/evolucion, que es
 * un Redirect a la sala SALUD escondida (el mapa funcional, no los valores).
 * Ahora abre /edad-atp/labs: cada marcador con su último valor y su serie en
 * el tiempo (lab_values, donde la migración 324 escribe los de la evaluación
 * Elite). Regla: nada de PROGRESO ni de TÚ pasa por un Redirect de /salud/*.
 */
const PUERTAS: readonly Puerta[] = [
  { key: 'fuerza', icon: 'records', titulo: 'Fuerza', linea: 'Tus récords y tus registros de carga', ruta: '/fitness-strength' },
  { key: 'sueno', icon: 'sueno', titulo: 'Sueño', linea: 'Tus noches y cómo descansas', ruta: '/sleep' },
  { key: 'labs', icon: 'labs', titulo: 'Laboratorios', linea: 'Tus valores y cómo cambian', ruta: '/edad-atp/labs' },
  { key: 'reportes', icon: 'reportes', titulo: 'Reportes semanales', linea: 'El resumen de cada semana', ruta: '/reports' },
];

export function ProgresoScreen() {
  // La sala declara `themed` en TabScreen: lee el tema GLOBAL (como salud.tsx).
  const t = useAppTheme().tokens;
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const colchon = useColchonOrbe();

  const [constancia, setConstancia] = useState<Estado<LecturaConstancia>>({ estado: 'cargando' });
  const [medidas, setMedidas] = useState<Estado<LecturaMedidas>>({ estado: 'cargando' });
  // Cada lectura lleva turno: si el foco dispara otra antes de que llegue la
  // anterior, la vieja no pisa a la nueva.
  const turno = useRef(0);

  const leer = useCallback(async (uid: string) => {
    const mio = ++turno.current;
    const [c, m] = await Promise.all([leerMiConstancia(uid), leerMisMedidas(uid)]);
    if (mio !== turno.current) return;
    setConstancia(c);
    setMedidas(m);
  }, []);

  useFocusEffect(useCallback(() => {
    if (userId) void leer(userId);
    return () => { turno.current += 1; };
  }, [userId, leer]));

  const reintentar = () => {
    if (!userId) return;
    haptic.light();
    setConstancia({ estado: 'cargando' });
    setMedidas({ estado: 'cargando' });
    void leer(userId);
  };

  const ir = (ruta: Href) => { haptic.light(); router.push(ruta); };
  const hoy = getLocalToday();

  return (
    <TabScreen themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: paddingBottomConColchon(120, colchon) }]}
      >
        <View style={s.header}>
          <EliteText style={[s.eyebrow, { color: acento }]}>TU AVANCE</EliteText>
          <EliteText style={[s.title, { color: t.texto }]}>PROGRESO</EliteText>
        </View>

        {/* ── 1. TU CONSTANCIA ── */}
        <EliteText style={s.seccion}>TU CONSTANCIA</EliteText>
        {constancia.estado === 'cargando' ? (
          <View style={[s.card, s.hueco]} />
        ) : constancia.estado === 'error' ? (
          <NoSePudo texto="No se pudo leer tu constancia." onReintentar={reintentar} t={t} s={s} />
        ) : (
          <Animated.View entering={FadeInUp.delay(40).springify()} style={s.card}>
            {(() => {
              const v = vistaConstancia(constancia.adherencia);
              if (v.tipo === 'motivo') {
                return <EliteText style={s.texto}>{v.texto}</EliteText>;
              }
              return (
                <>
                  <EliteText style={[s.cifra, { color: acento }]}>{v.cifra}</EliteText>
                  <EliteText style={s.detalle}>{v.detalle}</EliteText>
                </>
              );
            })()}
          </Animated.View>
        )}

        {/* ── 2. CUERPO ── */}
        <EliteText style={s.seccion}>CUERPO</EliteText>
        {medidas.estado === 'cargando' ? (
          <View style={[s.card, s.hueco]} />
        ) : medidas.estado === 'error' ? (
          <NoSePudo texto="No se pudieron leer tus medidas." onReintentar={reintentar} t={t} s={s} />
        ) : (() => {
          const metricas = resumenCuerpo(medidas.filas, hoy);
          if (metricas.length === 0) {
            return (
              <Animated.View entering={FadeInUp.delay(60).springify()}>
                <EliteText style={[s.texto, s.vacio]}>Aún no registras medidas.</EliteText>
                <Fila
                  icon="medidas"
                  titulo="Registrar medidas"
                  linea="Peso, cintura y composición"
                  onPress={() => ir('/medidas')}
                  t={t}
                  s={s}
                  acento={acento}
                />
              </Animated.View>
            );
          }
          return (
            <Animated.View entering={FadeInUp.delay(60).springify()}>
              <AnimatedPressable
                onPress={() => ir('/medidas')}
                style={s.card}
                accessibilityRole="button"
                accessibilityLabel="Ver y registrar tus medidas"
              >
                {metricas.map((m, i) => (
                  <View key={m.key} style={[s.metrica, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.borde }]}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={s.metricaEtiqueta}>{m.etiqueta}</EliteText>
                      <EliteText style={s.detalle}>
                        {m.cambio ?? `Tu primer registro, del ${fechaCorta(m.fecha, hoy)}`}
                      </EliteText>
                    </View>
                    <EliteText style={s.metricaValor}>{m.valor}</EliteText>
                  </View>
                ))}
                <View style={s.pie}>
                  <EliteText style={[s.pieTexto, { color: acento }]}>Ver y registrar medidas</EliteText>
                  <Ionicons name="chevron-forward" size={14} color={acento} />
                </View>
              </AnimatedPressable>
            </Animated.View>
          );
        })()}

        {/* ── 3. Puertas ── */}
        <EliteText style={s.seccion}>MÁS DE TU AVANCE</EliteText>
        {PUERTAS.map((p, i) => (
          <Animated.View key={p.key} entering={FadeInUp.delay(80 + i * 30).springify()}>
            <Fila icon={p.icon} titulo={p.titulo} linea={p.linea} onPress={() => ir(p.ruta)} t={t} s={s} acento={acento} />
          </Animated.View>
        ))}
      </ScrollView>
    </TabScreen>
  );
}

type Estilos = ReturnType<typeof makeStyles>;

function NoSePudo({ texto, onReintentar, t, s }: { texto: string; onReintentar: () => void; t: AppThemeTokens; s: Estilos }) {
  return (
    <View style={s.card}>
      <EliteText style={s.texto}>{`${texto} Revisa tu conexión.`}</EliteText>
      <AnimatedPressable
        onPress={onReintentar}
        style={[s.boton, { borderColor: t.borde }]}
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
      >
        <EliteText style={[s.botonTexto, { color: t.texto }]}>Reintentar</EliteText>
      </AnimatedPressable>
    </View>
  );
}

function Fila({ icon, titulo, linea, onPress, t, s, acento }: {
  icon: AppIconName; titulo: string; linea: string; onPress: () => void; t: AppThemeTokens; s: Estilos; acento: string;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={s.fila} accessibilityRole="button" accessibilityLabel={titulo}>
      <View style={[s.filaIcono, { backgroundColor: withOpacity(acento, 0.12) }]}>
        <AppIcon name={icon} size={18} color={acento} />
      </View>
      <View style={{ flex: 1 }}>
        <EliteText style={s.filaTitulo}>{titulo}</EliteText>
        <EliteText style={s.filaLinea} numberOfLines={1}>{linea}</EliteText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
    </AnimatedPressable>
  );
}

// El tenue del oscuro baja a secundario en claro: #555 no alcanza contraste
// para letra chica en fondo claro (mismo criterio que SaludHub).
const tenue = (t: AppThemeTokens) => (t.kind === 'dark' ? t.textoTenue : t.textoSecundario);

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 2, marginTop: 2 },
  seccion: {
    color: tenue(t), fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: Radius.md, padding: 14,
  },
  hueco: { height: 76 },
  cifra: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl },
  texto: { color: t.texto, fontFamily: Fonts.regular, fontSize: FontSizes.md, lineHeight: 20 },
  detalle: { color: tenue(t), fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 2 },
  vacio: { marginBottom: Spacing.sm },
  metrica: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  metricaEtiqueta: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  metricaValor: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 6 },
  pieTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  boton: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 6, marginTop: Spacing.sm,
  },
  botonTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8,
  },
  filaIcono: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  filaLinea: { color: tenue(t), fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 1 },
});
