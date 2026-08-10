/**
 * EditorialCard (#hoy-redesign, Parte 2 + 8) — card editorial full-width del HOY.
 * Imagen B/N de fondo (full bleed) + gradient overlay + texto blanco encima. Si NO hay imagen
 * (assets pendientes), cae a un placeholder de gradient sólido con el icono grande centrado.
 *
 * Estados: pending (vivo) · in_window (glow lima + badge "AHORA") · done (overlay + "Hecho hoy ✓")
 * · out_of_hour (mensaje contextual). Tokens canónicos + haptic + PressableScale (AnimatedPressable).
 */
import { View, StyleSheet, Pressable, Alert, type ImageSourcePropType } from 'react-native';
// P2.8 triple-audit: expo-image en vez de RN Image — decode con caché
// memoria+disco y transition, mata el flash negro de 1-3s en los hubs.
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon, hasAppIcon, type AppIconName } from '@/src/components/ui/AppIcon';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export type EditorialCardState = 'pending' | 'in_window' | 'done' | 'out_of_hour';

/** Tamaño de la card: normal (lista), hero (próximo evento), pillar (frente full ~45% pantalla). */
export type EditorialCardSize = 'normal' | 'hero' | 'pillar';

// Aspect ratio por size — coincide con las imágenes Midjourney (16:9 = 1.78) para que NO haya
// zoom/recorte. Antes usábamos minHeight fijo (210/260/340) y las cards quedaban más cuadradas
// que la imagen → cover recortaba mucho horizontal en pillars y se veía solo gradient.
// Ahora la card siempre tiene la forma de la foto: pillar más ancho/dramático, normal 16:9 puro.
// Pillar usa 4:3 (1.33) → un poco más cuadrada para impacto pero aún acomoda casi toda la foto.
const SIZE_ASPECT: Record<EditorialCardSize, number> = {
  normal: 16 / 9,  // 1.78 — exacto a la imagen
  hero: 16 / 9,    // 1.78 — exacto a la imagen
  pillar: 4 / 3,   // 1.33 — más cuadrada para impacto en Mi ATP (recorta ~25% horizontal)
};

export interface EditorialCardProps {
  cardKey: string;
  /** MB-19.2: nombre lógico del AppIcon (preferido) o emoji legacy. Solo se ve
   * en el placeholder sin imagen; con nombre lógico se pinta con <AppIcon>. */
  icon: string;
  /** MB-19.2 (SALUD): icono del set visible en la esquina sup-izq de la card.
   * Solo se pinta si la card no lleva círculo checkable. */
  iconName?: AppIconName;
  title: string;
  subtitle?: string;
  message?: string;
  imageBn?: ImageSourcePropType;
  gradient: [string, string] | [string, string, string];
  state?: EditorialCardState;
  size?: EditorialCardSize;
  badge?: string;
  ctaLabel?: string;
  onTap?: () => void;
  /** 4.1 — barra de progreso opcional (proteína/agua). Solo visual; el subtitle lleva los números. */
  progress?: { current: number; target: number; unit?: string };
  /** 4.2 — valor de electrones de la card (+N). Se muestra como pill lima si state !== 'done'. */
  electronsValue?: number;
  /** 4.3 — acciones rápidas (máx 3) bajo la barra (ej. Agua +250/+500/-250). */
  quickActions?: { label: string; onTap: () => void }[];
  /** 2.1 — círculo checkable (estilo checklist) en la esquina sup-izq. Solo para cards
   *  completables (electrones/proteína/agua). Informativas (UV, cardio, YO, …) lo omiten. */
  showCheckCircle?: boolean;
  /** #v13e 3.D — copy explicativo del electrón. Si se define, muestra un botón "i". */
  infoText?: string;
  /** #v13f 2.6 — handler del botón "i". Si se provee, abre el InfoTipModal custom del HOY;
   *  si no, cae al Alert nativo (fallback para cards fuera del HOY). */
  onInfoPress?: (title: string, text: string) => void;
}

/** Círculo checkable: vacío (pending) o lleno lima con palomita (done). Reemplaza el emoji viejo. */
function CheckCircle({ done }: { done: boolean }) {
  return (
    <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
      {done ? <EliteText style={styles.checkMark}>✓</EliteText> : null}
    </View>
  );
}

