/**
 * MomentoBanda (MB-20.1 · 2.2) — la banda fotográfica que abre cada bloque
 * de la lente AGENDA: ~52 px de alto, foto de la franja del día, degradado
 * para que el nombre del bloque y su progreso lean sobre cualquier imagen.
 * Tres momentos editoriales por día; las filas debajo siguen compactas.
 */
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { MOMENTO_BAND_IMAGES } from '@/src/components/hoy/tarea-images';
import type { Momento } from '@/src/services/hoy/tareas-core';

interface Props {
  momento: Momento;
  label: string;
  done: number;
  total: number;
}

export function MomentoBanda({ momento, label, done, total }: Props) {
  return (
    <View style={s.banda}>
      <Image
        source={MOMENTO_BAND_IMAGES[momento]}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        contentFit="cover"
        transition={180}
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.30)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.contenido}>
        <EliteText style={s.label}>{label}</EliteText>
        <EliteText style={s.progreso}>{done} de {total}</EliteText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banda: {
    height: 52,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    marginBottom: 8,
    backgroundColor: '#000',
  },
  contenido: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  label: {
    color: '#fff',
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  progreso: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
});
