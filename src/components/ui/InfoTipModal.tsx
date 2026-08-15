/**
 * InfoTipModal (#v13f 2.6) — modal centrado custom para el info-tip "i" de las cards del HOY.
 * Reemplaza el Alert nativo gris por una card con estilo de la app (fondo oscuro, título lima,
 * botón "Entendido"). Cierra al tap fuera de la card o en el botón. Modal nativo de RN (sin libs).
 */
import { useMemo } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function InfoTipModal({ visible, title, message, onClose }: Props) {
  // MB-31B: el oscuro queda como estaba. En claro la card sube a papel y el
  // título lima cede al teal; el relleno lima del botón SÍ se queda porque es
  // acción primaria y su texto va en negro en los dos temas.
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        {/* Card: come el tap para que no cierre al tocar dentro. */}
        <Pressable style={s.card} onPress={() => { /* eat tap */ }}>
          <EliteText style={s.title}>{title}</EliteText>
          <EliteText style={s.message}>{message}</EliteText>
          <Pressable style={s.button} onPress={onClose}>
            <EliteText style={s.buttonText}>Entendido</EliteText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (t: AppThemeTokens) => {
  const dark = t.kind === 'dark';
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: dark ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)',
      justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
    },
    card: {
      width: '100%', maxWidth: 320,
      backgroundColor: t.flotante,
      borderWidth: 1,
      borderColor: dark ? 'rgba(255,255,255,0.1)' : t.borde,
      borderRadius: Radius.card, padding: Spacing.xl,
    },
    title: {
      color: dark ? ATP_BRAND.lime : t.tealTexto,
      fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginBottom: Spacing.md, letterSpacing: 1,
    },
    message: {
      color: withOpacity(t.texto, 0.85),
      fontFamily: Fonts.regular, fontSize: FontSizes.md, lineHeight: 22,
    },
    button: {
      alignSelf: 'center', marginTop: Spacing.xl,
      backgroundColor: ATP_BRAND.lime,
      paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999,
    },
    buttonText: { color: t.textoSobreLima, fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1 },
  });
};
