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
 *
 * 8-oct-2026 (nivel 2): el asunto del correo decia siempre "Mi programa ATP
 * Elite" y el cliente lo lee en su app de correo. Ahora sale del documento
 * vigente (lectura compartida, useLecturaDocumento; la regla en
 * mi-programa-core, asuntoCorreoCoach): Elite el de siempre, un programa
 * "Mi programa ATP". Revision en frio: sin documento leido decide el nivel,
 * que se pide solo en ese caso y solo al tocar (no se monta otro
 * useSubscription en cada pantalla que trae este boton).
 */
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { destinoContacto, mensajeParaCoach } from '@/src/services/elite/programa-elite-core';
import { asuntoCorreoCoach } from '@/src/services/elite/mi-programa-core';
import { useAuth } from '@/src/contexts/auth-context';
import { useLecturaDocumento } from './useLecturaDocumento';
import { fetchEffectiveTier } from '@/src/services/subscription/subscription-service';
import type { Tier } from '@/src/services/subscription/tier-logic';
import { CONTACTO_ELITE_EMAIL, NOMBRE_COACH_ELITE, WHATSAPP_COACH_ELITE } from '@/src/constants/lanzamiento';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';

interface Props {
  /** Como se llama el cliente, para el saludo. Opcional. */
  nombre?: string | null;
}

export function EscribirleCoach({ nombre }: Props) {
  // 14-oct-2026 (marca): borde neutro e ícono teal sobre t.hundido. Es una
  // puerta secundaria, no la acción principal de la pantalla: sin lima.
  const { t, teal, borde } = useTintaMarca();
  const [sinSalida, setSinSalida] = useState(false);
  const { user } = useAuth();
  const lectura = useLecturaDocumento(user?.id);
  const porWhatsApp = destinoContacto(WHATSAPP_COACH_ELITE, CONTACTO_ELITE_EMAIL, '').tipo === 'whatsapp';

  const abrir = async () => {
    haptic.light();
    setSinSalida(false);
    let tier: Tier | null = null;
    if (!(lectura && lectura.ok && lectura.evaluacion) && user?.id) {
      try {
        const r = await fetchEffectiveTier(user.id);
        if (!r.noSePudoLeer) tier = r.tier;
      } catch {
        // Sin nivel: asunto neutro.
      }
    }
    const asunto = { asuntoCorreo: asuntoCorreoCoach(lectura, tier) };
    const destino = destinoContacto(WHATSAPP_COACH_ELITE, CONTACTO_ELITE_EMAIL, mensajeParaCoach(nombre, NOMBRE_COACH_ELITE), asunto);
    try {
      await Linking.openURL(destino.url);
      return;
    } catch {
      // WhatsApp no abrio: se intenta el correo antes de rendirse.
    }
    if (porWhatsApp) {
      try {
        await Linking.openURL(destinoContacto(null, CONTACTO_ELITE_EMAIL, mensajeParaCoach(nombre, NOMBRE_COACH_ELITE), asunto).url);
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
        style={[s.card, { backgroundColor: t.card, borderColor: borde }]}
        accessibilityRole="button"
        accessibilityLabel={`Escríbele a ${NOMBRE_COACH_ELITE}${porWhatsApp ? ' por WhatsApp' : ' por correo'}`}
      >
        <View style={[s.icono, { backgroundColor: t.hundido }]}>
          <Ionicons name={porWhatsApp ? 'logo-whatsapp' : 'mail-outline'} size={18} color={teal} />
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 0.5, borderRadius: Radius.card, padding: Spacing.md },
  icono: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg },
  detalle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 2 },
  aviso: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 6, marginLeft: 2 },
});
