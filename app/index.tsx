import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Pantalla de Bienvenida — Primera pantalla que ve el usuario.
 * Logo ELITE centrado con botón "ENTRAR" para acceder al Dashboard.
 */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer centered={false}>
      <View style={styles.content}>
        {/* Espacio superior — empuja la marca hacia el centro visual */}
        <View style={styles.spacer} />

        {/* Marca ELITE con líneas decorativas */}
        <View style={styles.brand}>
          <View style={styles.accentLine} />

          <EliteText variant="title" style={styles.logo}>
            ELITE
          </EliteText>

          <EliteText variant="label" style={styles.tagline}>
            PERFORMANCE TIMER
          </EliteText>

          <View style={styles.accentLine} />
        </View>

        {/* Botón de entrada — posicionado en el tercio inferior */}
        <View style={styles.buttonArea}>
          <EliteButton
            label="ENTRAR"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Contenido ocupa toda la pantalla, centrado horizontalmente
  content: {
    flex: 1,
    alignItems: 'center',
  },
  // Espacio flexible superior — equilibra la marca en el centro visual
  spacer: {
    flex: 1,
  },
  // Contenedor de la marca — centrado horizontal
  brand: {
    alignItems: 'center',
  },
  // Logo ELITE — grande, impactante, con tracking amplio
  logo: {
    fontSize: 56,
    letterSpacing: 16,
  },
  // Subtítulo — tipografía más sutil debajo del logo
  tagline: {
    letterSpacing: 6,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  // Línea decorativa verde — estilo industrial premium
  accentLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.neonGreen,
    marginVertical: Spacing.md,
  },
  // Área del botón — empuja el botón hacia abajo con flex
  buttonArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xxl,
  },
});
