/**
 * HoyResumenCard (7-oct-2026, Hoy editorial): la tarjeta de arriba de HOY.
 * Una imagen editorial, una línea y un CTA, con el molde de la casa
 * (EditorialCard, manual de marca 7). Debajo, si hacen falta, renglones
 * callados de texto para las puertas secundarias.
 *
 * Por qué existe: el dueño abrió HOY y lo primero que vio fueron sus
 * laboratorios con puntos rojos. Su decisión (7-oct-2026): arriba va un
 * resumen con una imagen bonita; los valores, a un toque. Esta pieza pinta ese
 * resumen para los cuatro casos felices (Edad ATP, evaluación Elite, primer
 * estudio y la semana del programa). Qué dice cada uno lo decide
 * hoy-resumen-core, que tiene test; aquí solo se traduce la LLAVE de imagen a
 * su asset y se navega.
 *
 * No pinta marcadores, puntos de color ni etiquetas de semáforo, y no tiene
 * por dónde: el modelo que recibe (TarjetaResumen) no los trae.
 *
 * La card editorial se queda oscura en los dos temas (manual 7.1); lo que sí
 * lee el tema son los renglones de abajo, que viven sobre la pantalla: lima
 * como texto solo en oscuro, teal calibrado en claro (regla 1 del manual).
 * Glifos de función por <AppIcon>; Ionicons solo cromo (chevron).
 *
 * 8-oct-2026 (revisión en frío):
 *  - La foto del programa sale de un banco SIN persona (antes pickTuDiaImage,
 *    que trae retratos con sexo legible). Ver IMAGEN_PROGRAMA.
 *  - El degradado sale del helper de marca (brandGradient), no de un par
 *    escrito a mano.
 *  - La tarjeta tiene etiqueta para el lector de pantalla (la frase del core:
 *    en el programa, "Semana 3 de 12, día 17" y el avance que la barra solo
 *    dibuja). EditorialCard no la recibe y no se edita: se envuelve.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon, type AppIconName } from '@/src/components/ui/AppIcon';
import { CandadoNivel, destinoCandado } from '@/src/components/ui/CandadoNivel';
import {
  imagenProgramaKey,
  type EnlaceResumen, type ImagenProgramaKey, type ImagenResumenKey, type TarjetaResumen,
} from '@/src/services/hoy/hoy-resumen-core';
import { pickEdadAtpImage, YO_STATIC_IMAGES } from '@/src/utils/yo-image-picker';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { ATP_BRAND, brandGradient } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

/**
 * Superficie heroica = degradado de marca, de lima a teal (DESIGN_SYSTEM,
 * doctrina de 3 colores). Sobre la foto, EditorialCard lo deja en diagonal:
 * tinte arriba a la izquierda, foto casi limpia abajo a la derecha.
 * 8-oct-2026 (revisión en frío): el par ya no se escribe a mano, sale del
 * helper de marca. brandGradient() sin pilar devuelve la molécula completa
 * (cinco pasos, de lima a teal) y EditorialCard pinta con dos colores, así
 * que se toman sus dos extremos: los mismos lima y teal de antes.
 */
const MOLECULA = brandGradient();
const GRADIENTE_MARCA: [string, string] = [MOLECULA[0], MOLECULA[MOLECULA.length - 1]];

/** El glifo del set que se vería si la foto no cargara (placeholder de EditorialCard). */
const ICONO: Record<TarjetaResumen['key'], AppIconName> = {
  edad_atp: 'edad-atp',
  evaluacion: 'evaluaciones',
  sin_estudio: 'labs',
  programa: 'tab-programa',
};

const ICONO_ENLACE: Record<EnlaceResumen['key'], AppIconName> = {
  comparar: 'salud-evolucion',
  sin_estudio: 'labs',
  falta_sexo: 'ajustes',
  valores: 'labs',
  laboratorios: 'labs',
};

/**
 * 8-oct-2026 (revisión en frío, bloqueante): las fotos de la tarjeta del
 * programa, SOLO las de hoy-extra/tu-dia donde no aparece ninguna persona.
 * Antes se usaba pickTuDiaImage, y su banco trae retratos con sexo legible
 * (un hombre sin camisa, una mujer en top deportivo): a quien no se le
 * preguntó el sexo no se le pone uno, ni con una foto. Qué nombres entran lo
 * decide el core (IMAGENES_PROGRAMA_SIN_PERSONA); aquí cada nombre se traduce
 * a su archivo. El tipo obliga a que estén todos y ni uno de más, y el test
 * compara estos `require()` contra la lista del core.
 */
const IMAGEN_PROGRAMA: Record<ImagenProgramaKey, ImageSourcePropType> = {
  'amanecer-03': require('@/assets/images/hoy-extra/tu-dia/amanecer-03.webp'),
  'medio-dia-02': require('@/assets/images/hoy-extra/tu-dia/medio-dia-02.webp'),
  'medio-dia-04': require('@/assets/images/hoy-extra/tu-dia/medio-dia-04.webp'),
  'atardecer-01': require('@/assets/images/hoy-extra/tu-dia/atardecer-01.webp'),
  'atardecer-03': require('@/assets/images/hoy-extra/tu-dia/atardecer-03.webp'),
  'atardecer-04': require('@/assets/images/hoy-extra/tu-dia/atardecer-04.webp'),
  'noche-01': require('@/assets/images/hoy-extra/tu-dia/noche-01.webp'),
  'noche-02': require('@/assets/images/hoy-extra/tu-dia/noche-02.webp'),
  'noche-03': require('@/assets/images/hoy-extra/tu-dia/noche-03.webp'),
  'noche-04': require('@/assets/images/hoy-extra/tu-dia/noche-04.webp'),
};

