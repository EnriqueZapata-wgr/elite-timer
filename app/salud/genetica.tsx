/**
 * Genética (ATP 3.0, 6-sep-2026, ruta 3.4).
 *
 * Se enciende por EXISTENCIA de una evaluación Elite con hallazgos genéticos
 * (`elite_v3.genetica.hallazgos`), no por nivel: sobrevive al vencimiento de
 * Pro (dato del usuario sagrado). Sin parser en 3.0: cada hallazgo lo escribió
 * a mano quien firma (`interpretado_por.genetica`), y la app es agnóstica del
 * proveedor. Lista por tema: gen o variante si el documento lo nombra,
 * hallazgo, implicación, qué hacer y su peldaño de evidencia.
 *
 * Tres caras: Elite con genética (la lista), Elite sin genética todavía
 * ("segunda entrega, semana 8"), y quien no es Elite (candado que abre la
 * página Elite; sin precio ni botón de compra, Apple 3.1.3). Más los estados
 * de cargando y no se pudo leer con reintentar. Tema claro y oscuro.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { CandadoBloque } from '@/src/components/ui/CandadoBloque';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { RUTA_ELITE } from '@/src/constants/rutas-3-0';
import { fetchEvaluacionesElite } from '@/src/services/elite/evaluacion-elite-service';
import { etiquetaEvidencia, formatearFecha, type VersionElite } from '@/src/services/elite/evaluacion-elite-core';
import type { EliteHallazgoGenetico } from '@/src/services/elite/elite-v3-core';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'ok'; vigente: VersionElite | null }
  | { estado: 'error' };

/** Agrupa los hallazgos por tema conservando el orden del documento. */
function porTema(hallazgos: EliteHallazgoGenetico[]): { tema: string; items: EliteHallazgoGenetico[] }[] {
  const grupos: { tema: string; items: EliteHallazgoGenetico[] }[] = [];
  for (const h of hallazgos) {
    const g = grupos.find((x) => x.tema === h.tema);
    if (g) g.items.push(h);
    else grupos.push({ tema: h.tema, items: [h] });
  }
  return grupos;
}

