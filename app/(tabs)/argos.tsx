/**
 * Tab ARGOS — el hub (HUB-ARGOS, 31-ago-2026; pendiente 13.1).
 *
 * Antes este archivo re-exportaba el chat: tocar la orbe caía directo a la
 * conversación y nada decía qué más sabe hacer ARGOS. Pedido del dueño:
 * "que ARGOS sea un hub completo, no nada más un chat, y que tenga para que
 * te explique, que te enseñe, que te lleve".
 *
 * La pantalla recibe y ofrece, en filas agrupadas (mismo patrón que el
 * Centro ATP): Hablar (el chat y tus conversaciones recientes), Que te
 * explique (abre el chat con contexto precargado, ver argos-contexto-core),
 * Que te enseñe (contenido que ya existe: guía de labs, tutorial,
 * intervenciones), Que lo haga por ti (receta, ordenar el día, llevarte) y
 * Voz. El catálogo vive en src/constants/argos-hub.ts, con la evidencia de
 * cada línea junto a cada fila.
 *
 * El chat sigue en /argos-chat (deep links viejos siguen vivos) y desde aquí
 * se abre con push, así que la flecha regresa al hub.
 */
import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { useAuth } from '@/src/contexts/auth-context';
import { useAppTheme } from '@/src/contexts/theme-context';
import { loadConversations } from '@/src/services/argos-service';
import { openArgosChat } from '@/src/services/argos-nav';
import { getArgosVoice, type ArgosVoice } from '@/src/services/argos-voice-service';
import type { ConversationListRow } from '@/src/services/argos-conversations-core';
import { SECCIONES_HUB, type FilaHub } from '@/src/constants/argos-hub';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

/** Cuántas conversaciones recientes caben en el hub; el resto, en el panel. */
const RECIENTES = 3;

const VOZ_LABEL: Record<ArgosVoice, string> = {
  masculina: 'Voz masculina',
  femenina: 'Voz femenina',
};

