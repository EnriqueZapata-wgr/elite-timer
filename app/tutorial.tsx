/**
 * CENTRO DE AYUDA — el tutorial completo, siempre disponible.
 *
 * El tutorial llega solo, pieza por pieza, la primera vez que pisas cada
 * pantalla. Esta es la otra puerta: aquí están las ocho piezas juntas, se ve
 * cuáles faltan, y se puede repetir cualquiera cuando quieras. También se
 * apaga la aparición automática sin perder el contenido.
 *
 * Abrir una pieza NO la explica aquí: te lleva a la pantalla de la que habla
 * y la explica encima del contenido real. Un tutorial que se lee lejos de la
 * pantalla no enseña dónde están las cosas.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { EliteToggle } from '@/components/elite-toggle';
import { SectionLabel, Divider } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import {
  TOURS_POR_PANTALLA,
  TOUR_PANTALLA_ABRIR_EVENT,
  avanceTutorial,
} from '@/src/components/tour/tours-por-pantalla';
import {
  cargarVistos,
  cargarSilencio,
  guardarSilencio,
  olvidarTodos,
} from '@/src/services/tour/tours-vistos-store';

export default function CentroDeAyuda() {
  const router = useRouter();
  const t = useAppTheme().tokens;
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;

  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const [silencio, setSilencio] = useState(false);

  // Al volver de ver una pieza, el avance tiene que estar al día.
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      void (async () => {
        const [v, s] = await Promise.all([cargarVistos(), cargarSilencio()]);
        if (!vivo) return;
        setVistos(v);
        setSilencio(s);
      })();
      return () => {
        vivo = false;
      };
    }, [])
  );

  const avance = avanceTutorial(vistos);

  function abrir(id: string) {
    haptic.light();
    DeviceEventEmitter.emit(TOUR_PANTALLA_ABRIR_EVENT, { id });
  }

  return (
    <ThemeReady>
      <View style={[s.raiz, { backgroundColor: t.fondo }]}>
        <StatusBar style={t.kind === 'light' ? 'dark' : 'light'} />
        <ScreenHeader title="Tutorial" />
        <ScrollView contentContainerStyle={s.cuerpo} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.springify()}>
            <EliteText style={[s.entrada, { color: t.textoSecundario }]}>
              Cada explicación dura menos de un minuto. Al abrir una te llevamos
              a su pantalla y te la explicamos ahí mismo.
            </EliteText>
            <View style={[s.avanceCaja, { backgroundColor: t.card, borderColor: t.borde }]}>
              <EliteText style={[s.avanceNumero, { color: acento }]}>
                {avance.vistos} de {avance.total}
              </EliteText>
              <EliteText style={[s.avanceTexto, { color: t.textoSecundario }]}>
                {avance.vistos === avance.total
                  ? 'Ya las viste todas. Puedes repetir la que quieras.'
                  : 'explicaciones vistas'}
              </EliteText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(80).springify()}>
            <SectionLabel>LAS EXPLICACIONES</SectionLabel>
            {TOURS_POR_PANTALLA.map((pieza) => {
              const yaVista = vistos.has(pieza.id);
              return (
                <Pressable
                  key={pieza.id}
                  onPress={() => abrir(pieza.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver la explicación de ${pieza.titulo}${
                    yaVista ? ', ya vista' : ', sin ver'
                  }`}
                  style={({ pressed }) => [
                    s.fila,
                    { backgroundColor: t.card, borderColor: t.borde },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={s.filaTexto}>
                    <EliteText style={[s.filaTitulo, { color: t.texto }]}>
                      {pieza.titulo}
                    </EliteText>
                    <EliteText style={[s.filaResumen, { color: t.textoSecundario }]}>
                      {pieza.resumen}
                    </EliteText>
                  </View>
                  {!yaVista && (
                    <View
                      style={[
                        s.marca,
                        // El acento del tema, no el lima a pelo: en claro el
                        // lima queda lavado y pelea con el texto, que es teal.
                        { borderColor: withOpacity(acento, 0.6) },
                      ]}
                    >
                      <EliteText style={[s.marcaTexto, { color: acento }]}>SIN VER</EliteText>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={t.textoSecundario} />
                </Pressable>
              );
            })}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(160).springify()}>
            <SectionLabel>CÓMO APARECEN</SectionLabel>
            <EliteToggle
              label="Que aparezcan solas"
              description="La primera vez que entras a una pantalla, su explicación sale sola. Apagarlo no borra nada: puedes abrirlas desde aquí."
              value={!silencio}
              onValueChange={(quiere) => {
                haptic.light();
                setSilencio(!quiere);
                void guardarSilencio(!quiere);
              }}
            />
            <Divider />
            <Pressable
              onPress={async () => {
                haptic.light();
                await olvidarTodos();
                setVistos(new Set());
              }}
              accessibilityRole="button"
              accessibilityLabel="Marcar todas las explicaciones como no vistas"
              style={({ pressed }) => [s.reinicio, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="refresh-outline" size={16} color={t.textoSecundario} />
              <EliteText style={[s.reinicioTexto, { color: t.textoSecundario }]}>
                Marcar todas como no vistas
              </EliteText>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(220).springify()}>
            <SectionLabel>¿SIGUES CON DUDAS?</SectionLabel>
            <Pressable
              onPress={() => {
                haptic.light();
                router.push('/argos');
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                s.fila,
                { backgroundColor: t.card, borderColor: t.borde },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={s.filaTexto}>
                <EliteText style={[s.filaTitulo, { color: t.texto }]}>
                  Pregúntale a ARGOS
                </EliteText>
                <EliteText style={[s.filaResumen, { color: t.textoSecundario }]}>
                  Resuelve cualquier duda de la app o de tus datos, con tus
                  números a la mano.
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textoSecundario} />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    </ThemeReady>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1 },
  cuerpo: { padding: Spacing.md, paddingBottom: Spacing.xl * 2, gap: Spacing.xs },
  entrada: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 20 },
  avanceCaja: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  avanceNumero: { fontSize: 26, fontFamily: Fonts.extraBold, letterSpacing: 1 },
  avanceTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  filaTexto: { flex: 1, gap: 2 },
  filaTitulo: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  filaResumen: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 18 },
  marca: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  marcaTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1 },
  reinicio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  reinicioTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