export default function GeneticaScreen() {
  const { tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const { tieneEvaluacionElite, evaluacionEliteNoSePudoLeer, isLoading: nivelCargando } = useSubscription();
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);

  const gateCerrado = !nivelCargando && !tieneEvaluacionElite && !evaluacionEliteNoSePudoLeer;

  useEffect(() => {
    if (!user?.id || gateCerrado) return;
    let vivo = true;
    setCarga({ estado: 'cargando' });
    fetchEvaluacionesElite(user.id).then((r) => {
      if (!vivo) return;
      setCarga(r.estado === 'error' ? { estado: 'error' } : { estado: 'ok', vigente: r.versiones[0] ?? null });
    });
    return () => { vivo = false; };
  }, [user?.id, gateCerrado, intento]);

  const reintentar = (
    <Pressable style={s.cta} onPress={() => { haptic.light(); setIntento((n) => n + 1); }} accessibilityRole="button">
      <EliteText style={s.ctaText}>Reintentar</EliteText>
    </Pressable>
  );

  const cuerpo = () => {
    if (gateCerrado) {
      return (
        <View style={s.bloque}>
          <CandadoBloque
            titulo="Disponible en ATP Elite"
            texto="Disponible en ATP Elite: evaluación personalizada con Enrique."
            boton="Escríbenos"
            destino={RUTA_ELITE}
          />
        </View>
      );
    }
    if (nivelCargando || carga.estado === 'cargando') {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          <EliteText style={s.centerText}>Cargando tu genética…</EliteText>
        </View>
      );
    }
    if (carga.estado === 'error') {
      return (
        <View style={s.aviso}>
          <EliteText style={s.avisoTitulo}>No se pudo leer tu genética</EliteText>
          <EliteText style={s.avisoTexto}>Puede ser tu conexión. Tu evaluación sigue guardada.</EliteText>
          {reintentar}
        </View>
      );
    }
    const vigente = carga.vigente;
    if (!vigente) {
      return (
        <View style={s.aviso}>
          <EliteText style={s.avisoTitulo}>Tu evaluación todavía no está cargada</EliteText>
          <EliteText style={s.avisoTexto}>Cuando Enrique termine de interpretarla, tu genética aparece aquí.</EliteText>
          {reintentar}
        </View>
      );
    }
    if (!vigente.evaluacion) {
      return (
        <View style={s.aviso}>
          <EliteText style={s.avisoTitulo}>No se pudo leer tu evaluación</EliteText>
          <EliteText style={s.avisoTexto}>Está guardada, pero trae un formato que esta versión de la app no entiende. Actualiza la app o reintenta.</EliteText>
          {reintentar}
        </View>
      );
    }
    const e = vigente.evaluacion;
    if (e.genetica.hallazgos.length === 0) {
      return (
        <View style={s.aviso}>
          <EliteText style={s.avisoTitulo}>Tu genética se integra en la segunda entrega (semana 8)</EliteText>
          <EliteText style={s.avisoTexto}>
            Tu evaluación versión {e.version} ya está en la app. Cuando llegue la interpretación genética, aquí la ves por tema, con qué hacer en cada caso.
          </EliteText>
          <Pressable style={s.cta} onPress={() => { haptic.light(); router.push('/salud/evaluacion-elite'); }} accessibilityRole="button">
            <EliteText style={s.ctaText}>Ver mi evaluación Elite</EliteText>
          </Pressable>
        </View>
      );
    }
    const grupos = porTema(e.genetica.hallazgos);
    return (
      <>
        <View style={s.cabecera}>
          <EliteText style={s.cabeceraTitulo}>{e.genetica.hallazgos.length} hallazgos en {grupos.length} temas</EliteText>
          <EliteText style={s.cabeceraMeta}>Interpretada por {e.interpretado_por.genetica ?? e.interpretado_por.evaluacion}</EliteText>
          <EliteText style={s.cabeceraMeta}>Evaluación versión {e.version} · {formatearFecha(vigente.created_at)}</EliteText>
          {e.genetica.intro ? <EliteText style={s.intro}>{e.genetica.intro}</EliteText> : null}
        </View>

        {grupos.map((g) => (
          <View key={g.tema} style={s.grupo}>
            <EliteText style={s.grupoTitulo}>{g.tema}</EliteText>
            {g.items.map((h, i) => (
              <View key={`${h.titulo}-${i}`} style={s.card}>
                <EliteText style={s.titulo}>{h.titulo}</EliteText>
                {h.gen || h.variante ? (
                  <View style={s.chipsInline}>
                    {[h.gen, h.variante, h.genotipo].filter((x): x is string => !!x).map((x, i) => (
                      <View key={`${x}-${i}`} style={s.chip}><EliteText style={s.chipText}>{x}</EliteText></View>
                    ))}
                  </View>
                ) : null}
                <EliteText style={s.etiqueta}>Hallazgo</EliteText>
                <EliteText style={s.parrafo}>{h.hallazgo}</EliteText>
                <EliteText style={s.etiqueta}>Qué significa para ti</EliteText>
                <EliteText style={s.parrafo}>{h.implicacion}</EliteText>
                {h.que_hacer ? (
                  <>
                    <EliteText style={s.etiqueta}>Qué hacer</EliteText>
                    <EliteText style={s.parrafo}>{h.que_hacer}</EliteText>
                  </>
                ) : null}
                <View style={s.evidenciaRow}>
                  <View style={s.peldanos}>
                    {[1, 2, 3, 4].map((k) => (
                      <View key={k} style={[s.peldano, { backgroundColor: h.evidencia !== null && k <= h.evidencia ? t.texto : t.borde }]} />
                    ))}
                  </View>
                  <EliteText style={s.evidenciaText}>{etiquetaEvidencia(h.evidencia)}</EliteText>
                </View>
              </View>
            ))}
          </View>
        ))}

        {e.genetica.resumen.map((b) => (
          <View key={b.titulo} style={s.card}>
            <EliteText style={s.titulo}>{b.titulo}</EliteText>
            {b.parrafos.map((p, i) => <EliteText key={i} style={s.parrafo}>{p}</EliteText>)}
          </View>
        ))}

        <Pressable onPress={() => { haptic.light(); router.push('/salud/evaluacion-elite'); }} accessibilityRole="link" style={s.enlaceRow}>
          <EliteText style={s.enlace}>Ver mi evaluación Elite completa</EliteText>
          <Ionicons name="chevron-forward" size={14} color={t.textoSecundario} />
        </Pressable>
      </>
    );
  };

  return (
    <MedicalDisclaimerGate>
      <Screen edges={[]} themed>
        <StatusBar style={t.kind === 'light' ? 'dark' : 'light'} />
        <ScreenHeader title="Genética" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {cuerpo()}
          <ResultDisclaimerFooter />
        </ScrollView>
      </Screen>
    </MedicalDisclaimerGate>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  center: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  centerText: { color: t.textoSecundario, fontSize: FontSizes.sm },
  bloque: { marginTop: Spacing.xl },
  aviso: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: Spacing.xs, marginTop: Spacing.md,
  },
  avisoTitulo: { color: t.texto, fontFamily: Fonts.semiBold },
  avisoTexto: { color: t.textoSecundario, lineHeight: 18, fontSize: FontSizes.sm },
  cta: { backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', marginTop: Spacing.xs },
  ctaText: { color: t.textoSobreLima, fontFamily: Fonts.bold },

  cabecera: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: 4,
  },
  cabeceraTitulo: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  cabeceraMeta: { color: t.textoSecundario, fontSize: FontSizes.xs },
  intro: { color: t.texto, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 4 },

  grupo: { gap: Spacing.xs, marginTop: Spacing.xs },
  grupoTitulo: { color: t.textoSecundario, letterSpacing: 1, textTransform: 'uppercase', fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  card: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: 4,
  },
  titulo: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, lineHeight: 22 },
  etiqueta: { color: t.textoSecundario, fontSize: FontSizes.xs, letterSpacing: 0.5, marginTop: 4 },
  parrafo: { color: t.texto, fontSize: FontSizes.sm, lineHeight: 20 },
  chipsInline: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde },
  chipText: { color: t.texto, fontSize: 10, letterSpacing: 0.5 },
  evidenciaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 6 },
  peldanos: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  peldano: { width: 6, height: 10, borderRadius: 1 },
  evidenciaText: { color: t.textoSecundario, fontSize: FontSizes.xs, flex: 1 },
  enlaceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.xs },
  enlace: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
