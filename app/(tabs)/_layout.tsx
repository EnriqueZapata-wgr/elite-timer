import { Tabs } from 'expo-router';

/**
 * Tab layout — contiene el Dashboard como pantalla principal.
 * La barra de tabs permanece oculta por ahora (solo una sección).
 * Se activará en Fase 2 cuando se agreguen más secciones.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Escondemos la barra de tabs — una sola sección no necesita navegación
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