/**
 * La llave que decidió el core, traducida a su asset. Los `require()` viven en
 * los pickers (capa de componentes), nunca en el core. El retrato de él o de
 * ella solo llega aquí cuando el core ya confirmó el sexo del perfil; sin él
 * la llave es `estudio_neutra` y se pinta lab-preview, sin persona.
 */
function imagenDe(key: ImagenResumenKey, semilla?: string): ImageSourcePropType | undefined {
  switch (key) {
    case 'edad_atp_el': return pickEdadAtpImage('male');
    case 'edad_atp_ella': return pickEdadAtpImage('female');
    case 'estudio_neutra': return YO_STATIC_IMAGES.lab;
    // La franja la elige la hora y la variante la semilla del día: no parpadea
    // entre renders y cambia de un día a otro (manual 7.6, regla 1). Solo del
    // banco sin persona.
    case 'programa_sin_persona': return IMAGEN_PROGRAMA[imagenProgramaKey(new Date().getHours(), semilla)];
  }
}

interface Props {
  tarjeta: TarjetaResumen;
  /** Semilla de la rotación de imagen (por ejemplo `${userId}-${hoy}`). Solo la usa `programa_sin_persona`. */
  semilla?: string;
  /** "Comparar" con candado de venta: el renglón lleva al paywall y pinta el candado. */
  compararConCandado?: boolean;
  /** Milisegundos antes de la entrada (escalonado con lo que haya arriba). */
  demora?: number;
  /** Notas que van bajo la tarjeta, antes de los enlaces (por ejemplo "tu evaluación viene en camino"). */
  children?: ReactNode;
}

export function HoyResumenCard({ tarjeta, semilla, compararConCandado = false, demora = 100, children }: Props) {
  const t = useSurfaceTokens();
  const router = useRouter();
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const hayDebajo = tarjeta.enlaces.length > 0 || children != null;

  // Un solo destino: el CTA del modelo. Lo usan el toque y el lector de pantalla.
  const abrir = () => router.push(tarjeta.cta.ruta);

  const abrirEnlace = (e: EnlaceResumen) => {
    haptic.light();
    if (e.key === 'comparar' && compararConCandado) router.push(destinoCandado('comparar', 'premium'));
    else router.push(e.ruta);
  };

  return (
    <Animated.View entering={FadeInUp.delay(demora).springify()} style={s.wrap}>
      {/* 8-oct-2026 (revisión en frío): para el lector de pantalla la tarjeta
          es UN botón con la frase del core (EditorialCard no recibe etiqueta
          y no se edita). Activarlo abre el mismo destino que el toque. */}
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={tarjeta.accesibilidad}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'activate') abrir(); }}
        onAccessibilityTap={abrir}
      >
        {/* Lo de adentro no se le lee otra vez (el título en mayúsculas se
            deletrea); el toque normal sigue llegando a EditorialCard. */}
        <View collapsable={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {/* Un solo destino: toda la tarjeta es el CTA (EditorialCard ya da el toque háptico). */}
          <EditorialCard
            cardKey={`hoy_resumen_${tarjeta.key}`}
            size="hero"
            icon={ICONO[tarjeta.key]}
            title={tarjeta.titulo}
            subtitle={tarjeta.linea}
            message={tarjeta.letraChica ?? undefined}
            ctaLabel={tarjeta.cta.label}
            gradient={GRADIENTE_MARCA}
            imageBn={imagenDe(tarjeta.imagen, semilla)}
            progress={tarjeta.progreso ?? undefined}
            onTap={abrir}
          />
        </View>
      </View>
      {hayDebajo ? (
        <View style={s.debajo}>
          {children}
          {tarjeta.enlaces.map((e) => (
            <AnimatedPressable
              key={e.key}
              style={s.enlace}
              onPress={() => abrirEnlace(e)}
              accessibilityRole="link"
              accessibilityLabel={e.texto}
            >
              <AppIcon name={ICONO_ENLACE[e.key]} size={16} color={acento} />
              <EliteText style={[s.enlaceTexto, { color: acento }]}>{e.texto}</EliteText>
              {e.key === 'comparar' && compararConCandado
                ? <CandadoNivel appKey="comparar" nivel="premium" tocable={false} />
                : <Ionicons name="chevron-forward" size={14} color={acento} />}
            </AnimatedPressable>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  // EditorialCard ya trae su margen inferior (Spacing.md); aquí solo el lateral.
  wrap: { marginHorizontal: Spacing.md },
  // Lo de abajo se pega a la tarjeta: es parte de ella, no otra sección.
  debajo: { marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  enlaceTexto: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
