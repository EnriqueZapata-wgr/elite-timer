/**
 * ATP Elite: la página dentro de la app (ATP 3.0, 6-sep-2026, ruta 3.4 y 3.8;
 * la ruta `RUTA_ELITE` la definió la ola 1 para que los candados Elite ya
 * apuntaran aquí).
 *
 * Qué es, para quién, cómo funciona. SIN precio, SIN botón de compra, SIN
 * mencionar la web ni ningún medio de pago (Apple 3.1.1 y 3.1.3: Elite es un
 * servicio persona a persona contratado fuera de la app; aquí solo se explica
 * y se abre un correo). Dos acciones: "Escríbenos" (mailto con asunto) y
 * "Ya soy cliente Elite" (a Ajustes > Membresía; el canje del código vive
 * solo ahí como servicio contratado, Apple 3.1.1).
 *
 * Copy sin palabras rojas: "evaluación", nunca "diagnóstico" ni "medicina".
 * Tema claro y oscuro con tokens.
 */
import { useMemo } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { EliteText } from '@/components/elite-text';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { CONTACTO_ELITE_EMAIL } from '@/src/constants/lanzamiento';
import { warn as logWarn } from '@/src/lib/logger';

const ASUNTO = 'Quiero saber más de ATP Elite';

/** Lo que incluye, en el orden del brochure. */
const INCLUYE = [
  { icon: 'labs', titulo: 'Laboratorios leídos juntos', texto: 'Tus marcadores contra el rango del laboratorio y contra el objetivo que queremos para ti, con el nivel de evidencia de cada lectura.' },
  { icon: 'genetica', titulo: 'Genética interpretada', texto: 'Qué dice tu ADN de cómo procesas, limpias y respondes, y qué hacer con eso. Escrita a mano, por tema, en lenguaje llano.' },
  { icon: 'glucosa', titulo: 'Sensor de glucosa', texto: 'Dos semanas de sensor continuo para ver cómo responde tu cuerpo a lo que comes, cómo duermes y cómo entrenas.' },
  { icon: 'medidas', titulo: 'Composición corporal', texto: 'Peso, grasa, músculo y grasa visceral con su meta, no solo el número de la báscula.' },
  { icon: 'emociones', titulo: 'Química cerebral', texto: 'Tu perfil de dopamina, acetilcolina, serotonina y GABA: naturaleza y desgaste, y qué lo explica.' },
] as const;

const MANUALES = [
  { titulo: 'Alimentación', texto: 'Qué priorizar, qué evitar, tu ventana y tus horarios.' },
  { titulo: 'Suplementación', texto: 'Cada suplemento con dosis, momento y el porqué, cargado en tu módulo de Suplementos.' },
  { titulo: 'Entrenamiento y descanso', texto: 'Sesiones, frecuencia e intensidad a la medida de tu evaluación.' },
] as const;

const PASOS = [
  { titulo: 'Día 0', texto: 'Entrevista con Enrique, estudios de laboratorio y sensor de glucosa. Se arma tu expediente.' },
  { titulo: 'Entrega 1', texto: 'Tu evaluación con laboratorios, composición corporal, química cerebral y contexto: sistemas, marcadores, cruces y tus tres palancas.' },
  { titulo: 'Semana 8', texto: 'Llega tu genética interpretada y se integra a la evaluación.' },
  { titulo: 'Entrega 2', texto: 'La evaluación completa con genética, los tres manuales y ARGOS con tu contexto cargado.' },
  { titulo: 'Revisiones', texto: 'Cada revisión es una versión nueva de tu evaluación, y en la app puedes ver cómo evolucionaste entre una y otra.' },
] as const;

