/**
 * ErrorBoundary — captura excepciones no manejadas en cualquier render
 * del árbol y muestra una pantalla amable en vez de la pantalla gris
 * por default de React Native.
 *
 * Reporta a Sentry vía `src/lib/logger.error` (que internamente llama a
 * Sentry.captureException). El botón "Reintentar" resetea el estado
 * interno → React vuelve a montar los hijos.
 *
 * MB-31A: esta pantalla se queda OSCURA en los dos temas a propósito —
 * monta ENCIMA de todos los providers (el del tema incluido, que pudo ser
 * justo lo que tronó), posee su superficie completa y blanco-sobre-negro
 * es legible siempre. Solo se tokenizaron sus hex.
 */
import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { error as logError } from '@/src/lib/logger';
import { ATP_BRAND, TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err ?? 'Error desconocido');
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(err: unknown, info: { componentStack?: string | null }) {
    try {
      logError(err instanceof Error ? err : new Error(String(err)), info?.componentStack);
    } catch {
      // Sentry roto — no propagar el error secundario.
    }
  }

  reset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Algo salió mal</Text>
            <Text style={styles.body}>
              La app tuvo un problema inesperado. Ya lo reportamos para revisarlo.
              Puedes reintentar. Si el error persiste, reinicia la app.
            </Text>
            {__DEV__ && this.state.errorMessage ? (
              <Text style={styles.devError} numberOfLines={6}>{this.state.errorMessage}</Text>
            ) : null}
            <Pressable onPress={this.reset} style={styles.button}>
              <Text style={styles.buttonText}>REINTENTAR</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 16,
  },
  title: {
    color: TEXT_COLORS.primary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  devError: {
    color: SEMANTIC.error,
    fontSize: 12,
    fontFamily: 'Courier',
    backgroundColor: withOpacity(SEMANTIC.error, 0.08),
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    width: '100%',
  },
  button: {
    marginTop: 16,
    backgroundColor: ATP_BRAND.lime,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: TEXT_COLORS.onAccent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