function fmtCuando(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) {
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function ArgosHub() {
  const { user } = useAuth();
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : tokens.tealTexto;
  // textoTenue del oscuro no alcanza contraste en claro para letra chica.
  const tenue = dark ? tokens.textoTenue : tokens.textoSecundario;
  const grupo = useMemo(() => ({ backgroundColor: tokens.card, borderColor: tokens.borde }), [tokens]);
  const iconoFondo = useMemo(
    () => ({ backgroundColor: withOpacity(acento, 0.10), borderColor: withOpacity(acento, 0.22) }),
    [acento],
  );

  // Recientes: tres estados de verdad. "No pude leer" no es "no tienes".
  const [recientes, setRecientes] = useState<ConversationListRow[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [voz, setVoz] = useState<ArgosVoice | null>(null);

  const cargar = useCallback(async () => {
    if (!user?.id) return;
    setCargando(true);
    const { rows, error } = await loadConversations(user.id, RECIENTES, 0);
    setFallo(error != null);
    if (error == null) setRecientes(rows as ConversationListRow[]);
    setCargando(false);
    // La voz elegida (profiles.argos_voice, mig 205). Fail-soft: sin dato,
    // la fila de voz se queda con su línea general.
    getArgosVoice(user.id).then(setVoz).catch(() => {});
  }, [user?.id]);

  // Al volver del chat hay una conversación más (o renombrada): se refresca.
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const abrir = (fila: FilaHub) => {
    haptic.light();
    if (fila.nueva) { openArgosChat({ startNew: true }); return; }
    router.push({ pathname: fila.destino.pathname, params: fila.destino.params ?? {} } as never);
  };

  const renderIcono = (fila: FilaHub) => (
    <View style={[s.rowIcon, iconoFondo]}>
      {fila.icono.tipo === 'app'
        ? <AppIcon name={fila.icono.nombre} size={18} color={acento} />
        : <Ionicons name={fila.icono.nombre as keyof typeof Ionicons.glyphMap} size={18} color={acento} />}
    </View>
  );

  const renderFila = (fila: FilaHub, ultima: boolean) => (
    <AnimatedPressable
      key={fila.key}
      style={[s.row, !ultima && [s.rowDivider, { borderBottomColor: tokens.borde }]]}
      onPress={() => abrir(fila)}
      accessibilityRole="button"
      accessibilityLabel={fila.titulo}
    >
      {renderIcono(fila)}
      <View style={{ flex: 1 }}>
        <EliteText style={[s.rowLabel, { color: tokens.texto }]} numberOfLines={1}>{fila.titulo}</EliteText>
        <EliteText style={[s.rowLinea, { color: tokens.textoSecundario }]} numberOfLines={2}>
          {fila.key === 'voz' && voz ? `${VOZ_LABEL[voz]}. ${fila.linea}` : fila.linea}
        </EliteText>
      </View>
      <Ionicons name="chevron-forward" size={15} color={tokens.sinDatos} />
    </AnimatedPressable>
  );

  /** Las conversaciones recientes, debajo de las filas de HABLAR. */
  const renderRecientes = () => {
    if (cargando && recientes == null) {
      return (
        <View style={s.estado}>
          <ActivityIndicator size="small" color={acento} />
          <EliteText style={[s.estadoTexto, { color: tenue }]}>Buscando tus conversaciones</EliteText>
        </View>
      );
    }
    if (fallo && recientes == null) {
      return (
        <View style={s.estado}>
          <EliteText style={[s.estadoTexto, { color: tokens.textoSecundario }]}>
            No se pudo leer tu historial.
          </EliteText>
          <Pressable onPress={() => { haptic.light(); cargar(); }} hitSlop={8}>
            <EliteText style={[s.reintentar, { color: acento }]}>Reintentar</EliteText>
          </Pressable>
        </View>
      );
    }
    const lista = recientes ?? [];
    if (lista.length === 0) {
      return (
        <View style={s.estado}>
          <EliteText style={[s.estadoTexto, { color: tenue }]}>
            Todavía no hay conversaciones. La primera empieza arriba.
          </EliteText>
        </View>
      );
    }
    return (
      <>
        {lista.map((c) => (
          <AnimatedPressable
            key={c.id}
            style={[s.row, s.rowDivider, { borderBottomColor: tokens.borde }]}
            onPress={() => { haptic.light(); openArgosChat({ conversationId: c.id }); }}
            accessibilityRole="button"
            accessibilityLabel={`Retomar: ${c.title}`}
          >
            <View style={[s.rowIcon, { backgroundColor: tokens.hundido, borderColor: tokens.borde }]}>
              <Ionicons name="time-outline" size={16} color={tokens.textoSecundario} />
            </View>
            <EliteText style={[s.rowLabel, { color: tokens.texto, flex: 1 }]} numberOfLines={1}>{c.title}</EliteText>
            <EliteText style={[s.cuando, { color: tenue }]}>{fmtCuando(c.updated_at)}</EliteText>
            <Ionicons name="chevron-forward" size={15} color={tokens.sinDatos} />
          </AnimatedPressable>
        ))}
        <AnimatedPressable
          style={s.row}
          onPress={() => { haptic.light(); router.push('/argos/conversations'); }}
          accessibilityRole="button"
          accessibilityLabel="Ver todas las conversaciones"
        >
          <View style={[s.rowIcon, { backgroundColor: tokens.hundido, borderColor: tokens.borde }]}>
            <Ionicons name="list-circle-outline" size={16} color={tokens.textoSecundario} />
          </View>
          <EliteText style={[s.rowLabel, { color: tokens.textoSecundario, flex: 1 }]}>Ver todas</EliteText>
          <Ionicons name="chevron-forward" size={15} color={tokens.sinDatos} />
        </AnimatedPressable>
      </>
    );
  };

  return (
    <TabScreen themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <ArgosOrb state="idle" size={56} />
          <View style={{ flex: 1 }}>
            <EliteText style={[s.eyebrow, { color: acento }]}>TU ASISTENTE</EliteText>
            <EliteText style={[s.title, { color: tokens.texto }]}>ARGOS</EliteText>
            <EliteText style={[s.hint, { color: tokens.textoSecundario }]}>
              Te explica, te enseña, te lleva. Y platica, claro.
            </EliteText>
          </View>
        </View>

        {SECCIONES_HUB.map((sec, i) => (
          <Animated.View key={sec.key} entering={FadeInUp.delay(40 + i * 40).springify()}>
            <EliteText style={[s.sectionTitle, { color: tenue }]}>{sec.titulo}</EliteText>
            <View style={[s.group, grupo]}>
              {sec.filas.map((f, j) =>
                renderFila(f, sec.key !== 'hablar' && j === sec.filas.length - 1))}
              {sec.key === 'hablar' && renderRecientes()}
            </View>
          </Animated.View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </TabScreen>
  );
}

// #42: el mismo gate de disclaimers médicos que tenía el chat en esta pestaña.
export default function ArgosTab() {
  return (
    <MedicalDisclaimerGate>
      <ArgosHub />
    </MedicalDisclaimerGate>
  );
}

// Solo layout: el color entra inline desde los tokens del tema.
const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 2, marginTop: 2 },
  hint: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 4 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  group: { borderWidth: 0.5, borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowDivider: { borderBottomWidth: 0.5 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  rowLinea: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 1, lineHeight: 16 },
  cuando: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  estadoTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, flex: 1 },
  reintentar: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
});
