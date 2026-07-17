/**
 * SALUD FUNCIONAL — hub del pilar (Mega-Sprint B · MENÚ PURO).
 *
 * Doctrina raíz (menu_navegacion_vs_consulta_datos): un hub muestra SOLO cards
 * editoriales de NAVEGACIÓN. CERO datos de consulta. Los síntomas/resúmenes que
 * vivían aquí (widget de 7 sistemas + resumen ejecutivo + quick-add) se movieron
 * a su destino único (MIS SÍNTOMAS). Este archivo ya no lee symptom-service.
 *
 * 8 destinos limpios (árbol cerrado con Enrique):
 *   Mi Diagnóstico · Mi Protocolo · Mis Datos · Mis Evaluaciones · Mis Síntomas
 *   · Mis Padecimientos · Guía de Labs · Mi Expediente.
 */
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';

type Card = { key: string; title: string; subtitle: string; icon: string; gradient: [string, string]; route: string };

// Imágenes editoriales (require estático — Metro). Mega-Sprint C: los 5 destinos
// nuevos estrenan sus MJ dedicadas (salud-funcional/*.jpg); Diagnóstico, Protocolo
// y Guía de Labs conservan su tratamiento editorial previo (health-hub/*.png).
const IMAGES: Record<string, any> = {
  diagnostico: require('@/assets/images/health-hub/diagnostico.png'),
  mi_protocolo: require('@/assets/images/health-hub/mi-protocolo.png'),
  mis_datos: require('@/assets/images/salud-funcional/mis-datos.jpg'),
  mis_evaluaciones: require('@/assets/images/salud-funcional/mis-evaluaciones.jpg'),
  mis_sintomas: require('@/assets/images/salud-funcional/mis-sintomas.jpg'),
  padecimientos: require('@/assets/images/salud-funcional/mis-padecimientos.jpg'),
  labs_guide: require('@/assets/images/health-hub/labs-guide.png'),
  mi_expediente: require('@/assets/images/salud-funcional/mi-expediente.jpg'),
};

// Los 8 destinos · SOLO navegación (doctrina menú puro).
const DESTINOS: Card[] = [
  { key: 'diagnostico', title: 'MI DIAGNÓSTICO', subtitle: 'Raíces detectadas · nivel 1-5 · Edad ATP', icon: '🧬', gradient: ['#1D9E75', '#0EA5E9'], route: '/salud/diagnostico' },
  { key: 'mi_protocolo', title: 'MI PROTOCOLO', subtitle: 'Tus 5 prescritas + intervenciones activas', icon: '💊', gradient: ['#A8E02A', '#1D9E75'], route: '/salud/intervenciones' },
  { key: 'mis_datos', title: 'MIS DATOS', subtitle: 'Labs · composición · vitals · glucosa · cetonas', icon: '📊', gradient: ['#22C55E', '#16A34A'], route: '/salud/mis-datos' },
  { key: 'mis_evaluaciones', title: 'MIS EVALUACIONES', subtitle: 'Braverman · cronotipo · Fitzpatrick · tests', icon: '📝', gradient: ['#C084FC', '#8B5CF6'], route: '/salud/mis-evaluaciones' },
  { key: 'mis_sintomas', title: 'MIS SÍNTOMAS', subtitle: 'Registro con inicio/fin y duración', icon: '🩺', gradient: ['#1D9E75', '#0EA5E9'], route: '/salud/mis-sintomas' },
  { key: 'padecimientos', title: 'MIS PADECIMIENTOS', subtitle: 'Condiciones diagnosticadas + episodios', icon: '🏥', gradient: ['#1D9E75', '#F59E0B'], route: '/salud/padecimientos' },
  { key: 'labs_guide', title: 'GUÍA DE LABS', subtitle: '¿Qué estudios hacerte? Paquetes, precios (México)', icon: '📖', gradient: ['#A8E02A', '#60A5FA'], route: '/labs-guide' },
  { key: 'mi_expediente', title: 'MI EXPEDIENTE', subtitle: 'Tu timeline: síntomas, labs, protocolo, hitos', icon: '🗓️', gradient: ['#38BDF8', '#3B82F6'], route: '/salud/mi-expediente' },
];

function SaludFuncionalHub() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Salud Funcional" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            Tu dominio de salud funcional — diagnóstico, datos, evaluaciones y expediente.
          </EliteText>
        </Animated.View>

        {DESTINOS.map((c, idx) => (
          <Animated.View key={c.key} entering={FadeInUp.delay(80 + idx * 40).springify()}>
            <EditorialCard
              cardKey={`hh_${c.key}`}
              icon={c.icon}
              title={c.title}
              subtitle={c.subtitle}
              gradient={c.gradient}
              imageBn={IMAGES[c.key]}
              onTap={() => { haptic.medium(); router.push(c.route as any); }}
            />
          </Animated.View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.sm,
    marginBottom: Spacing.lg, marginTop: Spacing.xs, fontFamily: Fonts.regular,
  },
});

// #42: gate de disclaimers médicos — modal en primera visita (o bump de versión).
export default function SaludFuncionalHubGated() {
  return (
    <MedicalDisclaimerGate>
      <SaludFuncionalHub />
    </MedicalDisclaimerGate>
  );
}
