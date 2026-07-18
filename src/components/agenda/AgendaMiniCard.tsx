/**
 * AgendaMiniCard (#v13h — rediseño editorial) — mini-card horizontal de un evento de la agenda.
 * Layout: foto B/N lateral (~30% width) + gradient sutil por categoría detrás del texto +
 * nombre bold + hora display XL lima a la derecha. Fondo card con gradient de profundidad.
 * Estados: pending (full) · completed (veil + check lima + tachado) · skipped (opacity 0.4) ·
 * snoozed (clock amarillo "Pospuesto"). Reusa pickAgendaImage + agendaCategoryToFolder.
 */
import { View, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { pickAgendaImage } from '@/src/utils/agenda-image-picker';
import { pickInterventionImage } from '@/src/utils/intervention-image-picker';
import { agendaCategoryToFolder } from '@/src/utils/image-pick-core';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import type { AgendaEventInstance } from '@/src/services/agenda-service';

/**
 * Gradient sutil por categoría (detrás del texto, alpha bajo). Se indexa por el MISMO folder que
 * devuelve agendaCategoryToFolder (mismo folder que la imagen → mismo tint). Categorías no listadas
 * caen a `otros`.
 */
const CATEGORY_TINT: Record<string, [string, string]> = {
  comida:          ['#FF8C00', '#C0392B'], // nutrición / comidas
  entrenar:        ['#E74C3C', '#FFA500'], // fitness / fuerza
  cardio:          ['#E74C3C', '#FFA500'],
  meditacion:      ['#1ABC9C', '#9B59B6'],
  suplementos:     ['#8B5CF6', '#4C1D95'],
  sleep:           ['#2C3E50', '#1A1A2E'],
  hidratacion:     ['#3498DB', '#1ABC9C'],
  despertar:       ['#F59E0B', '#312E81'],
  'sol-am':        ['#FFD700', '#FFA500'],
  'sol-pm':        ['#FF8C00', '#C0392B'],
  'off-pantallas': ['#34495E', '#2C3E50'],
  otros:           ['#7F77DD', '#4B5563'],
};

/** Icono por folder para el placeholder cuando el evento no tiene imagen. */
const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  comida: 'restaurant', entrenar: 'barbell', cardio: 'bicycle',
  meditacion: 'leaf', suplementos: 'medkit', sleep: 'moon',
  hidratacion: 'water', despertar: 'sunny', 'sol-am': 'sunny',
  'sol-pm': 'partly-sunny', 'off-pantallas': 'phone-portrait-outline', otros: 'ellipse-outline',
};

function getCategoryTint(folder: string): [string, string] {
  return CATEGORY_TINT[folder] ?? CATEGORY_TINT.otros;
}

interface Props {
  event: AgendaEventInstance;
  onTap?: () => void;
  /** Versión reducida para el preview en HOY. */
  compact?: boolean;
  /** Seed para rotación determinística de la imagen. */
  seedKey?: string;
}

export function AgendaMiniCard({ event, onTap, compact, seedKey }: Props) {
  const folder = agendaCategoryToFolder(event.category, event.name);
  // Mega-Sprint C (#132): si el evento viene de una intervención, intenta primero
  // su imagen de concepto visual dedicada (grounding/frío/sauna/oral/...); si no
  // matchea, cae limpio al sistema de carpetas por categoría (cero pantalla rota).
  const image: ImageSourcePropType | undefined =
    pickInterventionImage(event.interventionKey)
    ?? pickAgendaImage(folder, `${seedKey ?? ''}-${event.eventId}`);
  const done = event.status === 'completed';
  const skipped = event.status === 'skipped';
  const snoozed = event.status === 'snoozed';
  // MB-1 P3-4: un evento pendiente cuya hora ya pasó se atenúa y deja de
  // anunciar su recordatorio ("10 min antes" a media tarde = ruido).
  const past = !done && !skipped && !snoozed &&
    new Date(event.scheduledAt).getTime() < Date.now();
  const tint = getCategoryTint(folder);
  const icon = CATEGORY_ICON[folder] ?? CATEGORY_ICON.otros;

  return (
    <AnimatedPressable
      onPress={onTap ? () => { haptic.light(); onTap(); } : undefined}
      style={[styles.card, compact && styles.cardCompact, skipped && styles.cardSkipped, past && styles.cardPast]}
    >
      {/* Fondo de la card: gradient sutil de profundidad (#151515 → #0E0E0E). */}
      <LinearGradient colors={['#151515', '#0E0E0E']} style={StyleSheet.absoluteFill} />

      {/* Foto B/N lateral (o placeholder oscuro con icono si no hay imagen). */}
      <View style={[styles.photo, compact && styles.photoCompact]}>
        {image ? (
          <Image source={image} style={styles.photoImg} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name={icon} size={compact ? 20 : 26} color={`${tint[0]}66`} />
          </View>
        )}
        {done ? (
          <View style={styles.photoVeil}>
            <Ionicons name="checkmark-circle" size={compact ? 22 : 28} color={ATP_BRAND.lime} />
          </View>
        ) : null}
      </View>

      {/* Cuerpo: gradient de categoría MUY sutil detrás del texto + contenido. */}
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <LinearGradient
          colors={[`${tint[0]}22`, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bodyRow}>
          <View style={styles.textCol}>
            <EliteText
              style={[styles.name, compact && styles.nameCompact, done && styles.nameDone, skipped && styles.nameMuted]}
              numberOfLines={1}
            >
              {event.name}
            </EliteText>
            {snoozed ? (
              <View style={styles.statusRow}>
                <Ionicons name="time-outline" size={12} color="#fbbf24" />
                <EliteText style={[styles.statusText, styles.statusSnoozed]}>Pospuesto</EliteText>
              </View>
            ) : past ? (
              <View style={styles.statusRow}>
                <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.4)" />
                <EliteText style={styles.statusText}>Pasado</EliteText>
              </View>
            ) : event.notifyMinutesBefore > 0 && !done && !skipped ? (
              <View style={styles.statusRow}>
                <Ionicons name="notifications-outline" size={11} color="rgba(255,255,255,0.55)" />
                <EliteText style={styles.statusText}>{event.notifyMinutesBefore} min antes</EliteText>
              </View>
            ) : null}
          </View>

          {/* Hora — dato crítico: display XL lima. */}
          <EliteText style={[styles.time, compact && styles.timeCompact, skipped && styles.nameMuted]}>
            {event.time}
          </EliteText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'stretch',
    height: 110, borderRadius: Radius.card, overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  cardCompact: { height: 80, marginBottom: Spacing.xs },
  cardSkipped: { opacity: 0.4 },
  cardPast: { opacity: 0.55 },
  // Foto lateral: 30% default / 25% compact. overflow:hidden de la card recorta las esquinas izq.
  photo: { width: '30%', backgroundColor: '#000' },
  photoCompact: { width: '25%' },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  photoVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  bodyCompact: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  textCol: { flex: 1, gap: 3 },
  name: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.3 },
  nameCompact: { fontSize: FontSizes.sm },
  nameDone: { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.55)' },
  nameMuted: { color: 'rgba(255,255,255,0.5)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  statusSnoozed: { color: '#fbbf24' },
  time: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.display, letterSpacing: 1 },
  timeCompact: { fontSize: FontSizes.lg, letterSpacing: 0.5 },
});
