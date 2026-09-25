/**
 * EscribirleCoach (25-sep-2026, app Elite DX): "Escríbele a Enrique". En Elite
 * la salida humana es Enrique, y la app no tenia un solo boton para llegarle.
 *
 * Abre WhatsApp si `WHATSAPP_COACH_ELITE` tiene numero; si no, el correo de
 * contacto (la regla vive en programa-elite-core, con test). Si el telefono
 * no puede abrir ninguno, se dice aqui mismo a donde escribir: nadie se
 * queda sin salida.
 *
 * El mensaje prellenado no lleva datos de salud: viaja por un tercero.
 */
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { destinoContacto, mensajeParaCoach } from '@/src/services/elite/programa-elite-core';
import { CONTACTO_ELITE_EMAIL, NOMBRE_COACH_ELITE, WHATSAPP_COACH_ELITE } from '@/src/constants/lanzamiento';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  /** Como se llama el cliente, para el saludo. Opcional. */
  nombre?: string | null;
}

export function EscribirleCoach({ nombre }: Props) {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const [sinSalida, setSinSalida] = useState(false);
  const destino = destinoContacto(WHATSAPP_COACH_ELITE, CONTACTO_ELITE_EMAIL, mensajeParaCoach(nombre, NOMBRE_COACH_ELITE));
  const porWhatsApp = destino.tipo === 'whatsapp';

  const abrir = async () => {
    haptic.light();
    setSinSalida(false);
    try {
      await Linking.openURL(destino.url);
      return;
    } catch {
      // WhatsApp no abrio: se intenta el correo antes de rendirse.
    }
    if (porWhatsApp) {
      try {
        await Linking.openURL(destinoContacto(null, CONTACTO_ELITE_EMAIL, mensajeParaCoach(nombre, NOMBRE_COACH_ELITE)).url);
        return;
      } catch {
        // cae abajo
      }
    }
    setSinSalida(true);
  };

  return (
    <View style={s.wrap}>
      <AnimatedPressable
        onPress={abrir}
        style={[s.card, { backgroundColor: t.card, borderColor: dark ? withOpacity(ATP_BRAND.lime, 0.2) : t.bordeEditorial }]}
        accessibilityRole="button"
        accessibilityLabel={`Escríbele a ${NOMBRE_COACH_ELITE}${porWhatsApp ? ' por WhatsApp' : ' por correo'}`}
      >
        <View style={[s.icono, { backgroundColor: withOpacity(acento, 0.14) }]}>
          <Ionicons name={porWhatsApp ? 'logo-whatsapp' : 'mail-outline'} size={18} color={acento} />
        </View>
        <View style={{ flex: 1 }}>
          <EliteText style={[s.titulo, { color: t.texto }]}>{`Escríbele a ${NOMBRE_COACH_ELITE}`}</EliteText>
          <EliteText style={[s.detalle, { color: t.textoSecundario }]}>
            {porWhatsApp ? 'Por WhatsApp' : `Por correo · ${CONTACTO_ELITE_EMAIL}`}
          </EliteText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
      </AnimatedPressable>
      {sinSalida && (
        <EliteText style={[s.aviso, { color: t.textoSecundario }]}>
          {`No se pudo abrir desde este teléfono. Escríbele a ${CONTACTO_ELITE_EMAIL}.`}
        </EliteText>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0.5, borderRadius: Radius.md, padding: 14 },
  icono: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg },
  detalle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 2 },
  aviso: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 6, marginLeft: 2 },
});
