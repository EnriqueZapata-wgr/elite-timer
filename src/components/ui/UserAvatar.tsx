/**
 * UserAvatar — Avatar circular del usuario, unificado en TODA la app.
 *
 * Reemplaza las 3 implementaciones inline (32px en kit, 36px en index,
 * 44px con gradient en yo). Default 36x36 con borde verde.
 *
 * Uso:
 *   <UserAvatar uri={user?.avatar_url} name={user?.email} />
 *   <UserAvatar uri={null} name="Enrique" size={44} />
 */
import { View, Image, Text, StyleSheet } from 'react-native';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface UserAvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

export function UserAvatar({ uri, name, size = 36 }: UserAvatarProps) {
  // El avatar aparece en pantallas que YA reciben el claro (perfil, ajustes,
  // comunidad). Con el gris #1a1a1a fijo se veía un disco negro flotando sobre
  // el acero, y la inicial en lima sobre claro no alcanza contraste (1.34): el
  // acento de texto en claro es el teal calibrado, igual que en el resto.
  const t = useSurfaceTokens();
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const radius = size / 2;
  const dim = { width: size, height: size, borderRadius: radius };

  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, dim, { borderColor: acento }]} />;
  }

  const initial = name?.trim()?.[0]?.toUpperCase() ?? 'A';

  return (
    <View style={[styles.placeholder, dim, { backgroundColor: t.hundido, borderColor: acento }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4, color: acento }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 1.5,
  },
  placeholder: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '600',
  },
});
