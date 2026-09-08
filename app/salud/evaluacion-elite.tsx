/**
 * Mi evaluación Elite (ATP 3.0, 6-sep-2026, ruta 3.3 y 3.10).
 *
 * El entregable de Enrique (formato Omar, esquema `elite_v3`) navegable dentro
 * de la app: quince secciones con chips arriba y scroll por sección, tres
 * estados (▲ pide acción, ◆ en rango no en su mejor punto, ● donde queremos),
 * chips de fuente, escalera de evidencia y botón de PDF. Se enciende por
 * EXISTENCIA de la evaluación (functional_dx con `elite_v3`), no por nivel:
 * cuando Pro vence, la evaluación se queda (dato del usuario sagrado).
 *
 * Nada aquí calcula rangos ni estados: todo lo escribió y firmó una persona
 * (`interpretado_por`). La lógica pura (orden de sistemas, etiquetas, formato,
 * versiones, HTML de respaldo) vive en evaluacion-elite-core.ts con test.
 *
 * Estados: cargando, candado (sin evaluación y sin duda de lectura), vacío
 * (gate abierto pero sin filas), no se pudo leer (con reintentar) y el
 * documento. Tinta: t.texto y t.textoSecundario; estados con t.critico,
 * t.advertencia y t.exito. Nunca sinDatos como color de texto.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { CandadoBloque } from '@/src/components/ui/CandadoBloque';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { RUTA_ELITE } from '@/src/constants/rutas-3-0';
import { shareHtmlAsPdf } from '@/src/services/dx/dx-pdf-service';
import { fetchEvaluacionesElite, fetchHtmlEvaluacionElite } from '@/src/services/elite/evaluacion-elite-service';
import {
  ETIQUETA_FUENTE,
  ETIQUETA_NIVEL_EJE,
  SECCIONES_UI,
  etiquetaEstado,
  etiquetaEvidencia,
  formatearDiferenciaAnios,
  formatearFecha,
  formatearRango,
  formatearValor,
  htmlDeEvaluacion,
  ordenarSistemas,
  type SeccionUiKey,
  type VersionElite,
} from '@/src/services/elite/evaluacion-elite-core';
import { ELITE_EJES, type EliteEstado, type EliteEvidencia, type EliteMarcador, type EliteV3 } from '@/src/services/elite/elite-v3-core';
import { LEYENDA_SUPLEMENTOS } from '@/src/services/argos-suplementos-ayuno-core';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'ok'; versiones: VersionElite[] }
  | { estado: 'error' };

const MOMENTO_LABEL: Record<string, string> = {
  morning: 'Mañana',
  with_food: 'Con comida',
  afternoon: 'Tarde',
  evening: 'Noche',
  bedtime: 'Al dormir',
};

const EJE_LABEL: Record<string, string> = {
  dopamina: 'Dopamina',
  acetilcolina: 'Acetilcolina',
  serotonina: 'Serotonina',
  gaba: 'GABA',
};

export default function EvaluacionEliteScreen() {
  const { tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const { tieneEvaluacionElite, evaluacionEliteNoSePudoLeer, isLoading: nivelCargando } = useSubscription();

  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [compartiendo, setCompartiendo] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<SeccionUiKey, number>>>({});

  useEffect(() => {
    if (!user?.id) return;
    let vivo = true;
    setCarga({ estado: 'cargando' });
    fetchEvaluacionesElite(user.id).then((r) => {
      if (!vivo) return;
      if (r.estado === 'error') { setCarga({ estado: 'error' }); return; }
      setCarga({ estado: 'ok', versiones: r.versiones });
      setSeleccionada(r.versiones[0]?.id ?? null);
    });
    return () => { vivo = false; };
  }, [user?.id, intento]);

  const versiones = carga.estado === 'ok' ? carga.versiones : [];
  const vigente = versiones[0] ?? null;
  const actual = versiones.find((v) => v.id === seleccionada) ?? vigente;
  const esAnterior = actual !== null && vigente !== null && actual.id !== vigente.id;
  const evaluacion = actual?.evaluacion ?? null;

  const irA = useCallback((key: SeccionUiKey) => {
    haptic.light();
    const y = offsets.current[key];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }, []);

  const registrar = useCallback((key: SeccionUiKey) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  }, []);

  const descargarPdf = useCallback(async () => {
    if (!evaluacion || compartiendo) return;
    haptic.medium();
    setCompartiendo(true);
    // El html del generador no viaja con la lista (pesa); se pide aqui por id.
    // Si no lo trae o no se pudo leer, el PDF sale del HTML de respaldo.
    const lectura = actual ? await fetchHtmlEvaluacionElite(actual.id) : null;
    const html = lectura && lectura.estado === 'ok' && lectura.html ? lectura.html : htmlDeEvaluacion(evaluacion);
    const r = await shareHtmlAsPdf(html, `Evaluacion-Elite-v${evaluacion.version}.pdf`, 'Compartir Mi evaluación Elite');
    setCompartiendo(false);
    if (r === 'shared') haptic.success();
    else if (r === 'unavailable') Alert.alert('Compartir no disponible', 'Tu dispositivo no permite compartir archivos desde la app.');
    else Alert.alert('No se pudo generar el PDF', 'Tu evaluación sigue disponible aquí en pantalla. Intenta de nuevo más tarde.');
  }, [evaluacion, actual, compartiendo]);

  // Gate por existencia. Ante la duda (no se pudo leer si existe) se abre y
  // la lectura de aquí decide (regla 1: no cerrarle nada a quien pagó).
  const gateCerrado = !nivelCargando && !tieneEvaluacionElite && !evaluacionEliteNoSePudoLeer;

  const cuerpo = () => {
    if (gateCerrado) {
      return (
        <View style={s.bloque}>
          <CandadoBloque
            titulo="Disponible en ATP Elite"
            texto="Tu evaluación personalizada con Enrique: laboratorios, genética, composición corporal y química cerebral leídos juntos, con tu plan de alimentación, suplementos y entrenamiento."
            boton="Conocer ATP Elite"
            destino={RUTA_ELITE}
          />
        </View>
      );
    }
    if (nivelCargando || carga.estado === 'cargando') {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          <EliteText style={s.centerText}>Cargando tu evaluación…</EliteText>
        </View>
      );
    }
    if (carga.estado === 'error') {
      return (
        <View style={s.aviso}>
          <EliteText style={s.avisoTitulo}>No se pudo leer tu evaluación</EliteText>
          <EliteText style={s.avisoTexto}>Puede ser tu conexión. Tu evaluación sigue guardada.</EliteText>
          <Pressable style={s.cta} onPress={() => { haptic.light(); setIntento((n) => n + 1); }} accessibilityRole="button">
            <EliteText style={s.ctaText}>Reintentar</EliteText>
          </Pressable>
        </View>
      );
    }
    if (!actual) {
      return (
        <View style={s.aviso}>
          <EliteText style={s.avisoTitulo}>Tu evaluación todavía no está cargada</EliteText>
          <EliteText style={s.avisoTexto}>
            Cuando Enrique termine de interpretarla aparece aquí. Si ya te la entregaron y no la ves, reintenta.
          </EliteText>
          <Pressable style={s.cta} onPress={() => { haptic.light(); setIntento((n) => n + 1); }} accessibilityRole="button">
            <EliteText style={s.ctaText}>Reintentar</EliteText>
          </Pressable>
        </View>
      );
    }
    if (!evaluacion) {
      return (
        <View style={s.aviso}>
          <EliteText style={s.avisoTitulo}>No se pudo leer tu evaluación</EliteText>
          <EliteText style={s.avisoTexto}>
            La versión {actual.version_elite} está guardada pero trae un formato que esta versión de la app no entiende. Actualiza la app o reintenta.
          </EliteText>
          <Pressable style={s.cta} onPress={() => { haptic.light(); setIntento((n) => n + 1); }} accessibilityRole="button">
            <EliteText style={s.ctaText}>Reintentar</EliteText>
          </Pressable>
        </View>
      );
    }
    return (
      <Documento
        e={evaluacion}
        versiones={versiones}
        actual={actual}
        esAnterior={esAnterior}
        onElegir={(id) => { haptic.light(); setSeleccionada(id); scrollRef.current?.scrollTo({ y: 0, animated: false }); }}
        onPdf={descargarPdf}
        compartiendo={compartiendo}
        registrar={registrar}
        irA={irA}
        s={s}
        t={t}
      />
    );
  };

  return (
    <MedicalDisclaimerGate>
      <Screen edges={[]} themed>
        <StatusBar style={t.kind === 'light' ? 'dark' : 'light'} />
        <ScreenHeader title="Mi evaluación Elite" onBack={() => router.back()} />
        <ScrollView ref={scrollRef} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {cuerpo()}
          <ResultDisclaimerFooter />
        </ScrollView>
      </Screen>
    </MedicalDisclaimerGate>
  );
}

// ─── El documento ───────────────────────────────────────────────────────────

interface DocumentoProps {
  e: EliteV3;
  versiones: VersionElite[];
  actual: VersionElite;
  esAnterior: boolean;
  onElegir: (id: string) => void;
  onPdf: () => void;
  compartiendo: boolean;
  registrar: (key: SeccionUiKey) => (e: LayoutChangeEvent) => void;
  irA: (key: SeccionUiKey) => void;
  s: ReturnType<typeof makeStyles>;
  t: AppThemeTokens;
}

function Documento({ e, versiones, actual, esAnterior, onElegir, onPdf, compartiendo, registrar, irA, s, t }: DocumentoProps) {
  const sistemas = ordenarSistemas(e.sistemas);
  // SeccionBloque vive fuera de este componente: definirla aqui adentro la
  // remontaria en cada render y perderia los offsets de las secciones.
  return (
    <>
      {/* Cabecera */}
      <View style={s.cabecera}>
        <EliteText style={s.cabeceraNombre}>{e.cliente.nombre_preferido}</EliteText>
        <EliteText style={s.cabeceraMeta}>
          Versión {e.version} · toma {formatearFecha(e.cliente.fecha_toma)} · generada {formatearFecha(e.generado_en)}
        </EliteText>
        <EliteText style={s.cabeceraMeta}>
          {e.cliente.sexo === 'female' ? 'Mujer' : 'Hombre'} de {e.cliente.edad} años
        </EliteText>
        <EliteText style={s.cabeceraMeta}>Interpretada por {e.interpretado_por.evaluacion}</EliteText>
        {esAnterior && (
          <View style={s.anteriorRow}>
            <View style={s.anteriorPill}><EliteText style={s.anteriorPillText}>Versión anterior</EliteText></View>
            <Pressable onPress={() => { haptic.light(); router.push('/edad-atp/comparar'); }} accessibilityRole="link" hitSlop={8}>
              <EliteText style={s.enlace}>Comparar mis laboratorios</EliteText>
            </Pressable>
          </View>
        )}
        <AnimatedPressable onPress={onPdf} style={s.pdfBoton} accessibilityRole="button" accessibilityLabel="Descargar PDF">
          <Ionicons name="download-outline" size={16} color={t.textoSobreLima} />
          <EliteText style={s.pdfBotonText}>{compartiendo ? 'Generando PDF…' : 'Descargar PDF'}</EliteText>
        </AnimatedPressable>
      </View>

      {/* Versiones (ruta 3.10) */}
      {versiones.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow} style={s.chipsScroll}>
          {versiones.map((v) => {
            const activa = v.id === actual.id;
            return (
              <Pressable key={v.id} onPress={() => onElegir(v.id)} style={[s.chip, activa && s.chipActiva]} accessibilityRole="button" accessibilityState={{ selected: activa }}>
                <EliteText style={[s.chipText, activa && s.chipTextActiva]}>
                  v{v.version_elite} · {formatearFecha(v.created_at)}
                </EliteText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Chips de sección */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow} style={s.chipsScroll}>
        {SECCIONES_UI.map((sec) => (
          <Pressable key={sec.key} onPress={() => irA(sec.key)} style={s.chip} accessibilityRole="button">
            <EliteText style={s.chipText}>{sec.label}</EliteText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Inicio */}
      <SeccionBloque registrar={registrar} s={s} k="inicio" titulo="Inicio">
        <View style={s.card}>
          <View style={s.edadesRow}>
            <Dato etiqueta="Edad cronológica" valor={formatearValor(e.inicio.edad_cronologica, 'años')} s={s} />
            <Dato etiqueta="Edad ATP" valor={formatearValor(e.inicio.edad_atp, 'años')} s={s} />
            <Dato etiqueta="Diferencia" valor={formatearDiferenciaAnios(e.inicio.diferencia_anios)} s={s} />
          </View>
          {e.inicio.lead ? <EliteText style={s.lead}>{e.inicio.lead}</EliteText> : null}
          {e.inicio.programa_semanas !== null ? (
            <EliteText style={s.meta}>Programa de {e.inicio.programa_semanas} semanas</EliteText>
          ) : null}
        </View>
      </SeccionBloque>

      {/* Conteo */}
      <SeccionBloque registrar={registrar} s={s} k="conteo" titulo="En números">
        <View style={s.card}>
          <View style={s.edadesRow}>
            <Dato etiqueta="Medidos" valor={formatearValor(e.conteo.total_medido, null)} s={s} />
            <Dato etiqueta="Piden acción" valor={formatearValor(e.conteo.piden_accion, null)} s={s} />
            <Dato etiqueta="Hallazgos de ADN" valor={formatearValor(e.conteo.hallazgos_adn, null)} s={s} />
          </View>
          {e.conteo.mueven_tu_caso ? (
            <EliteText style={s.meta}>
              Los que mueven tu caso: {e.conteo.mueven_tu_caso.att} piden acción, {e.conteo.mueven_tu_caso.sub} en rango sin estar en su mejor punto, {e.conteo.mueven_tu_caso.opt} donde queremos.
            </EliteText>
          ) : null}
          {/* 8-sep-2026: dos numeros que el documento traia y la pantalla no pintaba. */}
          {e.conteo.valores_medidos !== null ? (
            <EliteText style={s.meta}>Valores medidos: {e.conteo.valores_medidos}</EliteText>
          ) : null}
          {e.conteo.ejes_quimica !== null ? (
            <EliteText style={s.meta}>Ejes de química cerebral: {e.conteo.ejes_quimica}</EliteText>
          ) : null}
          {e.conteo.ritmo_envejecimiento_meses !== null ? (
            <EliteText style={s.meta}>Ritmo de envejecimiento: {e.conteo.ritmo_envejecimiento_meses} meses por año</EliteText>
          ) : null}
          {e.conteo.calidad_estudio !== null ? (
            <EliteText style={s.meta}>Calidad del estudio: {e.conteo.calidad_estudio} de 100</EliteText>
          ) : null}
        </View>
      </SeccionBloque>

      {/* Edades */}
      <SeccionBloque registrar={registrar} s={s} k="edades" titulo="Edades">
        <View style={s.card}>
          <View style={s.edadesRow}>
            <Dato etiqueta="Real" valor={formatearValor(e.edades.real, null)} s={s} />
            <Dato etiqueta="Sangre" valor={formatearValor(e.edades.sangre, null)} s={s} />
            <Dato etiqueta="Vida" valor={formatearValor(e.edades.vida, null)} s={s} />
            <Dato etiqueta="ATP" valor={formatearValor(e.edades.atp, null)} s={s} />
          </View>
          {e.edades.sf_pct !== null ? <EliteText style={s.meta}>SF global: {e.edades.sf_pct}%</EliteText> : null}
          {e.edades.detalle.map((b) => (
            <View key={b.titulo} style={s.bloqueTexto}>
              <EliteText style={s.subtitulo}>{b.titulo}</EliteText>
              {b.parrafos.map((p, i) => <EliteText key={i} style={s.parrafo}>{p}</EliteText>)}
            </View>
          ))}
        </View>
      </SeccionBloque>

      {/* Sistemas */}
      <SeccionBloque registrar={registrar} s={s} k="sistemas" titulo="Sistemas, de peor a mejor">
        {sistemas.map((sis) => {
          const est = etiquetaEstado(sis.estado);
          const color = est.token ? t[est.token] : t.textoSecundario;
          return (
            <View key={sis.key} style={s.card}>
              <View style={s.filaTop}>
                <EliteText style={[s.simbolo, { color }]}>{est.simbolo}</EliteText>
                <EliteText style={s.nombre}>{sis.nombre}</EliteText>
                <EliteText style={[s.score, { color }]}>{sis.score === null ? '' : `${sis.score}`}</EliteText>
              </View>
              <EliteText style={[s.estadoTexto, { color }]}>{est.texto}</EliteText>
              <EliteText style={s.parrafo}>{sis.por_que}</EliteText>
            </View>
          );
        })}
      </SeccionBloque>

      {/* Contexto */}
      <SeccionBloque registrar={registrar} s={s} k="contexto" titulo="Contexto">
        <View style={s.card}>
          {e.contexto.parrafos.map((p, i) => <EliteText key={i} style={s.parrafo}>{p}</EliteText>)}
          {e.contexto.cita ? <EliteText style={s.cita}>“{e.contexto.cita}”</EliteText> : null}
          {e.contexto.antecedentes.length > 0 && (
            <View style={s.bloqueTexto}>
              <EliteText style={s.subtitulo}>Antecedentes</EliteText>
              {e.contexto.antecedentes.map((a, i) => <EliteText key={i} style={s.parrafo}>· {a}</EliteText>)}
            </View>
          )}
        </View>
      </SeccionBloque>

      {/* Marcadores */}
      <SeccionBloque registrar={registrar} s={s} k="marcadores" titulo="Marcadores">
        {e.marcadores.intro ? <EliteText style={s.intro}>{e.marcadores.intro}</EliteText> : null}
        <Leyenda s={s} t={t} />
        {e.marcadores.grupos.map((g) => (
          <View key={g.nombre} style={s.grupo}>
            <EliteText style={s.grupoTitulo}>{g.nombre}</EliteText>
            {g.marcadores.map((m) => <FilaMarcador key={m.key} m={m} s={s} t={t} />)}
          </View>
        ))}
        {e.marcadores.notas.length > 0 && (
          <View style={s.card}>
            <EliteText style={s.subtitulo}>Lo que este estudio no alcanza a ver</EliteText>
            {e.marcadores.notas.map((n, i) => <EliteText key={i} style={s.parrafo}>· {n}</EliteText>)}
          </View>
        )}
      </SeccionBloque>

      {/* Composición */}
      <SeccionBloque registrar={registrar} s={s} k="composicion" titulo="Composición corporal">
        {e.composicion.reparto ? (
          <View style={s.card}>
            <View style={s.edadesRow}>
              <Dato etiqueta="Peso" valor={formatearValor(e.composicion.reparto.peso_kg, 'kg')} s={s} />
              <Dato etiqueta="Grasa" valor={formatearValor(e.composicion.reparto.grasa_pct, '%')} s={s} />
              <Dato etiqueta="Músculo" valor={formatearValor(e.composicion.reparto.musculo_pct, '%')} s={s} />
            </View>
            {/* 8-sep-2026: los kilos y el resto del reparto ya venian en el
                documento y no se pintaban. Sin dato va la raya, no un cero. */}
            {e.composicion.reparto.grasa_kg !== null || e.composicion.reparto.musculo_kg !== null ? (
              <EliteText style={s.meta}>
                En kilos: grasa {formatearValor(e.composicion.reparto.grasa_kg, 'kg')} · músculo {formatearValor(e.composicion.reparto.musculo_kg, 'kg')}
              </EliteText>
            ) : null}
            {e.composicion.reparto.resto_pct !== null || e.composicion.reparto.resto_kg !== null ? (
              <EliteText style={s.meta}>
                Resto: {formatearValor(e.composicion.reparto.resto_pct, '%')} · {formatearValor(e.composicion.reparto.resto_kg, 'kg')}
              </EliteText>
            ) : null}
          </View>
        ) : null}
        {e.composicion.filas.map((m) => <FilaMarcador key={m.key} m={m} s={s} t={t} />)}
      </SeccionBloque>

      {/* Braverman */}
      <SeccionBloque registrar={registrar} s={s} k="braverman" titulo="Química cerebral">
        <View style={s.card}>
          {e.braverman.intro ? <EliteText style={s.parrafo}>{e.braverman.intro}</EliteText> : null}
          {e.braverman.naturaleza || e.braverman.desgaste ? (
            <View style={s.bloqueTexto}>
              <View style={s.ejeCabecera}>
                <EliteText style={[s.ejeCelda, s.ejeCabeceraText]}>Eje</EliteText>
                <EliteText style={[s.ejeCelda, s.ejeCabeceraText, s.ejeNum]}>Naturaleza</EliteText>
                <EliteText style={[s.ejeCelda, s.ejeCabeceraText, s.ejeNum]}>Desgaste</EliteText>
              </View>
              {ELITE_EJES.map((eje) => (
                <View key={eje} style={s.ejeFila}>
                  <EliteText style={[s.ejeCelda, s.parrafo]}>{EJE_LABEL[eje]}</EliteText>
                  <EliteText style={[s.ejeCelda, s.parrafo, s.ejeNum]}>{e.braverman.naturaleza ? e.braverman.naturaleza[eje] : '·'}</EliteText>
                  <EliteText style={[s.ejeCelda, s.parrafo, s.ejeNum]}>{e.braverman.desgaste ? e.braverman.desgaste[eje] : '·'}</EliteText>
                </View>
              ))}
            </View>
          ) : (
            <EliteText style={s.meta}>Sin test de química cerebral en esta versión.</EliteText>
          )}
          {e.braverman.lecturas.map((b) => (
            <View key={b.titulo} style={s.bloqueTexto}>
              <EliteText style={s.subtitulo}>{b.titulo}</EliteText>
              {b.parrafos.map((p, i) => <EliteText key={i} style={s.parrafo}>{p}</EliteText>)}
            </View>
          ))}
          {e.braverman.ejes.map((x) => (
            <View key={x.eje} style={s.bloqueTexto}>
              <EliteText style={s.subtitulo}>{x.titulo}{x.nivel ? ` · ${ETIQUETA_NIVEL_EJE[x.nivel]}` : ''}</EliteText>
              <EliteText style={s.parrafo}>{x.texto}</EliteText>
            </View>
          ))}
          {e.braverman.cierre.map((p, i) => <EliteText key={i} style={s.parrafo}>{p}</EliteText>)}
        </View>
      </SeccionBloque>

      {/* Genética */}
      <SeccionBloque registrar={registrar} s={s} k="genetica" titulo="Genética">
        {e.genetica.hallazgos.length === 0 ? (
          <View style={s.card}>
            <EliteText style={s.parrafo}>Tu genética se integra en la segunda entrega (semana 8).</EliteText>
          </View>
        ) : (
          <>
            {e.interpretado_por.genetica ? <EliteText style={s.intro}>Interpretada por {e.interpretado_por.genetica}</EliteText> : null}
            {e.genetica.intro ? <EliteText style={s.intro}>{e.genetica.intro}</EliteText> : null}
            {e.genetica.hallazgos.map((h, i) => (
              <View key={`${h.tema}-${i}`} style={s.card}>
                <EliteText style={s.grupoTitulo}>{h.tema}</EliteText>
                <EliteText style={s.nombre}>{h.titulo}</EliteText>
                {h.gen || h.variante ? (
                  <EliteText style={s.meta}>{[h.gen, h.variante, h.genotipo].filter(Boolean).join(' · ')}</EliteText>
                ) : null}
                <EliteText style={s.parrafo}>{h.hallazgo}</EliteText>
                <EliteText style={s.parrafo}>{h.implicacion}</EliteText>
                {h.que_hacer ? <EliteText style={s.parrafo}><EliteText style={s.negrita}>Qué hacer: </EliteText>{h.que_hacer}</EliteText> : null}
                <Evidencia n={h.evidencia} s={s} t={t} />
              </View>
            ))}
            {e.genetica.resumen.map((b) => (
              <View key={b.titulo} style={s.card}>
                <EliteText style={s.subtitulo}>{b.titulo}</EliteText>
                {b.parrafos.map((p, i) => <EliteText key={i} style={s.parrafo}>{p}</EliteText>)}
              </View>
            ))}
            <Pressable onPress={() => { haptic.light(); router.push('/salud/genetica'); }} accessibilityRole="link" style={s.enlaceRow}>
              <EliteText style={s.enlace}>Abrir el módulo de Genética</EliteText>
              <Ionicons name="chevron-forward" size={14} color={t.textoSecundario} />
            </Pressable>
          </>
        )}
      </SeccionBloque>

      {/* Cruces */}
      <SeccionBloque registrar={registrar} s={s} k="cruces" titulo="Cruces">
        {e.cruces.hilo ? (
          <View style={s.card}>
            <EliteText style={s.subtitulo}>El hilo</EliteText>
            <EliteText style={s.parrafo}>
              <EliteText style={s.negrita}>{e.cruces.hilo.variable}</EliteText> aparece en {e.cruces.hilo.en} de {e.cruces.hilo.de} cruces.
            </EliteText>
          </View>
        ) : null}
        {e.cruces.lista.map((x, i) => (
          <View key={`${x.titulo}-${i}`} style={s.card}>
            <EliteText style={s.nombre}>{i + 1}. {x.titulo}</EliteText>
            <View style={s.chipsInline}>
              {x.fuentes.map((f) => <ChipFuente key={f} f={f} s={s} />)}
            </View>
            <EliteText style={s.parrafo}><EliteText style={s.negrita}>Lo que se ve: </EliteText>{x.hallazgo}</EliteText>
            <EliteText style={s.parrafo}><EliteText style={s.negrita}>Cómo lo sabemos: </EliteText>{x.consecuencia}</EliteText>
            <EliteText style={s.parrafo}><EliteText style={s.negrita}>La regla: </EliteText>{x.accion}</EliteText>
            {x.con_que_cruza ? <EliteText style={s.meta}>Con qué más cruza: {x.con_que_cruza}</EliteText> : null}
            {x.falta_medir ? <EliteText style={s.meta}>Lo que falta medir: {x.falta_medir}</EliteText> : null}
            <Evidencia n={x.evidencia} s={s} t={t} />
          </View>
        ))}
      </SeccionBloque>

      {/* Médico: pendientes */}
      <SeccionBloque registrar={registrar} s={s} k="medico" titulo="Pendientes de medir">
        {e.medico.intro ? <EliteText style={s.intro}>{e.medico.intro}</EliteText> : null}
        {e.medico.fuera_del_tuyo.length > 0 && (
          <View style={s.card}>
            <EliteText style={s.subtitulo}>Dentro del rango del laboratorio, fuera del nuestro</EliteText>
            {e.medico.fuera_del_tuyo.map((f) => (
              <View key={f.marcador_key} style={s.bloqueTexto}>
                <EliteText style={s.nombre}>{f.nombre}: {f.valor_texto}</EliteText>
                <EliteText style={s.meta}>El laboratorio dice: {f.lab_dice}</EliteText>
                <EliteText style={s.parrafo}>Nosotros decimos: {f.nosotros_decimos}</EliteText>
              </View>
            ))}
          </View>
        )}
        {e.medico.pendientes.length === 0 ? (
          <View style={s.card}><EliteText style={s.parrafo}>Nada pendiente de medir en esta versión.</EliteText></View>
        ) : e.medico.pendientes.map((p, i) => (
          <View key={`${p.que}-${i}`} style={s.card}>
            <EliteText style={s.nombre}>{p.que}</EliteText>
            <EliteText style={s.parrafo}>{p.por_que}</EliteText>
            <EliteText style={s.meta}>{p.con_quien}</EliteText>
          </View>
        ))}
        {e.medico.advertencias.map((b) => (
          <View key={b.titulo} style={s.card}>
            <EliteText style={s.subtitulo}>{b.titulo}</EliteText>
            {b.parrafos.map((p, i) => <EliteText key={i} style={s.parrafo}>{p}</EliteText>)}
          </View>
        ))}
      </SeccionBloque>

      {/* Cierre */}
      <SeccionBloque registrar={registrar} s={s} k="cierre" titulo="Cierre: tus tres palancas">
        {e.cierre.palancas.map((p, i) => (
          <View key={p.titulo} style={s.card}>
            <EliteText style={s.nombre}>{i + 1}. {p.titulo}</EliteText>
            <EliteText style={s.parrafo}>{p.por_que}</EliteText>
            <EliteText style={s.parrafo}><EliteText style={s.negrita}>Cómo: </EliteText>{p.como}</EliteText>
          </View>
        ))}
        {(e.cierre.vigencia || e.cierre.firma || e.cierre.disclaimer) ? (
          <View style={s.card}>
            {e.cierre.vigencia ? <EliteText style={s.parrafo}>{e.cierre.vigencia}</EliteText> : null}
            {e.cierre.firma ? <EliteText style={s.negrita}>{e.cierre.firma}</EliteText> : null}
            {e.cierre.disclaimer ? <EliteText style={s.meta}>{e.cierre.disclaimer}</EliteText> : null}
          </View>
        ) : null}
      </SeccionBloque>

      {/* Alimentación */}
      <SeccionBloque registrar={registrar} s={s} k="alimentacion" titulo="Alimentación">
        <View style={s.card}>
          {e.alimentacion.ventana ? (
            <EliteText style={s.parrafo}><EliteText style={s.negrita}>Ventana de alimentación: </EliteText>{e.alimentacion.ventana.inicio} a {e.alimentacion.ventana.fin}</EliteText>
          ) : null}
          {e.alimentacion.prioriza.length > 0 && (
            <View style={s.bloqueTexto}>
              <EliteText style={s.subtitulo}>Prioriza</EliteText>
              {e.alimentacion.prioriza.map((x, i) => <EliteText key={i} style={s.parrafo}>· {x}</EliteText>)}
            </View>
          )}
          {e.alimentacion.evita.length > 0 && (
            <View style={s.bloqueTexto}>
              <EliteText style={s.subtitulo}>Evita</EliteText>
              {e.alimentacion.evita.map((x, i) => <EliteText key={i} style={s.parrafo}>· {x}</EliteText>)}
            </View>
          )}
          {e.alimentacion.horarios.length > 0 && (
            <View style={s.bloqueTexto}>
              <EliteText style={s.subtitulo}>Horarios</EliteText>
              {e.alimentacion.horarios.map((h, i) => <EliteText key={i} style={s.parrafo}><EliteText style={s.negrita}>{h.momento}: </EliteText>{h.que}</EliteText>)}
            </View>
          )}
          {e.alimentacion.notas.map((n, i) => <EliteText key={i} style={s.meta}>{n}</EliteText>)}
          {e.alimentacion.prioriza.length + e.alimentacion.evita.length + e.alimentacion.horarios.length === 0 && !e.alimentacion.ventana ? (
            <EliteText style={s.parrafo}>Tu plan de alimentación llega con la siguiente entrega.</EliteText>
          ) : null}
        </View>
      </SeccionBloque>

      {/* Suplementos */}
      <SeccionBloque registrar={registrar} s={s} k="suplementos" titulo="Suplementos">
        {e.suplementos.length === 0 ? (
          <View style={s.card}><EliteText style={s.parrafo}>Sin plan de suplementos en esta versión.</EliteText></View>
        ) : (
          <>
            {/* 8-sep-2026: antes decia "ya está en tu módulo". Si el cliente
                pausó una ficha, el módulo no la lista y la promesa quedaba
                falsa. Una pausada no se revive sola: se dice dónde está y
                quién decide. */}
            <View style={s.avisoSuave}>
              <Ionicons name="checkmark-circle" size={16} color={t.exito} />
              <EliteText style={s.avisoSuaveText}>
                Tu plan también vive en el módulo de Suplementos, con la etiqueta de quien lo asignó. Si pausaste alguno, ahí aparece en pausa y tú decides cuándo reanudarlo.
              </EliteText>
            </View>
            {e.suplementos.map((sup, i) => (
              <View key={`${sup.nombre}-${i}`} style={s.card}>
                <EliteText style={s.nombre}>{sup.nombre}</EliteText>
                <EliteText style={s.meta}>
                  {sup.dosis_cantidad !== null && sup.dosis_unidad ? `${sup.dosis_cantidad} ${sup.dosis_unidad}` : 'Dosis sin fijar'}
                  {sup.unidades_por_toma !== null ? ` · ${sup.unidades_por_toma} por toma` : ''}
                  {sup.momento ? ` · ${MOMENTO_LABEL[sup.momento] ?? sup.momento}` : ''}
                  {sup.duracion ? ` · ${sup.duracion}` : ''}
                </EliteText>
                <EliteText style={s.parrafo}>{sup.por_que}</EliteText>
                {sup.advertencia ? <EliteText style={[s.meta, { color: t.advertencia }]}>{sup.advertencia}</EliteText> : null}
              </View>
            ))}
            {/* ATP 3.0 (ruta 2.0, 5-sep-2026): leyenda fija de LGS 216, la misma que usa ARGOS. */}
            <EliteText style={[s.meta, { marginTop: 4 }]}>{LEYENDA_SUPLEMENTOS}</EliteText>
            <Pressable onPress={() => { haptic.light(); router.push('/supplements'); }} accessibilityRole="link" style={s.enlaceRow}>
              <EliteText style={s.enlace}>Abrir mi módulo de Suplementos</EliteText>
              <Ionicons name="chevron-forward" size={14} color={t.textoSecundario} />
            </Pressable>
          </>
        )}
      </SeccionBloque>

      {/* Entrenamiento */}
      <SeccionBloque registrar={registrar} s={s} k="entrenamiento" titulo="Entrenamiento y descanso">
        <View style={s.card}>
          {e.entrenamiento.base ? <EliteText style={s.parrafo}>{e.entrenamiento.base}</EliteText> : null}
          {e.entrenamiento.sesiones.map((ses, i) => (
            <View key={`${ses.tipo}-${i}`} style={s.bloqueTexto}>
              <EliteText style={s.nombre}>{ses.tipo}</EliteText>
              <EliteText style={s.meta}>
                {[ses.frecuencia_semana, ses.duracion, ses.intensidad].filter(Boolean).join(' · ')}
              </EliteText>
              {ses.nota ? <EliteText style={s.parrafo}>{ses.nota}</EliteText> : null}
            </View>
          ))}
          {e.entrenamiento.descanso.length > 0 && (
            <View style={s.bloqueTexto}>
              <EliteText style={s.subtitulo}>Descanso</EliteText>
              {e.entrenamiento.descanso.map((x, i) => <EliteText key={i} style={s.parrafo}>· {x}</EliteText>)}
            </View>
          )}
          {e.entrenamiento.notas.map((n, i) => <EliteText key={i} style={s.meta}>{n}</EliteText>)}
          {!e.entrenamiento.base && e.entrenamiento.sesiones.length === 0 && e.entrenamiento.descanso.length === 0 ? (
            <EliteText style={s.parrafo}>Tu plan de entrenamiento llega con la siguiente entrega.</EliteText>
          ) : null}
        </View>
      </SeccionBloque>
    </>
  );
}

// ─── Piezas ─────────────────────────────────────────────────────────────────

function SeccionBloque({ k, titulo, registrar, s, children }: {
  k: SeccionUiKey;
  titulo: string;
  registrar: (key: SeccionUiKey) => (e: LayoutChangeEvent) => void;
  s: ReturnType<typeof makeStyles>;
  children: ReactNode;
}) {
  return (
    <View onLayout={registrar(k)} style={s.seccion}>
      <EliteText style={s.seccionTitulo}>{titulo.toUpperCase()}</EliteText>
      {children}
    </View>
  );
}

function Dato({ etiqueta, valor, s }: { etiqueta: string; valor: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.dato}>
      <EliteText style={s.datoValor}>{valor}</EliteText>
      <EliteText style={s.datoEtiqueta}>{etiqueta}</EliteText>
    </View>
  );
}

function ChipFuente({ f, s }: { f: keyof typeof ETIQUETA_FUENTE; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.chipFuente}>
      <EliteText style={s.chipFuenteText}>{ETIQUETA_FUENTE[f]}</EliteText>
    </View>
  );
}

/**
 * La escalera de cuatro peldanos: barras llenas hasta el nivel anotado.
 *
 * 8-sep-2026: cuando `evidencia` viene null NO se pinta nada. En el documento
 * de O. el nivel falta en 30 de 34 marcadores, en los 22 hallazgos geneticos y
 * en los 6 cruces: eran 58 escaleras grises con "Sin nivel de evidencia
 * anotado" y el documento se leia roto. Un hueco callado se ve mejor que un
 * hueco anunciado 58 veces. Inventar el peldano no es opcion: seria una
 * afirmacion sin respaldo.
 */
function Evidencia({ n, s, t }: { n: EliteEvidencia | null; s: ReturnType<typeof makeStyles>; t: AppThemeTokens }) {
  if (n === null) return null;
  return (
    <View style={s.evidenciaRow} accessibilityLabel={`Evidencia: ${etiquetaEvidencia(n)}`}>
      <View style={s.peldanos}>
        {[1, 2, 3, 4].map((k) => (
          <View key={k} style={[s.peldano, { backgroundColor: n !== null && k <= n ? t.texto : t.borde }]} />
        ))}
      </View>
      <EliteText style={s.evidenciaText}>{etiquetaEvidencia(n)}</EliteText>
    </View>
  );
}

function Leyenda({ s, t }: { s: ReturnType<typeof makeStyles>; t: AppThemeTokens }) {
  const items: EliteEstado[] = ['att', 'sub', 'opt'];
  return (
    <View style={s.leyenda}>
      {items.map((k) => {
        const et = etiquetaEstado(k);
        return (
          <View key={k} style={s.leyendaItem}>
            <EliteText style={[s.simbolo, { color: et.token ? t[et.token] : t.textoSecundario }]}>{et.simbolo}</EliteText>
            <EliteText style={s.leyendaText}>{et.texto}</EliteText>
          </View>
        );
      })}
    </View>
  );
}

function FilaMarcador({ m, s, t }: { m: EliteMarcador; s: ReturnType<typeof makeStyles>; t: AppThemeTokens }) {
  const est = etiquetaEstado(m.estado);
  const color = est.token ? t[est.token] : t.textoSecundario;
  return (
    <View style={s.card} accessibilityLabel={`${m.nombre}. ${formatearValor(m.valor, m.unidad)}. ${est.texto}`}>
      <View style={s.filaTop}>
        <EliteText style={[s.simbolo, { color }]}>{est.simbolo}</EliteText>
        <EliteText style={s.nombre}>{m.nombre}</EliteText>
        {m.estimado ? <View style={s.flag}><EliteText style={s.flagText}>estimado</EliteText></View> : null}
      </View>
      <View style={s.valoresRow}>
        <View style={s.valorCol}>
          <EliteText style={s.datoEtiqueta}>Valor</EliteText>
          <EliteText style={[s.valorNum, { color }]}>{formatearValor(m.valor, m.unidad)}</EliteText>
        </View>
        <View style={s.valorCol}>
          <EliteText style={s.datoEtiqueta}>Rango del laboratorio</EliteText>
          <EliteText style={s.valorTexto}>{formatearRango(m.rango_lab)}</EliteText>
        </View>
        <View style={s.valorCol}>
          <EliteText style={s.datoEtiqueta}>Te queremos en</EliteText>
          <EliteText style={s.valorTexto}>{formatearRango(m.objetivo)}</EliteText>
        </View>
      </View>
      <EliteText style={[s.estadoTexto, { color }]}>{est.texto}</EliteText>
      <View style={s.chipsInline}>
        {m.fuente.map((f) => <ChipFuente key={f} f={f} s={s} />)}
      </View>
      <Evidencia n={m.evidencia} s={s} t={t} />
      {m.nota ? <EliteText style={s.parrafo}>{m.nota}</EliteText> : null}
    </View>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

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
  cabeceraNombre: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  cabeceraMeta: { color: t.textoSecundario, fontSize: FontSizes.xs },
  anteriorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  anteriorPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: t.hundido, borderWidth: 1, borderColor: t.bordeMarcado },
  anteriorPillText: { color: t.texto, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  enlace: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  enlaceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.xs },
  pdfBoton: {
    marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.sm, paddingVertical: 11,
  },
  pdfBotonText: { color: t.textoSobreLima, fontFamily: Fonts.bold, fontSize: FontSizes.sm },

  chipsScroll: { marginHorizontal: -Spacing.md },
  chipsRow: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: 2 },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde },
  chipActiva: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderColor: withOpacity(ATP_BRAND.lime, 0.4) },
  chipText: { color: t.texto, fontSize: FontSizes.xs },
  chipTextActiva: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontFamily: Fonts.semiBold },

  seccion: { gap: Spacing.xs, marginTop: Spacing.sm },
  seccionTitulo: { color: t.textoSecundario, letterSpacing: 1, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginBottom: 2 },
  intro: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 19 },
  card: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: 6,
  },
  grupo: { gap: Spacing.xs, marginTop: Spacing.xs },
  grupoTitulo: { color: t.textoSecundario, letterSpacing: 1, textTransform: 'uppercase', fontSize: FontSizes.xs },
  bloqueTexto: { gap: 4, marginTop: 4 },
  subtitulo: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  parrafo: { color: t.texto, fontSize: FontSizes.sm, lineHeight: 20 },
  negrita: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  meta: { color: t.textoSecundario, fontSize: FontSizes.xs, lineHeight: 17 },
  lead: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, lineHeight: 22 },
  cita: { color: t.textoSecundario, fontStyle: 'italic', fontSize: FontSizes.sm, lineHeight: 20, paddingLeft: Spacing.sm, borderLeftWidth: 2, borderLeftColor: t.bordeMarcado },

  edadesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.xs },
  dato: { flex: 1, alignItems: 'center', gap: 1 },
  datoValor: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  datoEtiqueta: { color: t.textoSecundario, fontSize: FontSizes.xs, textAlign: 'center' },

  filaTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  simbolo: { fontSize: FontSizes.md, width: 18, textAlign: 'center' },
  nombre: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, flex: 1 },
  score: { fontFamily: Fonts.bold, fontSize: FontSizes.md },
  estadoTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  flag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.pill, backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde },
  flagText: { color: t.textoSecundario, fontSize: 10, letterSpacing: 0.5 },

  valoresRow: { flexDirection: 'row', gap: Spacing.xs },
  valorCol: { flex: 1, gap: 1 },
  valorNum: { fontFamily: Fonts.bold, fontSize: FontSizes.md },
  valorTexto: { color: t.texto, fontSize: FontSizes.sm },

  chipsInline: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipFuente: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde },
  chipFuenteText: { color: t.texto, fontSize: 10, letterSpacing: 0.5 },

  evidenciaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  peldanos: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  peldano: { width: 6, height: 10, borderRadius: 1 },
  evidenciaText: { color: t.textoSecundario, fontSize: FontSizes.xs, flex: 1 },

  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: 2 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leyendaText: { color: t.textoSecundario, fontSize: FontSizes.xs },

  ejeCabecera: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.borde, paddingBottom: 4 },
  ejeCabeceraText: { color: t.textoSecundario, fontSize: FontSizes.xs, letterSpacing: 0.5 },
  ejeFila: { flexDirection: 'row', paddingVertical: 3 },
  ejeCelda: { flex: 1 },
  ejeNum: { textAlign: 'right' },

  avisoSuave: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.10), borderRadius: Radius.md, padding: Spacing.sm,
  },
  avisoSuaveText: { color: t.texto, fontSize: FontSizes.xs, flex: 1, lineHeight: 16 },
});