export function EditorialCard({
  cardKey, icon, iconName, title, subtitle, message, imageBn, gradient, state = 'pending', size = 'normal', badge, ctaLabel, onTap,
  progress, electronsValue, quickActions, showCheckCircle, infoText, onInfoPress,
}: EditorialCardProps) {
  const done = state === 'done';
  const inWindow = state === 'in_window';
  const aspectRatio = SIZE_ASPECT[size];
  const big = size === 'pillar';
  const progressPct = progress && progress.target > 0
    ? Math.min(100, Math.max(0, (progress.current / progress.target) * 100))
    : 0;
  // MB-31A (manual 3.8): la card editorial se queda OSCURA en los dos modos —
  // foto, degradado negro y texto blanco son la ventana, no el marco. Lo
  // ÚNICO que cambia con el tema es su borde, para despegarse del acero.
  const t = useSurfaceTokens();
  const bordeTema = t.kind === 'light'
    ? { borderWidth: 1, borderColor: t.bordeEditorial }
    : null;

  return (
    <AnimatedPressable
      onPress={onTap ? () => { haptic.light(); onTap(); } : undefined}
      style={[styles.card, { aspectRatio }, bordeTema, inWindow && styles.glow]}
    >
      {/* Fondo: imagen B/N si existe, sino placeholder de gradient sólido con icono grande.
          IMPORTANTE: width/height EXPLÍCITOS además de absoluteFill. RN tiene un bug conocido
          donde Image con solo absoluteFill no calcula dimensiones del padre cuando el padre
          usa aspectRatio, y la Image renderiza a su tamaño natural (2048x1146) — solo se ve
          el crop sup-izq porque la card tiene overflow:hidden. Con width/height '100%' fuerza
          la escala correcta y resizeMode='cover' funciona como se espera. */}
      {/* P2.8: el placeholder de gradient se pinta SIEMPRE debajo — antes solo
          existía en la rama sin imagen, y mientras la Image decodificaba la
          card era un hueco negro (RN Image transparente + overlay alpha). */}
      <View style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: gradient[0], opacity: 0.25 }]} />
        {/* MB-19.2: nombre lógico → glifo del set; emoji legacy → texto, como antes. */}
        {!imageBn && (hasAppIcon(icon) ? (
          <View style={styles.placeholderGlyph}>
            <AppIcon name={icon} size={64} color="#FFFFFF" />
          </View>
        ) : (
          <EliteText style={styles.placeholderIcon}>{icon}</EliteText>
        ))}
      </View>
      {imageBn ? (
        <Image
          source={imageBn}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
      ) : null}
      {/* Overlay de gradient de categoría (diagonal).
          - SIN imagen: gradient sólido (placeholder) con opacity 0.9.
          - CON imagen: gradient diagonal de color fuerte (alpha 80% = CC hex) a casi transparente
            (alpha 10% = 1A hex) → la esquina sup-izq tiene tinte de color, la esquina inf-der deja
            ver la imagen casi pura. Esto resuelve cuando el gradient es uniforme/saturado (verde-verde)
            que con opacity 0.45 sólido tintaba TODO y tapaba visualmente la imagen B/N. */}
      <LinearGradient
        colors={imageBn ? [`${gradient[0]}CC`, `${gradient[1]}1A`] : gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, !imageBn && { opacity: 0.9 }]}
      />
      {/* Velo oscuro en la parte inferior para que el texto blanco sea legible sobre cualquier
          imagen (sin esto, fotos claras hacen ilegible el texto). */}
      {imageBn ? (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {/* Velo extra cuando está hecho (apaga la card). */}
      {done ? <View style={[StyleSheet.absoluteFill, styles.doneVeil]} /> : null}

      <View style={styles.content}>
        <View style={styles.topRow}>
          {/* 2.1: círculo checkable en vez del emoji (que se eliminó del topRow).
              MB-19.2: si no hay círculo y la card declara iconName, el set ocupa el slot. */}
          {showCheckCircle ? <CheckCircle done={done} /> : iconName ? (
            <View style={styles.iconChip}>
              <AppIcon name={iconName} size={19} color="#FFFFFF" />
            </View>
          ) : <View />}
          <View style={styles.topRight}>
            {/* #v13e 3.D: botón "i" → Alert con copy de cómo se gana el electrón. */}
            {infoText ? (
              <Pressable
                onPress={() => {
                  haptic.light();
                  // #v13f 2.6: modal custom si el padre lo provee; Alert nativo como fallback.
                  if (onInfoPress) onInfoPress(title, infoText);
                  else Alert.alert(title, infoText);
                }}
                hitSlop={10}
                // MB-1.5 §1: pressed visible en pointer-down (antes sin feedback)
                style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.5, transform: [{ scale: 0.88 }] }]}
              >
                <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            ) : null}
            {done ? (
              <View style={styles.doneBadge}><EliteText style={styles.doneBadgeText}>Hecho hoy ✓</EliteText></View>
            ) : (
              <>
                {inWindow && badge ? (
                  <View style={styles.badge}><EliteText style={styles.badgeText}>{badge}</EliteText></View>
                ) : null}
                {electronsValue != null ? (
                  <View style={styles.electronsPill}><EliteText style={styles.electronsPillText}>+{electronsValue}</EliteText></View>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View style={styles.bottom}>
          <EliteText style={[styles.title, big && styles.titleBig]} numberOfLines={2}>{title}</EliteText>
          {subtitle ? <EliteText style={[styles.subtitle, big && styles.subtitleBig]} numberOfLines={2}>{subtitle}</EliteText> : null}
          {message ? <EliteText style={styles.message} numberOfLines={2}>{message}</EliteText> : null}
          {progress ? (
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progressPct}%` }]} /></View>
          ) : null}
          {quickActions && quickActions.length > 0 ? (
            <View style={styles.quickRow}>
              {quickActions.slice(0, 3).map((qa) => (
                <AnimatedPressable key={qa.label} onPress={() => { haptic.light(); qa.onTap(); }} style={styles.quickBtn}>
                  <EliteText style={styles.quickBtnText}>{qa.label}</EliteText>
                </AnimatedPressable>
              ))}
            </View>
          ) : null}
          {ctaLabel ? (
            <View style={styles.cta}><EliteText style={styles.ctaText}>{ctaLabel}</EliteText></View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', borderRadius: Radius.card, overflow: 'hidden',
    marginBottom: Spacing.md, backgroundColor: '#000',
  },
  glow: {
    borderWidth: 1, borderColor: ATP_BRAND.lime,
    shadowColor: ATP_BRAND.lime, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  placeholderIcon: { position: 'absolute', alignSelf: 'center', top: '30%', fontSize: 64, opacity: 0.35 },
  placeholderGlyph: { position: 'absolute', alignSelf: 'center', top: '30%', opacity: 0.35 },
  // MB-19.2 — chip del icono del set (puertas de SALUD): velo oscuro para que
  // el glifo blanco lea sobre cualquier foto.
  iconChip: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  doneVeil: { backgroundColor: 'rgba(0,0,0,0.55)' },
  // flex:1 hace que el content llene la card (cuyo height ya viene de aspectRatio en el padre).
  // SIN minHeight: si lo dejamos, fuerza altura > la del aspectRatio y rompe el ratio.
  content: { flex: 1, padding: Spacing.lg, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoBtn: { padding: 2 },
  icon: { fontSize: 26 },
  iconBig: { fontSize: 40 },
  // 2.1 — círculo checkable.
  checkCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  checkMark: { color: '#000', fontFamily: Fonts.bold, fontSize: 16, lineHeight: 18 },
  // 4.2 — pill de electrones (+N) lima translúcido.
  electronsPill: { backgroundColor: 'rgba(168,224,42,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  electronsPillText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xs },
  badge: { backgroundColor: ATP_BRAND.lime, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
  doneBadge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  doneBadgeText: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  bottom: { gap: 2 },
  // 4.1 — barra de progreso (proteína/agua).
  progressTrack: { height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)' },
  // 4.3 — acciones rápidas (agua).
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  quickBtnText: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xs },
  title: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xl, letterSpacing: 1 },
  titleBig: { fontSize: FontSizes.display, lineHeight: 38 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  subtitleBig: { fontSize: FontSizes.lg },
  message: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.sm, marginTop: 4, lineHeight: 18 },
  cta: { marginTop: Spacing.sm, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999 },
  ctaText: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
