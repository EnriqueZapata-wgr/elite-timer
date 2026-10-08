/**
 * PerfilMarcadorDetalle (8-oct-2026 (v4)): lo que se abre bajo un marcador.
 * La barra de rango, el aviso "para el laboratorio esta bien, para nosotros
 * todavia no" (solo con los dos rangos conocidos), la lectura en dos niveles
 * (la tuya, que escribio quien firma, y la general de la app) con su
 * cambiador, la evidencia si esta anotada, y "Lo mueve en tu plan".
 *
 * "Lo mueve en tu plan" sale de vincularMarcadorPlan (perfil-core, con
 * test). Sin vinculo no se dice nada; si una parte del plan no se pudo leer,
 * se dice cual, con su Reintentar (8-oct-2026 (v4, revision en frio)). Cada vinculo lleva a su lugar: practicas y palancas a Mi
 * plan, suplementos a Suplementos.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon, type AppIconName } from '@/src/components/ui/AppIcon';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import type { EliteMarcador } from '@/src/services/elite/elite-v3-core';
import {
  avisoVinculosNoLeidos, detalleMarcador, TITULO_LO_MUEVE, vincularMarcadorPlan,
  type InsumosVinculo, type TipoVinculo,
} from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { acento, colorEstado, suave, TOQUE_MIN } from './perfil-ui';
import { PerfilRangoBarra } from './PerfilRangoBarra';

interface Props {
  marcador: EliteMarcador;
  programa: boolean;
  /** null mientras se lee el plan. */
  insumos: InsumosVinculo | null;
  onReintentarPlan: () => void;
  reintentandoPlan: boolean;
}

const ICONO_VINCULO: Record<TipoVinculo, AppIconName> = {
  practica: 'protocolos',
  suplemento: 'suplementos',
  palanca: 'tab-programa',
};

type Nivel = 'tuya' | 'general';