export default function ElitePage() {
  const { tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const escribir = () => {
    haptic.medium();
    const url = `mailto:${CONTACTO_ELITE_EMAIL}?subject=${encodeURIComponent(ASUNTO)}`;
    // Sin app de correo configurada (pasa en Android limpio) openURL rechaza:
    // se muestra el correo para que lo copie, en vez de un botón que no hace nada.
    Linking.openURL(url).catch((e) => {
      logWarn('[elite] no se pudo abrir el correo', e);
      Alert.alert('Escríbenos', `Escríbenos a ${CONTACTO_ELITE_EMAIL} con el asunto "${ASUNTO}".`);
    });
  };

  return (
    <Screen edges={[]} themed>
      <StatusBar style={t.kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="ATP Elite" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <EliteText style={s.kicker}>EVALUACIÓN PERSONALIZADA CON ENRIQUE</EliteText>
          <EliteText style={s.titulo}>Tu cuerpo leído completo, con un plan que sí es tuyo.</EliteText>
          <EliteText style={s.lead}>
            ATP Elite es una evaluación integral persona a persona: laboratorios, genética, sensor de glucosa, composición corporal y química cerebral leídos juntos por Enrique, con tus manuales de alimentación, suplementación y entrenamiento, y doce meses de la plataforma con ARGOS conociendo tu caso.
          </EliteText>
        </View>

        <EliteText style={s.seccionTitulo}>QUÉ INCLUYE</EliteText>
        {INCLUYE.map((i) => (
          <View key={i.titulo} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.iconoWrap}>
                <AppIcon name={i.icon} size={18} color={t.texto} />
              </View>
              <EliteText style={s.cardTitulo}>{i.titulo}</EliteText>
            </View>
            <EliteText style={s.cardTexto}>{i.texto}</EliteText>
          </View>
        ))}

        <EliteText style={s.seccionTitulo}>TRES MANUALES</EliteText>
        <View style={s.card}>
          {MANUALES.map((m, idx) => (
            <View key={m.titulo} style={[s.manualRow, idx < MANUALES.length - 1 && s.manualDivider]}>
              <EliteText style={s.cardTitulo}>{m.titulo}</EliteText>
              <EliteText style={s.cardTexto}>{m.texto}</EliteText>
            </View>
          ))}
        </View>

        <EliteText style={s.seccionTitulo}>PARA QUIÉN</EliteText>
        <View style={s.card}>
          <EliteText style={s.cardTexto}>
            Para quien ya mide y quiere que alguien lea todo junto: la persona que trae estudios, que quiere saber qué de lo suyo pesa más, y que prefiere tres palancas claras a veinte recomendaciones sueltas. No sustituye a tu médico: lo que falte por medir te lo decimos con quién hacerlo.
          </EliteText>
        </View>

        <EliteText style={s.seccionTitulo}>CÓMO FUNCIONA</EliteText>
        <View style={s.card}>
          {PASOS.map((p, idx) => (
            <View key={p.titulo} style={s.pasoRow}>
              <View style={s.pasoNum}>
                <EliteText style={s.pasoNumText}>{idx + 1}</EliteText>
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.cardTitulo}>{p.titulo}</EliteText>
                <EliteText style={s.cardTexto}>{p.texto}</EliteText>
              </View>
            </View>
          ))}
        </View>

        <EliteText style={s.seccionTitulo}>DENTRO DE LA APP</EliteText>
        <View style={s.card}>
          <EliteText style={s.cardTexto}>
            Tu evaluación queda navegable en Mi evaluación Elite y descargable en PDF, Genética se enciende con tus hallazgos, tu plan de suplementos aparece en tu módulo con la etiqueta de quien lo asignó, y ARGOS responde con tu contexto. Todo eso se queda contigo aunque termine el año de plataforma.
          </EliteText>
        </View>

        <AnimatedPressable onPress={escribir} style={s.botonPrimario} accessibilityRole="button" accessibilityLabel="Escríbenos por correo">
          <Ionicons name="mail-outline" size={18} color={t.textoSobreLima} />
          <EliteText style={s.botonPrimarioText}>Escríbenos</EliteText>
        </AnimatedPressable>
        <EliteText style={s.pie}>Se abre tu correo con el asunto listo. Enrique te responde personalmente.</EliteText>

        {/* 4EP 6-sep-2026 (Apple 3.1.1): aqui no hay canje de codigo; el codigo
            vive solo en Ajustes como servicio contratado. Este enlace es neutro. */}
        <AnimatedPressable
          onPress={() => { haptic.light(); router.push('/settings/subscription'); }}
          style={s.botonSecundario}
          accessibilityRole="button"
        >
          <EliteText style={s.botonSecundarioText}>Ya soy cliente Elite</EliteText>
        </AnimatedPressable>
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  hero: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.bordeMarcado,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  kicker: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontSize: FontSizes.xs, letterSpacing: 1.5, fontFamily: Fonts.semiBold },
  titulo: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xxl, lineHeight: 30 },
  lead: { color: t.texto, fontSize: FontSizes.sm, lineHeight: 21 },
  seccionTitulo: { color: t.textoSecundario, letterSpacing: 1, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginTop: Spacing.sm },
  card: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconoWrap: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.35),
  },
  cardTitulo: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  cardTexto: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 20 },
  manualRow: { paddingVertical: Spacing.xs, gap: 2 },
  manualDivider: { borderBottomWidth: 1, borderBottomColor: t.borde },
  pasoRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs },
  pasoNum: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.hundido, borderWidth: 1, borderColor: t.bordeMarcado, marginTop: 2,
  },
  pasoNumText: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xs },
  botonPrimario: {
    marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 14,
  },
  botonPrimarioText: { color: t.textoSobreLima, fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },
  pie: { color: t.textoSecundario, fontSize: FontSizes.xs, textAlign: 'center', lineHeight: 16 },
  botonSecundario: {
    marginTop: Spacing.xs, alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md, paddingVertical: 12, borderWidth: 1, borderColor: t.bordeMarcado, backgroundColor: t.card,
  },
  botonSecundarioText: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