export function PerfilMarcadorDetalle({ marcador, programa, insumos, onReintentarPlan, reintentandoPlan }: Props) {
  const t = useSurfaceTokens();
  const router = useRouter();
  const d = useMemo(() => detalleMarcador(marcador, { programa }), [marcador, programa]);
  const vinc = useMemo(() => (insumos ? vincularMarcadorPlan(marcador, insumos) : null), [marcador, insumos]);
  const [nivel, setNivel] = useState<Nivel>(d.lecturaPersonal ? 'tuya' : 'general');
  const color = acento(t);
  const ambas = d.lecturaPersonal !== null && d.lecturaGeneral !== null;
  const lectura = nivel === 'tuya' ? d.lecturaPersonal ?? d.lecturaGeneral : d.lecturaGeneral ?? d.lecturaPersonal;
  const aviso = vinc ? avisoVinculosNoLeidos(vinc.noSePudoLeer) : null;

  return (
    <View style={s.caja}>
      {d.barra ? <PerfilRangoBarra barra={d.barra} colorPunto={colorEstado(t, d.token)} /> : null}

      {d.avisoLabOk ? (
        <View style={[s.aviso, { backgroundColor: suave(t.advertencia, 0.12), borderColor: suave(t.advertencia, 0.4) }]}>
          <EliteText style={[s.avisoTexto, { color: t.advertencia }]}>{d.avisoLabOk}</EliteText>
        </View>
      ) : null}

      {lectura ? (
        <View style={s.bloque}>
          {ambas ? (
            <View style={s.niveles} accessibilityRole="tablist">
              {(['tuya', 'general'] as const).map((n) => {
                const on = nivel === n;
                const texto = n === 'tuya' ? 'Tu lectura' : 'Qué es';
                return (
                  <AnimatedPressable
                    key={n}
                    onPress={() => { haptic.selection(); setNivel(n); }}
                    accessibilityRole="tab"
                    accessibilityLabel={texto}
                    accessibilityState={{ selected: on }}
                    style={[s.nivel, { borderColor: on ? color : t.borde, backgroundColor: on ? suave(color, 0.12) : 'transparent' }]}
                  >
                    <EliteText style={[s.nivelTexto, { color: on ? t.texto : t.textoSecundario }]}>{texto}</EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
          ) : (
            <EliteText style={[s.subtitulo, { color: t.textoSecundario }]}>
              {d.lecturaPersonal ? 'TU LECTURA' : 'QUÉ ES'}
            </EliteText>
          )}
          <EliteText style={[s.lectura, { color: t.texto }]}>{lectura}</EliteText>
        </View>
      ) : null}

      {d.evidencia ? (
        <EliteText style={[s.evidencia, { color: t.textoSecundario }]}>Evidencia: {d.evidencia}</EliteText>
      ) : null}

      {vinc === null ? (
        <EliteText style={[s.cargando, { color: t.textoTenue }]}>Buscando qué lo mueve en tu plan…</EliteText>
      ) : vinc.vinculos.length > 0 || aviso ? (
        <View style={s.bloque}>
          <EliteText style={[s.subtitulo, { color: t.textoSecundario }]}>{TITULO_LO_MUEVE.toUpperCase()}</EliteText>
          {vinc.vinculos.map((v) => (
            <AnimatedPressable
              key={v.id}
              onPress={() => { haptic.light(); router.push(v.ruta); }}
              accessibilityRole="link"
              accessibilityLabel={`${v.titulo}. ${v.etiquetaFuerza}. Abrir`}
              style={[s.vinculo, { backgroundColor: t.hundido }]}
            >
              <AppIcon name={ICONO_VINCULO[v.tipo]} size={18} color={t.texto} />
              <View style={s.vinculoTextos}>
                <EliteText style={[s.vinculoTitulo, { color: t.texto }]} numberOfLines={2}>{v.titulo}</EliteText>
                {v.detalle ? (
                  <EliteText style={[s.vinculoDetalle, { color: t.textoSecundario }]} numberOfLines={2}>{v.detalle}</EliteText>
                ) : null}
                <EliteText style={[s.fuerza, { color: v.fuerza === 'texto' ? t.textoTenue : color }]}>{v.etiquetaFuerza}</EliteText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.textoTenue} />
            </AnimatedPressable>
          ))}
          {aviso ? (
            <View style={s.avisoPlan}>
              <EliteText style={[s.cargando, s.avisoPlanTexto, { color: t.textoSecundario }]}>{aviso}</EliteText>
              <AnimatedPressable
                disabled={reintentandoPlan}
                onPress={() => { haptic.light(); onReintentarPlan(); }}
                accessibilityRole="button"
                accessibilityLabel="Reintentar leer tu plan"
                accessibilityState={{ busy: reintentandoPlan }}
                style={[s.reintentar, { borderColor: t.borde }]}
              >
                {reintentandoPlan
                  ? <ActivityIndicator size="small" color={t.texto} />
                  : <EliteText style={[s.reintentarTexto, { color: t.texto }]}>Reintentar</EliteText>}
              </AnimatedPressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { paddingBottom: Spacing.md, gap: Spacing.sm },
  aviso: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.sm },
  avisoTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  bloque: { gap: Spacing.xs, marginTop: Spacing.xs },
  niveles: { flexDirection: 'row', gap: Spacing.sm },
  nivel: { minHeight: TOQUE_MIN, borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  nivelTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  subtitulo: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1.5 },
  lectura: { fontSize: FontSizes.sm, lineHeight: 20 },
  evidencia: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
  cargando: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
  vinculo: {
    minHeight: TOQUE_MIN + 8, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
  },
  vinculoTextos: { flex: 1, gap: 2 },
  vinculoTitulo: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  vinculoDetalle: { fontSize: FontSizes.xs, lineHeight: 16 },
  fuerza: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  avisoPlan: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avisoPlanTexto: { flex: 1 },
  reintentar: {
    minHeight: TOQUE_MIN, minWidth: 96, borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.md,
    alignItems: 'center', justifyContent: 'center',
  },
  reintentarTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
